import { describe, expect, it } from 'vitest';
import type { FoodLog, Profile, WeightEntry } from '@/context/CaloraContext';
import { confidenceForEvidence } from '@/lib/intelligence/confidence';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { collectEvidence } from '@/lib/intelligence/evidence';
import { intelligenceFeatureFlags } from '@/lib/intelligence/featureFlags';
import { buildDailyIntelligenceFacts, createSourceWatermark } from '@/lib/intelligence/facts';
import { affectedFactFamilies, createInvalidationEvent } from '@/lib/intelligence/invalidation';
import { measureIntelligenceOperation, setIntelligenceObserver } from '@/lib/intelligence/observability';

const profile: Profile = {
  name: 'Hardening', goal: 'lose', activity: 'moderate', diet: 'Everything',
  heightCm: 170, weightKg: 80, targetWeightKg: 70, age: 30, calorieTarget: 2000,
};

function log(source: FoodLog['source'] = 'USDA verified', overrides: Partial<FoodLog> = {}): FoodLog {
  return {
    id: `log-${source}-${overrides.id ?? '1'}`, name: 'Food', date: '2026-08-20', meal: 'Breakfast',
    calories: 400, protein: 20, carbs: 40, fat: 12, source, confidence: 90, time: '08:00', serving: '1',
    ...overrides,
  };
}

function context(logs: FoodLog[] = [], overrides: Partial<Parameters<typeof createIntelligenceContext>[0]> = {}) {
  return createIntelligenceContext({
    logs, profile, weights: [], waterLogs: {}, moodLogs: {}, activityLogs: {}, activityMinutesLogs: {},
    plannerMeals: [], shoppingItems: [], localRecipes: [], ...overrides,
  }, { date: '2026-08-20', timezone: 'America/New_York' });
}

function dailyValue(logs: FoodLog[], factType: string, options: Partial<Parameters<typeof createIntelligenceContext>[0]> = {}) {
  return buildDailyIntelligenceFacts(context(logs, options)).find((fact) => fact.factType === factType);
}

describe('Intelligence Phase 1.5 hardening', () => {
  it('covers representative deterministic parity cases', () => {
    expect(dailyValue([], 'daily.calorie_target', { profile: null })?.value).toBe(2000);
    expect(dailyValue([], 'daily.calorie_target')?.value).toBe(2000);
    expect(dailyValue([log()], 'daily.calories_consumed')?.value).toBe(400);
    expect(dailyValue(Array.from({ length: 25 }, (_, index) => log('USDA verified', { id: `${index}`, calories: 100 })), 'daily.calories_consumed')?.value).toBe(2500);
    expect(dailyValue([log('Manual', { protein: Number.NaN })], 'daily.calories_consumed')?.missingData).toContain('missing_macros');
    expect(dailyValue([log('Photo estimate'), log('Recipe')], 'daily.calories_consumed')?.confidence).toBe('low');
    expect(dailyValue([log('Barcode verified'), log('USDA verified')], 'daily.calories_consumed')?.confidence).toBe('high');
    expect(dailyValue([log('Manual'), log('USDA verified')], 'daily.calories_consumed')?.confidence).toBe('medium');
    expect(dailyValue([log('USDA verified', { id: 'edit', calories: 600 })], 'daily.calories_consumed')?.value).toBe(600);
    expect(dailyValue([], 'daily.calories_consumed')?.value).toBe(0);
    expect(dailyValue([log()], 'daily.calories_remaining', { activeEnergyKcal: 250 })?.value).toBe(1850);
  });

  it('preserves mixed provenance and exercises every confidence category', () => {
    const mixed = collectEvidence([log('USDA verified'), log('Manual'), log('Photo estimate'), log('Recipe')]);
    expect(mixed.map((entry) => entry.origin)).toEqual(['ai_estimate', 'manual', 'provider', 'recipe_estimate']);
    expect(confidenceForEvidence([], [])).toBe('insufficient');
    expect(confidenceForEvidence(collectEvidence([log('USDA verified')]), [])).toBe('high');
    expect(confidenceForEvidence(collectEvidence([log('Manual'), log('USDA verified')]), [])).toBe('medium');
    expect(confidenceForEvidence(collectEvidence([log('Photo estimate'), log('Recipe')]), [])).toBe('low');
    expect(confidenceForEvidence(collectEvidence([log('Legacy' as FoodLog['source'])]), ['unknown_provenance'])).toBe('insufficient');
  });

  it('classifies invalidation precisely and keeps negative cases stable', () => {
    expect(affectedFactFamilies('food_added')).toEqual(['daily_nutrition', 'meal_distribution', 'logging_completeness']);
    expect(affectedFactFamilies('target_changed')).toEqual(['daily_nutrition']);
    expect(affectedFactFamilies('weight_changed')).toEqual(['weight_baselines']);
    expect(affectedFactFamilies('goal_changed')).toEqual([]);
    expect(affectedFactFamilies('planner_changed')).toEqual([]);
    expect(affectedFactFamilies('fact_relevant_preference_changed')).toEqual([]);
    expect(createInvalidationEvent('planner_changed')).toMatchObject({ requiresRecomputation: false });
    expect(createInvalidationEvent('food_deleted')).toMatchObject({ requiresRecomputation: true });

    const baseline = context([log()]);
    const unrelated = context([log(), log('Manual', { id: 'old', date: '2026-08-01' })]);
    expect(createSourceWatermark(baseline).value).toBe(createSourceWatermark(unrelated).value);
    expect(createSourceWatermark(baseline).value).not.toBe(createSourceWatermark(context([log('Manual')])).value);
  });

  it('proves add, edit, delete, target, weight, and goal transitions against watermarks', () => {
    const empty = context([]);
    const added = context([log('USDA verified', { id: 'added', calories: 300 })]);
    const edited = context([log('USDA verified', { id: 'added', calories: 450 })]);
    const deleted = context([]);
    expect(createSourceWatermark(empty).value).not.toBe(createSourceWatermark(added).value);
    expect(dailyValue([log('USDA verified', { id: 'added', calories: 300 })], 'daily.calories_consumed')?.value).toBe(300);
    expect(createSourceWatermark(added).value).not.toBe(createSourceWatermark(edited).value);
    expect(dailyValue([log('USDA verified', { id: 'added', calories: 450 })], 'daily.calories_consumed')?.value).toBe(450);
    expect(createSourceWatermark(edited).value).not.toBe(createSourceWatermark(deleted).value);
    expect(createSourceWatermark(empty).value).toBe(createSourceWatermark(deleted).value);

    const changedTarget = context([log()], { profile: { ...profile, calorieTarget: 2100 } });
    expect(createSourceWatermark(context([log()])).value).not.toBe(createSourceWatermark(changedTarget).value);
    const changedWeight = context([log()], { weights: [{ id: 'weight', date: '2026-08-20', kg: 79, source: 'manual' }] });
    expect(createSourceWatermark(context([log()])).value).not.toBe(createSourceWatermark(changedWeight).value);
    const changedGoal = context([log()], { profile: { ...profile, goal: 'gain' } });
    expect(createSourceWatermark(context([log()])).value).toBe(createSourceWatermark(changedGoal).value);
  });

  it('keeps baseline difference explicit and day boundaries meaningful', () => {
    const weights: WeightEntry[] = [{ id: 'first', date: '2026-08-01', kg: 78, source: 'manual' }, { id: 'last', date: '2026-08-20', kg: 76, source: 'manual' }];
    const facts = buildDailyIntelligenceFacts(context([log()], { weights }));
    expect(facts.find((fact) => fact.factType === 'weight.baselines')?.value).toMatchObject({
      firstLoggedWeightKg: 78, profileBaselineWeightKg: 80, coachWeightChangeKg: -4,
    });
    expect(createSourceWatermark(context([log()])).value).not.toBe(
      createSourceWatermark(createIntelligenceContext({
        logs: [log()], profile, weights: [], waterLogs: {}, moodLogs: {}, activityLogs: {}, activityMinutesLogs: {},
        plannerMeals: [], shoppingItems: [], localRecipes: [],
      }, { date: '2026-08-21', timezone: 'America/New_York' })).value,
    );
  });

  it('is local-only, observer-safe, and measures pure operations', () => {
    const original = log('Manual', { notes: 'private note', imageUrl: 'sensitive://photo' });
    const observed: unknown[] = [];
    setIntelligenceObserver((event) => observed.push(event));
    const result = buildDailyIntelligenceFacts(context([original]));
    setIntelligenceObserver(null);
    expect(result).toHaveLength(18);
    expect(original.notes).toBe('private note');
    expect(JSON.stringify(observed)).not.toContain('private note');
    expect(JSON.stringify(observed)).not.toContain('sensitive://photo');
    expect(measureIntelligenceOperation('fact_generation', () => 1, (() => { let value = 0; return () => ++value; })()).sample.durationMs).toBe(1);
  });

  it('keeps every visible delivery switch off and Foundation disconnected from UI', () => {
    expect(intelligenceFeatureFlags['intelligence.foundation.enabled']).toBe(true);
    expect(intelligenceFeatureFlags['intelligence.facts.local_adapter']).toBe(true);
    for (const flag of [
      'intelligence.facts.server_adapter',
      'intelligence.insights.today',
      'intelligence.insights.post_log',
      'intelligence.insights.progress',
      'intelligence.coach.fact_context',
      'intelligence.evidence.display',
      'intelligence.feedback',
      'intelligence.proactive',
    ] as const) expect(intelligenceFeatureFlags[flag]).toBe(false);
  });
});