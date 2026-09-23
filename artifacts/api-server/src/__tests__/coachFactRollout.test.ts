/**
 * Unit tests for the server-owned, reviewed-cohort Coach gate.
 *
 * Every provider-capable request must pass a global operator switch plus a
 * reviewed, time-valid membership lookup for its own authenticated account.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbSelectMock = vi.fn();
vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => dbSelectMock(),
        }),
      }),
    }),
  },
  serverConfigTable: { key: "key", value: "value" },
  cohortMembershipsTable: {
    id: "id",
    cohortName: "cohort_name",
    externalUserId: "external_user_id",
    expiresAt: "expires_at",
    reviewedAt: "reviewed_at",
  },
}));

import {
  COACH_FACT_CONTEXT_COHORT,
  COACH_FACT_CONTEXT_CONFIG_KEY,
  getActiveCohort,
  getActiveCohortName,
  getCoachFactRolloutDecision,
  isCohortEnabled,
} from "../lib/coach-fact-rollout.js";

function enabledConfig() {
  return { value: true };
}

function reviewedMembership() {
  return { id: "reviewed-membership" };
}

describe("server-owned reviewed Coach rollout mechanism", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("keeps process memory empty because the database is authoritative", () => {
    expect(getActiveCohort().size).toBe(0);
    expect(isCohortEnabled()).toBe(false);
    expect(COACH_FACT_CONTEXT_COHORT).toBe("coach_fact_context_v1");
    expect(getActiveCohortName()).toBe("coach_fact_context_v1");
    expect(COACH_FACT_CONTEXT_CONFIG_KEY).toBe("coach_fact_context_rollout_enabled");
  });

  it("denies when the global server config row is absent", async () => {
    dbSelectMock.mockResolvedValueOnce([]);
    const decision = await getCoachFactRolloutDecision("ordinary-user");
    expect(decision).toEqual({ cohortEligible: false, legacyFallbackEnabled: false, reason: "dark_default_deny" });
    expect(dbSelectMock).toHaveBeenCalledTimes(1);
  });

  it("denies when the global server config row is not JSON boolean true", async () => {
    dbSelectMock.mockResolvedValueOnce([{ value: "true" }]);
    const decision = await getCoachFactRolloutDecision("ordinary-user");
    expect(decision.cohortEligible).toBe(false);
    expect(dbSelectMock).toHaveBeenCalledTimes(1);
  });

  it("denies an ordinary account even while the global gate is enabled", async () => {
    dbSelectMock
      .mockResolvedValueOnce([enabledConfig()])
      .mockResolvedValueOnce([]);
    const decision = await getCoachFactRolloutDecision("ordinary-user");
    expect(decision).toEqual({ cohortEligible: false, legacyFallbackEnabled: false, reason: "dark_default_deny" });
    expect(dbSelectMock).toHaveBeenCalledTimes(2);
  });

  it("allows only the requested account after a reviewed membership lookup", async () => {
    dbSelectMock
      .mockResolvedValueOnce([enabledConfig()])
      .mockResolvedValueOnce([reviewedMembership()]);
    const decision = await getCoachFactRolloutDecision("reviewed-pilot");
    expect(decision).toEqual({ cohortEligible: true, legacyFallbackEnabled: false, reason: "cohort_eligible" });
    expect(dbSelectMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed when either rollout query errors", async () => {
    dbSelectMock.mockRejectedValueOnce(new Error("connection reset"));
    await expect(getCoachFactRolloutDecision("reviewed-pilot")).resolves.toMatchObject({ cohortEligible: false });

    dbSelectMock
      .mockResolvedValueOnce([enabledConfig()])
      .mockRejectedValueOnce(new Error("membership unavailable"));
    await expect(getCoachFactRolloutDecision("reviewed-pilot")).resolves.toMatchObject({ cohortEligible: false });
  });
});
