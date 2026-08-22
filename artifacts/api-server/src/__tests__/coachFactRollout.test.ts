/**
 * Unit tests for the server-owned, DB-backed cohort gate.
 *
 * The async DB paths are tested here by mocking @workspace/db so we can
 * exercise all branches without a real database connection.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ── DB mock — must be declared before importing the module under test ─────────
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
  getCoachFactRolloutDecision,
  isCohortEnabled,
  getActiveCohort,
  getActiveCohortName,
  COACH_FACT_CONTEXT_COHORT,
  COACH_FACT_CONTEXT_CONFIG_KEY,
} from "../lib/coach-fact-rollout.js";

// Helpers to drive the two sequential DB queries (config then membership).
function mockConfigEnabled() {
  return { value: true };
}
function mockConfigDisabled() {
  return undefined; // absent row
}
function mockMemberRow(expiresAt: Date | null, reviewedAt: Date | null) {
  return { id: "row-1", expiresAt, reviewedAt };
}

describe("server-owned cohort rollout mechanism", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("the active cohort is always empty — DB is authoritative, not an in-memory set", () => {
    expect(getActiveCohort().size).toBe(0);
  });

  it("isCohortEnabled() always returns false (static gate removed)", () => {
    expect(isCohortEnabled()).toBe(false);
  });

  it("the cohort name constant is the expected typed value", () => {
    expect(COACH_FACT_CONTEXT_COHORT).toBe("coach_fact_context_v1");
    expect(getActiveCohortName()).toBe("coach_fact_context_v1");
  });

  it("the server config key constant is stable", () => {
    expect(COACH_FACT_CONTEXT_CONFIG_KEY).toBe("coach_fact_context_rollout_enabled");
  });

  it("deny — server_config row absent (global gate off)", async () => {
    // First call: config query returns nothing (absent row)
    dbSelectMock.mockResolvedValueOnce([]);
    const d = await getCoachFactRolloutDecision("user-a");
    expect(d.cohortEligible).toBe(false);
    expect(d.reason).toBe("dark_default_deny");
    // Only one DB query should have been made (config, no membership query)
    expect(dbSelectMock).toHaveBeenCalledTimes(1);
  });

  it("deny — server_config row present but value is not true", async () => {
    dbSelectMock.mockResolvedValueOnce([{ value: false }]);
    const d = await getCoachFactRolloutDecision("user-b");
    expect(d.cohortEligible).toBe(false);
    expect(d.reason).toBe("dark_default_deny");
    expect(dbSelectMock).toHaveBeenCalledTimes(1);
  });

  it("deny — server_config enabled but cohort membership row absent", async () => {
    dbSelectMock
      .mockResolvedValueOnce([mockConfigEnabled()]) // config
      .mockResolvedValueOnce([]);                   // no member row
    const d = await getCoachFactRolloutDecision("user-c");
    expect(d.cohortEligible).toBe(false);
    expect(d.reason).toBe("cohort_deny");
    expect(dbSelectMock).toHaveBeenCalledTimes(2);
  });

  it("deny — membership row has reviewedAt = null (unreviewed row)", async () => {
    dbSelectMock
      .mockResolvedValueOnce([mockConfigEnabled()])
      .mockResolvedValueOnce([mockMemberRow(null, null)]); // reviewedAt null
    const d = await getCoachFactRolloutDecision("user-d");
    expect(d.cohortEligible).toBe(false);
    expect(d.reason).toBe("cohort_unreviewed");
  });

  it("deny — membership row has expiresAt in the past (expired)", async () => {
    const pastDate = new Date(Date.now() - 1000);
    dbSelectMock
      .mockResolvedValueOnce([mockConfigEnabled()])
      .mockResolvedValueOnce([mockMemberRow(pastDate, new Date())]);
    const d = await getCoachFactRolloutDecision("user-e");
    expect(d.cohortEligible).toBe(false);
    expect(d.reason).toBe("cohort_expired");
  });

  it("deny — expiresAt is exactly now (boundary: not strictly in the future)", async () => {
    const exactly = new Date(Date.now());
    dbSelectMock
      .mockResolvedValueOnce([mockConfigEnabled()])
      .mockResolvedValueOnce([mockMemberRow(exactly, new Date())]);
    const d = await getCoachFactRolloutDecision("user-f");
    expect(d.cohortEligible).toBe(false);
    expect(d.reason).toBe("cohort_expired");
  });

  it("allow — config enabled, membership present, reviewedAt set, expiresAt null (no expiry)", async () => {
    dbSelectMock
      .mockResolvedValueOnce([mockConfigEnabled()])
      .mockResolvedValueOnce([mockMemberRow(null, new Date())]); // no expiry, reviewed
    const d = await getCoachFactRolloutDecision("user-g");
    expect(d.cohortEligible).toBe(true);
    expect(d.legacyFallbackEnabled).toBe(false);
    expect(d.reason).toBe("cohort_eligible");
  });

  it("allow — config enabled, membership present, reviewedAt set, expiresAt strictly in the future", async () => {
    const futureDate = new Date(Date.now() + 86_400_000); // +1 day
    dbSelectMock
      .mockResolvedValueOnce([mockConfigEnabled()])
      .mockResolvedValueOnce([mockMemberRow(futureDate, new Date())]);
    const d = await getCoachFactRolloutDecision("user-h");
    expect(d.cohortEligible).toBe(true);
    expect(d.reason).toBe("cohort_eligible");
  });

  it("fail-closed — DB throws on config query ⟹ deny without error propagation", async () => {
    dbSelectMock.mockRejectedValueOnce(new Error("connection reset"));
    const d = await getCoachFactRolloutDecision("user-i");
    expect(d.cohortEligible).toBe(false);
    expect(d.reason).toBe("dark_default_deny");
  });

  it("fail-closed — DB throws on membership query ⟹ deny without error propagation", async () => {
    dbSelectMock
      .mockResolvedValueOnce([mockConfigEnabled()])
      .mockRejectedValueOnce(new Error("timeout"));
    const d = await getCoachFactRolloutDecision("user-j");
    expect(d.cohortEligible).toBe(false);
    expect(d.reason).toBe("dark_default_deny");
  });

  it("getActiveCohort() is read-only and always empty (DB is authoritative)", () => {
    const cohort = getActiveCohort();
    expect(cohort.has("any-user")).toBe(false);
    expect(cohort.size).toBe(0);
  });

  it("deny-all: every arbitrary user id is rejected when config row is absent", async () => {
    const ids = ["user-abc", "00000000-0000-0000-0000-000000000001", "admin", "root", "true", "1", ""];
    for (const id of ids) {
      dbSelectMock.mockResolvedValueOnce([]); // config absent
      const d = await getCoachFactRolloutDecision(id);
      expect(d.cohortEligible).toBe(false);
    }
  });
});
