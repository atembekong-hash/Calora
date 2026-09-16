import { describe, expect, it } from 'vitest';
import { formatCalories, formatGrams, formatPercent, formatQuantity, formatWhole } from '@/lib/formatters';

describe('presentation formatters', () => {
  it('rounds calories and macros without changing source values', () => {
    expect(formatCalories(2952.679)).toBe('2,953 kcal');
    expect(formatGrams(157.485232)).toBe('157 g');
  });

  it('formats percentages and useful decimal quantities consistently', () => {
    expect(formatPercent(98.4)).toBe('98%');
    expect(formatQuantity(1.5000000002)).toBe('1.5');
  });

  it('never exposes invalid numeric artifacts', () => {
    expect(formatWhole(Number.NaN)).toBe('—');
    expect(formatCalories(Infinity)).toBe('Nutrition review needed');
  });
});