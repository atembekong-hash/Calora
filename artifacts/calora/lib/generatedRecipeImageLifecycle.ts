import { useEffect, useRef } from 'react';
import { requestGeneratedRecipePhotoUrl, type GeneratedRecipePhoto } from '@/lib/recipeGeneration';

/** Signed display locators are renewed before they become unusable to the image view. */
export const GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS = 60 * 60 * 1000;

export type GeneratedRecipeImageCandidate = {
  id: string;
  isLocal?: boolean;
  image?: string | null;
  imageId?: string | null;
  imageUrlExpiresAt?: string | null;
  imageStatus?: 'pending' | 'ready' | 'failed';
  imageProvenance?: 'generated' | 'provider' | 'fallback';
  sourceType?: 'open' | 'premium' | 'calora_catalog' | 'calora_ai' | 'user_created' | 'imported';
};

export type GeneratedRecipeImagePatch = {
  image?: string | null;
  imageUrlExpiresAt?: string | null;
  imageStatus?: 'pending' | 'ready' | 'failed';
  imageProvenance?: 'generated' | 'provider' | 'fallback';
};

export type UpdateGeneratedRecipe = (recipeId: string, patch: GeneratedRecipeImagePatch) => void;
type RequestGeneratedRecipePhotoUrl = (payload: { imageId: string }) => Promise<Pick<GeneratedRecipePhoto, 'imageUrl' | 'imageUrlExpiresAt'>>;

type RefreshSkipReason = 'not-generated' | 'missing-image-id' | 'pending' | 'failed' | 'fresh' | 'signed-out' | 'account-changed';

export type GeneratedRecipeImageRefreshDecision =
  | { action: 'skip'; reason: RefreshSkipReason }
  | { action: 'refresh'; imageId: string };

export type GeneratedRecipeImageRefreshResult =
  | { state: 'skipped'; recipeId: string; reason: RefreshSkipReason }
  | { state: 'refreshed'; recipeId: string; imageId: string }
  | { state: 'failed'; recipeId: string; imageId: string; error: string };

function hasGeneratedRecipeProvenance(recipe: GeneratedRecipeImageCandidate): boolean {
  // `imageId` is a private generated-photo reference. Explicit provider
  // provenance always wins so a provider's durable URL is never renewed or
  // replaced by this private-photo path.
  if (recipe.imageProvenance === 'provider') return false;
  return recipe.isLocal === true
    && (recipe.imageProvenance === 'generated'
      || recipe.sourceType === 'calora_ai'
      || recipe.sourceType === 'user_created'
      // imageId has always been the persisted private-photo reference. Older
      // local records can lack the provenance fields introduced later, so keep
      // them renewable unless they explicitly identify a provider photo.
      || (Boolean(recipe.imageId) && !recipe.imageProvenance && !recipe.sourceType));
}

function isNearExpiry(expiresAt: string | null | undefined, now: number, renewalWindowMs: number): boolean {
  if (!expiresAt) return true;
  const timestamp = Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= now + renewalWindowMs;
}

/**
 * Determines whether a local generated-photo locator needs renewal. It never
 * treats a provider image as a generated-photo candidate, even if malformed
 * legacy data happens to include an image ID.
 */
export function decideGeneratedRecipeImageRefresh(
  recipe: GeneratedRecipeImageCandidate,
  { now = Date.now(), renewalWindowMs = GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS, force = false }: { now?: number; renewalWindowMs?: number; force?: boolean } = {},
): GeneratedRecipeImageRefreshDecision {
  if (!hasGeneratedRecipeProvenance(recipe)) return { action: 'skip', reason: 'not-generated' };
  if (!recipe.imageId) return { action: 'skip', reason: 'missing-image-id' };
  if (recipe.imageStatus === 'pending') return { action: 'skip', reason: 'pending' };
  if (recipe.imageStatus === 'failed' && !force) return { action: 'skip', reason: 'failed' };
  if (force || !recipe.image || isNearExpiry(recipe.imageUrlExpiresAt, now, renewalWindowMs)) {
    return { action: 'refresh', imageId: recipe.imageId };
  }
  return { action: 'skip', reason: 'fresh' };
}

// A module-level map makes a mounted Recipes tab and a directly mounted Saved
// Recipes screen share one renewal for the same authenticated account/image.
const refreshesInFlight = new Map<string, Promise<GeneratedRecipeImageRefreshResult>>();

function refreshKey(accountId: string, imageId: string): string {
  return `${accountId}:${imageId}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Recipe photo could not be refreshed.';
}

/** Test-only reset for the module-level request dedupe registry. */
export function clearGeneratedRecipeImageRefreshes(): void {
  refreshesInFlight.clear();
}

/**
 * Renews a generated recipe's signed display locator in place. The durable
 * imageId and the recipe ID are deliberately omitted from every patch: the
 * server-authorized locator changes, while the recipe and private asset
 * identities remain stable.
 */
export function refreshGeneratedRecipeImage({
  accountId,
  recipe,
  updateRecipe,
  isAccountActive,
  force = false,
  now,
  renewalWindowMs,
  requestPhotoUrl = requestGeneratedRecipePhotoUrl,
}: {
  accountId?: string | null;
  recipe: GeneratedRecipeImageCandidate;
  updateRecipe: UpdateGeneratedRecipe;
  isAccountActive: (expectedAccountId: string) => boolean;
  force?: boolean;
  now?: number;
  renewalWindowMs?: number;
  requestPhotoUrl?: RequestGeneratedRecipePhotoUrl;
}): Promise<GeneratedRecipeImageRefreshResult> {
  const decision = decideGeneratedRecipeImageRefresh(recipe, { now, renewalWindowMs, force });
  if (decision.action === 'skip') return Promise.resolve({ state: 'skipped', recipeId: recipe.id, reason: decision.reason });

  // Do not attempt a private-photo renewal without an active account scope.
  // This avoids both cross-account request sharing and mutating a recipe while
  // signed out; a later authenticated mount can make the same decision again.
  if (!accountId) return Promise.resolve({ state: 'skipped', recipeId: recipe.id, reason: 'signed-out' });
  if (!isAccountActive(accountId)) return Promise.resolve({ state: 'skipped', recipeId: recipe.id, reason: 'account-changed' });

  const key = refreshKey(accountId, decision.imageId);
  const existing = refreshesInFlight.get(key);
  if (existing) return existing;

  updateRecipe(recipe.id, { imageStatus: 'pending' });
  const refresh = (async (): Promise<GeneratedRecipeImageRefreshResult> => {
    try {
      const photo = await requestPhotoUrl({ imageId: decision.imageId });
      if (!isAccountActive(accountId)) {
        return { state: 'skipped', recipeId: recipe.id, reason: 'account-changed' };
      }
      updateRecipe(recipe.id, {
        image: photo.imageUrl,
        imageUrlExpiresAt: photo.imageUrlExpiresAt,
        imageStatus: 'ready',
        imageProvenance: 'generated',
      });
      return { state: 'refreshed', recipeId: recipe.id, imageId: decision.imageId };
    } catch (error) {
      // Keep the last locator and durable image ID intact. `failed` is an
      // explicit, retryable UI state rather than silently falling back forever.
      if (!isAccountActive(accountId)) {
        return { state: 'skipped', recipeId: recipe.id, reason: 'account-changed' };
      }
      updateRecipe(recipe.id, { imageStatus: 'failed' });
      return { state: 'failed', recipeId: recipe.id, imageId: decision.imageId, error: errorMessage(error) };
    }
  })();
  refreshesInFlight.set(key, refresh);
  void refresh.finally(() => {
    if (refreshesInFlight.get(key) === refresh) refreshesInFlight.delete(key);
  });
  return refresh;
}

/**
 * Mount-time lifecycle hook shared by Recipes and Saved Recipes. It only
 * considers local Calora-generated photos and delegates all request dedupe to
 * the account-scoped refresh service above.
 */
export function useGeneratedRecipeImageRefresh({
  accountId,
  recipes,
  updateRecipe,
  renewalWindowMs,
}: {
  accountId?: string | null;
  recipes: readonly GeneratedRecipeImageCandidate[];
  updateRecipe: UpdateGeneratedRecipe;
  renewalWindowMs?: number;
}): void {
  const updateRecipeRef = useRef(updateRecipe);
  const activeAccountIdRef = useRef(accountId ?? null);
  activeAccountIdRef.current = accountId ?? null;
  useEffect(() => {
    updateRecipeRef.current = updateRecipe;
  }, [updateRecipe]);

  useEffect(() => {
    recipes.forEach((recipe) => {
      void refreshGeneratedRecipeImage({
        accountId,
        recipe,
        updateRecipe: updateRecipeRef.current,
        isAccountActive: (expectedAccountId) => activeAccountIdRef.current === expectedAccountId,
        renewalWindowMs,
      });
    });
  }, [accountId, recipes, renewalWindowMs]);
}
