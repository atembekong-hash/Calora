import { describe, expect, it } from 'vitest';
import { recommendCalories } from '../calorieRecommendation';
import { canUseAutomaticTargets, profileTargetMode, recommendationForProfile, validatePersonalDetails } from '../profileTargets';

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

  it('does not allow automatic calorie targets for minors', () => {
    expect(canUseAutomaticTargets({ age: 17 })).toBe(false);
    expect(canUseAutomaticTargets({ age: 18 })).toBe(true);
  });

  it('validates metric and imperial personal values in their displayed units', () => {
    expect(validatePersonalDetails({
      age: '31', height: '172', weight: '76', targetWeight: '68',
      activity: 'moderate', diet: 'Everything', goal: 'lose',
    }, 'metric')).toMatchObject({ ok: true, values: { weightKg: 76, heightCm: 172 } });
    const imperial = validatePersonalDetails({
      age: '31', height: '68', weight: '168', targetWeight: '150',
      activity: 'moderate', diet: 'Everything', goal: 'lose',
    }, 'imperial');
    expect(imperial.ok).toBe(true);
    if (imperial.ok) {
      expect(imperial.values.weightKg).toBeCloseTo(76.2, 1);
      expect(imperial.values.heightCm).toBeCloseTo(172.72, 2);
    }
    expect(validatePersonalDetails({
      age: '17', height: '172', weight: '76', targetWeight: '68',
      activity: 'moderate', diet: 'Everything', goal: 'lose',
    }, 'metric')).toEqual({ ok: false, message: 'Calora is currently available to people 18 and older.' });
  });

  it('round-trips whole-number imperial display strings without exposing fractions', () => {
    const original = { heightCm: 172, weightKg: 76, targetWeightKg: 68 };
    const result = validatePersonalDetails({
      age: '31',
      height: String(Math.round(original.heightCm * 0.393701)),
      weight: String(Math.round(original.weightKg * 2.20462)),
      targetWeight: String(Math.round(original.targetWeightKg * 2.20462)),
      activity: 'moderate', diet: 'Everything', goal: 'lose',
    }, 'imperial');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.values.heightCm).toBeCloseTo(172.72, 2);
      expect(result.values.weightKg).toBeCloseTo(76.2, 2);
      expect(result.values.targetWeightKg).toBeCloseTo(68.04, 2);
    }
  });
});
