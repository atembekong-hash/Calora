/**
 * PersistenceManager — injectable storage lifecycle layer for CaloraContext.
 *
 * Owns the write queue so that:
 *   1. Autosave writes are serialized (no concurrent setItem calls).
 *   2. A clear() always runs AFTER any in-flight write — no queued write
 *      can resurrect data once the user has triggered "Clear all data".
 *   3. The storage adapter is injected, making the full lifecycle testable
 *      without mounting React or the real AsyncStorage.
 */

import { parseStorageValue } from './hydrationGuard';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class PersistenceManager {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: StorageAdapter,
    private readonly key: string,
  ) {}

  /**
   * Enqueue an autosave write. Any write error is silently absorbed so the
   * queue keeps moving (the next write or clear will still execute).
   */
  enqueueWrite(state: object): void {
    this.queue = this.queue
      .catch(() => undefined)
      .then(() => this.storage.setItem(this.key, JSON.stringify(state)));
  }

  /**
   * Enqueue a storage clear AFTER any pending write, then await the result.
   * This guarantees clear() always wins — no queued write can resurrect the
   * key after it returns.
   */
  async clear(): Promise<void> {
    this.queue = this.queue
      .catch(() => undefined)
      .then(() => this.storage.removeItem(this.key));
    await this.queue;
  }

  /**
   * Read and parse the stored state. Returns { state: null, error: null }
   * on empty storage (first launch or after a clear), and a structured error
   * string on any JSON parse failure.
   */
  async read<T>(): Promise<{ state: T | null; error: string | null }> {
    const raw = await this.storage.getItem(this.key);
    return parseStorageValue<T>(raw);
  }
}
