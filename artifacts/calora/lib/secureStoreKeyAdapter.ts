import type { SecureKeyAdapter } from './encryptedStorage';

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

export const secureStoreKeyAdapter: SecureKeyAdapter = {
  getItem: async (key) => {
    if (isWebRuntime()) {
      return webKeyStore().getItem(`${WEB_KEY_PREFIX}${key}`);
    }
    const secureStore = await loadSecureStore();
    return secureStore.getItemAsync(key, {
      keychainAccessible: secureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
  setItem: async (key, value) => {
    if (isWebRuntime()) {
      webKeyStore().setItem(`${WEB_KEY_PREFIX}${key}`, value);
      return;
    }
    const secureStore = await loadSecureStore();
    return secureStore.setItemAsync(key, value, {
      keychainAccessible: secureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
};