import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseNutritionInput } from '../recipeNutrition';

describe('Planner nutrition entry contract', () => {
  it('keeps blank values unavailable and preserves explicit zero for the shared parser', () => {
    expect(parseNutritionInput('')).toBeNull();
    expect(parseNutritionInput('0')).toBe(0);
    expect(parseNutritionInput('42')).toBe(42);
  });

  it('validates every custom and edited nutrition field before writing a meal', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/planner.tsx'),
      'utf8',
    );

    expect(source).toContain('const invalid = nutrition.find(([, value]) => value === null)');
    expect(source).toContain('const [calories, proteinG, carbsG, fatG] = nutrition.map(([, value]) => value as number)');
    expect(source).not.toContain('nutrition[0][1] ?? 0');
    expect(source).not.toContain('nutrition[1][1] ?? 0');
    expect(source).not.toContain('nutrition[2][1] ?? 0');
    expect(source).not.toContain('nutrition[3][1] ?? 0');
  });
});