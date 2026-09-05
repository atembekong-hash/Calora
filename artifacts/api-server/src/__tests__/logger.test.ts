import { afterEach, describe, expect, it, vi } from "vitest";

const { connect, query } = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  pool: { connect, query },
}));

describe("recovery warning summaries", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    connect.mockReset();
    query.mockReset();
  });

  it("emits a bounded sanitized summary only after the reporting cadence", async () => {
    const startedAt = new Date("2026-09-05T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(startedAt);
    const {
      flushSuppressedRecoveryWarningSummary,
      logger,
      noteSuppressedRecoveryWarning,
      RECOVERY_WARNING_SUMMARY_INTERVAL_MS,
    } = await import("../lib/logger.js");
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);

    noteSuppressedRecoveryWarning({
      cohortKey: "recovery:raw-account-id:revenuecat",
      correlationKeys: ["raw-account-id", "a".repeat(16)],
    });
    noteSuppressedRecoveryWarning({
      cohortKey: "recovery:raw-account-id:revenuecat",
      correlationKeys: ["a".repeat(16)],
    });

    flushSuppressedRecoveryWarningSummary(
      startedAt.getTime() + RECOVERY_WARNING_SUMMARY_INTERVAL_MS - 1,
    );
    expect(warn).not.toHaveBeenCalled();

    flushSuppressedRecoveryWarningSummary(
      startedAt.getTime() + RECOVERY_WARNING_SUMMARY_INTERVAL_MS,
    );

    expect(warn).toHaveBeenCalledOnce();
    const [fields, message] = warn.mock.calls[0];
    expect(message).toBe("Account deletion recovery warnings remain suppressed");
    expect(fields).toMatchObject({
      event: "account_deletion_recovery_suppressed_summary",
      suppressedCycleCount: 2,
      suppressedCohortCount: 1,
      cohorts: [
        {
          correlationKeys: ["a".repeat(16)],
          suppressedCycleCount: 2,
        },
      ],
    });
    expect(JSON.stringify(fields)).not.toContain("raw-account-id");
  });

  it("restores a redacted summary and emits it after a restart", async () => {
    const startedAt = new Date("2026-09-05T10:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T10:16:00.000Z"));
    query.mockResolvedValueOnce({
      rows: [
        {
          cohort_key: "b".repeat(64),
          correlation_keys: ["c".repeat(16), "raw-account-id"],
          suppressed_cycle_count: 3,
          first_seen_at: startedAt,
        },
      ],
    });
    const {
      flushSuppressedRecoveryWarningSummary,
      logger,
      restoreSuppressedRecoveryWarningSummary,
    } = await import("../lib/logger.js");
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);

    await restoreSuppressedRecoveryWarningSummary(new Date("2026-09-05T10:16:00.000Z").getTime());

    expect(warn).toHaveBeenCalledOnce();
    const [fields] = warn.mock.calls[0];
    expect(fields).toMatchObject({
      suppressedCycleCount: 3,
      suppressedCohortCount: 1,
      cohorts: [{
        cohortKey: "b".repeat(64),
        correlationKeys: ["c".repeat(16)],
        suppressedCycleCount: 3,
      }],
    });
    expect(JSON.stringify(fields)).not.toContain("raw-account-id");
    expect(flushSuppressedRecoveryWarningSummary).toBeTypeOf("function");
  });
});