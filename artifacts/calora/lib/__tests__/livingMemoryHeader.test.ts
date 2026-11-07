import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Progress header actions', () => {
  const source = readFileSync(resolve(__dirname, '../../app/(tabs)/insights.tsx'), 'utf8');

  it('keeps the Insights action as a direct, accessible 44 pt target', () => {
    expect(source).toContain('testID="progress-insights-header-button"');
    expect(source).toContain('accessibilityLabel="Open Insights"');
    expect(source).toContain('headerIconButton: { width: 44, height: 44');
    expect(source).toContain('name="star" size={18}');
  });
});
