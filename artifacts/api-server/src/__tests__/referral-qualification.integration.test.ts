/**
 * End-to-end referral qualification against the REAL database schema.
 *
 * Exercises the full server-verified chain with actual SQL (no db-chain
 * mocks): a persisted capture session + candidates → first-log sync →
 * referral activation, plus the adversarial case where a fabricated
 * payload with a fresh JWT creates no diary record and triggers no
 * RevenueCat call.
 *
 * Runs against DATABASE_URL (the same schema the startup migrations
 * create); skipped when no database is configured.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

const HAS_DB = Boolean(process.env.DATABASE_URL);

// Auth mock: each test decides which Supabase user the bearer token maps to.
const verifyBearerToken = vi.fn();
vi.mock('../lib/supabase-auth.js', () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

// RevenueCat mock: counts grant attempts — the adversarial assertion.
const grantPromoDays = vi.fn();
vi.mock('../lib/revenuecat.js', () => ({
  grantPromoDays: (...args: unknown[]) => grantPromoDays(...args),
}));

describe.skipIf(!HAS_DB)('referral qualification end-to-end (real schema)', () => {
  let app: import('express').Express;
  let pool: typeof import('@workspace/db')['pool'];
  let db: typeof import('@workspace/db')['db'];
  let schema: typeof import('@workspace/db');

  // Unique per-run identities so reruns never collide.
  const run = randomUUID().slice(0, 8);
  const referrerId = `it-referrer-${run}`;
  const referredId = `it-referred-${run}`;
  const referredEmail = `it-${run}@example.com`;
  const code = `ITCODE${run.toUpperCase()}`;

  beforeAll(async () => {
    schema = await import('@workspace/db');
    db = schema.db;
    pool = schema.pool;
    const express = (await import('express')).default;
    const diaryRouter = (await import('../routes/diary.js')).default;
    const referralRouter = (await import('../routes/referral.js')).default;
    app = express();
    app.use(express.json());
    app.use(diaryRouter);
    app.use(referralRouter);

    // Seed a referral code + pending redemption for the referred user.
    await pool.query(
      `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code`,
      [referrerId, code],
    );
    await pool.query(
      `INSERT INTO calora_referral_redemptions (code, referrer_user_id, referred_user_id)
       VALUES ($1, $2, $3)`,
      [code, referrerId, referredId],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM calora_referral_redemptions WHERE referred_user_id = $1`, [referredId]);
    await pool.query(`DELETE FROM calora_referral_codes WHERE user_id = $1`, [referrerId]);
    await pool.query(`DELETE FROM calora_users WHERE external_id = $1`, [referredId]);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    verifyBearerToken.mockResolvedValue({ id: referredId, email: referredEmail });
    grantPromoDays.mockResolvedValue(new Date());
  });

  const entry = (overrides: Record<string, unknown> = {}) => ({
    captureSessionId: randomUUID(),
    entryDate: '2026-08-11',
    meal: 'Lunch',
    name: 'Grilled chicken bowl',
    serving: '1 bowl',
    calories: 520,
    proteinG: 42,
    carbsG: 45,
    fatG: 18,
    provenance: 'Photo estimate',
    confidence: 85,
    clientUpdatedAt: '2026-08-11T12:30:00.000Z',
    ...overrides,
  });

  it('ADVERSARIAL: fabricated first-log + activation never reaches RevenueCat', async () => {
    const fabricated = await request(app).post('/v1/diary/first-log').send(entry());
    expect(fabricated.status).toBe(422);

    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('pending');
    expect(activation.body.referredRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();

    const rows = await pool.query(
      `SELECT d.id FROM calora_diary_entries d
       JOIN calora_users u ON u.id = d.user_id
       WHERE u.external_id = $1`,
      [referredId],
    );
    expect(rows.rowCount).toBe(0);
  });

  it('a real server-recorded capture session qualifies the referral end-to-end', async () => {
    // Simulate what routes/capture.ts persists for an authenticated analysis.
    const { ensureUserRow } = await import('../lib/user-rows.js');
    const userId = await ensureUserRow(referredId, referredEmail);
    const sessionId = randomUUID();
    await db.insert(schema.aiCaptureSessionsTable).values({ id: sessionId, userId, mode: 'food', status: 'review' });
    await db.insert(schema.aiCaptureCandidatesTable).values({
      sessionId,
      name: 'Grilled chicken bowl',
      calories: '540',
      proteinG: '40',
      carbsG: '48',
      fatG: '17',
      confidence: 85,
      evidence: {},
    });

    const synced = await request(app).post('/v1/diary/first-log').send(entry({ captureSessionId: sessionId }));
    expect(synced.status).toBe(200);
    expect(synced.body).toEqual({ synced: true, alreadyExisted: false });

    // Session is single-use now.
    const reuse = await request(app).post('/v1/diary/first-log').send(entry({ captureSessionId: sessionId }));
    expect(reuse.body).toEqual({ synced: true, alreadyExisted: true });

    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.referredRewarded).toBe(true);
    expect(grantPromoDays).toHaveBeenCalled();
  });
});
