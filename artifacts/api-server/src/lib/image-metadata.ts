import { normalizeTrustedFoodImageUrl } from "@workspace/api-zod/image-source-policy";

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
