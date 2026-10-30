export const PREMIUM_PAGINATION_MIN_INTERVAL_MS = 750;

export function canStartPremiumPagination({
  now,
  lastStartedAt,
  inFlight,
}: {
  now: number;
  lastStartedAt: number | null;
  inFlight: boolean;
}): boolean {
  if (inFlight) return false;
  if (lastStartedAt == null) return true;
  return now - lastStartedAt >= PREMIUM_PAGINATION_MIN_INTERVAL_MS;
}

export function isNewPremiumOffset(offset: number, requestedOffsets: ReadonlySet<number>): boolean {
  return Number.isInteger(offset) && offset >= 0 && !requestedOffsets.has(offset);
}
