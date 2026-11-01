import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, createClient } = vi.hoisted(() => {
  const getUser = vi.fn();
  return { getUser, createClient: vi.fn(() => ({ auth: { getUser } })) };
});

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("../lib/account-deletion-state.js", () => ({
  AccountDeletionInProgressError: class AccountDeletionInProgressError extends Error {},
  assertAccountWritable: vi.fn().mockResolvedValue(undefined),
}));

import { verifyBearerToken } from "../lib/supabase-auth.js";

describe("server Supabase bearer verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://auth.example.test";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("shares concurrent verification for the same token", async () => {
    let resolveUser!: (value: unknown) => void;
    const pending = new Promise((resolve) => { resolveUser = resolve; });
    getUser.mockReturnValueOnce(pending);

    const request = { headers: { authorization: "Bearer same-token" } } as never;
    const first = verifyBearerToken(request);
    const second = verifyBearerToken(request);
    resolveUser({ data: { user: { id: "user-1", email: "qa@example.test", app_metadata: {} } }, error: null });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { id: "user-1", email: "qa@example.test", coachFactAccount: { eligible: true, reason: "eligible" } },
      { id: "user-1", email: "qa@example.test", coachFactAccount: { eligible: true, reason: "eligible" } },
    ]);
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("does not retain a verification after it settles", async () => {
    getUser
      .mockResolvedValueOnce({ data: { user: { id: "user-1", email: null, app_metadata: {} } }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: "user-1", email: null, app_metadata: {} } }, error: null });
    const request = { headers: { authorization: "Bearer sequential-token" } } as never;

    await verifyBearerToken(request);
    await verifyBearerToken(request);

    expect(getUser).toHaveBeenCalledTimes(2);
  });
});
