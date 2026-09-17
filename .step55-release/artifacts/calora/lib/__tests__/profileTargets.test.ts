import { describe, expect, it } from 'vitest';
import { recommendCalories } from '../calorieRecommendation';
import { profileTargetMode, recommendationForProfile, validatePersonalDetails } from '../profileTargets';

describe('profile target migration helpers', () => {
  it('treats profiles saved before target modes as custom', () => {
    expect(profileTargetMode({ targetMode: undefined } as never)).toBe('custom');
    expect(profileTargetMode({ targetMode: 'automatic' } as never)).toBe('automatic');
  });

  it('uses the exact onboarding calorie recommendation', () => {
    const inputs = { weightKg: 76, activity: 'moderate' as const, goal: 'lose' as const };
    expect(recommendationForProfile(inputs)).toBe(recommendCalories(inputs));
    expect(recommendCalories(inputs)).toBe(2050);
  });

  it('validates metric and imperial personal values in their displayed units', () => {
    expect(validatePersonalDetails({
      age: '31', height: '172', weight: '76', targetWeight: '68',
      activity: 'moderate', diet: 'Everything', goal: 'lose',
    }, 'metric')).toMatchObject({ ok: true, values: { weightKg: 76, heightCm: 172 } });
    const imperial = validatePersonalDetails({
      age: '31', height: '68', weight: '167.55', targetWeight: '149.9',
      activity: 'moderate', diet: 'Everything', goal: 'lose',
    }, 'imperial');
    expect(imperial.ok).toBe(true);
    if (imperial.ok) {
      expect(imperial.values.weightKg).toBeCloseTo(76, 2);
      expect(imperial.values.heightCm).toBeCloseTo(172.72, 2);
    }
    expect(validatePersonalDetails({
      age: '8', height: '172', weight: '76', targetWeight: '68',
      activity: 'moderate', diet: 'Everything', goal: 'lose',
    }, 'metric')).toEqual({ ok: false, message: 'Enter an age from 13 to 120.' });
  });

  it('round-trips precise imperial display strings without changing canonical values', () => {
    const original = { heightCm: 172, weightKg: 76.123, targetWeightKg: 68.456 };
    const result = validatePersonalDetails({
      age: '31',
      height: String(original.heightCm * 0.393701),
      weight: String(original.weightKg * 2.20462),
      targetWeight: String(original.targetWeightKg * 2.20462),
      activity: 'moderate', diet: 'Everything', goal: 'lose',
    }, 'imperial');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.values.heightCm).toBeCloseTo(original.heightCm, 10);
      expect(result.values.weightKg).toBeCloseTo(original.weightKg, 10);
      expect(result.values.targetWeightKg).toBeCloseTo(original.targetWeightKg, 10);
    }
  });
});