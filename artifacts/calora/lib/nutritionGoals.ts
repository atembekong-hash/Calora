import type { Profile } from '@/context/CaloraContext';

export type MacroTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MacroGoalInput = Record<keyof MacroTargets, string>;
export type MacroGoalValidation =
  | { ok: true; values: MacroTargets }
  | { ok: false; message: string };

const DEFAULT_CALORIES = 2000;
const DEFAULT_PROTEIN_RATIO = 0.26;
const DEFAULT_CARBS_RATIO = 0.44;
const DEFAULT_FAT_RATIO = 0.3;

function positiveOrFallback(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value! : fallback;
}

export function getMacroTargets(profile: Profile | null): MacroTargets {
  const calories = positiveOrFallback(profile?.calorieTarget, DEFAULT_CALORIES);

  return {
    calories,
    protein: positiveOrFallback(profile?.proteinTargetGrams, Math.round(calories * DEFAULT_PROTEIN_RATIO / 4)),
    carbs: positiveOrFallback(profile?.carbsTargetGrams, Math.round(calories * DEFAULT_CARBS_RATIO / 4)),
    fat: positiveOrFallback(profile?.fatTargetGrams, Math.round(calories * DEFAULT_FAT_RATIO / 9)),
  };
}

export function validateMacroGoalInput(input: MacroGoalInput): MacroGoalValidation {
  const values: MacroTargets = {
    calories: Number(input.calories),
    protein: Number(input.protein),
    carbs: Number(input.carbs),
    fat: Number(input.fat),
  };
  if (Object.values(values).some((value) => !Number.isFinite(value) || value <= 0)) {
    return { ok: false, message: 'Enter a positive value for calories and each macro.' };
  }
  if (values.protein < 1 || values.carbs < 1 || values.fat < 1) {
    return { ok: false, message: 'Enter at least 1 gram for each macro target.' };
  }
  if (values.calories < 500 || values.calories > 9999) {
    return { ok: false, message: 'Calories must be between 500 and 9,999 per day.' };
  }
  if (values.protein > 500 || values.carbs > 1000 || values.fat > 300) {
    return {
      ok: false,
      message: 'Check the macro values: protein, carbs, and fat are above the supported daily range.',
    };
  }

  return {
    ok: true,
    values: {
      calories: Math.round(values.calories),
      protein: Math.round(values.protein),
      carbs: Math.round(values.carbs),
      fat: Math.round(values.fat),
    },
  };
}