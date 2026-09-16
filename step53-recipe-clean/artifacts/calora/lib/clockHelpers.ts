/**
 * Pure clock-scheduling helpers.
 *
 * Kept separate from `useClock.ts` so they can be unit-tested in the Node/Vitest
 * environment without pulling in the React Native `AppState` API.
 */

/**
 * Returns the number of milliseconds from `now` until the start of the next
 * clock-hour boundary.
 *
 * Examples (UTC, but the calculation is timezone-agnostic):
 *   08:00:00.000 → 3 600 000 ms  (exactly on the hour → next full hour away)
 *   08:30:00.000 → 1 800 000 ms
 *   08:59:59.999 →         1 ms
 *   23:45:00.000 →   900 000 ms  (crosses midnight correctly)
 */
export function msUntilNextHour(now: Date): number {
  const next = new Date(now);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next.getTime() - now.getTime();
}
