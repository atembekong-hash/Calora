export const SHEET_DISMISS_DISTANCE = 56;
export const SHEET_DISMISS_VELOCITY = 0.85;

/** Only a deliberate, predominantly downward handle gesture may close a sheet. */
export function shouldDismissSheetPan(
  dx: number,
  dy: number,
  vx: number,
  vy: number,
): boolean {
  if (dy <= 0 || Math.abs(dx) > dy * 0.8) return false;
  return dy >= SHEET_DISMISS_DISTANCE
    || (dy >= 18 && vy >= SHEET_DISMISS_VELOCITY && Math.abs(vx) < Math.abs(vy));
}
