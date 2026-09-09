import { describe, expect, it } from 'vitest';
import { PersistenceManager, type StorageAdapter } from '../persistenceManager';
import { enqueueAutosave } from '../storageSchema';

class MemoryStorage implements StorageAdapter {
  private readonly values = new Map<string, string>();

  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
  async removeItem(key: string) { this.values.delete(key); }
}

describe('capture acceptance durable boundary', () => {
  it('survives an immediate process-style remount after the log and outbox commit flushes', async () => {
    const storage = new MemoryStorage();
    const key = 'calora-state:user-capture-owner';
    const firstProcess = new PersistenceManager(storage, key);
    const snapshot = {
      logs: [{
        id: 'log-capture-1',
        date: '2026-08-22',
        meal: 'Snack',
        name: 'Reviewed meal',
        calories: 240,
        protein: 12,
        carbs: 28,
        fat: 8,
      }],
      outbox: [{ id: 'mutation-capture-1', entity: 'diaryEntry', operation: 'upsert', createdAt: '2026-08-22T10:00:00.000Z' }],
    };

    // This mirrors the explicit acceptance path: enqueue the normalized
    // snapshot, then do not permit navigation/process termination until flush.
    enqueueAutosave(firstProcess, snapshot);
    await firstProcess.flush();

    const remountedProcess = new PersistenceManager(storage, key);
    const restored = await remountedProcess.read<typeof snapshot & { schemaVersion: number }>();
    expect(restored.error).toBeNull();
    expect(restored.state?.logs).toEqual(snapshot.logs);
    expect(restored.state?.outbox).toEqual(snapshot.outbox);
    expect(restored.state?.schemaVersion).toBe(3);
  });
});