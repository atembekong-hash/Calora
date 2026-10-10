import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolQuery, connect, notifyOperationalAlerts, writeAdminAudit } =
  vi.hoisted(() => ({
    poolQuery: vi.fn(),
    connect: vi.fn(),
    notifyOperationalAlerts: vi.fn(),
    writeAdminAudit: vi.fn(),
  }));

vi.mock("@workspace/db", () => ({
  pool: {
    query: (...args: unknown[]) => poolQuery(...args),
    connect: (...args: unknown[]) => connect(...args),
  },
}));
vi.mock("../lib/admin-alert-email.js", () => ({
  notifyOperationalAlerts: (...args: unknown[]) =>
    notifyOperationalAlerts(...args),
}));
vi.mock("../lib/admin-data.js", () => ({
  writeAdminAudit: (...args: unknown[]) => writeAdminAudit(...args),
}));
vi.mock("../lib/logger.js", () => ({
  safeErrorDetails: () => ({ errorClass: "test_error" }),
  safeErrorCode: () => "test_error",
  logger: { info: vi.fn(), warn: vi.fn() },
}));

import { refreshOperationalAlerts } from "../lib/admin-alerts.js";

const ALERT_ID = "018f6f73-4e56-4c3f-a737-2f4622a6d7ac";

function alertRow() {
  const now = new Date("2030-01-01T00:00:00.000Z");
  return {
    id: ALERT_ID,
    alert_key: "scan.failure_spike",
    severity: "critical" as const,
    status: "open" as const,
    title: "Scan failure rate is elevated",
    detail:
      "5 of 8 Scan sessions failed or were unavailable in the last 24 hours.",
    occurrence_count: 1,
    first_seen_at: now,
    last_seen_at: now,
    acknowledged_at: null,
    resolved_at: null,
  };
}

function configureScenario({ release = "release-test" } = {}) {
  process.env.CALORA_RELEASE_COMMIT = release;
  poolQuery
    .mockResolvedValueOnce({ rows: [{ total: "8", failed: "5" }] })
    .mockResolvedValueOnce({ rows: [{ retryable: "0" }] })
    .mockResolvedValueOnce({ rows: [{ count: "0" }] })
    .mockResolvedValueOnce({ rows: [alertRow()] });
  connect.mockResolvedValue({
    query: vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }),
    release: vi.fn(),
  });
}

describe("operational alert engine integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CALORA_RELEASE_COMMIT;
    writeAdminAudit.mockResolvedValue(undefined);
    notifyOperationalAlerts.mockResolvedValue(undefined);
  });

  it("detects a critical scan incident, persists it, and hands it to delivery", async () => {
    configureScenario();

    await refreshOperationalAlerts();

    const client = await connect.mock.results[0].value;
    const calls = client.query.mock.calls.map((call: unknown[]) =>
      String(call[0]),
    );
    expect(calls).toContain("BEGIN");
    expect(
      calls.some((sql: string) =>
        sql.includes("INSERT INTO calora_admin_operational_alerts"),
      ),
    ).toBe(true);
    expect(calls).toContain("COMMIT");
    expect(notifyOperationalAlerts).toHaveBeenCalledWith([
      expect.objectContaining({
        alertKey: "scan.failure_spike",
        severity: "critical",
        detail: expect.not.stringContaining("user"),
      }),
    ]);
  });

  it("resolves previously active alerts when no incident is observed", async () => {
    process.env.CALORA_RELEASE_COMMIT = "release-test";
    poolQuery
      .mockResolvedValueOnce({ rows: [{ total: "2", failed: "0" }] })
      .mockResolvedValueOnce({ rows: [{ retryable: "0" }] })
      .mockResolvedValueOnce({ rows: [{ count: "0" }] });
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    connect.mockResolvedValue(client);

    await refreshOperationalAlerts();

    expect(
      client.query.mock.calls.some(
        (call: unknown[]) =>
          String(call[0]).includes("SET status = 'resolved'") &&
          String(call[0]).includes("WHERE status <> 'resolved'"),
      ),
    ).toBe(true);
    expect(notifyOperationalAlerts).not.toHaveBeenCalled();
  });
});
