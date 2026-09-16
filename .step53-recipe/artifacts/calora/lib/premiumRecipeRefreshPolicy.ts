export const PREMIUM_RECIPE_REFRESH_POLICY = {
  staleTime: 5 * 60_000,
  // A fresh, account-scoped response is a valid Plus session. Stale data is
  // revalidated on mount, while short navigations avoid restarting the provider.
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
} as const;