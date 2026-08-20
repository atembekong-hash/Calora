import { describe, expect, it } from 'vitest';
import type { FoodLog, Profile, WeightEntry } from '@/context/CaloraContext';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { evidenceOriginForLog } from '@/lib/intelligence/evidence';
import { intelligenceFeatureFlags } from '@/lib/intelligence/featureFlags';
import { buildDailyIntelligenceFacts, createSourceWatermark } from '@/lib/intelligence/facts';
import { createInvalidationEvent, shouldInvalidateFacts } from '@/lib/intelligence/invalidation';
import {
  getCoachWeightChangeKg,
  getInsightsWeightDeltaKg,
} from '@/lib/intelligence/weightMetrics';

const profile: Profile = {
  name: 'Alex',
  goal: 'lose',
  activity: 'moderate',
  diet: 'Everything',
  heightCm: 172,
  weightKg: 80,
  targetWeightKg: 70,
  age: 31,
  calorieTarget: 2000,
};

function log(overrides: Partial<FoodLog> = {}): FoodLog {
  return {
    id: 'food-1',
    name: 'Breakfast',
    date: '2026-08-20',
    meal: 'Breakfast',
    calories: 400,
    protein: 20,
    carbs: 40,
    fat: 12,
    source: 'USDA verified',
    confidence: 95,
    time: '08:00',
    serving: '1 bowl',
    ...overrides,
  };
}

function contextFor(logs: FoodLog[], profileValue: Profile | null = profile) {
  return createIntelligenceContext({
    logs,
    profile: profileValue,
    weights: [],
    waterLogs: {},
    moodLogs: {},
    activityLogs: {},
    activityMinutesLogs: {},
    plannerMeals: [],
    shoppingItems: [],
    localRecipes: [],
  }, { date: '2026-08-20', timezone: 'America/New_York' });
}

function factValue(facts: ReturnType<typeof buildDailyIntelligenceFacts>, type: string) {
  return facts.find((item) => item.factType === type)?.value;
}

describe('Intelligence Foundation', () => {
  it('matches current Today nutrition totals and targets without changing display logic', () => {
    const facts = buildDailyIntelligenceFacts(contextFor([
      log(),
      log({ id: 'food-2', meal: 'Lunch', calories: 510, protein: 38, carbs: 34, fat: 25 }),
    ]), { generatedAt: '2026-08-20T12:00:00.000Z' });

    expect(factValue(facts, 'daily.calories_consumed')).toBe(910);
    expect(factValue(facts, 'daily.protein_consumed')).toBe(58);
    expect(factValue(facts, 'daily.carbohydrates_consumed')).toBe(74);
    expect(factValue(facts, 'daily.fat_consumed')).toBe(37);
    expect(factValue(facts, 'daily.calorie_target')).toBe(2000);
    expect(factValue(facts, 'daily.calories_remaining')).toBe(1090);
    expect(factValue(facts, 'daily.protein_target')).toBe(130);
    expect(factValue(facts, 'daily.carbohydrates_target')).toBe(220);
    expect(factValue(facts, 'daily.fat_target')).toBe(67);
  });

  it('keeps estimated and provider evidence distinct through aggregation', () => {
    const facts = buildDailyIntelligenceFacts(contextFor([
      log({ id: 'provider', source: 'Barcode verified' }),
      log({ id: 'estimate', source: 'Photo estimate' }),
      log({ id: 'recipe', source: 'Recipe' }),
      log({ id: 'manual', source: 'Manual' }),
    ]));
    const calories = facts.find((item) => item.factType === 'daily.calories_consumed');

    expect(calories?.evidence.map((item) => item.origin)).toEqual([
      'ai_estimate',
      'barcode',
      'manual',
      'recipe_estimate',
    ]);
    expect(calories?.evidence.find((item) => item.origin === 'ai_estimate')?.quality).toBe('estimated');
    expect(calories?.evidence.find((item) => item.origin === 'barcode')?.quality).toBe('strong');
    expect(evidenceOriginForLog(log({ source: 'Photo estimate' }))).toBe('ai_estimate');
  });

  it('marks unlogged meals as not_logged rather than logged zero', () => {
    const facts = buildDailyIntelligenceFacts(contextFor([log()]));
    expect(factValue(facts, 'meal.lunch.distribution')).toMatchObject({
      calories: 0,
      logCount: 0,
      state: 'not_logged',
    });
  });

  it('uses stable watermarks and changes them when relevant inputs change', () => {
    const initial = contextFor([log()]);
    const repeated = contextFor([log()]);
    const changed = contextFor([log({ calories: 401 })]);

    expect(createSourceWatermark(initial).value).toBe(createSourceWatermark(repeated).value);
    expect(createSourceWatermark(initial).value).not.toBe(createSourceWatermark(changed).value);
  });

  it('does not invalidate a daily fact for irrelevant past logs or planner rows', () => {
    const initial = contextFor([log()]);
    const unrelatedPastLog = createIntelligenceContext({
      logs: [log(), log({ id: 'past', date: '2026-08-19', calories: 900 })],
      profile,
      weights: [],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      activityMinutesLogs: {},
      plannerMeals: [{ id: 'unrelated-plan', day: '2026-08-19', meal: 'Dinner', name: 'Dinner' }],
      shoppingItems: [],
      localRecipes: [],
    }, { date: '2026-08-20', timezone: 'America/New_York' });

    expect(createSourceWatermark(initial).value).toBe(createSourceWatermark(unrelatedPastLog).value);
  });

  it('treats unknown source provenance as insufficient confidence', () => {
    const facts = buildDailyIntelligenceFacts(contextFor([log({ source: 'Legacy import' as FoodLog['source'] })]));
    const calories = facts.find((item) => item.factType === 'daily.calories_consumed');
    expect(calories?.missingData).toContain('unknown_provenance');
    expect(calories?.confidence).toBe('insufficient');
  });

  it('matches Today remaining-calorie arithmetic when active health energy is supplied', () => {
    const context = createIntelligenceContext({
      logs: [log()],
      profile,
      weights: [],
      waterLogs: {},
      moodLogs: {},
      activityLogs: {},
      activityMinutesLogs: {},
      plannerMeals: [],
      shoppingItems: [],
      localRecipes: [],
      activeEnergyKcal: 250,
    }, { date: '2026-08-20', timezone: 'America/New_York' });
    expect(factValue(buildDailyIntelligenceFacts(context), 'daily.calories_remaining')).toBe(1850);
  });

  it('covers every declared facts invalidation path', () => {
    const reasons = [
      'food_added',
      'food_updated',
      'food_deleted',
      'goal_changed',
      'target_changed',
      'weight_changed',
      'timezone_changed',
      'preference_changed',
      'planner_changed',
      'source_refreshed',
      'day_boundary_changed',
    ] as const;
    for (const reason of reasons) {
      expect(shouldInvalidateFacts(reason)).toBe(true);
      expect(createInvalidationEvent(reason, undefined, undefined, '2026-08-20T00:00:00.000Z')).toMatchObject({
        reason,
        occurredAt: '2026-08-20T00:00:00.000Z',
      });
    }
  });

  it('keeps all visible delivery flags disabled', () => {
    expect(intelligenceFeatureFlags['intelligence.foundation.enabled']).toBe(true);
    expect(intelligenceFeatureFlags['intelligence.facts.local_adapter']).toBe(true);
    expect(intelligenceFeatureFlags['intelligence.facts.server_adapter']).toBe(false);
    expect(intelligenceFeatureFlags['intelligence.insights.today']).toBe(false);
    expect(intelligenceFeatureFlags['intelligence.insights.post_log']).toBe(false);
    expect(intelligenceFeatureFlags['intelligence.insights.progress']).toBe(false);
    expect(intelligenceFeatureFlags['intelligence.coach.fact_context']).toBe(false);
    expect(intelligenceFeatureFlags['intelligence.evidence.display']).toBe(false);
    expect(intelligenceFeatureFlags['intelligence.feedback']).toBe(false);
    expect(intelligenceFeatureFlags['intelligence.proactive']).toBe(false);
  });

  it('keeps Coach and Insights baseline semantics explicitly distinct', () => {
    const weights: WeightEntry[] = [
      { id: 'first', date: '2026-08-01', kg: 78, source: 'manual' },
      { id: 'latest', date: '2026-08-20', kg: 76.4, source: 'manual' },
    ];

    expect(getCoachWeightChangeKg(profile, weights)).toBe(-3.6);
    expect(getInsightsWeightDeltaKg(weights)).toBe(-1.5999999999999943);
  });

  it('stays local and deterministic when no profile or API is available', () => {
    const facts = buildDailyIntelligenceFacts(contextFor([log()], null));
    const target = facts.find((item) => item.factType === 'daily.calorie_target');
    expect(target?.value).toBe(0);
    expect(target?.missingData).toContain('missing_profile');
    expect(target?.missingData).toContain('missing_target');
  });
});