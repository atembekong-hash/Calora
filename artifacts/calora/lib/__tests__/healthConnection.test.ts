import { describe, expect, it } from 'vitest';
import { needsActiveEnergyAuthorization, needsStepsAuthorization, normalizeHealthConnection } from '../healthConnection';

describe('normalizeHealthConnection', () => {
  it('does not trust a legacy connected flag without provider metadata', () => {
    expect(normalizeHealthConnection(true)).toMatchObject({ authorization: 'unavailable', provider: 'unsupported', granted: [] });
  });

  it('preserves provider-authoritative local metadata', () => {
    expect(normalizeHealthConnection({
      provider: 'health-connect',
      authorization: 'partial',
      granted: ['steps'],
      lastSyncedAt: '2026-08-17T12:00:00.000Z',
    })).toMatchObject({
      provider: 'health-connect',
      authorization: 'partial',
      granted: ['steps'],
      lastSyncedAt: '2026-08-17T12:00:00.000Z',
    });
  });

  it('retains a valid measured zero but removes an invalid hydrated snapshot', () => {
    const measuredZero = normalizeHealthConnection({
      provider: 'health-connect',
      authorization: 'authorized',
      granted: ['activeEnergy', 'activeEnergy', 'not-a-metric' as any],
      snapshot: {
        syncedAt: '2026-08-17T12:00:00.000Z', steps: 0, activeEnergyKcal: 0, workouts: [], weights: [],
      },
    });
    expect(measuredZero.snapshot?.activeEnergyKcal).toBe(0);
    expect(measuredZero.granted).toEqual(['activeEnergy']);

    const invalid = normalizeHealthConnection({
      provider: 'not-a-provider' as any,
      authorization: 'not-an-authorization' as any,
      granted: ['bogus' as any],
      lastSyncedAt: 'not-a-date',
      snapshot: {
        syncedAt: 'not-a-date', steps: -1, activeEnergyKcal: Number.NaN, workouts: [], weights: [],
      },
    });
    expect(invalid).toMatchObject({ provider: 'unsupported', authorization: 'unavailable', granted: [] });
    expect(invalid.snapshot).toBeUndefined();
    expect(invalid.lastSyncedAt).toBeUndefined();
    expect(invalid.syncError).toContain('invalid');
  });

  it('preserves valid provider daily history while dropping malformed persisted points', () => {
    const connection = normalizeHealthConnection({
      provider: 'health-connect',
      authorization: 'authorized',
      granted: ['steps', 'activeEnergy'],
      snapshot: {
        syncedAt: '2026-08-30T12:00:00.000Z',
        steps: 4200,
        activeEnergyKcal: 310,
        workouts: [],
        weights: [],
        dailyMetrics: [
          { date: '2026-08-29', steps: 2100, activeEnergyKcal: 160 },
          { date: 'invalid', steps: 999, activeEnergyKcal: 20 },
          { date: '2026-08-30', steps: 4200, activeEnergyKcal: 310 },
          { date: '2026-08-28', steps: -1, activeEnergyKcal: 150 },
        ],
      },
    });

    expect(connection.snapshot?.dailyMetrics).toEqual([
      { date: '2026-08-29', steps: 2100, activeEnergyKcal: 160 },
      { date: '2026-08-30', steps: 4200, activeEnergyKcal: 310 },
    ]);
  });

  it('identifies only missing Android partial-grant categories as updateable access', () => {
    expect(needsActiveEnergyAuthorization({ provider: 'health-connect', authorization: 'partial', granted: ['steps'] })).toBe(true);
    expect(needsActiveEnergyAuthorization({ provider: 'health-connect', authorization: 'partial', granted: ['activeEnergy'] })).toBe(false);
    expect(needsActiveEnergyAuthorization({ provider: 'healthkit', authorization: 'requested', granted: [] })).toBe(false);

    expect(needsStepsAuthorization({ provider: 'health-connect', authorization: 'partial', granted: ['activeEnergy'] })).toBe(true);
    expect(needsStepsAuthorization({ provider: 'health-connect', authorization: 'partial', granted: ['steps'] })).toBe(false);
    expect(needsStepsAuthorization({ provider: 'healthkit', authorization: 'requested', granted: [] })).toBe(false);
  });
});
