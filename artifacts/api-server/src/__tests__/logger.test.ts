import { createHash } from "node:crypto";
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
    const accountIdentifier = "account-raw-123";
    const providerErrorText = "RevenueCat customer lookup failed with HTTP 500";
    const providerResponseDetails = '{"subscriber":{"entitlements":{"premium":{}}}}';
    const rawCohortKey = [
      accountIdentifier,
      providerErrorText,
      providerResponseDetails,
    ].join(":");
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
      cohortKey: rawCohortKey,
      correlationKeys: [
        accountIdentifier,
        providerErrorText,
        providerResponseDetails,
        "a".repeat(16),
      ],
    });
    noteSuppressedRecoveryWarning({
      cohortKey: rawCohortKey,
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
    expect(fields).toEqual({
      event: "account_deletion_recovery_suppressed_summary",
      suppressedCycleCount: 2,
      suppressedCohortCount: 1,
      cohorts: [
        {
          cohortKey: createHash("sha256").update(rawCohortKey).digest("hex"),
          correlationKeys: ["a".repeat(16)],
          suppressedCycleCount: 2,
        },
      ],
    });
    const serializedFields = JSON.stringify(fields);
    expect(serializedFields).not.toContain(accountIdentifier);
    expect(serializedFields).not.toContain(providerErrorText);
    expect(serializedFields).not.toContain(providerResponseDetails);
  });

  it("keeps cohort and correlation-key structures bounded", async () => {
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
    const correlationKeys = Array.from(
      { length: 256 },
      (_, index) => index.toString(16).padStart(16, "0"),
    );

    noteSuppressedRecoveryWarning({
      cohortKey: "bounded-cohort",
      correlationKeys,
    });
    for (let index = 0; index < 129; index += 1) {
      noteSuppressedRecoveryWarning({
        cohortKey: `bounded-cohort-${index}`,
        correlationKeys: [index.toString(16).padStart(16, "0")],
      });
    }
    flushSuppressedRecoveryWarningSummary(
      startedAt.getTime() + RECOVERY_WARNING_SUMMARY_INTERVAL_MS * 2,
    );

    expect(warn).toHaveBeenCalledOnce();
    const [fields] = warn.mock.calls[0];
    const summary = fields as {
      suppressedCycleCount: number;
      suppressedCohortCount: number;
      cohorts: Array<{
        cohortKey: string;
        correlationKeys: string[];
      }>;
    };
    expect(fields).toMatchObject({
      suppressedCycleCount: 128,
      suppressedCohortCount: 128,
    });
    expect(summary.cohorts).toHaveLength(128);
    expect(summary.cohorts.every((cohort) => /^[a-f0-9]{64}$/.test(cohort.cohortKey)))
      .toBe(true);
    const boundedCohort = summary.cohorts.find(
      (cohort) =>
        cohort.cohortKey ===
        createHash("sha256").update("bounded-cohort").digest("hex"),
    );
    expect(boundedCohort).toBeDefined();
    expect(boundedCohort?.correlationKeys).toHaveLength(128);
    expect(boundedCohort?.correlationKeys).toEqual(
      correlationKeys.slice(0, 128),
    );
    expect(
      summary.cohorts.every((cohort) =>
        cohort.correlationKeys.every((key) => /^[a-f0-9]{16}$/.test(key))),
    ).toBe(true);
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
    const [fields, message] = warn.mock.calls[0];
    expect(message).toBe("Account deletion recovery warnings remain suppressed");
    expect(fields).toEqual({
      event: "account_deletion_recovery_suppressed_summary",
      suppressedCycleCount: 3,
      suppressedCohortCount: 1,
      cohorts: [{
        cohortKey: "b".repeat(64),
        correlationKeys: ["c".repeat(16)],
        suppressedCycleCount: 3,
      }],
    });
    const serializedFields = JSON.stringify(fields);
    expect(serializedFields).not.toContain("raw-account-id");
    expect(serializedFields).not.toContain("provider error");
    expect(serializedFields).not.toContain("subscriber response details");
    expect(flushSuppressedRecoveryWarningSummary).toBeTypeOf("function");
  });
});
