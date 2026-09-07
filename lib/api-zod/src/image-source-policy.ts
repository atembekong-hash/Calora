export const TRUSTED_FOOD_IMAGE_DOMAINS = [
  'openfoodfacts.org',
  'unsplash.com',
  'themealdb.com',
  'fatsecret.com',
  'ftscrt.com',
] as const;

type ParsedUrl = { protocol: string; hostname: string; toString(): string };

export function normalizeTrustedFoodImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed) || trimmed.length > 2048) return undefined;
  try {
    const UrlConstructor = (globalThis as unknown as { URL?: new (value: string) => ParsedUrl }).URL;
    if (!UrlConstructor) return undefined;
    const parsed = new UrlConstructor(trimmed);
    if (parsed.protocol !== 'https:' || !parsed.hostname) return undefined;
    const hostname = parsed.hostname.toLowerCase();
    if (!TRUSTED_FOOD_IMAGE_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}