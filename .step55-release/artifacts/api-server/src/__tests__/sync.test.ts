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

const {
  executeCalls,
  transactions,
  failNextTransactionLedgerWrite,
  fenceNextTransactionWrites,
  assertAccountWritable,
  AccountDeletionInProgressError,
  dbMock,
  loggerWarn,
  loggerError,
} = vi.hoisted(() => {
  const executeCalls: unknown[] = [];
  const transactions: Array<{ statements: unknown[]; committed: boolean }> = [];
  const failNextTransactionLedgerWrite = { value: false };
  const fenceNextTransactionWrites = { value: 0 };
  const assertAccountWritable = vi.fn();
  const AccountDeletionInProgressError = class AccountDeletionInProgressError extends Error {
    readonly errorClass = 'account_deletion_fence';
  };
  const loggerWarn = vi.fn();
  const loggerError = vi.fn();

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
    transaction: async (fn: (tx: { execute: (stmt: unknown) => Promise<{ rows: unknown[] }> }) => Promise<unknown>) => {
      const transaction = { statements: [] as unknown[], committed: false };
      transactions.push(transaction);
      const tx = {
        execute: (stmt: unknown) => {
          transaction.statements.push(stmt);
          if (fenceNextTransactionWrites.value > 0 && transaction.statements.length === 1) {
            fenceNextTransactionWrites.value -= 1;
            return Promise.reject({
              code: '55000',
              message: 'account deletion is in progress',
            });
          }
          if (failNextTransactionLedgerWrite.value && transaction.statements.length === 1) {
            failNextTransactionLedgerWrite.value = false;
            return Promise.reject(new Error('sync mutation ledger insert failed'));
          }
          return Promise.resolve({
            rows: transaction.statements.length === 1 ? [{ status: 'apply' }] : [],
          });
        },
      };
      try {
        const result = await fn(tx);
        transaction.committed = true;
        executeCalls.push(...transaction.statements);
        return result;
      } catch (error) {
        throw error;
      }
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

  return {
    executeCalls,
    transactions,
    failNextTransactionLedgerWrite,
    fenceNextTransactionWrites,
    assertAccountWritable,
    AccountDeletionInProgressError,
    dbMock,
    loggerWarn,
    loggerError,
  };
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

vi.mock('../lib/account-deletion-state.js', () => ({
  assertAccountWritable: (...args: unknown[]) => assertAccountWritable(...args),
  ACCOUNT_DELETION_FENCE_ERROR_CLASS: 'account_deletion_fence',
  accountDeletionFenceSignal: (route: string, count = 1) => ({
    errorClass: 'account_deletion_fence',
    route,
    count,
  }),
  classifyAccountDeletionError: (error: unknown) => {
    if (error instanceof AccountDeletionInProgressError) return 'account_deletion_fence';
    if (
      error &&
      typeof error === 'object' &&
      (error as { code?: unknown }).code === '55000' &&
      (error as { message?: unknown }).message === 'account deletion is in progress'
    ) {
      return 'account_deletion_fence';
    }
    return null;
  },
  AccountDeletionInProgressError,
}));

vi.mock('../lib/logger.js', () => ({
  logger: { warn: loggerWarn, error: loggerError },
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

function validUpsert(payloadOverrides: Record<string, unknown> = {}, mutationId: string = MUTATION_ID) {
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
    transactions.length = 0;
    failNextTransactionLedgerWrite.value = false;
    fenceNextTransactionWrites.value = 0;
    assertAccountWritable.mockResolvedValue(undefined);
    loggerWarn.mockReset();
    loggerError.mockReset();
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it('returns 401 when no bearer token is provided', async () => {
    verifyBearerToken.mockResolvedValue(null);

    const res = await request(app).post('/v1/sync').send(body([validUpsert()]));

    expect(res.status).toBe(401);
    expect(executeCalls).toHaveLength(0);
  });

  it('returns a generic 503 and emits only a redacted fence signal', async () => {
    verifyBearerToken.mockResolvedValue({
      id: 'account-id-must-not-be-logged',
      email: 'secret@example.com',
    });
    const fenceError = new (await import('../lib/account-deletion-state.js')).AccountDeletionInProgressError();
    assertAccountWritable.mockRejectedValueOnce(fenceError);

    const res = await request(app).post('/v1/sync').send(body([validUpsert()]));

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      message: 'Sync is unavailable right now. Please try again later.',
    });
    expect(loggerWarn).toHaveBeenCalledOnce();
    expect(loggerWarn).toHaveBeenCalledWith(
      {
        errorClass: 'account_deletion_fence',
        route: '/v1/sync',
        count: 1,
      },
      'Account deletion fence rejected sync request',
    );
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain('account-id-must-not-be-logged');
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain('secret@example.com');
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('aggregates trigger-shaped fence rejections without logging database details', async () => {
    verifyBearerToken.mockResolvedValue({
      id: 'account-id-must-not-be-logged',
      email: 'secret@example.com',
    });
    fenceNextTransactionWrites.value = 2;

    const res = await request(app)
      .post('/v1/sync')
      .send(
        body([
          validUpsert({ clientId: 'first-entry' }, randomUUID()),
          validUpsert({ clientId: 'second-entry' }, randomUUID()),
        ]),
      );

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      message: 'Sync is unavailable right now. Please try again later.',
    });
    expect(loggerWarn).toHaveBeenCalledOnce();
    expect(loggerWarn).toHaveBeenCalledWith(
      {
        errorClass: 'account_deletion_fence',
        route: '/v1/sync',
        count: 2,
      },
      'Account deletion fence rejected sync writes',
    );
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain('account-id-must-not-be-logged');
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain('secret@example.com');
    expect(JSON.stringify(loggerWarn.mock.calls)).not.toContain('55000');
    expect(loggerError).not.toHaveBeenCalled();
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
    // One INSERT ... ON CONFLICT DO UPDATE + one sync_mutations insert.
    expect(executeCalls).toHaveLength(2);
  });

  it('accepts the same upsert mutationId twice (idempotent)', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const r1 = await request(app).post('/v1/sync').send(body([validUpsert()]));
    const r2 = await request(app).post('/v1/sync').send(body([validUpsert()]));

    expect(r1.body.accepted).toContain(MUTATION_ID);
    expect(r2.body.accepted).toContain(MUTATION_ID);
    // Two requests × (diary upsert + sync_mutations insert) = 4 execute calls.
    // The second sync_mutations insert is a no-op (ON CONFLICT DO NOTHING).
    expect(executeCalls).toHaveLength(4);
  });

  it('accepts an edited entry (same clientId, updated name)', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const mid = randomUUID();
    const edit = validUpsert({ name: 'Overnight oats with chia seeds' }, mid);
    const res = await request(app).post('/v1/sync').send(body([edit]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain(mid);
    // diary upsert + sync_mutations insert.
    expect(executeCalls).toHaveLength(2);
  });

  it('rolls back an upsert when recording its idempotency ledger entry fails', async () => {
    verifyBearerToken.mockResolvedValue(USER);
    failNextTransactionLedgerWrite.value = true;

    const mutation = validUpsert({}, randomUUID());
    const res = await request(app).post('/v1/sync').send(body([mutation]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toEqual([]);
    expect(res.body.conflicts).toEqual([
      { mutationId: mutation.mutationId, reason: 'server_error' },
    ]);
    expect(transactions).toEqual([
      { statements: expect.any(Array), committed: false },
    ]);
    expect(transactions[0].statements).toHaveLength(1);
    // The mocked transaction publishes writes only on commit, mirroring the
    // database guarantee that the diary write is rolled back with the ledger.
    expect(executeCalls).toHaveLength(0);
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

  it('accepts an upsert carrying optional image metadata', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const mid = randomUUID();
    const withImage = validUpsert(
      {
        imageUrl: 'https://images.openfoodfacts.org/products/1.jpg',
        imageSource: 'Open Food Facts',
      },
      mid,
    );
    const res = await request(app).post('/v1/sync').send(body([withImage]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain(mid);
    expect(res.body.conflicts).toHaveLength(0);
    // diary upsert + sync_mutations insert.
    expect(executeCalls).toHaveLength(2);
  });

  it('accepts an upsert with an unsafe image URL, dropping it rather than failing', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    // A javascript: URL is not a valid image reference. The entry must still
    // be written (image simply dropped) so a bad image never loses a log.
    const mid = randomUUID();
    const badImage = validUpsert(
      { imageUrl: 'javascript:alert(1)', imageSource: 'evil' },
      mid,
    );
    const res = await request(app).post('/v1/sync').send(body([badImage]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain(mid);
    expect(res.body.conflicts).toHaveLength(0);
    expect(executeCalls).toHaveLength(2);
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
    // One DELETE + one sync_mutations insert.
    expect(executeCalls).toHaveLength(2);
  });

  it('rolls back a delete when recording its idempotency ledger entry fails', async () => {
    verifyBearerToken.mockResolvedValue(USER);
    failNextTransactionLedgerWrite.value = true;

    const mutation = validDelete();
    const res = await request(app).post('/v1/sync').send(body([mutation]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toEqual([]);
    expect(res.body.conflicts).toEqual([
      { mutationId: mutation.mutationId, reason: 'server_error' },
    ]);
    expect(transactions).toEqual([
      { statements: expect.any(Array), committed: false },
    ]);
    expect(transactions[0].statements).toHaveLength(1);
    expect(executeCalls).toHaveLength(0);
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

  // ── Non-UUID mutationId ───────────────────────────────────────────────────

  it('conflicts a upsert with a non-UUID mutationId and writes nothing to the DB', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    // Non-UUID mutationIds cannot be recorded in calora_sync_mutations (uuid PK)
    // so the route rejects them upfront rather than applying an un-deduplicated write.
    const nonUuidId = 'my-custom-id-123';
    const mutation = validUpsert({}, nonUuidId);
    const res = await request(app).post('/v1/sync').send(body([mutation]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).not.toContain(nonUuidId);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].mutationId).toBe(nonUuidId);
    expect(res.body.conflicts[0].reason).toBe('invalid_mutation_id');
    // No DB writes — the mutation is rejected before any diary or sync_mutations insert.
    expect(executeCalls).toHaveLength(0);
  });

  it('conflicts a delete with a non-UUID mutationId and writes nothing to the DB', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const nonUuidId = 'delete-op-no-uuid';
    const mutation = {
      mutationId: nonUuidId,
      entity: 'diaryEntry',
      operation: 'delete',
      clientUpdatedAt: '2026-08-11T11:00:00Z',
      payload: { clientId: CLIENT_ID },
    };
    const res = await request(app).post('/v1/sync').send(body([mutation]));

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].mutationId).toBe(nonUuidId);
    expect(res.body.conflicts[0].reason).toBe('invalid_mutation_id');
    // No DB writes — rejected before any diary DELETE or sync_mutations insert.
    expect(executeCalls).toHaveLength(0);
  });

  it('conflicts a non-UUID mutation but still accepts valid UUID mutations in the same batch', async () => {
    verifyBearerToken.mockResolvedValue(USER);

    const nonUuidId = 'legacy-id-abc';
    const uuidId = randomUUID();
    const mutationNonUuid = validUpsert({ clientId: 'log-non-uuid' }, nonUuidId);
    const mutationUuid = validUpsert({ clientId: 'log-uuid' }, uuidId);

    const res = await request(app)
      .post('/v1/sync')
      .send(body([mutationNonUuid, mutationUuid]));

    expect(res.status).toBe(200);
    expect(res.body.accepted).toContain(uuidId);
    expect(res.body.accepted).not.toContain(nonUuidId);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].mutationId).toBe(nonUuidId);
    expect(res.body.conflicts[0].reason).toBe('invalid_mutation_id');
    // Only 2 execute calls for the UUID mutation (diary upsert + sync_mutations insert).
    expect(executeCalls).toHaveLength(2);
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
    // Two accepted mutations × (data write + sync_mutations insert) = 4 execute calls.
    expect(executeCalls).toHaveLength(4);
  });
});
