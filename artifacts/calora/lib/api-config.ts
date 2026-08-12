/**
 * Resolves the absolute API origin required by native builds.
 * EAS inlines EXPO_PUBLIC_* values at build time, so this deliberately fails
 * early when the selected build environment has not supplied the origin.
 */
export function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!configuredUrl) {
    throw new Error(
      '[CaloraApp] Missing required Expo public configuration: EXPO_PUBLIC_API_URL. ' +
        'Set it to the HTTPS origin serving the Calora API (without /api), in the EAS environment selected by this build profile, then rebuild.',
    );
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error(
      '[CaloraApp] EXPO_PUBLIC_API_URL must be an absolute HTTPS URL without a path, query, or fragment.',
    );
  }

  if (
    url.protocol !== 'https:' ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(
      '[CaloraApp] EXPO_PUBLIC_API_URL must be an absolute HTTPS origin without a path, query, fragment, or credentials.',
    );
  }

  return url.origin;
}