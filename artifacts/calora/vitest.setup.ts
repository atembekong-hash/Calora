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
