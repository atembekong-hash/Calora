/**
 * End-to-end referral qualification against the REAL database schema.
 *
 * Exercises the full server-verified chain with actual SQL (no db-chain
 * mocks):
 *   • capture session + candidates → first-log sync → referral activation
 *   • outbox sync (POST /v1/sync with client_id) → referral activation
 *   • adversarial cases: fabricated first-log, plain diary POST (no client_id)
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

  // Separate identity used exclusively by the sync-path tests so those tests
  // don't affect the redemption row read by the capture-session happy-path test.
  const syncReferredId = `it-sync-referred-${run}`;
  const syncReferredEmail = `it-sync-${run}@example.com`;
  const syncCode = `ITSYNC${run.toUpperCase()}`;

  // Separate identity used exclusively by text-mode exclusion tests (Path 1).
  const textReferredId = `it-text-referred-${run}`;
  const textReferredEmail = `it-text-${run}@example.com`;
  const textCode = `ITTEXT${run.toUpperCase()}`;

  // Identity for ADVERSARIAL Path 2: sync entry referencing a text-mode session.
  // The server must drop the session anchor and the entry must not qualify.
  const syncTextReferredId = `it-stext-referred-${run}`;
  const syncTextReferredEmail = `it-stext-${run}@example.com`;
  const syncTextCode = `ITSTEXT${run.toUpperCase()}`;

  // Identity for ADVERSARIAL Path 2: sync entry without any captureSessionId.
  // Under the default REQUIRE_SESSION_FOR_SYNC=true policy this must not qualify.
  const syncNoSessReferredId = `it-snos-referred-${run}`;
  const syncNoSessReferredEmail = `it-snos-${run}@example.com`;
  const syncNoSessCode = `ITSNOS${run.toUpperCase()}`;

  beforeAll(async () => {
    schema = await import('@workspace/db');
    db = schema.db;
    pool = schema.pool;

    // Apply any schema columns that may not exist on a pre-migration DB.
    // Safe no-ops when the column already exists.
    await pool.query(`
      ALTER TABLE calora_diary_entries
        ADD COLUMN IF NOT EXISTS capture_session_id UUID
          REFERENCES calora_ai_capture_sessions(id) ON DELETE SET NULL
    `);

    const express = (await import('express')).default;
    const diaryRouter = (await import('../routes/diary.js')).default;
    const referralRouter = (await import('../routes/referral.js')).default;
    const syncRouter = (await import('../routes/sync.js')).default;
    app = express();
    app.use(express.json());
    app.use(diaryRouter);
    app.use(referralRouter);
    app.use(syncRouter);

    // Seed a referral code + pending redemption for the referred user
    // (capture-session path tests).
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

    // Seed a second referral code + pending redemption for the sync-path user
    // so sync-path tests have their own isolated redemption row.
    await pool.query(
      `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code`,
      [referrerId, syncCode],
    );
    await pool.query(
      `INSERT INTO calora_referral_redemptions (code, referrer_user_id, referred_user_id)
       VALUES ($1, $2, $3)`,
      [syncCode, referrerId, syncReferredId],
    );

    // Seed a third referral code + pending redemption for the text-mode
    // exclusion tests so they have their own isolated redemption row.
    await pool.query(
      `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code`,
      [referrerId, textCode],
    );
    await pool.query(
      `INSERT INTO calora_referral_redemptions (code, referrer_user_id, referred_user_id)
       VALUES ($1, $2, $3)`,
      [textCode, referrerId, textReferredId],
    );

    // Seed a referral code + pending redemption for the Path 2 text-mode
    // adversarial sync tests (captureSessionId referencing a text session).
    await pool.query(
      `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code`,
      [referrerId, syncTextCode],
    );
    await pool.query(
      `INSERT INTO calora_referral_redemptions (code, referrer_user_id, referred_user_id)
       VALUES ($1, $2, $3)`,
      [syncTextCode, referrerId, syncTextReferredId],
    );

    // Seed a referral code + pending redemption for the Path 2 no-session
    // adversarial sync tests (sync without captureSessionId).
    await pool.query(
      `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code`,
      [referrerId, syncNoSessCode],
    );
    await pool.query(
      `INSERT INTO calora_referral_redemptions (code, referrer_user_id, referred_user_id)
       VALUES ($1, $2, $3)`,
      [syncNoSessCode, referrerId, syncNoSessReferredId],
    );
  });

  afterAll(async () => {
    const allReferredIds = [referredId, syncReferredId, textReferredId, syncTextReferredId, syncNoSessReferredId];
    await pool.query(
      `DELETE FROM calora_referral_redemptions WHERE referred_user_id = ANY($1::text[])`,
      [allReferredIds],
    );
    await pool.query(`DELETE FROM calora_referral_codes WHERE user_id = $1`, [referrerId]);
    await pool.query(
      `DELETE FROM calora_ai_capture_sessions WHERE user_id IN
         (SELECT id FROM calora_users WHERE external_id = ANY($1::text[]))`,
      [allReferredIds],
    );
    await pool.query(
      `DELETE FROM calora_diary_entries WHERE user_id IN
         (SELECT id FROM calora_users WHERE external_id = ANY($1::text[]))`,
      [allReferredIds],
    );
    await pool.query(
      `DELETE FROM calora_users WHERE external_id = ANY($1::text[])`,
      [allReferredIds],
    );
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

  it('ADVERSARIAL: a fabricated plain diary POST persists an entry but never qualifies the referral', async () => {
    // /v1/diary accepts a valid ordinary payload from any authenticated user
    // and MUST persist it — but qualification is anchored to a claimed
    // capture session, so the persisted row must not unlock rewards.
    const { captureSessionId: _omit, ...plainEntry } = entry();
    const fabricated = await request(app).post('/v1/diary').send(plainEntry);
    expect(fabricated.status).toBe(201);
    expect(fabricated.body.name).toBe('Grilled chicken bowl');

    const persisted = await pool.query(
      `SELECT d.id FROM calora_diary_entries d
       JOIN calora_users u ON u.id = d.user_id
       WHERE u.external_id = $1`,
      [referredId],
    );
    expect(persisted.rowCount).toBe(1);

    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('pending');
    expect(activation.body.referredRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();

    // Clean up any persisted entry so it can't affect later assertions.
    await pool.query(
      `DELETE FROM calora_diary_entries WHERE user_id IN
         (SELECT id FROM calora_users WHERE external_id = $1)`,
      [referredId],
    );
  });

  // ── Sync-path tests (POST /v1/sync) ────────────────────────────────────────
  // These tests use syncReferredId / syncCode so they have their own isolated
  // redemption row and cannot affect the capture-session happy-path below.

  it('ADVERSARIAL (sync path): a plain POST /v1/diary without client_id does not qualify the sync redemption', async () => {
    // Override the mock so activation reads syncReferredId's redemption row.
    verifyBearerToken.mockResolvedValue({ id: syncReferredId, email: syncReferredEmail });

    // POST /v1/diary writes a diary entry with no client_id — this must NOT
    // count as a synced entry and must NOT unlock the referral reward.
    const { captureSessionId: _omit, ...plainEntry } = entry();
    const posted = await request(app).post('/v1/diary').send(plainEntry);
    expect(posted.status).toBe(201);
    expect(posted.body.name).toBe('Grilled chicken bowl');

    // Confirm the entry was persisted (client_id column is NULL).
    const persisted = await pool.query(
      `SELECT d.client_id FROM calora_diary_entries d
       JOIN calora_users u ON u.id = d.user_id
       WHERE u.external_id = $1`,
      [syncReferredId],
    );
    expect(persisted.rowCount).toBe(1);
    expect(persisted.rows[0].client_id).toBeNull();

    // Activation must stay pending — a NULL-client_id row is not a sync signal.
    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('pending');
    expect(activation.body.referredRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();

    // Clean up so the happy-path sync test starts from a known state.
    await pool.query(
      `DELETE FROM calora_diary_entries WHERE user_id IN
         (SELECT id FROM calora_users WHERE external_id = $1)`,
      [syncReferredId],
    );
  });

  it('a diary entry synced via POST /v1/sync with an image-mode captureSessionId qualifies the referral end-to-end', async () => {
    // Override the mock so all requests act as the sync-path user.
    verifyBearerToken.mockResolvedValue({ id: syncReferredId, email: syncReferredEmail });

    // Create an image-mode capture session for the sync user.  The sync handler
    // will verify this session belongs to the user and has mode != 'text' before
    // writing capture_session_id to the diary row.
    const { ensureUserRow } = await import('../lib/user-rows.js');
    const syncUserId = await ensureUserRow(syncReferredId, syncReferredEmail);
    const imageSessionId = randomUUID();
    await db.insert(schema.aiCaptureSessionsTable).values({
      id: imageSessionId,
      userId: syncUserId,
      mode: 'food',
      status: 'review',
    });

    const clientId = randomUUID();
    const mutationId = randomUUID();

    // POST /v1/sync with a diaryEntry upsert including captureSessionId.
    // The server verifies the session and writes capture_session_id to the row.
    const synced = await request(app).post('/v1/sync').send({
      deviceId: randomUUID(),
      mutations: [
        {
          mutationId,
          entity: 'diaryEntry',
          operation: 'upsert',
          clientUpdatedAt: '2026-08-11T14:00:00.000Z',
          payload: {
            clientId,
            captureSessionId: imageSessionId,
            entryDate: '2026-08-11',
            meal: 'Dinner',
            name: 'Salmon with rice',
            serving: '1 plate',
            calories: 680,
            proteinG: 54,
            carbsG: 60,
            fatG: 22,
            provenance: 'Photo estimate',
            confidence: 80,
            notes: null,
          },
        },
      ],
    });
    expect(synced.status).toBe(200);
    expect(synced.body.accepted).toContain(mutationId);
    expect(synced.body.conflicts).toHaveLength(0);

    // Confirm the diary row has both client_id and capture_session_id populated.
    const rows = await pool.query(
      `SELECT d.client_id, d.capture_session_id FROM calora_diary_entries d
       JOIN calora_users u ON u.id = d.user_id
       WHERE u.external_id = $1`,
      [syncReferredId],
    );
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].client_id).toBe(clientId);
    expect(rows.rows[0].capture_session_id).toBe(imageSessionId);

    // Activation must now grant the reward via RevenueCat.
    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('rewarded');
    expect(activation.body.referredRewarded).toBe(true);
    expect(grantPromoDays).toHaveBeenCalled();

    // Re-activating is idempotent — no second RevenueCat call.
    vi.clearAllMocks();
    verifyBearerToken.mockResolvedValue({ id: syncReferredId, email: syncReferredEmail });
    grantPromoDays.mockResolvedValue(new Date());
    const reactivation = await request(app).post('/v1/referral/activate').send({});
    expect(reactivation.status).toBe(200);
    expect(reactivation.body.status).toBe('rewarded');
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  // ── Path 2 session-anchor adversarial tests ────────────────────────────────
  // Text-mode or absent captureSessionId must not qualify Path 2.

  it('ADVERSARIAL (Path 2 text-mode session): sync entry referencing a text-mode session does not qualify', async () => {
    // Use the isolated syncTextReferredId identity.
    verifyBearerToken.mockResolvedValue({ id: syncTextReferredId, email: syncTextReferredEmail });

    const { ensureUserRow } = await import('../lib/user-rows.js');
    const userId = await ensureUserRow(syncTextReferredId, syncTextReferredEmail);

    // Create a text-mode capture session for this user.
    const textSessionId = randomUUID();
    await db.insert(schema.aiCaptureSessionsTable).values({
      id: textSessionId,
      userId,
      mode: 'text',
      status: 'review',
    });

    const clientId = randomUUID();
    const mutationId = randomUUID();

    // POST /v1/sync with captureSessionId pointing to a text-mode session.
    // The server must silently drop the anchor (capture_session_id stays NULL)
    // and the entry must not qualify for a referral reward.
    const synced = await request(app).post('/v1/sync').send({
      deviceId: randomUUID(),
      mutations: [
        {
          mutationId,
          entity: 'diaryEntry',
          operation: 'upsert',
          clientUpdatedAt: '2026-08-11T15:00:00.000Z',
          payload: {
            clientId,
            captureSessionId: textSessionId,
            entryDate: '2026-08-11',
            meal: 'Lunch',
            name: 'Typed food entry',
            serving: '1 bowl',
            calories: 400,
            proteinG: 30,
            carbsG: 40,
            fatG: 10,
            provenance: 'Manual',
            confidence: 60,
            notes: null,
          },
        },
      ],
    });
    expect(synced.status).toBe(200);
    expect(synced.body.accepted).toContain(mutationId);

    // The diary row must exist (food log is preserved) but capture_session_id
    // must be NULL because the server rejected the text-mode session anchor.
    const rows = await pool.query(
      `SELECT d.client_id, d.capture_session_id FROM calora_diary_entries d
       JOIN calora_users u ON u.id = d.user_id
       WHERE u.external_id = $1`,
      [syncTextReferredId],
    );
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].client_id).toBe(clientId);
    expect(rows.rows[0].capture_session_id).toBeNull();

    // Activation must stay pending — text-mode session anchor was rejected.
    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('pending');
    expect(activation.body.referredRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  it('ADVERSARIAL (Path 2 unapproved non-text mode): sync entry referencing a receipt-mode session does not qualify', async () => {
    // Use the syncTextReferredId identity (already has a text session but no
    // rewarded redemption).  Create a receipt-mode session for the same user
    // and confirm that an unapproved non-text mode is also rejected.
    verifyBearerToken.mockResolvedValue({ id: syncTextReferredId, email: syncTextReferredEmail });

    const { ensureUserRow } = await import('../lib/user-rows.js');
    const userId = await ensureUserRow(syncTextReferredId, syncTextReferredEmail);

    const receiptSessionId = randomUUID();
    await db.insert(schema.aiCaptureSessionsTable).values({
      id: receiptSessionId,
      userId,
      mode: 'receipt', // image-based but not in the qualifying-mode allowlist
      status: 'review',
    });

    const clientId = randomUUID();
    const mutationId = randomUUID();

    const synced = await request(app).post('/v1/sync').send({
      deviceId: randomUUID(),
      mutations: [
        {
          mutationId,
          entity: 'diaryEntry',
          operation: 'upsert',
          clientUpdatedAt: '2026-08-11T16:00:00.000Z',
          payload: {
            clientId,
            captureSessionId: receiptSessionId,
            entryDate: '2026-08-11',
            meal: 'Dinner',
            name: 'Receipt-scanned meal',
            serving: '1 portion',
            calories: 500,
            proteinG: 30,
            carbsG: 50,
            fatG: 15,
            provenance: 'Manual',
            confidence: 70,
            notes: null,
          },
        },
      ],
    });
    expect(synced.status).toBe(200);
    expect(synced.body.accepted).toContain(mutationId);

    // capture_session_id must be NULL — receipt mode is not in the allowlist.
    const rows = await pool.query(
      `SELECT d.capture_session_id FROM calora_diary_entries d
       JOIN calora_users u ON u.id = d.user_id
       WHERE u.external_id = $1 AND d.client_id = $2`,
      [syncTextReferredId, clientId],
    );
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].capture_session_id).toBeNull();

    // Activation must remain pending.
    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('pending');
    expect(activation.body.referredRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  it('ADVERSARIAL (Path 2 no session): sync entry without captureSessionId does not qualify under default policy', async () => {
    // Use the isolated syncNoSessReferredId identity.
    verifyBearerToken.mockResolvedValue({ id: syncNoSessReferredId, email: syncNoSessReferredEmail });

    const clientId = randomUUID();
    const mutationId = randomUUID();

    // POST /v1/sync without a captureSessionId — capture_session_id stays NULL.
    // Under the default REQUIRE_SESSION_FOR_SYNC=true policy this must not
    // qualify for a referral reward even though client_id is present.
    const synced = await request(app).post('/v1/sync').send({
      deviceId: randomUUID(),
      mutations: [
        {
          mutationId,
          entity: 'diaryEntry',
          operation: 'upsert',
          clientUpdatedAt: '2026-08-11T15:30:00.000Z',
          payload: {
            clientId,
            entryDate: '2026-08-11',
            meal: 'Snack',
            name: 'Apple',
            serving: '1 medium',
            calories: 95,
            proteinG: 0,
            carbsG: 25,
            fatG: 0,
            provenance: 'Manual',
            confidence: 90,
            notes: null,
          },
        },
      ],
    });
    expect(synced.status).toBe(200);
    expect(synced.body.accepted).toContain(mutationId);

    // Confirm the row has a client_id but no capture_session_id.
    const rows = await pool.query(
      `SELECT d.client_id, d.capture_session_id FROM calora_diary_entries d
       JOIN calora_users u ON u.id = d.user_id
       WHERE u.external_id = $1`,
      [syncNoSessReferredId],
    );
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].client_id).toBe(clientId);
    expect(rows.rows[0].capture_session_id).toBeNull();

    // Activation must stay pending — no capture session anchor means no reward.
    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('pending');
    expect(activation.body.referredRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  // ── Text-mode exclusion tests ───────────────────────────────────────────────
  // Text-only captures (mode = 'text') must not qualify a referral reward.

  it('ADVERSARIAL (text-mode): first-log rejects a text-mode capture session with 422', async () => {
    // Use textReferredId so this test has its own isolated identity.
    verifyBearerToken.mockResolvedValue({ id: textReferredId, email: textReferredEmail });

    const { ensureUserRow } = await import('../lib/user-rows.js');
    const userId = await ensureUserRow(textReferredId, textReferredEmail);

    // Create a text-mode capture session directly (simulating what
    // capture/analyze would persist for a text-only input).
    const textSessionId = randomUUID();
    await db.insert(schema.aiCaptureSessionsTable).values({
      id: textSessionId,
      userId,
      mode: 'text',
      status: 'review',
    });
    await db.insert(schema.aiCaptureCandidatesTable).values({
      sessionId: textSessionId,
      name: 'Chicken salad',
      calories: '400',
      proteinG: '30',
      carbsG: '20',
      fatG: '15',
      confidence: 70,
      evidence: {},
    });

    // first-log must reject the text-mode session.
    const firstLog = await request(app).post('/v1/diary/first-log').send(
      entry({ captureSessionId: textSessionId, calories: 400 }),
    );
    expect(firstLog.status).toBe(422);
    expect(firstLog.body.message).toMatch(/text/i);

    // Activation must remain pending — the text-mode session cannot qualify.
    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('pending');
    expect(activation.body.referredRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  it('ADVERSARIAL (text-mode): a text-mode session with reviewedAt stamped does not qualify via hasSyncedDiaryEntry', async () => {
    // Use textReferredId — the text-mode session from the previous test still
    // exists without reviewedAt (first-log was rejected). We stamp it directly
    // to simulate legacy data and confirm hasSyncedDiaryEntry ignores it.
    verifyBearerToken.mockResolvedValue({ id: textReferredId, email: textReferredEmail });

    // Stamp reviewedAt directly, bypassing the first-log route restriction.
    await pool.query(
      `UPDATE calora_ai_capture_sessions
       SET reviewed_at = now()
       WHERE user_id IN (SELECT id FROM calora_users WHERE external_id = $1)
         AND mode = 'text'`,
      [textReferredId],
    );

    // Even with reviewedAt stamped, a text-mode session must not qualify.
    const activation = await request(app).post('/v1/referral/activate').send({});
    expect(activation.status).toBe(200);
    expect(activation.body.status).toBe('pending');
    expect(activation.body.referredRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  // ── Capture-session happy-path ──────────────────────────────────────────────

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
