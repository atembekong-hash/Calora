import type { PremiumRecipe } from '@workspace/api-client-react';

export type PremiumCatalogueState = { userId: string | null; recipes: PremiumRecipe[] };

/** Avoid a parent write when a catalogue child republishes the same page. */
export function samePremiumCatalogueState(
  current: PremiumCatalogueState,
  userId: string | null,
  recipes: PremiumRecipe[],
): boolean {
  return current.userId === userId
    && current.recipes.length === recipes.length
    && current.recipes.every((recipe, index) => (
      recipe.id === recipes[index]?.id
      && recipe.image === recipes[index]?.image
    ));
}

/** Previous-offset placeholder data must never advance pagination state. */
export function canApplyPremiumPage(isPlaceholderData: boolean): boolean {
  return !isPlaceholderData;
}