import { describe, expect, it } from 'vitest';
import { buildShoppingItems, isProgramGeneratedMeal, mergeGeneratedWeek, plannerCatalogForProgram, plannerDate } from '@/data/planner';
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

// ---------------------------------------------------------------------------
// mergeGeneratedWeek — generation behavior and rebuild preservation
// ---------------------------------------------------------------------------

const weekDays = Array.from({ length: 7 }, (_, i) => plannerDate('2026-08-17', i));
const slotMeal = (id: string, day: string, mealType: PlannerMeal['meal'] = 'Dinner'): PlannerMeal => ({
  ...meal(id, ['ingredient'], day),
  meal: mealType,
});

describe('isProgramGeneratedMeal', () => {
  it('classifies generated and starter meals as program-generated', () => {
    expect(isProgramGeneratedMeal(slotMeal('planner-2026-08-17-berry-oats-0-abc123', '2026-08-17'))).toBe(true);
    expect(isProgramGeneratedMeal(slotMeal('starter-0-Dinner', '2026-08-17'))).toBe(true);
  });

  it('classifies custom, manually added, edited, and recipe meals as user-authored', () => {
    for (const id of ['custom-123', 'planned-123-berry-oats', 'edited-123-planner-x', 'recipe-abc']) {
      expect(isProgramGeneratedMeal(slotMeal(id, '2026-08-17')), id).toBe(false);
    }
  });
});

describe('mergeGeneratedWeek — fill mode (ordinary build)', () => {
  it('keeps every existing meal in the week and only fills empty slots', () => {
    const current = [slotMeal('planner-old', '2026-08-17', 'Dinner')];
    const generated = [
      slotMeal('planner-new-dinner', '2026-08-17', 'Dinner'),
      slotMeal('planner-new-lunch', '2026-08-17', 'Lunch'),
    ];
    const next = mergeGeneratedWeek(current, generated, weekDays, { mode: 'fill' }).meals;
    expect(next.map((m) => m.id).sort()).toEqual(['planner-new-lunch', 'planner-old']);
  });

  it('never touches meals outside the generated week', () => {
    const outside = slotMeal('planner-other-week', '2026-08-10', 'Dinner');
    const next = mergeGeneratedWeek([outside], [slotMeal('planner-new', '2026-08-17', 'Dinner')], weekDays, { mode: 'fill' }).meals;
    expect(next).toContainEqual(outside);
  });

  it('ignores generated meals that fall outside the target week', () => {
    const stray = slotMeal('planner-stray', '2026-09-01', 'Dinner');
    const next = mergeGeneratedWeek([], [stray], weekDays, { mode: 'fill' }).meals;
    expect(next).toEqual([]);
  });
});

describe('mergeGeneratedWeek — no-op merges report zero change so no provenance is recorded', () => {
  const fullWeek = (prefix: string) =>
    weekDays.flatMap((day) => (['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((mealType, i) => slotMeal(`${prefix}-${day}-${i}`, day, mealType)));
  const generatedWeek = () =>
    weekDays.flatMap((day) => (['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((mealType, i) => slotMeal(`planner-new-${day}-${i}`, day, mealType)));

  it('a fill build into a fully occupied starter week inserts nothing', () => {
    const result = mergeGeneratedWeek(fullWeek('starter'), generatedWeek(), weekDays, { mode: 'fill' });
    expect(result.insertedCount).toBe(0);
    expect(result.replacedCount).toBe(0);
    expect(result.meals.map((m) => m.id).sort()).toEqual(fullWeek('starter').map((m) => m.id).sort());
  });

  it('a fill build into a fully custom week inserts nothing', () => {
    const result = mergeGeneratedWeek(fullWeek('custom'), generatedWeek(), weekDays, { mode: 'fill' });
    expect(result.insertedCount).toBe(0);
    expect(result.replacedCount).toBe(0);
  });

  it('a rebuild of a fully user-authored week changes nothing', () => {
    const result = mergeGeneratedWeek(fullWeek('custom'), generatedWeek(), weekDays, { mode: 'rebuild' });
    expect(result.insertedCount).toBe(0);
    expect(result.replacedCount).toBe(0);
    expect(result.meals.map((m) => m.id).sort()).toEqual(fullWeek('custom').map((m) => m.id).sort());
  });

  it('a rebuild that actually replaces meals reports the change', () => {
    const result = mergeGeneratedWeek(fullWeek('starter'), generatedWeek(), weekDays, { mode: 'rebuild' });
    expect(result.replacedCount).toBe(28);
    expect(result.insertedCount).toBe(28);
  });
});

describe('mergeGeneratedWeek — rebuild mode (explicit Program refresh)', () => {
  it('replaces program-generated meals with the fresh generation', () => {
    const current = [slotMeal('planner-old', '2026-08-17', 'Dinner'), slotMeal('starter-0-Lunch', '2026-08-17', 'Lunch')];
    const generated = [
      slotMeal('planner-new-dinner', '2026-08-17', 'Dinner'),
      slotMeal('planner-new-lunch', '2026-08-17', 'Lunch'),
    ];
    const next = mergeGeneratedWeek(current, generated, weekDays, { mode: 'rebuild' }).meals;
    expect(next.map((m) => m.id).sort()).toEqual(['planner-new-dinner', 'planner-new-lunch']);
  });

  it('preserves custom, manually added, and edited meals in their slots', () => {
    const custom = slotMeal('custom-1', '2026-08-17', 'Dinner');
    const planned = slotMeal('planned-2-egg-toast', '2026-08-18', 'Breakfast');
    const edited = slotMeal('edited-3-planner-x', '2026-08-19', 'Lunch');
    const generated = [
      slotMeal('planner-a', '2026-08-17', 'Dinner'),
      slotMeal('planner-b', '2026-08-18', 'Breakfast'),
      slotMeal('planner-c', '2026-08-19', 'Lunch'),
      slotMeal('planner-d', '2026-08-20', 'Snack'),
    ];
    const next = mergeGeneratedWeek([custom, planned, edited], generated, weekDays, { mode: 'rebuild' }).meals;
    expect(next).toContainEqual(custom);
    expect(next).toContainEqual(planned);
    expect(next).toContainEqual(edited);
    // Occupied slots are not double-filled; the open slot is
    expect(next.filter((m) => m.day === '2026-08-17' && m.meal === 'Dinner')).toHaveLength(1);
    expect(next.map((m) => m.id)).toContain('planner-d');
  });

  it('preserves already-logged generated meals passed via protectedIds', () => {
    const logged = slotMeal('planner-logged', '2026-08-17', 'Dinner');
    const next = mergeGeneratedWeek([logged], [slotMeal('planner-new', '2026-08-17', 'Dinner')], weekDays, {
      mode: 'rebuild',
      protectedIds: new Set(['planner-logged']),
    });
    expect(next.meals.map((m) => m.id)).toEqual(['planner-logged']);
    // Nothing changed — callers must not record Program provenance for this.
    expect(next.insertedCount).toBe(0);
    expect(next.replacedCount).toBe(0);
  });

  it('leaves other weeks untouched during a rebuild', () => {
    const pastWeekMeal = slotMeal('planner-past', '2026-08-10', 'Dinner');
    const next = mergeGeneratedWeek([pastWeekMeal], [slotMeal('planner-new', '2026-08-17', 'Dinner')], weekDays, { mode: 'rebuild' }).meals;
    expect(next).toContainEqual(pastWeekMeal);
  });
});

describe('planner identity', () => {
  it('keeps shopping IDs stable across meal reorder and ingredient casing', () => {
    const first = buildShoppingItems([meal('meal-a', ['Tomato', 'olive oil']), meal('meal-b', [' tomato '])]);
    const second = buildShoppingItems([meal('meal-b', ['TOMATO']), meal('meal-a', ['olive oil', 'tomato'])]);

    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
    expect(first.find((item) => item.name.toLowerCase() === 'tomato')?.quantity).toBe(2);
  });

  it('restores checked state from a differently-cased ingredient name', () => {
    const items = buildShoppingItems([meal('meal-a', ['olive oil'])], new Map([['Olive Oil', true]]));
    expect(items[0]?.checked).toBe(true);
  });

  it('keeps local starter choices inside hard Program rules', () => {
    expect(plannerCatalogForProgram('plant-based-week').every((item) =>
      ['berry-oats', 'egg-toast', 'yogurt-parfait', 'smoothie-bowl', 'banana-pancakes', 'chia-pudding', 'lentil-soup', 'greek-salad', 'chickpea-bowl', 'stir-fry', 'med-pasta', 'apple-almond', 'edamame', 'trail-mix', 'hummus-veggies', 'banana-pb'].includes(item.id),
    )).toBe(true);
    expect(plannerCatalogForProgram('quick-and-easy').every((item) => (item.prepMinutes ?? 0) <= 20)).toBe(true);
  });

  it('preserves local calendar week dates', () => {
    expect(plannerDate('2026-08-03', 6)).toBe('2026-08-09');
  });
});

describe('planner image rendering contract', () => {
  it('uses stable identity keys and an explicit local fallback for every planner image surface', () => {
    const source = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../components/PlannerMealImage.tsx'), 'utf8');
    expect(source).toContain('function PlannerMealImage');
    expect(source).toContain('onError={() => {');
    expect(source).toContain('recyclingKey={`${meal.id}:${meal.imageAssetKey ?? meal.image ?? \'fallback\'}`}');
    expect(source).toContain('PLANNER_IMAGE_FALLBACK');
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