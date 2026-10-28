import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMPTY_FASTING_STATE,
  beginFast,
  clampFastingHours,
  deriveFastingCalendar,
  deriveFastingHistorySummary,
  deriveFastingProgress,
  fastingHistoryInsight,
  fastingHoursFor,
  fastingPlanLabel,
  finishFast,
  formatFastingHours,
  isFastingTimerEligible,
  normalizeFastingState,
  type FastingHistoryEntry,
} from "@/lib/fasting";

const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date("2026-10-27T12:00:00.000Z");

function historyEntry(
  id: string,
  endedAt: string,
  durationHours = 12,
): FastingHistoryEntry {
  const endedAtMs = Date.parse(endedAt);
  return {
    id,
    startedAt: new Date(endedAtMs - durationHours * HOUR_MS).toISOString(),
    endedAt,
    plannedHours: durationHours,
    endedEarly: false,
  };
}

describe("custom fasting rhythm", () => {
  it("normalizes custom duration input to the supported half-hour range", () => {
    expect(clampFastingHours("14.24")).toBe(14);
    expect(clampFastingHours("14.26")).toBe(14.5);
    expect(clampFastingHours("25")).toBe(24);
    expect(clampFastingHours("9.2")).toBe(10);
    expect(clampFastingHours("", 14)).toBe(14);

    const custom = normalizeFastingState({
      selectedPlanId: "custom",
      customFastingHours: "14.26",
      activeStartedAt: null,
      activePlannedHours: null,
      history: [],
    });
    expect(fastingHoursFor(custom)).toBe(14.5);
    expect(fastingPlanLabel(custom)).toBe("Custom · 14.5 hours");
    expect(formatFastingHours(14.5)).toBe("14.5 hours");
  });

  it("preserves a custom duration on start and derives target completion from timestamps", () => {
    const custom = normalizeFastingState({
      selectedPlanId: "custom",
      customFastingHours: 14.5,
      history: [],
    });
    const started = beginFast(custom, new Date("2026-10-27T08:00:00.000Z"));
    const progress = deriveFastingProgress(
      started,
      new Date("2026-10-27T22:30:00.000Z"),
    );

    expect(started.activePlannedHours).toBe(14.5);
    expect(progress).toMatchObject({
      active: true,
      progress: 1,
      remainingMs: 0,
      endsAt: "2026-10-27T22:30:00.000Z",
    });

    const finished = finishFast(started, new Date("2026-10-27T22:30:00.000Z"));
    expect(finished.history[0]).toMatchObject({
      plannedHours: 14.5,
      endedEarly: false,
      endedAt: "2026-10-27T22:30:00.000Z",
    });
  });

  it("keeps recorded history valid when the device clock moves backward", () => {
    const started = beginFast(
      EMPTY_FASTING_STATE,
      new Date("2026-10-27T08:00:00.000Z"),
    );
    const finished = finishFast(started, new Date("2026-10-27T07:00:00.000Z"));

    expect(finished.history[0]).toMatchObject({
      startedAt: "2026-10-27T08:00:00.000Z",
      endedAt: "2026-10-27T08:00:00.000Z",
      endedEarly: true,
    });
  });

  it("clears a partial active window so a fresh optional timer can start", () => {
    const recovered = normalizeFastingState({
      selectedPlanId: "14:10",
      activeStartedAt: "2026-10-27T08:00:00.000Z",
      history: [],
    });

    expect(recovered.activeStartedAt).toBeNull();
    expect(recovered.activePlannedHours).toBeNull();
    expect(
      beginFast(recovered, new Date("2026-10-27T09:00:00.000Z")),
    ).toMatchObject({
      activeStartedAt: "2026-10-27T09:00:00.000Z",
      activePlannedHours: 14,
    });
  });

  it("keeps the optional fasting timer adult-only while treating unknown ages neutrally", () => {
    expect(isFastingTimerEligible(17)).toBe(false);
    expect(isFastingTimerEligible(18)).toBe(true);
    expect(isFastingTimerEligible(undefined)).toBe(true);
    expect(isFastingTimerEligible("17")).toBe(true);
  });
});

describe("completed fasting history", () => {
  it("derives a deterministic seven-day calendar from completed end timestamps", () => {
    const history = [
      historyEntry("today-a", "2026-10-27T10:00:00.000Z", 12),
      historyEntry("today-b", "2026-10-27T11:00:00.000Z", 10),
      historyEntry("two-days-ago", "2026-10-25T18:00:00.000Z", 14),
    ];
    const calendar = deriveFastingCalendar(history, NOW, 7, "UTC");

    expect(calendar.map((day) => day.date)).toEqual([
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
    ]);
    expect(calendar.find((day) => day.date === "2026-10-27")).toMatchObject({
      completedCount: 2,
      totalDurationMs: 22 * HOUR_MS,
    });
    expect(calendar.find((day) => day.date === "2026-10-25")).toMatchObject({
      completedCount: 1,
      totalDurationMs: 14 * HOUR_MS,
    });
  });

  it("derives neutral recent-versus-prior trends without inferring health outcomes", () => {
    const history = [
      historyEntry("recent-1", "2026-10-26T18:00:00.000Z"),
      historyEntry("recent-2", "2026-10-27T18:00:00.000Z", 14),
      historyEntry("prior", "2026-10-18T18:00:00.000Z"),
    ];
    const summary = deriveFastingHistorySummary(history, NOW, "UTC");

    expect(summary).toMatchObject({
      completedCount: 3,
      recentCompletedCount: 2,
      previousCompletedCount: 1,
      recentCompletedDays: 2,
      recentAverageDurationMs: 13 * HOUR_MS,
      trend: "more",
    });
    expect(fastingHistoryInsight(summary)).toBe(
      "2 completed windows were recorded across 2 of the last 7 days.",
    );
    expect(
      fastingHistoryInsight(deriveFastingHistorySummary([], NOW, "UTC")),
    ).toContain("optional tracker");
  });
});

describe("fasting screen safety and routes", () => {
  it("keeps optional non-medical framing, confirmations, and existing destination links", () => {
    const source = readFileSync(
      resolve(__dirname, "../../app/fasting.tsx"),
      "utf8",
    );

    expect(source).toContain('"Start optional fasting window?"');
    expect(source).toContain('targetComplete ? "Save completed window?"');
    expect(source).toContain("isFastingTimerEligible(profile?.age)");
    expect(source).toContain("Fasting tracker is for adults");
    expect(source).toContain('lessonId: "fasting-basics-and-boundaries"');
    expect(source).toContain('router.push("/profile?tab=you&open=reminders")');
    expect(source).toContain(
      'accessibilityLabel="Custom fasting duration in hours"',
    );
    expect(source).toContain('testID="fasting-calendar"');
    expect(source).toContain("not medical advice");
    expect(source).toContain("Fasting is optional");
    expect(source).not.toMatch(/fat burning|metabolic state|weight loss/i);
  });
});
