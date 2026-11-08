import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";

/**
 * Mission 408 prototype only. The API must obtain the external identity from
 * Supabase verification, then run the entire database operation in one
 * transaction while setting a transaction-local signed assertion.
 */
export function createIdentityAssertion(
  externalUserId: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = 60,
): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(externalUserId) || !secret) {
    throw new Error("identity assertion inputs invalid");
  }
  if (!Number.isSafeInteger(nowSeconds) || !Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 300) {
    throw new Error("identity assertion lifetime invalid");
  }
  const expiresAt = nowSeconds + ttlSeconds;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${externalUserId}.${expiresAt}.${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyIdentityAssertion(
  assertion: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string | null {
  const parts = assertion.split(".");
  if (parts.length !== 4) return null;
  const [externalUserId, expiresAtText, nonce, signature] = parts;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(externalUserId) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(signature)) return null;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(nowSeconds) || expiresAt <= nowSeconds) return null;
  const expected = createHmac("sha256", secret)
    .update(`${externalUserId}.${expiresAtText}.${nonce}`)
    .digest("hex");
  const left = Buffer.from(signature, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && timingSafeEqual(left, right) ? externalUserId : null;
}

/**
 * The SQL function re-verifies the signature against a database-only secret;
 * the application helper never writes an untrusted user id into a GUC.
 */
export async function withSignedDatabaseIdentity<T>(
  client: PoolClient,
  assertion: string,
  operation: () => Promise<T>,
): Promise<T> {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config($1, $2, true)", ["calora.identity_token", assertion]);
    const result = await operation();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

/**
 * Runs a nested operation on a transaction already owned by the caller.
 * PostgreSQL has no nested BEGIN; a savepoint preserves the outer transaction
 * and restores the previous transaction-local identity on both paths.
 */
export async function withSignedDatabaseIdentityOnExistingTransaction<T>(
  client: PoolClient,
  assertion: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = await client.query<{ value: string }>(
    "SELECT current_setting($1, true) AS value",
    ["calora.identity_token"],
  );
  await client.query("SAVEPOINT calora_identity_context");
  try {
    await client.query("SELECT set_config($1, $2, true)", ["calora.identity_token", assertion]);
    const result = await operation();
    await client.query("SELECT set_config($1, $2, true)", ["calora.identity_token", previous.rows[0]?.value ?? ""]);
    await client.query("RELEASE SAVEPOINT calora_identity_context");
    return result;
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT calora_identity_context").catch(() => undefined);
    await client.query("RELEASE SAVEPOINT calora_identity_context").catch(() => undefined);
    throw error;
  }
}
