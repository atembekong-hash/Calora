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
