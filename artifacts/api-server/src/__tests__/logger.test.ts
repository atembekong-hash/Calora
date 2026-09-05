import { afterEach, describe, expect, it, vi } from "vitest";

describe("recovery warning summaries", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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
});