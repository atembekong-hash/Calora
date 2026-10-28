export class PromiseTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, operation: string) {
    super(`${operation} timed out after ${timeoutMs}ms.`);
    this.name = 'PromiseTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Bound a startup operation without pretending that the underlying native or
 * network work succeeded. The operation cannot be cancelled by this helper;
 * callers must treat the timeout as a real failure and expose recovery UI.
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new PromiseTimeoutError(timeoutMs, operationName)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
