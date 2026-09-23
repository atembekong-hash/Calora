import type { PlannerMeal } from '@workspace/api-client-react';
import { normalizeTrustedFoodImageUrl } from '@workspace/api-zod/image-source-policy';
import { plannerImageKeyForMeal, type PlannerImageKey } from '@/lib/mealImageIdentity';
import { getPlannerMealRecipeLink } from '@/lib/plannerRecipeLink';

/**
 * Planner images have two deliberately separate concerns:
 *
 * - A visible canonical catalog name deterministically selects its bundled
 *   curated asset. Persisted imageAssetKey metadata never selects an image.
 * - A non-canonical remote image is displayable only when the Planner record
 *   still carries its recipe link and the URL passes the shared final-boundary
 *   trusted-URL policy. This prevents a renamed catalog meal from inheriting
 *   its former catalog URL while retaining linked recipe imagery.
 */
export type PlannerImageRenderDecision = {
  canonicalImageKey?: PlannerImageKey;
  recipeOwned: boolean;
  remoteImageUrl?: string;
};

export type PlannerImageRecord = Pick<PlannerMeal, 'id' | 'name' | 'image' | 'imageAssetKey'> & {
  recipeId?: string;
  recipeSource?: string;
};

export function plannerImageRenderDecision(meal: PlannerImageRecord): PlannerImageRenderDecision {
  const canonicalImageKey = plannerImageKeyForMeal(meal.id, meal.name);
  const recipeOwned = Boolean(getPlannerMealRecipeLink(meal as PlannerMeal & { recipeId?: string; recipeSource?: string }));

  // Canonical assets always win. A legacy catalog URL cannot become relevant
  // merely because it survived a persistence round-trip.
  if (canonicalImageKey) return { canonicalImageKey, recipeOwned };

  // A custom or renamed Planner record has no remote-image ownership evidence.
  // Recipe-linked records retain their own image only after URL validation.
  const remoteImageUrl = recipeOwned ? normalizeTrustedFoodImageUrl(meal.image) : undefined;
  return { recipeOwned, remoteImageUrl };
}

export type PlannerImageProvenance = 'canonical-curated' | 'recipe-owned' | 'fallback';

export function plannerImageProvenanceForMeal(meal: PlannerImageRecord): PlannerImageProvenance {
  const decision = plannerImageRenderDecision(meal);
  if (decision.canonicalImageKey) return 'canonical-curated';
  if (decision.remoteImageUrl) return 'recipe-owned';
  return 'fallback';
}

/**
 * A stored key is useful for audit diagnosis but is never image-selection
 * authority. The comparison is intentionally against the freshly derived
 * visible-name key, not against another persisted field.
 */
export function plannerStoredImageKeyMismatch(meal: PlannerImageRecord): boolean {
  const canonicalImageKey = plannerImageKeyForMeal(meal.id, meal.name);
  return Boolean(meal.imageAssetKey && meal.imageAssetKey !== canonicalImageKey);
}
