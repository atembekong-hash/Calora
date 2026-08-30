import { describe, expect, it } from 'vitest';
import { burnedStatusForDay } from '../health/burnedStatus';
import { currentLocalDayRange } from '../health/dayRange';
import { healthConnectDayRange } from '../health/healthService.android';
import { AuthorizationRequestStatus } from '@kingstinct/react-native-healthkit';
import { healthKitActiveEnergyOptions, healthKitAuthorizationForRequestStatus, healthKitDayFilter } from '../health/healthService.ios';
import type { HealthConnection } from '../health/types';

const connected = (overrides: Partial<HealthConnection> = {}): HealthConnection => ({
  provider: 'health-connect',
  authorization: 'authorized',
  granted: ['activeEnergy'],
  ...overrides,
});

describe('currentLocalDayRange', () => {
  it('starts at local midnight and ends at the supplied instant', () => {
    const now = new Date(2026, 7, 30, 15, 42, 11);
    const range = currentLocalDayRange(now);

    expect(range.startDate.getFullYear()).toBe(2026);
    expect(range.startDate.getMonth()).toBe(7);
    expect(range.startDate.getDate()).toBe(30);
    expect(range.startDate.getHours()).toBe(0);
    expect(range.startDate.getMinutes()).toBe(0);
    expect(range.endDate).toEqual(now);
    expect(range.startTime).toBe(range.startDate.toISOString());
    expect(range.endTime).toBe(now.toISOString());
  });

  it('uses the same local-day interval in both native adapters', () => {
    const now = new Date(2026, 7, 30, 15, 42, 11);
    const android = healthConnectDayRange(now).timeRangeFilter;
    const ios = healthKitDayFilter(now).filter.date;

    expect(android.startTime).toBe(new Date(2026, 7, 30).toISOString());
    expect(android.endTime).toBe(now.toISOString());
    expect(ios).toMatchObject({
      startDate: new Date(2026, 7, 30),
      endDate: now,
      strictStartDate: true,
      strictEndDate: true,
    });
  });

  it('always requests HealthKit active energy in kilocalories', () => {
    const options = healthKitActiveEnergyOptions(new Date(2026, 7, 30, 15, 42, 11));
    expect(options.unit).toBe('kcal');
    expect(options.filter.date.startDate).toEqual(new Date(2026, 7, 30));
  });

  it('recognizes HealthKit’s numeric authorized request status', () => {
    expect(AuthorizationRequestStatus.unnecessary).toBe(2);
    expect(healthKitAuthorizationForRequestStatus(AuthorizationRequestStatus.unnecessary)).toBe('authorized');
    expect(healthKitAuthorizationForRequestStatus(AuthorizationRequestStatus.shouldRequest)).toBe('notConnected');
  });

  it('preserves the local calendar day across a daylight-saving transition', () => {
    const beforeFallback = new Date('2026-11-01T06:30:00.000Z');
    const range = currentLocalDayRange(beforeFallback);

    expect(range.startDate.getHours()).toBe(0);
    expect(range.startDate.getMinutes()).toBe(0);
    expect(range.endTime).toBe(beforeFallback.toISOString());
  });
});

describe('burnedStatusForDay', () => {
  it('keeps a measured zero distinct from missing health data', () => {
    expect(burnedStatusForDay({
      isToday: true,
      connection: connected({ snapshot: { syncedAt: '2026-08-30T10:00:00.000Z', steps: 0, activeEnergyKcal: 0, workouts: [], weights: [] } }),
    })).toEqual({ kind: 'ready', calories: 0 });
  });

  it.each([
    ['connect', connected({ authorization: 'notConnected', granted: [] }), 'Connect Health'],
    ['permission', connected({ authorization: 'denied', granted: [] }), 'Allow Health access'],
    ['permission', connected({ authorization: 'partial', granted: ['steps'] }), 'Allow active calories'],
    ['syncing', connected(), 'Syncing health…'],
    ['failed', connected({ syncError: 'Timed out' }), 'Sync health'],
    ['unavailable', connected({ authorization: 'unavailable', granted: [] }), 'Health unavailable on this device'],
  ] as const)('reports %s without inventing a zero', (kind, connection, actionLabel) => {
    expect(burnedStatusForDay({ isToday: true, connection })).toEqual({ kind, actionLabel });
  });

  it('does not present current-day calories for a past date', () => {
    expect(burnedStatusForDay({
      isToday: false,
      connection: connected({ snapshot: { syncedAt: '2026-08-30T10:00:00.000Z', steps: 1200, activeEnergyKcal: 345, workouts: [], weights: [] } }),
    })).toEqual({ kind: 'past-date', actionLabel: 'Burned unavailable for past dates' });
  });
});