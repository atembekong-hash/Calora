import type { FoodLog, MealType } from '@/context/CaloraContext';
import { confidenceForEvidence } from './confidence';
import { collectEvidence } from './evidence';
import { evidenceOriginForLog } from './evidence';
import { intelligenceFeatureFlags } from './featureFlags';
import { reportIntelligenceEvent } from './observability';
import { measureIntelligenceOperation } from './observability';
import type {
  IntelligenceContext,
  IntelligenceEvidence,
  IntelligenceFact,
  MissingDataKind,
  SourceWatermark,
} from './types';
import { INTELLIGENCE_CALCULATION_VERSION } from './types';
import { getCoachWeightChangeKg, getFirstLoggedWeight, getLatestLoggedWeight, getProfileBaselineWeight } from './weightMetrics';

const MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type NutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  hasFiber: boolean;
  hasSugar: boolean;
  hasSodium: boolean;
};

function finite(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
}

function totalsFor(logs: readonly FoodLog[]): NutritionTotals {
  return logs.reduce<NutritionTotals>((totals, log) => ({
    calories: totals.calories + finite(log.calories),
    protein: totals.protein + finite(log.protein),
    carbs: totals.carbs + finite(log.carbs),
    fat: totals.fat + finite(log.fat),
    fiber: totals.fiber + finite(log.fiber),
    sugar: totals.sugar + finite(log.sugar),
    sodium: totals.sodium + finite(log.sodium),
    hasFiber: totals.hasFiber || Number.isFinite(log.fiber),
    hasSugar: totals.hasSugar || Number.isFinite(log.sugar),
    hasSodium: totals.hasSodium || Number.isFinite(log.sodium),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, hasFiber: false, hasSugar: false, hasSodium: false });
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createSourceWatermark(context: IntelligenceContext): SourceWatermark {
  return measureIntelligenceOperation<SourceWatermark>('watermark_generation', () => {
    const relevant = {
      date: context.date,
      timezone: context.timezone,
      dayBoundary: context.dayBoundary,
      profile: context.profile ? {
        calorieTarget: context.profile.calorieTarget,
        weightKg: context.profile.weightKg,
        targetWeightKg: context.profile.targetWeightKg,
      } : null,
      logs: context.foodLogs
        .filter((log) => log.date === context.date)
        .map((log) => [log.id, log.date, log.meal, log.calories, log.protein, log.carbs, log.fat, log.fiber, log.sugar, log.sodium, log.source, log.confidence, log.memoryId ?? ''])
        .sort((left, right) => String(left[0]).localeCompare(String(right[0]))),
      weights: context.weights.map((weight) => [weight.id, weight.date, weight.kg, weight.source]),
      activeEnergyKcal: context.activeEnergyKcal,
    };
    return { value: `fnv1a-v1:${fnv1a(JSON.stringify(relevant))}`, algorithm: 'fnv1a-v1', inputVersion: 1 };
  }).value;
}

function dayMissingData(context: IntelligenceContext, dayLogs: readonly FoodLog[]): MissingDataKind[] {
  const missing = [...context.missingData];
  if (!dayLogs.length) missing.push('incomplete_day');
  if (dayLogs.some((log) => !Number.isFinite(log.protein) || !Number.isFinite(log.carbs) || !Number.isFinite(log.fat))) {
    missing.push('missing_macros');
  }
  if (dayLogs.some((log) => evidenceOriginForLog(log) === 'unknown')) missing.push('unknown_provenance');
  return [...new Set(missing)];
}

function fact(
  context: IntelligenceContext,
  watermark: SourceWatermark,
  generatedAt: string,
  factType: string,
  value: IntelligenceFact['value'],
  unit: string | null,
  evidence: IntelligenceEvidence[],
  missingData: MissingDataKind[],
): IntelligenceFact {
  return {
    id: `${INTELLIGENCE_CALCULATION_VERSION}:${context.date}:${factType}`,
    factType,
    value,
    unit,
    timeWindow: {
      start: context.date,
      end: context.date,
      timezone: context.timezone,
      dayBoundary: context.dayBoundary,
    },
    generatedAt,
    validFrom: generatedAt,
    validUntil: null,
    calculationVersion: INTELLIGENCE_CALCULATION_VERSION,
    sourceWatermark: watermark,
    confidence: confidenceForEvidence(evidence, missingData),
    evidence,
    freshness: 'fresh',
    missingData,
  };
}

export function buildDailyIntelligenceFacts(
  context: IntelligenceContext,
  options: { generatedAt?: string } = {},
): IntelligenceFact[] {
  return measureIntelligenceOperation('fact_generation', () => {
  const startedAt = Date.now();
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const dayLogs = context.foodLogs.filter((log) => log.date === context.date);
  const totals = totalsFor(dayLogs);
  const evidence = collectEvidence(dayLogs);
  const missingData = dayMissingData(context, dayLogs);
  const watermark = createSourceWatermark(context);
  // Preserve Today's existing fallback without making this layer profile-authoritative.
  const calorieTarget = finite(context.profile?.calorieTarget ?? 2000);
  const proteinTarget = calorieTarget ? Math.round((calorieTarget * 0.26) / 4) : 0;
  const carbsTarget = calorieTarget ? Math.round((calorieTarget * 0.44) / 4) : 0;
  const fatTarget = calorieTarget ? Math.round((calorieTarget * 0.3) / 9) : 0;
  const facts: IntelligenceFact[] = [
    fact(context, watermark, generatedAt, 'daily.calories_consumed', totals.calories, 'kcal', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.calorie_target', calorieTarget, 'kcal', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.calories_remaining', Math.max(0, calorieTarget - totals.calories + (context.activeEnergyKcal ?? 0)), 'kcal', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.protein_consumed', totals.protein, 'g', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.protein_target', proteinTarget, 'g', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.protein_remaining', Math.max(0, proteinTarget - totals.protein), 'g', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.carbohydrates_consumed', totals.carbs, 'g', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.carbohydrates_target', carbsTarget, 'g', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.carbohydrates_remaining', Math.max(0, carbsTarget - totals.carbs), 'g', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.fat_consumed', totals.fat, 'g', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.fat_target', fatTarget, 'g', evidence, missingData),
    fact(context, watermark, generatedAt, 'daily.fat_remaining', Math.max(0, fatTarget - totals.fat), 'g', evidence, missingData),
  ];
  if (totals.hasFiber) facts.push(fact(context, watermark, generatedAt, 'daily.fiber_consumed', totals.fiber, 'g', evidence, missingData));
  if (totals.hasSugar) facts.push(fact(context, watermark, generatedAt, 'daily.sugar_consumed', totals.sugar, 'g', evidence, missingData));
  if (totals.hasSodium) facts.push(fact(context, watermark, generatedAt, 'daily.sodium_consumed', totals.sodium, 'mg', evidence, missingData));

  for (const meal of MEALS) {
    const mealLogs = dayLogs.filter((log) => log.meal === meal);
    const mealTotals = totalsFor(mealLogs);
    const mealEvidence = collectEvidence(mealLogs);
    const mealMissing = dayMissingData(context, mealLogs);
    facts.push(fact(
      context,
      watermark,
      generatedAt,
      `meal.${meal.toLowerCase()}.distribution`,
      {
        calories: mealTotals.calories,
        percentageOfDailyCalories: totals.calories > 0 ? Number(((mealTotals.calories / totals.calories) * 100).toFixed(1)) : 0,
        logCount: mealLogs.length,
        state: mealLogs.length ? 'logged' : 'not_logged',
      },
      'kcal',
      mealEvidence,
      mealMissing,
    ));
  }

  const distinctMeals = new Set(dayLogs.map((log) => log.meal)).size;
  facts.push(fact(
    context,
    watermark,
    generatedAt,
    'daily.logging_completeness',
    {
      logCount: dayLogs.length,
      mealSlotsLogged: distinctMeals,
      state: dayLogs.length ? 'partially_logged' : 'no_logs',
    },
    null,
    evidence,
    missingData,
  ));

  const latest = getLatestLoggedWeight(context.weights);
  const first = getFirstLoggedWeight(context.weights);
  const profileBaseline = getProfileBaselineWeight(context.profile, context.weights);
  facts.push(fact(
    context,
    watermark,
    generatedAt,
    'weight.baselines',
    {
      latestWeightKg: latest,
      firstLoggedWeightKg: first,
      profileBaselineWeightKg: profileBaseline,
      coachWeightChangeKg: getCoachWeightChangeKg(context.profile, context.weights),
    },
    'kg',
    [{ origin: 'derived', quality: 'moderate', count: context.weights.length, logIds: context.weights.map((weight) => weight.id) }],
    context.weights.length ? [] : ['missing_weight'],
  ));

  const confidenceCounts = facts.reduce<Partial<Record<IntelligenceFact['confidence'], number>>>((counts, item) => {
    counts[item.confidence] = (counts[item.confidence] ?? 0) + 1;
    return counts;
  }, {});
  const evidenceCounts = evidence.reduce<Partial<Record<IntelligenceEvidence['origin'], number>>>((counts, item) => {
    counts[item.origin] = item.count;
    return counts;
  }, {});
  reportIntelligenceEvent({
    kind: 'facts_generated',
    calculationVersion: INTELLIGENCE_CALCULATION_VERSION,
    sourceWatermark: watermark.value,
    durationMs: Date.now() - startedAt,
    confidenceCounts,
    evidenceCounts,
    missingData,
  });
    return facts;
  }).value;
}

export const intelligenceFoundationEnabled =
  intelligenceFeatureFlags['intelligence.foundation.enabled']
  && intelligenceFeatureFlags['intelligence.facts.local_adapter'];