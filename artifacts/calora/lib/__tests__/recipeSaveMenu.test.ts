import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, '../../components/RecipeSaveMenu.tsx'), 'utf8');

describe('RecipeSaveMenu', () => {
  it('uses distinct bookmark and meal icons', () => {
    expect(source).toContain('name="bookmark"');
    expect(source).toContain('name="coffee"');
  });

  it('keeps recipe and meal actions independent', () => {
    expect(source).toContain('onSaveRecipe');
    expect(source).toContain('onSaveMeal');
    expect(source).toContain('onRemoveMeal');
    expect(source).toContain('recipeSaved ? \'Remove\' : \'Save\'');
    expect(source).toContain('mealSaved && onRemoveMeal');
  });

  it('explains unavailable nutrition instead of silently failing', () => {
    expect(source).toContain('Complete nutrition information is required');
    expect(source).toContain('accessibilityState={{ disabled: !mealSaveAvailable }}');
  });

  it('offers accessible labels and a cancel path', () => {
    expect(source).toContain('accessibilityHint="Choose whether to save this item as a recipe, a meal, or both"');
    expect(source).toContain('accessibilityLabel="Cancel save options"');
    expect(source).toContain('SAVE OPTIONS');
  });
});
