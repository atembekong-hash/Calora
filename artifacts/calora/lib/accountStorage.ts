/**
 * Account-scoped local persistence.
 *
 * Health and diary state must never share a device-wide key: signing into a
 * different account must produce a completely separate hydration source.
 * The legacy v2 key is deliberately never returned, so pre-isolation snapshots
 * cannot be restored for any account.
 */

export const LEGACY_STORAGE_KEY = '@calora/local-state-v2';
export const GUEST_STORAGE_SCOPE = 'guest';
const STORAGE_PREFIX = '@calora/account-state-v3';

/**
 * Builds the sole AsyncStorage key used for a local Calora session.
 * Supabase user IDs are opaque identifiers; encode defensively so any future
 * identity provider cannot alter the key namespace.
 */
export function storageKeyForAccount(userId?: string | null): string {
  const scope = userId?.trim() || GUEST_STORAGE_SCOPE;
  return `${STORAGE_PREFIX}:${encodeURIComponent(scope)}`;
}