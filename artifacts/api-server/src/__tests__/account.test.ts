import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { transaction, execute, deleteWhere, deleteUser, getUser } = vi.hoisted(() => {
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
  });
});