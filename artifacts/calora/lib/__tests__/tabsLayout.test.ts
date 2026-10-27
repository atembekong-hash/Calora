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
    expect(layoutSource).toMatch(/title: ["']Today["']/);
    expect(layoutSource).toMatch(/title: ["']Recipes["']/);
    expect(layoutSource).toMatch(/title: ["']Plan["']/);
    expect(layoutSource).toMatch(/title: ["']More["']/);
    expect(layoutSource).toContain('name="insights" options={{ href: null }}');

    const names = [...layoutSource.matchAll(/name="(index|recipes|scan|planner|more)"/g)].map((match) => match[1]);
    expect(names).toEqual(['index', 'recipes', 'scan', 'planner', 'more']);
  });

  it("reserves an inset-aware native bar for the raised Scan label", () => {
    expect(layoutSource).toContain("const insets = useSafeAreaInsets();");
    expect(layoutSource).toContain("const tabBarHeight = isWeb ? 84 : Math.max(88, 56 + insets.bottom);");
    expect(layoutSource).toContain("height: tabBarHeight");
    expect(layoutSource).toContain("paddingBottom: isWeb ? 0 : Math.max(insets.bottom, 4)");
    expect(layoutSource).toContain("tabBarItemStyle: styles.tabBarItem");
    expect(layoutSource).toContain("minHeight: 44");
    expect(layoutSource).toContain("style={[props.style, styles.scanTabButton]}");
    expect(layoutSource).toContain("height: 88");
    expect(layoutSource).toContain("marginTop: -24");
  });
});
