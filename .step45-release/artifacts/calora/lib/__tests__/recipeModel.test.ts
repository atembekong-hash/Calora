import { describe, expect, it } from 'vitest';
import { recipeNutritionLabel, recipeProvenance, recipeSourceLabel } from '@/lib/recipeModel';
import type { CaloraRecipe } from '@/context/CaloraContext';
import type { Recipe } from '@workspace/api-client-react';

const localRecipe = (overrides: Partial<CaloraRecipe> = {}): CaloraRecipe => ({
  id: 'local-1',
  name: 'My pasta',
  ingredients: [],
  tags: [],
  source: 'Calora',
  sourceUrl: '',
  isLocal: true,
  ...overrides,
});

const remoteRecipe = (overrides: Partial<CaloraRecipe> = {}): Recipe => ({
  id: 'remote-1',
  name: 'Provider recipe',
  source: 'TheMealDB',
  ingredients: [],
  tags: [],
  ...overrides,
} as Recipe);

describe('recipe provenance normalization', () => {
  it('keeps legacy local recipes user-authored with user-entered nutrition', () => {
    const recipe = localRecipe({ calories: 540, proteinG: 31 });
    expect(recipeProvenance(recipe)).toMatchObject({
      sourceType: 'user_created',
      sourceProvider: 'Calora',
      nutritionConfidence: 'user_entered',
    });
    expect(recipeSourceLabel(recipe)).toBe('Created in Calora');
    expect(recipeNutritionLabel(recipe)).toBe('User-entered nutrition');
  });

  it('normalizes the original persisted Created in Calora source label', () => {
    const recipe = localRecipe({ source: 'Created in Calora' });
    expect(recipeProvenance(recipe).sourceProvider).toBe('Calora');
    expect(recipeSourceLabel(recipe)).toBe('Created in Calora');
  });

  it('preserves explicit future source and verified-nutrition metadata', () => {
    const recipe = remoteRecipe({
      sourceType: 'premium',
      sourceProvider: 'Provider One',
      sourceId: 'provider-42',
      nutritionConfidence: 'verified',
      nutritionSource: 'Provider nutrition data',
    });
    expect(recipeProvenance(recipe)).toMatchObject({
      sourceType: 'premium',
      sourceProvider: 'Provider One',
      sourceId: 'provider-42',
      nutritionConfidence: 'verified',
    });
    expect(recipeSourceLabel(recipe)).toBe('Premium source · Provider One');
    expect(recipeNutritionLabel(recipe)).toBe('Verified nutrition');
  });

  it('keeps explicit Calora AI provenance on a non-local recipe', () => {
    const recipe = remoteRecipe({
      sourceType: 'calora_ai',
      sourceProvider: 'Calora',
      nutritionConfidence: 'estimated',
      nutritionSource: 'Calora calculation',
    });
    expect(recipeProvenance(recipe)).toMatchObject({ sourceType: 'calora_ai', nutritionConfidence: 'estimated' });
    expect(recipeSourceLabel(recipe)).toBe('Created with Calora AI');
    expect(recipeNutritionLabel(recipe)).toBe('Estimated nutrition');
  });

  it('marks recipes without nutrition as needing review', () => {
    expect(recipeNutritionLabel(localRecipe())).toBe('Nutrition review needed');
  });
});