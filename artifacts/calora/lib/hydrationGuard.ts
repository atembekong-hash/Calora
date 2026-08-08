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

import { BRAND } from '@/lib/brand';

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
        `${BRAND.name} could not load your saved local data. Your data was not changed.`,
    };
  }
}

/**
 * Registry of migration functions keyed by SOURCE schema version.
 * `MIGRATIONS[N]` transforms a vN snapshot into a v(N+1) snapshot.
 *
 * Before bumping `STORAGE_SCHEMA_VERSION` from N to N+1, add an entry here:
 *
 *   MIGRATIONS[N] = (state) => ({ ...state, newField: defaultValue, schemaVersion: N + 1 });
 *
 * The integration test "schema version migration gate" imports this map and
 * calls `applyStorageMigration` with the real `STORAGE_SCHEMA_VERSION`.  A
 * missing entry causes the gate test to fail, blocking the release.
 *
 * Current version history
 * ─────────────────────────────────────────────────────────────────────────
 * v1 → v2  (first explicit version stamp; no structural field changes)
 *          Added schemaVersion field to the persisted snapshot.
 *          No data transformation needed — v1 snapshots have no schemaVersion
 *          and are treated as v1 by the `?? 1` fallback in applyStorageMigration.
 * ─────────────────────────────────────────────────────────────────────────
 * Add MIGRATIONS[2] here when bumping STORAGE_SCHEMA_VERSION to 3.
 */
export const MIGRATIONS: Record<number, (state: object) => object> = {
  /**
   * v1 → v2: first versioned release.
   * No structural field changes — the only addition is the schemaVersion stamp
   * itself, which `enqueueAutosave` applies to every write going forward.
   * Snapshots without schemaVersion are treated as v1 by the `?? 1` fallback.
   */
  1: (state) => ({ ...state, schemaVersion: 2 }),
};

/**
 * Walks the migration chain from `state.schemaVersion` (defaulting to 1 for
 * legacy snapshots that predate the versioning system) up to `targetVersion`.
 *
 * Returns the state unchanged when versions already match.
 *
 * Throws `ParseHydrationError` if:
 *   - any intermediate migration step is missing from `MIGRATIONS`, or
 *   - the saved version is newer than `targetVersion` (downgrade not supported).
 *
 * This function is imported by the integration tests as the **release gate**:
 * calling it with `targetVersion = STORAGE_SCHEMA_VERSION` and a snapshot from
 * the previous version will throw until the corresponding `MIGRATIONS` entry is
 * added, causing the gate test to fail at review time.
 */
export function applyStorageMigration<T extends object>(
  state: T,
  targetVersion: number,
): T & { schemaVersion: number } {
  const savedVersion = (state as { schemaVersion?: number }).schemaVersion ?? 1;

  if (savedVersion === targetVersion) {
    // Versions match — no migration needed.
    return state as T & { schemaVersion: number };
  }

  if (savedVersion > targetVersion) {
    throw new ParseHydrationError(
      `Saved schema version (${savedVersion}) is newer than the app schema ` +
      `version (${targetVersion}). Downgrading is not supported.`,
    );
  }

  // Apply each migration step in sequence.
  let current: object = state;
  for (let v = savedVersion; v < targetVersion; v++) {
    const migrator = MIGRATIONS[v];
    if (!migrator) {
      throw new ParseHydrationError(
        `No migration from schema v${v} to v${v + 1}. ` +
        `Add MIGRATIONS[${v}] in hydrationGuard.ts before bumping ` +
        `STORAGE_SCHEMA_VERSION to ${v + 1}.`,
      );
    }
    current = migrator(current);
  }
  return current as T & { schemaVersion: number };
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
