/**
 * Single source of truth for the storage schema version and the autosave
 * enqueue boundary used by CaloraContext.
 *
 * Design intent
 * ─────────────
 * CaloraContext's autosave useEffect calls `enqueueAutosave` exclusively —
 * it is the sole bridge between React state and PersistenceManager.
 * Integration tests import and call the same function so that any regression
 * that removes the schema-version stamp from `enqueueAutosave` breaks those
 * tests immediately, without needing to mount the full React provider.
 *
 * `stampSchemaVersion` is intentionally NOT exported: callers should use
 * `enqueueAutosave` so the test coverage gap cannot be re-introduced by
 * calling enqueueWrite with a manually stamped object.
 */

export const STORAGE_SCHEMA_VERSION = 2;

/** Adds the current schema version to any snapshot object. Internal only. */
function stampSchemaVersion<T extends object>(
  state: T,
): T & { schemaVersion: number } {
  return { ...state, schemaVersion: STORAGE_SCHEMA_VERSION };
}

/**
 * Builds and enqueues the autosave snapshot.
 *
 * This is the production autosave boundary: called by CaloraContext's
 * autosave useEffect; imported by integration tests that assert the
 * schema-version contract.  Removing or bypassing the stamp inside
 * this function will cause schema-version tests to fail immediately.
 *
 * @param pm  - Any object with an `enqueueWrite` method (PersistenceManager
 *              or its test double).
 * @param state - The current CaloraState (or spy-captured cleared state in
 *                tests) to persist.
 */
export function enqueueAutosave(
  pm: { enqueueWrite(state: object): void },
  state: object,
): void {
  pm.enqueueWrite(stampSchemaVersion(state));
}
