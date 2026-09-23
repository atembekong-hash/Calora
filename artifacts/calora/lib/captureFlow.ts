export type CaptureStage = 'idle' | 'preparing' | 'uploading' | 'review' | 'error';

export type CaptureFailureKind =
  | 'aborted'
  | 'interrupted'
  | 'local_camera'
  | 'preparation'
  | 'authentication'
  | 'rate_limited'
  | 'timeout'
  | 'provider'
  | 'server'
  | 'offline'
  | 'malformed_response'
  | 'invalid_input'
  | 'unknown';

export type CaptureFlowState = {
  operationId: number;
  stage: CaptureStage;
  failure?: {
    kind: CaptureFailureKind;
    message: string;
    retryAfterSeconds?: number;
  };
};

export type CaptureFlowAction =
  | { type: 'begin'; operationId: number; stage: 'preparing' | 'uploading' }
  | { type: 'uploading'; operationId: number }
  | { type: 'review'; operationId: number }
  | { type: 'failed'; operationId: number; failure: CaptureFlowState['failure'] }
  | { type: 'reset'; operationId: number };

export const initialCaptureFlowState: CaptureFlowState = {
  operationId: 0,
  stage: 'idle',
};

/**
 * Every asynchronous completion carries its operation id. Older camera,
 * library, or network completions are therefore ignored after retake, cancel,
 * navigation, or a foreground interruption starts a newer operation.
 */
export function captureFlowReducer(
  state: CaptureFlowState,
  action: CaptureFlowAction,
): CaptureFlowState {
  if (action.type === 'reset') {
    return action.operationId >= state.operationId
      ? { operationId: action.operationId, stage: 'idle' }
      : state;
  }
  if (action.type !== 'begin' && action.operationId !== state.operationId) {
    return state;
  }

  switch (action.type) {
    case 'begin':
      return { operationId: action.operationId, stage: action.stage };
    case 'uploading':
      return { ...state, stage: 'uploading', failure: undefined };
    case 'review':
      return { ...state, stage: 'review', failure: undefined };
    case 'failed':
      return { operationId: action.operationId, stage: 'error', failure: action.failure };
  }
}

export function isCaptureBusy(state: CaptureFlowState): boolean {
  return state.stage === 'preparing' || state.stage === 'uploading';
}

type ApiErrorShape = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  data?: unknown;
  headers?: { get?: (name: string) => string | null };
};

function retryAfterSeconds(error: ApiErrorShape): number | undefined {
  const fromBody = error.data && typeof error.data === 'object'
    ? Number((error.data as { retryAfterSecs?: unknown }).retryAfterSecs)
    : Number.NaN;
  const fromHeader = Number(error.headers?.get?.('Retry-After'));
  const value = Number.isFinite(fromBody) && fromBody > 0 ? fromBody : fromHeader;
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : undefined;
}

/** Maps transport outcomes to a recovery instruction without exposing image data. */
export function classifyCaptureError(error: unknown): NonNullable<CaptureFlowState['failure']> {
  const candidate = (error && typeof error === 'object' ? error : {}) as ApiErrorShape;
  const status = typeof candidate.status === 'number' ? candidate.status : undefined;
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  const name = typeof candidate.name === 'string' ? candidate.name : '';

  if (name === 'AbortError' || /aborted|cancelled/i.test(message)) {
    return { kind: 'aborted', message: 'Scan cancelled. Your image was not submitted.' };
  }
  if (name === 'CaptureImagePreparationError') {
    return { kind: 'preparation', message: message || 'This image could not be prepared. Retake it or choose a supported photo.' };
  }
  if (name === 'CaptureCameraError') {
    return { kind: 'local_camera', message: message || 'The camera could not capture a photo. Check camera access and try again.' };
  }
  if (name === 'ResponseParseError' || /failed to parse response|unexpected token/i.test(message)) {
    return { kind: 'malformed_response', message: 'Calora received an invalid analysis response. Please try again.' };
  }
  if (status === 401 || status === 403) {
    return { kind: 'authentication', message: 'Sign in again before analyzing a photo.' };
  }
  if (status === 429) {
    const retryAfter = retryAfterSeconds(candidate);
    return {
      kind: 'rate_limited',
      message: retryAfter
        ? `Too many scans. Try again in about ${retryAfter} seconds.`
        : 'Too many scans. Please wait a moment before trying again.',
      retryAfterSeconds: retryAfter,
    };
  }
  if (status === 408 || status === 504 || /deadline|timed out|timeout/i.test(message)) {
    return { kind: 'timeout', message: 'Analysis took too long. Your photo is still private on this device; retry when ready.' };
  }
  if (status === 400 || status === 413 || status === 415 || status === 422) {
    return { kind: 'invalid_input', message: 'This image could not be prepared for analysis. Choose or retake a supported photo.' };
  }
  if (status === 502) {
    return { kind: 'provider', message: 'The analysis service is temporarily unavailable. Your camera photo was captured successfully; retry later.' };
  }
  if (status === 503 || (status !== undefined && status >= 500)) {
    return { kind: 'server', message: 'Calora’s capture service is temporarily unavailable. Your camera photo was captured successfully; retry later.' };
  }
  if (name === 'TypeError' || /network request failed|network|offline|failed to fetch/i.test(message)) {
    return { kind: 'offline', message: 'No network connection. Reconnect, then retry the same private photo or retake it.' };
  }
  return { kind: 'unknown', message: 'Analysis could not finish. Retry, retake the photo, or use another way to log your meal.' };
}

export function interruptedCaptureFailure(): NonNullable<CaptureFlowState['failure']> {
  return {
    kind: 'interrupted',
    message: 'Scan paused while Calora was in the background. Retry when you return.',
  };
}

export function localCameraFailure(message = 'The camera could not capture a photo. Check camera access and try again.'): NonNullable<CaptureFlowState['failure']> {
  return { kind: 'local_camera', message };
}

export function isAbortError(error: unknown): boolean {
  const candidate = (error && typeof error === 'object' ? error : {}) as ApiErrorShape;
  return candidate.name === 'AbortError' || (typeof candidate.message === 'string' && /aborted|cancelled/i.test(candidate.message));
}
