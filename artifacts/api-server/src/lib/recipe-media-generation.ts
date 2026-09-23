import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger.js";
import { createRecipePhotoSignedUrl } from "./recipe-photo-storage.js";
import {
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

export async function locatorForRecipeMedia(ownerExternalId: string, row: RecipeMediaRow): Promise<RecipeMediaResource> {
  if (!row.image_id || !["stored", "url_ready"].includes(row.status)) return toRecipeMediaResource(row);
  const imageUrl = await createRecipePhotoSignedUrl(ownerExternalId, row.image_id, "GET", RECIPE_MEDIA_URL_TTL_SECS);
  const updated = await issueRecipeMediaUrlState(ownerExternalId, row.id);
  return toRecipeMediaResource(updated, {
    imageUrl,
    imageUrlExpiresAt: new Date(Date.now() + RECIPE_MEDIA_URL_TTL_SECS * 1000).toISOString(),
  });
}

export async function generateClaimedRecipeMedia(ownerExternalId: string, row: RecipeMediaRow): Promise<RecipeMediaResource> {
  if (!row.image_id) throw new Error("recipe_media_missing_image_id");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RECIPE_PHOTO_TIMEOUT_MS);
  try {
    const generated = await openai.images.generate({
      model: "gpt-image-1",
      prompt: buildRecipePhotoPrompt(row.recipe_payload),
      size: "1024x1024",
      quality: "low",
      output_format: "png",
      n: 1,
    }, { signal: controller.signal });
    const encoded = generated.data?.[0]?.b64_json;
    if (typeof encoded !== "string" || !encoded) throw new Error("image_provider_empty");
    const imageBytes = Buffer.from(encoded, "base64");
    if (imageBytes.length === 0 || imageBytes.length > 15 * 1024 * 1024) throw new Error("image_provider_invalid_size");

    const uploadUrl = await createRecipePhotoSignedUrl(ownerExternalId, row.image_id, "PUT", 15 * 60);
    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/png", "content-length": String(imageBytes.length) },
      body: imageBytes,
      signal: controller.signal,
    });
    if (!upload.ok) throw new Error(`recipe_media_upload_${upload.status}`);
    return locatorForRecipeMedia(ownerExternalId, await updateRecipeMediaStored(ownerExternalId, row.id));
  } catch (error) {
    const code = error instanceof Error && error.name === "AbortError"
      ? "generation_timeout"
      : error instanceof Error && /^image_provider_|^recipe_media_upload_/.test(error.message)
        ? error.message
        : "generation_unavailable";
    await markRecipeMediaError(ownerExternalId, row.id, code).catch(() => undefined);
    logger.warn({ err: error, mediaId: row.id, code }, "Recipe media generation failed");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
