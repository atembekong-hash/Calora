import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const {
  transaction, execute, deleteWhere, deleteUser, getUser, advisoryQuery,
  claimDeletion, checkpointDeletion, completeDeletion, failedDeletion, deleteRevenueCatSubscriber,
} = vi.hoisted(() => {
  const execute = vi.fn();
  const deleteWhere = vi.fn();
  const advisoryQuery = vi.fn().mockResolvedValue({ rows: [{ locked: true }] });
  const tx = {
    execute,
    delete: () => ({ where: deleteWhere }),
  };
  return {
    transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx)),
    execute,
    deleteWhere,
    getUser: vi.fn(),
    deleteUser: vi.fn(),
    claimDeletion: vi.fn(),
    checkpointDeletion: vi.fn(),
    completeDeletion: vi.fn(),
    failedDeletion: vi.fn(),
    deleteRevenueCatSubscriber: vi.fn(),
    advisoryQuery,
  };
});

vi.mock("@workspace/db", () => ({
  db: { transaction },
  pool: { connect: vi.fn(async () => ({ query: advisoryQuery, release: vi.fn() })) },
  usersTable: { externalId: "external_id" },
}));

vi.mock("../lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser,
      admin: { deleteUser },
    },
  }),
}));

vi.mock("../lib/account-deletion-state.js", () => ({
  claimAccountDeletion: (...args: unknown[]) => claimDeletion(...args),
  checkpointAccountDeletion: (...args: unknown[]) => checkpointDeletion(...args),
  completeAccountDeletion: (...args: unknown[]) => completeDeletion(...args),
  markAccountDeletionFailed: (...args: unknown[]) => failedDeletion(...args),
  listRecoverableAccountDeletions: vi.fn().mockResolvedValue([]),
}));

vi.mock("../lib/revenuecat.js", () => ({
  deleteRevenueCatSubscriber: (...args: unknown[]) => deleteRevenueCatSubscriber(...args),
}));

import accountRouter from "../routes/account.js";

function buildApp() {
  const app = express();
  app.use((req, _res, next) => {
    req.log = { error: vi.fn() } as never;
    next();
  });
  app.use(accountRouter);
  return app;
}

describe("DELETE /v1/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "auth-user-1" } }, error: null });
    deleteUser.mockResolvedValue({ error: null });
    claimDeletion.mockResolvedValue({ kind: "claimed", operationId: "11111111-1111-4111-8111-111111111111", stage: "application" });
    checkpointDeletion.mockResolvedValue(true);
    completeDeletion.mockResolvedValue(true);
    failedDeletion.mockResolvedValue(undefined);
    deleteRevenueCatSubscriber.mockResolvedValue(undefined);
  });

  it("removes application data before deleting the authenticated Auth identity", async () => {
    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Account permanently deleted." });
    expect(transaction).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledTimes(5);
    expect(deleteWhere).toHaveBeenCalledOnce();
    expect(deleteUser).toHaveBeenCalledWith("auth-user-1");
    expect(deleteRevenueCatSubscriber).toHaveBeenCalledWith("auth-user-1");
    expect(checkpointDeletion).toHaveBeenNthCalledWith(1, "auth-user-1", "11111111-1111-4111-8111-111111111111", "revenuecat");
    expect(checkpointDeletion).toHaveBeenNthCalledWith(2, "auth-user-1", "11111111-1111-4111-8111-111111111111", "auth");
    expect(completeDeletion).toHaveBeenCalledWith("auth-user-1", "11111111-1111-4111-8111-111111111111");
    expect(deleteWhere.mock.invocationCallOrder[0]).toBeLessThan(deleteUser.mock.invocationCallOrder[0]);
  });

  it("does not delete the Auth identity when application cleanup fails", async () => {
    execute.mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(502);
    expect(res.body.message).toContain("Account deletion failed");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("does not touch application data for an invalid token", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid token") });

    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer forged-token");

    expect(res.status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("does not report success when Auth deletion fails after cleanup", async () => {
    deleteUser.mockResolvedValue({ error: new Error("provider unavailable") });

    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(502);
    expect(res.body.message).toContain("Account deletion failed");
    expect(failedDeletion).toHaveBeenCalledWith("auth-user-1", "11111111-1111-4111-8111-111111111111");
  });

  it("does not report success when RevenueCat subscriber deletion fails", async () => {
    deleteRevenueCatSubscriber.mockRejectedValueOnce(new Error("provider unavailable"));

    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(502);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(failedDeletion).toHaveBeenCalledWith("auth-user-1", "11111111-1111-4111-8111-111111111111");
  });

  it("retries a RevenueCat failure and only completes deletion after the retry succeeds", async () => {
    deleteRevenueCatSubscriber
      .mockRejectedValueOnce(new Error("provider unavailable"))
      .mockResolvedValueOnce(undefined);

    const first = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");
    const second = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(first.status).toBe(502);
    expect(second.status).toBe(200);
    expect(claimDeletion).toHaveBeenCalledTimes(2);
    expect(deleteRevenueCatSubscriber).toHaveBeenCalledTimes(2);
    expect(deleteUser).toHaveBeenCalledOnce();
    expect(completeDeletion).toHaveBeenCalledOnce();
  });

  it("is idempotent after a completed deletion", async () => {
    claimDeletion.mockResolvedValueOnce({ kind: "completed" });

    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not run a second deletion saga while another owner holds the lease", async () => {
    claimDeletion.mockResolvedValueOnce({ kind: "in_progress" });

    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(202);
    expect(deleteRevenueCatSubscriber).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});