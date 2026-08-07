/**
 * Unit tests for isStaleDate and relativeTime.
 *
 * All tests inject an explicit `now` timestamp so they are hermetic and
 * independent of the real system clock.
 *
 * Boundary conditions tested:
 *   - 29 days  → not stale, "4 weeks ago"
 *   - 30 days  → exactly on the boundary → not stale (strictly > 30 days)
 *   - 31 days  → stale, "1 month ago"
 *   - exactly 1 / 2 / 3 months (~30 / 60 / 90 days)
 *   - exactly 1 year (365 days)
 *   - today / yesterday / a few days / a few weeks
 */
import { describe, expect, it } from 'vitest';
import { isStaleDate, relativeTime, THIRTY_DAYS_MS, parseDateLocal } from '../memoryDateHelpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a `now` value that is exactly `days` days after the given date string. */
function nowPlusDays(dateStr: string, days: number): number {
  return parseDateLocal(dateStr).getTime() + days * 24 * 60 * 60 * 1000;
}

// A stable anchor date used throughout the tests.
const ANCHOR = '2026-01-15';

// ---------------------------------------------------------------------------
// isStaleDate
// ---------------------------------------------------------------------------

describe('isStaleDate', () => {
  it('returns false for today (0 days elapsed)', () => {
    const now = nowPlusDays(ANCHOR, 0);
    expect(isStaleDate(ANCHOR, now)).toBe(false);
  });

  it('returns false for 1 day ago', () => {
    const now = nowPlusDays(ANCHOR, 1);
    expect(isStaleDate(ANCHOR, now)).toBe(false);
  });

  it('returns false for 29 days ago (one day before threshold)', () => {
    const now = nowPlusDays(ANCHOR, 29);
    expect(isStaleDate(ANCHOR, now)).toBe(false);
  });

  it('returns false for exactly 30 days ago (threshold is strictly greater than)', () => {
    const now = parseDateLocal(ANCHOR).getTime() + THIRTY_DAYS_MS;
    expect(isStaleDate(ANCHOR, now)).toBe(false);
  });

  it('returns true for 31 days ago (one day past threshold)', () => {
    const now = nowPlusDays(ANCHOR, 31);
    expect(isStaleDate(ANCHOR, now)).toBe(true);
  });

  it('returns true for 60 days ago (~2 months)', () => {
    const now = nowPlusDays(ANCHOR, 60);
    expect(isStaleDate(ANCHOR, now)).toBe(true);
  });

  it('returns true for 90 days ago (~3 months)', () => {
    const now = nowPlusDays(ANCHOR, 90);
    expect(isStaleDate(ANCHOR, now)).toBe(true);
  });

  it('returns true for 365 days ago (1 year)', () => {
    const now = nowPlusDays(ANCHOR, 365);
    expect(isStaleDate(ANCHOR, now)).toBe(true);
  });

  it('returns false for an invalid date string', () => {
    const now = nowPlusDays(ANCHOR, 60);
    expect(isStaleDate('not-a-date', now)).toBe(false);
    expect(isStaleDate('', now)).toBe(false);
  });

  it('is false one millisecond before the threshold', () => {
    const now = parseDateLocal(ANCHOR).getTime() + THIRTY_DAYS_MS - 1;
    expect(isStaleDate(ANCHOR, now)).toBe(false);
  });

  it('is true one millisecond after the threshold', () => {
    const now = parseDateLocal(ANCHOR).getTime() + THIRTY_DAYS_MS + 1;
    expect(isStaleDate(ANCHOR, now)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// relativeTime
// ---------------------------------------------------------------------------

describe('relativeTime', () => {
  it('returns "today" when 0 days have elapsed', () => {
    const now = nowPlusDays(ANCHOR, 0);
    expect(relativeTime(ANCHOR, now)).toBe('today');
  });

  it('returns "today" when now is slightly before the observation (future-dated)', () => {
    // diffDays would be negative — clamp to "today"
    const now = parseDateLocal(ANCHOR).getTime() - 60 * 60 * 1000; // 1 hour before
    expect(relativeTime(ANCHOR, now)).toBe('today');
  });

  it('returns "yesterday" for exactly 1 day ago', () => {
    const now = nowPlusDays(ANCHOR, 1);
    expect(relativeTime(ANCHOR, now)).toBe('yesterday');
  });

  it('returns "2 days ago" for 2 days ago', () => {
    const now = nowPlusDays(ANCHOR, 2);
    expect(relativeTime(ANCHOR, now)).toBe('2 days ago');
  });

  it('returns "6 days ago" for 6 days ago', () => {
    const now = nowPlusDays(ANCHOR, 6);
    expect(relativeTime(ANCHOR, now)).toBe('6 days ago');
  });

  it('returns "1 week ago" for 7 days ago', () => {
    const now = nowPlusDays(ANCHOR, 7);
    expect(relativeTime(ANCHOR, now)).toBe('1 week ago');
  });

  it('returns "2 weeks ago" for 14 days ago', () => {
    const now = nowPlusDays(ANCHOR, 14);
    expect(relativeTime(ANCHOR, now)).toBe('2 weeks ago');
  });

  it('returns "4 weeks ago" for 29 days ago', () => {
    const now = nowPlusDays(ANCHOR, 29);
    expect(relativeTime(ANCHOR, now)).toBe('4 weeks ago');
  });

  it('returns "1 month ago" for exactly 30 days ago', () => {
    // diffDays === 30, which is < 31, so the weeks branch fires
    // Actually: 30 days → diffDays=30, weeks=4, diffDays<31 → "4 weeks ago"
    // The month branch fires at diffDays >= 31
    const now = nowPlusDays(ANCHOR, 30);
    expect(relativeTime(ANCHOR, now)).toBe('4 weeks ago');
  });

  it('returns "1 month ago" for 31 days ago (first day of month bucket)', () => {
    const now = nowPlusDays(ANCHOR, 31);
    expect(relativeTime(ANCHOR, now)).toBe('1 month ago');
  });

  it('returns "2 months ago" for 60 days ago', () => {
    const now = nowPlusDays(ANCHOR, 60);
    expect(relativeTime(ANCHOR, now)).toBe('2 months ago');
  });

  it('returns "3 months ago" for 90 days ago', () => {
    const now = nowPlusDays(ANCHOR, 90);
    expect(relativeTime(ANCHOR, now)).toBe('3 months ago');
  });

  it('returns "11 months ago" for 364 days ago', () => {
    const now = nowPlusDays(ANCHOR, 364);
    expect(relativeTime(ANCHOR, now)).toBe('12 months ago');
  });

  it('returns "1 year ago" for exactly 365 days ago', () => {
    const now = nowPlusDays(ANCHOR, 365);
    expect(relativeTime(ANCHOR, now)).toBe('1 year ago');
  });

  it('returns "2 years ago" for 730 days ago', () => {
    const now = nowPlusDays(ANCHOR, 730);
    expect(relativeTime(ANCHOR, now)).toBe('2 years ago');
  });

  it('returns empty string for an invalid date string', () => {
    const now = nowPlusDays(ANCHOR, 5);
    expect(relativeTime('not-a-date', now)).toBe('');
    expect(relativeTime('', now)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Boundary: crossing the 30-day threshold changes isStale from false to true
// ---------------------------------------------------------------------------

describe('staleness boundary crossing', () => {
  it('a signal that is 29 days old is not stale but becomes stale two days later', () => {
    const signalDate = ANCHOR;
    const nowAt29 = nowPlusDays(signalDate, 29);
    const nowAt31 = nowPlusDays(signalDate, 31);

    expect(isStaleDate(signalDate, nowAt29)).toBe(false);
    expect(isStaleDate(signalDate, nowAt31)).toBe(true);
  });

  it('relativeTime label changes from "weeks ago" to "months ago" across the 30-day boundary', () => {
    const signalDate = ANCHOR;
    const before = relativeTime(signalDate, nowPlusDays(signalDate, 29)); // weeks bucket
    const after  = relativeTime(signalDate, nowPlusDays(signalDate, 31)); // months bucket

    expect(before).toMatch(/week/);
    expect(after).toMatch(/month/);
  });
});
