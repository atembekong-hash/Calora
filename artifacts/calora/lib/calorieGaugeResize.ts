export const DEFAULT_CALORIE_GAUGE_RESIZE_MAX = 156;

export function clampCalorieGaugeResizeOffset(
  offset: number,
  min = 0,
  max = DEFAULT_CALORIE_GAUGE_RESIZE_MAX,
): number {
  if (!Number.isFinite(offset)) return min;
  return Math.min(max, Math.max(min, offset));
}

export function calorieGaugeResizeProgress(
  offset: number,
  max = DEFAULT_CALORIE_GAUGE_RESIZE_MAX,
): number {
  if (!Number.isFinite(max) || max <= 0) return 0;
  return clampCalorieGaugeResizeOffset(offset, 0, max) / max;
}