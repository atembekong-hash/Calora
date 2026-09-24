/**
 * Encrypted persistence adapter for the Supabase auth client.
 *
 * Supabase expects a small async key/value interface.  Keeping the adapter in
 * one module makes native SecureStore failures observable by AuthProvider
 * instead of allowing them to be mistaken for a signed-out session.  This
 * module deliberately has no AsyncStorage or browser-localStorage fallback for
 * access tokens, refresh tokens, or session payloads. Web PKCE code verifiers
 * are a narrower exception: they must survive the full-page email/OAuth
 * redirect, so the web adapter persists only Supabase's verifier keys.
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
 * Keep browser sessions process-local while allowing PKCE to complete after a
 * full-page redirect or in another tab of the same origin. The only values
 * written to the supplied browser store are random, short-lived code verifier
 * material managed and removed by Supabase after exchange; auth sessions remain
 * in the private in-memory map and disappear on reload.
 */
export function createWebSessionStorage(
  pkceStore: BrowserKeyValueStore | null,
): SupabaseSessionStorage {
  const sessionValues = new Map<string, string>();

  return {
    async getItem(key) {
      if (!isPkceVerifierKey(key)) return sessionValues.get(key) ?? null;
      if (!pkceStore) return null;
      try {
        return pkceStore.getItem(key);
      } catch {
        throw new SupabaseSessionStorageError('read');
      }
    },
    async setItem(key, value) {
      if (!isPkceVerifierKey(key)) {
        sessionValues.set(key, value);
        return;
      }
      if (!pkceStore) throw new SupabaseSessionStorageError('write');
      try {
        pkceStore.setItem(key, value);
      } catch {
        throw new SupabaseSessionStorageError('write');
      }
    },
    async removeItem(key) {
      if (!isPkceVerifierKey(key)) {
        sessionValues.delete(key);
        return;
      }
      if (!pkceStore) return;
      try {
        pkceStore.removeItem(key);
      } catch {
        throw new SupabaseSessionStorageError('remove');
      }
    },
  };
}

export function getSafeSessionStorageErrorCategory(error: unknown): 'secure_storage' | 'session_restore' {
  return error instanceof SupabaseSessionStorageError ? 'secure_storage' : 'session_restore';
}
