import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "../..");
const source = (relative: string) =>
  readFileSync(resolve(appRoot, relative), "utf8");

describe("visual integrity source contracts", () => {
  it("uses shared semantic sheet roles rather than hard-coded global overlays", () => {
    const bottomSheet = source("components/BottomSheet.tsx");
    expect(bottomSheet).toContain("colors.sheetOverlay");
    expect(bottomSheet).toContain("colors.sheetHandle");
    expect(bottomSheet).not.toContain(
      "const DEFAULT_OVERLAY_COLOR = 'rgba(0,0,0,0.46)'",
    );
  });

  it("keeps dark-mode-safe navigation and secondary routes explicit", () => {
    expect(source("app/learning.tsx")).toContain(
      '<AppHeader title="Learning" back leftAlignTitle />',
    );
    expect(source("app/fasting.tsx")).toContain(
      "/profile?tab=you&open=reminders",
    );
    expect(source("app/(tabs)/_layout.tsx")).toContain(
      "fontSize: Math.min(14, 11 * fontScale)",
    );
  });

  it("uses readable status foreground roles and does not dim disabled dashboard controls with opacity", () => {
    const dashboard = source("app/dashboard-layout.tsx");
    expect(dashboard).toContain("colors.disabledForeground");
    expect(dashboard).not.toContain("cardMuted: { opacity");
    expect(dashboard).not.toContain("disabled: { opacity");
    expect(source("app/fasting.tsx")).toContain("colors.successForeground");
    expect(source("app/saved-meals.tsx")).toContain("colors.primaryForeground");
  });

  it("honors the system reduced-motion preference in key Progress animations", () => {
    const progress = source("app/(tabs)/insights.tsx");
    expect(progress).toContain("useReducedMotion");
    expect(progress).toContain("reduceMotion ? 1 : withDelay");
    expect(progress).toContain("pulse.value = reduceMotion ? 1");
  });
});
