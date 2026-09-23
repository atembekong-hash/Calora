/**
 * Encrypted persistence adapter for the Supabase auth client.
 *
 * Supabase expects a small async key/value interface.  Keeping the adapter in
 * one module makes native SecureStore failures observable by AuthProvider
 * instead of allowing them to be mistaken for a signed-out session.  This
 * module deliberately has no AsyncStorage or browser-localStorage fallback.
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

export function getSafeSessionStorageErrorCategory(error: unknown): 'secure_storage' | 'session_restore' {
  return error instanceof SupabaseSessionStorageError ? 'secure_storage' : 'session_restore';
}
