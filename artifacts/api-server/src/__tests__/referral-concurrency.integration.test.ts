/**
 * Referral reward integrity under rapid retries — real database.
 *
 * Task focus: the activate endpoint's claim-first idempotency (atomic
 * UPDATE ... WHERE *_rewarded_at IS NULL) and the FOR UPDATE per-referrer
 * monthly cap must hold under concurrency and provider failures:
 *   • double activate concurrency → exactly one RevenueCat grant per side
 *   • provider grant failure → claim released (rollback) → later retry grants
 *   • redeem guardrails: self-referral 400, duplicate redemption 409
 *   • monthly cap boundary: 4th reward granted, 5th withheld (referred side
 *     still rewarded)
 *
 * Runs against DATABASE_URL (same schema as startup migrations); skipped
 * when no database is configured.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

const HAS_DB = Boolean(process.env.DATABASE_URL);

const verifyBearerToken = vi.fn();
vi.mock('../lib/supabase-auth.js', () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

const grantPromoDays = vi.fn();
vi.mock('../lib/revenuecat.js', () => ({
  grantPromoDays: (...args: unknown[]) => grantPromoDays(...args),
}));

describe.skipIf(!HAS_DB)('referral rewards under rapid retries (real schema)', () => {
  let app: import('express').Express;
  let pool: typeof import('@workspace/db')['pool'];

  const run = randomUUID().slice(0, 8);
  const referrerId = `ct-referrer-${run}`;
  const code = `CTCODE${run.toUpperCase()}`;
  /** Every referred user id created in this run, for cleanup. */
  const referredIds: string[] = [];

  function actAs(userId: string) {
    verifyBearerToken.mockResolvedValue({ id: userId, email: `${userId}@example.com` });
  }

  /** Seed a pending, already-qualified redemption for a fresh referred user. */
  async function seedQualifiedRedemption(referred: string, referrer = referrerId, seedCode = code) {
    referredIds.push(referred);
    await pool.query(
      `INSERT INTO calora_referral_redemptions
         (code, referrer_user_id, referred_user_id, status, qualified_at, qualified_signal)
       VALUES ($1, $2, $3, 'pending', now(), 'diary_sync')`,
      [seedCode, referrer, referred],
    );
  }

  async function redemptionRow(referred: string) {
    const { rows } = await pool.query(
      `SELECT status, referred_rewarded_at, referrer_rewarded_at
       FROM calora_referral_redemptions WHERE referred_user_id = $1`,
      [referred],
    );
    return rows[0];
  }

  beforeAll(async () => {
    pool = (await import('@workspace/db')).pool;
    const express = (await import('express')).default;
    const referralRouter = (await import('../routes/referral.js')).default;
    app = express();
    app.use(express.json());
    app.use(referralRouter);

    await pool.query(
      `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code`,
      [referrerId, code],
    );
  });

  afterAll(async () => {
    await pool.query(
      `DELETE FROM calora_referral_redemptions WHERE referrer_user_id = $1 OR referred_user_id = ANY($2)`,
      [referrerId, referredIds],
    );
    await pool.query(`DELETE FROM calora_referral_codes WHERE user_id = $1`, [referrerId]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    grantPromoDays.mockResolvedValue(new Date());
  });

  // ── Redeem guardrails ─────────────────────────────────────────────────
  it('rejects self-referral with 400 and never creates a redemption', async () => {
    actAs(referrerId);
    const res = await request(app).post('/v1/referral/redeem').send({ code });
    expect(res.status).toBe(400);
    const { rowCount } = await pool.query(
      `SELECT 1 FROM calora_referral_redemptions WHERE referred_user_id = $1`,
      [referrerId],
    );
    expect(rowCount).toBe(0);
  });

  it('rejects a second redemption for the same account with 409', async () => {
    const referred = `ct-dup-${run}`;
    referredIds.push(referred);
    actAs(referred);

    const first = await request(app).post('/v1/referral/redeem').send({ code });
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('pending');

    const second = await request(app).post('/v1/referral/redeem').send({ code });
    expect(second.status).toBe(409);

    const { rowCount } = await pool.query(
      `SELECT 1 FROM calora_referral_redemptions WHERE referred_user_id = $1`,
      [referred],
    );
    expect(rowCount).toBe(1);
  });

  it('CONCURRENCY: parallel duplicate redeems create exactly one redemption', async () => {
    const referred = `ct-race-redeem-${run}`;
    referredIds.push(referred);
    actAs(referred);

    const results = await Promise.all(
      Array.from({ length: 4 }, () => request(app).post('/v1/referral/redeem').send({ code })),
    );
    const ok = results.filter((r) => r.status === 200).length;
    const conflict = results.filter((r) => r.status === 409).length;
    expect(ok).toBeGreaterThanOrEqual(1);
    expect(ok + conflict).toBe(4);

    const { rowCount } = await pool.query(
      `SELECT 1 FROM calora_referral_redemptions WHERE referred_user_id = $1`,
      [referred],
    );
    expect(rowCount).toBe(1);
  });

  // ── Activate: claim-first idempotency ─────────────────────────────────
  it('CONCURRENCY: simultaneous activations grant each side exactly once', async () => {
    const referred = `ct-race-activate-${run}`;
    await seedQualifiedRedemption(referred);
    actAs(referred);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post('/v1/referral/activate').send({})),
    );
    for (const r of results) expect(r.status).toBe(200);

    const referredGrants = grantPromoDays.mock.calls.filter((c) => c[0] === referred);
    const referrerGrants = grantPromoDays.mock.calls.filter((c) => c[0] === referrerId);
    expect(referredGrants).toHaveLength(1);
    expect(referrerGrants).toHaveLength(1);

    const row = await redemptionRow(referred);
    expect(row.status).toBe('rewarded');
    expect(row.referred_rewarded_at).not.toBeNull();
    expect(row.referrer_rewarded_at).not.toBeNull();
  });

  it('a repeat activation after success never re-grants', async () => {
    const referred = `ct-repeat-${run}`;
    await seedQualifiedRedemption(referred);
    actAs(referred);

    const first = await request(app).post('/v1/referral/activate').send({});
    expect(first.status).toBe(200);
    expect(first.body.referredRewarded).toBe(true);
    expect(grantPromoDays).toHaveBeenCalledTimes(2);

    grantPromoDays.mockClear();
    const again = await request(app).post('/v1/referral/activate').send({});
    expect(again.status).toBe(200);
    expect(again.body.status).toBe('rewarded');
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  // ── Activate: grant failure rollback then retry ───────────────────────
  it('releases the referred claim when the provider grant fails, then a retry succeeds with exactly one grant', async () => {
    const referred = `ct-rollback-${run}`;
    await seedQualifiedRedemption(referred);
    actAs(referred);

    grantPromoDays.mockRejectedValueOnce(new Error('RevenueCat 503'));
    const failed = await request(app).post('/v1/referral/activate').send({});
    expect(failed.status).toBe(502);
    expect(failed.body.referredRewarded).toBe(false);

    // Claim must be released so a retry can win it again.
    let row = await redemptionRow(referred);
    expect(row.status).toBe('pending');
    expect(row.referred_rewarded_at).toBeNull();

    grantPromoDays.mockClear();
    grantPromoDays.mockResolvedValue(new Date());
    const retried = await request(app).post('/v1/referral/activate').send({});
    expect(retried.status).toBe(200);
    expect(retried.body.referredRewarded).toBe(true);
    expect(grantPromoDays.mock.calls.filter((c) => c[0] === referred)).toHaveLength(1);

    row = await redemptionRow(referred);
    expect(row.status).toBe('rewarded');
    expect(row.referred_rewarded_at).not.toBeNull();
  });

  it('releases the referrer cap slot when only the referrer grant fails, then a retry grants once', async () => {
    const referred = `ct-ref-rollback-${run}`;
    await seedQualifiedRedemption(referred);
    actAs(referred);

    // Referred grant succeeds; referrer grant fails.
    grantPromoDays.mockImplementation(async (userId: string) => {
      if (userId === referrerId) throw new Error('RevenueCat 503');
      return new Date();
    });
    const first = await request(app).post('/v1/referral/activate').send({});
    expect(first.status).toBe(200);
    expect(first.body.referredRewarded).toBe(true);
    expect(first.body.referrerRewarded).toBe(false);

    let row = await redemptionRow(referred);
    expect(row.referred_rewarded_at).not.toBeNull();
    expect(row.referrer_rewarded_at).toBeNull(); // cap slot released

    grantPromoDays.mockClear();
    grantPromoDays.mockResolvedValue(new Date());
    const retried = await request(app).post('/v1/referral/activate').send({});
    expect(retried.status).toBe(200);
    expect(retried.body.referrerRewarded).toBe(true);
    // Referred side already settled — only the referrer is granted on retry.
    expect(grantPromoDays.mock.calls).toHaveLength(1);
    expect(grantPromoDays.mock.calls[0][0]).toBe(referrerId);

    row = await redemptionRow(referred);
    expect(row.referrer_rewarded_at).not.toBeNull();
  });

  // ── Monthly cap boundary ──────────────────────────────────────────────
  it('grants the 4th referrer reward of the month but withholds the 5th (referred side still rewarded)', async () => {
    // Fresh referrer so earlier tests' rewards don't pollute the count.
    const capReferrer = `ct-cap-referrer-${run}`;
    const capCode = `CTCAP${run.toUpperCase()}`;
    await pool.query(
      `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)`,
      [capReferrer, capCode],
    );

    // Seed 3 already-rewarded redemptions this month.
    for (let i = 0; i < 3; i++) {
      const prior = `ct-cap-prior-${i}-${run}`;
      referredIds.push(prior);
      await pool.query(
        `INSERT INTO calora_referral_redemptions
           (code, referrer_user_id, referred_user_id, status, qualified_at, qualified_signal,
            referred_rewarded_at, referrer_rewarded_at)
         VALUES ($1, $2, $3, 'rewarded', now(), 'diary_sync', now(), now())`,
        [capCode, capReferrer, prior],
      );
    }

    // 4th activation: exactly at the cap boundary — still granted.
    const fourth = `ct-cap-4th-${run}`;
    await seedQualifiedRedemption(fourth, capReferrer, capCode);
    actAs(fourth);
    const res4 = await request(app).post('/v1/referral/activate').send({});
    expect(res4.status).toBe(200);
    expect(res4.body.referredRewarded).toBe(true);
    expect(res4.body.referrerRewarded).toBe(true);
    expect(grantPromoDays.mock.calls.filter((c) => c[0] === capReferrer)).toHaveLength(1);

    // 5th activation: over the cap — referrer withheld, referred still rewarded.
    grantPromoDays.mockClear();
    const fifth = `ct-cap-5th-${run}`;
    await seedQualifiedRedemption(fifth, capReferrer, capCode);
    actAs(fifth);
    const res5 = await request(app).post('/v1/referral/activate').send({});
    expect(res5.status).toBe(200);
    expect(res5.body.referredRewarded).toBe(true);
    expect(res5.body.referrerRewarded).toBe(false);
    expect(grantPromoDays.mock.calls.filter((c) => c[0] === capReferrer)).toHaveLength(0);
    expect(grantPromoDays.mock.calls.filter((c) => c[0] === fifth)).toHaveLength(1);

    const row = await redemptionRow(fifth);
    expect(row.referred_rewarded_at).not.toBeNull();
    expect(row.referrer_rewarded_at).toBeNull();

    await pool.query(`DELETE FROM calora_referral_redemptions WHERE referrer_user_id = $1`, [capReferrer]);
    await pool.query(`DELETE FROM calora_referral_codes WHERE user_id = $1`, [capReferrer]);
  });
});
