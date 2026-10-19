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

/**
 * Image integrity is intentionally asymmetric: a canonical Calora catalogue
 * record may use only its stable bundled meal photo; every other recipe must
 * supply an independently trusted remote food URL. An unknown record remains
 * image-less rather than borrowing a visually plausible but wrong dish.
 */
export function resolveDiscoverRecipeImageSource(recipe: DiscoverRecipeImageRecord): ImageSource | null {
  if (recipe.sourceType === 'calora_catalog') {
    const catalogueId = recipe.sourceId ?? recipe.id.replace(/^calora-original:/, '');
    return plannerImageSource(plannerImageKeyForMealId(catalogueId, recipe.name), null);
  }
  const url = normalizeFoodImageUrl(recipe.image);
  return url ? { uri: url } : null;
}
