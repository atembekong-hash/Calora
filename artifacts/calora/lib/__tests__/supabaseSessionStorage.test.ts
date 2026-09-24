import { describe, expect, it, vi } from 'vitest';
import {
  createSupabaseSessionStorage,
  createWebSessionStorage,
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

describe('Supabase web session storage adapter', () => {
  function createBrowserStore() {
    const values = new Map<string, string>();
    return {
      values,
      store: {
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
        removeItem: vi.fn((key: string) => { values.delete(key); }),
      },
    };
  }

  it('survives a reload with every Supabase PKCE verifier key but no session token', async () => {
    const browser = createBrowserStore();
    const beforeRedirect = createWebSessionStorage(browser.store);

    await beforeRedirect.setItem('calora-auth-storage', '{"access_token":"must-stay-memory-only"}');
    await beforeRedirect.setItem('calora-auth-storage-code-verifier', 'legacy-verifier');
    await beforeRedirect.setItem('calora-auth-storage-flow-flow-id-code-verifier', 'flow-verifier');
    await beforeRedirect.setItem('calora-auth-storage-flows-code-verifier', '["flow-id"]');

    const afterRedirect = createWebSessionStorage(browser.store);
    await expect(afterRedirect.getItem('calora-auth-storage')).resolves.toBeNull();
    await expect(afterRedirect.getItem('calora-auth-storage-code-verifier')).resolves.toBe('legacy-verifier');
    await expect(afterRedirect.getItem('calora-auth-storage-flow-flow-id-code-verifier')).resolves.toBe('flow-verifier');
    await expect(afterRedirect.getItem('calora-auth-storage-flows-code-verifier')).resolves.toBe('["flow-id"]');

    expect([...browser.values.keys()].sort()).toEqual([
      'calora-auth-storage-code-verifier',
      'calora-auth-storage-flow-flow-id-code-verifier',
      'calora-auth-storage-flows-code-verifier',
    ]);
    expect([...browser.values.values()].join(' ')).not.toContain('access_token');
  });

  it('removes verifier material from the browser store after exchange', async () => {
    const browser = createBrowserStore();
    const storage = createWebSessionStorage(browser.store);
    const key = 'calora-auth-storage-flow-flow-id-code-verifier';

    await storage.setItem(key, 'flow-verifier');
    await storage.removeItem(key);

    expect(browser.values.has(key)).toBe(false);
    expect(browser.store.removeItem).toHaveBeenCalledWith(key);
  });

  it('fails PKCE setup explicitly when browser storage is unavailable while keeping sessions memory-only', async () => {
    const storage = createWebSessionStorage(null);

    await storage.setItem('calora-auth-storage', 'process-local-session');
    await expect(storage.getItem('calora-auth-storage')).resolves.toBe('process-local-session');
    await expect(storage.setItem('calora-auth-storage-code-verifier', 'verifier')).rejects.toMatchObject({
      name: 'SupabaseSessionStorageError',
      operation: 'write',
    });
  });
});
