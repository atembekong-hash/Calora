import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  RecipeApiError,
  acknowledgeGeneratedRecipeMediaRendered,
  listGeneratedRecipeMedia,
  requestGeneratedRecipePhoto,
  requestGeneratedRecipePhotoUrl,
  requestGeneratedRecipeMediaReviewPreview,
  retryGeneratedRecipeMedia,
  reviewGeneratedRecipeMedia,
  type GeneratedRecipePhoto,
  type GeneratedRecipePhotoInput,
  type RecipeMediaReviewState,
} from '@/lib/recipeGeneration';
import type { CaloraRecipe } from '@/context/CaloraContext';

export const GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS = 60 * 60 * 1000;
export const GENERATED_RECIPE_IMAGE_MAX_SCHEDULE_MS = 15 * 60 * 1000;
export const GENERATED_RECIPE_STALE_GENERATION_MS = 2 * 60 * 1000;
export type GeneratedRecipeClientState = 'not_requested' | 'generating' | 'stored' | 'url_refreshing' | 'url_ready' | 'rendered' | 'retryable_error';

export type GeneratedRecipeImageCandidate = {
  id: string;
  name?: string;
  description?: string | null;
  ingredients?: string[];
  instructions?: string | null;
  tags?: string[];
  category?: string | null;
  area?: string | null;
  mealType?: string | null;
  isLocal?: boolean;
  image?: string | null;
  imageId?: string | null;
  imageMediaId?: string | null;
  imageContentHash?: string | null;
  imageModelVersion?: string | null;
  imagePromptVersion?: string | null;
  imageUrlExpiresAt?: string | null;
  /** Short-lived owner-scoped locator displayed only while the image is awaiting semantic review. */
  imagePreviewUrl?: string | null;
  imagePreviewUrlExpiresAt?: string | null;
  imagePreviewErrorCode?: string | null;
  imagePreviewAttemptedAt?: string | null;
  imageStatus?: GeneratedRecipeClientState | 'pending' | 'ready' | 'failed';
  imageReviewState?: RecipeMediaReviewState;
  imageErrorCode?: string | null;
  imageAttempts?: number;
  imageLastRenderedAt?: string | null;
  imageProvenance?: 'generated' | 'provider' | 'fallback';
  sourceType?: 'open' | 'premium' | 'calora_catalog' | 'calora_ai' | 'user_created' | 'imported';
};

export type GeneratedRecipeImagePatch = Partial<Omit<GeneratedRecipeImageCandidate, 'id' | 'name' | 'ingredients' | 'instructions' | 'isLocal' | 'sourceType'>>;
export type UpdateGeneratedRecipe = (recipeId: string, patch: GeneratedRecipeImagePatch) => void;
type RequestPhotoUrl = (payload: { mediaId?: string; imageId?: string }, signal?: AbortSignal) => Promise<GeneratedRecipePhoto | Pick<GeneratedRecipePhoto, 'imageUrl' | 'imageUrlExpiresAt'>>;
type RequestReviewPreview = (mediaId: string, signal?: AbortSignal) => Promise<GeneratedRecipePhoto>;

type RefreshSkipReason = 'not-generated' | 'missing-image-id' | 'generating' | 'retryable-error' | 'fresh' | 'signed-out' | 'account-changed' | 'stale-request' | 'review-required';
export type GeneratedRecipeImageRefreshDecision = { action: 'skip'; reason: RefreshSkipReason } | { action: 'refresh'; imageId: string; mediaId?: string };
export type GeneratedRecipeImageRefreshResult =
  | { state: 'skipped'; recipeId: string; reason: RefreshSkipReason }
  | { state: 'refreshed'; recipeId: string; imageId: string }
  | { state: 'failed'; recipeId: string; imageId: string; error: string };

function clientState(state: GeneratedRecipeImageCandidate['imageStatus']): GeneratedRecipeClientState {
  if (state === 'pending') return 'generating';
  if (state === 'ready') return 'url_ready';
  if (state === 'failed') return 'retryable_error';
  return state ?? 'not_requested';
}
/**
 * Classifies a local candidate whose photo must come from Calora's
 * owner-scoped generated-media lifecycle. Keep this broader than the persisted
 * provenance flag: a freshly created recipe is a generated candidate before
 * its first media response has been written back to local state.
 */
export function isGeneratedRecipeImageCandidate(recipe: GeneratedRecipeImageCandidate): boolean {
  if (recipe.imageProvenance === 'provider') return false;
  if (recipe.isLocal !== true) return false;
  if (recipe.imageProvenance === 'generated' || recipe.sourceType === 'calora_ai' || Boolean(recipe.imageId)) return true;
  // Personal recipes can be created without instructions. Those records cannot
  // produce the server-owned photo payload and must use the ordinary fallback,
  // rather than remaining indefinitely in a generated-media pending state.
  return recipe.sourceType === 'user_created' && Boolean(recipePhotoPayload(recipe));
}

function generated(recipe: GeneratedRecipeImageCandidate): boolean {
  return isGeneratedRecipeImageCandidate(recipe);
}
function isNearExpiry(expiresAt: string | null | undefined, now: number, renewalWindowMs: number) {
  if (!expiresAt) return true;
  const timestamp = Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= now + renewalWindowMs;
}

export function isStaleGeneratedRecipeMedia(
  media: Pick<GeneratedRecipePhoto, 'status' | 'updatedAt'>,
  now = Date.now(),
) {
  const updatedAt = Date.parse(media.updatedAt);
  return media.status === 'generating'
    && Number.isFinite(updatedAt)
    && updatedAt <= now - GENERATED_RECIPE_STALE_GENERATION_MS;
}

export function recipePhotoPayload(recipe: GeneratedRecipeImageCandidate): GeneratedRecipePhotoInput | null {
  if (!recipe.id || !recipe.name || !recipe.ingredients?.length || !recipe.instructions?.trim()) return null;
  return {
    clientRecipeId: recipe.id,
    title: recipe.name,
    description: recipe.description ?? '',
    ingredients: recipe.ingredients,
    instructions: recipe.instructions.split(/\n+/).map((item) => item.trim()).filter(Boolean),
    cuisine: recipe.area ?? undefined,
    category: recipe.category ?? undefined,
    mealType: recipe.mealType ?? undefined,
    dietaryContext: recipe.tags ?? [],
  };
}

export function patchForRecipeMedia(photo: GeneratedRecipePhoto): GeneratedRecipeImagePatch {
  const reviewPreview = photo.semanticReviewState === 'needs_review' && photo.status === 'stored' && photo.imageUrl
    ? { imagePreviewUrl: photo.imageUrl, imagePreviewUrlExpiresAt: photo.imageUrlExpiresAt ?? null }
    : { imagePreviewUrl: null, imagePreviewUrlExpiresAt: null };
  const status: GeneratedRecipeClientState = photo.semanticReviewState === 'accepted' && photo.imageUrl
    ? 'url_ready'
    : photo.status === 'stored'
      ? 'stored'
      : photo.status === 'retryable_error'
        ? 'retryable_error'
        : 'generating';
  return {
    // A generated photo is not published into ordinary recipe rendering until
    // the owner accepts it. Review media remains a separate short-lived field.
    image: photo.semanticReviewState === 'accepted' ? photo.imageUrl : null,
    imageId: photo.imageId,
    imageMediaId: photo.mediaId,
    imageContentHash: photo.contentHash,
    imageModelVersion: photo.modelVersion,
    imagePromptVersion: photo.promptVersion,
    imageUrlExpiresAt: photo.imageUrlExpiresAt,
    ...reviewPreview,
    imageStatus: status,
    imageReviewState: photo.semanticReviewState,
    imageErrorCode: photo.lastErrorCode ?? null,
    imageAttempts: photo.attempts,
    imageProvenance: 'generated',
  };
}

/** Rebuild a minimal AI-estimated recipe only from an authenticated owner's persisted media payload. */
export function restoredRecipeFromMedia(photo: GeneratedRecipePhoto): CaloraRecipe | null {
  const payload = photo.recipePayload;
  if (!payload?.clientRecipeId || payload.clientRecipeId !== photo.clientRecipeId || !payload.title) return null;
  return {
    id: photo.clientRecipeId,
    name: payload.title,
    description: payload.description,
    ingredients: payload.ingredients,
    instructions: payload.instructions.join('\n'),
    tags: ['Calora AI', ...payload.dietaryContext],
    area: payload.cuisine ?? null,
    category: payload.category ?? null,
    source: 'Calora AI',
    sourceUrl: '',
    sourceType: 'calora_ai',
    sourceProvider: 'Calora AI',
    nutritionConfidence: 'estimated',
    nutritionSource: 'AI estimate',
    nutritionNote: 'Restored recipe content. Review nutrition before logging.',
    imageProvenance: 'generated',
    ...patchForRecipeMedia(photo),
    createdAt: photo.createdAt,
    updatedAt: photo.updatedAt,
  };
}

export function decideGeneratedRecipeImageRefresh(recipe: GeneratedRecipeImageCandidate, { now = Date.now(), renewalWindowMs = GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS, force = false }: { now?: number; renewalWindowMs?: number; force?: boolean } = {}): GeneratedRecipeImageRefreshDecision {
  if (!generated(recipe)) return { action: 'skip', reason: 'not-generated' };
  if (recipe.imageReviewState === 'needs_review' || recipe.imageReviewState === 'rejected') {
    return { action: 'skip', reason: 'review-required' };
  }
  if (!recipe.imageId) return { action: 'skip', reason: 'missing-image-id' };
  const state = clientState(recipe.imageStatus);
  if (state === 'generating') return { action: 'skip', reason: 'generating' };
  if (state === 'retryable_error' && !force) return { action: 'skip', reason: 'retryable-error' };
  if (force || !recipe.image || isNearExpiry(recipe.imageUrlExpiresAt, now, renewalWindowMs)) return { action: 'refresh', imageId: recipe.imageId, mediaId: recipe.imageMediaId ?? undefined };
  return { action: 'skip', reason: 'fresh' };
}

const requestsInFlight = new Map<string, Promise<unknown>>();
const forcedLocatorRenewals = new Set<string>();
const refreshGenerations = new Map<string, number>();
const key = (accountId: string, action: string, identity: string) => `${accountId}:${action}:${identity}`;
const errorMessage = (error: unknown) => error instanceof Error && error.message ? error.message : 'Recipe photo is temporarily unavailable.';
function nextRefreshGeneration(identity: string) {
  const generation = (refreshGenerations.get(identity) ?? 0) + 1;
  refreshGenerations.set(identity, generation);
  return generation;
}
function isCurrentRefreshGeneration(identity: string, generation: number) {
  return refreshGenerations.get(identity) === generation;
}
export function clearGeneratedRecipeImageRefreshes() { requestsInFlight.clear(); forcedLocatorRenewals.clear(); refreshGenerations.clear(); }

/**
 * Stored media has completed generation but still needs the owner's semantic
 * approval. Fetch exactly one short-lived private review locator, rather than
 * treating that terminal server state as an eternal generation spinner.
 */
export function requestGeneratedRecipeImageReviewPreview({ accountId, recipe, updateRecipe, isAccountActive, force = false, requestReviewPreview = requestGeneratedRecipeMediaReviewPreview }: {
  accountId?: string | null; recipe: GeneratedRecipeImageCandidate; updateRecipe: UpdateGeneratedRecipe;
  isAccountActive: (id: string) => boolean; force?: boolean; requestReviewPreview?: RequestReviewPreview;
}): Promise<GeneratedRecipePhoto | null> {
  if (!accountId || !isAccountActive(accountId) || !generated(recipe) || recipe.imageReviewState !== 'needs_review' || !recipe.imageMediaId) return Promise.resolve(null);
  const previewIsFresh = Boolean(recipe.imagePreviewUrl) && !isNearExpiry(
    recipe.imagePreviewUrlExpiresAt,
    Date.now(),
    GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS,
  );
  if (!force && (previewIsFresh || recipe.imagePreviewErrorCode)) return Promise.resolve(null);
  const requestKey = key(accountId, 'review-preview', recipe.imageMediaId);
  const existing = requestsInFlight.get(requestKey) as Promise<GeneratedRecipePhoto | null> | undefined;
  if (existing) return existing;
  updateRecipe(recipe.id, { imagePreviewErrorCode: null, imagePreviewAttemptedAt: new Date().toISOString() });
  const request = requestReviewPreview(recipe.imageMediaId).then((photo) => {
    if (!isAccountActive(accountId)) return null;
    const patch = patchForRecipeMedia(photo);
    if (!patch.imagePreviewUrl) throw new RecipeApiError('Recipe photo preview is unavailable.', 502, 'review_preview_missing');
    updateRecipe(recipe.id, { ...patch, imagePreviewErrorCode: null });
    return photo;
  }).catch((error) => {
    if (isAccountActive(accountId) && (error as Error).name !== 'AbortError') {
      updateRecipe(recipe.id, {
        imageStatus: 'stored',
        imagePreviewUrl: null,
        imagePreviewUrlExpiresAt: null,
        imagePreviewErrorCode: error instanceof RecipeApiError ? error.code ?? `http_${error.status}` : 'preview_failed',
      });
    }
    return null;
  }).finally(() => { if (requestsInFlight.get(requestKey) === request) requestsInFlight.delete(requestKey); });
  requestsInFlight.set(requestKey, request);
  return request;
}

export function ensureGeneratedRecipeImage({ accountId, recipe, updateRecipe, isAccountActive, force = false, signal }: {
  accountId?: string | null; recipe: GeneratedRecipeImageCandidate; updateRecipe: UpdateGeneratedRecipe;
  isAccountActive: (id: string) => boolean; force?: boolean; signal?: AbortSignal;
}): Promise<GeneratedRecipePhoto | null> {
  if (!accountId || !isAccountActive(accountId) || !generated(recipe)) return Promise.resolve(null);
  const payload = recipePhotoPayload(recipe);
  if (!payload) return Promise.resolve(null);
  const state = clientState(recipe.imageStatus);
  if (!force && ['generating', 'stored', 'url_ready', 'rendered', 'url_refreshing'].includes(state)) return Promise.resolve(null);
  const requestKey = key(accountId, 'create', recipe.id);
  const existing = requestsInFlight.get(requestKey) as Promise<GeneratedRecipePhoto | null> | undefined;
  if (existing) return existing;
  updateRecipe(recipe.id, {
    image: null,
    imageUrlExpiresAt: null,
    imagePreviewUrl: null,
    imagePreviewUrlExpiresAt: null,
    imagePreviewErrorCode: null,
    imageStatus: 'generating',
    imageErrorCode: null,
  });
  const request = requestGeneratedRecipePhoto(payload, { signal, maxRetries: 1 }).then((photo) => {
    if (!isAccountActive(accountId)) return null;
    updateRecipe(recipe.id, patchForRecipeMedia(photo));
    return photo;
  }).catch((error) => {
    if (isAccountActive(accountId) && (error as Error).name !== 'AbortError') updateRecipe(recipe.id, {
      imageStatus: 'retryable_error',
      imageErrorCode: error instanceof RecipeApiError ? error.code ?? `http_${error.status}` : 'offline',
    });
    throw error;
  }).finally(() => { if (requestsInFlight.get(requestKey) === request) requestsInFlight.delete(requestKey); });
  requestsInFlight.set(requestKey, request);
  return request;
}

export function refreshGeneratedRecipeImage({ accountId, recipe, updateRecipe, isAccountActive, force = false, now, renewalWindowMs, requestPhotoUrl = requestGeneratedRecipePhotoUrl }: {
  accountId?: string | null; recipe: GeneratedRecipeImageCandidate; updateRecipe: UpdateGeneratedRecipe;
  isAccountActive: (id: string) => boolean; force?: boolean; now?: number; renewalWindowMs?: number; requestPhotoUrl?: RequestPhotoUrl;
}): Promise<GeneratedRecipeImageRefreshResult> {
  const decision = decideGeneratedRecipeImageRefresh(recipe, { now, renewalWindowMs, force });
  if (decision.action === 'skip') return Promise.resolve({ state: 'skipped', recipeId: recipe.id, reason: decision.reason });
  if (!accountId) return Promise.resolve({ state: 'skipped', recipeId: recipe.id, reason: 'signed-out' });
  if (!isAccountActive(accountId)) return Promise.resolve({ state: 'skipped', recipeId: recipe.id, reason: 'account-changed' });
  const requestKey = key(accountId, 'refresh', decision.mediaId ?? decision.imageId);
  const generationKey = key(accountId, 'refresh-recipe', recipe.id);
  const existing = requestsInFlight.get(requestKey) as Promise<GeneratedRecipeImageRefreshResult> | undefined;
  if (existing) return existing;
  const generation = nextRefreshGeneration(generationKey);
  updateRecipe(recipe.id, { imageStatus: 'url_refreshing', imageErrorCode: null });
  const request = requestPhotoUrl({ mediaId: decision.mediaId, imageId: decision.imageId }).then((photo): GeneratedRecipeImageRefreshResult => {
    if (!isAccountActive(accountId)) return { state: 'skipped', recipeId: recipe.id, reason: 'account-changed' };
    if (!isCurrentRefreshGeneration(generationKey, generation)) return { state: 'skipped', recipeId: recipe.id, reason: 'stale-request' };
    updateRecipe(recipe.id, 'mediaId' in photo ? patchForRecipeMedia(photo) : {
      image: photo.imageUrl,
      imageUrlExpiresAt: photo.imageUrlExpiresAt,
      imageStatus: 'url_ready',
      imageProvenance: 'generated',
    });
    return { state: 'refreshed', recipeId: recipe.id, imageId: decision.imageId };
  }).catch((error): GeneratedRecipeImageRefreshResult => {
    if (!isAccountActive(accountId)) return { state: 'skipped', recipeId: recipe.id, reason: 'account-changed' };
    if (!isCurrentRefreshGeneration(generationKey, generation)) return { state: 'skipped', recipeId: recipe.id, reason: 'stale-request' };
    updateRecipe(recipe.id, { imageStatus: 'retryable_error', imageErrorCode: error instanceof RecipeApiError ? error.code ?? `http_${error.status}` : 'refresh_failed' });
    return { state: 'failed', recipeId: recipe.id, imageId: decision.imageId, error: errorMessage(error) };
  }).finally(() => { if (requestsInFlight.get(requestKey) === request) requestsInFlight.delete(requestKey); });
  requestsInFlight.set(requestKey, request);
  return request;
}

export function markGeneratedRecipeImageRendered(recipe: GeneratedRecipeImageCandidate, updateRecipe: UpdateGeneratedRecipe) {
  if (!generated(recipe) || !recipe.image || clientState(recipe.imageStatus) === 'rendered') return;
  updateRecipe(recipe.id, { imageStatus: 'rendered', imageErrorCode: null, imageLastRenderedAt: new Date().toISOString() });
  if (recipe.imageMediaId) void acknowledgeGeneratedRecipeMediaRendered(recipe.imageMediaId).catch(() => undefined);
}

function mediaPatchChanged(recipe: GeneratedRecipeImageCandidate, patch: GeneratedRecipeImagePatch): boolean {
  return Object.entries(patch).some(([key, value]) => recipe[key as keyof GeneratedRecipeImageCandidate] !== value);
}

/**
 * The owner-media endpoint returns a newly signed private URL on every
 * reconciliation. Replacing a valid rendered locator on every poll remounts
 * Expo Image and flashes Create cards and their suggestion cards. Keep the
 * accepted image mounted until the existing capability needs renewal.
 */
export function reconcileGeneratedRecipeMedia(
  recipe: GeneratedRecipeImageCandidate,
  photo: GeneratedRecipePhoto,
  renewalWindowMs?: number,
): GeneratedRecipeImagePatch {
  const patch = patchForRecipeMedia(photo);
  const renderedAndCurrent = clientState(recipe.imageStatus) === 'rendered'
    && Boolean(recipe.image)
    && recipe.imageId === patch.imageId
    && recipe.imageMediaId === patch.imageMediaId
    && patch.imageReviewState === 'accepted';
  const currentLocator = decideGeneratedRecipeImageRefresh(recipe, { renewalWindowMs });

  // List reconciliation intentionally returns stored review media without a
  // URL. Preserve an already-valid memory-only review capability rather than
  // clearing/reissuing it on every lifecycle pass.
  const retainedReviewPreview = photo.status === 'stored'
    && photo.semanticReviewState === 'needs_review'
    && Boolean(recipe.imagePreviewUrl)
    && !isNearExpiry(recipe.imagePreviewUrlExpiresAt, Date.now(), renewalWindowMs ?? GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS);
  if (retainedReviewPreview) {
    return {
      ...patch,
      imagePreviewUrl: recipe.imagePreviewUrl,
      imagePreviewUrlExpiresAt: recipe.imagePreviewUrlExpiresAt ?? null,
      imagePreviewErrorCode: recipe.imagePreviewErrorCode ?? null,
      imagePreviewAttemptedAt: recipe.imagePreviewAttemptedAt ?? null,
    };
  }

  if (renderedAndCurrent && currentLocator.action === 'skip' && currentLocator.reason === 'fresh') {
    return {
      ...patch,
      image: recipe.image,
      imageUrlExpiresAt: recipe.imageUrlExpiresAt,
      imageStatus: 'rendered',
    };
  }
  return patch;
}

/** One forced owner-scoped renewal per failed locator; further failure exposes retry instead of looping. */
export async function handleGeneratedRecipeImageError({ accountId, recipe, updateRecipe, isAccountActive }: {
  accountId?: string | null; recipe: GeneratedRecipeImageCandidate; updateRecipe: UpdateGeneratedRecipe; isAccountActive: (id: string) => boolean;
}) {
  if (!generated(recipe) || !recipe.image) return false;
  const renewalKey = `${accountId ?? 'signed-out'}:${recipe.id}:${recipe.imageMediaId ?? recipe.imageId}:${recipe.image}`;
  if (!forcedLocatorRenewals.has(renewalKey)) {
    forcedLocatorRenewals.add(renewalKey);
    const result = await refreshGeneratedRecipeImage({ accountId, recipe, updateRecipe, isAccountActive, force: true });
    if (result.state === 'refreshed') forcedLocatorRenewals.delete(renewalKey);
    return result.state === 'refreshed';
  }
  updateRecipe(recipe.id, { imageStatus: 'retryable_error', imageErrorCode: 'render_failed' });
  return false;
}

export async function retryOrRegenerateRecipeImage({ accountId, recipe, updateRecipe, isAccountActive }: {
  accountId?: string | null; recipe: GeneratedRecipeImageCandidate; updateRecipe: UpdateGeneratedRecipe; isAccountActive: (id: string) => boolean;
}) {
  if (!accountId || !isAccountActive(accountId)) return null;
  if (recipe.imageMediaId) {
    updateRecipe(recipe.id, {
      image: null,
      imageUrlExpiresAt: null,
      imagePreviewUrl: null,
      imagePreviewUrlExpiresAt: null,
      imagePreviewErrorCode: null,
      imageStatus: 'generating',
      imageErrorCode: null,
      imageReviewState: 'needs_review',
    });
    try {
      const photo = await retryGeneratedRecipeMedia(recipe.imageMediaId);
      if (isAccountActive(accountId)) updateRecipe(recipe.id, patchForRecipeMedia(photo));
      return photo;
    } catch (error) {
      if (isAccountActive(accountId)) updateRecipe(recipe.id, { imageStatus: 'retryable_error', imageErrorCode: error instanceof RecipeApiError ? error.code ?? 'retry_failed' : 'retry_failed' });
      throw error;
    }
  }
  return ensureGeneratedRecipeImage({ accountId, recipe, updateRecipe, isAccountActive, force: true });
}

export async function reviewRecipeImage(recipe: GeneratedRecipeImageCandidate, reviewState: RecipeMediaReviewState, updateRecipe: UpdateGeneratedRecipe) {
  if (!recipe.imageMediaId) return null;
  const photo = await reviewGeneratedRecipeMedia(recipe.imageMediaId, reviewState);
  if (photo.semanticReviewState !== 'accepted') {
    updateRecipe(recipe.id, { image: null, imageUrlExpiresAt: null, imagePreviewUrl: null, imagePreviewUrlExpiresAt: null, imagePreviewErrorCode: null, imageReviewState: photo.semanticReviewState, imageStatus: 'stored' });
    return photo;
  }
  const published = await requestGeneratedRecipePhotoUrl({ mediaId: recipe.imageMediaId });
  updateRecipe(recipe.id, patchForRecipeMedia(published));
  return published;
}

export function nextGeneratedRecipeImageCheckDelay(recipes: readonly GeneratedRecipeImageCandidate[], now = Date.now(), renewalWindowMs = GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS) {
  let delay = GENERATED_RECIPE_IMAGE_MAX_SCHEDULE_MS;
  for (const recipe of recipes) {
    if (!generated(recipe)) continue;
    if (clientState(recipe.imageStatus) === 'generating') delay = Math.min(delay, 30_000);
    const expires = Date.parse(recipe.imageUrlExpiresAt ?? '');
    if (Number.isFinite(expires)) delay = Math.min(delay, Math.max(1_000, expires - renewalWindowMs - now));
    const previewExpires = Date.parse(recipe.imagePreviewUrlExpiresAt ?? '');
    if (Number.isFinite(previewExpires)) delay = Math.min(delay, Math.max(1_000, previewExpires - renewalWindowMs - now));
  }
  return delay;
}

export function generatedRecipeImageLifecycleKey(recipes: readonly GeneratedRecipeImageCandidate[]): string {
  return recipes
    .map((recipe) => [recipe.id, recipe.imageStatus ?? '', recipe.imageId ?? '', recipe.imageMediaId ?? '', recipe.image ?? '', recipe.imageUrlExpiresAt ?? '', recipe.imagePreviewErrorCode ?? '', recipe.imageProvenance ?? ''].join(':'))
    .join('|');
}

export function useGeneratedRecipeImageRefresh({ accountId, recipes, updateRecipe, restoreRecipe, renewalWindowMs }: {
  accountId?: string | null; recipes: readonly GeneratedRecipeImageCandidate[]; updateRecipe: UpdateGeneratedRecipe; restoreRecipe?: (recipe: CaloraRecipe) => void; renewalWindowMs?: number;
}): void {
  const recipesRef = useRef(recipes); recipesRef.current = recipes;
  const updateRef = useRef(updateRecipe); updateRef.current = updateRecipe;
  const restoreRef = useRef(restoreRecipe); restoreRef.current = restoreRecipe;
  const accountRef = useRef(accountId ?? null); accountRef.current = accountId ?? null;
  const lifecycleKey = generatedRecipeImageLifecycleKey(recipes);
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    const reconcile = async () => {
      const currentAccount = accountId;
      try {
        const recovered = await listGeneratedRecipeMedia();
        if (cancelled || accountRef.current !== currentAccount) return;
        const byRecipe = new Map(recovered.media.map((media) => [media.clientRecipeId, media]));
        recovered.media.forEach((media) => {
          if (recipesRef.current.some((recipe) => recipe.id === media.clientRecipeId)) return;
          const restored = restoredRecipeFromMedia(media);
          if (restored) restoreRef.current?.(restored);
        });
        recipesRef.current.forEach((recipe) => {
          const media = byRecipe.get(recipe.id);
          if (!media) return;
          const patch = reconcileGeneratedRecipeMedia(recipe, media, renewalWindowMs);
          if (mediaPatchChanged(recipe, patch)) updateRef.current(recipe.id, patch);
          const reconciledRecipe = { ...recipe, ...patch };
          if (media.status === 'stored' && media.semanticReviewState === 'needs_review') {
            void requestGeneratedRecipeImageReviewPreview({
              accountId: currentAccount,
              recipe: reconciledRecipe,
              updateRecipe: updateRef.current,
              isAccountActive: (id) => accountRef.current === id,
            });
          }
          if (isStaleGeneratedRecipeMedia(media)) {
            void ensureGeneratedRecipeImage({
              accountId: currentAccount,
              recipe: reconciledRecipe,
              updateRecipe: updateRef.current,
              isAccountActive: (id) => accountRef.current === id,
              force: true,
            }).catch(() => undefined);
          }
        });
      } catch { /* Local encrypted state remains an offline cache. */ }
      if (cancelled || accountRef.current !== currentAccount) return;
      recipesRef.current.forEach((recipe) => {
        void ensureGeneratedRecipeImage({ accountId: currentAccount, recipe, updateRecipe: updateRef.current, isAccountActive: (id) => accountRef.current === id }).catch(() => undefined);
        void refreshGeneratedRecipeImage({ accountId: currentAccount, recipe, updateRecipe: updateRef.current, isAccountActive: (id) => accountRef.current === id, renewalWindowMs });
        void requestGeneratedRecipeImageReviewPreview({ accountId: currentAccount, recipe, updateRecipe: updateRef.current, isAccountActive: (id) => accountRef.current === id });
      });
    };
    void reconcile();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { void reconcile().finally(schedule); }, nextGeneratedRecipeImageCheckDelay(recipesRef.current, Date.now(), renewalWindowMs));
    };
    schedule();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void reconcile(); });
    return () => { cancelled = true; clearTimeout(timer); subscription.remove(); };
  }, [accountId, lifecycleKey, renewalWindowMs]);
}
