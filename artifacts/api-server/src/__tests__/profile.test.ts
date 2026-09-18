import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queued, dbMock } = vi.hoisted(() => {
  const queued: unknown[][] = [];

  function chain() {
    const value: Record<string, unknown> = {};
    for (const method of ['from', 'innerJoin', 'where', 'limit', 'values', 'set', 'returning', 'onConflictDoUpdate']) {
      value[method] = () => value;
    }
    value.then = (resolve: (rows: unknown[]) => void, reject: (error: unknown) => void) => {
      const next = queued.shift();
      if (!next) return reject(new Error('profile.test: no queued database result'));
      return resolve(next);
    };
    return value;
  }

  return {
    queued,
    dbMock: {
      select: () => chain(),
      insert: () => chain(),
      update: () => chain(),
      delete: () => chain(),
    },
  };
});

vi.mock('@workspace/db', () => ({
  db: dbMock,
  profilesTable: {
    userId: 'profile.user_id',
    goal: 'profile.goal',
    activityLevel: 'profile.activity_level',
    dietPreference: 'profile.diet_preference',
    age: 'profile.age',
    heightCm: 'profile.height_cm',
    weightKg: 'profile.weight_kg',
    targetWeightKg: 'profile.target_weight_kg',
    calorieTarget: 'profile.calorie_target',
    consentVersion: 'profile.consent_version',
    consentAcceptedAt: 'profile.consent_accepted_at',
    updatedAt: 'profile.updated_at',
  },
  usersTable: {
    id: 'user.id',
    displayName: 'user.display_name',
  },
}));

const verifyBearerToken = vi.fn();
vi.mock('../lib/supabase-auth.js', () => ({
  verifyBearerToken: (...args: unknown[]) => verifyBearerToken(...args),
}));

const ensureUserRow = vi.fn();
vi.mock('../lib/user-rows.js', () => ({
  ensureUserRow: (...args: unknown[]) => ensureUserRow(...args),
}));

vi.mock('drizzle-orm', () => ({
  eq: (left: unknown, right: unknown) => ({ left, right }),
}));

import profileRouter from '../routes/profile.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(profileRouter);
  return app;
}

const input = {
  name: 'Alex',
  goal: 'lose',
  activity: 'moderate',
  diet: 'Everything',
  age: 32,
  heightCm: 170,
  weightKg: 76,
  targetWeightKg: 70,
  calorieTarget: 1800,
  consentVersion: 'calora-onboarding-v1',
};

const row = {
  goal: 'lose',
  activityLevel: 'moderate',
  dietPreference: 'Everything',
  age: 32,
  heightCm: '170.0',
  weightKg: '76.0',
  targetWeightKg: '70.0',
  calorieTarget: 1800,
  consentVersion: 'calora-onboarding-v1',
  updatedAt: new Date('2026-09-09T12:00:00.000Z'),
};

describe('profile persistence routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queued.length = 0;
    verifyBearerToken.mockResolvedValue({ id: 'auth-user', email: 'alex@example.com' });
    ensureUserRow.mockResolvedValue('internal-user');
  });

  it('returns 404 for an authenticated account without a saved profile', async () => {
    queued.push([]);

    const response = await request(buildApp())
      .get('/v1/profile')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('No profile');
  });

  it('round-trips a durable profile without trusting a client user id', async () => {
    queued.push([{ profile: row, name: 'Alex' }]);

    const getResponse = await request(buildApp())
      .get('/v1/profile')
      .set('Authorization', 'Bearer token');

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      name: 'Alex',
      goal: 'lose',
      activity: 'moderate',
      heightCm: 170,
      calorieTarget: 1800,
    });
    expect(ensureUserRow).toHaveBeenCalledWith('auth-user', 'alex@example.com');
  });

  it('upserts onboarding and clears it for an explicit account reset', async () => {
    queued.push([{ ...row, userId: 'internal-user' }], []);
    const putResponse = await request(buildApp())
      .put('/v1/profile')
      .set('Authorization', 'Bearer token')
      .send(input);

    expect(putResponse.status).toBe(200);
    expect(putResponse.body).toMatchObject({ name: 'Alex', consentVersion: 'calora-onboarding-v1' });

    queued.push([], []);
    const deleteResponse = await request(buildApp())
      .delete('/v1/profile')
      .set('Authorization', 'Bearer token');

    expect(deleteResponse.status).toBe(204);
  });

  it('rejects unauthenticated profile access', async () => {
    verifyBearerToken.mockResolvedValue(null);

    const response = await request(buildApp()).get('/v1/profile');

    expect(response.status).toBe(401);
  });
});