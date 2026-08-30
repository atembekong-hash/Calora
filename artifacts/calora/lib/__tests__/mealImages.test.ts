import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifiedFoods } from '@/data/foods';
import { plannerCatalog } from '@/data/planner';
import {
  FOOD_IMAGE_KEYS,
  PLANNER_IMAGE_KEYS,
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

  it('keeps the duplicated API/client planner image contracts in parity', () => {
    const clientSource = readFileSync(resolve(process.cwd(), 'data/planner.ts'), 'utf8');
    const serverSource = readFileSync(resolve(process.cwd(), '../api-server/src/routes/planner.ts'), 'utf8');
    const readMapping = (source: string) => {
      const block = source.match(/const plannerImageKeysById[\s\S]*?=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
      return [...block.matchAll(/(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9-]+)):\s*['"]([^'"]+)['"]/g)]
        .map((match) => [match[1] ?? match[2] ?? match[3], match[4]])
        .sort(([left], [right]) => left.localeCompare(right));
    };
    expect(readMapping(clientSource)).toEqual(readMapping(serverSource));
    expect(readMapping(serverSource)).toHaveLength(plannerCatalog.length);
  });
});