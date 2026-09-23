import { describe, expect, it, vi } from 'vitest';
import {
  createSupabaseSessionStorage,
  getSafeSessionStorageErrorCategory,
  SupabaseSessionStorageError,
} from '../supabaseSessionStorage';

describe('Supabase encrypted session storage adapter', () => {
  it('reads, writes, and removes only through the supplied encrypted store', async () => {
    const secureStore = {
      getItemAsync: vi.fn().mockResolvedValue('encrypted-session'),
      setItemAsync: vi.fn().mockResolvedValue(undefined),
      deleteItemAsync: vi.fn().mockResolvedValue(undefined),
    };
    const storage = createSupabaseSessionStorage(secureStore);

    await expect(storage.getItem('auth-key')).resolves.toBe('encrypted-session');
    await storage.setItem('auth-key', 'session-payload');
    await storage.removeItem('auth-key');

    expect(secureStore.getItemAsync).toHaveBeenCalledWith('auth-key');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth-key', 'session-payload');
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('auth-key');
  });

  it.each([
    ['getItem', 'getItemAsync', 'read'],
    ['setItem', 'setItemAsync', 'write'],
    ['removeItem', 'deleteItemAsync', 'remove'],
  ] as const)('classifies a native %s failure without returning a plaintext fallback', async (method, nativeMethod, operation) => {
    const secureStore = {
      getItemAsync: vi.fn().mockRejectedValue(new Error('native detail must not escape')),
      setItemAsync: vi.fn().mockRejectedValue(new Error('native detail must not escape')),
      deleteItemAsync: vi.fn().mockRejectedValue(new Error('native detail must not escape')),
    };
    const storage = createSupabaseSessionStorage(secureStore);

    const attempt = method === 'getItem'
      ? storage.getItem('auth-key')
      : method === 'setItem'
        ? storage.setItem('auth-key', 'session-payload')
        : storage.removeItem('auth-key');

    await expect(attempt).rejects.toMatchObject({
      name: 'SupabaseSessionStorageError',
      operation,
    });
    expect(secureStore[nativeMethod]).toHaveBeenCalledTimes(1);
  });

  it('provides only a safe restoration category to UI and diagnostics', () => {
    expect(getSafeSessionStorageErrorCategory(new SupabaseSessionStorageError('read'))).toBe('secure_storage');
    expect(getSafeSessionStorageErrorCategory(new Error('provider token or storage detail'))).toBe('session_restore');
  });
});
