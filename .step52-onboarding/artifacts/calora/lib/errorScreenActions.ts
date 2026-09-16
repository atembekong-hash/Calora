/**
 * Pure derivation helper for the hydration error screen in app/index.tsx.
 *
 * Centralises the button-visibility logic so it can be tested without
 * mounting React Native components or mocking the full CaloraProvider.
 *
 * Rules
 * -----
 *   parse error  → Export button visible, Try Again absent
 *   I/O error    → Try Again button visible, Export absent
 *   (both kinds always show the error title and message)
 *   parse error only → Clear all data button also visible
 */

import type { HydrationErrorKind } from '@/lib/hydrationGuard';

export interface ErrorScreenActions {
  /** Show the "Export raw data" Pressable. Parse errors only. */
  showExport: boolean;
  /** Show the "Try again" Pressable. I/O errors only. */
  showTryAgain: boolean;
  /** Show the "Clear all data and start fresh" Pressable. Parse errors only. */
  showClearAll: boolean;
}

/**
 * Derives which action buttons the error screen should render based on the
 * hydration error kind.  Returns a plain object so callers (and tests) can
 * assert each field independently without touching React Native primitives.
 *
 * @param kind  The hydration error kind from CaloraContext, or null when no
 *              error is active (caller should not render the screen in that
 *              case, but the function still returns a safe all-false result).
 */
export function deriveErrorScreenActions(
  kind: HydrationErrorKind | null,
): ErrorScreenActions {
  const isParseError = kind === 'parse';
  return {
    showExport: isParseError,
    showTryAgain: !isParseError && kind !== null,
    showClearAll: isParseError,
  };
}
