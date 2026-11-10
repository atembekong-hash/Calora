import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const NONCE_BYTES = 16;

export function createIdentityAssertion(externalUserId: string, secret: string): string {
  const user = externalUserId.trim();
  if (!user || user.length > 128) throw new Error("Invalid external identity");
  const expires = Math.floor(Date.now() / 1000) + 60;
  const nonce = randomBytes(NONCE_BYTES).toString("base64url");
  const body = `${user}.${expires}.${nonce}`;
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  return `${body}.${signature}`;
}

export function verifyIdentityAssertion(token: string, secret: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [user, expiresText, nonce, signature] = parts;
  if (!user || !/^\d+$/.test(expiresText) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(signature)) return null;
  if (Number(expiresText) <= Math.floor(Date.now() / 1000)) return null;
  const expected = createHmac("sha256", secret).update(`${user}.${expiresText}.${nonce}`).digest("hex");
  const actualBytes = Buffer.from(signature, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes) ? user : null;
}
