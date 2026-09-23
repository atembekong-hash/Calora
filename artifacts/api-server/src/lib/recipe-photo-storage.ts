import { createHmac, createHash } from "node:crypto";
import { logger } from "./logger.js";

const STORAGE_TIMEOUT_MS = 10_000;
const DELETE_CONCURRENCY = 4;
const MAX_RECIPE_PHOTO_OBJECTS = 1_000;
const DEFAULT_SIGNED_URL_TTL_SECS = 15 * 60;

type ListedObject = { name?: unknown; object_name?: unknown; Key?: unknown };

type StorageConfig = {
  bucket: string;
  endpoint: URL;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  forcePathStyle: boolean;
};

function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Object storage is not configured (${names.join(" or ")})`);
}

function storageConfig(): StorageConfig {
  const endpoint = requiredEnv("RECIPE_PHOTO_STORAGE_ENDPOINT", "S3_ENDPOINT", "AWS_ENDPOINT_URL_S3", "ENDPOINT");
  return {
    bucket: requiredEnv("RECIPE_PHOTO_BUCKET", "DEFAULT_OBJECT_STORAGE_BUCKET_ID", "S3_BUCKET", "BUCKET"),
    endpoint: new URL(endpoint),
    accessKeyId: requiredEnv("RECIPE_PHOTO_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID", "ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("RECIPE_PHOTO_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY", "SECRET_ACCESS_KEY"),
    region: process.env.RECIPE_PHOTO_STORAGE_REGION?.trim()
      || process.env.S3_REGION?.trim()
      || process.env.AWS_REGION?.trim()
      || process.env.REGION?.trim()
      || "auto",
    forcePathStyle: process.env.RECIPE_PHOTO_STORAGE_FORCE_PATH_STYLE === "true"
      || process.env.S3_FORCE_PATH_STYLE === "true",
  };
}

export function recipePhotoPrefix(userId: string): string {
  return `private/recipe-photos/${userId}/`;
}

export function recipePhotoObjectName(userId: string, imageId: string): string {
  return `${recipePhotoPrefix(userId)}${imageId}.png`;
}

function objectNames(payload: unknown, prefix: string): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Object storage returned an invalid listing");
  }
  const value = payload as { items?: unknown; Contents?: unknown };
  const candidates = value.items === undefined ? value.Contents : value.items;
  // S3 omits Contents/items when a prefix is empty. Any explicit value,
  // including null, must be a list so an ambiguous response cannot erase data.
  if (candidates === undefined) return [];
  if (!Array.isArray(candidates)) throw new Error("Object storage returned an invalid listing");
  const names: string[] = [];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      names.push(candidate);
      continue;
    }
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as ListedObject;
    if (typeof item.name === "string") {
      names.push(item.name);
    } else if (typeof item.object_name === "string") {
      names.push(item.object_name);
    } else if (typeof item.Key === "string") {
      names.push(item.Key);
    }
  }
  return names.filter((name) => name.startsWith(prefix));
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function objectNamesFromS3List(xml: string, prefix: string): string[] {
  if (!/^\s*<\?xml|^\s*<ListBucketResult[\s>]/.test(xml)) {
    throw new Error("Object storage returned an invalid listing");
  }
  if (/<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml)) {
    throw new Error("Recipe photo object listing is paginated beyond the deletion safety bound");
  }
  const names = [...xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map((match) => decodeXml(match[1] ?? ""));
  if (names.length > MAX_RECIPE_PHOTO_OBJECTS) {
    throw new Error("Recipe photo object count exceeds the deletion safety bound");
  }
  return names.filter((name) => name.startsWith(prefix));
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function signingKey(secretAccessKey: string, date: string, region: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), region), "s3"), "aws4_request");
}

function iso8601Basic(date: Date): { dateStamp: string; amzDate: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { dateStamp: iso.slice(0, 8), amzDate: iso };
}

function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodedObjectPath(objectName: string): string {
  return objectName.split("/").map(encodePathSegment).join("/");
}

function signedStorageUrl(
  method: "GET" | "PUT" | "DELETE",
  objectName: string,
  expiresSecs = DEFAULT_SIGNED_URL_TTL_SECS,
  extraQuery: Record<string, string> = {},
): string {
  const config = storageConfig();
  const now = new Date();
  const { dateStamp, amzDate } = iso8601Basic(now);
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;
  const endpoint = new URL(config.endpoint.toString());
  let host: string;
  let canonicalUri: string;

  if (config.forcePathStyle) {
    host = endpoint.host;
    canonicalUri = `/${encodePathSegment(config.bucket)}${objectName ? `/${encodedObjectPath(objectName)}` : ""}`;
  } else {
    host = `${config.bucket}.${endpoint.host}`;
    canonicalUri = objectName ? `/${encodedObjectPath(objectName)}` : "/";
  }

  const query = new URLSearchParams(extraQuery);
  query.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  query.set("X-Amz-Credential", credential);
  query.set("X-Amz-Date", amzDate);
  query.set("X-Amz-Expires", String(expiresSecs));
  query.set("X-Amz-SignedHeaders", "host");

  const sortedQuery = [...query.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) => aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    method,
    canonicalUri,
    sortedQuery,
    canonicalHeaders,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(config.secretAccessKey, dateStamp, config.region))
    .update(stringToSign)
    .digest("hex");

  const signedQuery = `${sortedQuery}&X-Amz-Signature=${signature}`;
  return `${endpoint.protocol}//${host}${canonicalUri}?${signedQuery}`;
}

export function createRecipePhotoSignedUrl(
  userId: string,
  imageId: string,
  method: "GET" | "PUT" | "DELETE",
  ttlSecs: number,
): string {
  return signedStorageUrl(method, recipePhotoObjectName(userId, imageId), ttlSecs);
}

async function listRecipePhotoObjects(prefix: string): Promise<string[]> {
  const params = {
    "list-type": "2",
    prefix,
    "max-keys": String(MAX_RECIPE_PHOTO_OBJECTS + 1),
  };
  const response = await fetch(signedStorageUrl("GET", "", DEFAULT_SIGNED_URL_TTL_SECS, params), {
    signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Unable to list recipe photo objects (${response.status})`);
  return objectNamesFromS3List(await response.text(), prefix);
}

async function deleteRecipePhotoObject(objectName: string): Promise<void> {
  const deletion = await fetch(signedStorageUrl("DELETE", objectName), {
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
 * Listing is performed on every invocation, so a partial failure is safe to
 * retry. Completion is deliberately fail-closed: an unavailable listing or
 * delete operation prevents the account-deletion saga from advancing.
 */
export async function eraseRecipePhotoObjects(externalUserId: string): Promise<void> {
  const prefix = recipePhotoPrefix(externalUserId);
  const names = await listRecipePhotoObjects(prefix);
  for (let index = 0; index < names.length; index += DELETE_CONCURRENCY) {
    const batch = names.slice(index, index + DELETE_CONCURRENCY);
    await Promise.all(batch.map((name) => deleteRecipePhotoObject(name)));
  }
  const remainingNames = await listRecipePhotoObjects(prefix);
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
  recipePhotoObjectName,
  objectNames,
  objectNamesFromS3List,
  signedStorageUrl,
};
