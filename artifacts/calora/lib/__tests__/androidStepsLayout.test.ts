import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { androidStepsLayout, ANDROID_STEPS_RING_PULSE } from '../steps/androidStepsLayout';

const widths = [320, 360, 390, 412, 430, 600];

describe('Android-only Today Steps layout', () => {
  it.each(widths)('contains the expanded ring at %ipx without increasing the ordinary card height', (viewportWidth) => {
    const cardWidth = viewportWidth - 32;
    const layout = androidStepsLayout({ cardWidth, viewportWidth, expanded: true });
    expect(layout.height).toBeCloseTo(159.2);
    expect(layout.diameter).toBeCloseTo(115.2);
    expect(layout.diameter / 160).toBeCloseTo(0.72);
    expect(layout.diameter * ANDROID_STEPS_RING_PULSE + 2 * layout.padding + 4).toBeLessThanOrEqual(layout.height);
    expect(layout.diameter * ANDROID_STEPS_RING_PULSE + 2 * layout.padding + layout.gap + 104 + 4).toBeLessThanOrEqual(cardWidth);
  });

  it.each(widths)('budgets the compact ring and right-side controls at %ipx', (viewportWidth) => {
    const cardWidth = viewportWidth < 360 ? viewportWidth - 32 : (viewportWidth - 32 - 8) / 2;
    const layout = androidStepsLayout({ cardWidth, viewportWidth, expanded: false });
    const previousDiameter = viewportWidth < 400 ? 80 : 90;
    expect(layout.height).toBeCloseTo(129.6);
    expect(layout.diameter / previousDiameter).toBeCloseTo(0.72);
    expect(layout.diameter * ANDROID_STEPS_RING_PULSE + 2 * layout.padding + layout.gap + 58 + 4).toBeLessThanOrEqual(cardWidth);
    expect(layout.diameter * ANDROID_STEPS_RING_PULSE + 2 * layout.padding + 4).toBeLessThanOrEqual(layout.height);
  });

  it('uses the measured card width, including narrow embedded cards, and detects accessibility scaling', () => {
    const layout = androidStepsLayout({ cardWidth: 128, viewportWidth: 430, expanded: false, fontScale: 1.5 });
    expect(layout.diameter).toBeLessThan(90 * 0.72);
    expect(layout.diameter).toBeGreaterThan(0);
    expect(layout.largeText).toBe(true);
    expect(androidStepsLayout({ cardWidth: 0, viewportWidth: 430, expanded: false }).diameter).toBe(0);
  });

  it('keeps the production data and callbacks in Today and leaves the non-Android render branch unchanged', () => {
    const source = readFileSync(resolve(__dirname, '../../app/(tabs)/index.tsx'), 'utf8');
    const androidStart = source.indexOf("if (Platform.OS === 'android') {", source.indexOf('function StepsTodayCard'));
    const expandedStart = source.indexOf('  if (expanded) {', androidStart);
    const android = source.slice(androidStart, expandedStart);
    expect(android).toContain('steps={steps} goal={dailyStepGoal} progress={progress}');
    expect(android).toContain('status={status}');
    expect(android).toContain('actionLabel={actionLabel} onAction={onPress} onOpenSteps={onOpenSteps}');
    expect(android).toContain('onDismiss={() => onDismissMilestone(milestone)}');
    expect(source.slice(expandedStart)).toContain('ringSizeOverride={160}');
    expect(source).toContain('compact ? (viewportWidth < 400 ? 80 : 90) : STEPS_RING_SIZE');
  });
});
