import { vi } from 'vitest';

/**
 * Vitest global setup — runs before every test file.
 *
 * __DEV__ is a React Native / Expo global injected by the Metro bundler at
 * build time.  expo-modules-core reads it at module-load time, so it must be
 * present in the global scope before any node_modules are evaluated.  Without
 * this definition, the jsdom / node test environments throw:
 *   ReferenceError: __DEV__ is not defined
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__DEV__ = true;

// Calora's provider uses SecureStore only for the small install encryption
// key. Keep the native bridge out of node/jsdom tests while preserving the
// same async key-value contract used by the production adapter.
vi.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
    getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  };
});
