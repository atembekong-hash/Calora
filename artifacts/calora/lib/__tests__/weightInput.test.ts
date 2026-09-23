import { describe, expect, it } from 'vitest';
import { KG_PER_LB, displayWeight, validateWeightInput } from '../weightInput';

describe('validateWeightInput', () => {
  it('converts an imperial input to the canonical kilogram value', () => {
    const result = validateWeightInput('176', 'imperial');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.kg).toBeCloseTo(176 * KG_PER_LB, 6);
  });

  it('rejects values outside Calora’s supported body-weight range', () => {
    expect(validateWeightInput('10', 'metric')).toMatchObject({ ok: false });
    expect(validateWeightInput('1000', 'imperial')).toMatchObject({ ok: false });
  });

  it('formats canonical kilograms in the selected display unit', () => {
    expect(displayWeight(70, 'metric')).toBe(70);
    expect(displayWeight(70, 'imperial')).toBeCloseTo(154.324, 3);
  });
});
