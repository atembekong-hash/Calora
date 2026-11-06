import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_PREFERENCES,
  buildDashboardRows,
  normalizeDashboardPreferences,
  reorderDashboardWidget,
  toggleDashboardWidgetVisibility,
} from "@/lib/dashboardPreferences";

describe("dashboard preferences", () => {
  it("normalizes malformed persisted data into a complete safe layout", () => {
    const result = normalizeDashboardPreferences({
      visible: ["water", "unknown", "water"],
      order: ["fasting", "unknown", "water"],
      density: { water: "expanded", fasting: "not-valid" },
    });
    expect(result.visible).toEqual(["calories", "water", "mood", "progressSnapshot", "recipes", "quickLog", "log"]);
    expect(result.order.slice(0, 2)).toEqual(["fasting", "water"]);
    expect(result.order).toHaveLength(
      DEFAULT_DASHBOARD_PREFERENCES.order.length,
    );
    expect(result.density.water).toBe("expanded");
    expect(result.density.fasting).toBe("compact");
  });

  it("never hides the essential calorie widget and toggles optional widgets predictably", () => {
    const withCaloriesToggle = toggleDashboardWidgetVisibility(
      DEFAULT_DASHBOARD_PREFERENCES,
      "calories",
    );
    expect(withCaloriesToggle.visible).toContain("calories");
    const withoutWater = toggleDashboardWidgetVisibility(
      DEFAULT_DASHBOARD_PREFERENCES,
      "water",
    );
    expect(withoutWater.visible).not.toContain("water");
    expect(
      toggleDashboardWidgetVisibility(withoutWater, "water").visible,
    ).toContain("water");
  });

  it("moves widgets one position at a time without losing any widget", () => {
    const firstMove = reorderDashboardWidget(
      DEFAULT_DASHBOARD_PREFERENCES,
      "steps",
      "up",
    );
    expect(firstMove.order.slice(0, 3)).toEqual(["calories", "steps", "fasting"]);
    const atTop = reorderDashboardWidget(
      {
        ...DEFAULT_DASHBOARD_PREFERENCES,
        order: [
          "steps",
          ...DEFAULT_DASHBOARD_PREFERENCES.order.filter(
            (id) => id !== "steps",
          ),
        ],
      },
      "steps",
      "up",
    );
    expect(atTop.order[0]).toBe("steps");
    expect(new Set(firstMove.order).size).toBe(
      DEFAULT_DASHBOARD_PREFERENCES.order.length,
    );
  });

  it("migrates the previous default so Recipes becomes the final widget", () => {
    const migrated = normalizeDashboardPreferences({
      version: 2,
      visible: ["calories", "fasting", "steps", "nutrients", "mood", "recipes", "quickLog", "water", "log"],
      order: ["calories", "fasting", "steps", "nutrients", "mood", "recipes", "quickLog", "water", "log"],
      density: {},
    });
    expect(migrated.version).toBe(6);
    expect(migrated.order.slice(5, 10)).toEqual(["water", "quickLog", "log", "progressSnapshot", "recipes"]);
    expect(migrated.placement.fasting).toBe("left");
    expect(migrated.placement.steps).toBe("right");
  });

  it("builds only deliberate opposite-side compact pairs and keeps expanded cards full width", () => {
    expect(buildDashboardRows(DEFAULT_DASHBOARD_PREFERENCES)).toEqual([["fasting", "steps"], ["nutrients", "mood"]]);
    const sameSide = normalizeDashboardPreferences({ ...DEFAULT_DASHBOARD_PREFERENCES, placement: { ...DEFAULT_DASHBOARD_PREFERENCES.placement, steps: "left" } });
    expect(buildDashboardRows(sameSide)).toEqual([["fasting"], ["steps"], ["nutrients", "mood"]]);
    const expanded = normalizeDashboardPreferences({ ...DEFAULT_DASHBOARD_PREFERENCES, density: { ...DEFAULT_DASHBOARD_PREFERENCES.density, fasting: "expanded" } });
    expect(buildDashboardRows(expanded)).toEqual([["fasting"], ["nutrients", "steps"], ["mood"]]);
  });

  it("preserves size and placement independently when normalizing persisted settings", () => {
    const result = normalizeDashboardPreferences({ version: 6, visible: DEFAULT_DASHBOARD_PREFERENCES.visible, order: DEFAULT_DASHBOARD_PREFERENCES.order, density: { ...DEFAULT_DASHBOARD_PREFERENCES.density, mood: "expanded" }, placement: { ...DEFAULT_DASHBOARD_PREFERENCES.placement, fasting: "right", steps: "left" } });
    expect(result.density.mood).toBe("expanded");
    expect(result.placement.fasting).toBe("right");
    expect(result.placement.steps).toBe("left");
  });
});
