import { describe, expect, it, vi } from 'vitest';
import { ClearAllDataError } from '../clearAllData';
import { completeDeviceLocalReset } from '../deviceLocalReset';

describe('completeDeviceLocalReset', () => {
  it('ends the local session only after a successful core erase', async () => {
    let resolveClear: (() => void) | undefined;
    const clearAllData = vi.fn(() => new Promise<void>((resolve) => {
      resolveClear = resolve;
    }));
    const signOut = vi.fn(async () => ({ error: null }));

    const reset = completeDeviceLocalReset(clearAllData, signOut);
    expect(clearAllData).toHaveBeenCalledOnce();
    expect(signOut).not.toHaveBeenCalled();

    resolveClear?.();
    await expect(reset).resolves.toEqual({ cleanupFailures: [], signOutError: null });
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('preserves the authenticated session when the core erase fails', async () => {
    const clearAllData = vi.fn(async () => {
      throw new ClearAllDataError('core-clear-failed');
    });
    const signOut = vi.fn(async () => ({ error: null }));

    await expect(completeDeviceLocalReset(clearAllData, signOut)).rejects.toMatchObject({
      kind: 'core-clear-failed',
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('ends the session after partial cleanup and preserves exact cleanup recovery labels', async () => {
    const clearAllData = vi.fn(async () => {
      throw new ClearAllDataError('partial-cleanup', ['profile photo', 'notifications']);
    });
    const signOut = vi.fn(async () => ({ error: null }));

    await expect(completeDeviceLocalReset(clearAllData, signOut)).resolves.toEqual({
      cleanupFailures: ['profile photo', 'notifications'],
      signOutError: null,
    });
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('returns a sign-out recovery outcome without claiming a successful local session end', async () => {
    const signOutError = new Error('secure storage unavailable');
    const signOut = vi.fn(async () => ({ error: signOutError }));

    await expect(completeDeviceLocalReset(async () => undefined, signOut)).resolves.toEqual({
      cleanupFailures: [],
      signOutError,
    });
  });
});
