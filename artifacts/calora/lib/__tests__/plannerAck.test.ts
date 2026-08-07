import { describe, expect, it } from 'vitest';
import { consumePlannerAck, type PlannerAck } from '@/lib/plannerAck';
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
