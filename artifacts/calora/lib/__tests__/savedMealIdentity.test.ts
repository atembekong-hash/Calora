import { describe, expect, it } from 'vitest';
import { hasSavedMeal, normalizeSavedMealType, savedMealIdentity } from '@/lib/savedMealIdentity';
import type { SavedMeal } from '@/context/CaloraContext';

const base = {
  name: '  Salmon   rice bowl ',
  kind: 'meal' as const,
  foodIds: ['food-1'],
  calories: 640,
  protein: 39,
  carbs: 62,
  fat: 24,
};

describe('saved meal identity', () => {
  it('deduplicates repeated saves regardless of whitespace or category', () => {
    const existing: SavedMeal[] = [{ ...base, id: 'saved-1', mealType: 'Dinner' }];
    expect(hasSavedMeal(existing, { ...base, name: 'Salmon rice bowl', mealType: 'Breakfast' })).toBe(true);
  });

  it('keeps serving-scaled or nutritionally different templates distinct', () => {
    expect(savedMealIdentity(base)).not.toBe(savedMealIdentity({ ...base, calories: 800 }));
  });

  it('normalizes only supported meal categories', () => {
    expect(normalizeSavedMealType('Breakfast')).toBe('Breakfast');
    expect(normalizeSavedMealType('snack')).toBeUndefined();
    expect(normalizeSavedMealType(null)).toBeUndefined();
  });
});
