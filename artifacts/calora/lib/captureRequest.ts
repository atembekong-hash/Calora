import {
  analyzeCapture,
  type CaptureAnalysis,
  type CaptureAnalyzeInput,
  type CustomFetchOptions,
} from "@workspace/api-client-react";

/**
 * Scan can begin immediately after a native OAuth/session handoff. Supplying the
 * screen's already-authenticated session token avoids relying on a separate
 * storage read to attach the first protected capture request. customFetch still
 * performs its normal one-time refresh retry if this snapshot is stale.
 */
export class CaptureRequestAuthenticationError extends Error {
  readonly name = "CaptureRequestAuthenticationError";

  constructor() {
    super("Sign in again before analyzing a capture.");
  }
}

export function createCaptureRequestOptions(
  accessToken: string | null | undefined,
  signal: AbortSignal,
): CustomFetchOptions {
  const token = accessToken?.trim();
  if (!token) throw new CaptureRequestAuthenticationError();

  return {
    signal,
    authTokenGetter: () => token,
  };
}

export function requestAuthenticatedCaptureAnalysis(
  input: CaptureAnalyzeInput,
  accessToken: string | null | undefined,
  signal: AbortSignal,
): Promise<CaptureAnalysis> {
  return analyzeCapture(
    input,
    createCaptureRequestOptions(accessToken, signal),
  );
}
