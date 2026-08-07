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

/**
 * A pending recipe-swap undo set by the Recipes screen when a recipe replaces
 * an existing planned meal. Carrying both meal references allows the Planner
 * to guard against showing a stale undo banner when either referenced meal has
 * since been removed (e.g. by a concurrent `clearAllData`).
 */
export type UndoSwap = {
  newMeal: PlannerMeal;
  originalMeal: PlannerMeal;
};

/**
 * Validate a pending swap-undo before the Planner shows the undo banner.
 *
 * Returns the swap object when both `newMeal.id` and `originalMeal.id` still
 * exist in `plannerMeals`, and `null` when the swap is absent or either
 * referenced meal has since been removed.  The caller should always clear
 * `pendingUndoSwap` in the context regardless of the return value so the swap
 * is consumed exactly once.
 *
 * @param swap         The pending swap from context (may be null).
 * @param plannerMeals Current list of planner meals to validate against.
 * @returns The swap object when both meals are present, or null to silently drop.
 */
export function consumeUndoSwap(
  swap: UndoSwap | null,
  plannerMeals: PlannerMeal[],
): UndoSwap | null {
  if (!swap) return null;
  // After a normal swap, `originalMeal` has been removed from the plan and
  // `newMeal` now occupies the slot — only `newMeal.id` must still be present.
  // The stale case is when `clearAllData` (or any other removal) has also
  // evicted `newMeal`, leaving nothing to undo against.
  if (!plannerMeals.some((m) => m.id === swap.newMeal.id)) return null;
  return swap;
}
