import { createHash } from "node:crypto";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger, safeErrorDetails } from "./logger.js";
import { createRecipePhotoSignedUrl } from "./recipe-photo-storage.js";
import {
  RECIPE_MEDIA_REVIEW_PREVIEW_URL_TTL_SECS,
  RECIPE_MEDIA_MODEL,
  RECIPE_MEDIA_URL_TTL_SECS,
  buildRecipePhotoPrompt,
  issueRecipeMediaUrlState,
  markRecipeMediaError,
  toRecipeMediaResource,
  updateRecipeMediaStored,
  type RecipeMediaResource,
  type RecipeMediaRow,
} from "./recipe-media.js";

export const RECIPE_PHOTO_TIMEOUT_MS = 30_000;

export const RECIPE_MEDIA_FAILURE_CATEGORIES = Object.freeze({
  PROVIDER_RESPONSE: "provider_response_error",
  PROVIDER_TIMEOUT: "provider_timeout",
  INVALID_OUTPUT: "invalid_generation_output",
  STORAGE_UPLOAD: "storage_upload_error",
  STORAGE_UPLOAD_TIMEOUT: "storage_upload_timeout",
  DATABASE_TRANSITION: "post_upload_database_transition_error",
});

class RecipeMediaGenerationError extends Error {
  constructor(readonly category: string, message = category) {
    super(message);
    this.name = "RecipeMediaGenerationError";
  }
}

function correlationId(ownerExternalId: string, mediaId: string): string {
  return createHash("sha256").update(`${ownerExternalId}:${mediaId}`).digest("hex").slice(0, 16);
}

function remainingDeadlineMs(deadlineAt: number): number {
  return Math.max(0, deadlineAt - Date.now());
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function safeProviderDiagnostics(error: unknown): {
  providerStatus?: number;
  providerCode?: string;
  providerType?: string;
} {
  if (!error || typeof error !== "object") return {};
  const value = error as {
    status?: unknown;
    code?: unknown;
    type?: unknown;
    error?: { code?: unknown; type?: unknown };
  };
  const nested = value.error && typeof value.error === "object" ? value.error : {};
  const diagnostics: {
    providerStatus?: number;
    providerCode?: string;
    providerType?: string;
  } = {};
  if (
    typeof value.status === "number"
    && Number.isInteger(value.status)
    && value.status >= 400
    && value.status <= 599
  ) {
    diagnostics.providerStatus = value.status;
  }
  for (const [key, candidates] of [
    ["providerCode", [value.code, nested.code]],
    ["providerType", [value.type, nested.type]],
  ] as const) {
    const candidate = candidates.find((item) => typeof item === "string");
    if (
      typeof candidate === "string"
      && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(candidate)
    ) {
      diagnostics[key] = candidate;
    }
  }
  return diagnostics;
}

export async function locatorForRecipeMedia(ownerExternalId: string, row: RecipeMediaRow): Promise<RecipeMediaResource> {
  // An ordinary locator is a published accepted image capability. Stored
  // review media must not silently cross that semantic boundary.
  if (!row.image_id || !["stored", "url_ready"].includes(row.status) || row.semantic_review_state !== "accepted") return toRecipeMediaResource(row);
  const imageUrl = await createRecipePhotoSignedUrl(ownerExternalId, row.image_id, "GET", RECIPE_MEDIA_URL_TTL_SECS);
  const updated = await issueRecipeMediaUrlState(ownerExternalId, row.id);
  return toRecipeMediaResource(updated, {
    imageUrl,
    imageUrlExpiresAt: new Date(Date.now() + RECIPE_MEDIA_URL_TTL_SECS * 1000).toISOString(),
  });
}

/**
 * A short-lived owner-only capability for human semantic review. It never
 * writes url_ready or changes the review state, so merely opening a card
 * cannot publish an unverified AI image into ordinary recipe rendering.
 */
export async function reviewPreviewLocatorForRecipeMedia(ownerExternalId: string, row: RecipeMediaRow): Promise<RecipeMediaResource> {
  if (!row.image_id || row.status !== "stored" || row.semantic_review_state !== "needs_review") return toRecipeMediaResource(row);
  const imageUrl = await createRecipePhotoSignedUrl(ownerExternalId, row.image_id, "GET", RECIPE_MEDIA_REVIEW_PREVIEW_URL_TTL_SECS);
  return toRecipeMediaResource(row, {
    imageUrl,
    imageUrlExpiresAt: new Date(Date.now() + RECIPE_MEDIA_REVIEW_PREVIEW_URL_TTL_SECS * 1000).toISOString(),
  });
}

export async function generateClaimedRecipeMedia(ownerExternalId: string, row: RecipeMediaRow): Promise<RecipeMediaResource> {
  if (!row.image_id) throw new Error("recipe_media_missing_image_id");
  const deadlineAt = Date.now() + RECIPE_PHOTO_TIMEOUT_MS;
  const correlation = correlationId(ownerExternalId, row.id);
  let phase = "provider";
  let uploadCompleted = false;
  try {
    const providerController = new AbortController();
    const providerTimer = setTimeout(() => providerController.abort(), remainingDeadlineMs(deadlineAt));
    let generated: { data?: Array<{ b64_json?: string | null }> };
    try {
      generated = await openai.images.generate({
        model: RECIPE_MEDIA_MODEL,
        prompt: buildRecipePhotoPrompt(row.recipe_payload),
        size: "1024x1024",
        quality: "low",
        output_format: "png",
        n: 1,
      }, { signal: providerController.signal });
      if (providerController.signal.aborted) throw new RecipeMediaGenerationError(RECIPE_MEDIA_FAILURE_CATEGORIES.PROVIDER_TIMEOUT);
    } catch (error) {
      if (error instanceof RecipeMediaGenerationError) throw error;
      if (isAbortError(error) || providerController.signal.aborted) throw new RecipeMediaGenerationError(RECIPE_MEDIA_FAILURE_CATEGORIES.PROVIDER_TIMEOUT);
      throw error;
    } finally {
      clearTimeout(providerTimer);
    }

    const encoded = generated.data?.[0]?.b64_json;
    if (typeof encoded !== "string" || !encoded) throw new RecipeMediaGenerationError(RECIPE_MEDIA_FAILURE_CATEGORIES.INVALID_OUTPUT);
    const imageBytes = Buffer.from(encoded, "base64");
    if (imageBytes.length === 0 || imageBytes.length > 15 * 1024 * 1024) throw new RecipeMediaGenerationError(RECIPE_MEDIA_FAILURE_CATEGORIES.INVALID_OUTPUT);

    phase = "storage_upload";
    const uploadController = new AbortController();
    const uploadTimer = setTimeout(() => uploadController.abort(), remainingDeadlineMs(deadlineAt));
    try {
      const uploadUrl = await createRecipePhotoSignedUrl(ownerExternalId, row.image_id, "PUT", 15 * 60);
      const upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": "image/png", "content-length": String(imageBytes.length) },
        body: imageBytes,
        signal: uploadController.signal,
      });
      if (uploadController.signal.aborted) throw new RecipeMediaGenerationError(RECIPE_MEDIA_FAILURE_CATEGORIES.STORAGE_UPLOAD_TIMEOUT);
      if (!upload.ok) throw new RecipeMediaGenerationError(RECIPE_MEDIA_FAILURE_CATEGORIES.STORAGE_UPLOAD);
      uploadCompleted = true;
    } catch (error) {
      if (error instanceof RecipeMediaGenerationError) throw error;
      if (isAbortError(error) || uploadController.signal.aborted) throw new RecipeMediaGenerationError(RECIPE_MEDIA_FAILURE_CATEGORIES.STORAGE_UPLOAD_TIMEOUT);
      throw new RecipeMediaGenerationError(RECIPE_MEDIA_FAILURE_CATEGORIES.STORAGE_UPLOAD);
    } finally {
      clearTimeout(uploadTimer);
    }

    phase = "database_transition";
    try {
      const stored = await updateRecipeMediaStored(ownerExternalId, row.id, row.attempts);
      // Generation completes in a review-only state. Return the private,
      // short-lived preview capability immediately so the client does not
      // render an indefinite spinner while waiting for a second reconciliation
      // request. This does not publish the image: the review-preview helper
      // only issues a locator for stored media whose state is needs_review.
      return reviewPreviewLocatorForRecipeMedia(ownerExternalId, stored);
    } catch {
      throw new RecipeMediaGenerationError(RECIPE_MEDIA_FAILURE_CATEGORIES.DATABASE_TRANSITION);
    }
  } catch (error) {
    const category = error instanceof RecipeMediaGenerationError ? error.category : RECIPE_MEDIA_FAILURE_CATEGORIES.PROVIDER_RESPONSE;
    const reconciliation = await markRecipeMediaError(ownerExternalId, row.id, category, row.attempts)
      .then((recorded) => recorded ? "retryable_error_recorded" : "reconciliation_unverified")
      .catch(() => "reconciliation_unverified");
    logger.warn({ event: "recipe_media_generation_failed", correlationId: correlation, category, phase, uploadCompleted, reconciliation, ...safeProviderDiagnostics(error), ...safeErrorDetails(error) }, "Recipe media generation failed");
    throw error;
  }
}
