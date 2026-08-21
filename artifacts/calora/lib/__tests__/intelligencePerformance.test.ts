import { describe, expect, it } from 'vitest';
import type { FoodLog, Profile } from '@/context/CaloraContext';
import { confidenceForEvidence } from '@/lib/intelligence/confidence';
import { createIntelligenceContext } from '@/lib/intelligence/contextAdapter';
import { collectEvidence } from '@/lib/intelligence/evidence';
import { buildDailyIntelligenceFacts, createSourceWatermark } from '@/lib/intelligence/facts';
import { selectContextualInsight } from '@/lib/intelligence/insightSelector';

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
    const samples = {
      contextAdaptationMs: averageMs(() => createIntelligenceContext(state, { date: '2026-08-20', timezone: 'America/New_York' })),
      evidencePartitioningMs: averageMs(() => collectEvidence(logs)),
      confidenceComputationMs: averageMs(() => confidenceForEvidence(evidence, [])),
      watermarkGenerationMs: averageMs(() => createSourceWatermark(adapted)),
      factGenerationMs: averageMs(() => buildDailyIntelligenceFacts(adapted)),
      insightSelectionMs: averageMs(() => selectContextualInsight(buildDailyIntelligenceFacts(adapted))),
    };
    console.info('[intelligence-performance]', JSON.stringify(samples));
    expect(Object.values(samples).every((sample) => Number.isFinite(sample) && sample >= 0)).toBe(true);
  });
});