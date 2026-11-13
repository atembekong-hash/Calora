import { describe, expect, it } from "vitest";
import { ALLOWANCE_PERIODS, FREE_SUCCESSFUL_DAILY_ALLOWANCES, FREE_SUCCESSFUL_WEEKLY_ALLOWANCES, PRO_FAIR_USE_LIMITS_APPROVED, PRO_SUCCESSFUL_MONTHLY_ALLOWANCES, isFreeAllowanceFeature, isProAllowanceFeature } from "../lib/subscriptionPolicy.js";

describe("subscription policy", () => {
  it("exposes the approved Free successful-operation allowances", () => {
    expect(FREE_SUCCESSFUL_DAILY_ALLOWANCES).toEqual({
      photo_scan: 1,
      barcode_scan: 1,
      nutrition_label_scan: 1,
      voice_log: 1,
      coach_message: 3,
    });
    expect(FREE_SUCCESSFUL_WEEKLY_ALLOWANCES).toEqual({ recipe_creation: 1 });
    expect(isFreeAllowanceFeature("receipt_scan")).toBe(false);
    expect(isFreeAllowanceFeature("meal_planner")).toBe(false);
  });

  it("exposes the owner-approved Pro monthly limits with independent periods", () => {
    expect(PRO_FAIR_USE_LIMITS_APPROVED).toBe(true);
    expect(PRO_SUCCESSFUL_MONTHLY_ALLOWANCES).toEqual({
      photo_scan: 40,
      barcode_scan: 100,
      nutrition_label_scan: 40,
      voice_log: 40,
      receipt_scan: 3,
      coach_message: 120,
      recipe_creation: 8,
    });
    expect(Object.values(ALLOWANCE_PERIODS).every((period) => period === "monthly")).toBe(true);
    expect(isProAllowanceFeature("receipt_scan")).toBe(true);
    expect(isProAllowanceFeature("meal_planner")).toBe(false);
  });
});
