import { describe, expect, it } from "vitest";
import { FREE_SUCCESSFUL_DAILY_ALLOWANCES, FREE_SUCCESSFUL_WEEKLY_ALLOWANCES, PRO_FAIR_USE_LIMITS_APPROVED, isFreeAllowanceFeature } from "../lib/subscriptionPolicy.js";

describe("subscription policy", () => {
  it("exposes the approved Free successful-operation allowances", () => {
    expect(FREE_SUCCESSFUL_DAILY_ALLOWANCES).toEqual({
      photo_scan: 1,
      barcode_scan: 1,
      nutrition_label_scan: 1,
      receipt_scan: 1,
      voice_log: 1,
      coach_message: 3,
      recipe_creation: 1,
    });
    expect(FREE_SUCCESSFUL_WEEKLY_ALLOWANCES).toEqual({ meal_planner: 2 });
    expect(isFreeAllowanceFeature("receipt_scan")).toBe(true);
  });

  it("fails closed until numerical Pro fair-use limits are approved", () => {
    expect(PRO_FAIR_USE_LIMITS_APPROVED).toBe(false);
  });
});
