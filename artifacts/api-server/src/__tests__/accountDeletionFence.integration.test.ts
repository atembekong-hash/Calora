import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  ACCOUNT_DELETION_FENCE_ERROR_CLASS,
  AccountDeletionInProgressError,
  classifyAccountDeletionError,
} from "../lib/account-deletion-state.js";

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe("account deletion fence classification", () => {
  it("normalizes application and trigger failures without accepting arbitrary database text", () => {
    expect(classifyAccountDeletionError(new AccountDeletionInProgressError())).toBe(
      ACCOUNT_DELETION_FENCE_ERROR_CLASS,
    );
    expect(
      classifyAccountDeletionError({
        code: "55000",
        message: "account deletion is in progress",
      }),
    ).toBe(ACCOUNT_DELETION_FENCE_ERROR_CLASS);
    expect(
      classifyAccountDeletionError({
        code: "55000",
        message: "account deletion is in progress for raw-account-id",
      }),
    ).toBeNull();
  });
});

describe.skipIf(!HAS_DB)("account deletion database fence (real schema)", () => {
  let pool: typeof import("@workspace/db")["pool"];
  const run = randomUUID().slice(0, 8);
  const externalUserId = `deletion-fence-${run}`;
  const referredUserId = `deletion-fence-referred-${run}`;
  const referralCode = `DELFENCE${run.toUpperCase()}`;
  const qualificationSessionId = `deletion-fence-capture-${run}`;
  const rateLimitKey = `user:${externalUserId}`;

  async function expectDeletionFence(write: Promise<unknown>) {
    await expect(write).rejects.toMatchObject({
      code: "55000",
      message: "account deletion is in progress",
    });
  }

  it("blocks post-deletion writes to every fenced account table", async () => {
    pool = (await import("@workspace/db")).pool;
    await pool.query(
      `INSERT INTO calora_account_deletion_states (identity_fingerprint, state)
       VALUES (encode(digest($1, 'sha256'), 'hex'), 'deleting')`,
      [externalUserId],
    );

    await expectDeletionFence(
      pool.query(
        `INSERT INTO calora_users (external_id, email) VALUES ($1, $2)`,
        [externalUserId, `${externalUserId}@example.com`],
      ),
    );
    await expectDeletionFence(
      pool.query(
        `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)`,
        [externalUserId, referralCode],
      ),
    );
    await expectDeletionFence(
      pool.query(
        `INSERT INTO calora_referral_redemptions
           (code, referrer_user_id, referred_user_id)
         VALUES ($1, $2, $3)`,
        [referralCode, externalUserId, referredUserId],
      ),
    );
    await expectDeletionFence(
      pool.query(
        `INSERT INTO calora_referral_qualifications
           (external_user_id, capture_session_id, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')`,
        [externalUserId, qualificationSessionId],
      ),
    );
    await expectDeletionFence(
      pool.query(
        `INSERT INTO calora_capture_rate_limits (key, count, reset_at)
         VALUES ($1, 1, now() + interval '1 minute')`,
        [rateLimitKey],
      ),
    );
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query(
      `DELETE FROM calora_referral_redemptions
       WHERE referrer_user_id = $1 OR referred_user_id = $2`,
      [externalUserId, referredUserId],
    );
    await pool.query(
      `DELETE FROM calora_referral_qualifications
       WHERE external_user_id = $1 OR capture_session_id = $2`,
      [externalUserId, qualificationSessionId],
    );
    await pool.query(`DELETE FROM calora_referral_codes WHERE user_id = $1`, [externalUserId]);
    await pool.query(`DELETE FROM calora_capture_rate_limits WHERE key = $1`, [rateLimitKey]);
    await pool.query(`DELETE FROM calora_users WHERE external_id = $1`, [externalUserId]);
    await pool.query(
      `DELETE FROM calora_account_deletion_states
       WHERE identity_fingerprint = encode(digest($1, 'sha256'), 'hex')`,
      [externalUserId],
    );
  });
});