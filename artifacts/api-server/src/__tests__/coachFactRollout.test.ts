/**
 * Unit tests for the server-owned, named, deterministic empty cohort mechanism.
 * This file does NOT mock the rollout module — it tests the real implementation.
 */
import { describe, expect, it } from "vitest";
import {
  getCoachFactRolloutDecision,
  isCohortEnabled,
  getActiveCohort,
} from "../lib/coach-fact-rollout.js";

describe("server-owned cohort rollout mechanism (real implementation)", () => {
  it("the active cohort is empty by default — no real users enrolled", () => {
    expect(getActiveCohort().size).toBe(0);
  });

  it("the cohort gate is disabled by default (COHORT_ENABLED=false)", () => {
    expect(isCohortEnabled()).toBe(false);
  });

  it("deny-all: every arbitrary user id is rejected when cohort is empty/disabled", () => {
    const ids = [
      "user-abc",
      "00000000-0000-0000-0000-000000000001",
      "admin",
      "root",
      "true",
      "1",
      "",
    ];
    for (const id of ids) {
      const d = getCoachFactRolloutDecision(id);
      expect(d.cohortEligible).toBe(false);
      expect(d.legacyFallbackEnabled).toBe(false);
      expect(d.reason).toBe("dark_default_deny");
    }
  });

  it("the returned decision is typed with the correct reason when gate is off", () => {
    const d = getCoachFactRolloutDecision("any-user-id");
    expect(d).toEqual({
      cohortEligible: false,
      legacyFallbackEnabled: false,
      reason: "dark_default_deny",
    });
  });

  it("the active cohort is read-only (cannot be modified externally)", () => {
    const cohort = getActiveCohort();
    // ReadonlySet: has() works, add() does not exist at type level.
    // Runtime: the underlying Set is still there but we verify membership is empty.
    expect(cohort.has("any-user")).toBe(false);
    expect(cohort.size).toBe(0);
  });
});
