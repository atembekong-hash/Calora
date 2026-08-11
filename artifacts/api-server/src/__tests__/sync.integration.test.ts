/**
 * Diary sync idempotency — real database.
 *
 * Confirms that sending the same mutation batch twice (simulating an app
 * restart that resets the in-memory syncedIds set) never creates duplicate
 * rows on the server:
 *
 *   • The same upsert sent twice → exactly one calora_diary_entries row
 *   • The same mutationId recorded twice → exactly one calora_sync_mutations row
 *   • Both calls return the mutationId in "accepted" (idempotent response)
 *   • A delete mutation is also safe to replay after a restart
 *
 * Runs against DATABASE_URL (same schema as startup migrations); skipped
 * when no database is configured.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

const HAS_DB = Boolean(process.env.DATABASE_URL);

// ── Auth mock ─────────────────────────────────────────────────────────────────

const verifyBearerToken = vi.fn();
vi.mock('../lib/supabase-auth.js', () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function validUpsertMutation(overrides: Record<string, unknown> = {}) {
  return {
    mutationId: randomUUID(),
    entity: 'diaryEntry',
    operation: 'upsert',
    clientUpdatedAt: '2026-08-11T10:00:00Z',
    payload: {
      clientId: `log-${randomUUID()}`,
      entryDate: '2026-08-11',
      meal: 'Breakfast',
      name: 'Oatmeal',
      serving: '1 bowl (240 g)',
      calories: 320,
      proteinG: 9,
      carbsG: 58,
      fatG: 6,
      provenance: 'Photo estimate',
      confidence: 85,
      notes: null,
      ...overrides,
    },
  };
}

function deleteMutation(clientId: string) {
  return {
    mutationId: randomUUID(),
    entity: 'diaryEntry',
    operation: 'delete',
    clientUpdatedAt: '2026-08-11T11:00:00Z',
    payload: { clientId },
  };
}

function syncBody(mutations: unknown[]) {
  return { deviceId: 'test-device', mutations };
}

describe.skipIf(!HAS_DB)('diary sync idempotency (real schema)', () => {
  let app: import('express').Express;
  let pool: typeof import('@workspace/db')['pool'];

  /** Unique suffix per test run so parallel runs don't collide. */
  const run = randomUUID().slice(0, 8);
  const externalUserId = `sync-it-user-${run}`;

  /** All client_ids created in this run, for teardown. */
  const clientIds: string[] = [];
  /** All mutationIds created in this run, for teardown. */
  const mutationIds: string[] = [];
  /** Internal calora_users.id, resolved after first ensureUserRow call. */
  let internalUserId: string;

  function actAsTestUser() {
    verifyBearerToken.mockResolvedValue({
      id: externalUserId,
      email: `${externalUserId}@example.com`,
    });
  }

  async function diaryRowCount(clientId: string): Promise<number> {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM calora_diary_entries WHERE client_id = $1`,
      [clientId],
    );
    return rowCount ?? 0;
  }

  async function syncMutationRowCount(mutationId: string): Promise<number> {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM calora_sync_mutations WHERE mutation_id = $1`,
      [mutationId],
    );
    return rowCount ?? 0;
  }

  // ── Setup & teardown ───────────────────────────────────────────────────────

  beforeAll(async () => {
    pool = (await import('@workspace/db')).pool;

    // Apply any schema columns that may not exist on a pre-migration DB.
    // Safe no-ops when the column already exists.
    await pool.query(`
      ALTER TABLE calora_diary_entries
        ADD COLUMN IF NOT EXISTS capture_session_id UUID
          REFERENCES calora_ai_capture_sessions(id) ON DELETE SET NULL
    `);

    const express = (await import('express')).default;
    const syncRouter = (await import('../routes/sync.js')).default;
    app = express();
    app.use(express.json());
    app.use(syncRouter);
  });

  afterAll(async () => {
    // Remove any diary rows created by this run.
    if (clientIds.length > 0) {
      await pool.query(
        `DELETE FROM calora_diary_entries WHERE client_id = ANY($1)`,
        [clientIds],
      );
    }
    // Remove any sync_mutations rows created by this run.
    if (mutationIds.length > 0) {
      await pool.query(
        `DELETE FROM calora_sync_mutations WHERE mutation_id = ANY($1::uuid[])`,
        [mutationIds],
      );
    }
    // Remove the test user row (diary entries cascade on delete).
    await pool.query(
      `DELETE FROM calora_users WHERE external_id = $1`,
      [externalUserId],
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Tests ──────────────────────────────────────────────────────────────────

  it('the same upsert sent twice produces exactly one diary row', async () => {
    const mutation = validUpsertMutation();
    clientIds.push(mutation.payload.clientId as string);
    mutationIds.push(mutation.mutationId);
    actAsTestUser();

    // First sync (simulates initial app session).
    const r1 = await request(app).post('/v1/sync').send(syncBody([mutation]));
    expect(r1.status).toBe(200);
    expect(r1.body.accepted).toContain(mutation.mutationId);
    expect(r1.body.conflicts).toHaveLength(0);

    // Second sync (simulates app restart — syncedIds set was cleared).
    const r2 = await request(app).post('/v1/sync').send(syncBody([mutation]));
    expect(r2.status).toBe(200);
    expect(r2.body.accepted).toContain(mutation.mutationId);
    expect(r2.body.conflicts).toHaveLength(0);

    // The ON CONFLICT DO UPDATE upsert must yield exactly one diary row.
    expect(await diaryRowCount(mutation.payload.clientId as string)).toBe(1);

    // Capture the internal user id for subsequent tests.
    const { rows } = await pool.query(
      `SELECT id FROM calora_users WHERE external_id = $1`,
      [externalUserId],
    );
    internalUserId = rows[0]?.id;
  });

  it('the same mutationId recorded twice produces exactly one sync_mutations row', async () => {
    const mutation = validUpsertMutation();
    clientIds.push(mutation.payload.clientId as string);
    mutationIds.push(mutation.mutationId);
    actAsTestUser();

    // Two syncs of the identical mutationId.
    await request(app).post('/v1/sync').send(syncBody([mutation]));
    await request(app).post('/v1/sync').send(syncBody([mutation]));

    // ON CONFLICT DO NOTHING must leave exactly one row in sync_mutations.
    expect(await syncMutationRowCount(mutation.mutationId)).toBe(1);
  });

  it('both calls return the mutationId in accepted (idempotent response)', async () => {
    const mutation = validUpsertMutation();
    clientIds.push(mutation.payload.clientId as string);
    mutationIds.push(mutation.mutationId);
    actAsTestUser();

    const r1 = await request(app).post('/v1/sync').send(syncBody([mutation]));
    const r2 = await request(app).post('/v1/sync').send(syncBody([mutation]));

    // The client must receive accepted (not conflicts) on both attempts so it
    // can safely clear the local outbox entry after either response.
    expect(r1.body.accepted).toContain(mutation.mutationId);
    expect(r1.body.conflicts).toHaveLength(0);
    expect(r2.body.accepted).toContain(mutation.mutationId);
    expect(r2.body.conflicts).toHaveLength(0);
  });

  it('a batch of multiple upserts sent twice never duplicates any row', async () => {
    const mutations = [
      validUpsertMutation({ meal: 'Breakfast' }),
      validUpsertMutation({ meal: 'Lunch' }),
      validUpsertMutation({ meal: 'Dinner' }),
    ];
    for (const m of mutations) {
      clientIds.push(m.payload.clientId as string);
      mutationIds.push(m.mutationId);
    }
    actAsTestUser();

    // First sync.
    const r1 = await request(app).post('/v1/sync').send(syncBody(mutations));
    expect(r1.status).toBe(200);
    expect(r1.body.accepted).toHaveLength(3);
    expect(r1.body.conflicts).toHaveLength(0);

    // Second sync — full batch replayed after a simulated restart.
    const r2 = await request(app).post('/v1/sync').send(syncBody(mutations));
    expect(r2.status).toBe(200);
    expect(r2.body.accepted).toHaveLength(3);
    expect(r2.body.conflicts).toHaveLength(0);

    // Verify exactly one diary row and one sync_mutations row per entry.
    for (const m of mutations) {
      expect(await diaryRowCount(m.payload.clientId as string)).toBe(1);
      expect(await syncMutationRowCount(m.mutationId)).toBe(1);
    }
  });

  it('a delete mutation replayed after a restart is a safe no-op', async () => {
    // First, upsert an entry so there is a row to delete.
    const upsert = validUpsertMutation();
    const clientId = upsert.payload.clientId as string;
    clientIds.push(clientId);
    mutationIds.push(upsert.mutationId);
    actAsTestUser();

    await request(app).post('/v1/sync').send(syncBody([upsert]));
    expect(await diaryRowCount(clientId)).toBe(1);

    // Delete it.
    const del = deleteMutation(clientId);
    mutationIds.push(del.mutationId);
    const r1 = await request(app).post('/v1/sync').send(syncBody([del]));
    expect(r1.status).toBe(200);
    expect(r1.body.accepted).toContain(del.mutationId);

    // Row is gone.
    expect(await diaryRowCount(clientId)).toBe(0);

    // Replay the delete after a simulated restart — must not error, must still
    // be accepted, and the table must remain at zero rows for this clientId.
    const r2 = await request(app).post('/v1/sync').send(syncBody([del]));
    expect(r2.status).toBe(200);
    expect(r2.body.accepted).toContain(del.mutationId);
    expect(await diaryRowCount(clientId)).toBe(0);

    // sync_mutations must record the delete mutation only once.
    expect(await syncMutationRowCount(del.mutationId)).toBe(1);
  });
});
