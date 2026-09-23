import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS,
  GENERATED_RECIPE_STALE_GENERATION_MS,
  clearGeneratedRecipeImageRefreshes,
  decideGeneratedRecipeImageRefresh,
  isStaleGeneratedRecipeMedia,
  refreshGeneratedRecipeImage,
  type GeneratedRecipeImageCandidate,
} from '../generatedRecipeImageLifecycle';

const NOW = Date.parse('2026-09-23T12:00:00.000Z');
const IMAGE_ID = '123e4567-e89b-42d3-a456-426614174000';
const accountActive = () => true;

function generatedRecipe(overrides: Partial<GeneratedRecipeImageCandidate> = {}): GeneratedRecipeImageCandidate {
  return {
    id: 'recipe-7',
    isLocal: true,
    sourceType: 'calora_ai',
    imageProvenance: 'generated',
    imageId: IMAGE_ID,
    image: 'https://storage.example/signed-old.png',
    imageUrlExpiresAt: new Date(NOW + 2 * GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS).toISOString(),
    imageStatus: 'ready',
    ...overrides,
  };
}

beforeEach(() => {
  clearGeneratedRecipeImageRefreshes();
});

afterEach(() => {
  clearGeneratedRecipeImageRefreshes();
});

describe('generated recipe image renewal decision', () => {
  it('reclaims only server generations that have exceeded the interrupted-request window', () => {
    expect(isStaleGeneratedRecipeMedia({
      status: 'generating',
      updatedAt: new Date(NOW - GENERATED_RECIPE_STALE_GENERATION_MS - 1).toISOString(),
    }, NOW)).toBe(true);
    expect(isStaleGeneratedRecipeMedia({
      status: 'generating',
      updatedAt: new Date(NOW - GENERATED_RECIPE_STALE_GENERATION_MS + 1).toISOString(),
    }, NOW)).toBe(false);
    expect(isStaleGeneratedRecipeMedia({
      status: 'url_ready',
      updatedAt: new Date(NOW - GENERATED_RECIPE_STALE_GENERATION_MS - 1).toISOString(),
    }, NOW)).toBe(false);
  });

  it('renews a generated locator inside the one-hour expiry window', () => {
    const recipe = generatedRecipe({ imageUrlExpiresAt: new Date(NOW + GENERATED_RECIPE_IMAGE_RENEWAL_WINDOW_MS - 1).toISOString() });

    expect(decideGeneratedRecipeImageRefresh(recipe, { now: NOW })).toEqual({ action: 'refresh', imageId: IMAGE_ID });
  });

  it('skips a generated locator that remains safely usable', () => {
    expect(decideGeneratedRecipeImageRefresh(generatedRecipe(), { now: NOW })).toEqual({ action: 'skip', reason: 'fresh' });
  });

  it('treats a missing or malformed expiry as renewable rather than trusting a stale locator', () => {
    expect(decideGeneratedRecipeImageRefresh(generatedRecipe({ imageUrlExpiresAt: null }), { now: NOW })).toEqual({ action: 'refresh', imageId: IMAGE_ID });
    expect(decideGeneratedRecipeImageRefresh(generatedRecipe({ imageUrlExpiresAt: 'not-a-date' }), { now: NOW })).toEqual({ action: 'refresh', imageId: IMAGE_ID });
  });

  it('renews a legacy local private photo that predates explicit provenance fields', () => {
    const legacyRecipe = generatedRecipe({
      imageProvenance: undefined,
      sourceType: undefined,
      imageUrlExpiresAt: new Date(NOW - 1).toISOString(),
    });

    expect(decideGeneratedRecipeImageRefresh(legacyRecipe, { now: NOW })).toEqual({ action: 'refresh', imageId: IMAGE_ID });
  });

  it('never renews a provider URL, even if malformed legacy data includes an image ID', () => {
    const providerRecipe = generatedRecipe({ imageProvenance: 'provider', sourceType: 'open', imageUrlExpiresAt: new Date(NOW - 1).toISOString() });

    expect(decideGeneratedRecipeImageRefresh(providerRecipe, { now: NOW })).toEqual({ action: 'skip', reason: 'not-generated' });
  });

  it('does not automatically retry an explicit refresh failure but permits a user-initiated retry', () => {
    const failed = generatedRecipe({ imageStatus: 'failed', imageUrlExpiresAt: new Date(NOW - 1).toISOString() });

    expect(decideGeneratedRecipeImageRefresh(failed, { now: NOW })).toEqual({ action: 'skip', reason: 'retryable-error' });
    expect(decideGeneratedRecipeImageRefresh(failed, { now: NOW, force: true })).toEqual({ action: 'refresh', imageId: IMAGE_ID });
  });
});

describe('generated recipe image renewal service', () => {
  it('updates the same recipe with only a renewed signed locator and explicit ready state', async () => {
    const updateRecipe = vi.fn();
    const requestPhotoUrl = vi.fn().mockResolvedValue({
      imageUrl: 'https://storage.example/signed-new.png',
      imageUrlExpiresAt: '2026-09-24T12:00:00.000Z',
    });

    const result = await refreshGeneratedRecipeImage({
      accountId: 'account-a',
      recipe: generatedRecipe({ imageUrlExpiresAt: new Date(NOW - 1).toISOString() }),
      updateRecipe,
      isAccountActive: accountActive,
      requestPhotoUrl,
      now: NOW,
    });

    expect(result).toEqual({ state: 'refreshed', recipeId: 'recipe-7', imageId: IMAGE_ID });
    expect(requestPhotoUrl).toHaveBeenCalledTimes(1);
    expect(requestPhotoUrl).toHaveBeenCalledWith({ imageId: IMAGE_ID });
    expect(updateRecipe.mock.calls).toEqual([
      ['recipe-7', { imageStatus: 'url_refreshing', imageErrorCode: null }],
      ['recipe-7', {
        image: 'https://storage.example/signed-new.png',
        imageUrlExpiresAt: '2026-09-24T12:00:00.000Z',
        imageStatus: 'url_ready',
        imageProvenance: 'generated',
      }],
    ]);
    expect(updateRecipe.mock.calls.flatMap(([, patch]) => Object.keys(patch))).not.toContain('id');
    expect(updateRecipe.mock.calls.flatMap(([, patch]) => Object.keys(patch))).not.toContain('imageId');
  });

  it('deduplicates concurrent direct mounts by account and durable image ID', async () => {
    const updateRecipe = vi.fn();
    let resolveRequest: ((value: { imageUrl: string; imageUrlExpiresAt: string }) => void) | undefined;
    const requestPhotoUrl = vi.fn(() => new Promise<{ imageUrl: string; imageUrlExpiresAt: string }>((resolve) => { resolveRequest = resolve; }));
    const expiringRecipe = generatedRecipe({ imageUrlExpiresAt: new Date(NOW - 1).toISOString() });

    const first = refreshGeneratedRecipeImage({ accountId: 'account-a', recipe: expiringRecipe, updateRecipe, isAccountActive: accountActive, requestPhotoUrl, now: NOW });
    const second = refreshGeneratedRecipeImage({ accountId: 'account-a', recipe: { ...expiringRecipe }, updateRecipe, isAccountActive: accountActive, requestPhotoUrl, now: NOW });
    resolveRequest?.({ imageUrl: 'https://storage.example/signed-new.png', imageUrlExpiresAt: '2026-09-24T12:00:00.000Z' });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { state: 'refreshed', recipeId: 'recipe-7', imageId: IMAGE_ID },
      { state: 'refreshed', recipeId: 'recipe-7', imageId: IMAGE_ID },
    ]);
    expect(requestPhotoUrl).toHaveBeenCalledTimes(1);
    expect(updateRecipe).toHaveBeenCalledTimes(2);
  });

  it('does not share a private image renewal request across accounts', async () => {
    const requestPhotoUrl = vi.fn().mockResolvedValue({ imageUrl: 'https://storage.example/signed-new.png', imageUrlExpiresAt: '2026-09-24T12:00:00.000Z' });
    const expiringRecipe = generatedRecipe({ imageUrlExpiresAt: new Date(NOW - 1).toISOString() });

    await Promise.all([
      refreshGeneratedRecipeImage({ accountId: 'account-a', recipe: expiringRecipe, updateRecipe: vi.fn(), isAccountActive: accountActive, requestPhotoUrl, now: NOW }),
      refreshGeneratedRecipeImage({ accountId: 'account-b', recipe: expiringRecipe, updateRecipe: vi.fn(), isAccountActive: accountActive, requestPhotoUrl, now: NOW }),
    ]);

    expect(requestPhotoUrl).toHaveBeenCalledTimes(2);
  });

  it('does not call the private route or mutate a local recipe without an account scope', async () => {
    const updateRecipe = vi.fn();
    const requestPhotoUrl = vi.fn();

    await expect(refreshGeneratedRecipeImage({
      accountId: null,
      recipe: generatedRecipe({ imageUrlExpiresAt: new Date(NOW - 1).toISOString() }),
      updateRecipe,
      isAccountActive: accountActive,
      requestPhotoUrl,
      now: NOW,
    })).resolves.toEqual({ state: 'skipped', recipeId: 'recipe-7', reason: 'signed-out' });

    expect(requestPhotoUrl).not.toHaveBeenCalled();
    expect(updateRecipe).not.toHaveBeenCalled();
  });

  it('preserves the old locator and durable image ID while surfacing an explicit failed state', async () => {
    const updateRecipe = vi.fn();
    const requestPhotoUrl = vi.fn().mockRejectedValue(new Error('Photo service unavailable'));

    await expect(refreshGeneratedRecipeImage({
      accountId: 'account-a',
      recipe: generatedRecipe({ imageUrlExpiresAt: new Date(NOW - 1).toISOString() }),
      updateRecipe,
      isAccountActive: accountActive,
      requestPhotoUrl,
      now: NOW,
    })).resolves.toEqual({ state: 'failed', recipeId: 'recipe-7', imageId: IMAGE_ID, error: 'Photo service unavailable' });

    expect(updateRecipe.mock.calls).toEqual([
      ['recipe-7', { imageStatus: 'url_refreshing', imageErrorCode: null }],
      ['recipe-7', { imageStatus: 'retryable_error', imageErrorCode: 'refresh_failed' }],
    ]);
  });

  it('does not mutate the newly active account when an older account request completes', async () => {
    const updateRecipe = vi.fn();
    let activeAccountId = 'account-a';
    let resolveRequest: ((value: { imageUrl: string; imageUrlExpiresAt: string }) => void) | undefined;
    const requestPhotoUrl = vi.fn(() => new Promise<{ imageUrl: string; imageUrlExpiresAt: string }>((resolve) => { resolveRequest = resolve; }));

    const refresh = refreshGeneratedRecipeImage({
      accountId: 'account-a',
      recipe: generatedRecipe({ imageUrlExpiresAt: new Date(NOW - 1).toISOString() }),
      updateRecipe,
      isAccountActive: (expectedAccountId) => activeAccountId === expectedAccountId,
      requestPhotoUrl,
      now: NOW,
    });
    expect(updateRecipe).toHaveBeenCalledWith('recipe-7', { imageStatus: 'url_refreshing', imageErrorCode: null });

    activeAccountId = 'account-b';
    resolveRequest?.({ imageUrl: 'https://storage.example/signed-new.png', imageUrlExpiresAt: '2026-09-24T12:00:00.000Z' });

    await expect(refresh).resolves.toEqual({ state: 'skipped', recipeId: 'recipe-7', reason: 'account-changed' });
    expect(updateRecipe).toHaveBeenCalledTimes(1);
  });
});
