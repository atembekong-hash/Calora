import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const progressSource = readFileSync(
  resolve(__dirname, "../../app/(tabs)/insights.tsx"),
  "utf8",
);
const tabLayoutSource = readFileSync(
  resolve(__dirname, "../../app/(tabs)/_layout.tsx"),
  "utf8",
);

describe("Progress navigation", () => {
  it("provides an explicit back action to More", () => {
    expect(progressSource).toMatch(/<AppHeader[\s\S]*title="Progress"[\s\S]*back/);
    expect(progressSource).toContain("onBack={() => router.replace('/(tabs)/more')}");
  });

  it("hides the main tab bar while Progress is open", () => {
    expect(tabLayoutSource).toContain(
      '<Tabs.Screen name="insights" options={{ href: null, tabBarStyle: { display: \'none\' } }} />',
    );
  });
});
