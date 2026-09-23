export const TRUSTED_FOOD_IMAGE_DOMAINS = [
  'openfoodfacts.org',
  'unsplash.com',
  'themealdb.com',
  'fatsecret.com',
  'ftscrt.com',
] as const;

type ParsedUrl = {
  protocol: string;
  hostname: string;
  username: string;
  password: string;
  pathname: string;
  hash: string;
  searchParams: { get(name: string): string | null };
  toString(): string;
};

const GENERATED_IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseSecureImageUrl(value: unknown): ParsedUrl | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed) || trimmed.length > 2048) return undefined;
  try {
    const UrlConstructor = (globalThis as unknown as { URL?: new (value: string) => ParsedUrl }).URL;
    if (!UrlConstructor) return undefined;
    const parsed = new UrlConstructor(trimmed);
    if (
      parsed.protocol !== 'https:'
      || !parsed.hostname
      || parsed.username.length > 0
      || parsed.password.length > 0
      || parsed.hash.length > 0
    ) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function isPrivateNetworkHostname(hostname: string): boolean {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (value === 'localhost' || value === '::1' || value.endsWith('.local')) return true;
  if (/^(?:0|10|127)\./.test(value) || /^169\.254\./.test(value) || /^192\.168\./.test(value)) return true;
  if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(value) || /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(value)) return true;
  return /^198\.(?:1[89])\./.test(value);
}

export function normalizeTrustedFoodImageUrl(value: unknown): string | undefined {
  const parsed = parseSecureImageUrl(value);
  if (!parsed) return undefined;
  const hostname = parsed.hostname.toLowerCase();
  if (!TRUSTED_FOOD_IMAGE_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    return undefined;
  }
  return parsed.toString();
}

/**
 * Accepts only the AWS Signature V4 GET locator shape issued by Calora's
 * authenticated private recipe-photo API for the expected durable image ID.
 * The storage hostname remains deployment-configurable; the signed private
 * object path and complete signature envelope are the capability boundary.
 */
export function normalizeSignedRecipePhotoUrl(value: unknown, imageId: unknown, accountScope: unknown): string | undefined {
  if (
    typeof imageId !== 'string'
    || !GENERATED_IMAGE_ID.test(imageId)
    || typeof accountScope !== 'string'
    || accountScope.length < 1
    || accountScope.length > 200
    || /[\\/]/.test(accountScope)
  ) return undefined;
  const parsed = parseSecureImageUrl(value);
  if (!parsed || isPrivateNetworkHostname(parsed.hostname)) return undefined;

  let pathSegments: string[];
  try {
    pathSegments = decodeURIComponent(parsed.pathname).split('/').filter(Boolean);
  } catch {
    return undefined;
  }
  const privateIndex = pathSegments.findIndex((segment, index) =>
    segment === 'private' && pathSegments[index + 1] === 'recipe-photos');
  if (
    privateIndex < 0
    || pathSegments.length !== privateIndex + 4
    || pathSegments[privateIndex + 2] !== accountScope
    || pathSegments[privateIndex + 3] !== `${imageId}.png`
  ) return undefined;

  const algorithm = parsed.searchParams.get('X-Amz-Algorithm');
  const credential = parsed.searchParams.get('X-Amz-Credential');
  const signedAt = parsed.searchParams.get('X-Amz-Date');
  const expires = parsed.searchParams.get('X-Amz-Expires');
  const signedHeaders = parsed.searchParams.get('X-Amz-SignedHeaders');
  const signature = parsed.searchParams.get('X-Amz-Signature');
  const expiresSeconds = expires === null ? Number.NaN : Number(expires);
  if (
    algorithm !== 'AWS4-HMAC-SHA256'
    || !credential
    || !/^\d{8}T\d{6}Z$/.test(signedAt ?? '')
    || !Number.isInteger(expiresSeconds)
    || expiresSeconds < 1
    || expiresSeconds > 7 * 24 * 60 * 60
    || signedHeaders !== 'host'
    || !/^[0-9a-f]{64}$/i.test(signature ?? '')
  ) return undefined;
  return parsed.toString();
}
