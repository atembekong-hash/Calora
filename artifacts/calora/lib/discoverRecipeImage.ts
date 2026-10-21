import type { ImageSource } from 'expo-image';
import { plannerImageSource } from '@/lib/mealImages';
import { plannerImageKeyForMealId } from '@/lib/mealImageIdentity';
import { normalizeFoodImageUrl } from '@/lib/foodImageMetadata';

export type DiscoverRecipeImageRecord = {
  id: string;
  name: string;
  image?: string | null;
  sourceType?: string;
  sourceId?: string;
};

export type DiscoverRecipeImageReason = 'catalogue_asset' | 'catalogue_identity_unknown' | 'provider' | 'missing' | 'untrusted';

export type DiscoverRecipeImageInspection = {
  source: ImageSource | null;
  /** A bounded diagnostic category with no recipe title, URL, or account data. */
  reason: DiscoverRecipeImageReason;
};

/**
 * Image integrity is intentionally asymmetric: a canonical Calora catalogue
 * record may use only its stable bundled meal photo; every other recipe must
 * supply an independently trusted remote food URL. An unknown record remains
 * image-less rather than borrowing a visually plausible but wrong dish.
 */
export function inspectDiscoverRecipeImage(recipe: DiscoverRecipeImageRecord): DiscoverRecipeImageInspection {
  if (recipe.sourceType === 'calora_catalog') {
    const catalogueId = recipe.sourceId ?? recipe.id.replace(/^calora-original:/, '');
    const source = plannerImageSource(plannerImageKeyForMealId(catalogueId, recipe.name), null);
    return source
      ? { source, reason: 'catalogue_asset' }
      : { source: null, reason: 'catalogue_identity_unknown' };
  }
  const url = normalizeFoodImageUrl(recipe.image);
  if (url) return { source: { uri: url }, reason: 'provider' };
  return {
    source: null,
    reason: typeof recipe.image === 'string' && recipe.image.trim() ? 'untrusted' : 'missing',
  };
}

export function resolveDiscoverRecipeImageSource(recipe: DiscoverRecipeImageRecord): ImageSource | null {
  return inspectDiscoverRecipeImage(recipe).source;
}
