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

export type CuratedImageAssignment = {
  identity: string;
  imageUrl?: string | null;
  imageAssetKey?: string | null;
  source: string;
};

export type DuplicateImageAssignment = {
  normalizedUrl?: string;
  imageAssetKey?: string;
  assignments: CuratedImageAssignment[];
};

/**
 * Query parameters usually only change the requested size/quality. They do
 * not make two provider photos different, so duplicate checks compare the
 * stable URL path instead of the rendered variant.
 */
export function normalizeImageIdentityUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export function findDuplicateImageAssignments(
  assignments: readonly CuratedImageAssignment[],
): DuplicateImageAssignment[] {
  const byIdentity = new Map<string, CuratedImageAssignment[]>();

  for (const assignment of assignments) {
    const normalizedUrl = normalizeImageIdentityUrl(assignment.imageUrl);
    if (normalizedUrl) {
      const key = `url:${normalizedUrl}`;
      byIdentity.set(key, [...(byIdentity.get(key) ?? []), assignment]);
    }

    if (assignment.imageAssetKey) {
      const key = `asset:${assignment.imageAssetKey}`;
      byIdentity.set(key, [...(byIdentity.get(key) ?? []), assignment]);
    }
  }

  return [...byIdentity.entries()]
    .filter(([, grouped]) => new Set(grouped.map((assignment) => assignment.identity)).size > 1)
    .map(([key, assignments]) => ({
      ...(key.startsWith('url:') ? { normalizedUrl: key.slice(4) } : { imageAssetKey: key.slice(6) }),
      assignments,
    }));
}

export type ImageSurfaceAuditRow = {
  surface: string;
  role: 'canonical' | 'provider' | 'generated' | 'representative' | 'fallback';
  rule: string;
};

export const IMAGE_SURFACE_AUDIT_ROWS: readonly ImageSurfaceAuditRow[] = [
  { surface: 'Planner', role: 'canonical', rule: 'Visible canonical meal name owns the bundled image identity.' },
  { surface: 'Foods', role: 'canonical', rule: 'Verified food name owns the bundled image identity; no remote URL is carried.' },
  { surface: 'Diary', role: 'fallback', rule: 'FoodLogThumbnail prefers canonical food imagery, then trusted provider imagery, then a meal fallback.' },
  { surface: 'Memory', role: 'canonical', rule: 'Food memories reuse the diary image contract; non-food memories stay image-free.' },
  { surface: 'Discover recipes', role: 'provider', rule: 'Provider imagery is used only when available; failed or missing photos show a classified fallback.' },
  { surface: 'Plus recipes', role: 'provider', rule: 'Normalized provider image duplicates are cleared before the accumulated catalogue renders.' },
  { surface: 'Saved recipes', role: 'generated', rule: 'Saved recipes preserve their source provenance; generated photos never replace user or provider imagery.' },
  { surface: 'Restaurants', role: 'representative', rule: 'Category imagery is labeled representative because exact menu photography is not guaranteed.' },
];