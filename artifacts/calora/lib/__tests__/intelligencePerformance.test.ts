import { describe, expect, it } from 'vitest';
import type { FoodLog, Profile } from '@/context/CaloraContext';
import { confidenceForEvidence } from '@/lib/intelligence/confidence';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { collectEvidence } from '@/lib/intelligence/evidence';
import { buildDailyIntelligenceFacts, createSourceWatermark } from '@/lib/intelligence/facts';
import { selectContextualInsight } from '@/lib/intelligence/insightSelector';
import { selectPostLogInsight } from '@/lib/intelligence/postLogSelector';
import { calculateWeightShortTrend } from '@/lib/intelligence/weightTrend';
import { calculateNutritionSevenDayCoverage } from '@/lib/intelligence/nutritionCoverage';

const profile: Profile = {
  name: 'Performance', goal: 'maintain', activity: 'moderate', diet: 'Everything',
  heightCm: 170, weightKg: 70, targetWeightKg: 70, age: 30, calorieTarget: 2000,
};
const logs: FoodLog[] = Array.from({ length: 100 }, (_, index) => ({
  id: `performance-${index}`, name: 'Food', date: '2026-08-20', meal: index % 2 ? 'Lunch' : 'Breakfast',
  calories: 100, protein: 8, carbs: 10, fat: 4, source: index % 3 ? 'USDA verified' : 'Photo estimate',
  confidence: 80, time: '12:00', serving: '1',
}));
const state = {
  logs, profile, weights: [], waterLogs: {}, moodLogs: {}, activityLogs: {}, activityMinutesLogs: {},
  plannerMeals: [], shoppingItems: [], localRecipes: [],
};

function averageMs(operation: () => unknown, iterations = 100): number {
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) operation();
  return Number(((performance.now() - started) / iterations).toFixed(4));
}

describe('Intelligence Foundation local performance', () => {
  it('records repeatable local-only operation samples', () => {
    const adapted = createIntelligenceContext(state, { date: '2026-08-20', timezone: 'America/New_York' });
    const evidence = collectEvidence(logs);
    const beforeAdapted = createIntelligenceContext({ ...state, logs: logs.slice(0, -1) }, { date: '2026-08-20', timezone: 'America/New_York' });
    const beforeFacts = buildDailyIntelligenceFacts(beforeAdapted);
    const afterFacts = buildDailyIntelligenceFacts(adapted);
    const samples = {
      contextAdaptationMs: averageMs(() => createIntelligenceContext(state, { date: '2026-08-20', timezone: 'America/New_York' })),
      evidencePartitioningMs: averageMs(() => collectEvidence(logs)),
      confidenceComputationMs: averageMs(() => confidenceForEvidence(evidence, [])),
      watermarkGenerationMs: averageMs(() => createSourceWatermark(adapted)),
      factGenerationMs: averageMs(() => buildDailyIntelligenceFacts(adapted)),
      insightSelectionMs: averageMs(() => selectContextualInsight(buildDailyIntelligenceFacts(adapted))),
      postLogTransitionMs: averageMs(() => selectPostLogInsight(beforeFacts, afterFacts, {
        hydrated: true, enabled: true, accountScopeMatches: true, currentDay: true, addedCalories: 100, addedMeal: 'Lunch',
      })),
      weightShortTrendMs: averageMs(() => calculateWeightShortTrend([
        { id: 'trend-1', date: '2026-07-24', kg: 80, source: 'manual' },
        { id: 'trend-2', date: '2026-07-30', kg: 80, source: 'manual' },
        { id: 'trend-3', date: '2026-08-08', kg: 79.4, source: 'manual' },
        { id: 'trend-4', date: '2026-08-20', kg: 79.2, source: 'manual' },
      ], '2026-08-20', 'America/New_York')),
      nutritionCoverageMs: averageMs(() => calculateNutritionSevenDayCoverage(logs, '2026-08-20', 'America/New_York')),
    };
    console.info('[intelligence-performance]', JSON.stringify(samples));
    expect(Object.values(samples).every((sample) => Number.isFinite(sample) && sample >= 0)).toBe(true);
  });
});