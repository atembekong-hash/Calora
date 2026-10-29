import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Customize Today ordering controls', () => {
  it('bounds move-down against configurable widgets rather than hidden or fixed widgets', () => {
    const source = readFileSync(resolve(__dirname, '../../app/dashboard-layout.tsx'), 'utf8');
    expect(source).toContain('CONFIGURABLE_DASHBOARD_WIDGET_IDS.includes(candidate)');
    expect(source).not.toContain('index === dashboardPreferences.order.length - 1');
  });

  it('keeps the quiet explanatory copy and all supported widget definitions in the screen', () => {
    const source = readFileSync(resolve(__dirname, '../../app/dashboard-layout.tsx'), 'utf8');
    expect(source).toContain('Make Today your own');
    expect(source).toContain('Your choices stay on this device.');
    expect(source).toContain('calories:');
    expect(source).toContain('steps:');
    expect(source).toContain('water:');
    expect(source).toContain('weight:');
    expect(source).toContain('mealRhythm:');
    expect(source).toContain('nutrients:');
    expect(source).toContain('fasting:');
  });
});
