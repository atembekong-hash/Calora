export const PREMIUM_RECIPE_REFRESH_POLICY = {
  staleTime: 5 * 60_000,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
} as const;