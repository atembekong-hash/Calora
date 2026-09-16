/**
 * Referral qualification against the real database schema.
 *
 * A referral becomes eligible only after the authenticated referred account
 * successfully saves a valid diary meal. Capture mode, client id, and the
 * retired SYNC_QUALIFICATION_REQUIRE_SESSION setting do not change that rule.
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

describe.skipIf(!HAS_DB)('referral qualification (real schema)', () => {
  let app: import('express').Express;
  let pool: typeof import('@workspace/db')['pool'];

  const run = randomUUID().slice(0, 8);
  const referrerId = `it-referrer-${run}`;
  const code = `ITCODE${run.toUpperCase()}`;
  const referredIds: string[] = [];

  function actAs(id: string) {
    verifyBearerToken.mockResolvedValue({ id, email: `${id}@example.com` });
  }

  function validMeal(overrides: Record<string, unknown> = {}) {
    return {
      entryDate: '2026-08-11',
      meal: 'Lunch',
      name: 'Grilled chicken bowl',
      serving: '1 bowl',
      calories: 520,
      proteinG: 42,
      carbsG: 45,
      fatG: 18,
      provenance: 'Manual',
      confidence: 85,
      clientUpdatedAt: '2026-08-11T12:30:00.000Z',
      ...overrides,
    };
  }

  async function seedPendingRedemption(referred: string) {
    referredIds.push(referred);
    await pool.query(
      `INSERT INTO calora_referral_redemptions (code, referrer_user_id, referred_user_id)
       VALUES ($1, $2, $3)`,
      [code, referrerId, referred],
    );
  }

  beforeAll(async () => {
    pool = (await import('@workspace/db')).pool;
    const express = (await import('express')).default;
    const diaryRouter = (await import('../routes/diary.js')).default;
    const referralRouter = (await import('../routes/referral.js')).default;
    const syncRouter = (await import('../routes/sync.js')).default;
    app = express();
    app.use(express.json());
    app.use(diaryRouter);
    app.use(referralRouter);
    app.use(syncRouter);

    await pool.query(
      `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code`,
      [referrerId, code],
    );
  });

  afterAll(async () => {
    await pool.query(
      `DELETE FROM calora_referral_redemptions WHERE referred_user_id = ANY($1::text[]) OR referrer_user_id = $2`,
      [referredIds, referrerId],
    );
    await pool.query(
      `DELETE FROM calora_diary_entries WHERE user_id IN
       (SELECT id FROM calora_users WHERE external_id = ANY($1::text[]))`,
      [referredIds],
    );
    await pool.query(`DELETE FROM calora_users WHERE external_id = ANY($1::text[])`, [referredIds]);
    await pool.query(`DELETE FROM calora_referral_codes WHERE user_id = $1`, [referrerId]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    grantPromoDays.mockResolvedValue(new Date());
  });

  it('stays pending until the referred account has a saved meal', async () => {
    const referred = `it-empty-${run}`;
    await seedPendingRedemption(referred);
    actAs(referred);

    const activation = await request(app).post('/v1/referral/activate').send({});

    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('pending');
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  it('qualifies a normal authenticated manual diary save and grants 30 days to both people', async () => {
    const referred = `it-manual-${run}`;
    await seedPendingRedemption(referred);
    actAs(referred);

    const saved = await request(app).post('/v1/diary').send(validMeal());
    expect(saved.status).toBe(201);

    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body).toMatchObject({ status: 'rewarded', referredRewarded: true, referrerRewarded: true });
    expect(grantPromoDays).toHaveBeenCalledWith(referred, 30);
    expect(grantPromoDays).toHaveBeenCalledWith(referrerId, 30);

    grantPromoDays.mockClear();
    const repeat = await request(app).post('/v1/referral/activate').send({});
    expect(repeat.body.status).toBe('rewarded');
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  it('qualifies a synced meal without a capture session even when the retired flag is set', async () => {
    const referred = `it-sync-${run}`;
    await seedPendingRedemption(referred);
    actAs(referred);
    process.env.SYNC_QUALIFICATION_REQUIRE_SESSION = 'true';

    const mutationId = randomUUID();
    const synced = await request(app).post('/v1/sync').send({
      deviceId: randomUUID(),
      mutations: [{
        mutationId,
        entity: 'diaryEntry',
        operation: 'upsert',
        clientUpdatedAt: '2026-08-11T14:00:00.000Z',
        payload: { clientId: randomUUID(), ...validMeal() },
      }],
    });
    expect(synced.status).toBe(200);
    expect(synced.body.accepted).toContain(mutationId);

    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body).toMatchObject({ status: 'rewarded', referredRewarded: true, referrerRewarded: true });
    expect(grantPromoDays).toHaveBeenCalledWith(referred, 30);
    expect(grantPromoDays).toHaveBeenCalledWith(referrerId, 30);
    delete process.env.SYNC_QUALIFICATION_REQUIRE_SESSION;
  });
});