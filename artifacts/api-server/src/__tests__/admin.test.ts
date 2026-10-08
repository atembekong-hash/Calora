import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const {
  authenticateAdmin,
  createAdminSession,
  clearAdminSessionCookie,
  publicAdminSession,
  reauthenticateAdmin,
  revokeAdminSession,
  rotateAdminCsrf,
  isAdminHost,
  poolQuery,
  writeAdminAudit,
  listAdminPrincipals,
  grantAdminRole,
  revokeAdminPrincipal,
  listManagedFeatureFlags,
  setManagedFeatureFlag,
} = vi.hoisted(() => ({
  authenticateAdmin: vi.fn(),
  createAdminSession: vi.fn(),
  clearAdminSessionCookie: vi.fn(),
  publicAdminSession: vi.fn(),
  reauthenticateAdmin: vi.fn(),
  revokeAdminSession: vi.fn(),
  rotateAdminCsrf: vi.fn(),
  isAdminHost: vi.fn(),
  poolQuery: vi.fn(),
  writeAdminAudit: vi.fn(),
  listAdminPrincipals: vi.fn(),
  grantAdminRole: vi.fn(),
  revokeAdminPrincipal: vi.fn(),
  listManagedFeatureFlags: vi.fn(),
  setManagedFeatureFlag: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));
vi.mock("../lib/admin-auth.js", () => ({
  ADMIN_ROLES: [
    "owner",
    "operations",
    "support",
    "content",
    "moderation",
    "analyst",
  ],
  adminConsoleHost: () => "admin.mycaloraapp.com",
  authenticateAdmin: (...args: unknown[]) => authenticateAdmin(...args),
  clearAdminSessionCookie: (...args: unknown[]) =>
    clearAdminSessionCookie(...args),
  createAdminSession: (...args: unknown[]) => createAdminSession(...args),
  isAdminHost: (...args: unknown[]) => isAdminHost(...args),
  publicAdminSession: (...args: unknown[]) => publicAdminSession(...args),
  reauthenticateAdmin: (...args: unknown[]) => reauthenticateAdmin(...args),
  revokeAdminSession: (...args: unknown[]) => revokeAdminSession(...args),
  rotateAdminCsrf: (...args: unknown[]) => rotateAdminCsrf(...args),
}));
vi.mock("../lib/admin-data.js", () => ({
  grantAdminRole: (...args: unknown[]) => grantAdminRole(...args),
  listAdminPrincipals: (...args: unknown[]) => listAdminPrincipals(...args),
  revokeAdminPrincipal: (...args: unknown[]) => revokeAdminPrincipal(...args),
  writeAdminAudit: (...args: unknown[]) => writeAdminAudit(...args),
}));
vi.mock("../lib/admin-feature-flags.js", () => ({
  listManagedFeatureFlags: (...args: unknown[]) =>
    listManagedFeatureFlags(...args),
  setManagedFeatureFlag: (...args: unknown[]) => setManagedFeatureFlag(...args),
}));

import adminRouter from "../routes/admin.js";

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

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use(adminRouter);
  return instance;
}

describe("restricted admin control plane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminHost.mockReturnValue(true);
    authenticateAdmin.mockResolvedValue(SESSION);
    rotateAdminCsrf.mockResolvedValue("y".repeat(43));
    publicAdminSession.mockReturnValue({
      administrator: {
        displayName: "Owner",
        role: "owner",
        permissions: ["overview.read"],
      },
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
    writeAdminAudit.mockResolvedValue(undefined);
    poolQuery.mockResolvedValue({ rows: [] });
    listManagedFeatureFlags.mockResolvedValue([]);
    setManagedFeatureFlag.mockResolvedValue("coach_report_intake");
  });

  it("does not render the console on a non-admin host", async () => {
    isAdminHost.mockReturnValue(false);
    const response = await request(app())
      .get("/")
      .set("Host", "mycaloraapp.com");
    expect(response.status).toBe(404);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("rejects direct administrative API access on a non-admin host", async () => {
    isAdminHost.mockReturnValue(false);
    const response = await request(app())
      .get("/admin/api/overview")
      .set("Host", "mycaloraapp.com");
    expect(response.status).toBe(404);
    expect(authenticateAdmin).not.toHaveBeenCalled();
  });

  it("renders a no-store console without raw user-data affordances", async () => {
    const response = await request(app())
      .get("/")
      .set("Host", "admin.mycaloraapp.com");
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers["x-robots-tag"]).toBe(
      "noindex, nofollow, noarchive, nosnippet",
    );
    expect(response.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.text).toContain("Calora Control Center");
    expect(response.text).toContain(
      '<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">',
    );
    expect(response.text).toContain(
      "No user nutrition or Coach message content is displayed",
    );
    expect(response.text).not.toContain("export database");
  });

  it("returns no operational data when the server-side role check denies access", async () => {
    authenticateAdmin.mockResolvedValue(null);
    const response = await request(app())
      .get("/admin/api/users")
      .set("Host", "admin.mycaloraapp.com");
    expect(response.status).toBe(401);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("returns aggregate-only overview data", async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          account_count: "12",
          active_subscription_count: "3",
          scan_total: "4",
          scan_completed: "3",
          open_reports: "2",
        },
      ],
    });
    const response = await request(app())
      .get("/admin/api/overview")
      .set("Host", "admin.mycaloraapp.com");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        accounts: { total: 12 },
        subscriptions: { active: 3 },
        scans: { completionRate: 75 },
        coach: { openReports: 2 },
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain("email");
  });

  it("requires recent reauthentication before changing a Coach report state", async () => {
    authenticateAdmin.mockResolvedValue(null);
    const response = await request(app())
      .patch(
        "/admin/api/moderation/reports/018f6f73-4e56-4c3f-a737-2f4622a6d7ac",
      )
      .set("Host", "admin.mycaloraapp.com")
      .send({ status: "resolved" });
    expect(response.status).toBe(401);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("updates only a bounded moderation status and writes an audit event", async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [{ id: "018f6f73-4e56-4c3f-a737-2f4622a6d7ac" }],
    });
    const response = await request(app())
      .patch(
        "/admin/api/moderation/reports/018f6f73-4e56-4c3f-a737-2f4622a6d7ac",
      )
      .set("Host", "admin.mycaloraapp.com")
      .send({ status: "resolved" });
    expect(response.status).toBe(200);
    expect(poolQuery.mock.calls[0]?.[0]).toContain(
      "UPDATE calora_coach_reports SET status",
    );
    expect(writeAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "moderation.status_changed",
        result: "success",
      }),
    );
  });

  it("rejects invalid moderation values before issuing a write", async () => {
    const response = await request(app())
      .patch("/admin/api/moderation/reports/not-a-uuid")
      .set("Host", "admin.mycaloraapp.com")
      .send({ status: "erase" });
    expect(response.status).toBe(400);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("lists only the reviewed feature flags", async () => {
    listManagedFeatureFlags.mockResolvedValueOnce([
      {
        key: "coach_report_intake",
        label: "Coach report intake",
        description: "Allows privacy-minimized Coach feedback.",
        enabled: true,
      },
    ]);
    const response = await request(app())
      .get("/admin/api/features")
      .set("Host", "admin.mycaloraapp.com");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ key: "coach_report_intake", enabled: true }),
    ]);
    expect(JSON.stringify(response.body)).not.toContain("server_config");
  });

  it("audits an allowlisted feature change without accepting arbitrary keys", async () => {
    const response = await request(app())
      .patch("/admin/api/features/coach_report_intake")
      .set("Host", "admin.mycaloraapp.com")
      .send({ enabled: false });
    expect(response.status).toBe(200);
    expect(setManagedFeatureFlag).toHaveBeenCalledWith(
      "coach_report_intake",
      false,
    );
    expect(writeAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "feature_flag.updated",
        result: "success",
      }),
    );
  });

  it("keeps session output limited to role metadata and an opaque CSRF token", async () => {
    createAdminSession.mockResolvedValue({
      session: SESSION,
      csrfToken: "z".repeat(43),
    });
    const response = await request(app())
      .post("/admin/api/session")
      .set("Host", "admin.mycaloraapp.com")
      .set("Authorization", "Bearer opaque-supabase-token");
    expect(response.status).toBe(201);
    expect(response.body.csrfToken).toHaveLength(43);
    expect(JSON.stringify(response.body)).not.toContain("owner-auth-id");
    expect(JSON.stringify(response.body)).not.toContain(
      "opaque-supabase-token",
    );
  });
});
