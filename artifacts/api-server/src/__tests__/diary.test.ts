/**
 * Diary endpoints — server-verified persistence for the food diary.
 *
 * Covers:
 *   GET  /v1/diary          – list entries for a date (auth, bad date, empty)
 *   POST /v1/diary          – create an entry (auth, invalid payload)
 *   DELETE /v1/diary/:id    – remove an entry (auth, cross-user isolation)
 *   POST /v1/diary/first-log – server-verified first-log sync (referral gate)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── DB mock ─────────────────────────────────────────────────────────────────
const { queued, dbMock, insertCalls, deleteCalls } = vi.hoisted(() => {
  const queued: unknown[][] = [];
  const insertCalls: unknown[] = [];
  const deleteCalls: { whereArg: unknown }[] = [];

  function makeChain(kind?: string) {
    const chain: Record<string, unknown> = {};
    const noop = () => chain;
    for (const method of [
      'from', 'where', 'limit', 'set', 'returning',
      'onConflictDoNothing', 'innerJoin', 'orderBy',
    ]) {
      chain[method] = noop;
    }
    chain.values = (v: unknown) => {
      if (kind === 'insert') insertCalls.push(v);
      return chain;
    };
    chain.then = (resolve: (rows: unknown[]) => void, reject: (err: unknown) => void) => {
      if (queued.length === 0) return void reject(new Error('diary.test: no queued db result'));
      return void resolve(queued.shift()!);
    };
    return chain;
  }

  const dbMock = {
    select: () => makeChain(),
    update: () => makeChain(),
    insert: () => makeChain('insert'),
    delete: () => {
      // Build a chain whose where() captures its argument so tests can assert
      // that the predicate is scoped to the authenticated user's internal id.
      const chain = makeChain('delete');
      chain.where = (condition: unknown) => {
        deleteCalls.push({ whereArg: condition });
        return chain;
      };
      return chain;
    },
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(dbMock),
  };

  return { queued, dbMock, insertCalls, deleteCalls };
});

vi.mock('@workspace/db', () => ({
  db: dbMock,
  usersTable: { id: 'id', externalId: 'external_id', email: 'email' },
  diaryEntriesTable: {
    id: 'diary_id',
    userId: 'diary_user_id',
    entryDate: 'entry_date',
    createdAt: 'created_at',
  },
  aiCaptureSessionsTable: { id: 'id', userId: 'user_id', reviewedAt: 'reviewed_at' },
  aiCaptureCandidatesTable: { sessionId: 'session_id', calories: 'calories' },
}));

const verifyBearerToken = vi.fn();
vi.mock('../lib/supabase-auth.js', () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

vi.mock('../lib/account-deletion-state.js', () => ({
  assertAccountWritable: vi.fn().mockResolvedValue(undefined),
  AccountDeletionInProgressError: class AccountDeletionInProgressError extends Error {},
}));

// Wrap drizzle-orm's eq/and with spies so the cross-user test can assert
// that the DELETE WHERE clause references the authenticated user's internal id.
vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return {
    ...actual,
    eq: vi.fn((...args: Parameters<typeof actual.eq>) => actual.eq(...args)),
    and: vi.fn((...args: Parameters<typeof actual.and>) => actual.and(...args)),
    desc: vi.fn((...args: Parameters<typeof actual.desc>) => actual.desc(...args)),
  };
});

import { eq } from 'drizzle-orm';
import express from 'express';
import diaryRouter from '../routes/diary.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(diaryRouter);
  return app;
}

const USER_A = { id: 'supabase-user-a', email: 'usera@example.com' };
const USER_A_UUID = 'calora-user-uuid-a';
const USER_B_UUID = 'calora-user-uuid-b';
const SESSION_ID = '4f8a2c9e-1b3d-4e5f-8a7b-9c0d1e2f3a4b';
const ENTRY_ID = 'entry-uuid-0001';

/** A minimal valid POST /v1/diary body. */
const validDiaryBody = {
  entryDate: '2026-08-11',
  meal: 'Breakfast',
  name: 'Oatmeal with banana',
  serving: '1 bowl',
  calories: 320,
  proteinG: 9,
  carbsG: 58,
  fatG: 6,
  provenance: 'Photo estimate',
  confidence: 82,
  clientUpdatedAt: '2026-08-11T08:15:00.000Z',
};

/** Mimics the shape that serialize() expects from a diaryEntriesTable row. */
function diaryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ENTRY_ID,
    entryDate: '2026-08-11',
    meal: 'Breakfast',
    name: 'Oatmeal with banana',
    serving: '1 bowl',
    calories: '320',
    proteinG: '9',
    carbsG: '58',
    fatG: '6',
    provenance: 'Photo estimate',
    confidence: 82,
    notes: null,
    clientUpdatedAt: new Date('2026-08-11T08:15:00.000Z'),
    updatedAt: new Date('2026-08-11T08:15:00.000Z'),
    ...overrides,
  };
}

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    userId: USER_A_UUID,
    mode: 'food',
    status: 'review',
    createdAt: new Date(),
    reviewedAt: null,
    ...overrides,
  };
}

function queueResults(results: unknown[][]) {
  for (const rows of results) queued.push(rows);
}

beforeEach(() => {
  queued.length = 0;
  insertCalls.length = 0;
  deleteCalls.length = 0;
  vi.clearAllMocks();
  verifyBearerToken.mockResolvedValue(USER_A);
});

// ── GET /v1/diary ───────────────────────────────────────────────────────────

describe('GET /v1/diary', () => {
  it('returns an empty list when no entries exist for the date', async () => {
    queueResults([
      [{ id: USER_A_UUID }],  // ensureUserRow: initial select
      [],                      // diary select → no entries
    ]);

    const res = await request(buildApp()).get('/v1/diary?date=2026-08-11');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ date: '2026-08-11', entries: [] });
  });

  it('returns serialized entries for the requested date', async () => {
    const row = diaryRow();
    queueResults([
      [{ id: USER_A_UUID }],
      [row],
    ]);

    const res = await request(buildApp()).get('/v1/diary?date=2026-08-11');

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0]).toMatchObject({
      id: ENTRY_ID,
      meal: 'Breakfast',
      calories: 320,
      proteinG: 9,
    });
  });

  it('rejects a missing date query parameter', async () => {
    const res = await request(buildApp()).get('/v1/diary');
    expect(res.status).toBe(400);
  });

  it('rejects a malformed date (non-date string)', async () => {
    const res = await request(buildApp()).get('/v1/diary?date=not-a-date');
    expect(res.status).toBe(400);
  });

  it('rejects a calendar overflow date (Feb 31 normalises in JS but is not a real date)', async () => {
    // Date.parse('2026-02-31T00:00:00Z') succeeds in JS — it normalises to
    // March 3. The isDate guard must round-trip the components to catch this.
    const res = await request(buildApp()).get('/v1/diary?date=2026-02-31');
    expect(res.status).toBe(400);
  });

  it('rejects another calendar overflow date (Apr 31)', async () => {
    const res = await request(buildApp()).get('/v1/diary?date=2026-04-31');
    expect(res.status).toBe(400);
  });

  it('returns 401 when the bearer token is absent or invalid', async () => {
    verifyBearerToken.mockResolvedValue(null);
    const res = await request(buildApp()).get('/v1/diary?date=2026-08-11');
    expect(res.status).toBe(401);
  });
});

// ── POST /v1/diary ──────────────────────────────────────────────────────────

describe('POST /v1/diary', () => {
  it('creates an entry and returns 201 with the serialized row', async () => {
    const row = diaryRow();
    queueResults([
      [{ id: USER_A_UUID }],  // ensureUserRow
      [row],                   // insert returning
    ]);

    const res = await request(buildApp()).post('/v1/diary').send(validDiaryBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: ENTRY_ID,
      meal: 'Breakfast',
      calories: 320,
    });
    expect(insertCalls).toHaveLength(1);
  });

  it('stores the correct userId from the auth token', async () => {
    const row = diaryRow();
    queueResults([
      [{ id: USER_A_UUID }],
      [row],
    ]);

    await request(buildApp()).post('/v1/diary').send(validDiaryBody);

    expect(insertCalls[0]).toMatchObject({ userId: USER_A_UUID });
  });

  it('returns 401 when the bearer token is absent or invalid', async () => {
    verifyBearerToken.mockResolvedValue(null);
    const res = await request(buildApp()).post('/v1/diary').send(validDiaryBody);
    expect(res.status).toBe(401);
    expect(insertCalls).toHaveLength(0);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(buildApp())
      .post('/v1/diary')
      .send({ meal: 'Breakfast', calories: 300 }); // no name, serving, etc.
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it('returns 400 when meal is not a recognised value', async () => {
    const res = await request(buildApp())
      .post('/v1/diary')
      .send({ ...validDiaryBody, meal: 'Elevenses' });
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it('returns 400 when calories is negative', async () => {
    const res = await request(buildApp())
      .post('/v1/diary')
      .send({ ...validDiaryBody, calories: -1 });
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it('returns 400 when confidence is out of range', async () => {
    const res = await request(buildApp())
      .post('/v1/diary')
      .send({ ...validDiaryBody, confidence: 101 });
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it('returns 400 when provenance is not a recognised value', async () => {
    const res = await request(buildApp())
      .post('/v1/diary')
      .send({ ...validDiaryBody, provenance: 'Guesswork' });
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it('accepts an empty body with 400, not a server crash', async () => {
    const res = await request(buildApp()).post('/v1/diary').send({});
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });
});

// ── DELETE /v1/diary/:entryId ───────────────────────────────────────────────

describe('DELETE /v1/diary/:entryId', () => {
  it('returns 204 when the caller owns the entry', async () => {
    queueResults([
      [{ id: USER_A_UUID }],  // ensureUserRow
      [],                      // delete
    ]);

    const res = await request(buildApp()).delete(`/v1/diary/${ENTRY_ID}`);
    expect(res.status).toBe(204);
    expect(deleteCalls).toHaveLength(1);
  });

  it('returns 401 when the bearer token is absent or invalid', async () => {
    verifyBearerToken.mockResolvedValue(null);
    const res = await request(buildApp()).delete(`/v1/diary/${ENTRY_ID}`);
    expect(res.status).toBe(401);
    expect(deleteCalls).toHaveLength(0);
  });

  it('still returns 204 when the entry does not exist (idempotent delete)', async () => {
    // The route issues DELETE … WHERE id = ? AND userId = ?. If the row
    // doesn't exist the DB returns 0 rows deleted; the route still responds
    // 204 — the client's intent is met.
    queueResults([
      [{ id: USER_A_UUID }],
      [],  // 0 rows deleted
    ]);

    const res = await request(buildApp()).delete(`/v1/diary/nonexistent-id`);
    expect(res.status).toBe(204);
  });

  it('CROSS-USER: the WHERE predicate on DELETE is scoped to the requesting user', async () => {
    // User B attempts to delete an entry. The route resolves the caller's
    // *internal* UUID (USER_B_UUID) via ensureUserRow and passes it to eq()
    // as the userId column value. Removing the userId predicate from the route
    // would cause eq() to never be called with USER_B_UUID, failing this test.
    verifyBearerToken.mockResolvedValue({ id: 'supabase-user-b', email: 'userb@example.com' });
    queueResults([
      [{ id: USER_B_UUID }],  // ensureUserRow for user B
      [],                      // delete (0 rows — userId mismatch at DB level)
    ]);

    await request(buildApp()).delete(`/v1/diary/${ENTRY_ID}`);

    // eq is a real drizzle function wrapped with vi.fn(). Verify that it was
    // called with USER_B_UUID — i.e. the WHERE clause is bounded by the
    // authenticated caller's internal id, not User A's id.
    const eqSpy = eq as ReturnType<typeof vi.fn>;
    const eqCallValues = eqSpy.mock.calls.map(([, val]) => val);
    expect(eqCallValues).toContain(USER_B_UUID);
    // And must NOT be scoped to User A's id.
    expect(eqCallValues).not.toContain(USER_A_UUID);
  });
});

// ── POST /v1/diary/first-log ────────────────────────────────────────────────

const validEntry = {
  captureSessionId: SESSION_ID,
  entryDate: '2026-08-11',
  meal: 'Breakfast',
  name: 'Oatmeal with banana',
  serving: '1 bowl',
  calories: 320,
  proteinG: 9,
  carbsG: 58,
  fatG: 6,
  provenance: 'Photo estimate',
  confidence: 82,
  clientUpdatedAt: '2026-08-11T08:15:00.000Z',
};

describe('POST /v1/diary/first-log', () => {
  it('persists the first entry when it matches a server-recorded capture session', async () => {
    queueResults([
      [{ id: USER_A_UUID }],   // user row lookup
      [],                       // no existing diary entry
      [sessionRow()],           // capture session lookup
      [{ calories: '310' }],    // analyzed candidates
      [{ id: SESSION_ID }],     // session claim succeeds
      [],                       // diary insert
    ]);

    const res = await request(buildApp()).post('/v1/diary/first-log').send(validEntry);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ synced: true, alreadyExisted: false });
    expect(insertCalls.length).toBe(1);
  });

  it('ADVERSARIAL: a fabricated payload with no real capture session creates no diary record', async () => {
    queueResults([
      [{ id: USER_A_UUID }],
      [],   // no existing diary entry
      [],   // no such capture session
    ]);

    const res = await request(buildApp())
      .post('/v1/diary/first-log')
      .send({ ...validEntry, captureSessionId: '00000000-0000-4000-8000-000000000000' });

    expect(res.status).toBe(422);
    expect(insertCalls.length).toBe(0);
  });

  it('rejects an entry whose nutrition does not match the analyzed capture', async () => {
    queueResults([
      [{ id: USER_A_UUID }],
      [],
      [sessionRow()],
      [{ calories: '310' }],
    ]);

    const res = await request(buildApp())
      .post('/v1/diary/first-log')
      .send({ ...validEntry, calories: 19000 });

    expect(res.status).toBe(422);
    expect(insertCalls.length).toBe(0);
  });

  it('rejects a session that was already used', async () => {
    queueResults([
      [{ id: USER_A_UUID }],
      [],
      [sessionRow({ reviewedAt: new Date() })],
    ]);

    const res = await request(buildApp()).post('/v1/diary/first-log').send(validEntry);

    expect(res.status).toBe(422);
    expect(insertCalls.length).toBe(0);
  });

  it('rejects a stale session', async () => {
    queueResults([
      [{ id: USER_A_UUID }],
      [],
      [sessionRow({ createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) })],
    ]);

    const res = await request(buildApp()).post('/v1/diary/first-log').send(validEntry);

    expect(res.status).toBe(422);
    expect(insertCalls.length).toBe(0);
  });

  it('is idempotent once any entry exists', async () => {
    queueResults([
      [{ id: USER_A_UUID }],
      [{ id: 'existing-entry' }],
    ]);

    const res = await request(buildApp()).post('/v1/diary/first-log').send(validEntry);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ synced: true, alreadyExisted: true });
    expect(insertCalls.length).toBe(0);
  });

  it('rejects unauthenticated calls', async () => {
    verifyBearerToken.mockResolvedValue(null);

    const res = await request(buildApp()).post('/v1/diary/first-log').send(validEntry);

    expect(res.status).toBe(401);
    expect(insertCalls.length).toBe(0);
  });

  it('rejects invalid payloads', async () => {
    const res = await request(buildApp())
      .post('/v1/diary/first-log')
      .send({ ...validEntry, captureSessionId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(insertCalls.length).toBe(0);
  });
});
