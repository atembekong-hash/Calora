import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ACCOUNT_DELETION_FENCE_ERROR_CLASS,
  MONITOR_SCHEMA_VERSION,
  summarizeAccountDeletionFenceLogs,
} from "./monitor-account-deletion-fence.mjs";
import {
  ACCOUNT_DELETION_FENCE_MAX_COUNT,
  ACCOUNT_DELETION_FENCE_MAX_ROUTE_LENGTH,
  createAccountDeletionFenceSignal,
  parseAccountDeletionFenceSignal,
} from "../artifacts/api-server/src/lib/account-deletion-fence-schema.mjs";

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

test("adds only published attestation identity and a sanitized log run window", () => {
  const report = summarizeAccountDeletionFenceLogs(
    JSON.stringify({
      time: "2026-09-05T10:20:00.000Z",
      errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
      route: "/v1/sync",
      count: 1,
      accountId: "must-not-be-retained",
      rawLog: "must-not-be-retained",
    }),
    {
      releaseAttestation: {
        schemaVersion: "calora.release-attestation.v1",
        gitCommit: "a".repeat(40),
        sourceTree: "b".repeat(40),
        sourceDigest: "c".repeat(64),
        buildTimestamp: "2026-09-05T10:14:25.616Z",
        releaseId: "calora-api-aaaaaaaaaaaa-20260905101425616",
        credential: "must-not-be-retained",
      },
    },
  );

  assert.deepEqual(report.release, {
    source: "published-api-attestation",
    schemaVersion: "calora.release-attestation.v1",
    gitCommit: "a".repeat(40),
    sourceTree: "b".repeat(40),
    sourceDigest: "c".repeat(64),
    buildTimestamp: "2026-09-05T10:14:25.616Z",
    releaseId: "calora-api-aaaaaaaaaaaa-20260905101425616",
  });
  assert.deepEqual(report.runWindow, {
    startedAt: "2026-09-05T10:20:00.000Z",
    endedAt: "2026-09-05T10:20:00.000Z",
    source: "sanitized-log-record-timestamps",
  });
  assert.equal(JSON.stringify(report).includes("must-not-be-retained"), false);
});

test("accepts explicit bounded run windows without retaining log records", () => {
  const report = summarizeAccountDeletionFenceLogs(
    JSON.stringify({
      errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
      route: "/v1/sync",
      count: 1,
      message: "raw deployment record",
    }),
    {
      releaseAttestation: {
        schemaVersion: "calora.release-attestation.v1",
        gitCommit: "a".repeat(40),
        sourceTree: "b".repeat(40),
        sourceDigest: "c".repeat(64),
        buildTimestamp: "2026-09-05T10:14:25.616Z",
        releaseId: "calora-api-aaaaaaaaaaaa-20260905101425616",
      },
      runWindow: {
        startedAt: "2026-09-05T10:00:00Z",
        endedAt: "2026-09-05T10:30:00Z",
        source: "bounded-log-export",
      },
    },
  );

  assert.deepEqual(report.runWindow, {
    startedAt: "2026-09-05T10:00:00.000Z",
    endedAt: "2026-09-05T10:30:00.000Z",
    source: "bounded-log-export",
  });
  assert.equal(JSON.stringify(report).includes("raw deployment record"), false);
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

test("uses one shared fence schema for API construction and monitor parsing", () => {
  assert.deepEqual(createAccountDeletionFenceSignal("/v1/sync", 2), {
    errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
    route: "/v1/sync",
    count: 2,
  });
  assert.deepEqual(
    parseAccountDeletionFenceSignal({
      errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
      route: `/v1/${"a".repeat(ACCOUNT_DELETION_FENCE_MAX_ROUTE_LENGTH - 4)}`,
      count: ACCOUNT_DELETION_FENCE_MAX_COUNT,
      accountId: "must-not-be-retained",
    }),
    {
      errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
      route: `/v1/${"a".repeat(ACCOUNT_DELETION_FENCE_MAX_ROUTE_LENGTH - 4)}`,
      count: ACCOUNT_DELETION_FENCE_MAX_COUNT,
    },
  );
  assert.equal(
    parseAccountDeletionFenceSignal({
      errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
      route: "/v1/sync?unsafe=query",
      count: 1,
    }),
    null,
  );
  assert.throws(
    () => createAccountDeletionFenceSignal("/v1/sync", 0),
    /Invalid account-deletion fence signal/,
  );
});

const ACCOUNT_DELETION_FENCE_CALL_SITES = [
  {
    file: "capture.ts",
    invocation: 'accountDeletionFenceSignal("/v1/capture/analyze")',
    routes: ["/v1/capture/analyze"],
    countSource: "builder default count",
  },
  {
    file: "capture.ts",
    invocation: 'accountDeletionFenceSignal("/v1/capture/analyze")',
    routes: ["/v1/capture/analyze"],
    countSource: "builder default count",
  },
  {
    file: "capture.ts",
    invocation: 'accountDeletionFenceSignal("/v1/capture/analyze")',
    routes: ["/v1/capture/analyze"],
    countSource: "builder default count",
  },
  {
    file: "coachFactContext.ts",
    invocation: 'accountDeletionFenceSignal("/v1/coach/fact-context/respond")',
    routes: ["/v1/coach/fact-context/respond"],
    countSource: "builder default count",
  },
  {
    file: "diary.ts",
    invocation: 'accountDeletionFenceSignal("/v1/diary")',
    routes: ["/v1/diary"],
    countSource: "builder default count",
  },
  {
    file: "diary.ts",
    invocation: 'accountDeletionFenceSignal("/v1/diary/:entryId")',
    routes: ["/v1/diary/:entryId"],
    countSource: "builder default count",
  },
  {
    file: "diary.ts",
    invocation: 'accountDeletionFenceSignal("/v1/diary/first-log")',
    routes: ["/v1/diary/first-log"],
    countSource: "builder default count",
  },
  {
    file: "planner.ts",
    invocation: 'accountDeletionFenceSignal("/v1/planner/generate")',
    routes: ["/v1/planner/generate"],
    countSource: "builder default count",
  },
  {
    file: "premiumRecipes.ts",
    invocation: "accountDeletionFenceSignal(route)",
    routes: ["/v1/premium-recipes", "/v1/premium-recipes/:sourceId"],
    countSource: "builder default count",
  },
  {
    file: "recipes.ts",
    invocation: "accountDeletionFenceSignal(route)",
    routes: ["/v1/recipes/concepts", "/v1/recipes/generated"],
    countSource: "builder default count",
  },
  {
    file: "recipes.ts",
    invocation: 'accountDeletionFenceSignal("/v1/recipes/photo")',
    routes: ["/v1/recipes/photo"],
    countSource: "builder default count",
  },
  {
    file: "referral.ts",
    invocation: 'accountDeletionFenceSignal("/v1/referral")',
    routes: ["/v1/referral"],
    countSource: "builder default count",
  },
  {
    file: "referral.ts",
    invocation: 'accountDeletionFenceSignal("/v1/referral/redeem")',
    routes: ["/v1/referral/redeem"],
    countSource: "builder default count",
  },
  {
    file: "referral.ts",
    invocation: 'accountDeletionFenceSignal("/v1/referral/activate")',
    routes: ["/v1/referral/activate"],
    countSource: "builder default count",
  },
  {
    file: "restaurantFoods.ts",
    invocation: "accountDeletionFenceSignal(route)",
    routes: ["/v1/restaurant-foods", "/v1/restaurant-foods/:sourceId"],
    countSource: "builder default count",
  },
  {
    file: "sync.ts",
    invocation:
      'accountDeletionFenceSignal("/v1/sync", deletionFenceRejectionCount)',
    routes: ["/v1/sync"],
    countSource: "deletionFenceRejectionCount guarded by > 0",
  },
  {
    file: "sync.ts",
    invocation:
      'accountDeletionFenceSignal("/v1/sync", Math.max(1, deletionFenceRejectionCount))',
    routes: ["/v1/sync"],
    countSource: "Math.max(1, deletionFenceRejectionCount)",
  },
];

const DYNAMIC_ROUTE_EVIDENCE = [
  {
    file: "premiumRecipes.ts",
    sourcePattern:
      /const route = req\.params\.sourceId \? "\/v1\/premium-recipes\/:sourceId" : "\/v1\/premium-recipes";/,
  },
  {
    file: "recipes.ts",
    sourcePattern:
      /enforceRecipeGenLimit\("recipes-concepts", "\/v1\/recipes\/concepts"/,
  },
  {
    file: "recipes.ts",
    sourcePattern:
      /enforceRecipeGenLimit\("recipes-generated", "\/v1\/recipes\/generated"/,
  },
  {
    file: "restaurantFoods.ts",
    sourcePattern: /authorizeAndLimit\(req, "\/v1\/restaurant-foods"\)/,
  },
  {
    file: "restaurantFoods.ts",
    sourcePattern:
      /authorizeAndLimit\(req, "\/v1\/restaurant-foods\/:sourceId"\)/,
  },
];

test("keeps every API deletion-fence call site monitor-compatible", async () => {
  const routesDir = path.join(
    workspaceDir,
    "artifacts",
    "api-server",
    "src",
    "routes",
  );
  const stateSource = await readFile(
    path.join(
      workspaceDir,
      "artifacts",
      "api-server",
      "src",
      "lib",
      "account-deletion-state.ts",
    ),
    "utf8",
  );
  const routeEntries = await readdir(routesDir, { withFileTypes: true });
  const routeFiles = routeEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .sort((left, right) => left.name.localeCompare(right.name));
  const routeSources = await Promise.all(
    routeFiles.map(async (entry) => ({
      file: entry.name,
      source: await readFile(path.join(routesDir, entry.name), "utf8"),
    })),
  );

  assert.match(stateSource, /createAccountDeletionFenceSignal/);
  assert.match(
    stateSource,
    /account-deletion-fence-schema\.mjs/,
  );
  assert.doesNotMatch(
    stateSource,
    /ACCOUNT_DELETION_FENCE_ERROR_CLASS\s*=\s*"account_deletion_fence"/,
  );
  assert.match(
    stateSource,
    /accountDeletionFenceSignal\(\s*route:\s*string,\s*count\s*=\s*1/,
  );

  const actualCallSites = routeSources.flatMap(({ file, source }) =>
    source
      .split("\n")
      .map((line, lineNumber) => ({
        file,
        lineNumber,
        line: line.trim(),
      }))
      .filter(({ line }) => line.includes("accountDeletionFenceSignal("))
      .map(({ file, lineNumber, line }) => ({
        file,
        lineNumber,
        invocation: line
          .slice(line.indexOf("accountDeletionFenceSignal("))
          .replace(/,$/, ""),
      })),
  );
  assert.deepEqual(
    actualCallSites.map(({ file, invocation }) => ({ file, invocation })),
    ACCOUNT_DELETION_FENCE_CALL_SITES.map(({ file, invocation }) => ({
      file,
      invocation,
    })),
  );

  for (const callSite of ACCOUNT_DELETION_FENCE_CALL_SITES) {
    assert.ok(
      callSite.routes.length > 0,
      `${callSite.file} has no monitor routes`,
    );
    const callSiteReport = summarizeAccountDeletionFenceLogs(
      callSite.routes
        .map((route) =>
          JSON.stringify({
            errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
            route,
            count: 1,
          }),
        )
        .join("\n"),
    );
    assert.equal(
      callSiteReport.verified,
      true,
      `${callSite.file} has an unsafe route`,
    );
    assert.deepEqual(
      callSiteReport.deletionFence.routes,
      Object.fromEntries(callSite.routes.map((route) => [route, 1])),
      `${callSite.file} has an uncountable route`,
    );

    if (callSite.countSource === "builder default count") {
      assert.doesNotMatch(
        callSite.invocation,
        /,\s*/,
        `${callSite.file} does not use the positive builder default count`,
      );
    } else if (
      callSite.countSource === "deletionFenceRejectionCount guarded by > 0"
    ) {
      assert.equal(
        callSite.invocation,
        'accountDeletionFenceSignal("/v1/sync", deletionFenceRejectionCount)',
      );
    } else if (
      callSite.countSource === "Math.max(1, deletionFenceRejectionCount)"
    ) {
      assert.match(
        callSite.invocation,
        /Math\.max\(1,\s*deletionFenceRejectionCount\)\)$/,
      );
    } else {
      assert.fail(`unknown count source for ${callSite.file}`);
    }
  }

  for (const { file, sourcePattern } of DYNAMIC_ROUTE_EVIDENCE) {
    const source = routeSources.find((entry) => entry.file === file)?.source;
    assert.ok(source, `missing route source for ${file}`);
    assert.match(source, sourcePattern);
  }

  const routes = [
    ...new Set(
      ACCOUNT_DELETION_FENCE_CALL_SITES.flatMap(({ routes }) => routes),
    ),
  ];
  const report = summarizeAccountDeletionFenceLogs(
    routes
      .map((route) =>
        JSON.stringify({
          errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
          route,
          count: 1,
        }),
      )
      .join("\n"),
  );
  assert.equal(report.verified, true);
  assert.deepEqual(
    report.deletionFence.routes,
    Object.fromEntries(routes.map((route) => [route, 1])),
  );

  const syncSource =
    routeSources.find(({ file }) => file === "sync.ts")?.source ?? "";
  assert.match(
    syncSource,
    /if\s*\(\s*deletionFenceRejectionCount\s*>\s*0\s*\)/,
  );
  assert.match(
    syncSource,
    /accountDeletionFenceSignal\("\/v1\/sync",\s*Math\.max\(1,\s*deletionFenceRejectionCount\)\)/,
  );

  assert.equal(JSON.stringify(report).includes("raw-account-id"), false);
  assert.equal(
    JSON.stringify(report).includes("Bearer disposable-credential"),
    false,
  );
  assert.equal(JSON.stringify(report).includes("database error text"), false);
});
