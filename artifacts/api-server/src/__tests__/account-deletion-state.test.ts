import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, transaction } = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: { execute, transaction },
}));

import {
  claimRecoveryWarningSuppression,
  listRecoverableAccountDeletions,
} from "../lib/account-deletion-state.js";

describe("account deletion recovery state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (callback: (tx: { execute: typeof execute }) => Promise<unknown>) =>
      callback({ execute }),
    );
  });

  it("stores only a digest and atomically claims an unseen warning signature", async () => {
    execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ warning_key: "digest" }] });

    const signature = "provider error for raw-account-id";
    const claimed = await claimRecoveryWarningSuppression(
      signature,
      new Date("2026-09-05T09:00:00.000Z"),
    );

    expect(claimed).toBe(true);
    expect(transaction).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(execute.mock.calls)).not.toContain(signature);
    expect(JSON.stringify(execute.mock.calls)).toContain("127");
  });

  it("returns false when another API instance already owns the active cooldown", async () => {
    execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      claimRecoveryWarningSuppression("same recovery signature"),
    ).resolves.toBe(false);
  });

  it("normalizes PostgreSQL timestamp strings before recovery computes age", async () => {
    execute.mockResolvedValueOnce({
      rows: [
        {
          recovery_external_user_id: "raw-auth-id-never-logged",
          identity_fingerprint: "f".repeat(64),
          stage: "revenuecat",
          requested_at: "2026-09-05T08:40:00.000Z",
          updated_at: "2026-09-05T08:41:00.000Z",
        },
      ],
    });

    const [deletion] = await listRecoverableAccountDeletions();

    expect(deletion).toMatchObject({
      externalUserId: "raw-auth-id-never-logged",
      identityFingerprint: "f".repeat(64),
      stage: "revenuecat",
      requestedAt: new Date("2026-09-05T08:40:00.000Z"),
      updatedAt: new Date("2026-09-05T08:41:00.000Z"),
    });
    expect(deletion?.requestedAt).toBeInstanceOf(Date);
    expect(deletion?.updatedAt).toBeInstanceOf(Date);
  });
});