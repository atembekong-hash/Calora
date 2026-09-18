import { logger } from "./logger.js";

const OBJECT_STORAGE_SIDECAR = "http://127.0.0.1:1106/object-storage";
const SIGNED_OBJECT_URL = `${OBJECT_STORAGE_SIDECAR}/signed-object-url`;
const SIDECAR_TOKEN_URL = "http://127.0.0.1:1106/credential";
const GOOGLE_TOKEN_EXCHANGE_URL = "http://127.0.0.1:1106/token";
const GOOGLE_STORAGE_API = "https://storage.googleapis.com/storage/v1";
const STORAGE_TIMEOUT_MS = 10_000;
const DELETE_CONCURRENCY = 4;
const MAX_RECIPE_PHOTO_OBJECTS = 1_000;

type ListedObject = { name?: unknown; object_name?: unknown };

function recipePhotoPrefix(userId: string): string {
  return `private/recipe-photos/${userId}/`;
}

function objectNames(payload: unknown, prefix: string): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Object storage returned an invalid listing");
  }
  const value = payload as { items?: unknown };
  // Google Storage omits `items` when a prefix is empty. Any explicit value,
  // including null, must be a list so an ambiguous response cannot erase
  // application data without proving the prefix is empty.
  const candidates = value.items === undefined ? [] : value.items;
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
  const tokenResponse = await fetch(SIDECAR_TOKEN_URL, {
    signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
  });
  const tokenPayload = await tokenResponse.json().catch(() => null) as { access_token?: unknown } | null;
  if (!tokenResponse.ok || typeof tokenPayload?.access_token !== "string") {
    throw new Error("Unable to authorize recipe photo object listing");
  }
  const exchangeResponse = await fetch(GOOGLE_TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      audience: "replit",
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      subject_token: tokenPayload.access_token,
      subject_token_type: "access_token",
    }),
    signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
  });
  const exchangePayload = await exchangeResponse.json().catch(() => null) as { access_token?: unknown } | null;
  if (!exchangeResponse.ok || typeof exchangePayload?.access_token !== "string") {
    throw new Error("Unable to authorize recipe photo object listing");
  }
  const params = new URLSearchParams({
    prefix,
    maxResults: String(MAX_RECIPE_PHOTO_OBJECTS + 1),
  });
  const response = await fetch(
    `${GOOGLE_STORAGE_API}/b/${encodeURIComponent(bucket)}/o?${params}`,
    {
      headers: { authorization: `Bearer ${exchangePayload.access_token}` },
      signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Unable to list recipe photo objects (${response.status})`);
  if (
    payload
    && typeof payload === "object"
    && (
      Boolean((payload as { has_more?: unknown }).has_more)
      || Boolean((payload as { hasMore?: unknown }).hasMore)
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
  const remainingNames = await listRecipePhotoObjects(bucket, prefix);
  if (remainingNames.length > 0) {
    throw new Error("Recipe photo objects remain after account erasure");
  }
  logger.info(
    { objectCount: names.length, remainingObjectCount: remainingNames.length },
    "Recipe photo object erasure completed",
  );
}

export const recipePhotoStorageForTests = {
  recipePhotoPrefix,
  objectNames,
};