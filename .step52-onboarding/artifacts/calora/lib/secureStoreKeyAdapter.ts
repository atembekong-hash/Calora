import type { SecureKeyAdapter } from './encryptedStorage';
import { Platform } from 'react-native';

/**
 * The domain snapshot is too large for SecureStore, so only this 256-bit
 * install key lives there. Device-only accessibility prevents the key from
 * being restored onto a different device with an iOS backup.
 */
type SecureStoreModule = typeof import('expo-secure-store');
let secureStorePromise: Promise<SecureStoreModule> | null = null;
const WEB_KEY_PREFIX = 'calora-web-encryption-key:';

function loadSecureStore(): Promise<SecureStoreModule> {
  secureStorePromise ??= import('expo-secure-store');
  return secureStorePromise;
}

function isWebRuntime(): boolean {
  return process.env.EXPO_OS === 'web';
}

function webKeyStore() {
  if (typeof globalThis.localStorage === 'undefined') {
    throw new Error('A persistent browser key store is unavailable.');
  }
  return globalThis.localStorage;
}

type NativeSecureStoreModule = SecureStoreModule & {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY?: number;
};

/**
 * keychainAccessible is an iOS-only SecureStore option. Android's native
 * SecureStore record rejects unknown fields in some release builds, so never
 * send the iOS option across that bridge.
 */
export function secureStoreOptions(
  secureStore: NativeSecureStoreModule,
  platform: typeof Platform.OS = Platform.OS,
): Record<string, number> {
  if (platform !== 'ios') return {};
  const accessibility = secureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;
  return accessibility === undefined ? {} : { keychainAccessible: accessibility };
}

export const secureStoreKeyAdapter: SecureKeyAdapter = {
  getItem: async (key) => {
    if (isWebRuntime()) {
      return webKeyStore().getItem(`${WEB_KEY_PREFIX}${key}`);
    }
    const secureStore = await loadSecureStore();
    return secureStore.getItemAsync(key, secureStoreOptions(secureStore));
  },
  setItem: async (key, value) => {
    if (isWebRuntime()) {
      webKeyStore().setItem(`${WEB_KEY_PREFIX}${key}`, value);
      return;
    }
    const secureStore = await loadSecureStore();
    return secureStore.setItemAsync(key, value, secureStoreOptions(secureStore));
  },
};