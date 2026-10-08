import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolQuery, writeAdminAudit } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  writeAdminAudit: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));
vi.mock("../lib/admin-data.js", () => ({
  writeAdminAudit: (...args: unknown[]) => writeAdminAudit(...args),
}));

import { changeOperationalAlertStatus } from "../lib/admin-alerts.js";

const SESSION = {
  id: "018f6f73-4e56-4c3f-a737-2f4622a6d7aa",
  csrfToken: "x".repeat(43),
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
  reauthUntil: new Date("2030-01-01T00:00:00.000Z"),
  principal: {
    id: "018f6f73-4e56-4c3f-a737-2f4622a6d7ab",
    externalUserId: "owner-auth-id",
    displayName: "Owner",
    role: "owner" as const,
  },
};

describe("admin operational alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolQuery.mockResolvedValue({
      rows: [{ id: "018f6f73-4e56-4c3f-a737-2f4622a6d7ac" }],
    });
    writeAdminAudit.mockResolvedValue(undefined);
  });

  it("acknowledges an alert and records a bounded audit event", async () => {
    await expect(
      changeOperationalAlertStatus(
        SESSION,
        "018f6f73-4e56-4c3f-a737-2f4622a6d7ac",
        "acknowledged",
      ),
    ).resolves.toBe(true);
    expect(poolQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE calora_admin_operational_alerts"),
      expect.any(Array),
    );
    expect(writeAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "alert.acknowledged",
        targetType: "operational_alert",
        result: "success",
      }),
    );
  });

  it("returns false without an audit event when the alert is absent", async () => {
    poolQuery.mockResolvedValueOnce({ rows: [] });
    await expect(
      changeOperationalAlertStatus(
        SESSION,
        "018f6f73-4e56-4c3f-a737-2f4622a6d7ac",
        "resolved",
      ),
    ).resolves.toBe(false);
    expect(writeAdminAudit).not.toHaveBeenCalled();
  });
});
