/**
 * PersistenceManager — injectable storage lifecycle layer for CaloraContext.
 *
 * Owns the write queue so that:
 *   1. Autosave writes are serialized (no concurrent setItem calls).
 *   2. A clear() always runs AFTER any in-flight write — no queued write
 *      can resurrect data once the user has triggered "Clear all data".
 *   3. The storage adapter is injected, making the full lifecycle testable
 *      without mounting React or the real AsyncStorage.
 *   4. Any enqueueWrite dispatched while a clear is in-flight is dropped
 *      immediately (no-op) so that stale mid-clear data never lands in
 *      storage after the removeItem has executed.
 */

import { EncryptedStorageError } from './encryptedStorage';
import { ParseHydrationError, parseStorageValue } from './hydrationGuard';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class PersistenceManager {
  private queue: Promise<void> = Promise.resolve();
  /**
   * Tracks how many clear() calls are currently in-flight.  Using a counter
   * rather than a boolean means two rapid taps ("double-tap guard") both set
   * the flag and neither drops it prematurely between the two removeItem
   * microtasks.
   */
  private clearingCount = 0;

  constructor(
    private readonly storage: StorageAdapter,
    private readonly key: string,
  ) {}

  /**
   * Enqueue an autosave write.  Calls dispatched while a clear() is in-flight
   * are silently dropped so that no stale pre-clear snapshot can land in
   * storage after the removeItem has run.  Any write error is silently
   * absorbed so the queue keeps moving (the next write or clear will still
   * execute).
   */
  enqueueWrite(state: object): void {
    if (this.clearingCount > 0) return;
    this.queue = this.queue
      .catch(() => undefined)
      .then(() => this.storage.setItem(this.key, JSON.stringify(state)));
  }

  /**
   * Enqueue a storage clear AFTER any pending write, then await the result.
   * This guarantees clear() always wins — no queued write can resurrect the
   * key after it returns.  The clearingCount is incremented for the full
   * duration of the async clear so that any concurrent enqueueWrite call
   * dispatched during the await window is dropped.
   */
  async clear(): Promise<void> {
    this.clearingCount++;
    this.queue = this.queue
      .catch(() => undefined)
      .then(() => this.storage.removeItem(this.key));
    try {
      await this.queue;
    } finally {
      this.clearingCount--;
    }
  }

  /**
   * Read and parse the stored state. Returns { state: null, error: null }
   * on empty storage (first launch or after a clear), and a structured error
   * string on any JSON parse failure.
   */
  async read<T>(): Promise<{ state: T | null; error: string | null }> {
    try {
      const raw = await this.storage.getItem(this.key);
      return parseStorageValue<T>(raw);
    } catch (error) {
      if (error instanceof EncryptedStorageError) {
        throw new ParseHydrationError(
          'Encrypted local data could not be authenticated. The saved copy was not changed.',
        );
      }
      throw error;
    }
  }
}
