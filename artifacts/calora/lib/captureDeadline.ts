export const CAPTURE_IMAGE_PREPARATION_TIMEOUT_MS = 30_000;
export const CAPTURE_ANALYSIS_TIMEOUT_MS = 45_000;
export const CAPTURE_CAMERA_TIMEOUT_MS = 15_000;

export class CaptureOperationTimeoutError extends Error {
  readonly name = "CaptureOperationTimeoutError";

  constructor(message = "Scan timed out before analysis could finish.") {
    super(message);
  }
}

/**
 * Bounds a native or network capture operation without assuming that every
 * platform promise honours AbortSignal. A late completion is safely ignored by
 * the caller's operation-id fence after this promise has rejected.
 */
export function withCaptureDeadline<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      onTimeout?.();
      reject(new CaptureOperationTimeoutError());
    }, timeoutMs);

    void operation().then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
