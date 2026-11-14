import { describe, expect, it } from "vitest";
import {
  ADAPTIVE_FAIR_USE_ENABLED,
  ADAPTIVE_PRO_FEATURE_POLICY,
  evaluateAdaptiveWindow,
  getProAllowanceLimit,
  isAdaptiveFairUseEnabledForUser,
} from "../lib/adaptiveFairUse.js";

describe("adaptive Pro fair use", () => {
  it("remains disabled unless explicitly dark-launched", () => {
    expect(ADAPTIVE_FAIR_USE_ENABLED).toBe(false);
    expect(getProAllowanceLimit("photo_scan", 40)).toBe(40);
    expect(getProAllowanceLimit("photo_scan", 40, true)).toBe(40);
  });

  it("supports a fail-closed account-level pilot without changing the global default", () => {
    const pilot = new Set(["pilot-user"]);
    expect(isAdaptiveFairUseEnabledForUser("pilot-user", true, pilot, true)).toBe(true);
    expect(isAdaptiveFairUseEnabledForUser("regular-user", true, pilot, true)).toBe(false);
    expect(getProAllowanceLimit("photo_scan", 40, true, "pilot-user", pilot, true)).toBe(600);
    expect(getProAllowanceLimit("photo_scan", 40, true, "regular-user", pilot, true)).toBe(40);
  });

  it("fails closed when the pilot variable is present but empty", () => {
    expect(isAdaptiveFairUseEnabledForUser("any-user", true, new Set(), true)).toBe(false);
    expect(getProAllowanceLimit("photo_scan", 40, true, "any-user", new Set(), true)).toBe(40);
  });

  it("fails closed when adaptive mode is enabled without a pilot variable", () => {
    expect(isAdaptiveFairUseEnabledForUser(undefined, true, new Set(), false)).toBe(false);
    expect(isAdaptiveFairUseEnabledForUser("regular-user", true, new Set(), false)).toBe(false);
  });

  it("defines explicit daily, monthly, burst, and emergency-cost protections", () => {
    expect(ADAPTIVE_PRO_FEATURE_POLICY.photo_scan).toMatchObject({
      burst10Minute: 12,
      dailySafetyCeiling: 80,
      monthlySafetyCeiling: 600,
      emergencyDailySpendUsd: 0.8,
      emergencyMonthlySpendUsd: 6,
      cooldownSeconds: 300,
    });
    expect(ADAPTIVE_PRO_FEATURE_POLICY.receipt_scan).toMatchObject({
      burst10Minute: 6,
      dailySafetyCeiling: 24,
      monthlySafetyCeiling: 120,
      emergencyDailySpendUsd: 0.72,
      emergencyMonthlySpendUsd: 3.6,
      cooldownSeconds: 600,
    });
    expect(Object.prototype.hasOwnProperty.call(ADAPTIVE_PRO_FEATURE_POLICY, "meal_planner")).toBe(false);
  });

  it("allows normal and heavy photo use including 5–10 scans daily", () => {
    for (const scansToday of [5, 10]) {
      expect(evaluateAdaptiveWindow("photo_scan", {
        count10Minute: 1,
        count24Hour: scansToday,
        countMonth: scansToday * 30,
        estimatedSpendUsd: scansToday * 0.01,
        estimatedSpendDailyUsd: scansToday * 0.01,
        estimatedSpendMonthlyUsd: scansToday * 0.3,
      })).toEqual({ allowed: true });
    }
  });

  it("allows barcode batch logging and frequent Coach conversations", () => {
    expect(evaluateAdaptiveWindow("barcode_scan", {
      count10Minute: 40,
      count24Hour: 300,
      countMonth: 1200,
      estimatedSpendUsd: 0.6,
      estimatedSpendDailyUsd: 0.6,
      estimatedSpendMonthlyUsd: 2.4,
    })).toEqual({ allowed: true });
    expect(evaluateAdaptiveWindow("coach_message", {
      count10Minute: 20,
      count24Hour: 180,
      countMonth: 1800,
      estimatedSpendUsd: 0.9,
      estimatedSpendDailyUsd: 0.9,
      estimatedSpendMonthlyUsd: 9,
    })).toEqual({ allowed: true });
  });

  it("allows repeated recipe creation below daily, monthly, and cost protections", () => {
    expect(evaluateAdaptiveWindow("recipe_creation", {
      count10Minute: 3,
      count24Hour: 12,
      countMonth: 80,
      estimatedSpendUsd: 0.96,
      estimatedSpendDailyUsd: 0.96,
      estimatedSpendMonthlyUsd: 6.4,
    })).toEqual({ allowed: true });
  });

  it("keeps the feature-local limits independent", () => {
    expect(evaluateAdaptiveWindow("receipt_scan", {
      count10Minute: 6,
      count24Hour: 6,
      countMonth: 6,
      estimatedSpendUsd: 0.18,
    }).allowed).toBe(false);
    expect(evaluateAdaptiveWindow("photo_scan", {
      count10Minute: 1,
      count24Hour: 10,
      countMonth: 200,
      estimatedSpendUsd: 0.1,
    }).allowed).toBe(true);
  });

  it("returns a brief exact cooldown and recovers automatically after the window", () => {
    expect(evaluateAdaptiveWindow("recipe_creation", {
      count10Minute: 4,
      count24Hour: 4,
      estimatedSpendUsd: 0.1,
    })).toEqual({ allowed: false, retryAfterSecs: 900, reason: "burst" });
    expect(evaluateAdaptiveWindow("recipe_creation", {
      count10Minute: 0,
      count24Hour: 4,
      estimatedSpendUsd: 0.1,
    })).toEqual({ allowed: true });
  });

  it("uses cost protection only after an emergency threshold", () => {
    expect(evaluateAdaptiveWindow("receipt_scan", {
      count10Minute: 1,
      count24Hour: 2,
      estimatedSpendUsd: 0.73,
    })).toEqual({ allowed: false, retryAfterSecs: 600, reason: "cost" });
    expect(evaluateAdaptiveWindow("receipt_scan", {
      count10Minute: 1,
      count24Hour: 2,
      estimatedSpendUsd: 0.72,
    })).toEqual({ allowed: true });
  });

  it("does not trigger unnecessary restrictions below the explicit thresholds", () => {
    expect(evaluateAdaptiveWindow("nutrition_label_scan", {
      count10Minute: 11,
      count24Hour: 79,
      countMonth: 599,
      estimatedSpendUsd: 0.9,
    })).toEqual({ allowed: true });
    expect(evaluateAdaptiveWindow("voice_log", {
      count10Minute: 19,
      count24Hour: 119,
      countMonth: 599,
      estimatedSpendUsd: 1.7,
    })).toEqual({ allowed: true });
  });

  it("supports the existing cost-isolation regression", () => {
    expect(Object.prototype.hasOwnProperty.call(ADAPTIVE_PRO_FEATURE_POLICY, "meal_planner")).toBe(false);
    expect(evaluateAdaptiveWindow("barcode_scan", {
      count10Minute: 1,
      count24Hour: 2,
      estimatedSpendUsd: 0.01,
    })).toEqual({ allowed: true });
  });

  it("reports the exact remaining 10-minute rolling-window time", () => {
    const now = new Date("2026-11-14T12:00:00.000Z");
    expect(evaluateAdaptiveWindow("photo_scan", {
      count10Minute: 12,
      count24Hour: 12,
      estimatedSpendUsd: 0.1,
      now,
      oldest10MinuteAt: new Date("2026-11-14T11:59:15.000Z"),
    })).toEqual({ allowed: false, retryAfterSecs: 555, reason: "burst" });
  });

  it("keeps the longest active daily or monthly restriction instead of repeating a short cooldown", () => {
    const now = new Date("2026-11-14T12:00:00.000Z");
    expect(evaluateAdaptiveWindow("photo_scan", {
      count10Minute: 1,
      count24Hour: 80,
      countMonth: 600,
      estimatedSpendUsd: 0.1,
      now,
      oldest24HourAt: new Date("2026-11-14T11:00:00.000Z"),
      oldestMonthAt: new Date("2026-11-01T12:00:00.000Z"),
    })).toEqual({ allowed: false, retryAfterSecs: 1468800, reason: "burst" });
  });

  it("uses the longest cost reset when both daily and monthly cost safeguards remain active", () => {
    const now = new Date("2026-11-14T12:00:00.000Z");
    expect(evaluateAdaptiveWindow("receipt_scan", {
      count10Minute: 1,
      count24Hour: 2,
      estimatedSpendUsd: 1,
      estimatedSpendDailyUsd: 1,
      estimatedSpendMonthlyUsd: 4,
      now,
      nextDailyResetAt: new Date("2026-11-15T00:00:00.000Z"),
      nextMonthlyResetAt: new Date("2026-12-01T00:00:00.000Z"),
    })).toEqual({ allowed: false, retryAfterSecs: 1425600, reason: "cost" });
  });

  it("recovers automatically once the supplied rolling and cost windows have reset", () => {
    const now = new Date("2026-11-14T12:00:00.000Z");
    expect(evaluateAdaptiveWindow("photo_scan", {
      count10Minute: 0,
      count24Hour: 0,
      countMonth: 0,
      estimatedSpendUsd: 0,
      estimatedSpendDailyUsd: 0,
      estimatedSpendMonthlyUsd: 0,
      now,
      oldest10MinuteAt: new Date("2026-11-14T11:00:00.000Z"),
      oldest24HourAt: new Date("2026-11-13T11:00:00.000Z"),
      oldestMonthAt: new Date("2026-10-01T00:00:00.000Z"),
    })).toEqual({ allowed: true });
  });
});
