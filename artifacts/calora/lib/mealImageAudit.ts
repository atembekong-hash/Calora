import type { PlannerMeal } from '@workspace/api-client-react';
import { plannerCatalog } from '@/data/planner';
import type { PlannerImageKey } from '@/lib/mealImageIdentity';

const AUDIT_MEAL_IDS = ['berry-oats', 'harvest-salad', 'med-pasta', 'apple-almond'] as const;

export type MealImageAuditCase = {
  auditId: `meal-image-audit-${Lowercase<PlannerMeal['meal']>}`;
  meal: PlannerMeal;
  expectedImageKey: PlannerImageKey;
};

/**
 * Keep this fixture deliberately small: one stable card from each planner
 * category is enough to exercise native asset resolution without turning the
 * device check into a second full-catalog test.
 */
export function getMealImageAuditCases(catalog: readonly PlannerMeal[] = plannerCatalog): MealImageAuditCase[] {
  return AUDIT_MEAL_IDS.map((mealId) => {
    const meal = catalog.find((candidate) => candidate.id === mealId);
    if (!meal) {
      throw new Error(`Meal image audit fixture is missing planner meal "${mealId}"`);
    }

    return {
      auditId: `meal-image-audit-${meal.meal.toLowerCase()}` as MealImageAuditCase['auditId'],
      meal,
      expectedImageKey: mealId,
    };
  });
}