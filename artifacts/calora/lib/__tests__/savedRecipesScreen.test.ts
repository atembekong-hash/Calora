import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../../app/saved-recipes.tsx'), 'utf8');

describe('saved Discover recipe restoration', () => {
  it('hydrates bundled Calora Discover recipes locally instead of querying them as remote IDs', () => {
    expect(source).toContain("import { caloraOriginalRecipes } from '@/lib/caloraOriginalRecipes';");
    expect(source).toContain('const builtInIds = useMemo(() => new Set(caloraOriginalRecipes.map((recipe) => recipe.id)), []);');
    expect(source).toContain('const savedBuiltInRecipes = useMemo(() => caloraOriginalRecipes.filter((recipe) => savedRecipeIds.includes(recipe.id)), [savedRecipeIds]);');
    expect(source).toContain('!localIds.has(id) && !builtInIds.has(id)');
    expect(source).toContain('savedBuiltInRecipes.forEach((recipe) => byId.set(recipe.id, recipe));');
  });
});
