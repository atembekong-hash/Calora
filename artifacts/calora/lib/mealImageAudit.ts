import type { PlannerMeal } from '@workspace/api-client-react';
import { plannerCatalog } from '@/data/planner';
import { PLANNER_IMAGE_KEYS, type PlannerImageKey } from '@/lib/mealImageIdentity';

const AUDIT_MEAL_IDS = ['berry-oats', 'harvest-salad', 'med-pasta', 'apple-almond'] as const;

export type MealImageAuditCase = {
  auditId: `meal-image-audit-${Lowercase<PlannerMeal['meal']>}`;
  meal: PlannerMeal;
  /**
   * The healthy audit fixture always provides an expected key. The optional
   * shape also supports the QA-only missing-source scenario, where there is
   * no identity expectation and the component must report a plain fallback.
   */
  expectedImageKey?: PlannerImageKey;
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

    const imageAssetKey = meal.imageAssetKey;
    if (!imageAssetKey || !(PLANNER_IMAGE_KEYS as readonly string[]).includes(imageAssetKey)) {
      throw new Error(
        `Meal image audit fixture "${meal.id}" must use a curated planner image key; custom/generated meals are not eligible`,
      );
    }

    return {
      auditId: `meal-image-audit-${meal.meal.toLowerCase()}` as MealImageAuditCase['auditId'],
      meal,
      expectedImageKey: imageAssetKey as PlannerImageKey,
    };
  });
}