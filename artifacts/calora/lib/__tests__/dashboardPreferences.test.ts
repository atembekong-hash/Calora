import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_PREFERENCES,
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
    expect(result.visible).toEqual(["calories", "water"]);
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
      "fasting",
      "up",
    );
    expect(firstMove.order.at(-2)).toBe("fasting");
    const atTop = reorderDashboardWidget(
      {
        ...DEFAULT_DASHBOARD_PREFERENCES,
        order: [
          "fasting",
          ...DEFAULT_DASHBOARD_PREFERENCES.order.filter(
            (id) => id !== "fasting",
          ),
        ],
      },
      "fasting",
      "up",
    );
    expect(atTop.order[0]).toBe("fasting");
    expect(new Set(firstMove.order).size).toBe(
      DEFAULT_DASHBOARD_PREFERENCES.order.length,
    );
  });
});
