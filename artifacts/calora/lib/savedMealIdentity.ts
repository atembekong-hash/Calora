import type { MealType, SavedMeal } from '@/context/CaloraContext';

export type SavedMealInput = Omit<SavedMeal, 'id'>;

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/**
 * Stable identity for a saved template. The category is intentionally omitted
 * so correcting a meal's category cannot create a second copy of the same
 * template. Nutrition remains part of the identity so serving-scaled recipes
 * can still be saved independently.
 */
export function savedMealIdentity(meal: SavedMealInput | SavedMeal): string {
  const sourceIds = [...meal.foodIds].sort().join(',');
  return [
    meal.kind,
    normalizeName(meal.name),
    sourceIds,
    meal.calories,
    meal.protein,
    meal.carbs,
    meal.fat,
  ].join('|');
}

export function hasSavedMeal(existing: readonly SavedMeal[], candidate: SavedMealInput): boolean {
  const identity = savedMealIdentity(candidate);
  return existing.some((meal) => savedMealIdentity(meal) === identity);
}

export function normalizeSavedMealType(value: string | null | undefined): MealType | undefined {
  if (value === 'Breakfast' || value === 'Lunch' || value === 'Dinner' || value === 'Snack') return value;
  return undefined;
}
