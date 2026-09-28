import type { CustomFetchOptions } from "@workspace/api-client-react";

export const PREMIUM_RECIPE_REQUEST_TIMEOUT_MS = 20_000;

/**
 * Plus results are scoped to the current authenticated account and may be
 * provider-backed. Do not allow a platform cache to satisfy a later request
 * with a conditional 304 response that has no reusable response body.
 */
export const PREMIUM_RECIPE_REQUEST_OPTIONS = {
  cache: "no-store",
  headers: {
    "Cache-Control": "no-cache",
  },
  timeoutMs: PREMIUM_RECIPE_REQUEST_TIMEOUT_MS,
} satisfies Pick<CustomFetchOptions, "cache" | "headers" | "timeoutMs">;

type RequestError = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
};

function requestStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as RequestError).status;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

export function premiumRecipeErrorStatus(error: unknown): number | null {
  return requestStatus(error);
}

export function isPremiumRecipeAuthenticationError(error: unknown): boolean {
  const status = requestStatus(error);
  return status === 401 || status === 403;
}

/**
 * Retry one transient connection, deadline, or server failure. Auth, input,
 * rate-limit, and provider-policy responses are deliberately never retried.
 */
export function shouldRetryPremiumRecipeRequest(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 1) return false;

  const status = requestStatus(error);
  if (status === 408 || (status != null && status >= 500)) return true;
  if (status != null) return false;

  const candidate = error as RequestError | null;
  const name = typeof candidate?.name === "string" ? candidate.name : "";
  const message =
    typeof candidate?.message === "string" ? candidate.message : "";
  return (
    name === "ApiRequestTimeoutError" ||
    /network request failed|failed to fetch|network connection|network error|timed out|timeout/i.test(
      message,
    )
  );
}

export function premiumRecipeRetryDelay(): number {
  return 600;
}
