import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: { execute },
}));

import { listRecoverableAccountDeletions } from "../lib/account-deletion-state.js";

describe("account deletion recovery state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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