import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = (name: string) =>
  resolve(__dirname, `../../app/(tabs)/${name}.tsx`);

describe("Today dashboard image boundary", () => {
  it("does not retain a rotating image header or any image-loading pathway", () => {
    const homeSource = readFileSync(appPath("index"), "utf8");
    const recipesSource = readFileSync(appPath("recipes"), "utf8");
    const insightsSource = readFileSync(appPath("insights"), "utf8");

    expect(homeSource).not.toContain("useHourlyHeaderImage");
    expect(homeSource).not.toMatch(
      /<Image(?:Background)?\b|expo-image|LinearGradient/,
    );
    expect(homeSource).not.toMatch(/assets\/images|\brequire\(|recipe\.image/);
    expect(recipesSource).not.toContain("useHourlyHeaderImage");
    expect(insightsSource).not.toContain("useHourlyHeaderImage");
  });

  it("removes the retired Home-only hourly image utility from the shipped source tree", () => {
    expect(existsSync(resolve(__dirname, "../hourlyHeaderImages.ts"))).toBe(
      false,
    );
  });
});
