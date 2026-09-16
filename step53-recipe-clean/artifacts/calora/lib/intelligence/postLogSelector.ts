import type { IntelligenceFact, PostLogInsight, PostLogTransitionType } from './types';

type NumericFact = IntelligenceFact & { value: number };
type RecordFact = IntelligenceFact & { value: Record<string, number | string | boolean | null> };

const ACTIVE_CONFIDENCE = new Set(['high', 'medium']);

function numeric(facts: readonly IntelligenceFact[], type: string): NumericFact | null {
  const fact = facts.find((item) => item.factType === type);
  return fact && typeof fact.value === 'number' ? fact as NumericFact : null;
}

function record(facts: readonly IntelligenceFact[], type: string): RecordFact | null {
  const fact = facts.find((item) => item.factType === type);
  return fact && typeof fact.value === 'object' && fact.value !== null && !Array.isArray(fact.value)
    ? fact as RecordFact
    : null;
}

function validSnapshot(facts: readonly IntelligenceFact[]): boolean {
  if (!facts.length || facts.some((fact) => fact.freshness !== 'fresh')) return false;
  if (facts.some((fact) => !Array.isArray(fact.evidence)
    || !fact.sourceWatermark?.value
    || !fact.factType
    || !fact.id
    || !fact.timeWindow?.timezone)) return false;
  return new Set(facts.map((fact) => fact.sourceWatermark.value)).size === 1
    && facts.some((fact) => ACTIVE_CONFIDENCE.has(fact.confidence));
}

function refs(facts: readonly IntelligenceFact[]) {
  return facts.map((fact) => ({ id: fact.id, factType: fact.factType, sourceWatermark: fact.sourceWatermark.value }));
}

function active(
  transitionType: PostLogTransitionType,
  priority: number,
  title: string,
  message: string,
  before: readonly IntelligenceFact[],
  after: readonly IntelligenceFact[],
): PostLogInsight {
  const supporting = [...before, ...after];
  return {
    id: `post-log:${transitionType}:${after[0]?.sourceWatermark.value ?? 'unknown'}`,
    type: 'post_log',
    transitionType,
    category: transitionType === 'protein_recovery' ? 'macro_balance'
      : transitionType === 'meal_concentration' ? 'meal_distribution'
        : transitionType === 'logging_completeness' ? 'logging_completeness'
          : 'calorie_status',
    priority,
    title,
    message,
    beforeFactRefs: refs(before),
    afterFactRefs: refs(after),
    confidence: supporting.some((fact) => fact.confidence === 'medium') ? 'medium' : 'high',
    freshness: 'fresh',
    reason: 'material_transition',
  };
}

/**
 * Pure, local post-log transition selector. It never does I/O, retains state,
 * or sees raw food text. The caller supplies snapshots around a committed log.
 */
export function selectPostLogInsight(
  before: readonly IntelligenceFact[],
  after: readonly IntelligenceFact[],
  options: {
    hydrated: boolean;
    enabled: boolean;
    accountScopeMatches: boolean;
    currentDay: boolean;
    addedCalories: number;
    addedMeal: string;
  },
): PostLogInsight | null {
  try {
    if (!options.hydrated || !options.enabled || !options.accountScopeMatches || !options.currentDay) return null;
    if (!validSnapshot(before) || !validSnapshot(after)) return null;
    if (before[0]?.sourceWatermark.value === after[0]?.sourceWatermark.value) return null;

    const beforeCalories = numeric(before, 'daily.calories_consumed');
    const afterCalories = numeric(after, 'daily.calories_consumed');
    const target = numeric(after, 'daily.calorie_target');
    if (!beforeCalories || !afterCalories || !target || target.value <= 0) return null;
    if (![beforeCalories, afterCalories, target].every((fact) => ACTIVE_CONFIDENCE.has(fact.confidence))) return null;

    if (beforeCalories.value / target.value < 1 && afterCalories.value / target.value >= 1) {
      return active('calorie_target_reached', 400, 'Daily calorie target reached', 'Your logged total is now at your configured target.', [beforeCalories], [afterCalories, target]);
    }

    const beforeProtein = numeric(before, 'daily.protein_consumed');
    const afterProtein = numeric(after, 'daily.protein_consumed');
    const proteinTarget = numeric(after, 'daily.protein_target');
    if (beforeProtein && afterProtein && proteinTarget && proteinTarget.value > 0
      && [beforeProtein, afterProtein, proteinTarget].every((fact) => ACTIVE_CONFIDENCE.has(fact.confidence))
      && beforeProtein.value / proteinTarget.value < 0.5
      && afterProtein.value / proteinTarget.value >= 0.5
      && afterCalories.value / target.value >= 0.5) {
      return active('protein_recovery', 300, 'Protein is catching up', `You now have ${Math.round(afterProtein.value)} of ${Math.round(proteinTarget.value)} g logged today.`, [beforeProtein], [afterProtein, proteinTarget, afterCalories, target]);
    }

    const mealType = options.addedMeal.toLowerCase();
    const beforeMeal = record(before, `meal.${mealType}.distribution`);
    const afterMeal = record(after, `meal.${mealType}.distribution`);
    if (beforeMeal && afterMeal && ACTIVE_CONFIDENCE.has(afterMeal.confidence)
      && Number(beforeMeal.value.percentageOfDailyCalories) < 60
      && Number(afterMeal.value.percentageOfDailyCalories) >= 60
      && options.addedCalories >= 100
      && options.addedCalories >= target.value * 0.1) {
      return active('meal_concentration', 200, 'Today’s intake shifted toward one meal', `${Math.round(Number(afterMeal.value.percentageOfDailyCalories))}% of today’s logged calories are now in ${mealType}.`, [beforeMeal], [afterMeal]);
    }

    const beforeCompleteness = record(before, 'daily.logging_completeness');
    const afterCompleteness = record(after, 'daily.logging_completeness');
    if (beforeCompleteness && afterCompleteness && ACTIVE_CONFIDENCE.has(afterCompleteness.confidence)
      && Number(beforeCompleteness.value.mealSlotsLogged) < 2
      && Number(afterCompleteness.value.mealSlotsLogged) >= 2
      && Number(afterCompleteness.value.logCount) >= 2) {
      return active('logging_completeness', 100, 'More of today is logged', 'There is now enough recorded data for a stronger daily picture.', [beforeCompleteness], [afterCompleteness]);
    }
    return null;
  } catch {
    return null;
  }
}