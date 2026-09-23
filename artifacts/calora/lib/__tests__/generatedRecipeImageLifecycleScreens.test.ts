import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const recipesScreen = readFileSync(resolve(__dirname, '../../app/(tabs)/recipes.tsx'), 'utf8');
const savedRecipesScreen = readFileSync(resolve(__dirname, '../../app/saved-recipes.tsx'), 'utf8');

describe('generated recipe image renewal screen integration', () => {
  it('uses the common lifecycle hook from the existing Recipes surface instead of a screen-local URL refresh loop', () => {
    expect(recipesScreen).toContain('retryOrRegenerateRecipeImage, reviewRecipeImage, useGeneratedRecipeImageRefresh');
    expect(recipesScreen).toContain('useGeneratedRecipeImageRefresh({ accountId: user?.id, recipes: localRecipes, updateRecipe });');
    expect(recipesScreen).not.toContain('requestGeneratedRecipePhotoUrl');
    expect(recipesScreen).toContain('retryOrRegenerateRecipeImage({ accountId: user?.id, recipe, updateRecipe, isAccountActive })');
    expect(recipesScreen).toContain('activeAccountIdRef.current === id');
  });

  it('uses the same lifecycle hook when Saved Recipes mounts directly and routes failed-photo retry through the shared service', () => {
    expect(savedRecipesScreen).toContain("import { retryOrRegenerateRecipeImage, useGeneratedRecipeImageRefresh } from '@/lib/generatedRecipeImageLifecycle'");
    expect(savedRecipesScreen).toContain('useGeneratedRecipeImageRefresh({ accountId: user?.id, recipes: localRecipes, updateRecipe });');
    expect(savedRecipesScreen).toContain('retryOrRegenerateRecipeImage({ accountId: user?.id, recipe, updateRecipe, isAccountActive });');
    expect(savedRecipesScreen).toContain('const isAccountActive = (accountId: string) => activeAccountIdRef.current === accountId;');
  });
});
