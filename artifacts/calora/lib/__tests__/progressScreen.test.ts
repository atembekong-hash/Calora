import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../../app/(tabs)/insights.tsx'),
  'utf8',
);

describe('Progress dashboard layout contracts', () => {
  it('removes the weekly-signal hero widget while preserving the Progress controls', () => {
    expect(source).not.toContain('WEEKLY SIGNAL');
    expect(source).not.toContain('THE BIGGER PICTURE');
    expect(source).not.toContain('Patterns, not pressure');
    expect(source).not.toContain('Make tomorrow easier.');
    expect(source).not.toContain('useHourlyHeaderImage');
    expect(source).not.toContain('heroParallaxStyle');
    expect(source).not.toContain('styles.heroHeader');

    const tabs = source.indexOf('testID="progress-section-tabs"');
    const pager = source.indexOf('<SwipeableSectionPager');
    expect(tabs).toBeGreaterThan(-1);
    expect(pager).toBeGreaterThan(tabs);
  });
});
