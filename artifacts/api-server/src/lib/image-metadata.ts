import {
  normalizeSignedRecipePhotoUrl,
  normalizeTrustedFoodImageUrl,
} from "@workspace/api-zod/image-source-policy";

/**
 * Shared, defensive validation for optional diary/capture image metadata.
 *
 * Image URL and source are user- or provider-supplied and must never be
 * trusted blindly:
 *   - Only absolute HTTPS URLs from known food-image providers are accepted. Anything else (relative paths,
 *     `javascript:`, `data:`, `file:`, malformed strings, over-long values)
 *     is dropped to null so a fabricated payload cannot inject arbitrary
 *     content into a stored/served field.
 *   - `imageSource` is clamped to a short trimmed label. The local
 *     `restaurant_representative` marker is retained without a URL because
 *     its stable identity is carried by diary sync metadata, not a remote URI.
 *
 * The functions return `null` (never throw) on any invalid input so callers
 * can safely persist the result while preserving backward compatibility:
 * an absent or invalid image simply becomes NULL.
 */

const MAX_URL_LENGTH = 2048;
const MAX_SOURCE_LENGTH = 80;
const MAX_EVIDENCE_ID_LENGTH = 160;
const MAX_ACCOUNT_SCOPE_LENGTH = 200;
const MAX_ATTRIBUTION_LENGTH = 500;

/** The additive JSONB evidence-envelope version persisted in sync_metadata. */
export const IMAGE_EVIDENCE_VERSION = 1 as const;

/**
 * Roles describe what the metadata can truthfully establish, not what an image
 * happens to look like. `unverified` is deliberately available for legacy and
 * partially-observed records: neither a display name nor an allowlisted URL is
 * enough evidence to promote an image to `exact`.
 */
export type ImageSemanticRole =
  | "exact"
  | "canonical"
  | "generated"
  | "user_local"
  | "representative"
  | "no_image"
  | "fallback"
  | "unverified";

export type ImageRightsReviewState = "unreviewed" | "reviewed" | "approved" | "restricted";

/**
 * Versioned, owner-bound evidence for a content image. `locator` is only a
 * validated access location; durable identity is carried separately by the
 * content/provider/image identifiers or local asset key when those are known.
 */
export type ImageEvidence = {
  version: typeof IMAGE_EVIDENCE_VERSION;
  semanticRole: ImageSemanticRole;
  accountScope: string;
  contentId?: string;
  source?: string;
  provider?: string;
  providerItemId?: string;
  imageId?: string;
  imageVersion?: string;
  assetKey?: string;
  locator?: string;
  verifiedAt?: string;
  retrievedAt?: string;
  expiresAt?: string;
  attribution?: string;
  rightsReviewState?: ImageRightsReviewState;
};

type LegacyImageEvidenceFields = {
  imageUrl?: unknown;
  imageSource?: unknown;
  imageAssetKey?: unknown;
};

type NormalizeImageEvidenceOptions = {
  /** Only server-verified capture evidence may retain an exact assertion. */
  allowExact?: boolean;
};

const IMAGE_EVIDENCE_ROLES = new Set<ImageSemanticRole>([
  "exact",
  "canonical",
  "generated",
  "user_local",
  "representative",
  "no_image",
  "fallback",
  "unverified",
]);
const RIGHTS_REVIEW_STATES = new Set<ImageRightsReviewState>([
  "unreviewed",
  "reviewed",
  "approved",
  "restricted",
]);

function safeEvidenceText(value: unknown, maxLength = MAX_EVIDENCE_ID_LENGTH): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function safeEvidenceTime(value: unknown): string | undefined {
  const candidate = value instanceof Date ? value.toISOString() : value;
  if (typeof candidate !== "string" || Number.isNaN(Date.parse(candidate))) return undefined;
  return new Date(candidate).toISOString();
}

function conservativeLegacyEvidence(
  accountScope: string,
  legacy: LegacyImageEvidenceFields | undefined,
): ImageEvidence | null {
  const locator = safeImageUrl(legacy?.imageUrl);
  const source = safeImageSource(legacy?.imageSource);
  const assetKey = safeEvidenceText(legacy?.imageAssetKey);
  if (!locator && !source && !assetKey) return null;

  return {
    version: IMAGE_EVIDENCE_VERSION,
    // The one explicit historical semantic marker is safe to retain. All
    // other legacy URL/key combinations remain unverified rather than being
    // promoted from a name, source label, or URL hostname.
    semanticRole: source === "restaurant_representative" ? "representative" : "unverified",
    accountScope,
    ...(source ? { source } : {}),
    ...(assetKey ? { assetKey } : {}),
    ...(locator ? { locator } : {}),
  };
}
/**
 * Returns a trusted absolute HTTPS URL string, or null when the value is
 * absent, not a string, over-length, untrusted, or not parseable.
 */
export function safeImageUrl(value: unknown): string | null {
  return normalizeTrustedFoodImageUrl(value) ?? null;
}

/**
 * Returns a safe, trimmed, length-clamped image-source label, or null when
 * absent/blank/non-string.
 */
export function safeImageSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_SOURCE_LENGTH);
}

/**
 * Normalizes an optional pair of (imageUrl, imageSource).
 *
 * A source label without a valid URL is meaningless, so imageSource is
 * forced to null whenever imageUrl resolves to null. This keeps the stored
 * invariant "image_source is NULL when image_url is NULL".
 */
export function normalizeImageMetadata(
  urlValue: unknown,
  sourceValue: unknown,
): { imageUrl: string | null; imageSource: string | null } {
  const imageUrl = safeImageUrl(urlValue);
  const source = safeImageSource(sourceValue);
  const imageSource = imageUrl === null
    ? source === "restaurant_representative" ? source : null
    : source;
  return { imageUrl, imageSource };
}

/**
 * Validates the additive image-evidence envelope at an ingress boundary.
 *
 * `accountScope` is always supplied by authenticated server code and therefore
 * replaces any client value. The function never derives semantic exactness from
 * a name, URL, host, or source label. Unsupported/legacy records are retained
 * only as `unverified` (or the pre-existing explicit representative marker).
 */
export function normalizeImageEvidence(
  value: unknown,
  accountScope: string,
  legacy?: LegacyImageEvidenceFields,
  options: NormalizeImageEvidenceOptions = {},
): ImageEvidence | null {
  const scopedAccount = safeEvidenceText(accountScope, MAX_ACCOUNT_SCOPE_LENGTH);
  if (!scopedAccount) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return conservativeLegacyEvidence(scopedAccount, legacy);
  }

  const raw = value as Record<string, unknown>;
  if (raw.version !== IMAGE_EVIDENCE_VERSION || typeof raw.semanticRole !== "string" || !IMAGE_EVIDENCE_ROLES.has(raw.semanticRole as ImageSemanticRole)) {
    return conservativeLegacyEvidence(scopedAccount, legacy);
  }

  const requestedRole = raw.semanticRole as ImageSemanticRole;
  const contentId = safeEvidenceText(raw.contentId);
  const source = safeEvidenceText(raw.source, MAX_SOURCE_LENGTH);
  const provider = safeEvidenceText(raw.provider, MAX_SOURCE_LENGTH);
  const providerItemId = safeEvidenceText(raw.providerItemId);
  const imageId = safeEvidenceText(raw.imageId);
  const imageVersion = safeEvidenceText(raw.imageVersion);
  const assetKey = safeEvidenceText(raw.assetKey);
  const locator = requestedRole === "generated"
    ? normalizeSignedRecipePhotoUrl(raw.locator, imageId, scopedAccount)
    : safeImageUrl(raw.locator);
  const verifiedAt = safeEvidenceTime(raw.verifiedAt);
  const retrievedAt = safeEvidenceTime(raw.retrievedAt);
  const expiresAt = safeEvidenceTime(raw.expiresAt);
  const attribution = safeEvidenceText(raw.attribution, MAX_ATTRIBUTION_LENGTH);
  const rightsReviewState = typeof raw.rightsReviewState === "string" && RIGHTS_REVIEW_STATES.has(raw.rightsReviewState as ImageRightsReviewState)
    ? raw.rightsReviewState as ImageRightsReviewState
    : undefined;

  // Do not accept an `exact` assertion without an observed entity binding,
  // provider/image identity, and an observation time. Similarly, a local
  // canonical/generated identity needs the stable identifiers that define it.
  const semanticRole = requestedRole === "exact" && (!options.allowExact || !(contentId && provider && (providerItemId || imageId) && (verifiedAt || retrievedAt) && rightsReviewState === "approved"))
    ? "unverified"
    : requestedRole === "canonical" && !(contentId && assetKey)
      ? "unverified"
      : requestedRole === "generated" && !(contentId && imageId)
        ? "unverified"
        : requestedRole === "user_local" && !(contentId && imageId)
          ? "unverified"
          : requestedRole === "representative" && !(assetKey || imageId)
            ? "unverified"
            : requestedRole;

  return {
    version: IMAGE_EVIDENCE_VERSION,
    semanticRole,
    accountScope: scopedAccount,
    ...(contentId ? { contentId } : {}),
    ...(source ? { source } : {}),
    ...(provider ? { provider } : {}),
    ...(providerItemId ? { providerItemId } : {}),
    ...(imageId ? { imageId } : {}),
    ...(imageVersion ? { imageVersion } : {}),
    ...(assetKey ? { assetKey } : {}),
    ...(locator ? { locator } : {}),
    ...(verifiedAt ? { verifiedAt } : {}),
    ...(retrievedAt ? { retrievedAt } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(attribution ? { attribution } : {}),
    ...(rightsReviewState ? { rightsReviewState } : {}),
  };
}

/**
 * Returns true only when a client-submitted exact envelope is the same
 * server-recorded capture image. A matching provider hostname, food name, or
 * source label is intentionally not sufficient.
 */
export function matchesCaptureImageEvidence(
  candidateValue: unknown,
  submittedValue: unknown,
  accountScope: string,
): boolean {
  const candidate = normalizeImageEvidence(candidateValue, accountScope, undefined, { allowExact: true });
  const submitted = normalizeImageEvidence(submittedValue, accountScope, undefined, { allowExact: true });
  if (!candidate || !submitted || candidate.semanticRole !== "exact" || submitted.semanticRole !== "exact") return false;
  if (
    candidate.contentId !== submitted.contentId ||
    candidate.provider !== submitted.provider ||
    candidate.providerItemId !== submitted.providerItemId
  ) return false;
  if (candidate.imageVersion && candidate.imageVersion !== submitted.imageVersion) return false;
  // Image IDs are durable identity when the provider supplies them. Otherwise
  // the reviewed normalized locator is retained as the explicit observed
  // binding; it is never inferred from a host or display name.
  if (candidate.imageId) return submitted.imageId === candidate.imageId;
  return Boolean(
    candidate.locator && submitted.locator && candidate.locator === submitted.locator,
  );
}
