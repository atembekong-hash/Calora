import { createAccountDeletionFenceSignal } from "./account-deletion-fence-schema.mjs";
import type { AccountDeletionFenceSignal } from "./account-deletion-fence-schema.mjs";

/**
 * API-owned construction boundary for sanitized deletion-fence signals.
 *
 * Keeping this wrapper dependency-free lets the release bundle validation
 * execute the exact API construction path without starting the HTTP server.
 */
export function accountDeletionFenceSignal(
  route: string,
  count = 1,
): AccountDeletionFenceSignal {
  return createAccountDeletionFenceSignal(route, count);
}