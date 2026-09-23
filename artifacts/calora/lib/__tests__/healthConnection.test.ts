import { describe, expect, it } from 'vitest';
import { needsActiveEnergyAuthorization, normalizeHealthConnection } from '../healthConnection';

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

  it('identifies only an Android partial grant missing active energy as updateable access', () => {
    expect(needsActiveEnergyAuthorization({ provider: 'health-connect', authorization: 'partial', granted: ['steps'] })).toBe(true);
    expect(needsActiveEnergyAuthorization({ provider: 'health-connect', authorization: 'partial', granted: ['activeEnergy'] })).toBe(false);
    expect(needsActiveEnergyAuthorization({ provider: 'healthkit', authorization: 'requested', granted: [] })).toBe(false);
  });
});
