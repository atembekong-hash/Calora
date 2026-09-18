import { logger } from "./logger.js";

const OBJECT_STORAGE_SIDECAR = "http://127.0.0.1:1106/object-storage";
const LIST_OBJECTS_URL = `${OBJECT_STORAGE_SIDECAR}/list-objects`;
const SIGNED_OBJECT_URL = `${OBJECT_STORAGE_SIDECAR}/signed-object-url`;
const STORAGE_TIMEOUT_MS = 10_000;
const DELETE_CONCURRENCY = 4;
const MAX_RECIPE_PHOTO_OBJECTS = 1_000;

type ListedObject = { name?: unknown; object_name?: unknown };

function recipePhotoPrefix(userId: string): string {
  return `private/recipe-photos/${userId}/`;
}

function objectNames(payload: unknown, prefix: string): string[] {
  const candidates =
    Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object"
        ? (payload as { objects?: unknown; items?: unknown }).objects
          ?? (payload as { objects?: unknown; items?: unknown }).items
        : [];
  if (!Array.isArray(candidates)) throw new Error("Object storage returned an invalid listing");
  const names: string[] = [];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      names.push(candidate);
      continue;
    }
    if (!candidate || typeof candidate !== "object") continue;
    const value = candidate as ListedObject;
    if (typeof value.name === "string") {
      names.push(value.name);
    } else if (typeof value.object_name === "string") {
      names.push(value.object_name);
    }
  }
  return names.filter((name) => name.startsWith(prefix));
}

async function listRecipePhotoObjects(bucket: string, prefix: string): Promise<string[]> {
  const response = await fetch(LIST_OBJECTS_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucket,
      prefix,
      max_results: MAX_RECIPE_PHOTO_OBJECTS + 1,
    }),
    signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Unable to list recipe photo objects (${response.status})`);
  if (
    payload
    && typeof payload === "object"
    && (
      Boolean((payload as { has_more?: unknown }).has_more)
      || Boolean((payload as { hasMore?: unknown }).hasMore)
      || typeof (payload as { next_page_token?: unknown }).next_page_token === "string"
      || typeof (payload as { nextPageToken?: unknown }).nextPageToken === "string"
    )
  ) {
    throw new Error("Recipe photo object listing is paginated beyond the deletion safety bound");
  }
  const names = objectNames(payload, prefix);
  if (names.length > MAX_RECIPE_PHOTO_OBJECTS) {
    throw new Error("Recipe photo object count exceeds the deletion safety bound");
  }
  return names;
}

async function deleteRecipePhotoObject(bucket: string, objectName: string): Promise<void> {
  const response = await fetch(SIGNED_OBJECT_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucket,
      object_name: objectName,
      method: "DELETE",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }),
    signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({})) as { signed_url?: unknown };
  if (!response.ok || typeof payload.signed_url !== "string") {
    throw new Error("Unable to sign recipe photo deletion request");
  }

  const deletion = await fetch(payload.signed_url, {
    method: "DELETE",
    signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
  });
  // DELETE is idempotent: a retry may race with an earlier successful delete.
  if (!deletion.ok && deletion.status !== 404) {
    throw new Error(`Recipe photo deletion failed (${deletion.status})`);
  }
}

/**
 * Erases every generated recipe photo below the account-owned prefix.
 *
 * Listing is performed on every invocation, so a partial failure is safe to
 * retry. Completion is deliberately fail-closed: an unavailable listing or
 * delete operation prevents the account-deletion saga from advancing.
 */
export async function eraseRecipePhotoObjects(externalUserId: string): Promise<void> {
  const bucket = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucket) throw new Error("Object storage is not configured");
  const prefix = recipePhotoPrefix(externalUserId);
  const names = await listRecipePhotoObjects(bucket, prefix);
  for (let index = 0; index < names.length; index += DELETE_CONCURRENCY) {
    const batch = names.slice(index, index + DELETE_CONCURRENCY);
    await Promise.all(batch.map((name) => deleteRecipePhotoObject(bucket, name)));
  }
  logger.info({ objectCount: names.length }, "Recipe photo object erasure completed");
}

export const recipePhotoStorageForTests = {
  recipePhotoPrefix,
  objectNames,
};