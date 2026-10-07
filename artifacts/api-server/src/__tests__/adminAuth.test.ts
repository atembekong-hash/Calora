import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL ??=
    "postgresql://fixture:fixture@localhost:5432/fixture?sslmode=disable";
});

import {
  ADMIN_ROLE_PERMISSIONS,
  hasPermission,
  isAdminHost,
} from "../lib/admin-auth.js";

describe("admin authorization policy", () => {
  it("keeps least-privilege roles away from role administration and moderation writes", () => {
    expect(hasPermission("support", "admin.roles.manage")).toBe(false);
    expect(hasPermission("analyst", "moderation.resolve")).toBe(false);
    expect(hasPermission("content", "users.read")).toBe(false);
    expect(hasPermission("moderation", "moderation.resolve")).toBe(true);
    expect(hasPermission("owner", "admin.roles.manage")).toBe(true);
  });

  it("does not infer permissions from role names or client input", () => {
    expect(ADMIN_ROLE_PERMISSIONS.support).not.toContain("system.read");
    expect(ADMIN_ROLE_PERMISSIONS.owner).toContain("audit.read");
  });

  it("accepts only the dedicated admin host", () => {
    const request = (host: string) =>
      ({
        hostname: host,
        get: (name: string) => (name === "host" ? host : undefined),
      }) as never;
    expect(isAdminHost(request("admin.mycaloraapp.com"))).toBe(true);
    expect(isAdminHost(request("mycaloraapp.com"))).toBe(false);
    expect(isAdminHost(request("admin.mycaloraapp.com.evil.example"))).toBe(
      false,
    );
  });
});
