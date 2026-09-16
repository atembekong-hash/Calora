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
import { calculateWeightShortTrend } from './weightTrend';
import { calculateNutritionSevenDayCoverage } from './nutritionCoverage';
import { calculateSevenDayMacroRecordCoverage } from './macroRecordCoverage';
import { getMacroTargets } from '@/lib/nutritionGoals';

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
        proteinTargetGrams: context.profile.proteinTargetGrams,
        carbsTargetGrams: context.profile.carbsTargetGrams,
        fatTargetGrams: context.profile.fatTargetGrams,
        targetMode: context.profile.targetMode,
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

function nutritionCoverageWatermark(context: IntelligenceContext, start: string, end: string): SourceWatermark {
  const relevant = {
    start,
    end,
    timezone: context.timezone,
    dayBoundary: context.dayBoundary,
    logs: context.foodLogs
      .filter((log) => log.date >= start && log.date <= end)
      .map((log) => [log.id, log.date])
      .sort((left, right) => String(left[0]).localeCompare(String(right[0]))),
  };
  return { value: `fnv1a-v1:${fnv1a(JSON.stringify(relevant))}`, algorithm: 'fnv1a-v1', inputVersion: 1 };
}

function macroRecordCoverageWatermark(context: IntelligenceContext, start: string, end: string): SourceWatermark {
  const relevant = {
    start,
    end,
    timezone: context.timezone,
    dayBoundary: context.dayBoundary,
    logs: context.foodLogs
      .filter((log) => log.date >= start && log.date <= end)
      .map((log) => [log.id, log.date, log.calories, log.protein, log.carbs, log.fat])
      .sort((left, right) => String(left[0]).localeCompare(String(right[0]))),
  };
  return { value: `fnv1a-v1:${fnv1a(JSON.stringify(relevant))}`, algorithm: 'fnv1a-v1', inputVersion: 1 };
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

function weightTrendFact(
  context: IntelligenceContext,
  watermark: SourceWatermark,
  generatedAt: string,
): IntelligenceFact {
  const trend = calculateWeightShortTrend(context.weights, context.date, context.timezone);
  const evidence: IntelligenceEvidence[] = trend
    ? [{ origin: 'derived', quality: 'moderate', count: trend.entryCount, logIds: [] }]
    : [];
  const missingData: MissingDataKind[] = trend ? [] : ['missing_weight'];
  return {
    id: `${INTELLIGENCE_CALCULATION_VERSION}:${context.date}:weight.short_trend`,
    factType: 'weight.short_trend',
    value: trend
      ? {
        direction: trend.direction,
        deltaKg: trend.deltaKg,
        entryCount: trend.entryCount,
        earlierEntryCount: trend.earlierEntryCount,
        recentEntryCount: trend.recentEntryCount,
        windowDays: 28,
      }
      : { state: 'insufficient' },
    unit: 'kg',
    timeWindow: {
      start: trend?.start ?? context.date,
      end: trend?.end ?? context.date,
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

function nutritionCoverageFact(
  context: IntelligenceContext,
  dailyWatermark: SourceWatermark,
  generatedAt: string,
): IntelligenceFact {
  const coverage = calculateNutritionSevenDayCoverage(context.foodLogs, context.date, context.timezone);
  const start = coverage?.start ?? context.date;
  const watermark = coverage
    ? nutritionCoverageWatermark(context, start, context.date)
    : dailyWatermark;
  const evidence: IntelligenceEvidence[] = coverage
    ? [{ origin: 'derived', quality: 'moderate', count: coverage.qualifyingLogCount, logIds: [] }]
    : [];
  const missingData: MissingDataKind[] = coverage ? [] : ['insufficient_history'];
  return {
    id: `${INTELLIGENCE_CALCULATION_VERSION}:${context.date}:nutrition.seven_day_coverage`,
    factType: 'nutrition.seven_day_coverage',
    value: coverage
      ? { loggedDayCount: coverage.loggedDayCount, windowDays: 7, state: 'eligible' }
      : { state: 'insufficient' },
    unit: null,
    timeWindow: {
      start,
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

function macroRecordCoverageFact(
  context: IntelligenceContext,
  dailyWatermark: SourceWatermark,
  generatedAt: string,
): IntelligenceFact {
  const coverage = calculateSevenDayMacroRecordCoverage(context.foodLogs, context.date, context.timezone);
  const start = coverage?.start ?? context.date;
  const watermark = coverage
    ? macroRecordCoverageWatermark(context, start, context.date)
    : dailyWatermark;
  const evidence: IntelligenceEvidence[] = coverage
    ? [{ origin: 'derived', quality: 'moderate', count: coverage.qualifyingLogCount, logIds: [] }]
    : [];
  const missingData: MissingDataKind[] = coverage ? [] : ['insufficient_history'];
  return {
    id: `${INTELLIGENCE_CALCULATION_VERSION}:${context.date}:nutrition.seven_day_macro_record_coverage`,
    factType: 'nutrition.seven_day_macro_record_coverage',
    value: coverage
      ? { qualifiedDayCount: coverage.qualifiedDayCount, windowDays: 7, state: 'eligible' }
      : { state: 'insufficient' },
    unit: null,
    timeWindow: { start, end: context.date, timezone: context.timezone, dayBoundary: context.dayBoundary },
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
  // nutritionGoals has only a type-only dependency on context, so using the
  // canonical target resolver here does not create a runtime import cycle.
  const targets = getMacroTargets(context.profile);
  const calorieTarget = targets.calories;
  const proteinTarget = targets.protein;
  const carbsTarget = targets.carbs;
  const fatTarget = targets.fat;
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
  facts.push(weightTrendFact(context, watermark, generatedAt));
  facts.push(nutritionCoverageFact(context, watermark, generatedAt));
  facts.push(macroRecordCoverageFact(context, watermark, generatedAt));

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