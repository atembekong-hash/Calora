import type {
  InvalidationReason,
  IntelligenceFactFamily,
  InsightInvalidationEvent,
  SourceWatermark,
} from './types';

const AFFECTED_FACTS: Record<InvalidationReason, IntelligenceFactFamily[]> = {
  food_added: ['daily_nutrition', 'meal_distribution', 'logging_completeness', 'nutrition_seven_day_coverage', 'nutrition_seven_day_macro_record_coverage'],
  food_updated: ['daily_nutrition', 'meal_distribution', 'logging_completeness', 'nutrition_seven_day_coverage', 'nutrition_seven_day_macro_record_coverage'],
  food_deleted: ['daily_nutrition', 'meal_distribution', 'logging_completeness', 'nutrition_seven_day_coverage', 'nutrition_seven_day_macro_record_coverage'],
  // No implemented fact consumes profile.goal yet.
  goal_changed: [],
  target_changed: ['daily_nutrition'],
  weight_changed: ['weight_baselines', 'weight_short_trend'],
  timezone_changed: ['daily_nutrition', 'meal_distribution', 'logging_completeness', 'weight_short_trend', 'nutrition_seven_day_coverage', 'nutrition_seven_day_macro_record_coverage'],
  day_boundary_changed: ['daily_nutrition', 'meal_distribution', 'logging_completeness', 'weight_short_trend', 'nutrition_seven_day_coverage', 'nutrition_seven_day_macro_record_coverage'],
  fact_relevant_preference_changed: [],
  planner_changed: [],
  source_refreshed: ['daily_nutrition', 'meal_distribution', 'logging_completeness', 'weight_baselines', 'weight_short_trend', 'nutrition_seven_day_coverage', 'nutrition_seven_day_macro_record_coverage'],
};

export function affectedFactFamilies(reason: InvalidationReason): IntelligenceFactFamily[] {
  return [...AFFECTED_FACTS[reason]];
}

export function shouldInvalidateFacts(reason: InvalidationReason): boolean {
  return affectedFactFamilies(reason).length > 0;
}

export function createInvalidationEvent(
  reason: InvalidationReason,
  previousWatermark?: SourceWatermark,
  nextWatermark?: SourceWatermark,
  occurredAt = new Date().toISOString(),
): InsightInvalidationEvent {
  const affected = affectedFactFamilies(reason);
  return {
    reason,
    occurredAt,
    previousWatermark,
    nextWatermark,
    affectedFactFamilies: affected,
    requiresRecomputation: affected.length > 0,
  };
}