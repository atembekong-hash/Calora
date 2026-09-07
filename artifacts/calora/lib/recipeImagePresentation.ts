export type RecipeImageRole = 'breakfast' | 'drink' | 'main' | 'snack';

export type RecipeImagePresentationInput = {
  name: string;
  category?: string | null;
  mealType?: string | null;
  tags?: readonly string[];
};

export function recipeImageRole(recipe: RecipeImagePresentationInput): RecipeImageRole {
  const searchable = [recipe.name, recipe.category, recipe.mealType, ...(recipe.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/\b(drink|smoothie|juice|tea|coffee|cocktail)\b/.test(searchable)) return 'drink';
  if (/\b(snack|appetizer|starter|dip)\b/.test(searchable)) return 'snack';
  if (/\b(breakfast|brunch|oat|egg|pancake|waffle)\b/.test(searchable)) return 'breakfast';
  return 'main';
}