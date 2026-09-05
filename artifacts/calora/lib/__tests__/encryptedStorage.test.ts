import { describe, expect, it } from 'vitest';
import {
  ENCRYPTED_PREFIX,
  ENCRYPTION_KEY_NAME,
  EncryptedStorageAdapter,
  EncryptedStorageError,
} from '../encryptedStorage';
import type { StorageAdapter } from '../persistenceManager';

class MemoryStorage implements StorageAdapter {
  readonly values: Record<string, string> = {};

  async getItem(key: string) {
    return this.values[key] ?? null;
  }

  async setItem(key: string, value: string) {
    this.values[key] = value;
  }

  async removeItem(key: string) {
    delete this.values[key];
  }
}

class MemorySecureStore {
  readonly values: Record<string, string> = {};

  async getItem(key: string) {
    return this.values[key] ?? null;
  }

  async setItem(key: string, value: string) {
    this.values[key] = value;
  }
}

describe('EncryptedStorageAdapter', () => {
  it('stores an authenticated encrypted envelope and decrypts it on hydration', async () => {
    const backing = new MemoryStorage();
    const secure = new MemorySecureStore();
    const encrypted = new EncryptedStorageAdapter(backing, secure);
    const state = JSON.stringify({
      profile: { name: 'Private person' },
      logs: [{ id: 'diary-private', name: 'Sensitive meal' }],
      moodLogs: { '2026-09-05': 'stressed' },
      coachMessages: [{ id: 'coach-private', text: 'Private context' }],
    });

    await encrypted.setItem('@calora/account-state-v3:user-a', state);

    const raw = backing.values['@calora/account-state-v3:user-a'];
    expect(raw).toContain(ENCRYPTED_PREFIX);
    expect(raw).not.toContain('Private person');
    expect(raw).not.toContain('Sensitive meal');
    expect(raw).not.toContain('Private context');
    expect(secure.values[ENCRYPTION_KEY_NAME]).toHaveLength(64);
    await expect(encrypted.getItem('@calora/account-state-v3:user-a')).resolves.toBe(state);
    await expect(encrypted.getRawItem('@calora/account-state-v3:user-a')).resolves.toBe(raw);
  });

  it('migrates valid legacy plaintext once and leaves no plaintext snapshot behind', async () => {
    const backing = new MemoryStorage();
    const secure = new MemorySecureStore();
    const encrypted = new EncryptedStorageAdapter(backing, secure);
    const key = '@calora/account-state-v3:legacy';
    const legacy = JSON.stringify({ logs: [{ id: 'legacy-private' }] });
    backing.values[key] = legacy;

    await expect(encrypted.getItem(key)).resolves.toBe(legacy);
    expect(backing.values[key]).not.toBe(legacy);
    expect(backing.values[key]).toContain(ENCRYPTED_PREFIX);
    expect(backing.values[key]).not.toContain('legacy-private');
    await expect(encrypted.getItem(key)).resolves.toBe(legacy);
  });

  it('does not overwrite corrupt legacy data during migration', async () => {
    const backing = new MemoryStorage();
    const secure = new MemorySecureStore();
    const encrypted = new EncryptedStorageAdapter(backing, secure);
    const key = '@calora/account-state-v3:corrupt';
    backing.values[key] = '{"logs":[{"id":"partial-private"';

    await expect(encrypted.getItem(key)).resolves.toBe(backing.values[key]);
    expect(backing.values[key]).not.toContain(ENCRYPTED_PREFIX);
    expect(secure.values[ENCRYPTION_KEY_NAME]).toBeUndefined();
  });

  it('rejects tampering and preserves the encrypted bytes for protected recovery export', async () => {
    const backing = new MemoryStorage();
    const secure = new MemorySecureStore();
    const encrypted = new EncryptedStorageAdapter(backing, secure);
    const key = '@calora/account-state-v3:tamper';
    await encrypted.setItem(key, JSON.stringify({ logs: [{ id: 'do-not-change' }] }));
    const original = backing.values[key];
    backing.values[key] = `${original.slice(0, -1)}0`;

    await expect(encrypted.getItem(key)).rejects.toBeInstanceOf(EncryptedStorageError);
    await expect(encrypted.getRawItem(key)).resolves.toBe(backing.values[key]);
  });

  it('binds ciphertext to its account key so another account cannot hydrate it', async () => {
    const backing = new MemoryStorage();
    const secure = new MemorySecureStore();
    const first = new EncryptedStorageAdapter(backing, secure);
    const second = new EncryptedStorageAdapter(backing, secure);
    const firstKey = '@calora/account-state-v3:first-account';
    const secondKey = '@calora/account-state-v3:second-account';
    await first.setItem(firstKey, JSON.stringify({ logs: [{ id: 'first-only' }] }));
    backing.values[secondKey] = backing.values[firstKey];

    await expect(second.getItem(secondKey)).rejects.toBeInstanceOf(EncryptedStorageError);
  });

  it('removes ciphertext on clear without deleting the install key needed by other accounts', async () => {
    const backing = new MemoryStorage();
    const secure = new MemorySecureStore();
    const encrypted = new EncryptedStorageAdapter(backing, secure);
    const key = '@calora/account-state-v3:clear';
    await encrypted.setItem(key, JSON.stringify({ logs: [{ id: 'clear-me' }] }));
    const installKey = secure.values[ENCRYPTION_KEY_NAME];

    await encrypted.removeItem(key);

    expect(await encrypted.getRawItem(key)).toBeNull();
    expect(secure.values[ENCRYPTION_KEY_NAME]).toBe(installKey);
  });
});