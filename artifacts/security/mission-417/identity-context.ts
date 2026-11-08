import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";

const USER_ID = /^[A-Za-z0-9_-]{1,128}$/;
const NONCE = /^[A-Za-z0-9_-]{16,64}$/;

export function createIdentityAssertion(
  externalUserId: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = 60,
): string {
  if (!USER_ID.test(externalUserId) || !secret) throw new Error("identity assertion inputs invalid");
  if (!Number.isSafeInteger(nowSeconds) || !Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 300) {
    throw new Error("identity assertion lifetime invalid");
  }
  const expiresAt = nowSeconds + ttlSeconds;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${externalUserId}.${expiresAt}.${nonce}`;
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function verifyIdentityAssertion(assertion: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): string | null {
  const parts = assertion.split(".");
  if (parts.length !== 4) return null;
  const [userId, expiresAtText, nonce, signature] = parts;
  if (!USER_ID.test(userId) || !NONCE.test(nonce) || !/^[0-9a-f]{64}$/.test(signature)) return null;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(nowSeconds) || expiresAt <= nowSeconds) return null;
  const expected = createHmac("sha256", secret).update(`${userId}.${expiresAtText}.${nonce}`).digest("hex");
  const actualBytes = Buffer.from(signature, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes) ? userId : null;
}

export async function withSignedDatabaseIdentity<T>(client: PoolClient, assertion: string, operation: () => Promise<T>): Promise<T> {
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
