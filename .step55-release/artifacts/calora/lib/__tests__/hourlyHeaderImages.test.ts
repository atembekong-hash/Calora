import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appPath = (name: string) => resolve(__dirname, `../../app/(tabs)/${name}.tsx`);
const utilitySource = readFileSync(resolve(__dirname, '../hourlyHeaderImages.ts'), 'utf8');

describe('hourly header image rotation', () => {
  it('uses one shared hourly hook across the image-backed page headers', () => {
    const homeSource = readFileSync(appPath('index'), 'utf8');
    const recipesSource = readFileSync(appPath('recipes'), 'utf8');
    const insightsSource = readFileSync(appPath('insights'), 'utf8');

    expect(homeSource).toContain("useHourlyHeaderImage('home')");
    expect(recipesSource).toContain("useHourlyHeaderImage('recipes')");
    expect(insightsSource).toContain("useHourlyHeaderImage('insights')");
    expect(utilitySource).toContain('const HOUR_IN_MS = 60 * 60 * 1000');
    expect(utilitySource).toContain('getHourlyHeaderSlot()');
    expect(utilitySource).toContain("AppState.addEventListener('change'");
  });

  it('keeps image pools scoped to intentional header surfaces', () => {
    expect(utilitySource).toContain("export type HeaderImageSurface = 'home' | 'recipes' | 'insights'");
    expect(utilitySource).toContain('home: [');
    expect(utilitySource).toContain('recipes: [');
    expect(utilitySource).toContain('insights: [');
    expect(utilitySource).toContain('getHourlyHeaderIndex(hourSlot, images.length)');
  });
});