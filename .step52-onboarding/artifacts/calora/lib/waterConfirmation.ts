/**
 * Module-level confirmation deadline for the water check-in button.
 *
 * Using module-level state (rather than a useRef or useState) ensures the
 * deadline survives component unmount/remount — e.g. when the user switches
 * tabs and returns within the 1.5 s window. React initialises refs and state
 * to their default values on every true unmount; module-level variables persist
 * for the lifetime of the JS bundle.
 */

export const CONFIRMATION_WINDOW_MS = 1500;

/** Timestamp (ms since epoch) at which the confirmation expires, or null. */
let _deadline: number | null = null;

/** Record a new water confirmation, starting the 1.5 s window now. */
export function recordWaterConfirmation(): void {
  _deadline = Date.now() + CONFIRMATION_WINDOW_MS;
}

/**
 * Milliseconds remaining in the current confirmation window.
 * Returns 0 when no confirmation is active or the window has already elapsed.
 */
export function getWaterConfirmationRemaining(): number {
  if (_deadline === null) return 0;
  return Math.max(_deadline - Date.now(), 0);
}

/** True while the confirmation window is still open. */
export function isWaterConfirmed(): boolean {
  return getWaterConfirmationRemaining() > 0;
}

/** Explicitly clear the confirmation (called when the timer fires). */
export function clearWaterConfirmation(): void {
  _deadline = null;
}
