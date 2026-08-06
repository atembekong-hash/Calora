import { describe, expect, it } from 'vitest';
import { buildShoppingItems, plannerDate } from '@/data/planner';
import type { PlannerMeal } from '@workspace/api-client-react';

const meal = (id: string, ingredients: string[]): PlannerMeal => ({
  id,
  day: '2026-08-06',
  meal: 'Dinner',
  name: id,
  image: '',
  serving: '1 serving',
  calories: 400,
  proteinG: 20,
  carbsG: 40,
  fatG: 12,
  ingredients,
  description: '',
});

describe('planner identity', () => {
  it('keeps shopping IDs stable across meal reorder and ingredient casing', () => {
    const first = buildShoppingItems([meal('meal-a', ['Tomato', 'olive oil']), meal('meal-b', [' tomato '])]);
    const second = buildShoppingItems([meal('meal-b', ['TOMATO']), meal('meal-a', ['olive oil', 'tomato'])]);

    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(first.find((item) => item.name.toLowerCase() === 'tomato')?.quantity).toBe(2);
  });

  it('preserves local calendar week dates', () => {
    expect(plannerDate('2026-08-03', 6)).toBe('2026-08-09');
  });
});