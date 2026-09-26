import { describe, expect, it } from "vitest";
import {
  beginLiveStepSession,
  createLiveStepTrackingState,
  localStepDay,
  motionUnavailableState,
  normalizeDailyStepGoal,
  projectLiveSteps,
  reconcileProviderSteps,
  suspendLiveStepSession,
} from "../steps/stepTracking";

describe("live step tracking reconciliation", () => {
  const day = "2026-09-26";
  const startedAt = "2026-09-26T09:00:00.000Z";

  it("adds an active foreground motion delta exactly once", () => {
    const initial = createLiveStepTrackingState(day, 1_000);
    const live = beginLiveStepSession(initial, "granted", startedAt);
    const projected = projectLiveSteps(live, 5, startedAt);

    expect(projected.displayedSteps).toBe(1_005);
    expect(projected.status).toBe("live");
  });

  it("does not double-count a provider total that is behind the live projection", () => {
    const projected = projectLiveSteps(
      beginLiveStepSession(
        createLiveStepTrackingState(day, 1_000),
        "granted",
        startedAt,
      ),
      5,
      startedAt,
    );
    const reconciled = reconcileProviderSteps(
      projected,
      1_004,
      "2026-09-26T09:01:00.000Z",
    );

    expect(reconciled.displayedSteps).toBe(1_005);
    expect(reconciled.providerSteps).toBe(1_004);
    expect(reconciled.status).toBe("live");
  });

  it("adopts a provider total that catches up beyond the live projection", () => {
    const projected = projectLiveSteps(
      beginLiveStepSession(
        createLiveStepTrackingState(day, 1_000),
        "granted",
        startedAt,
      ),
      5,
      startedAt,
    );
    const reconciled = reconcileProviderSteps(
      projected,
      1_010,
      "2026-09-26T09:01:00.000Z",
    );

    expect(reconciled.displayedSteps).toBe(1_010);
    expect(reconciled.providerSteps).toBe(1_010);
    expect(reconciled.sessionBaseSteps).toBe(1_005);

    const nextMotionEvent = projectLiveSteps(
      reconciled,
      6,
      "2026-09-26T09:01:01.000Z",
    );
    expect(nextMotionEvent.displayedSteps).toBe(1_011);
  });

  it("retains a provisional projection after the listener is suspended without persisting it as provider data", () => {
    const projected = projectLiveSteps(
      beginLiveStepSession(
        createLiveStepTrackingState(day, 400),
        "granted",
        startedAt,
      ),
      8,
      startedAt,
    );
    const suspended = suspendLiveStepSession(projected);

    expect(suspended.displayedSteps).toBe(408);
    expect(suspended.providerSteps).toBe(400);
    expect(suspended.status).toBe("syncing");
  });

  it("never turns unavailable data into a fabricated measured zero", () => {
    const unavailable = motionUnavailableState(
      createLiveStepTrackingState(day),
      "unavailable",
      false,
    );

    expect(unavailable.displayedSteps).toBeNull();
    expect(unavailable.status).toBe("unavailable");
  });

  it("normalizes the user daily goal into an achievable safe range", () => {
    expect(normalizeDailyStepGoal(undefined)).toBe(10_000);
    expect(normalizeDailyStepGoal(99)).toBe(100);
    expect(normalizeDailyStepGoal(10_000.6)).toBe(10_001);
    expect(normalizeDailyStepGoal(500_000)).toBe(100_000);
  });

  it("uses the user local day rather than UTC for rollover state", () => {
    expect(localStepDay(new Date(2026, 8, 26, 23, 59, 59))).toBe("2026-09-26");
    expect(localStepDay(new Date(2026, 8, 27, 0, 0, 0))).toBe("2026-09-27");
  });
});
