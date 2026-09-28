import {
  analyzeCapture,
  type CaptureAnalysis,
  type CaptureAnalyzeInput,
  type CustomFetchOptions,
} from "@workspace/api-client-react";
import { supabase } from "@/lib/supabase";

/**
 * Capture analysis is bound to the currently active Supabase identity rather
 * than a React render's access-token snapshot. Native OAuth handoffs and app
 * resumes can rotate that token before the Scan screen re-renders.
 */
export class CaptureRequestAuthenticationError extends Error {
  readonly name = "CaptureRequestAuthenticationError";

  constructor(message = "Sign in again before analyzing a capture.") {
    super(message);
  }
}

export class CaptureRequestIdentityChangedError extends Error {
  readonly name = "CaptureRequestIdentityChangedError";

  constructor() {
    super("Your signed-in account changed before this scan could be sent.");
  }
}

function captureAbortError(reason?: unknown): Error {
  if (reason instanceof Error) return reason;
  const error = new Error("Scan cancelled.");
  error.name = "AbortError";
  return error;
}

/**
 * Supplies a fresh native bearer token and verifies the user scope before the
 * initial request and any one-time 401 refresh retry. This prevents a pending
 * Scan request from crossing an account boundary while avoiding stale tokens
 * held in screen state after OAuth, resume, or automatic refresh.
 */
export function createCaptureRequestOptions(
  accountId: string | null | undefined,
  signal: AbortSignal,
): CustomFetchOptions {
  const expectedAccountId = accountId?.trim();
  if (!expectedAccountId) throw new CaptureRequestAuthenticationError();

  const requireCurrentSession = async () => {
    if (signal.aborted) throw captureAbortError(signal.reason);
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      throw new CaptureRequestAuthenticationError();
    }
    if (data.session.user.id !== expectedAccountId) {
      throw new CaptureRequestIdentityChangedError();
    }
    return data.session;
  };

  const assertIdentity = async () => {
    await requireCurrentSession();
  };

  const getToken = async () => (await requireCurrentSession()).access_token;

  const refreshToken = async () => {
    await assertIdentity();
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new CaptureRequestAuthenticationError();
    }
    if (data.session.user.id !== expectedAccountId) {
      throw new CaptureRequestIdentityChangedError();
    }
    return data.session.access_token;
  };

  return {
    signal,
    authIdentityGuard: assertIdentity,
    authTokenGetter: getToken,
    authTokenRefresher: refreshToken,
  };
}

export function requestAuthenticatedCaptureAnalysis(
  input: CaptureAnalyzeInput,
  accountId: string | null | undefined,
  signal: AbortSignal,
): Promise<CaptureAnalysis> {
  return analyzeCapture(input, createCaptureRequestOptions(accountId, signal));
}
