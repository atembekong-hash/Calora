import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const {
  transaction, execute, deleteWhere, deleteUser, getUser,
  beginDeletion, completeDeletion, failedDeletion, deleteRevenueCatSubscriber,
} = vi.hoisted(() => {
  const execute = vi.fn();
  const deleteWhere = vi.fn();
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
    beginDeletion: vi.fn(),
    completeDeletion: vi.fn(),
    failedDeletion: vi.fn(),
    deleteRevenueCatSubscriber: vi.fn(),
  };
});

vi.mock("@workspace/db", () => ({
  db: { transaction },
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
  beginAccountDeletion: (...args: unknown[]) => beginDeletion(...args),
  completeAccountDeletion: (...args: unknown[]) => completeDeletion(...args),
  markAccountDeletionFailed: (...args: unknown[]) => failedDeletion(...args),
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
    beginDeletion.mockResolvedValue("deleting");
    completeDeletion.mockResolvedValue(undefined);
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
    expect(completeDeletion).toHaveBeenCalledWith("auth-user-1");
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
    expect(failedDeletion).toHaveBeenCalledWith("auth-user-1");
  });

  it("does not report success when RevenueCat subscriber deletion fails", async () => {
    deleteRevenueCatSubscriber.mockRejectedValueOnce(new Error("provider unavailable"));

    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(502);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(failedDeletion).toHaveBeenCalledWith("auth-user-1");
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
    expect(beginDeletion).toHaveBeenCalledTimes(2);
    expect(deleteRevenueCatSubscriber).toHaveBeenCalledTimes(2);
    expect(deleteUser).toHaveBeenCalledOnce();
    expect(completeDeletion).toHaveBeenCalledOnce();
  });

  it("is idempotent after a completed deletion", async () => {
    beginDeletion.mockResolvedValueOnce("deleted");

    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});