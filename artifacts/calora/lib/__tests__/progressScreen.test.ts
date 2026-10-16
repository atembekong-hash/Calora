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

  it('keeps Trend headers, date controls, and chart labels inside bounded scroll viewports', () => {
    expect(source).toContain("lineGraphViewport: { width: '100%', overflow: 'hidden' }");
    expect(source).toContain("lineGraphScroll: { width: '100%' }");
    expect(source).toContain('const contentWidth = Math.max(chartWidth, points.length * 48);');
    expect(source).toContain('sectionHeaderCopy: { flexGrow: 1, flexShrink: 1, minWidth: 0');
    expect(source).toContain("healthTrendHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap'");
    expect(source).toContain('numberOfLines={1} style={[styles.lineGraphLabel');
  });
});
