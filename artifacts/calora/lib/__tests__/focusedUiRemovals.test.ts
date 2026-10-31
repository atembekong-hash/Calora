import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const app = (name: string) =>
  readFileSync(resolve(__dirname, `../../app/${name}`), "utf8");

describe("focused UI removals", () => {
  it("removes the Discover cookbook and ingredient-match guidance", () => {
    const source = app("(tabs)/recipes.tsx");
    expect(source).not.toContain("THE CALORA COOKBOOK");
    expect(source).not.toContain(
      "For ingredient matches, separate up to four ingredients with commas",
    );
  });

  it("removes the Progress weekly signal hero", () => {
    const source = app("(tabs)/insights.tsx");
    expect(source).not.toContain("WEEKLY SIGNAL");
    expect(source).not.toContain("Patterns, not pressure");
  });

  it("removes the receipt provider note and Scan trust block only", () => {
    const receiptSource = app("restaurants.tsx");
    const scanSource = app("(tabs)/scan.tsx");
    expect(receiptSource).not.toContain("Nutrition data supplied by FatSecret");
    expect(receiptSource).not.toContain(
      "Fast Secret provider supplied receipt information",
    );
    expect(scanSource).not.toContain("Review before it counts");
    expect(scanSource).not.toContain(
      "Nothing reaches your diary until you approve it.",
    );
    expect(scanSource).toContain("styles.restaurantButton");
  });

  it("keeps the Settings/Profile title slightly inset from the back control", () => {
    const source = app("(tabs)/profile.tsx");
    expect(source).toContain("titleOffset={-2}");
  });

  it("places the Profile card within the You pane rather than the tab header or other tabs", () => {
    const source = app("(tabs)/profile.tsx");
    const headerEnd = source.indexOf("<SwipeableSectionPager");
    const profileSurfaceGuard = source.indexOf(
      'surface === "profile" ? undefined : styles.hiddenSection',
    );
    const profileCard = source.indexOf("styles.profileCard");
    expect(profileSurfaceGuard).toBeGreaterThan(headerEnd);
    expect(profileCard).toBeGreaterThan(profileSurfaceGuard);
    expect(profileCard).toBeGreaterThan(headerEnd);
  });
});
