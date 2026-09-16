/**
 * Tests for the Replace-with-Recipe flow.
 *
 * Both replace paths are exported production functions from data/planner.ts.
 * Any regression in those functions will break these tests.
 *
 *  • applySlotReplace  – slot-based filter then insert (Browse recipes path)
 *  • applyIdentityReplace – id-based map (catalog Replace sheet path)
 */

import { describe, expect, it } from 'vitest';
import { applySlotReplace, applyIdentityReplace } from '@/data/planner';
import type { PlannerMeal } from '@workspace/api-client-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMeal(overrides: Partial<PlannerMeal> & { id: string }): PlannerMeal {
  return {
    day: '2026-08-10',
    meal: 'Dinner',
    name: overrides.id,
    image: '',
    serving: '1 serving',
    calories: 500,
    proteinG: 30,
    carbsG: 50,
    fatG: 15,
    ingredients: [],
    description: '',
    ...overrides,
  };
}

/** Count meals occupying a specific (day, mealType) slot. */
function countInSlot(meals: PlannerMeal[], day: string, mealType: PlannerMeal['meal']): number {
  return meals.filter((m) => m.day === day && m.meal === mealType).length;
}

/** Assert no slot in the list contains more than one meal. */
function assertNoDuplicateSlots(meals: PlannerMeal[]) {
  const counts = new Map<string, number>();
  for (const m of meals) {
    const key = `${m.day}-${m.meal}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [slot, count] of counts) {
    expect(count, `slot ${slot} contains ${count} meals`).toBe(1);
  }
}

// ---------------------------------------------------------------------------
// applySlotReplace – slot-based replace (Browse recipes path)
// ---------------------------------------------------------------------------

describe('applySlotReplace – Browse recipes confirmation', () => {
  it('replaces the existing meal in the slot and leaves no duplicate', () => {
    const existing = makeMeal({ id: 'old-dinner', day: '2026-08-10', meal: 'Dinner' });
    const other = makeMeal({ id: 'lunch', day: '2026-08-10', meal: 'Lunch' });
    const newMeal = makeMeal({ id: 'new-dinner', day: '2026-08-10', meal: 'Dinner' });

    const result = applySlotReplace([existing, other], '2026-08-10', 'Dinner', newMeal);

    expect(countInSlot(result, '2026-08-10', 'Dinner')).toBe(1);
    expect(result.find((m) => m.id === 'new-dinner')).toBeTruthy();
    expect(result.find((m) => m.id === 'old-dinner')).toBeUndefined();
    assertNoDuplicateSlots(result);
  });

  it('inserts into an empty slot without duplicating existing meals', () => {
    const other = makeMeal({ id: 'lunch', day: '2026-08-10', meal: 'Lunch' });
    const newMeal = makeMeal({ id: 'new-dinner', day: '2026-08-10', meal: 'Dinner' });

    const result = applySlotReplace([other], '2026-08-10', 'Dinner', newMeal);

    expect(countInSlot(result, '2026-08-10', 'Dinner')).toBe(1);
    expect(countInSlot(result, '2026-08-10', 'Lunch')).toBe(1);
    assertNoDuplicateSlots(result);
  });

  it('only affects the targeted slot across a multi-day week', () => {
    const tueDinner = makeMeal({ id: 'tue-dinner', day: '2026-08-11', meal: 'Dinner' });
    const monDinner = makeMeal({ id: 'mon-dinner', day: '2026-08-10', meal: 'Dinner' });
    const newMeal = makeMeal({ id: 'new-mon-dinner', day: '2026-08-10', meal: 'Dinner' });

    const result = applySlotReplace([monDinner, tueDinner], '2026-08-10', 'Dinner', newMeal);

    // Monday Dinner replaced
    expect(countInSlot(result, '2026-08-10', 'Dinner')).toBe(1);
    expect(result.find((m) => m.id === 'new-mon-dinner')).toBeTruthy();
    // Tuesday Dinner untouched
    expect(countInSlot(result, '2026-08-11', 'Dinner')).toBe(1);
    expect(result.find((m) => m.id === 'tue-dinner')).toBeTruthy();
    assertNoDuplicateSlots(result);
  });

  /**
   * Edge case: the user opens the plan picker inside the recipe detail and
   * changes the day before tapping confirm.  planDay/planMealType now differ
   * from the original recipeSlotTarget.  The new recipe goes into the new
   * slot; the original meal is left unchanged.  No slot ends up with two
   * meals.
   */
  it('picker changed to a different day – no slot contains a duplicate', () => {
    const originalSlotMeal = makeMeal({ id: 'mon-dinner', day: '2026-08-10', meal: 'Dinner' });
    const existingTueDinner = makeMeal({ id: 'tue-dinner', day: '2026-08-11', meal: 'Dinner' });
    const newMeal = makeMeal({ id: 'new-recipe', day: '2026-08-11', meal: 'Dinner' });

    // planDay/planMealType reflect the picker change (now Tuesday)
    const result = applySlotReplace([originalSlotMeal, existingTueDinner], '2026-08-11', 'Dinner', newMeal);

    // New recipe lands in the picker-chosen slot
    expect(countInSlot(result, '2026-08-11', 'Dinner')).toBe(1);
    expect(result.find((m) => m.id === 'new-recipe')).toBeTruthy();
    // Original Monday slot is untouched — not silently removed
    expect(countInSlot(result, '2026-08-10', 'Dinner')).toBe(1);
    expect(result.find((m) => m.id === 'mon-dinner')).toBeTruthy();
    assertNoDuplicateSlots(result);
  });

  it('picker changed to a different meal type on the same day – no slot contains a duplicate', () => {
    const monDinner = makeMeal({ id: 'mon-dinner', day: '2026-08-10', meal: 'Dinner' });
    const monLunch = makeMeal({ id: 'mon-lunch', day: '2026-08-10', meal: 'Lunch' });
    const newMeal = makeMeal({ id: 'new-recipe', day: '2026-08-10', meal: 'Lunch' });

    // Original slot was Dinner; user switched picker to Lunch
    const result = applySlotReplace([monDinner, monLunch], '2026-08-10', 'Lunch', newMeal);

    expect(countInSlot(result, '2026-08-10', 'Lunch')).toBe(1);
    expect(result.find((m) => m.id === 'new-recipe')).toBeTruthy();
    expect(countInSlot(result, '2026-08-10', 'Dinner')).toBe(1);
    assertNoDuplicateSlots(result);
  });
});

// ---------------------------------------------------------------------------
// applyIdentityReplace – identity-based replace (catalog Replace sheet path)
// ---------------------------------------------------------------------------

describe('applyIdentityReplace – catalog Replace sheet', () => {
  it('swaps the target meal by id and leaves no duplicate', () => {
    const target = makeMeal({ id: 'old-dinner', day: '2026-08-10', meal: 'Dinner' });
    const other = makeMeal({ id: 'lunch', day: '2026-08-10', meal: 'Lunch' });
    const next = makeMeal({ id: 'catalog-dinner', day: '2026-08-10', meal: 'Dinner', name: 'Grilled Salmon' });

    const result = applyIdentityReplace([target, other], next, target);

    expect(countInSlot(result, '2026-08-10', 'Dinner')).toBe(1);
    const replaced = result.find((m) => m.id === 'old-dinner');
    expect(replaced?.name).toBe('Grilled Salmon');
    // Catalog id must be overwritten with target.id
    expect(result.find((m) => m.id === 'catalog-dinner')).toBeUndefined();
    assertNoDuplicateSlots(result);
  });

  it('preserves the target day even when the incoming meal carries a different day', () => {
    const target = makeMeal({ id: 'mon-dinner', day: '2026-08-10', meal: 'Dinner' });
    // catalog items have an empty day in plannerCatalog — simulate that
    const next = makeMeal({ id: 'catalog-item', day: '', meal: 'Dinner', name: 'Steak Bowl' });

    const result = applyIdentityReplace([target], next, target);

    const entry = result.find((m) => m.id === 'mon-dinner');
    expect(entry?.day).toBe('2026-08-10');
    expect(entry?.name).toBe('Steak Bowl');
  });

  it('leaves all other meals untouched', () => {
    const target = makeMeal({ id: 'replace-me', day: '2026-08-10', meal: 'Dinner' });
    const bystander1 = makeMeal({ id: 'breakfast', day: '2026-08-10', meal: 'Breakfast' });
    const bystander2 = makeMeal({ id: 'tue-dinner', day: '2026-08-11', meal: 'Dinner' });
    const next = makeMeal({ id: 'catalog', day: '2026-08-10', meal: 'Dinner', name: 'Pasta' });

    const result = applyIdentityReplace([target, bystander1, bystander2], next, target);

    expect(result).toHaveLength(3);
    expect(result.find((m) => m.id === 'breakfast')).toBeTruthy();
    expect(result.find((m) => m.id === 'tue-dinner')).toBeTruthy();
    assertNoDuplicateSlots(result);
  });
});
