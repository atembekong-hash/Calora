import { describe, expect, it, vi } from 'vitest';
import { PromiseTimeoutError, withTimeout } from '../withTimeout';

describe('withTimeout', () => {
  it('returns the operation result and clears its deadline', async () => {
    vi.useFakeTimers();
    const result = withTimeout(Promise.resolve('ready'), 100, 'test operation');
    await expect(result).resolves.toBe('ready');
    await vi.advanceTimersByTimeAsync(150);
    vi.useRealTimers();
  });

  it('rejects a stalled operation with a safe typed timeout', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise<string>(() => undefined), 250, 'session restore');
    const rejection = expect(pending).rejects.toMatchObject({
      name: 'PromiseTimeoutError',
      timeoutMs: 250,
      message: 'session restore timed out after 250ms.',
    });
    await vi.advanceTimersByTimeAsync(250);
    await rejection;
    expect(new PromiseTimeoutError(1, 'x')).toBeInstanceOf(Error);
    vi.useRealTimers();
  });
});
