export type NotFoundRouteRouter = {
  // This helper only recovers to the root. Keeping the argument literal lets
  // Expo Router's generated typed-route API satisfy the adapter safely.
  replace: (path: '/') => void;
};

export type WebLocationReplacement = {
  replace: (path: string) => void;
};

/**
 * Completes unknown-route recovery without relying on Expo Router to resolve
 * an unmatched web route. Native keeps the in-app router transition; web uses
 * a document navigation so reverse-proxy-prefixed or unknown URLs cannot stay
 * stranded on the not-found screen.
 */
export function recoverFromNotFoundRoute({
  platform,
  router,
  webLocation,
}: {
  platform: string;
  router: NotFoundRouteRouter;
  webLocation?: WebLocationReplacement | null;
}): 'web-location' | 'router' {
  if (platform === 'web' && webLocation) {
    webLocation.replace('/');
    return 'web-location';
  }

  router.replace('/');
  return 'router';
}
