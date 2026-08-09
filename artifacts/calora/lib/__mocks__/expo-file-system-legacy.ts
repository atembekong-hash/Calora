/**
 * Lightweight test stub for expo-file-system/legacy.
 *
 * The production package now transitively imports expo-modules-core, which
 * reads __DEV__ and native globals (TurboModuleRegistry, globalThis.expo.*) at
 * module-load time.  Those globals are not available in the node / jsdom test
 * environments, so any test that mounts CaloraProvider (which imports
 * expo-file-system/legacy at the top of CaloraContext.tsx) would fail.
 *
 * This stub satisfies every import site used by CaloraContext / profilePhotoStorage
 * without touching native code:
 *   FileSystem.documentDirectory
 *   FileSystem.copyAsync
 *   FileSystem.deleteAsync
 *   FileSystem.getInfoAsync
 *   FileSystem.writeAsStringAsync
 *   FileSystem.cacheDirectory
 *
 * Wired in via resolve.alias in vitest.config.ts — takes effect before any
 * test module is evaluated, so vi.mock hoisting is not needed.
 */

export const documentDirectory: string | null = null;
export const cacheDirectory: string | null = null;

export const copyAsync = async (_opts: { from: string; to: string }): Promise<void> => {};
export const deleteAsync = async (_uri: string, _opts?: { idempotent?: boolean }): Promise<void> => {};
export const getInfoAsync = async (
  _uri: string,
): Promise<{ exists: boolean; isDirectory: boolean; uri: string; size?: number; modificationTime?: number }> => ({
  exists: false,
  isDirectory: false,
  uri: _uri,
});
export const writeAsStringAsync = async (_uri: string, _contents: string): Promise<void> => {};
export const makeDirectoryAsync = async (_uri: string, _opts?: { intermediates?: boolean }): Promise<void> => {};
export const readAsStringAsync = async (_uri: string): Promise<string> => '';
