import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolQuery } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  pool: { query: (...args: unknown[]) => poolQuery(...args) },
}));

import {
  listManagedFeatureFlags,
  setManagedFeatureFlag,
} from "../lib/admin-feature-flags.js";

describe("managed admin feature flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolQuery.mockResolvedValue({ rows: [] });
  });

  it("returns only code-reviewed flags with safe defaults", async () => {
    await expect(listManagedFeatureFlags()).resolves.toEqual([
      expect.objectContaining({
        key: "coach_report_intake",
        enabled: true,
      }),
    ]);
    expect(poolQuery).toHaveBeenCalledWith(
      expect.stringContaining("key = ANY"),
      [["coach_report_intake"]],
    );
  });

  it("honors a stored boolean state without exposing arbitrary configuration", async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [{ key: "coach_report_intake", value: { enabled: false } }],
    });
    await expect(listManagedFeatureFlags()).resolves.toEqual([
      expect.objectContaining({
        key: "coach_report_intake",
        enabled: false,
      }),
    ]);
  });

  it("rejects keys outside the reviewed allowlist", async () => {
    await expect(
      setManagedFeatureFlag("unreviewed_runtime_setting", false),
    ).resolves.toBeNull();
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("persists only an explicit enabled state for an allowlisted key", async () => {
    await expect(
      setManagedFeatureFlag("coach_report_intake", false),
    ).resolves.toBe("coach_report_intake");
    expect(poolQuery).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT"),
      ["coach_report_intake", JSON.stringify({ enabled: false })],
    );
  });
});
