/**
 * Encrypted local storage for Calora's account-scoped domain state.
 *
 * AsyncStorage remains the durable, local-first backing store, but its values
 * are authenticated-encrypted with an install-scoped key held by
 * expo-secure-store.  Keeping the key separate means large state snapshots do
 * not hit SecureStore's value-size limit while plaintext diary, health, mood,
 * and Coach data is not left in the AsyncStorage database.
 */

import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import type { StorageAdapter } from './persistenceManager';

const ENCRYPTED_PREFIX = 'calora.encrypted.v1:';
const ENCRYPTION_KEY_NAME = 'calora-local-state-encryption-key-v1';
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

export interface SecureKeyAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export class EncryptedStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'EncryptedStorageError';
  }
}

type EncryptedEnvelope = {
  nonce: string;
  ciphertext: string;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) {
    throw new Error('Invalid hexadecimal value.');
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decodeUtf8(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

function isEncryptedValue(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

function encodeEnvelope(envelope: EncryptedEnvelope): string {
  return `${ENCRYPTED_PREFIX}${JSON.stringify(envelope)}`;
}

function decodeEnvelope(value: string): EncryptedEnvelope {
  try {
    const envelope = JSON.parse(value.slice(ENCRYPTED_PREFIX.length)) as Partial<EncryptedEnvelope>;
    if (
      typeof envelope.nonce !== 'string'
      || typeof envelope.ciphertext !== 'string'
      || envelope.nonce.length !== NONCE_BYTES * 2
      || envelope.ciphertext.length < 32
    ) {
      throw new Error('Envelope fields are invalid.');
    }
    return { nonce: envelope.nonce, ciphertext: envelope.ciphertext };
  } catch (error) {
    throw new EncryptedStorageError('The encrypted local data envelope is invalid.', { cause: error });
  }
}

function associatedData(storageKey: string): Uint8Array {
  return utf8(`calora-local-state:${storageKey}`);
}

/**
 * AsyncStorage adapter that encrypts every value and transparently migrates a
 * valid legacy plaintext JSON value on its first read.
 */
export class EncryptedStorageAdapter implements StorageAdapter {
  private keyPromise: Promise<Uint8Array> | null = null;

  constructor(
    private readonly backing: StorageAdapter,
    private readonly secureKeyStore: SecureKeyAdapter,
  ) {}

  private async readExistingKey(): Promise<Uint8Array | null> {
    const encoded = await this.secureKeyStore.getItem(ENCRYPTION_KEY_NAME);
    if (encoded === null) return null;
    try {
      const key = hexToBytes(encoded);
      if (key.length !== KEY_BYTES) throw new Error('Unexpected key length.');
      return key;
    } catch (error) {
      throw new EncryptedStorageError('The local encryption key is invalid.', { cause: error });
    }
  }

  private async getKey(create: boolean): Promise<Uint8Array> {
    if (this.keyPromise) return this.keyPromise;
    this.keyPromise = (async () => {
      const existing = await this.readExistingKey();
      if (existing) return existing;
      if (!create) {
        throw new EncryptedStorageError('The local encryption key is unavailable.');
      }
      const generated = randomBytes(KEY_BYTES);
      await this.secureKeyStore.setItem(ENCRYPTION_KEY_NAME, bytesToHex(generated));
      return generated;
    })();
    try {
      return await this.keyPromise;
    } catch (error) {
      this.keyPromise = null;
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const raw = await this.backing.getItem(key);
    if (raw === null || raw === '') return raw;

    if (!isEncryptedValue(raw)) {
      // Legacy account snapshots were plain JSON. Only migrate values that
      // parse successfully; corrupt data must stay untouched for recovery.
      try {
        JSON.parse(raw);
      } catch {
        return raw;
      }
      await this.setItem(key, raw);
      return raw;
    }

    const envelope = decodeEnvelope(raw);
    const keyBytes = await this.getKey(false);
    try {
      const plaintext = gcm(
        keyBytes,
        hexToBytes(envelope.nonce),
        associatedData(key),
      ).decrypt(hexToBytes(envelope.ciphertext));
      return decodeUtf8(plaintext);
    } catch (error) {
      throw new EncryptedStorageError('The encrypted local data could not be authenticated.', { cause: error });
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const keyBytes = await this.getKey(true);
    const nonce = randomBytes(NONCE_BYTES);
    const ciphertext = gcm(keyBytes, nonce, associatedData(key)).encrypt(utf8(value));
    await this.backing.setItem(key, encodeEnvelope({
      nonce: bytesToHex(nonce),
      ciphertext: bytesToHex(ciphertext),
    }));
  }

  async removeItem(key: string): Promise<void> {
    await this.backing.removeItem(key);
  }

  /**
   * Raw recovery intentionally returns the encrypted envelope. It never
   * creates an extra plaintext copy or exposes the SecureStore key.
   */
  async getRawItem(key: string): Promise<string | null> {
    return this.backing.getItem(key);
  }
}

export { ENCRYPTION_KEY_NAME, ENCRYPTED_PREFIX };