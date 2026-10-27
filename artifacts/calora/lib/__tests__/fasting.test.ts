import { describe, expect, it } from "vitest";
import {
  EMPTY_FASTING_STATE,
  beginFast,
  deriveFastingProgress,
  finishFast,
  normalizeFastingState,
} from "@/lib/fasting";

describe("fasting state", () => {
  it("starts from an ISO timestamp and derives elapsed and remaining time without physiological claims", () => {
    const started = beginFast(
      EMPTY_FASTING_STATE,
      new Date("2026-10-27T08:00:00.000Z"),
    );
    const progress = deriveFastingProgress(
      started,
      new Date("2026-10-27T11:30:00.000Z"),
    );
    expect(started.activeStartedAt).toBe("2026-10-27T08:00:00.000Z");
    expect(progress).toMatchObject({
      active: true,
      plannedHours: 12,
      elapsedMs: 12_600_000,
      remainingMs: 30_600_000,
    });
    expect(progress.progress).toBeCloseTo(3.5 / 12);
  });

  it("finishes a fast once and records whether it was ended early", () => {
    const started = beginFast(
      EMPTY_FASTING_STATE,
      new Date("2026-10-27T08:00:00.000Z"),
    );
    const finished = finishFast(started, new Date("2026-10-27T12:00:00.000Z"));
    expect(finished.activeStartedAt).toBeNull();
    expect(finished.history).toHaveLength(1);
    expect(finished.history[0]).toMatchObject({
      plannedHours: 12,
      endedEarly: true,
    });
    expect(finishFast(finished, new Date("2026-10-27T13:00:00.000Z"))).toEqual(
      finished,
    );
  });

  it("normalizes untrusted persisted data and caps retained history", () => {
    const history = Array.from({ length: 75 }, (_, index) => ({
      id: `fast-${index}`,
      startedAt: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T08:00:00.000Z`,
      endedAt: `2026-02-${String((index % 28) + 1).padStart(2, "0")}T08:00:00.000Z`,
      plannedHours: 99,
      endedEarly: false,
    }));
    const normalized = normalizeFastingState({
      selectedPlanId: "not-a-plan",
      customFastingHours: 3,
      activeStartedAt: "not-a-date",
      history,
    });
    expect(normalized.selectedPlanId).toBe("12:12");
    expect(normalized.customFastingHours).toBe(10);
    expect(normalized.activeStartedAt).toBeNull();
    expect(normalized.history).toHaveLength(60);
    expect(normalized.history.every((entry) => entry.plannedHours === 24)).toBe(
      true,
    );
  });
});
