/**
 * Pure helpers that encode the three invariants protecting local data
 * from loss during hydration failures:
 *
 * 1. Autosave is blocked until hydration completes cleanly — no
 *    starter/default state can be written over the user's saved data.
 * 2. A pending write is serialized before a clear, so clearAllData()
 *    wins and cannot be resurrected by an in-flight write.
 * 3. Retrying hydration re-reads storage without touching it, so
 *    the saved state survives the retry attempt unchanged.
 *
 * These helpers are extracted so the invariants can be tested
 * independently of React lifecycle wiring.
 */

export type HydrationStatus = {
  hydrated: boolean;
  error: string | null;
};

/**
 * The kind of hydration failure that occurred.
 * - 'parse' — the stored value could be read but could not be parsed as JSON
 *             (data is still on-device and may be exportable as raw bytes).
 * - 'io'    — AsyncStorage itself rejected the read (transient I/O error,
 *             device locked, storage quota exhausted, etc.).
 */
export type HydrationErrorKind = 'parse' | 'io';

/**
 * Thrown inside the hydration `.then()` block when `parseStorageValue`
 * returns a parse error. Using a named subclass lets the `.catch()` block
 * distinguish a parse failure from a genuine AsyncStorage I/O rejection.
 */
export class ParseHydrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseHydrationError';
  }
}

/**
 * Returns true only when local state may safely be persisted.
 * Autosave must be skipped when hydration has not completed, or when it
 * ended with an error — either condition means in-memory state still
 * holds defaults and must not overwrite what is stored on disk.
 */
export function shouldAutosave(status: HydrationStatus): boolean {
  return status.hydrated && status.error === null;
}

/**
 * Parse raw AsyncStorage content into a typed value.
 * Returns `{ state: null, error: null }` on empty storage (first launch),
 * and surfaces a structured error string on any JSON parse failure so the
 * caller can set hydrationError without a raw exception escaping.
 */
export function parseStorageValue<T>(
  raw: string | null,
): { state: T | null; error: string | null } {
  if (raw === null || raw === '') return { state: null, error: null };
  try {
    return { state: JSON.parse(raw) as T, error: null };
  } catch {
    return {
      state: null,
      error:
        'Calora could not load your saved local data. Your data was not changed.',
    };
  }
}

/**
 * Enqueues a storage-clear operation AFTER any currently-queued write
 * completes, even if that write fails. This guarantees that clearAllData()
 * always wins: a write that was already in-flight cannot resurrect data
 * after the clear has run.
 */
export function queueClearAfterPendingWrites(
  currentQueue: Promise<void>,
  clearFn: () => Promise<void>,
): Promise<void> {
  return currentQueue.catch(() => undefined).then(() => clearFn());
}
