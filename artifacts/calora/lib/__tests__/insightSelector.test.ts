import { describe, expect, it, vi } from 'vitest';
import type { FoodLog, Profile } from '@/context/CaloraContext';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { buildDailyIntelligenceFacts } from '@/lib/intelligence/facts';
import { selectContextualInsight } from '@/lib/intelligence/insightSelector';
import type { IntelligenceFact } from '@/lib/intelligence/types';

const profile: Profile = {
  name: 'Selector', goal: 'lose', activity: 'moderate', diet: 'Everything',
  heightCm: 170, weightKg: 80, targetWeightKg: 70, age: 30, calorieTarget: 2000,
};

function log(overrides: Partial<FoodLog> = {}): FoodLog {
  return {
    id: 'food-1', name: 'Meal', date: '2026-08-20', meal: 'Breakfast',
    calories: 400, protein: 20, carbs: 40, fat: 12, source: 'USDA verified',
    confidence: 95, time: '08:00', serving: '1',
    ...overrides,
  };
}

function facts(logs: FoodLog[], profileValue: Profile | null = profile): IntelligenceFact[] {
  return buildDailyIntelligenceFacts(createIntelligenceContext({
    logs, profile: profileValue, weights: [], waterLogs: {}, moodLogs: {},
    activityLogs: {}, activityMinutesLogs: {}, plannerMeals: [], shoppingItems: [], localRecipes: [],
  }, { date: '2026-08-20', timezone: 'America/New_York' }), { generatedAt: '2026-08-20T12:00:00.000Z' });
}

describe('restricted contextual insight selector', () => {
  it('is deterministic and selects one allowed high-priority calorie insight', () => {
    const input = facts([log({ calories: 2100 }), log({ id: 'food-2', meal: 'Lunch', calories: 100 })]);
    const first = selectContextualInsight(input);
    const repeated = selectContextualInsight(input);

    expect(first).toEqual(repeated);
    expect(first).toMatchObject({
      state: 'active',
      type: 'calorie_status',
      category: 'calorie_status',
      priority: 400,
      confidence: 'high',
      freshness: 'fresh',
      generatedAt: '2026-08-20T12:00:00.000Z',
    });
    expect(first.supportingFacts.map((fact) => fact.factType)).toEqual([
      'daily.calories_consumed', 'daily.calorie_target',
    ]);
  });

  it('uses explicit priority order before macro, meal, and descriptive candidates', () => {
    const input = facts([
      log({ calories: 2100, protein: 10 }),
      log({ id: 'food-2', meal: 'Lunch', calories: 100, protein: 2 }),
    ]);
    expect(selectContextualInsight(input).type).toBe('calorie_status');
  });

  it('returns an informative inactive state for missing and low-confidence evidence', () => {
    expect(selectContextualInsight(facts([]))).toMatchObject({
      state: 'insufficient_data',
      reason: 'confidence_gate',
      type: 'none',
    });
    expect(selectContextualInsight(facts([
      log({ source: 'Photo estimate' }),
      log({ id: 'estimate-2', source: 'Photo estimate' }),
    ]))).toMatchObject({
      state: 'low_confidence',
      reason: 'confidence_gate',
      type: 'none',
    });
  });

  it('rejects stale or mixed-watermark fact sets instead of selecting an insight', () => {
    const input = facts([log({ calories: 2100 })]);
    const stale = input.map((fact) => ({ ...fact, freshness: 'stale' as const }));
    expect(selectContextualInsight(stale)).toMatchObject({ state: 'stale', reason: 'facts_not_fresh' });

    const mixed = [...input, { ...input[0], sourceWatermark: { ...input[0].sourceWatermark, value: 'different' } }];
    expect(selectContextualInsight(mixed)).toMatchObject({ state: 'stale', reason: 'mixed_watermarks' });
  });

  it('does not persist, fetch, log, or mutate facts while selecting', () => {
    const input = facts([log({ calories: 2100 })]);
    const original = structuredClone(input);
    const fetchSpy = vi.fn();
    const storageSpy = vi.fn();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const previousFetch = globalThis.fetch;
    Object.assign(globalThis, { fetch: fetchSpy, AsyncStorage: { setItem: storageSpy } });

    try {
      selectContextualInsight(input);
      expect(input).toEqual(original);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      Object.assign(globalThis, { fetch: previousFetch });
      logSpy.mockRestore();
    }
  });

  it('contains no account identifier or raw meal text, preventing cross-account output reuse', () => {
    const result = selectContextualInsight(facts([log({ id: 'private-log-id', name: 'Private meal', notes: 'Private note', calories: 2100 })]));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('Private meal');
    expect(serialized).not.toContain('Private note');
    expect(serialized).not.toContain('private-log-id');
    expect(serialized).not.toContain('user-');
  });

  it('recomputes from the next account’s facts without retaining a previous account insight', () => {
    const userAInsight = selectContextualInsight(facts([log({ calories: 2100 })]));
    const userBInsight = selectContextualInsight(facts([], {
      ...profile,
      name: 'Different account',
      calorieTarget: 1800,
    }));

    expect(userAInsight).toMatchObject({ state: 'active', type: 'calorie_status' });
    expect(userBInsight).toMatchObject({ state: 'insufficient_data', type: 'none' });
    expect(JSON.stringify(userBInsight)).not.toContain('2100');
    expect(JSON.stringify(userBInsight)).not.toContain('Selector');
  });
});