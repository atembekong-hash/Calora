import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifiedFoods } from '@/data/foods';
import { plannerCatalog } from '@/data/planner';
import {
  FOOD_IMAGE_KEYS,
  PLANNER_MEAL_IMAGE_IDENTITIES,
  PLANNER_IMAGE_KEYS,
  plannerImageKeyForMealId,
} from '@/lib/mealImageIdentity';

describe('curated meal image identity', () => {
  it('assigns a generated asset to every planner catalog meal', () => {
    expect(plannerCatalog).toHaveLength(26);
    expect(plannerCatalog.every((meal) => meal.imageAssetKey)).toBe(true);
    expect(new Set(plannerCatalog.map((meal) => meal.imageAssetKey)).size).toBe(plannerCatalog.length);
  });

  it('covers all four meal types with the intended catalog counts', () => {
    expect(Object.fromEntries(
      ['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((mealType) => [
        mealType,
        plannerCatalog.filter((meal) => meal.meal === mealType).length,
      ]),
    )).toEqual({ Breakfast: 7, Lunch: 7, Dinner: 7, Snack: 5 });
  });

  it('assigns distinct generated assets to every verified food suggestion', () => {
    expect(verifiedFoods).toHaveLength(20);
    expect(verifiedFoods.every((food) => food.imageAssetKey)).toBe(true);
    expect(new Set(verifiedFoods.map((food) => food.imageAssetKey)).size).toBe(verifiedFoods.length);
  });

  it('keeps the generated asset inventory aligned with the declared identity lists', () => {
    expect(new Set(plannerCatalog.map((meal) => meal.imageAssetKey)).size).toBe(PLANNER_IMAGE_KEYS.length);
    expect(new Set(verifiedFoods.map((food) => food.imageAssetKey)).size).toBe(FOOD_IMAGE_KEYS.length);
  });

  it('ships a non-empty bundled file for every declared generated asset', () => {
    for (const key of PLANNER_IMAGE_KEYS) {
      const path = resolve(process.cwd(), `assets/images/meals/${key}.jpg`);
      expect(existsSync(path), path).toBe(true);
      expect(statSync(path).size, path).toBeGreaterThan(0);
    }
    for (const key of FOOD_IMAGE_KEYS) {
      const path = resolve(process.cwd(), `assets/images/foods/${key}.jpg`);
      expect(existsSync(path), path).toBe(true);
      expect(statSync(path).size, path).toBeGreaterThan(0);
    }
  });

  it('keeps every planner catalog identity in the shared contract', () => {
    expect(Object.keys(PLANNER_MEAL_IMAGE_IDENTITIES)).toHaveLength(plannerCatalog.length);
    expect(plannerCatalog.every((meal) => plannerImageKeyForMealId(meal.id) === meal.imageAssetKey)).toBe(true);
    expect(new Set(PLANNER_IMAGE_KEYS).size).toBe(PLANNER_IMAGE_KEYS.length);
  });

  it('recovers bundled identity for legacy planned meals without image metadata', () => {
    expect(plannerImageKeyForMealId('starter-3-Snack', 'Hummus with veggie sticks')).toBe('hummus-veggies');
    expect(plannerImageKeyForMealId('planner-2026-08-31-hummus-veggies-3')).toBe('hummus-veggies');
  });

  it('does not promote custom or generated meal ids into curated image keys', () => {
    expect(plannerImageKeyForMealId('custom-summer-bowl')).toBeUndefined();
    expect(plannerImageKeyForMealId('planner-2026-08-31-custom-summer-bowl')).toBeUndefined();
  });
});
