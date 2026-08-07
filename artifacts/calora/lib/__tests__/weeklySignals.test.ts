import { describe, expect, it } from 'vitest';
import { deriveWeeklySignals, trustScore } from '@/lib/weeklySignals';
import type { FoodLog } from '@/context/CaloraContext';

const log = (date: string, confidence = 90): FoodLog => ({
  id: `${date}-breakfast`,
  name: 'Breakfast',
  date,
  meal: 'Breakfast',
  calories: 400,
  protein: 20,
  carbs: 40,
  fat: 12,
  source: 'USDA verified',
  confidence,
  time: '8:00 AM',
  serving: '1 serving',
});

describe('weekly signals', () => {
  it('keeps food days distinct from wellness-only tracked days', () => {
    const signals = deriveWeeklySignals(
      [log('2026-08-06')],
      { '2026-08-05': 16 },
      {},
      {},
      2000,
      '2026-08-06',
    );

    expect(signals.foodDays).toBe(1);
    expect(signals.trackedDays).toBe(2);
    expect(signals.averageCalories).toBe(400);
    expect(signals.averageWater).toBe(16);
  });

  it('computes average active minutes only over days with logged minutes', () => {
    const signals = deriveWeeklySignals(
      [],
      {},
      {},
      {},
      2000,
      '2026-08-06',
      { '2026-08-06': 30, '2026-08-05': 45 },
    );

    expect(signals.averageActivityMinutes).toBe(38); // Math.round((30 + 45) / 2)
  });

  it('returns zero average active minutes when no minutes are logged', () => {
    const signals = deriveWeeklySignals(
      [],
      {},
      {},
      {},
      2000,
      '2026-08-06',
    );

    expect(signals.averageActivityMinutes).toBe(0);
  });

  it('populates activityMinutes per day from the provided log', () => {
    const signals = deriveWeeklySignals(
      [],
      {},
      {},
      {},
      2000,
      '2026-08-06',
      { '2026-08-06': 60 },
    );

    const today = signals.days.find((d) => d.date === '2026-08-06');
    const yesterday = signals.days.find((d) => d.date === '2026-08-05');
    expect(today?.activityMinutes).toBe(60);
    expect(yesterday?.activityMinutes).toBe(0);
  });

  it('returns neutral trust when no diary entries exist', () => {
    expect(trustScore([])).toBeNull();
    expect(trustScore([log('2026-08-06', 80), log('2026-08-05', 100)])).toBe(90);
  });
});