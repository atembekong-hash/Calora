import { describe, expect, it } from 'vitest';
import { PREMIUM_PAGINATION_MIN_INTERVAL_MS, canStartPremiumPagination, isNewPremiumOffset } from '../premiumPaginationGuard';

describe('premium pagination guard', () => {
  it('blocks overlapping requests', () => {
    expect(canStartPremiumPagination({ now: 1_000, lastStartedAt: 0, inFlight: true })).toBe(false);
  });

  it('enforces a short spacing window between page requests', () => {
    expect(canStartPremiumPagination({ now: 1_000, lastStartedAt: 500, inFlight: false })).toBe(false);
    expect(canStartPremiumPagination({ now: 1_000 + PREMIUM_PAGINATION_MIN_INTERVAL_MS, lastStartedAt: 1_000, inFlight: false })).toBe(true);
  });

  it('allows the first request and rejects an already requested offset', () => {
    expect(canStartPremiumPagination({ now: 0, lastStartedAt: null, inFlight: false })).toBe(true);
    expect(isNewPremiumOffset(18, new Set([18]))).toBe(false);
    expect(isNewPremiumOffset(36, new Set([18]))).toBe(true);
    expect(isNewPremiumOffset(-1, new Set())).toBe(false);
  });
});
