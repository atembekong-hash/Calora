import { describe, expect, it } from 'vitest';
import {
  GUEST_STORAGE_SCOPE,
  LEGACY_STORAGE_KEY,
  LEGACY_QUARANTINE_STORAGE_KEY,
  quarantineLegacyStorage,
  storageKeyForAccount,
} from '../accountStorage';
import { PersistenceManager, type StorageAdapter } from '../persistenceManager';

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

describe('account-scoped local storage', () => {
  it('uses an isolated key for each authenticated account and a separate guest key', () => {
    const firstAccount = storageKeyForAccount('user-a');
    const secondAccount = storageKeyForAccount('user-b');
    const guest = storageKeyForAccount(null);

    expect(firstAccount).not.toBe(secondAccount);
    expect(firstAccount).not.toBe(guest);
    expect(guest).toContain(GUEST_STORAGE_SCOPE);
    expect(firstAccount).not.toBe(LEGACY_STORAGE_KEY);
  });

  it('cannot hydrate one account from another account’s saved diary, profile, weight, or Coach history', async () => {
    const storage = new MemoryStorage();
    const first = new PersistenceManager(storage, storageKeyForAccount('first-account'));
    const second = new PersistenceManager(storage, storageKeyForAccount('second-account'));

    first.enqueueWrite({
      profile: { name: 'First person' },
      logs: [{ id: 'first-meal', name: 'Private meal' }],
      weights: [{ id: 'first-weight', kg: 71 }],
      coachMessages: [{ id: 'private-coach-message' }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((await second.read()).state).toBeNull();
    expect((await first.read()).state).toEqual(expect.objectContaining({
      profile: { name: 'First person' },
      logs: [{ id: 'first-meal', name: 'Private meal' }],
      weights: [{ id: 'first-weight', kg: 71 }],
      coachMessages: [{ id: 'private-coach-message' }],
    }));
  });

  it('keeps the prior account’s queued write out of the next account namespace during a rapid switch', async () => {
    const storage = new MemoryStorage();
    const first = new PersistenceManager(storage, storageKeyForAccount('first-account'));
    const second = new PersistenceManager(storage, storageKeyForAccount('second-account'));

    first.enqueueWrite({ logs: [{ id: 'first-account-only' }] });
    await first.clear();

    second.enqueueWrite({ logs: [{ id: 'second-account-only' }] });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((await first.read()).state).toBeNull();
    expect((await second.read()).state).toEqual({
      logs: [{ id: 'second-account-only' }],
    });
  });

  it('restores only the returning account after a complete User A → User B → User A switch', async () => {
    const storage = new MemoryStorage();
    const userA = new PersistenceManager(storage, storageKeyForAccount('user-a'));
    const userB = new PersistenceManager(storage, storageKeyForAccount('user-b'));

    userA.enqueueWrite({ logs: [{ id: 'a-only' }], coachMessages: [{ id: 'a-coach' }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    userB.enqueueWrite({ logs: [{ id: 'b-only' }], livingMemory: { source: 'b-only' } });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((await userB.read()).state).toEqual({
      logs: [{ id: 'b-only' }], livingMemory: { source: 'b-only' },
    });
    expect((await userA.read()).state).toEqual({
      logs: [{ id: 'a-only' }], coachMessages: [{ id: 'a-coach' }],
    });
  });

  it('quarantines ambiguous legacy data before removing the former device-wide key', async () => {
    const storage = new MemoryStorage();
    storage.values[LEGACY_STORAGE_KEY] = JSON.stringify({ profile: { name: 'Unknown owner' } });

    await expect(quarantineLegacyStorage(storage)).resolves.toBe('quarantined');
    expect(storage.values[LEGACY_STORAGE_KEY]).toBeUndefined();
    expect(storage.values[LEGACY_QUARANTINE_STORAGE_KEY]).toContain('Unknown owner');
    expect(storage.values[storageKeyForAccount('user-a')]).toBeUndefined();
  });

  it('never deletes legacy data when quarantining it fails', async () => {
    const storage = new MemoryStorage();
    storage.values[LEGACY_STORAGE_KEY] = '{"private":true}';
    storage.setItem = async () => { throw new Error('storage unavailable'); };

    await expect(quarantineLegacyStorage(storage)).rejects.toThrow('storage unavailable');
    expect(storage.values[LEGACY_STORAGE_KEY]).toBe('{"private":true}');
    expect(storage.values[LEGACY_QUARANTINE_STORAGE_KEY]).toBeUndefined();
  });
});