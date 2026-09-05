import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ACCOUNT_DELETION_FENCE_ERROR_CLASS,
  MONITOR_SCHEMA_VERSION,
  summarizeAccountDeletionFenceLogs,
} from "./monitor-account-deletion-fence.mjs";

const workspaceDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("counts sanitized deletion-fence events by route and separates sync 503s", () => {
  const accountId = "disposable-account-must-not-be-retained";
  const credential = "Bearer disposable-credential-must-not-be-retained";
  const input = [
    JSON.stringify({
      level: 40,
      errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
      route: "/v1/sync",
      count: 2,
      msg: "Account deletion fence rejected sync writes",
      accountId,
      authorization: credential,
    }),
    JSON.stringify({
      level: 30,
      req: { method: "POST", url: "/api/v1/sync" },
      res: { statusCode: 503 },
      msg: "request completed",
      accountId,
      authorization: credential,
    }),
    JSON.stringify({
      level: 50,
      req: { method: "POST", url: "/v1/sync?cursor=discarded" },
      res: { statusCode: 503 },
      msg: "Sync request failed",
    }),
  ].join("\n");

  const report = summarizeAccountDeletionFenceLogs(input);

  assert.deepEqual(report, {
    schemaVersion: MONITOR_SCHEMA_VERSION,
    verified: true,
    deletionFence: {
      eventCount: 1,
      rejectionCount: 2,
      routes: { "/v1/sync": 2 },
    },
    unrelatedSync503: {
      eventCount: 2,
      routes: { "/v1/sync": 2 },
    },
  });
  assert.equal(JSON.stringify(report).includes(accountId), false);
  assert.equal(JSON.stringify(report).includes(credential), false);
});

test("aggregates multiple sanitized routes without persisting record contents", () => {
  const report = summarizeAccountDeletionFenceLogs(
    [
      JSON.stringify({
        errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
        route: "/v1/diary",
        count: 1,
        msg: "Account deletion fence rejected diary write",
        detail: "database text must not be copied",
      }),
      JSON.stringify({
        errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
        route: "/v1/diary",
        count: 3,
        msg: "Account deletion fence rejected diary write",
      }),
      JSON.stringify({
        errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
        route: "/v1/referral/redeem",
        count: 1,
        msg: "Account deletion fence rejected referral redemption",
      }),
    ].join("\n"),
  );

  assert.deepEqual(report.deletionFence, {
    eventCount: 3,
    rejectionCount: 5,
    routes: {
      "/v1/diary": 4,
      "/v1/referral/redeem": 1,
    },
  });
  assert.deepEqual(report.unrelatedSync503, {
    eventCount: 0,
    routes: {},
  });
});

test("does not classify arbitrary 503s or database text as a deletion fence", () => {
  const report = summarizeAccountDeletionFenceLogs(
    [
      JSON.stringify({
        level: 50,
        req: { url: "/v1/sync" },
        res: { statusCode: 503 },
        msg: "database temporarily unavailable",
      }),
      JSON.stringify({
        level: 50,
        code: "55000",
        message: "account deletion is in progress for raw-account-id",
        req: { url: "/v1/sync" },
        res: { statusCode: 503 },
      }),
    ].join("\n"),
  );

  assert.equal(report.verified, false);
  assert.deepEqual(report.deletionFence, {
    eventCount: 0,
    rejectionCount: 0,
    routes: {},
  });
  assert.deepEqual(report.unrelatedSync503, {
    eventCount: 2,
    routes: { "/v1/sync": 2 },
  });
});

test("fails closed on malformed structured fence signals", () => {
  assert.throws(
    () =>
      summarizeAccountDeletionFenceLogs(
        JSON.stringify({
          errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
          route: "/v1/sync",
          count: 0,
        }),
      ),
    /invalid route or count/,
  );
  assert.throws(
    () => summarizeAccountDeletionFenceLogs("{not-json}"),
    /invalid JSON on line 1/,
  );
});

test("keeps the shared builder and representative sync call sites monitor-compatible", async () => {
  const [stateSource, syncSource] = await Promise.all([
    readFile(
      path.join(
        workspaceDir,
        "artifacts",
        "api-server",
        "src",
        "lib",
        "account-deletion-state.ts",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceDir,
        "artifacts",
        "api-server",
        "src",
        "routes",
        "sync.ts",
      ),
      "utf8",
    ),
  ]);

  assert.match(
    stateSource,
    /return\s*\{\s*errorClass:\s*ACCOUNT_DELETION_FENCE_ERROR_CLASS,\s*route,\s*count,\s*\}/s,
  );
  assert.match(
    stateSource,
    /interface AccountDeletionFenceSignal[\s\S]*errorClass[\s\S]*route:\s*string[\s\S]*count:\s*number/,
  );

  const syncSignals = syncSource
    .split("\n")
    .filter((line) => line.includes("accountDeletionFenceSignal("))
    .map((line) => line.trim());
  assert.deepEqual(syncSignals, [
    "accountDeletionFenceSignal(\"/v1/sync\", deletionFenceRejectionCount),",
    "accountDeletionFenceSignal(\"/v1/sync\", Math.max(1, deletionFenceRejectionCount)),",
  ]);
  assert.doesNotMatch(
    syncSource,
    /logger\.warn\(\s*\{\s*errorClass:\s*ACCOUNT_DELETION_FENCE_ERROR_CLASS/s,
  );

  const report = summarizeAccountDeletionFenceLogs(
    [
      JSON.stringify({
        errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
        route: "/v1/sync",
        count: 2,
      }),
      JSON.stringify({
        errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
        route: "/v1/sync",
        count: 1,
      }),
    ].join("\n"),
  );
  assert.deepEqual(report.deletionFence, {
    eventCount: 2,
    rejectionCount: 3,
    routes: { "/v1/sync": 3 },
  });
  assert.equal(JSON.stringify(report).includes("raw-account-id"), false);
  assert.equal(JSON.stringify(report).includes("Bearer disposable-credential"), false);
  assert.equal(JSON.stringify(report).includes("database error text"), false);
});