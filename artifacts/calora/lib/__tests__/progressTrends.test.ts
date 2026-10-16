import { describe, expect, it } from 'vitest';
import { deriveWeeklyHealthTrend, deriveWeeklyWaterTrend } from '../progressTrends';

describe('seven-day Progress trends', () => {
  it('uses real provider values while preserving unmeasured days as gaps', () => {
    const points = deriveWeeklyHealthTrend([
      { date: '2026-08-24', steps: 1250, activeEnergyKcal: 120 },
      { date: '2026-08-26', steps: 0, activeEnergyKcal: null },
      { date: '2026-08-30', steps: 6420, activeEnergyKcal: 410 },
    ], 'steps', '2026-08-30');

    expect(points.map((point) => point.date)).toEqual([
      '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30',
    ]);
    expect(points.map((point) => point.value)).toEqual([1250, null, 0, null, null, null, 6420]);
  });

  it('keeps active calories independent from steps and preserves an intentional zero', () => {
    const points = deriveWeeklyHealthTrend([
      { date: '2026-08-29', steps: null, activeEnergyKcal: 230 },
      { date: '2026-08-30', steps: 20, activeEnergyKcal: 0 },
    ], 'activeEnergyKcal', '2026-08-30');

    expect(points.at(-2)?.value).toBe(230);
    expect(points.at(-1)?.value).toBe(0);
    expect(points[0]?.value).toBeNull();
  });

  it('uses only the signed-in scope hydration logs for water and keeps unlogged days blank', () => {
    const points = deriveWeeklyWaterTrend({
      '2026-08-24': 40,
      '2026-08-26': 0,
      '2026-08-30': 72,
    }, '2026-08-30');

    expect(points.map((point) => point.value)).toEqual([40, null, 0, null, null, null, 72]);
  });
});


describe('range-aware progress trends', () => {
  it('supports a custom range above one week without fabricating missing values', async () => {
    const { deriveCalorieTrend } = await import('../progressTrends');
    const points = deriveCalorieTrend([{ date: '2026-09-01', calories: 500 }, { date: '2026-09-20', calories: 700 }], { start: '2026-09-01', end: '2026-09-30' });
    expect(points).toHaveLength(30); expect(points[0].value).toBe(500); expect(points[19].value).toBe(700); expect(points[1].value).toBeNull();
  });
  it('buckets a year range by month', async () => {
    const { deriveWaterTrend } = await import('../progressTrends');
    const points = deriveWaterTrend({ '2025-10-01': 40, '2026-09-20': 64 }, { start: '2025-10-01', end: '2026-09-30' });
    expect(points).toHaveLength(12); expect(points[0].value).toBe(40); expect(points[11].value).toBe(64);
  });

  it('aggregates protein, carbs, and fat using the same selected buckets', async () => {
    const { deriveMacroTrend } = await import('../progressTrends');
    const points = deriveMacroTrend([
      { date: '2026-09-01', protein: 20, carbs: 40, fat: 10 },
      { date: '2026-09-01', protein: 15, carbs: 25, fat: 5 },
      { date: '2026-09-20', protein: 30, carbs: 60, fat: 20 },
    ], { start: '2026-09-01', end: '2026-09-30' });
    expect(points).toHaveLength(30);
    expect(points[0]).toMatchObject({ protein: 35, carbs: 65, fat: 15 });
    expect(points[19]).toMatchObject({ protein: 30, carbs: 60, fat: 20 });
    expect(points[1]).toMatchObject({ protein: null, carbs: null, fat: null });
  });

  it('uses compact weekday labels for daily ranges so native chart strips remain contained', async () => {
    const { deriveCalorieTrend } = await import('../progressTrends');
    const points = deriveCalorieTrend([], { start: '2026-10-10', end: '2026-10-16' });
    expect(points.map((point) => point.label)).toEqual(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  });

  it('buckets Health workout sessions over the same selected calendar range', async () => {
    const { deriveWorkoutTrend } = await import('../progressTrends');
    const points = deriveWorkoutTrend([
      { id: 'workout-1', startAt: '2026-10-10T08:00:00.000Z', endAt: '2026-10-10T08:30:00.000Z', type: 'run' },
      { id: 'workout-2', startAt: '2026-10-10T17:00:00.000Z', endAt: '2026-10-10T17:45:00.000Z', type: 'walk' },
      { id: 'workout-3', startAt: '2026-10-16T09:00:00.000Z', endAt: '2026-10-16T09:20:00.000Z', type: 'cycle' },
    ], { start: '2026-10-10', end: '2026-10-16' });
    expect(points.map((point) => point.value)).toEqual([2, null, null, null, null, null, 1]);
  });

  it('keeps macro series aligned when a long range is bucketed weekly', async () => {
    const { deriveMacroTrend } = await import('../progressTrends');
    const points = deriveMacroTrend([
      { date: '2026-07-15', protein: 20, carbs: 40, fat: 10 },
      { date: '2026-07-16', protein: 30, carbs: 60, fat: 20 },
    ], { start: '2026-07-15', end: '2026-10-12' });
    expect(points[0]).toMatchObject({ protein: 50, carbs: 100, fat: 30 });
    expect(points.every((point) => point.protein === null ? point.carbs === null && point.fat === null : true)).toBe(true);
  });
});
