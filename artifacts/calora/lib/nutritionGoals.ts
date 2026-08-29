import type { Profile } from '@/context/CaloraContext';

export type MacroTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

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