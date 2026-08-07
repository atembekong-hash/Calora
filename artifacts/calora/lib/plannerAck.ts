import type { PlannerMeal } from '@workspace/api-client-react';

/**
 * A pending plain-save acknowledgment set by the Recipes screen when a recipe
 * fills an empty planner slot (no displaced meal).  Carrying the `mealId`
 * allows the Planner to guard against showing a stale banner when the
 * referenced meal is no longer present in `plannerMeals`.
 */
export type PlannerAck = {
  /** Human-readable message to display in the save notice. */
  message: string;
  /** ID of the PlannerMeal that was just added — used for staleness check. */
  mealId: string;
};

/**
 * Determine the message to display when the Planner tab regains focus.
 *
 * Returns the ack message when the referenced meal still exists in
 * `plannerMeals`, and `null` when the ack is absent or the meal has since
 * been removed (e.g. by a concurrent `clearAllData`).  The caller should
 * always clear `pendingPlannerAck` in the context regardless of the return
 * value so the ack is consumed exactly once.
 *
 * @param ack         The pending acknowledgment from context (may be null).
 * @param plannerMeals Current list of planner meals to validate against.
 * @returns The message string to show, or null if the ack should be silently dropped.
 */
export function consumePlannerAck(
  ack: PlannerAck | null,
  plannerMeals: PlannerMeal[],
): string | null {
  if (!ack) return null;
  if (!plannerMeals.some((m) => m.id === ack.mealId)) return null;
  return ack.message;
}
