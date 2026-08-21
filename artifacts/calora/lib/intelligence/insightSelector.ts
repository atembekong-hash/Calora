import type {
  ContextualInsight,
  ContextualInsightCategory,
  ContextualInsightEvidenceClass,
  IntelligenceEvidence,
  IntelligenceFact,
  InsightConfidence,
} from './types';

type NumericFact = IntelligenceFact & { value: number };
type RecordFact = IntelligenceFact & { value: Record<string, number | string | boolean | null> };

const ACTIVE_CONFIDENCE: readonly InsightConfidence[] = ['high', 'medium'];

function factByType(facts: readonly IntelligenceFact[], factType: string): IntelligenceFact | undefined {
  return facts.find((fact) => fact.factType === factType);
}

function numericFact(facts: readonly IntelligenceFact[], factType: string): NumericFact | undefined {
  const fact = factByType(facts, factType);
  return fact && typeof fact.value === 'number' ? fact as NumericFact : undefined;
}

function recordFact(facts: readonly IntelligenceFact[], factType: string): RecordFact | undefined {
  const fact = factByType(facts, factType);
  return fact && typeof fact.value === 'object' && fact.value !== null && !Array.isArray(fact.value)
    ? fact as RecordFact
    : undefined;
}

function references(facts: readonly IntelligenceFact[]) {
  return facts.map((fact) => ({
    id: fact.id,
    factType: fact.factType,
    sourceWatermark: fact.sourceWatermark.value,
  }));
}

function evidenceFor(facts: readonly IntelligenceFact[]): ContextualInsightEvidenceClass[] {
  return facts.flatMap((fact) => fact.evidence.map(({ origin, quality, count }) => ({
    origin, quality, count,
  })));
}

function inactive(
  state: ContextualInsight['state'],
  generatedAt: string,
  reason: string,
  facts: readonly IntelligenceFact[] = [],
): ContextualInsight {
  const confidence = state === 'low_confidence' ? 'low' : state === 'insufficient_data' ? 'insufficient' : 'insufficient';
  return {
    id: `contextual:none:${state}`,
    type: 'none',
    category: null,
    priority: null,
    title: null,
    message: null,
    supportingFacts: references(facts),
    evidence: evidenceFor(facts),
    confidence,
    freshness: state === 'stale' ? 'stale' : facts[0]?.freshness ?? 'unknown',
    state,
    reason,
    generatedAt,
    expiresAt: null,
  };
}

function active(
  category: ContextualInsightCategory,
  priority: number,
  title: string,
  message: string,
  facts: readonly IntelligenceFact[],
  generatedAt: string,
): ContextualInsight {
  const confidence = facts.some((fact) => fact.confidence === 'medium') ? 'medium' : 'high';
  return {
    id: `contextual:${category}:${facts.map((fact) => fact.sourceWatermark.value).join(':')}`,
    type: category,
    category,
    priority,
    title,
    message,
    supportingFacts: references(facts),
    evidence: evidenceFor(facts),
    confidence,
    freshness: 'fresh',
    state: 'active',
    reason: null,
    generatedAt,
    expiresAt: null,
  };
}

/**
 * Select one local, deterministic, current-day contextual insight.
 *
 * This module is deliberately side-effect free: it consumes already-derived
 * Foundation facts and performs no I/O, network activity, persistence,
 * analytics, logging, or UI work.
 */
export function selectContextualInsight(
  facts: readonly IntelligenceFact[],
  options: { generatedAt?: string; includeWeightTrend?: boolean; includeNutritionCoverage?: boolean } = {},
): ContextualInsight {
  const generatedAt = options.generatedAt ?? facts[0]?.generatedAt ?? '';
  if (!facts.length) return inactive('insufficient_data', generatedAt, 'no_facts');
  if (facts.some((fact) => fact.freshness !== 'fresh')) {
    return inactive('stale', generatedAt, 'facts_not_fresh', facts);
  }

  const watermarkGroups = new Map<string, Set<string>>();
  for (const fact of facts) {
    const windowKey = `${fact.timeWindow.start}:${fact.timeWindow.end}:${fact.timeWindow.timezone}:${fact.timeWindow.dayBoundary}`;
    const group = watermarkGroups.get(windowKey) ?? new Set<string>();
    group.add(fact.sourceWatermark.value);
    watermarkGroups.set(windowKey, group);
  }
  if ([...watermarkGroups.values()].some((watermarks) => watermarks.size !== 1)) {
    return inactive('stale', generatedAt, 'mixed_watermarks', facts);
  }

  const usable = facts.filter((fact) => ACTIVE_CONFIDENCE.includes(fact.confidence));
  if (!usable.length) {
    const confidence = facts.some((fact) => fact.confidence === 'low') ? 'low_confidence' : 'insufficient_data';
    return inactive(confidence, generatedAt, 'confidence_gate', facts);
  }

  const calories = numericFact(facts, 'daily.calories_consumed');
  const calorieTarget = numericFact(facts, 'daily.calorie_target');
  if (calories && calorieTarget && ACTIVE_CONFIDENCE.includes(calories.confidence) && ACTIVE_CONFIDENCE.includes(calorieTarget.confidence) && calorieTarget.value > 0) {
    const ratio = calories.value / calorieTarget.value;
    if (ratio >= 1) {
      return active('calorie_status', 400, 'Daily calorie target reached', `${Math.round(calories.value)} of ${Math.round(calorieTarget.value)} kcal logged today.`, [calories, calorieTarget], generatedAt);
    }
  }

  const protein = numericFact(facts, 'daily.protein_consumed');
  const proteinTarget = numericFact(facts, 'daily.protein_target');
  if (calories && calorieTarget && protein && proteinTarget
    && [calories, calorieTarget, protein, proteinTarget].every((fact) => ACTIVE_CONFIDENCE.includes(fact.confidence))
    && calories.value / calorieTarget.value >= 0.5
    && proteinTarget.value > 0
    && protein.value / proteinTarget.value < 0.5) {
    return active('macro_balance', 300, 'Protein is trailing today', `${Math.round(protein.value)} of ${Math.round(proteinTarget.value)} g logged while more than half of daily calories are logged.`, [protein, proteinTarget, calories, calorieTarget], generatedAt);
  }

  const meals = ['breakfast', 'lunch', 'dinner', 'snack']
    .map((meal) => recordFact(facts, `meal.${meal}.distribution`))
    .filter((fact): fact is RecordFact => Boolean(fact));
  const concentratedMeal = meals.find((fact) => Number(fact.value.percentageOfDailyCalories) >= 60 && ACTIVE_CONFIDENCE.includes(fact.confidence));
  if (concentratedMeal) {
    const meal = concentratedMeal.factType.split('.')[1];
    return active('meal_distribution', 200, 'Most logged calories are in one meal', `${Math.round(Number(concentratedMeal.value.percentageOfDailyCalories))}% of today’s logged calories are in ${meal}.`, [concentratedMeal], generatedAt);
  }

  const trend = recordFact(facts, 'weight.short_trend');
  if (options.includeWeightTrend && trend && ACTIVE_CONFIDENCE.includes(trend.confidence)
    && (trend.value.direction === 'up' || trend.value.direction === 'down' || trend.value.direction === 'stable')
    && typeof trend.value.windowDays === 'number') {
    const copy = trend.value.direction === 'up'
      ? 'Across your logged 28-day comparison window, recorded weight was higher in recent entries.'
      : trend.value.direction === 'down'
        ? 'Across your logged 28-day comparison window, recorded weight was lower in recent entries.'
        : 'Across your logged 28-day comparison window, recorded weight was broadly stable.';
    return active('weight_trend', 150, 'Recent logged weight pattern', copy, [trend], generatedAt);
  }
  const coverage = recordFact(facts, 'nutrition.seven_day_coverage');
  if (options.includeNutritionCoverage && coverage && ACTIVE_CONFIDENCE.includes(coverage.confidence)
    && coverage.value.state === 'eligible'
    && coverage.value.windowDays === 7
    && typeof coverage.value.loggedDayCount === 'number'
    && Number.isInteger(coverage.value.loggedDayCount)
    && coverage.value.loggedDayCount >= 3
    && coverage.value.loggedDayCount <= 7) {
    return active(
      'nutrition_coverage',
      125,
      'Recent nutrition record coverage',
      `Nutrition logged on ${coverage.value.loggedDayCount} of the last 7 local-calendar days.`,
      [coverage],
      generatedAt,
    );
  }
  const completeness = recordFact(facts, 'daily.logging_completeness');
  if (completeness && completeness.value.state === 'no_logs') {
    return inactive('insufficient_data', generatedAt, 'no_logged_meals', [completeness]);
  }

  const weights = recordFact(facts, 'weight.baselines');
  if (weights && ACTIVE_CONFIDENCE.includes(weights.confidence)
    && typeof weights.value.latestWeightKg === 'number'
    && typeof weights.value.firstLoggedWeightKg === 'number') {
    return active('weight_baseline', 100, 'Weight baseline available', 'A current weight and first logged baseline are available locally.', [weights], generatedAt);
  }

  return inactive('no_insight', generatedAt, 'no_priority_condition', facts);
}