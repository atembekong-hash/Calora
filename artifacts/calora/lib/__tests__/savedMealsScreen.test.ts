import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (file: string) => readFileSync(resolve(__dirname, '../../', file), 'utf8');

describe('saved meal entry points', () => {
  it('offers creation from the Saved meals header and empty state', () => {
    const savedMeals = source('app/saved-meals.tsx');
    expect(savedMeals).toContain('accessibilityLabel="Create saved meal"');
    expect(savedMeals).toContain('router.push("/profile?tab=you&open=saved-meal")');
    expect(savedMeals).toContain('Create saved meal</Text>');
  });

  it('opens the existing saved-meal form from the direct entry point', () => {
    const profile = source('app/(tabs)/profile.tsx');
    expect(profile).toContain('if (open === "saved-meal") setSavedMealModal(true);');
  });

  it('allows dashboard diary entries, recipes, and planned meals to become saved meals', () => {
    const home = source('app/(tabs)/index.tsx');
    const recipes = source('app/(tabs)/recipes.tsx');
    const planner = source('app/(tabs)/planner.tsx');
    expect(home).toContain('Save ${log.name} as meal');
    expect(home).toContain('saveMeal({');
    expect(recipes).toContain('Save ${detail.name} as meal');
    expect(recipes).toContain("kind: 'recipe'");
    expect(planner).toContain('Save ${detail.name} as meal');
    expect(planner).toContain("kind: 'meal'");
  });

  it('exposes the same action on reviewed scan, restaurant, saved-recipe, and memory surfaces', () => {
    expect(source('components/SaveAsMealButton.tsx')).toContain('Save as meal');
    expect(source('app/(tabs)/scan.tsx')).toContain('Save reviewed meal as meal');
    expect(source('app/restaurants.tsx')).toContain('Save ${detail.name} as meal');
    expect(source('app/saved-recipes.tsx')).toContain('onSaveAsMeal={saveRecipeAsMeal}');
    expect(source('app/memory.tsx')).toContain('Save ${title} as meal');
  });
});
