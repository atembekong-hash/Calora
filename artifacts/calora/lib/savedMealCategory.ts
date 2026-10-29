import { plannerCatalog } from "@/data/planner";
import type { MealType, SavedMeal } from "@/context/CaloraContext";

/**
 * Resolve the category used by the Saved meals filter.
 *
 * Older saved-meal records predate category metadata. Canonical planner meals
 * can still be matched by their stable food id or name; any remaining legacy
 * record keeps the historical Lunch bucket instead of disappearing.
 */
export function savedMealCategory(meal: SavedMeal): MealType {
  if (meal.mealType) return meal.mealType;

  const catalogMeal = plannerCatalog.find(
    (candidate) =>
      meal.foodIds.includes(candidate.id) || candidate.name === meal.name,
  );

  return catalogMeal?.meal ?? "Lunch";
}
