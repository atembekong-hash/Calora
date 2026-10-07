import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appPath = (name: string) => resolve(__dirname, `../../app/(tabs)/${name}.tsx`);
const utilitySource = readFileSync(resolve(__dirname, '../hourlyHeaderImages.ts'), 'utf8');

describe('hourly header image rotation', () => {
  it('uses the shared hourly hook only on the remaining image-backed home header', () => {
    const homeSource = readFileSync(appPath('index'), 'utf8');
    const recipesSource = readFileSync(appPath('recipes'), 'utf8');
    const insightsSource = readFileSync(appPath('insights'), 'utf8');

    expect(homeSource).toContain("useHourlyHeaderImage('home')");
    expect(recipesSource).not.toContain('useHourlyHeaderImage');
    expect(insightsSource).not.toContain('useHourlyHeaderImage');
    expect(utilitySource).toContain('const HOUR_IN_MS = 60 * 60 * 1000');
    expect(utilitySource).toContain('getHourlyHeaderSlot()');
    expect(utilitySource).toContain("AppState.addEventListener('change'");
  });

  it('keeps the image pool scoped to the remaining intentional header surface', () => {
    expect(utilitySource).toContain("export type HeaderImageSurface = 'home'");
    expect(utilitySource).toContain('home: [');
    expect(utilitySource).not.toContain('recipes: [');
    expect(utilitySource).not.toContain('insights: [');
    expect(utilitySource).toContain('getHourlyHeaderIndex(hourSlot, images.length)');
  });
});
