import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolQuery, writeAdminAudit } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  writeAdminAudit: vi.fn(),
}));
vi.mock("@workspace/db", () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));
vi.mock("../lib/logger.js", () => ({
  safeErrorDetails: () => ({ errorClass: "test_error" }),
  safeErrorCode: () => "test_error",
  logger: { info: vi.fn(), warn: vi.fn() },
}));
vi.mock("../lib/admin-data.js", () => ({
  writeAdminAudit: (...args: unknown[]) => writeAdminAudit(...args),
}));

import { notifyOperationalAlerts } from "../lib/admin-alert-email.js";

const ALERT = {
  id: "018f6f73-4e56-4c3f-a737-2f4622a6d7ac",
  alertKey: "scan.failure_spike",
  severity: "critical" as const,
  status: "open" as const,
  title: "Scan failure rate is elevated",
  detail:
    "5 of 8 Scan sessions failed or were unavailable in the last 24 hours.",
  occurrenceCount: 2,
  firstSeenAt: "2030-01-01T00:00:00.000Z",
  lastSeenAt: "2030-01-01T00:10:00.000Z",
  acknowledgedAt: null,
  resolvedAt: null,
};

function deliveryRow(
  overrides: Partial<{
    attempt_count: number;
    status: "pending" | "sent" | "failed";
    last_attempt_at: Date | null;
  }> = {},
) {
  return {
    id: ALERT.id,
    attempt_count: 0,
    status: "pending" as const,
    last_attempt_at: null,
    ...overrides,
  };
}

describe("admin alert email delivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.CALORA_ALERT_FROM;
    delete process.env.CALORA_ALERT_RECIPIENT;
    writeAdminAudit.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("does nothing when outbound delivery is not configured", async () => {
    await notifyOperationalAlerts([ALERT]);
    expect(poolQuery).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends bounded metadata and records the provider id and audit event", async () => {
    process.env.RESEND_API_KEY = "test-only-key";
    poolQuery
      .mockResolvedValueOnce({ rows: [deliveryRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "msg_test" }), { status: 200 }),
    );

    await notifyOperationalAlerts([ALERT]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-only-key",
        }),
        body: expect.stringContaining("Scan failure rate is elevated"),
      }),
    );
    expect(poolQuery).toHaveBeenCalledWith(
      expect.stringContaining("provider_message_id"),
      [ALERT.id, "msg_test"],
    );
    expect(writeAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "alert.email_sent",
        result: "success",
      }),
    );
  });

  it("does not send a second message during the delivery cooldown", async () => {
    process.env.RESEND_API_KEY = "test-only-key";
    poolQuery
      .mockResolvedValueOnce({ rows: [deliveryRow()] })
      .mockResolvedValueOnce({ rows: [{ id: "recent" }] });

    await notifyOperationalAlerts([ALERT]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retries a failed delivery after the cooldown", async () => {
    process.env.RESEND_API_KEY = "test-only-key";
    poolQuery
      .mockResolvedValueOnce({
        rows: [
          deliveryRow({
            attempt_count: 1,
            status: "failed",
            last_attempt_at: new Date(Date.now() - 16 * 60 * 1000),
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "msg_retry" }), { status: 200 }),
    );

    await notifyOperationalAlerts([ALERT]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(writeAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "alert.email_sent",
        result: "success",
      }),
    );
  });

  it("does not retry a failed delivery before the cooldown", async () => {
    process.env.RESEND_API_KEY = "test-only-key";
    poolQuery.mockResolvedValueOnce({
      rows: [
        deliveryRow({
          attempt_count: 1,
          status: "failed",
          last_attempt_at: new Date(),
        }),
      ],
    });

    await notifyOperationalAlerts([ALERT]);

    expect(fetch).not.toHaveBeenCalled();
    expect(writeAdminAudit).not.toHaveBeenCalled();
  });
});
