export type RecipeNutritionState = 'available' | 'loading' | 'unavailable' | 'error';

export type RecipeNutritionInput = {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  loading?: boolean;
  pending?: boolean;
  unavailable?: boolean;
  error?: boolean;
};

export function isFiniteNutritionValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function hasCompleteNutrition(input: RecipeNutritionInput): boolean {
  return [input.calories, input.proteinG, input.carbsG, input.fatG].every(isFiniteNutritionValue);
}

export function getRecipeNutritionState(input: RecipeNutritionInput): RecipeNutritionState {
  if (input.error) return 'error';
  const hasCalories = isFiniteNutritionValue(input.calories);
  if (input.pending || (input.loading && !hasCalories)) return 'loading';
  if (input.unavailable || !hasCalories) return 'unavailable';
  return 'available';
}

export function formatRecipeNutrition(value: unknown, suffix = '', approximate = false): string {
  if (!isFiniteNutritionValue(value)) return '—';
  return `${approximate ? '~' : ''}${Math.round(value)}${suffix}`;
}