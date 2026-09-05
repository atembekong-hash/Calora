import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const {
  transaction, execute, deleteWhere, deleteUser, getUser, advisoryQuery,
  claimDeletion, checkpointDeletion, completeDeletion, failedDeletion, deleteRevenueCatSubscriber,
  listRecoverableDeletions, warn,
} = vi.hoisted(() => {
  const execute = vi.fn();
  const deleteWhere = vi.fn();
  const advisoryQuery = vi.fn().mockResolvedValue({ rows: [{ locked: true }] });
  const warn = vi.fn();
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
    listRecoverableDeletions: vi.fn(),
    warn,
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
  listRecoverableAccountDeletions: (...args: unknown[]) => listRecoverableDeletions(...args),
}));

vi.mock("../lib/revenuecat.js", () => ({
  deleteRevenueCatSubscriber: (...args: unknown[]) => deleteRevenueCatSubscriber(...args),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { warn },
}));

import accountRouter, { recoverPendingAccountDeletions } from "../routes/account.js";

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
    listRecoverableDeletions.mockResolvedValue([]);
  });

  it("removes application data before deleting the authenticated Auth identity", async () => {
    const res = await request(buildApp())
      .delete("/v1/account")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Account permanently deleted." });
    expect(transaction).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledTimes(6);
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

describe("account deletion recovery signals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecoverableDeletions.mockResolvedValue([]);
    advisoryQuery.mockResolvedValue({ rows: [{ locked: true }] });
    claimDeletion.mockResolvedValue({ kind: "completed" });
  });

  it("stays quiet when all recoverable deletions complete", async () => {
    listRecoverableDeletions.mockResolvedValue([
      {
        externalUserId: "auth-user-1",
        identityFingerprint: "a".repeat(64),
        stage: "auth",
        requestedAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await recoverPendingAccountDeletions();

    expect(warn).not.toHaveBeenCalled();
  });

  it("emits an aggregate redacted signal for a failed, overdue recovery", async () => {
    const requestedAt = new Date(Date.now() - 20 * 60 * 1000);
    listRecoverableDeletions.mockResolvedValue([
      {
        externalUserId: "raw-auth-uuid-that-must-not-be-logged",
        identityFingerprint: "b".repeat(64),
        stage: "revenuecat",
        requestedAt,
        updatedAt: requestedAt,
      },
    ]);
    claimDeletion.mockRejectedValueOnce(
      new Error("provider failed for raw-auth-uuid-that-must-not-be-logged"),
    );

    await recoverPendingAccountDeletions();

    expect(warn).toHaveBeenCalledOnce();
    const [fields, message] = warn.mock.calls[0];
    expect(message).toBe("Account deletion recovery needs attention");
    expect(fields).toMatchObject({
      event: "account_deletion_recovery",
      attemptedCount: 1,
      failureCount: 1,
      failureStages: { application: 0, revenuecat: 1, auth: 0 },
      unresolvedCount: 1,
      overdueCount: 1,
      overdueStages: { application: 0, revenuecat: 1, auth: 0 },
      correlationKeys: ["b".repeat(16)],
    });
    expect(JSON.stringify(fields)).not.toContain("raw-auth-uuid-that-must-not-be-logged");
    expect(JSON.stringify(fields)).not.toContain("provider failed");
  });

  it("rate-limits an unchanged recovery cohort", async () => {
    const requestedAt = new Date(Date.now() - 20 * 60 * 1000);
    listRecoverableDeletions.mockResolvedValue([
      {
        externalUserId: "raw-auth-uuid-that-must-not-be-logged",
        identityFingerprint: "c".repeat(64),
        stage: "revenuecat",
        requestedAt,
        updatedAt: requestedAt,
      },
    ]);
    claimDeletion.mockRejectedValue(new Error("provider unavailable"));

    await recoverPendingAccountDeletions();
    await recoverPendingAccountDeletions();

    expect(warn).toHaveBeenCalledOnce();
  });

  it("emits a fresh signal when a recovery stage changes", async () => {
    const requestedAt = new Date(Date.now() - 20 * 60 * 1000);
    const deletion = {
      externalUserId: "raw-auth-uuid-that-must-not-be-logged",
      identityFingerprint: "d".repeat(64),
      stage: "revenuecat" as const,
      requestedAt,
      updatedAt: requestedAt,
    };
    listRecoverableDeletions.mockResolvedValue([deletion]);
    claimDeletion.mockRejectedValue(new Error("provider unavailable"));

    await recoverPendingAccountDeletions();
    listRecoverableDeletions.mockResolvedValue([{ ...deletion, stage: "auth" }]);
    await recoverPendingAccountDeletions();

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toMatchObject({
      overdueStages: { application: 0, revenuecat: 1, auth: 0 },
    });
    expect(warn.mock.calls[1][0]).toMatchObject({
      overdueStages: { application: 0, revenuecat: 0, auth: 1 },
    });
  });

  it("emits the same cohort again after the warning cooldown", async () => {
    vi.useFakeTimers();
    try {
      const requestedAt = new Date(Date.now() - 20 * 60 * 1000);
      listRecoverableDeletions.mockResolvedValue([
        {
          externalUserId: "raw-auth-uuid-that-must-not-be-logged",
          identityFingerprint: "e".repeat(64),
          stage: "revenuecat",
          requestedAt,
          updatedAt: requestedAt,
        },
      ]);
      claimDeletion.mockRejectedValue(new Error("provider unavailable"));

      await recoverPendingAccountDeletions();
      vi.advanceTimersByTime(15 * 60 * 1000);
      await recoverPendingAccountDeletions();

      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});