import { describe, expect, it } from 'vitest';
import { buildShoppingItems, plannerDate } from '@/data/planner';
import type { PlannerMeal } from '@workspace/api-client-react';

const meal = (id: string, ingredients: string[], day = '2026-08-06'): PlannerMeal => ({
  id,
  day,
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

describe('buildShoppingItems — day attribution', () => {
  it('lists a single day when the ingredient appears in only one day', () => {
    const items = buildShoppingItems([
      meal('m1', ['olive oil'], '2026-08-04'),
      meal('m2', ['olive oil'], '2026-08-04'),
    ]);
    const oil = items.find((i) => i.name === 'olive oil');
    expect(oil?.days).toEqual(['2026-08-04']);
  });

  it('lists multiple days in calendar order when the ingredient appears across different days', () => {
    const items = buildShoppingItems([
      meal('m-wed', ['salmon'], '2026-08-05'),
      meal('m-fri', ['salmon'], '2026-08-07'),
      meal('m-mon', ['salmon'], '2026-08-03'),
    ]);
    const salmon = items.find((i) => i.name === 'salmon');
    expect(salmon?.days).toEqual(['2026-08-03', '2026-08-05', '2026-08-07']);
  });

  it('deduplicates when the same day has multiple meals sharing an ingredient', () => {
    const items = buildShoppingItems([
      meal('breakfast', ['eggs'], '2026-08-04'),
      meal('lunch', ['eggs'], '2026-08-04'),
      meal('dinner', ['eggs'], '2026-08-04'),
    ]);
    const eggs = items.find((i) => i.name === 'eggs');
    expect(eggs?.days).toEqual(['2026-08-04']);
  });

  it('lists all 7 days when the ingredient appears in every day of the week', () => {
    const weekDays = [
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ];
    const meals = weekDays.map((day, i) => meal(`m${i}`, ['brown rice'], day));
    const items = buildShoppingItems(meals);
    const rice = items.find((i) => i.name === 'brown rice');
    expect(rice?.days).toEqual(weekDays);
  });

  it('returns an empty days array when a meal has no day set', () => {
    const noDay: PlannerMeal = {
      id: 'undated',
      day: '',
      meal: 'Lunch',
      name: 'undated',
      image: '',
      serving: '1 serving',
      calories: 300,
      proteinG: 15,
      carbsG: 30,
      fatG: 10,
      ingredients: ['lentils'],
      description: '',
    };
    const items = buildShoppingItems([noDay]);
    const lentils = items.find((i) => i.name === 'lentils');
    expect(lentils?.days).toEqual([]);
  });

  it('returns an empty list without crashing when no meals are planned', () => {
    const items = buildShoppingItems([]);
    expect(items).toEqual([]);
  });

  it('counts quantity correctly when the same ingredient appears across multiple days', () => {
    const items = buildShoppingItems([
      meal('m1', ['garlic'], '2026-08-03'),
      meal('m2', ['garlic'], '2026-08-05'),
      meal('m3', ['garlic'], '2026-08-07'),
    ]);
    const garlic = items.find((i) => i.name === 'garlic');
    expect(garlic?.quantity).toBe(3);
    expect(garlic?.days).toHaveLength(3);
  });
});