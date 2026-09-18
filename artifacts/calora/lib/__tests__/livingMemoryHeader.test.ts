import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Progress living-memory header action', () => {
  const source = readFileSync(resolve(__dirname, '../../app/(tabs)/insights.tsx'), 'utf8');

  it('has a direct, accessible 44 pt target and a larger icon', () => {
    expect(source).toContain('testID="living-memory-header-button"');
    expect(source).toContain('headerIconButton: { width: 44, height: 44');
    expect(source).toContain('name="compass" size={18}');
  });
});