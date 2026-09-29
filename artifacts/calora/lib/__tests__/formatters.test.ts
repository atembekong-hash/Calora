import { describe, expect, it } from 'vitest';
import { formatCalories, formatGrams, formatPercent, formatQuantity, formatWhole, normalizeWholeNumberInput } from '@/lib/formatters';

describe('presentation formatters', () => {
  it('rounds calories and macros without changing source values', () => {
    expect(formatCalories(2952.679)).toBe('2,953 kcal');
    expect(formatGrams(157.485232)).toBe('157 g');
  });

  it('formats percentages and quantities as whole numbers', () => {
    expect(formatPercent(98.4)).toBe('98%');
    expect(formatQuantity(1.5000000002)).toBe('2');
  });

  it('never exposes invalid numeric artifacts', () => {
    expect(formatWhole(Number.NaN)).toBe('—');
    expect(formatCalories(Infinity)).toBe('Nutrition review needed');
  });

  it('keeps editable numeric fields whole-number-only', () => {
    expect(normalizeWholeNumberInput('1,250')).toBe('1250');
    expect(normalizeWholeNumberInput('12.5')).toBe('12');
    expect(normalizeWholeNumberInput('42 calories')).toBe('42');
  });
});
