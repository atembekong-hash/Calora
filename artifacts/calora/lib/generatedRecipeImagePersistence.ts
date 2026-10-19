type GeneratedRecipeMediaFields = {
  image?: unknown;
  imageId?: string | null;
  imageMediaId?: string | null;
  imageProvenance?: string | null;
  imageUrlExpiresAt?: unknown;
  imagePreviewUrl?: unknown;
  imagePreviewUrlExpiresAt?: unknown;
  imagePreviewErrorCode?: unknown;
  imagePreviewAttemptedAt?: unknown;
};

/**
 * Signed recipe-photo URLs are short-lived owner capabilities, not durable
 * recipe data. Keep stable server IDs and status locally, but never commit a
 * preview or accepted-image capability to encrypted device storage or exports.
 */
export function sanitizeGeneratedRecipeMediaForPersistence<T>(recipes: readonly T[]): T[] {
  return recipes.map((recipe) => {
    if (!recipe || typeof recipe !== 'object') return recipe;
    const media = recipe as T & GeneratedRecipeMediaFields;
    const isGeneratedMedia = media.imageProvenance === 'generated'
      || Boolean(media.imageId)
      || Boolean(media.imageMediaId);
    const {
      imagePreviewUrl: _imagePreviewUrl,
      imagePreviewUrlExpiresAt: _imagePreviewUrlExpiresAt,
      imagePreviewErrorCode: _imagePreviewErrorCode,
      imagePreviewAttemptedAt: _imagePreviewAttemptedAt,
      ...withoutPreview
    } = media;
    if (!isGeneratedMedia) return withoutPreview as T;
    const {
      image: _image,
      imageUrlExpiresAt: _imageUrlExpiresAt,
      ...withoutCapabilities
    } = withoutPreview;
    return withoutCapabilities as T;
  });
}

export function sanitizeRecipeMediaStateForPersistence<T extends { localRecipes?: readonly unknown[] }>(state: T): T {
  if (!state.localRecipes) return state;
  return {
    ...state,
    localRecipes: sanitizeGeneratedRecipeMediaForPersistence(state.localRecipes),
  } as T;
}
