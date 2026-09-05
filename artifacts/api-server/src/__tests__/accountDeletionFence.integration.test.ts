import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)("account deletion database fence (real schema)", () => {
  let pool: typeof import("@workspace/db")["pool"];
  const externalUserId = `deletion-fence-${randomUUID()}`;

  it("blocks a fenced user write after deletion begins", async () => {
    pool = (await import("@workspace/db")).pool;
    await pool.query(
      `INSERT INTO calora_account_deletion_states (identity_fingerprint, state)
       VALUES (encode(digest($1, 'sha256'), 'hex'), 'deleting')`,
      [externalUserId],
    );

    const write = pool.query(
      `INSERT INTO calora_users (external_id, email) VALUES ($1, $2)`,
      [externalUserId, `${externalUserId}@example.com`],
    );

    await expect(write).rejects.toMatchObject({
      code: "55000",
      message: expect.stringContaining("account deletion is in progress"),
    });
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query(
      `DELETE FROM calora_account_deletion_states
       WHERE identity_fingerprint = encode(digest($1, 'sha256'), 'hex')`,
      [externalUserId],
    );
  });
});