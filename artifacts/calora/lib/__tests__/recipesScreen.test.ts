import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Recipes Discover layout contracts', () => {
  it('reduces the Discover hero widget by 40% while preserving its content layer', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('recipeHeader: { height: 114');
    expect(source).toContain('recipeHeaderContent: { height: 114');
    expect(source).toContain('paddingBottom: 14, justifyContent: \'flex-end\'');
  });
});