import type { Recipe } from '@workspace/api-client-react';
import type { CaloraRecipe } from '@/context/CaloraContext';

export type RecipeSourceType = 'open' | 'premium' | 'calora_ai' | 'user_created' | 'imported';
export type NutritionConfidence = 'verified' | 'estimated' | 'user_entered' | 'unavailable';

type RecipeLike = Recipe | CaloraRecipe;

export type CanonicalRecipeProvenance = {
  sourceType: RecipeSourceType;
  sourceProvider: string;
  sourceId: string;
  nutritionConfidence: NutritionConfidence;
  nutritionSource: string;
};

function isLocalRecipe(recipe: RecipeLike): recipe is CaloraRecipe {
  return 'isLocal' in recipe && recipe.isLocal === true;
}

/**
 * Provides one provenance contract for existing open-source and local recipes.
 * Legacy records receive conservative defaults so stored recipes remain readable
 * while later source types can supply their own explicit metadata.
 */
export function recipeProvenance(recipe: RecipeLike): CanonicalRecipeProvenance {
  const local = isLocalRecipe(recipe);
  // Provenance is attached to the recipe itself, not to its persistence location.
  // Provider and future AI records may be remote while still using CaloraRecipe's
  // backward-compatible metadata contract.
  const extendedRecipe = recipe as CaloraRecipe;
  const explicitType = extendedRecipe.sourceType;
  const explicitConfidence = extendedRecipe.nutritionConfidence;
  const hasNutrition = Boolean(recipe.calories && recipe.calories > 0);
  const legacyCreatedPrefix = /^created in\s+/i;
  const legacyProvider = local ? recipe.source.replace(legacyCreatedPrefix, '').trim() : '';

  return {
    sourceType: explicitType ?? (local ? 'user_created' : 'open'),
    sourceProvider: extendedRecipe.sourceProvider ?? (local ? (legacyProvider || 'Calora') : recipe.source),
    sourceId: extendedRecipe.sourceId ?? recipe.id,
    nutritionConfidence: explicitConfidence ?? (local ? (hasNutrition ? 'user_entered' : 'unavailable') : (hasNutrition ? 'estimated' : 'unavailable')),
    nutritionSource: extendedRecipe.nutritionSource ?? (local ? (hasNutrition ? 'User entered' : 'Unavailable') : (hasNutrition ? 'Calora estimate' : 'Unavailable')),
  };
}

export function recipeSourceLabel(recipe: RecipeLike): string {
  const provenance = recipeProvenance(recipe);
  if (provenance.sourceType === 'open') return `Open source · ${provenance.sourceProvider}`;
  if (provenance.sourceType === 'calora_ai') return 'Created with Calora AI';
  if (provenance.sourceType === 'premium') return `Premium source · ${provenance.sourceProvider}`;
  if (provenance.sourceType === 'imported') return `Imported · ${provenance.sourceProvider}`;
  return `Created in ${provenance.sourceProvider}`;
}

export function recipeNutritionLabel(recipe: RecipeLike): string {
  const confidence = recipeProvenance(recipe).nutritionConfidence;
  if (confidence === 'verified') return 'Verified nutrition';
  if (confidence === 'estimated') return 'Estimated nutrition';
  if (confidence === 'user_entered') return 'User-entered nutrition';
  return 'Nutrition review needed';
}