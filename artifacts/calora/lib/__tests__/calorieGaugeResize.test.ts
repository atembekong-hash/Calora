import { describe, expect, it } from 'vitest';
import {
  calorieGaugeResizeProgress,
  clampCalorieGaugeResizeOffset,
} from '../calorieGaugeResize';

describe('calorie gauge continuous resize', () => {
  it('keeps drag values inside the supported range', () => {
    expect(clampCalorieGaugeResizeOffset(-20, 0, 120)).toBe(0);
    expect(clampCalorieGaugeResizeOffset(64, 0, 120)).toBe(64);
    expect(clampCalorieGaugeResizeOffset(200, 0, 120)).toBe(120);
  });

  it('normalizes non-finite drag values to the minimum', () => {
    expect(clampCalorieGaugeResizeOffset(Number.NaN, 0, 120)).toBe(0);
    expect(clampCalorieGaugeResizeOffset(Number.POSITIVE_INFINITY, 0, 120)).toBe(0);
  });

  it('maps the current height to a bounded roller progress', () => {
    expect(calorieGaugeResizeProgress(0, 120)).toBe(0);
    expect(calorieGaugeResizeProgress(60, 120)).toBe(0.5);
    expect(calorieGaugeResizeProgress(180, 120)).toBe(1);
  });

  it('handles an invalid roller range without producing NaN', () => {
    expect(calorieGaugeResizeProgress(50, 0)).toBe(0);
  });
});