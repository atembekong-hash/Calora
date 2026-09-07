import { normalizeTrustedFoodImageUrl } from '@workspace/api-zod/image-source-policy';

export type FoodImageSource = 'provider' | 'recipe' | 'planner' | 'restaurant_representative';

export type FoodImageCategory = 'breakfast' | 'main' | 'snack' | 'drink';

const DRINK_WORDS = /\b(water|coffee|tea|juice|smoothie|shake|milk|latte|soda|drink|beverage)\b/i;
const SNACK_WORDS = /\b(apple|banana|berry|berries|fruit|nuts?|yogurt|snack|bar|cookie|chips?|popcorn)\b/i;
const BREAKFAST_WORDS = /\b(oats?|cereal|egg|toast|pancake|waffle|breakfast|granola)\b/i;

/**
 * Only durable HTTPS URLs are stored with diary entries. Temporary camera,
 * data, blob, and file URIs must never escape the capture review flow.
 */
export function normalizeFoodImageUrl(value: unknown): string | undefined {
  return normalizeTrustedFoodImageUrl(value);
}

export function normalizeFoodImageMetadata(
  imageUrl: unknown,
  imageSource: unknown,
): { imageUrl?: string; imageSource?: FoodImageSource } {
  const normalizedUrl = normalizeFoodImageUrl(imageUrl);
  const normalizedSource = imageSource === 'provider'
    || imageSource === 'recipe'
    || imageSource === 'planner'
    || imageSource === 'restaurant_representative'
    ? imageSource
    : undefined;
  return {
    imageUrl: normalizedUrl,
    // A representative bundled restaurant asset has no URL by design. Keep
    // that provenance label so the local identity remains truthful after
    // diary restore; URL-backed sources still require a validated URL.
    imageSource: normalizedSource === 'restaurant_representative'
      ? normalizedSource
      : normalizedUrl
        ? normalizedSource
        : undefined,
  };
}

export function foodImageCategory(food: { name: string; meal?: string }): FoodImageCategory {
  if (DRINK_WORDS.test(food.name)) return 'drink';
  if (food.meal === 'Breakfast' || BREAKFAST_WORDS.test(food.name)) return 'breakfast';
  if (food.meal === 'Snack' || SNACK_WORDS.test(food.name)) return 'snack';
  return 'main';
}