import type { CustomFetchOptions } from '@workspace/api-client-react';

export const DISCOVER_RECIPE_REQUEST_TIMEOUT_MS = 20_000;

/**
 * Open Discover data may be provider-backed. Keep a caller deadline so an
 * initial network failure reaches the retry UI rather than remaining pending
 * forever. The request still receives React Query's cancellation signal.
 */
export const DISCOVER_RECIPE_REQUEST_OPTIONS = {
  timeoutMs: DISCOVER_RECIPE_REQUEST_TIMEOUT_MS,
} satisfies Pick<CustomFetchOptions, 'timeoutMs'>;

type RequestError = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
};

function requestStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as RequestError).status;
  return typeof status === 'number' && Number.isFinite(status) ? status : null;
}

/** Retry exactly one transient transport, timeout, or server error. */
export function shouldRetryDiscoverRecipeRequest(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 1) return false;
  const status = requestStatus(error);
  if (status === 408 || (status != null && status >= 500)) return true;
  if (status != null) return false;
  const candidate = error as RequestError | null;
  const name = typeof candidate?.name === 'string' ? candidate.name : '';
  const message = typeof candidate?.message === 'string' ? candidate.message : '';
  return name === 'ApiRequestTimeoutError'
    || /network request failed|failed to fetch|network connection|network error|timed out|timeout/i.test(message);
}

export function discoverRecipeRetryDelay(): number {
  return 600;
}

export const DISCOVER_RECIPE_REFRESH_POLICY = {
  staleTime: 10 * 60_000,
  retry: shouldRetryDiscoverRecipeRequest,
  retryDelay: discoverRecipeRetryDelay,
} as const;
