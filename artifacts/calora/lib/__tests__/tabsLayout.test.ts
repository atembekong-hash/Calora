import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const layoutPath = path.resolve(__dirname, "../../app/(tabs)/_layout.tsx");
const layoutSource = fs.readFileSync(layoutPath, "utf8");

describe("tab bar labels", () => {
  it("keeps sibling labels enabled when the custom Scan tab is focused", () => {
    expect(layoutSource).toContain("tabBarShowLabel: true");
    expect(layoutSource).not.toContain("tabBarShowLabel: false");
    expect(layoutSource).toContain("styles.scanTabLabel");
    expect(layoutSource).toMatch(/>\s*Scan\s*<\/Text>/);
    expect(layoutSource).toMatch(/title: ["']Home["']/);
    expect(layoutSource).toMatch(/title: ["']Recipes["']/);
    expect(layoutSource).toMatch(/title: ["']Progress["']/);
    expect(layoutSource).toMatch(/title: ["']Plan["']/);
  });
});
