/**
 * Bounds a paid provider request even when the underlying SDK does not honor
 * an AbortSignal. The signal lets compliant requests stop promptly; the race
 * ensures callers never wait indefinitely on a stuck provider transport.
 */
export async function withAiProviderDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error("AI provider deadline exceeded"));
      }, timeoutMs);
    });
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}