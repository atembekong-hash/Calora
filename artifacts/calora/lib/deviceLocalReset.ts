/**
 * Device-local reset completion boundary.
 *
 * A device reset intentionally preserves remotely synchronized account data.
 * Once local persistence has been erased successfully, the associated local
 * authentication session must be ended before the app mounts a fresh guest
 * scope. Otherwise the retained session can route an account with no local
 * profile through onboarding and risk a later overwrite of the remote profile.
 */

import { ClearAllDataError } from './clearAllData';

export type LocalSignOut = () => Promise<{ error: unknown | null }>;

export type DeviceLocalResetOutcome = {
  /** Auxiliary cleanup can fail after core local data has been erased. */
  cleanupFailures: string[];
  /** The caller must show recovery guidance rather than claim sign-out succeeded. */
  signOutError: unknown | null;
};

/**
 * Erase the local Calora scope, then end only the session on this device.
 *
 * Core-clear failures are rethrown and never invoke sign-out. A partial cleanup
 * result is still a completed data deletion, so the device session is ended and
 * the caller receives the exact auxiliary cleanup labels for recovery copy.
 */
export async function completeDeviceLocalReset(
  clearAllData: () => Promise<void>,
  signOut: LocalSignOut,
): Promise<DeviceLocalResetOutcome> {
  let cleanupFailures: string[] = [];

  try {
    await clearAllData();
  } catch (error) {
    if (!(error instanceof ClearAllDataError) || error.kind !== 'partial-cleanup') {
      throw error;
    }
    cleanupFailures = error.cleanupFailures;
  }

  try {
    const { error } = await signOut();
    return { cleanupFailures, signOutError: error ?? null };
  } catch (error) {
    return { cleanupFailures, signOutError: error };
  }
}
