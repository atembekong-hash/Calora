/**
 * Regression tests for the referral activation qualification gate.
 *
 * POST /v1/referral/activate must never grant rewards on the client's word
 * alone: a redemption needs a server-observed saved-meal signal before any
 * RevenueCat grant happens.
 *
 * Strategy:
 * - Mock @workspace/db with a thenable chain that serves queued results
 * - Mock supabase auth, RevenueCat grants, and the saved-meal lookup
 * - Use supertest against a minimal Express app mounting the router
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ---------------------------------------------------------------------------
// db mock: db.select()/db.update()/db.insert() return a chain where every
// method returns the chain itself, and awaiting it resolves the next queued
// result. db.transaction(fn) runs fn against the same chain mechanism.
// ---------------------------------------------------------------------------
const { queued, dbMock } = vi.hoisted(() => {
  const queued: unknown[][] = [];

  function makeChain() {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    for (const method of ['from', 'where', 'limit', 'set', 'values', 'returning', 'groupBy', 'innerJoin', 'select', 'update', 'insert']) {
      chain[method] = handler;
    }
    chain.then = (resolve: (rows: unknown[]) => void, reject: (err: unknown) => void) => {
      if (queued.length === 0) return void reject(new Error('referral.test: no queued db result'));
      return void resolve(queued.shift()!);
    };
    return chain;
  }

  const dbMock = {
    select: () => makeChain(),
    update: () => makeChain(),
    insert: () => makeChain(),
    execute: async () => [],
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(dbMock),
  };
  return { queued, dbMock };
});

function queueResult(rows: unknown[]) {
  queued.push(rows);
}

vi.mock('@workspace/db', () => ({
  db: dbMock,
  referralCodesTable: { userId: 'user_id', code: 'code' },
  referralRedemptionsTable: {
    id: 'id',
    code: 'code',
    referrerUserId: 'referrer_user_id',
    referredUserId: 'referred_user_id',
    status: 'status',
    qualifiedAt: 'qualified_at',
    qualifiedSignal: 'qualified_signal',
    referredRewardedAt: 'referred_rewarded_at',
    referrerRewardedAt: 'referrer_rewarded_at',
  },
}));

const verifyBearerToken = vi.fn();
vi.mock('../lib/supabase-auth.js', () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

const grantPromoDays = vi.fn();
vi.mock('../lib/revenuecat.js', () => ({
  grantPromoDays: (...args: unknown[]) => grantPromoDays(...args),
}));

const hasSavedDiaryEntry = vi.fn();
vi.mock('../lib/referral-qualification.js', () => ({
  hasSavedDiaryEntry: (...args: unknown[]) => hasSavedDiaryEntry(...args),
}));

import express from 'express';
import referralRouter from '../routes/referral.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(referralRouter);
  return app;
}

const USER = { id: 'referred-user-1', email: 'referred@example.com' };

function redemptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'redemption-1',
    code: 'ABCD2345',
    referrerUserId: 'referrer-user-1',
    referredUserId: USER.id,
    status: 'pending',
    qualifiedAt: null,
    qualifiedSignal: null,
    referredRewardedAt: null,
    referrerRewardedAt: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  queued.length = 0;
  vi.clearAllMocks();
  verifyBearerToken.mockResolvedValue(USER);
  grantPromoDays.mockResolvedValue(undefined);
  hasSavedDiaryEntry.mockResolvedValue(false);
});

describe('POST /v1/referral/activate — qualification gate', () => {
  it('refuses to grant when there is no server-observed saved meal', async () => {
    queueResult([redemptionRow()]); // redemption lookup

    const res = await request(buildApp()).post('/v1/referral/activate');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.referredRewarded).toBe(false);
    expect(res.body.referrerRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();
    expect(hasSavedDiaryEntry).toHaveBeenCalledWith(USER.id);
  });

  it('grants both sides when the redemption was already qualified by a saved meal', async () => {
    queueResult([redemptionRow({ qualifiedAt: new Date(), qualifiedSignal: 'saved_meal' })]);
    queueResult([{ id: 'redemption-1' }]); // referred claim UPDATE ... RETURNING wins
    queueResult([{ id: 'redemption-1' }]); // referrer claim UPDATE ... RETURNING wins

    const res = await request(buildApp()).post('/v1/referral/activate');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rewarded');
    expect(res.body.referredRewarded).toBe(true);
    expect(res.body.referrerRewarded).toBe(true);
    expect(grantPromoDays).toHaveBeenCalledWith(USER.id, 30);
    expect(grantPromoDays).toHaveBeenCalledWith('referrer-user-1', 30);
    // Already qualified — no diary lookup needed.
    expect(hasSavedDiaryEntry).not.toHaveBeenCalled();
  });

  it('qualifies via any saved diary entry when no qualification stamp exists', async () => {
    hasSavedDiaryEntry.mockResolvedValue(true);
    queueResult([redemptionRow()]);        // redemption lookup (unqualified)
    queueResult([{ id: 'redemption-1' }]); // qualification stamp UPDATE ... RETURNING wins
    queueResult([{ id: 'redemption-1' }]); // referred claim wins
    queueResult([{ id: 'redemption-1' }]); // referrer claim wins

    const res = await request(buildApp()).post('/v1/referral/activate');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rewarded');
    expect(grantPromoDays).toHaveBeenCalledWith(USER.id, 30);
  });

  it('CONCURRENCY: a losing qualification stamp re-reads fresh state and never treats stale claims as settled', async () => {
    // Simulates the loser of two simultaneous activations: its conditional
    // qualification stamp returns no rows because the winner already set
    // qualified_at. It must re-read the redemption and work from the fresh
    // row — here the winner also already claimed BOTH rewards, so the loser
    // must not call RevenueCat at all and still report accurate state.
    hasSavedDiaryEntry.mockResolvedValue(true);
    queueResult([redemptionRow()]); // stale lookup: unqualified, unrewarded
    queueResult([]);                // qualification stamp UPDATE ... RETURNING loses
    queueResult([
      redemptionRow({
        status: 'rewarded',
        qualifiedAt: new Date(),
         qualifiedSignal: 'saved_meal',
        referredRewardedAt: new Date(),
        referrerRewardedAt: new Date(),
      }),
    ]); // fresh re-read reflects the winner's completed work

    const res = await request(buildApp()).post('/v1/referral/activate');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rewarded');
    expect(res.body.referredRewarded).toBe(true);
    expect(res.body.referrerRewarded).toBe(true);
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  it('CONCURRENCY: never proceeds to rewards when qualification cannot be confirmed after a lost stamp', async () => {
    hasSavedDiaryEntry.mockResolvedValue(true);
    queueResult([redemptionRow()]); // stale lookup: unqualified
    queueResult([]);                // stamp loses
    queueResult([redemptionRow()]); // fresh read (anomalously) still unqualified

    const res = await request(buildApp()).post('/v1/referral/activate');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.referredRewarded).toBe(false);
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  it('does not re-grant an already-rewarded redemption', async () => {
    queueResult([
      redemptionRow({
        status: 'rewarded',
        qualifiedAt: new Date(),
        referredRewardedAt: new Date(),
        referrerRewardedAt: new Date(),
      }),
    ]);

    const res = await request(buildApp()).post('/v1/referral/activate');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rewarded');
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  it('returns none (and grants nothing) when the caller has no redemption', async () => {
    queueResult([]);

    const res = await request(buildApp()).post('/v1/referral/activate');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('none');
    expect(grantPromoDays).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated calls', async () => {
    verifyBearerToken.mockResolvedValue(null);

    const res = await request(buildApp()).post('/v1/referral/activate');

    expect(res.status).toBe(401);
    expect(grantPromoDays).not.toHaveBeenCalled();
  });
});
