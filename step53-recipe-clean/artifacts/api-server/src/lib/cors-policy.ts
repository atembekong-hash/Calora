const DEFAULT_PRODUCTION_ORIGINS = [
  "https://calorie-coach-pie35449.replit.app",
] as const;

function parseConfiguredOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const url = new URL(value);
      if (
        url.protocol !== "https:" ||
        url.origin !== value.replace(/\/$/, "")
      ) {
        throw new Error(
          `Invalid CORS_ALLOWED_ORIGINS entry: "${value}". Expected an HTTPS origin.`,
        );
      }
      return url.origin;
    });
}

export function getAllowedCorsOrigins(
  configuredOrigins = process.env.CORS_ALLOWED_ORIGINS,
): ReadonlySet<string> {
  return new Set([
    ...DEFAULT_PRODUCTION_ORIGINS,
    ...parseConfiguredOrigins(configuredOrigins),
  ]);
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  environment = process.env.NODE_ENV,
  configuredOrigins = process.env.CORS_ALLOWED_ORIGINS,
): boolean {
  if (!origin || environment !== "production") return true;
  return getAllowedCorsOrigins(configuredOrigins).has(origin);
}