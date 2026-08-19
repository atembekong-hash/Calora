export type FoodImageSource = 'provider' | 'recipe' | 'planner';

export type FoodImageCategory = 'breakfast' | 'main' | 'snack' | 'drink';

const TRUSTED_IMAGE_DOMAINS = [
  'openfoodfacts.org',
  'unsplash.com',
  'themealdb.com',
  'fatsecret.com',
  'ftscrt.com',
] as const;

const DRINK_WORDS = /\b(water|coffee|tea|juice|smoothie|shake|milk|latte|soda|drink|beverage)\b/i;
const SNACK_WORDS = /\b(apple|banana|berry|berries|fruit|nuts?|yogurt|snack|bar|cookie|chips?|popcorn)\b/i;
const BREAKFAST_WORDS = /\b(oats?|cereal|egg|toast|pancake|waffle|breakfast|granola)\b/i;

/**
 * Only durable HTTPS URLs are stored with diary entries. Temporary camera,
 * data, blob, and file URIs must never escape the capture review flow.
 */
export function normalizeFoodImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed) || trimmed.length > 2048) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || !parsed.hostname) return undefined;
    const hostname = parsed.hostname.toLowerCase();
    const trusted = TRUSTED_IMAGE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
    return trusted ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeFoodImageMetadata(
  imageUrl: unknown,
  imageSource: unknown,
): { imageUrl?: string; imageSource?: FoodImageSource } {
  const normalizedUrl = normalizeFoodImageUrl(imageUrl);
  const normalizedSource = imageSource === 'provider' || imageSource === 'recipe' || imageSource === 'planner'
    ? imageSource
    : undefined;
  return {
    imageUrl: normalizedUrl,
    imageSource: normalizedUrl ? normalizedSource : undefined,
  };
}

export function foodImageCategory(food: { name: string; meal?: string }): FoodImageCategory {
  if (DRINK_WORDS.test(food.name)) return 'drink';
  if (food.meal === 'Breakfast' || BREAKFAST_WORDS.test(food.name)) return 'breakfast';
  if (food.meal === 'Snack' || SNACK_WORDS.test(food.name)) return 'snack';
  return 'main';
}