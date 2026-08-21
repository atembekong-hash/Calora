/**
 * Account-scoped local persistence.
 *
 * Health and diary state must never share a device-wide key: signing into a
 * different account must produce a completely separate hydration source.
 * The legacy v2 key is deliberately never returned, so pre-isolation snapshots
 * cannot be restored for any account.
 */

export const LEGACY_STORAGE_KEY = '@calora/local-state-v2';
/**
 * Ambiguous snapshots from before account scoping are kept outside every
 * account namespace. They are never hydrated automatically, but remain
 * recoverable for a future explicit, owner-verified recovery flow.
 */
export const LEGACY_QUARANTINE_STORAGE_KEY = '@calora/local-state-v2-quarantine';
export const GUEST_STORAGE_SCOPE = 'guest';
const STORAGE_PREFIX = '@calora/account-state-v3';

export type LegacyStorageAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * Builds the sole AsyncStorage key used for a local Calora session.
 * Supabase user IDs are opaque identifiers; encode defensively so any future
 * identity provider cannot alter the key namespace.
 */
export function storageKeyForAccount(userId?: string | null): string {
  const scope = userId?.trim() || GUEST_STORAGE_SCOPE;
  return `${STORAGE_PREFIX}:${encodeURIComponent(scope)}`;
}

/**
 * Quarantine a pre-account-scoping snapshot without assigning it to a person.
 * The source key is removed only after the exact raw value is durably copied;
 * failures intentionally leave the original untouched for recovery.
 */
export async function quarantineLegacyStorage(
  storage: LegacyStorageAdapter,
): Promise<'empty' | 'quarantined' | 'already_quarantined' | 'conflict'> {
  const legacy = await storage.getItem(LEGACY_STORAGE_KEY);
  if (legacy === null || legacy === '') return 'empty';

  const quarantined = await storage.getItem(LEGACY_QUARANTINE_STORAGE_KEY);
  if (quarantined === null) {
    await storage.setItem(LEGACY_QUARANTINE_STORAGE_KEY, legacy);
    await storage.removeItem(LEGACY_STORAGE_KEY);
    return 'quarantined';
  }

  if (quarantined === legacy) {
    await storage.removeItem(LEGACY_STORAGE_KEY);
    return 'already_quarantined';
  }

  // Do not overwrite a different recoverable snapshot or destroy the source.
  return 'conflict';
}