/**
 * Encrypted persistence adapter for the Supabase auth client.
 *
 * Supabase expects a small async key/value interface.  Keeping the adapter in
 * one module makes native SecureStore failures observable by AuthProvider
 * instead of allowing them to be mistaken for a signed-out session.  This
 * module deliberately has no AsyncStorage or browser-localStorage fallback for
 * access tokens, refresh tokens, or session payloads. Browser sessions use
 * per-tab sessionStorage: this supports ordinary reloads without making a
 * session survive a closed browser tab. Web PKCE code verifiers are a narrower
 * exception: they must survive the full-page email/OAuth redirect, so the web
 * adapter keeps those verifier keys in the supplied PKCE store.
 */

export type SessionStorageOperation = 'read' | 'write' | 'remove';

export class SupabaseSessionStorageError extends Error {
  readonly name = 'SupabaseSessionStorageError';

  constructor(readonly operation: SessionStorageOperation) {
    super(`Secure session storage ${operation} failed.`);
  }
}

export interface EncryptedKeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface SupabaseSessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface BrowserKeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Wrap the native encrypted store without exposing provider errors, values, or
 * keys in messages.  Callers can safely branch on the operation for recovery
 * UI/diagnostics without ever logging a token or session payload.
 */
export function createSupabaseSessionStorage(
  secureStore: EncryptedKeyValueStore,
): SupabaseSessionStorage {
  return {
    async getItem(key) {
      try {
        return await secureStore.getItemAsync(key);
      } catch {
        throw new SupabaseSessionStorageError('read');
      }
    },
    async setItem(key, value) {
      try {
        await secureStore.setItemAsync(key, value);
      } catch {
        throw new SupabaseSessionStorageError('write');
      }
    },
    async removeItem(key) {
      try {
        await secureStore.deleteItemAsync(key);
      } catch {
        throw new SupabaseSessionStorageError('remove');
      }
    },
  };
}

/**
 * A non-durable adapter used for web previews.  Passing it explicitly prevents
 * Supabase from silently selecting browser localStorage (plaintext at rest).
 * Native releases always use SecureStore above.
 */
export function createMemorySessionStorage(): SupabaseSessionStorage {
  const values = new Map<string, string>();
  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

function isPkceVerifierKey(key: string): boolean {
  // Supabase's legacy verifier, per-flow verifier slots, and the bounded flow
  // index all deliberately end with this suffix. Session/token keys do not.
  return key.endsWith('-code-verifier');
}

/**
 * Keep browser auth material out of durable localStorage while allowing a
 * current tab to survive ordinary document reloads. Sessions use the supplied
 * sessionStorage adapter, which the browser clears when the tab closes. PKCE
 * verifiers use the supplied PKCE store because their short-lived, random
 * material must survive the full-page callback exchange. If browser storage is
 * unavailable, a session remains process-local and PKCE setup fails explicitly.
 */
export function createWebSessionStorage(
  pkceStore: BrowserKeyValueStore | null,
  sessionStore: BrowserKeyValueStore | null = null,
): SupabaseSessionStorage {
  const sessionValues = new Map<string, string>();

  return {
    async getItem(key) {
      const store = isPkceVerifierKey(key) ? pkceStore : sessionStore;
      if (!store) return isPkceVerifierKey(key) ? null : sessionValues.get(key) ?? null;
      try {
        return store.getItem(key);
      } catch {
        throw new SupabaseSessionStorageError('read');
      }
    },
    async setItem(key, value) {
      const store = isPkceVerifierKey(key) ? pkceStore : sessionStore;
      if (!store) {
        if (isPkceVerifierKey(key)) throw new SupabaseSessionStorageError('write');
        sessionValues.set(key, value);
        return;
      }
      try {
        store.setItem(key, value);
      } catch {
        throw new SupabaseSessionStorageError('write');
      }
    },
    async removeItem(key) {
      const store = isPkceVerifierKey(key) ? pkceStore : sessionStore;
      if (!store) {
        if (isPkceVerifierKey(key)) return;
        sessionValues.delete(key);
        return;
      }
      try {
        store.removeItem(key);
      } catch {
        throw new SupabaseSessionStorageError('remove');
      }
    },
  };
}

export function getSafeSessionStorageErrorCategory(error: unknown): 'secure_storage' | 'session_restore' {
  return error instanceof SupabaseSessionStorageError ? 'secure_storage' : 'session_restore';
}
