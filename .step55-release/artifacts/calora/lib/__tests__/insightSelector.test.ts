import { describe, expect, it, vi } from 'vitest';
import type { FoodLog, Profile } from '@/context/CaloraContext';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { buildDailyIntelligenceFacts } from '@/lib/intelligence/facts';
import { selectVisibleLocalInsight, selectVisibleTodayInsight } from '@/lib/intelligence/insightDelivery';
import { selectContextualInsight } from '@/lib/intelligence/insightSelector';
import { selectPostLogInsight } from '@/lib/intelligence/postLogSelector';
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

function facts(logs: FoodLog[], profileValue: Profile | null = profile, weights: { id: string; date: string; kg: number; source: 'manual' | 'health' }[] = []): IntelligenceFact[] {
  return buildDailyIntelligenceFacts(createIntelligenceContext({
    logs, profile: profileValue, weights, waterLogs: {}, moodLogs: {},
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

  it('delivers only an eligible fresh result after hydration and clears it on reset', () => {
    const activeFacts = facts([log({ calories: 2100 })]);

    expect(selectVisibleLocalInsight(activeFacts, { hydrated: true, enabled: true })).toMatchObject({
      state: 'active',
      type: 'calorie_status',
    });
    expect(selectVisibleLocalInsight(activeFacts, { hydrated: false, enabled: true })).toBeNull();
    expect(selectVisibleLocalInsight(activeFacts, { hydrated: true, enabled: false })).toBeNull();
    expect(selectVisibleLocalInsight([], { hydrated: true, enabled: true })).toBeNull();
  });

  it('withholds stale or mixed-watermark snapshots at the visible delivery gate', () => {
    const activeFacts = facts([log({ calories: 2100 })]);
    const staleFacts = activeFacts.map((fact) => ({ ...fact, freshness: 'stale' as const }));
    const mixedFacts = [...activeFacts, {
      ...activeFacts[0],
      sourceWatermark: { ...activeFacts[0].sourceWatermark, value: 'different' },
    }];

    expect(selectVisibleLocalInsight(staleFacts, { hydrated: true, enabled: true })).toBeNull();
    expect(selectVisibleLocalInsight(mixedFacts, { hydrated: true, enabled: true })).toBeNull();
  });

  it('recomputes delivery from current facts after food is added and deleted', () => {
    const before = facts([log({ calories: 400 })]);
    const afterAdd = facts([log({ calories: 2100 })]);
    const afterDelete = facts([]);

    expect(selectVisibleLocalInsight(before, { hydrated: true, enabled: true })).toMatchObject({
      type: 'meal_distribution',
      state: 'active',
    });
    expect(selectVisibleLocalInsight(afterAdd, { hydrated: true, enabled: true })).toMatchObject({
      type: 'calorie_status',
      state: 'active',
    });
    expect(selectVisibleLocalInsight(afterDelete, { hydrated: true, enabled: true })).toBeNull();
  });

  it('fails closed when a malformed fact snapshot reaches the optional delivery gate', () => {
    const malformed = facts([log({ calories: 2100 })]).map((fact) => ({
      ...fact,
      evidence: undefined,
    })) as unknown as IntelligenceFact[];

    expect(selectVisibleLocalInsight(malformed, { hydrated: true, enabled: true })).toBeNull();
  });

  it('keeps Today and Progress canonical selection consistent for actionable current-day facts', () => {
    const input = facts([log({ calories: 2100 })]);
    const progress = selectVisibleLocalInsight(input, { hydrated: true, enabled: true });
    const today = selectVisibleTodayInsight(input, { hydrated: true, enabled: true });

    expect(today).toEqual(progress);
    expect(today).toMatchObject({ type: 'calorie_status', state: 'active' });
  });

  it('suppresses Progress-only descriptive weight context from Today without storing a fallback', () => {
    const input = facts([], profile, [{ id: 'weight-1', date: '2026-08-20', kg: 80, source: 'manual' }])
      .filter((fact) => fact.factType === 'weight.baselines');

    expect(selectVisibleLocalInsight(input, { hydrated: true, enabled: true })).toMatchObject({
      type: 'weight_baseline',
      state: 'active',
    });
    expect(selectVisibleTodayInsight(input, { hydrated: true, enabled: true })).toBeNull();
  });

  it('keeps Today delivery hydration-, flag-, and malformed-input-safe', () => {
    const input = facts([log({ calories: 2100 })]);
    const malformed = input.map((fact) => ({ ...fact, evidence: undefined })) as unknown as IntelligenceFact[];

    expect(selectVisibleTodayInsight(input, { hydrated: false, enabled: true })).toBeNull();
    expect(selectVisibleTodayInsight(input, { hydrated: true, enabled: false })).toBeNull();
    expect(selectVisibleTodayInsight(malformed, { hydrated: true, enabled: true })).toBeNull();
  });

  it('recomputes Today from current local facts after an add and deletion', () => {
    const before = facts([log({ calories: 400 })]);
    const afterAdd = facts([log({ calories: 2100 })]);
    const afterDelete = facts([]);

    expect(selectVisibleTodayInsight(before, { hydrated: true, enabled: true })).toMatchObject({
      type: 'meal_distribution',
      state: 'active',
    });
    expect(selectVisibleTodayInsight(afterAdd, { hydrated: true, enabled: true })).toMatchObject({
      type: 'calorie_status',
      state: 'active',
    });
    expect(selectVisibleTodayInsight(afterDelete, { hydrated: true, enabled: true })).toBeNull();
  });

  it('clears Today during guest hydration and recomputes only from the next account facts', () => {
    const userA = facts([log({ calories: 2100 })]);
    const userB = facts([], { ...profile, name: 'Different account', calorieTarget: 1800 });

    expect(selectVisibleTodayInsight(userA, { hydrated: true, enabled: true })).toMatchObject({
      type: 'calorie_status',
    });
    expect(selectVisibleTodayInsight(userA, { hydrated: false, enabled: true })).toBeNull();
    expect(selectVisibleTodayInsight(userB, { hydrated: true, enabled: true })).toBeNull();
    expect(selectVisibleTodayInsight(userA, { hydrated: true, enabled: true })).toMatchObject({
      type: 'calorie_status',
    });
  });

  it('selects deterministic material Post-Log transitions and rejects ordinary changes', () => {
    const options = (calories: number, meal = 'Breakfast') => ({
      hydrated: true, enabled: true, accountScopeMatches: true, currentDay: true, addedCalories: calories, addedMeal: meal,
    });
    expect(selectPostLogInsight(
      facts([log({ calories: 1800 })]),
      facts([log({ calories: 1800 }), log({ id: 'added', meal: 'Dinner', calories: 250 })]),
      options(250, 'Dinner'),
    )).toMatchObject({ transitionType: 'calorie_target_reached', category: 'calorie_status' });
    expect(selectPostLogInsight(
      facts([log({ calories: 1000, protein: 50 })]),
      facts([log({ calories: 1000, protein: 50 }), log({ id: 'protein', meal: 'Lunch', calories: 200, protein: 30 })]),
      options(200, 'Lunch'),
    )).toMatchObject({ transitionType: 'protein_recovery', category: 'macro_balance' });
    expect(selectPostLogInsight(
      facts([log({ calories: 400 }), log({ id: 'lunch', meal: 'Lunch', calories: 600 })]),
      facts([log({ calories: 400 }), log({ id: 'lunch', meal: 'Lunch', calories: 600 }), log({ id: 'breakfast-2', calories: 600 })]),
      options(600),
    )).toMatchObject({ transitionType: 'meal_concentration', category: 'meal_distribution' });
    expect(selectPostLogInsight(
      facts([log({ calories: 400 })]),
      facts([log({ calories: 400 }), log({ id: 'lunch', meal: 'Lunch', calories: 300 })]),
      options(300, 'Lunch'),
    )).toMatchObject({ transitionType: 'logging_completeness' });
    expect(selectPostLogInsight(
      facts([log({ calories: 1000 })]),
      facts([log({ calories: 1000 }), log({ id: 'small', calories: 50 })]),
      options(50),
    )).toBeNull();
  });

  it('fails closed for Post-Log hydration, flag, scope, stale, malformed, and unchanged facts', () => {
    const before = facts([log({ calories: 1800 })]);
    const after = facts([log({ calories: 1800 }), log({ id: 'added', calories: 250 })]);
    const options = { hydrated: true, enabled: true, accountScopeMatches: true, currentDay: true, addedCalories: 250, addedMeal: 'Breakfast' };
    expect(selectPostLogInsight(before, after, { ...options, hydrated: false })).toBeNull();
    expect(selectPostLogInsight(before, after, { ...options, enabled: false })).toBeNull();
    expect(selectPostLogInsight(before, after, { ...options, accountScopeMatches: false })).toBeNull();
    expect(selectPostLogInsight(before, before, options)).toBeNull();
    expect(selectPostLogInsight(before.map((fact) => ({ ...fact, freshness: 'stale' as const })), after, options)).toBeNull();
    expect(selectPostLogInsight(before as unknown as IntelligenceFact[], after.map((fact) => ({ ...fact, evidence: undefined })) as unknown as IntelligenceFact[], options)).toBeNull();
    expect(JSON.stringify(selectPostLogInsight(before, after, options))).not.toContain('food-1');
  });
});