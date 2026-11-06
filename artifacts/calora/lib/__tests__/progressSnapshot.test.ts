import { describe, expect, it } from 'vitest';
import { calculateProgressSnapshot } from '@/lib/progressSnapshot';
import type { FoodLog, WeightEntry } from '@/context/CaloraContext';

const log = (date: string): FoodLog => ({
  id: date,
  name: 'Meal',
  date,
  meal: 'Lunch',
  calories: 500,
  protein: 20,
  carbs: 50,
  fat: 15,
  source: 'Manual',
  confidence: 1,
  time: '12:00',
  serving: '1 serving',
});

const weight = (date: string, id = date): WeightEntry => ({ id, date, kg: 70, source: 'manual' });

describe('Progress Snapshot calculations', () => {
  it('counts nutrition days against the full seven-day denominator', () => {
    const result = calculateProgressSnapshot([log('2026-11-02'), log('2026-11-04'), log('2026-11-04')], undefined, [], '2026-11-05', 10000);
    expect(result.dates).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']);
    expect(result.nutritionDays).toBe(2);
    expect(result.nutrition.value).toBe('2 days');
    expect(result.nutrition.progress).toBeCloseTo(2 / 7);
  });

  it('averages only provider-recorded steps and preserves missing-day semantics', () => {
    const result = calculateProgressSnapshot([], [
      { date: '2026-11-02', steps: 8000, activeEnergyKcal: 200 },
      { date: '2026-11-03', steps: null, activeEnergyKcal: null },
      { date: '2026-11-04', steps: 4000, activeEnergyKcal: 150 },
    ], [], '2026-11-05', 10000);
    expect(result.steps.value).toBe('6,000 avg');
    expect(result.steps.detail).toBe('2/7 days recorded');
    expect(result.steps.progress).toBe(0.6);
  });

  it('counts actual weekly weigh-ins only and never invents weight progress', () => {
    const result = calculateProgressSnapshot([], undefined, [weight('2026-11-02'), weight('2026-10-01', 'baseline')], '2026-11-05', 10000);
    expect(result.weight.value).toBe('1 entry');
    expect(result.weight.detail).toBe('weigh-in this week');
    expect(result.weight.progress).toBeNull();
  });
});
