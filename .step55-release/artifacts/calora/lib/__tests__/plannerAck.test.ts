import { describe, expect, it } from 'vitest';
import { consumePlannerAck, consumeUndoSwap, type PlannerAck, type UndoSwap } from '@/lib/plannerAck';
import { applySlotReplace } from '@/data/planner';
import type { PlannerMeal } from '@workspace/api-client-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMeal(id: string): PlannerMeal {
  return {
    id,
    day: '2026-08-10',
    meal: 'Dinner',
    name: `Meal ${id}`,
    image: '',
    serving: '1 serving',
    calories: 400,
    proteinG: 20,
    carbsG: 40,
    fatG: 12,
    ingredients: [],
    description: '',
  };
}

function makeAck(mealId: string, message = 'Salmon added to your dinner plan.'): PlannerAck {
  return { message, mealId };
}

// ---------------------------------------------------------------------------
// consumePlannerAck
// ---------------------------------------------------------------------------

describe('consumePlannerAck — null ack', () => {
  it('returns null when ack is null', () => {
    expect(consumePlannerAck(null, [makeMeal('meal-1')])).toBeNull();
  });

  it('returns null when ack is null and plannerMeals is empty', () => {
    expect(consumePlannerAck(null, [])).toBeNull();
  });
});

describe('consumePlannerAck — meal present', () => {
  it('returns the message when the referenced meal exists in plannerMeals', () => {
    const meal = makeMeal('meal-abc');
    const ack = makeAck('meal-abc', 'Pasta added to your lunch plan.');
    expect(consumePlannerAck(ack, [meal])).toBe('Pasta added to your lunch plan.');
  });

  it('returns the message when the referenced meal is among several meals', () => {
    const meals = [makeMeal('meal-1'), makeMeal('meal-2'), makeMeal('meal-3')];
    const ack = makeAck('meal-2');
    expect(consumePlannerAck(ack, meals)).toBe(ack.message);
  });
});

describe('consumePlannerAck — stale ack (meal missing)', () => {
  it('returns null when plannerMeals is empty (e.g. after clearAllData)', () => {
    const ack = makeAck('meal-xyz', 'Salmon added to your dinner plan.');
    expect(consumePlannerAck(ack, [])).toBeNull();
  });

  it('returns null when the referenced meal id is not in plannerMeals', () => {
    const meals = [makeMeal('meal-a'), makeMeal('meal-b')];
    const ack = makeAck('meal-gone');
    expect(consumePlannerAck(ack, meals)).toBeNull();
  });

  it('does not match by name — only by id', () => {
    // Meal with same name but different id should not satisfy the ack.
    const unrelatedMeal: PlannerMeal = {
      ...makeMeal('other-id'),
      name: 'Meal meal-target', // same name as the meal the ack targets
    };
    const ack = makeAck('meal-target');
    expect(consumePlannerAck(ack, [unrelatedMeal])).toBeNull();
  });
});

describe('consumePlannerAck — message passthrough', () => {
  it('preserves the exact message string when the meal is present', () => {
    const message = 'Overnight oats added to your breakfast plan.';
    const meal = makeMeal('m-oats');
    const ack: PlannerAck = { message, mealId: 'm-oats' };
    expect(consumePlannerAck(ack, [meal])).toBe(message);
  });
});

describe('consumePlannerAck — add → remove → focus sequence', () => {
  // Simulates the race where the user adds a recipe (ack is set), immediately
  // removes the same meal before returning to the Planner tab, and then the
  // Planner calls consumePlannerAck on focus.  The notice must be suppressed.

  it('returns null when the meal is added then immediately removed before the ack is consumed', () => {
    const mealId = 'meal-added-then-removed';
    const ack = makeAck(mealId, 'Salmon added to your dinner plan.');

    // Step 1: meal exists right after it was added to the plan.
    let plannerMeals: PlannerMeal[] = [makeMeal(mealId), makeMeal('other-meal')];
    // Confirm ack would fire if consumed immediately (sanity check).
    expect(consumePlannerAck(ack, plannerMeals)).toBe(ack.message);

    // Step 2: meal is removed (e.g. via diary or planner edit) while the ack
    // is still in flight (pendingPlannerAck has not been consumed yet).
    plannerMeals = plannerMeals.filter((m) => m.id !== mealId);

    // Step 3: Planner regains focus and calls consumePlannerAck — the notice
    // must be suppressed because the meal is no longer present.
    expect(consumePlannerAck(ack, plannerMeals)).toBeNull();
  });

  it('returns null when the meal is added then all meals are cleared before the ack is consumed', () => {
    const mealId = 'meal-before-clear';
    const ack = makeAck(mealId, 'Pasta added to your lunch plan.');

    // Meal exists in plan (ack set by Recipes screen).
    const plannerMeals: PlannerMeal[] = [makeMeal(mealId)];
    expect(consumePlannerAck(ack, plannerMeals)).toBe(ack.message); // sanity

    // clearAllData fires — plannerMeals is wiped.
    expect(consumePlannerAck(ack, [])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// consumeUndoSwap
// ---------------------------------------------------------------------------

function makeSwap(newId: string, originalId: string): UndoSwap {
  return {
    newMeal: makeMeal(newId),
    originalMeal: makeMeal(originalId),
  };
}

describe('consumeUndoSwap — null swap', () => {
  it('returns null when swap is null', () => {
    expect(consumeUndoSwap(null, [makeMeal('meal-1')])).toBeNull();
  });

  it('returns null when swap is null and plannerMeals is empty', () => {
    expect(consumeUndoSwap(null, [])).toBeNull();
  });
});

describe('consumeUndoSwap — normal post-swap state (newMeal present, originalMeal absent)', () => {
  // After a swap, applySlotReplace removes originalMeal and inserts newMeal.
  // So plannerMeals contains newMeal but NOT originalMeal — this is the
  // expected state when the Undo banner should appear.

  it('returns the swap when newMeal is in plannerMeals and originalMeal is not', () => {
    const swap = makeSwap('new-1', 'orig-1');
    // Only newMeal is present — originalMeal was displaced by the swap.
    const meals = [makeMeal('new-1'), makeMeal('other-unrelated')];
    expect(consumeUndoSwap(swap, meals)).toBe(swap);
  });

  it('returns the swap when newMeal is among several meals and originalMeal is absent', () => {
    const swap = makeSwap('new-abc', 'orig-abc');
    const meals = [makeMeal('other-1'), makeMeal('new-abc'), makeMeal('other-2')];
    expect(consumeUndoSwap(swap, meals)).toBe(swap);
  });
});

describe('consumeUndoSwap — integration with applySlotReplace', () => {
  // Simulate the full recipes → planner handoff: applySlotReplace displaces the
  // original meal, recipes.tsx captures both meals in pendingUndoSwap, and then
  // the Planner consumes the swap on focus.

  it('returns the swap after applySlotReplace (normal swap flow shows Undo)', () => {
    const originalMeal: PlannerMeal = {
      ...makeMeal('orig-slot'),
      day: '2026-08-10',
      meal: 'Dinner',
    };
    const newMeal: PlannerMeal = {
      ...makeMeal('new-slot'),
      day: '2026-08-10',
      meal: 'Dinner',
    };
    const planBefore = [originalMeal, makeMeal('other-breakfast')];
    // applySlotReplace removes originalMeal and inserts newMeal at the same slot.
    const planAfter = applySlotReplace(planBefore, '2026-08-10', 'Dinner', newMeal);
    const swap: UndoSwap = { newMeal, originalMeal };
    // newMeal is in the plan; originalMeal is not — Undo banner should appear.
    expect(consumeUndoSwap(swap, planAfter)).toBe(swap);
  });

  it('returns null after applySlotReplace followed by clearAllData (stale swap suppressed)', () => {
    const originalMeal: PlannerMeal = { ...makeMeal('orig-clear'), day: '2026-08-10', meal: 'Lunch' };
    const newMeal: PlannerMeal = { ...makeMeal('new-clear'), day: '2026-08-10', meal: 'Lunch' };
    const planBefore = [originalMeal];
    const planAfter = applySlotReplace(planBefore, '2026-08-10', 'Lunch', newMeal);
    expect(planAfter.some((m) => m.id === 'new-clear')).toBe(true); // sanity check
    const swap: UndoSwap = { newMeal, originalMeal };
    // clearAllData wipes plannerMeals — newMeal is now gone too.
    expect(consumeUndoSwap(swap, [])).toBeNull();
  });
});

describe('consumeUndoSwap — stale swap (newMeal missing)', () => {
  it('returns null when plannerMeals is empty (e.g. after clearAllData)', () => {
    const swap = makeSwap('new-x', 'orig-x');
    expect(consumeUndoSwap(swap, [])).toBeNull();
  });

  it('returns null when newMeal is missing regardless of what else is in the plan', () => {
    const swap = makeSwap('new-gone', 'orig-irrelevant');
    const meals = [makeMeal('some-other-meal')];
    expect(consumeUndoSwap(swap, meals)).toBeNull();
  });

  it('does not match newMeal by name — only by id', () => {
    const swap = makeSwap('new-target', 'orig-target');
    const meals: PlannerMeal[] = [
      { ...makeMeal('other-id'), name: 'Meal new-target' }, // same name, wrong id
    ];
    expect(consumeUndoSwap(swap, meals)).toBeNull();
  });
});
