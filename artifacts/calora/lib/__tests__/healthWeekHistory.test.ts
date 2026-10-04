import { describe, expect, it } from 'vitest';
import {
  healthConnectDailyMetrics,
  healthConnectHistoryRange,
} from '../health/healthService.android';
import {
  healthKitDailyMetrics,
  healthKitHistoryFilter,
} from '../health/healthService.ios';
import {
  buildHealthDailyMetrics,
  localHealthHistoryRange,
  normalizeHealthDailyMetrics,
} from '../health/weekHistory';

const day = (dayNumber: number) => new Date(2026, 7, dayNumber);
const now = new Date(2026, 7, 30, 15, 42, 11);

function healthConnectStepGroup(dayNumber: number, steps: number, origins = ['com.example.fitness']) {
  return {
    startTime: day(dayNumber).toISOString(),
    result: { dataOrigins: origins, COUNT_TOTAL: steps },
  };
}

function healthConnectEnergyGroup(dayNumber: number, kcal: number, origins = ['com.example.fitness']) {
  return {
    startTime: day(dayNumber).toISOString(),
    result: { dataOrigins: origins, ACTIVE_CALORIES_TOTAL: { inKilocalories: kcal } },
  };
}

describe('provider seven-day health history', () => {
  it('uses one device-local seven-day range in Android and iOS adapters', () => {
    const history = localHealthHistoryRange(now);
    const android = healthConnectHistoryRange(now).timeRangeFilter;
    const ios = healthKitHistoryFilter(now).filter.date;

    expect(history.dates).toEqual([
      '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30',
    ]);
    expect(android).toEqual({
      operator: 'between',
      startTime: new Date(2026, 7, 24).toISOString(),
      endTime: now.toISOString(),
    });
    expect(ios).toEqual({ startDate: new Date(2026, 7, 24), endDate: now });
  });

  it('retains provider measurements and gaps in Android daily aggregate groups', () => {
    const metrics = healthConnectDailyMetrics(
      [
        healthConnectStepGroup(25, 1200),
        healthConnectStepGroup(27, 0),
        healthConnectStepGroup(30, 4900),
      ],
      [
        healthConnectEnergyGroup(25, 240),
        healthConnectEnergyGroup(28, 0),
        healthConnectEnergyGroup(30, 410),
      ],
      now,
    );

    expect(metrics).toHaveLength(7);
    expect(metrics).toEqual(expect.arrayContaining([
      { date: '2026-08-25', steps: 1200, activeEnergyKcal: 240 },
      { date: '2026-08-26', steps: null, activeEnergyKcal: null },
      { date: '2026-08-27', steps: 0, activeEnergyKcal: null },
      { date: '2026-08-28', steps: null, activeEnergyKcal: 0 },
      { date: '2026-08-30', steps: 4900, activeEnergyKcal: 410 },
    ]));
  });

  it('keeps empty-origin Android aggregate groups unavailable instead of treating them as zero', () => {
    const metrics = healthConnectDailyMetrics(
      [healthConnectStepGroup(29, 0, [])],
      [healthConnectEnergyGroup(29, 0, [])],
      now,
    );
    expect(metrics.find((metric) => metric.date === '2026-08-29')).toEqual({
      date: '2026-08-29', steps: null, activeEnergyKcal: null,
    });
  });

  it('retains provider measurements and gaps in Apple Health daily statistics', () => {
    const metrics = healthKitDailyMetrics(
      [
        { startDate: day(24), sumQuantity: { quantity: 800 } },
        { startDate: day(28), sumQuantity: { quantity: 0 } },
        { startDate: day(30), sumQuantity: { quantity: 7300 } },
      ],
      [
        { startDate: day(24), sumQuantity: { quantity: 160 } },
        { startDate: day(29), sumQuantity: { quantity: 340 } },
        { startDate: day(30), sumQuantity: { quantity: 0 } },
      ],
      now,
    );

    expect(metrics).toEqual(expect.arrayContaining([
      { date: '2026-08-24', steps: 800, activeEnergyKcal: 160 },
      { date: '2026-08-25', steps: null, activeEnergyKcal: null },
      { date: '2026-08-28', steps: 0, activeEnergyKcal: null },
      { date: '2026-08-29', steps: null, activeEnergyKcal: 340 },
      { date: '2026-08-30', steps: 7300, activeEnergyKcal: 0 },
    ]));
  });

  it('drops malformed persisted history and retains only the newest seven valid days', () => {
    const raw = [
      { date: 'invalid', steps: 30, activeEnergyKcal: 1 },
      { date: '2026-08-30', steps: 10, activeEnergyKcal: 5 },
      { date: '2026-08-30', steps: 20, activeEnergyKcal: 6 },
      { date: '2026-08-29', steps: -1, activeEnergyKcal: 1 },
      ...Array.from({ length: 8 }, (_, index) => ({
        date: `2026-08-${String(20 + index).padStart(2, '0')}`,
        steps: index,
        activeEnergyKcal: index,
      })),
    ];

    const normalized = normalizeHealthDailyMetrics(raw);
    expect(normalized).toHaveLength(7);
    expect(normalized[0]?.date).toBe('2026-08-22');
    expect(normalized.at(-1)).toEqual({ date: '2026-08-30', steps: 20, activeEnergyKcal: 6 });
  });

  it('does not turn an absent metric into zero while building a complete date axis', () => {
    const metrics = buildHealthDailyMetrics(new Map([
      ['2026-08-30', { steps: 1234 }],
    ]), now);
    expect(metrics.find((metric) => metric.date === '2026-08-30')).toEqual({
      date: '2026-08-30', steps: 1234, activeEnergyKcal: null,
    });
  });
});
