/**
 * Diary first-log sync — the durable, server-verified food-log record that
 * referral activation depends on.
 *
 * A first-log sync must reference a server-issued capture session that
 * belongs to the caller, is unused and recent, and whose analyzed nutrition
 * is consistent with the submitted entry. A fabricated payload (fresh JWT,
 * arbitrary nutrition, no real capture) must never create the qualifying
 * diary record.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { queued, dbMock, insertCalls } = vi.hoisted(() => {
  const queued: unknown[][] = [];
  const insertCalls: unknown[] = [];

  function makeChain(kind?: string) {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    for (const method of ['from', 'where', 'limit', 'set', 'returning', 'onConflictDoNothing', 'innerJoin']) {
      chain[method] = handler;
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
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(dbMock),
  };
  return { queued, dbMock, insertCalls };
});

vi.mock('@workspace/db', () => ({
  db: dbMock,
  usersTable: { id: 'id', externalId: 'external_id', email: 'email' },
  diaryEntriesTable: { id: 'id', userId: 'user_id' },
  aiCaptureSessionsTable: { id: 'id', userId: 'user_id', reviewedAt: 'reviewed_at' },
  aiCaptureCandidatesTable: { sessionId: 'session_id', calories: 'calories' },
}));

const verifyBearerToken = vi.fn();
vi.mock('../lib/supabase-auth.js', () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

import express from 'express';
import diaryRouter from '../routes/diary.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(diaryRouter);
  return app;
}

const USER = { id: 'supabase-user-1', email: 'user@example.com' };
const SESSION_ID = '4f8a2c9e-1b3d-4e5f-8a7b-9c0d1e2f3a4b';

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

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    userId: 'calora-user-uuid',
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
  vi.clearAllMocks();
  verifyBearerToken.mockResolvedValue(USER);
});

describe('POST /v1/diary/first-log', () => {
  it('persists the first entry when it matches a server-recorded capture session', async () => {
    queueResults([
      [{ id: 'calora-user-uuid' }],   // user row lookup
      [],                              // no existing diary entry
      [sessionRow()],                  // capture session lookup
      [{ calories: '310' }],           // analyzed candidates
      [{ id: SESSION_ID }],            // session claim succeeds
      [],                              // diary insert
    ]);

    const res = await request(buildApp()).post('/v1/diary/first-log').send(validEntry);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ synced: true, alreadyExisted: false });
    expect(insertCalls.length).toBe(1);
  });

  it('ADVERSARIAL: a fabricated payload with no real capture session creates no diary record', async () => {
    queueResults([
      [{ id: 'calora-user-uuid' }],
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
      [{ id: 'calora-user-uuid' }],
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
      [{ id: 'calora-user-uuid' }],
      [],
      [sessionRow({ reviewedAt: new Date() })],
    ]);

    const res = await request(buildApp()).post('/v1/diary/first-log').send(validEntry);

    expect(res.status).toBe(422);
    expect(insertCalls.length).toBe(0);
  });

  it('rejects a stale session', async () => {
    queueResults([
      [{ id: 'calora-user-uuid' }],
      [],
      [sessionRow({ createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) })],
    ]);

    const res = await request(buildApp()).post('/v1/diary/first-log').send(validEntry);

    expect(res.status).toBe(422);
    expect(insertCalls.length).toBe(0);
  });

  it('is idempotent once any entry exists', async () => {
    queueResults([
      [{ id: 'calora-user-uuid' }],
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
