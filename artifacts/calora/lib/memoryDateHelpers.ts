/**
 * Pure date helpers for Living Memory staleness and display labels.
 *
 * Both functions accept an optional `now` timestamp (milliseconds since epoch)
 * so they can be called with a pinned clock in unit tests.  When `now` is
 * omitted the functions fall back to `Date.now()`.
 */

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Parse a YYYY-MM-DD string at local noon to avoid timezone edge-cases. */
export function parseDateLocal(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

/** Returns true only for a real Gregorian calendar date in YYYY-MM-DD form. */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

/**
 * Returns true when the observation date is more than 30 days before `now`.
 * An invalid dateStr always returns false.
 */
export function isStaleDate(dateStr: string, now = Date.now()): boolean {
  const d = parseDateLocal(dateStr);
  return !Number.isNaN(d.getTime()) && now - d.getTime() > THIRTY_DAYS_MS;
}

/**
 * Returns a human-readable relative label such as "today", "yesterday",
 * "3 days ago", "2 weeks ago", "1 month ago", "1 year ago".
 * An invalid dateStr returns an empty string.
 */
export function relativeTime(dateStr: string, now = Date.now()): string {
  const d = parseDateLocal(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const diffDays = Math.floor((now - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 31) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.floor(diffDays / 30);
  if (diffDays < 365) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
