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
  if (value === 'localhost' || value.endsWith('.localhost') || value.endsWith('.local')) return true;
  // External provider metadata is never a capability to contact an IP literal.
  // Rejecting every IP literal is safer than attempting to classify every IPv4
  // and IPv6 special-use range or trusting a future DNS resolution.
  if (value.includes(':') || /^\d+(?:\.\d+){3}$/.test(value)) return true;
  return false;
}

/**
 * Normalizes a display-only third-party link. This parser does not resolve,
 * fetch, proxy, or follow the URL, so it cannot authorize server-side egress.
 */
export function normalizeExternalHttpsUrl(value: unknown): string | undefined {
  const parsed = parseSecureImageUrl(value);
  if (!parsed || isPrivateNetworkHostname(parsed.hostname)) return undefined;
  return parsed.toString();
}

export function normalizeTrustedFoodImageUrl(value: unknown): string | undefined {
  const normalized = normalizeExternalHttpsUrl(value);
  if (!normalized) return undefined;
  const parsed = parseSecureImageUrl(normalized);
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
