import { describe, expect, it } from "vitest";
import {
  progressWeightRecencyLabel,
  progressWeightSourceLabel,
  selectProgressWeightSummary,
} from "../progressWeightSummary";

describe("Progress weight summary", () => {
  it("orders valid recorded weigh-ins chronologically without mutating the persisted input order", () => {
    const records = [
      { id: "late", date: "2026-10-22", kg: 72, source: "health" as const },
      { id: "early", date: "2026-10-02", kg: 74, source: "manual" as const },
      {
        id: "same-day-first",
        date: "2026-10-22",
        kg: 71,
        source: "manual" as const,
      },
    ];

    const summary = selectProgressWeightSummary(records, {
      today: "2026-10-27",
      healthProvider: "healthkit",
    });

    expect(summary.records.map((record) => record.id)).toEqual([
      "early",
      "late",
      "same-day-first",
    ]);
    expect(records.map((record) => record.id)).toEqual([
      "late",
      "early",
      "same-day-first",
    ]);
    expect(summary.latestRecord).toMatchObject({
      id: "same-day-first",
      kg: 71,
    });
    expect(summary.trendDeltaKg).toBe(-3);
    expect(summary.display).toMatchObject({
      kind: "record",
      kg: 71,
      sourceLabel: "Manual check-in",
      ageDays: 5,
      isStale: false,
    });
  });

  it("does not turn a single record, invalid values, or no record into a fabricated zero trend", () => {
    const oneRecord = selectProgressWeightSummary(
      [{ id: "one", date: "2026-10-01", kg: 70, source: "manual" }],
      { today: "2026-10-27" },
    );
    const invalidOnly = selectProgressWeightSummary(
      [{ id: "bad", date: "2026-02-30", kg: 0, source: "manual" }],
      { today: "2026-10-27" },
    );

    expect(oneRecord.trendDeltaKg).toBeNull();
    expect(invalidOnly.records).toEqual([]);
    expect(invalidOnly.trendDeltaKg).toBeNull();
    expect(invalidOnly.display).toMatchObject({ kind: "empty", kg: null });
  });

  it("distinguishes an onboarding baseline from a recorded weigh-in and identifies stale records", () => {
    const baseline = selectProgressWeightSummary([], {
      onboardingBaselineKg: 76,
      today: "2026-10-27",
    });
    const stale = selectProgressWeightSummary(
      [{ id: "old", date: "2026-10-01", kg: 76, source: "health" }],
      {
        today: "2026-10-27",
        healthProvider: "health-connect",
      },
    );

    expect(baseline.display).toEqual({
      kind: "baseline",
      kg: 76,
      sourceLabel: "Onboarding baseline",
      ageDays: null,
      isStale: false,
    });
    expect(stale.display).toMatchObject({
      kind: "record",
      sourceLabel: "Imported from Health Connect",
      ageDays: 26,
      isStale: true,
    });
    expect(progressWeightRecencyLabel(stale.display)).toBe(
      "Last recorded 26 days ago",
    );
  });

  it("uses source provenance only where an existing record supplies one", () => {
    expect(progressWeightSourceLabel("manual", "healthkit")).toBe(
      "Manual check-in",
    );
    expect(progressWeightSourceLabel("health", "healthkit")).toBe(
      "Imported from Apple Health",
    );
    expect(progressWeightSourceLabel("health", "health-connect")).toBe(
      "Imported from Health Connect",
    );
    expect(progressWeightSourceLabel(undefined, "healthkit")).toBe(
      "Recorded weigh-in",
    );
  });
});
