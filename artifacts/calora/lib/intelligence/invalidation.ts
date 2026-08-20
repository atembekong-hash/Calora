import type {
  InvalidationReason,
  InsightInvalidationEvent,
  SourceWatermark,
} from './types';

const FACT_INPUT_REASONS = new Set<InvalidationReason>([
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
]);

export function shouldInvalidateFacts(reason: InvalidationReason): boolean {
  return FACT_INPUT_REASONS.has(reason);
}

export function createInvalidationEvent(
  reason: InvalidationReason,
  previousWatermark?: SourceWatermark,
  nextWatermark?: SourceWatermark,
  occurredAt = new Date().toISOString(),
): InsightInvalidationEvent {
  return { reason, occurredAt, previousWatermark, nextWatermark };
}