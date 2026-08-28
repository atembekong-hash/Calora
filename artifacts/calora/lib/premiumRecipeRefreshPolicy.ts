export const PREMIUM_RECIPE_REFRESH_POLICY = {
  staleTime: 5 * 60_000,
  refetchOnMount: "always",
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;