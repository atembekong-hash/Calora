import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (file: string) => readFileSync(resolve(__dirname, '../../', file), 'utf8');

describe('save icon consistency', () => {
  it('uses the meal icon for every meal-save surface', () => {
    expect(source('app/(tabs)/index.tsx')).toContain('accessibilityLabel={`Save ${log.name} as meal`}');
    expect(source('app/(tabs)/index.tsx')).toContain('<Feather name="coffee" size={17}');
    expect(source('app/(tabs)/planner.tsx')).toContain('accessibilityLabel={`Save ${detail.name} as meal`}');
    expect(source('app/(tabs)/planner.tsx')).toContain('<Feather name="coffee" size={16}');
    expect(source('app/(tabs)/recipes.tsx')).toContain('accessibilityLabel={canLog ? `Save ${detail.name} as meal`');
    expect(source('app/(tabs)/recipes.tsx')).toContain('<Feather name="coffee" size={17}');
    expect(source('app/(tabs)/profile.tsx')).toContain('title: "Saved meals"');
    expect(source('app/(tabs)/profile.tsx')).toContain('icon: "coffee" as const');
    expect(source('app/saved-meals.tsx')).toContain('<Feather name="coffee" size={26}');
    expect(source('components/SaveAsMealButton.tsx')).toContain('<Feather name="coffee"');
  });

  it('keeps bookmark reserved for recipe saving and learning bookmarks', () => {
    const recipes = source('app/(tabs)/recipes.tsx');
    expect(recipes).toContain('accessibilityLabel={`${savedRecipeIds.includes(detail.id) ? \'Remove\' : \'Save\'} recipe`}');
    expect(recipes).toContain('<Feather name="bookmark" size={17} color={savedRecipeIds.includes(detail.id)');
    expect(source('app/saved-recipes.tsx')).toContain('<Feather name="bookmark"');
  });
});
