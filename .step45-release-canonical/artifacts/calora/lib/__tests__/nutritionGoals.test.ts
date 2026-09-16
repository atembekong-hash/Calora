import { describe, expect, it } from 'vitest';
import type { Profile } from '@/context/CaloraContext';
import { getMacroTargets, validateMacroGoalInput } from '../nutritionGoals';

const profile: Profile = {
  name: 'Jordan',
  goal: 'maintain',
  activity: 'moderate',
  diet: 'Everything',
  heightCm: 170,
  weightKg: 70,
  targetWeightKg: 70,
  age: 30,
  calorieTarget: 2000,
};

describe('getMacroTargets', () => {
  it('preserves the existing ratio-derived targets for legacy profiles', () => {
    expect(getMacroTargets(profile)).toEqual({
      calories: 2000,
      protein: 130,
      carbs: 220,
      fat: 67,
    });
  });

  it('uses independently saved macro targets without forcing calorie consistency', () => {
    expect(getMacroTargets({
      ...profile,
      calorieTarget: 2400,
      proteinTargetGrams: 175,
      carbsTargetGrams: 205,
      fatTargetGrams: 82,
    })).toEqual({
      calories: 2400,
      protein: 175,
      carbs: 205,
      fat: 82,
    });
  });

  it('uses derived recommendations in automatic mode and preserves independent custom grams', () => {
    expect(getMacroTargets({
      ...profile,
      targetMode: 'automatic',
      proteinTargetGrams: 175,
      carbsTargetGrams: 205,
      fatTargetGrams: 82,
    })).toEqual({ calories: 2000, protein: 130, carbs: 220, fat: 67 });
    expect(getMacroTargets({ ...profile, targetMode: 'custom', proteinTargetGrams: 175, carbsTargetGrams: 205, fatTargetGrams: 82 }))
      .toEqual({ calories: 2000, protein: 175, carbs: 205, fat: 82 });
  });

  it('falls back safely when persisted custom targets are invalid', () => {
    expect(getMacroTargets({
      ...profile,
      proteinTargetGrams: 0,
      carbsTargetGrams: Number.NaN,
      fatTargetGrams: -1,
    })).toEqual({
      calories: 2000,
      protein: 130,
      carbs: 220,
      fat: 67,
    });
  });
});

describe('validateMacroGoalInput', () => {
  it('accepts and rounds valid independent targets', () => {
    expect(validateMacroGoalInput({
      calories: '2150.4',
      protein: '142.6',
      carbs: '198.2',
      fat: '76.8',
    })).toEqual({
      ok: true,
      values: {
        calories: 2150,
        protein: 143,
        carbs: 198,
        fat: 77,
      },
    });
  });

  it('rejects missing or non-positive values', () => {
    expect(validateMacroGoalInput({
      calories: '2000',
      protein: '',
      carbs: '220',
      fat: '67',
    })).toEqual({
      ok: false,
      message: 'Enter a positive value for calories and each macro.',
    });

    expect(validateMacroGoalInput({
      calories: '2000',
      protein: '0.4',
      carbs: '220',
      fat: '67',
    })).toEqual({
      ok: false,
      message: 'Enter at least 1 gram for each macro target.',
    });
  });

  it('rejects values outside the supported daily ranges', () => {
    expect(validateMacroGoalInput({
      calories: '10000',
      protein: '130',
      carbs: '220',
      fat: '67',
    })).toEqual({
      ok: false,
      message: 'Calories must be between 500 and 9,999 per day.',
    });

    expect(validateMacroGoalInput({
      calories: '2000',
      protein: '501',
      carbs: '220',
      fat: '67',
    })).toEqual({
      ok: false,
      message: 'Check the macro values: protein, carbs, and fat are above the supported daily range.',
    });
  });
});