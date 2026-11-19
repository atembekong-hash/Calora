import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = (name: string) =>
  resolve(__dirname, `../../app/(tabs)/${name}.tsx`);

describe("Today dashboard image boundary", () => {
  it("keeps the hourly header local, varied, darker, and intentionally framed", () => {
    const homeSource = readFileSync(appPath("index"), "utf8");
    const recipesSource = readFileSync(appPath("recipes"), "utf8");
    const insightsSource = readFileSync(appPath("insights"), "utf8");

    expect(homeSource).toContain("const HOME_HEADER_FOOD_PHOTOS = [");
    expect((homeSource.match(/require\('\.\.\/\.\.\/assets\/images\//g) ?? [])
      .length).toBeGreaterThanOrEqual(25);
    expect(homeSource).toContain("now.getHours() % HOME_HEADER_FOOD_PHOTOS.length");
    expect(homeSource).not.toMatch(
      /<ImageBackground\b|expo-image|LinearGradient/,
    );
    expect(homeSource).toContain("require('../../assets/images/calora-home-header.jpg')");
    expect(homeSource).toContain("HOME_HEADER_IMAGE_SCALE = 1.22");
    expect(homeSource).toContain("transform: [{ scale: HOME_HEADER_IMAGE_SCALE }]");
    expect(homeSource).toContain("rgba(5, 24, 17, 0.60)");
    expect(recipesSource).not.toContain("useHourlyHeaderImage");
    expect(insightsSource).not.toContain("useHourlyHeaderImage");
  });

  it("removes the retired Home-only hourly image utility from the shipped source tree", () => {
    expect(existsSync(resolve(__dirname, "../hourlyHeaderImages.ts"))).toBe(
      false,
    );
  });
});
