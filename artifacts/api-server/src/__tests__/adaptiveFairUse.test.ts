import { describe, expect, it } from "vitest";
import {
  ADAPTIVE_FAIR_USE_ENABLED,
  ADAPTIVE_PRO_FEATURE_POLICY,
  evaluateAdaptiveWindow,
  getProAllowanceLimit,
} from "../lib/adaptiveFairUse.js";

describe("adaptive Pro fair use", () => {
  it("remains disabled unless explicitly dark-launched", () => {
    expect(ADAPTIVE_FAIR_USE_ENABLED).toBe(false);
    expect(getProAllowanceLimit("photo_scan", 40)).toBe(40);
  });

  it("defines generous independent safety ceilings", () => {
    expect(ADAPTIVE_PRO_FEATURE_POLICY.photo_scan.monthlySafetyCeiling).toBeGreaterThan(31);
    expect(ADAPTIVE_PRO_FEATURE_POLICY.coach_message.monthlySafetyCeiling).toBeGreaterThan(93);
    expect(ADAPTIVE_PRO_FEATURE_POLICY.recipe_creation.monthlySafetyCeiling).toBeGreaterThan(31);
    expect(ADAPTIVE_PRO_FEATURE_POLICY.receipt_scan.monthlySafetyCeiling).toBeGreaterThan(0);
    expect(Object.prototype.hasOwnProperty.call(ADAPTIVE_PRO_FEATURE_POLICY, "meal_planner")).toBe(false);
  });

  it("allows legitimate heavy usage below feature-specific burst thresholds", () => {
    expect(evaluateAdaptiveWindow("photo_scan", {
      count10Minute: 8,
      count24Hour: 55,
      estimatedSpendUsd: 0.5,
    })).toEqual({ allowed: true });
  });

  it("returns a feature-local burst cooldown", () => {
    expect(evaluateAdaptiveWindow("recipe_creation", {
      count10Minute: 4,
      count24Hour: 4,
      estimatedSpendUsd: 0.1,
    })).toEqual({ allowed: false, retryAfterSecs: 900, reason: "burst" });
  });

  it("returns a cost cooldown without affecting other features", () => {
    expect(evaluateAdaptiveWindow("receipt_scan", {
      count10Minute: 1,
      count24Hour: 2,
      estimatedSpendUsd: 1,
    })).toEqual({ allowed: false, retryAfterSecs: 600, reason: "cost" });
    expect(evaluateAdaptiveWindow("barcode_scan", {
      count10Minute: 1,
      count24Hour: 2,
      estimatedSpendUsd: 0.01,
    })).toEqual({ allowed: true });
  });
});
