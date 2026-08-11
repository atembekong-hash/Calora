/**
 * POST /v1/sync — outbox diary sync.
 *
 * Verifies that:
 *   - Unauthenticated requests are rejected.
 *   - Malformed request bodies return 400.
 *   - Valid upsert mutations are applied and returned as accepted.
 *   - Re-sending the same upsert is idempotent (accepted again, no error).
 *   - Delete mutations remove the targeted diary row.
 *   - Unsupported entity types are reported as conflicts.
 *   - Unknown diary operations are reported as conflicts.
 *   - Mixed-success batches return accepted and conflicts in the same response.
 *   - Upserts with invalid payload fields are rejected as conflicts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

// ── DB mock ───────────────────────────────────────────────────────────────────
// execute() resolves immediately with empty rows so we can assert on the
// number and order of calls without managing async queues.

const { executeCalls, dbMock } = vi.hoisted(() => {
  const executeCalls: unknown[] = [];

  function makeSelectChain(rows: unknown[] = []) {
    const chain: Record<string, unknown> = {};
    const noop = () => chain;
    for (const m of ['from', 'where', 'limit', 'innerJoin', 'set', 'returning', 'onConflictDoNothing']) {
      chain[m] = noop;
    }
    chain.then = (resolve: (v: unknown[]) => void) => resolve(rows);
    return chain;
  }

  const dbMock = {
    execute: (stmt: unknown) => {
      executeCalls.push(stmt);
      return Promise.resolve({ rows: [] });
    },
    select: () => makeSelectChain([]),
    insert: () => {
      const chain: Record<string, unknown> = {};
      const noop = () => chain;
      for (const m of ['values', 'onConflictDoNothing', 'returning']) {
        chain[m] = noop;
      }
      // ensureUserRow expects the insert to return a user id.
      chain.then = (resolve: (v: unknown[]) => void) => resolve([{ id: 'user-uuid-1' }]);
      return chain;
    },
  };

  return { executeCalls, dbMock };
});

vi.mock('@workspace/db', () => ({
  db: dbMock,
  usersTable: {
    id: 'id',
    externalId: 'external_id',
    email: 'email',
  },
  diaryEntriesTable: {
    id: 'id',
    userId: 'user_id',
    clientId: 'client_id',
  },
}));

// ── Auth mock ─────────────────────────────────────────────────────────────────

const verifyBearerToken = vi.fn();
vi.mock('../lib/supabase-auth.js', () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

// ── App setup ─────────────────────────────────────────────────────────────────

import express from 'express';
import syncRouter from '../routes/sync.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(syncRouter);
  return app;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER = { id: 'supabase-uid-1', email: 'user@example.com' };
const CLIENT_ID = 'log-1718000000000-abc123';
const MUTATION_ID = randomUUID();

function validUpsertPayload(overrides: Record<string, unknown> = {}) {
  return {
    clientId: CLIENT_ID,
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
  };
}

function validUpsert(payloadOverrides: Record<string, unknown> = {}, mutationId = MUTATION_ID) {
  return {
    mutationId,
    entity: 'diaryEntry',
    operation: 'upsert',
    clientUpdatedAt: '2026-08-11T10:00:00Z',
    payload: validUpsertPayload(payloadOverrides),
  };
}

function validDelete(clientId = CLIENT_ID) {
  return {
    mutationId: randomUUID(),
    entity: 'diaryEntry',
    operation: 'delete',
    clientUpdatedAt: '2026-08-11T11:00:00Z',
    payload: { clientId },
  };
}

function body(mutations: unknown[]) {
  return { deviceId: 'calora-mobile', mutations };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /v1/sync', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
    verifyBearerToken.mockReset();
    executeCalls.length = 0;
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it('returns 401 when no bearer token is provided', async () => {
    verifyBearerToken.mockResolvedValue(null);

    const res = await request(app).post('/v1/sync').send(body([validUpsert()]));

    expect(res.status).toBe(401);
    expect(executeCalls).toHaveLength(0);
  });

  // ── Request validation ────────────────────────────────────────────────────

  it('returns 400 when mutations array exceeds 100', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const mutations = Array.from({ length: 101 }, (_, i) =>
      validUpsert({ clientId: `log-${i}` }, randomUUID()),
    );

    const res = await request(app).post('/v1/sync').send(body(mutations));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/too many/i);
  });

  it('returns 400 when a mutation has no mutationId', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const bad = { entity: 'diaryEntry', operation: 'upsert', clientUpdatedAt: 'now', payload: {} };
    const res = await request(app).post('/v1/sync').send(body([bad]));

    expect(res.status).toBe(400);
  });

  it('accepts an empty mutations array', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const res = await request(app).post('/v1/sync').send(body([]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toEqual([]);
    expect(res.body.conflicts).toEqual([]);
    expect(executeCalls).toHaveLength(0);
  });

  // ── Upsert ────────────────────────────────────────────────────────────────

  it('accepts a valid upsert mutation and executes a write', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const res = await request(app).post('/v1/sync').send(body([validUpsert()]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain(MUTATION_ID);
    expect(res.body.conflicts).toHaveLength(0);
    // One INSERT ... ON CONFLICT DO UPDATE was sent to the DB.
    expect(executeCalls).toHaveLength(1);
  });

  it('accepts the same upsert mutationId twice (idempotent)', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const r1 = await request(app).post('/v1/sync').send(body([validUpsert()]));
    const r2 = await request(app).post('/v1/sync').send(body([validUpsert()]));

    expect(r1.body.accepted).toContain(MUTATION_ID);
    expect(r2.body.accepted).toContain(MUTATION_ID);
    // Two separate requests each wrote once (server-side upsert handles dedup).
    expect(executeCalls).toHaveLength(2);
  });

  it('accepts an edited entry (same clientId, updated name)', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const mid = randomUUID();
    const edit = validUpsert({ name: 'Overnight oats with chia seeds' }, mid);
    const res = await request(app).post('/v1/sync').send(body([edit]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain(mid);
    expect(executeCalls).toHaveLength(1);
  });

  it('rejects an upsert with an invalid meal value', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const res = await request(app)
      .post('/v1/sync')
      .send(body([validUpsert({ meal: 'Elevenses' })]));

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].reason).toBe('validation_failed');
    // Nothing written to DB.
    expect(executeCalls).toHaveLength(0);
  });

  it('rejects an upsert with a negative calorie value', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const res = await request(app)
      .post('/v1/sync')
      .send(body([validUpsert({ calories: -10 })]));

    expect(res.status).toBe(200);
    expect(res.body.conflicts[0].reason).toBe('validation_failed');
    expect(executeCalls).toHaveLength(0);
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  it('accepts a delete mutation and executes a DELETE', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const del = validDelete();
    const res = await request(app).post('/v1/sync').send(body([del]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain(del.mutationId);
    expect(res.body.conflicts).toHaveLength(0);
    // One DELETE was sent to the DB.
    expect(executeCalls).toHaveLength(1);
  });

  it('rejects a delete mutation with a missing clientId', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const bad = {
      mutationId: randomUUID(),
      entity: 'diaryEntry',
      operation: 'delete',
      clientUpdatedAt: '2026-08-11T11:00:00Z',
      payload: {},
    };

    const res = await request(app).post('/v1/sync').send(body([bad]));

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].reason).toBe('validation_failed');
    expect(executeCalls).toHaveLength(0);
  });

  // ── Unsupported types and operations ──────────────────────────────────────

  it('reports unsupported entity types as conflicts and does not write', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const unknown = {
      mutationId: randomUUID(),
      entity: 'weightEntry',
      operation: 'upsert',
      clientUpdatedAt: '2026-08-11T10:00:00Z',
      payload: { kg: 75 },
    };

    const res = await request(app).post('/v1/sync').send(body([unknown]));

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].reason).toBe('unsupported_entity');
    expect(executeCalls).toHaveLength(0);
  });

  it('reports an unknown diary operation as a conflict and does not write', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const unknown = {
      mutationId: randomUUID(),
      entity: 'diaryEntry',
      operation: 'archive',
      clientUpdatedAt: '2026-08-11T10:00:00Z',
      payload: { clientId: CLIENT_ID },
    };

    const res = await request(app).post('/v1/sync').send(body([unknown]));

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].reason).toBe('unsupported_operation');
    expect(executeCalls).toHaveLength(0);
  });

  // ── Mixed batch ───────────────────────────────────────────────────────────

  it('returns a mix of accepted and conflicts for a heterogeneous batch', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const goodUpsert = validUpsert();
    const goodDelete = validDelete('log-other-entry');
    const badEntity = {
      mutationId: randomUUID(),
      entity: 'weightEntry',
      operation: 'upsert',
      clientUpdatedAt: '2026-08-11T10:00:00Z',
      payload: { kg: 75 },
    };
    const badOp = {
      mutationId: randomUUID(),
      entity: 'diaryEntry',
      operation: 'archive',
      clientUpdatedAt: '2026-08-11T10:00:00Z',
      payload: { clientId: CLIENT_ID },
    };

    const res = await request(app)
      .post('/v1/sync')
      .send(body([goodUpsert, badEntity, goodDelete, badOp]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain(goodUpsert.mutationId);
    expect(res.body.accepted).toContain(goodDelete.mutationId);
    expect(res.body.conflicts).toHaveLength(2);
    const conflictReasons = res.body.conflicts.map((c: { reason: string }) => c.reason);
    expect(conflictReasons).toContain('unsupported_entity');
    expect(conflictReasons).toContain('unsupported_operation');
    // Two DB writes: one upsert + one delete.
    expect(executeCalls).toHaveLength(2);
  });
});
