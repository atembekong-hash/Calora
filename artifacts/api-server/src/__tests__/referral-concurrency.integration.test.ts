/**
 * Referral reward integrity under rapid retries — real database.
 *
 * Task focus: the activate endpoint's claim-first idempotency (atomic
 * UPDATE ... WHERE *_rewarded_at IS NULL) must hold under concurrency and
 * provider failures:
 *   • double activate concurrency → exactly one RevenueCat grant per side
 *   • provider grant failure → claim released (rollback) → later retry grants
 *   • redeem guardrails: self-referral 400, duplicate redemption 409
 *   • multiple completed referrals for one referrer each receive their reward
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

  it('releases the referrer claim when only the referrer grant fails, then a retry grants once', async () => {
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
    expect(row.referrer_rewarded_at).toBeNull(); // claim released

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

  // ── No referral cap ───────────────────────────────────────────────────
  it('grants every completed referral for the same referrer without a monthly cap', async () => {
    const uncappedReferrer = `ct-uncapped-referrer-${run}`;
    const uncappedCode = `CTUNCAP${run.toUpperCase()}`;
    await pool.query(
      `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)`,
      [uncappedReferrer, uncappedCode],
    );

    // Existing rewards this month must not block subsequent valid referrals.
    for (let i = 0; i < 3; i++) {
      const prior = `ct-uncapped-prior-${i}-${run}`;
      referredIds.push(prior);
      await pool.query(
        `INSERT INTO calora_referral_redemptions
           (code, referrer_user_id, referred_user_id, status, qualified_at, qualified_signal,
            referred_rewarded_at, referrer_rewarded_at)
         VALUES ($1, $2, $3, 'rewarded', now(), 'diary_sync', now(), now())`,
        [uncappedCode, uncappedReferrer, prior],
      );
    }

    const laterReferrals = [`ct-uncapped-4-${run}`, `ct-uncapped-5-${run}`];
    for (const referred of laterReferrals) {
      await seedQualifiedRedemption(referred, uncappedReferrer, uncappedCode);
      actAs(referred);
      const result = await request(app).post('/v1/referral/activate').send({});
      expect(result.status).toBe(200);
      expect(result.body.referredRewarded).toBe(true);
      expect(result.body.referrerRewarded).toBe(true);
    }

    expect(grantPromoDays.mock.calls.filter((c) => c[0] === uncappedReferrer)).toHaveLength(2);
    for (const referred of laterReferrals) {
      expect(grantPromoDays).toHaveBeenCalledWith(referred, 30);
      const row = await redemptionRow(referred);
      expect(row.referred_rewarded_at).not.toBeNull();
      expect(row.referrer_rewarded_at).not.toBeNull();
    }

    await pool.query(`DELETE FROM calora_referral_redemptions WHERE referrer_user_id = $1`, [uncappedReferrer]);
    await pool.query(`DELETE FROM calora_referral_codes WHERE user_id = $1`, [uncappedReferrer]);
  });
});
