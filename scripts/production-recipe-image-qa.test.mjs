import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  recoverProductionRecipeImageQa,
  runProductionRecipeImageQa,
} from "./production-recipe-image-qa.mjs";

const EXPECTED_COMMIT = "a".repeat(40);

function makeEnv(overrides = {}) {
  return {
    CALORA_QA_RUN_CONFIRMATION: "RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA",
    CALORA_QA_API_BASE_URL: "https://mycaloraapp.com/api",
    CALORA_QA_SUPABASE_URL: "https://example.supabase.co",
    CALORA_QA_SUPABASE_ANON_KEY: "public-test-key",
    CALORA_QA_SUPABASE_SERVICE_ROLE_KEY: "service-test-key",
    CALORA_QA_TEST_PASSWORD: "test-password",
    CALORA_QA_EXPECTED_COMMIT: EXPECTED_COMMIT,
    ...overrides,
  };
}

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function empty(status, headers = {}) {
  return new Response(null, { status, headers });
}

function successFetch() {
  const calls = [];
  let signInCount = 0;
  let ownerDeleted = false;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    const value = String(url);
    if (value.endsWith("/api/version"))
      return json(200, { gitCommit: EXPECTED_COMMIT });
    if (value.endsWith("/auth/v1/admin/users") && init.method === "POST") {
      return json(201, { id: `internal-id-${calls.length}` });
    }
    if (value.includes("/auth/v1/token?grant_type=password")) {
      signInCount += 1;
      return json(200, {
        access_token: signInCount === 1 ? "access-token" : "other-access-token",
      });
    }
    if (value.endsWith("/api/v1/recipes/media") && init.method === "GET") {
      const bearer = init.headers?.Authorization;
      return bearer === "Bearer access-token" && !ownerDeleted
        ? json(200, { media: [] }, { "cache-control": "private, no-store" })
        : json(401, {});
    }
    if (value.endsWith("/api/v1/recipes/photo")) {
      return json(200, {
        mediaId: "media-id",
        status: "stored",
        semanticReviewState: "needs_review",
      });
    }
    if (value.endsWith("/review-preview") && !init.headers?.Authorization)
      return json(401, {});
    if (
      value.endsWith("/review-preview") &&
      init.headers?.Authorization === "Bearer other-access-token"
    ) {
      return json(404, {});
    }
    if (value.endsWith("/review-preview")) {
      return json(
        200,
        {
          status: "stored",
          semanticReviewState: "needs_review",
          imageUrl: "https://private.example/preview",
        },
        { "cache-control": "private, no-store" },
      );
    }
    if (value === "https://private.example/preview") {
      return new Response("image-bytes", {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    }
    if (value.endsWith("/review"))
      return json(200, { status: "stored", semanticReviewState: "rejected" });
    if (value.endsWith("/api/v1/recipes/media/media-id")) {
      return json(
        200,
        { status: "stored", semanticReviewState: "rejected" },
        { "cache-control": "private, no-store" },
      );
    }
    if (value.endsWith("/api/v1/account") && init.method === "DELETE") {
      ownerDeleted = true;
      return json(200, { message: "deleted" });
    }
    if (value.includes("/auth/v1/admin/users/") && init.method === "DELETE")
      return empty(204);
    throw new Error(`Unexpected request ${init.method ?? "GET"} ${value}`);
  };
  return { fetchImpl, calls };
}

test("runs one private review-and-reject lifecycle and emits only sanitized evidence", async () => {
  const { fetchImpl, calls } = successFetch();
  const report = await runProductionRecipeImageQa({
    env: makeEnv(),
    fetchImpl,
    now: () => 1_700_000_000_000,
  });

  assert.equal(report.result, "pass");
  assert.equal(report.release.expectedCommitMatched, true);
  assert.equal(report.authentication.initialMediaEmpty, true);
  assert.equal(report.authentication.anonymousPreviewDenied, true);
  assert.equal(report.authentication.crossAccountIsolation, true);
  assert.equal(report.media.terminalStoredNeedsReview, true);
  assert.equal(report.media.createReturnedLocator, false);
  assert.equal(report.media.reviewPreviewPrivateNoStore, true);
  assert.equal(report.media.rejectionTerminal, true);
  assert.equal(report.media.postRejectionTerminal, true);
  assert.equal(report.cleanup.accountDeletionTerminal, true);
  assert.equal(report.cleanup.postDeleteMediaStatus, 401);

  const emitted = JSON.stringify(report);
  for (const sensitiveValue of [
    "access-token",
    "service-test-key",
    "test-password",
    "internal-id",
    "https://private.example/preview",
  ]) {
    assert.doesNotMatch(
      emitted,
      new RegExp(sensitiveValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
  assert.equal(
    calls.filter((call) => String(call.url).endsWith("/api/v1/recipes/photo"))
      .length,
    1,
  );
  assert.equal(
    calls.filter((call) => String(call.url).endsWith("/api/v1/account")).length,
    1,
  );
});

test("fails before account creation without the explicit production confirmation", async () => {
  let called = false;
  const report = await runProductionRecipeImageQa({
    env: makeEnv({ CALORA_QA_RUN_CONFIRMATION: "" }),
    fetchImpl: async () => {
      called = true;
      throw new Error("must not call");
    },
  });

  assert.equal(called, false);
  assert.equal(report.result, "fail");
  assert.deepEqual(report.failure, {
    code: "production_confirmation_missing",
    status: null,
  });
});

test("refuses a stale deployment before it can provision a disposable account", async () => {
  let createAttempted = false;
  const report = await runProductionRecipeImageQa({
    env: makeEnv(),
    fetchImpl: async (url, init = {}) => {
      if (String(url).endsWith("/api/version"))
        return json(200, { gitCommit: "b".repeat(40) });
      if (
        String(url).endsWith("/auth/v1/admin/users") &&
        init.method === "POST"
      )
        createAttempted = true;
      throw new Error("stale release must stop before provisioning");
    },
  });

  assert.equal(createAttempted, false);
  assert.equal(report.result, "fail");
  assert.deepEqual(report.failure, {
    code: "unexpected_live_release",
    status: null,
  });
});

test("recovers an interrupted media-owning QA account through the account deletion saga", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "calora-qa-recovery-"),
  );
  const cleanupFile = path.join(directory, "cleanup.json");
  await writeFile(
    cleanupFile,
    JSON.stringify({
      ownerAuthUserId: "owner-internal-id",
      ownerAccessToken: "owner-access-token",
      ownerMediaAttempted: true,
      secondAuthUserId: "second-internal-id",
    }),
  );
  const calls = [];
  try {
    const report = await recoverProductionRecipeImageQa({
      env: makeEnv({ CALORA_QA_CLEANUP_FILE: cleanupFile }),
      fetchImpl: async (url, init = {}) => {
        calls.push({ url: String(url), init });
        if (String(url).endsWith("/api/v1/account") && init.method === "DELETE")
          return json(200, { message: "deleted" });
        if (
          String(url).includes("/auth/v1/admin/users/") &&
          init.method === "DELETE"
        )
          return empty(204);
        throw new Error(
          `Unexpected recovery request ${init.method ?? "GET"} ${url}`,
        );
      },
    });
    assert.deepEqual(report, {
      schemaVersion: "calora.production-recipe-image-qa-recovery.v1",
      result: "pass",
      failure: null,
    });
    await assert.rejects(() => readFile(cleanupFile, "utf8"));
    assert.equal(
      calls.filter((call) => call.url.endsWith("/api/v1/account")).length,
      1,
    );
    assert.equal(
      calls.filter((call) => call.url.includes("/auth/v1/admin/users/")).length,
      1,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("defines the runner temporary cleanup envelope only at step scope", async () => {
  const workflow = await readFile(
    new URL(
      "../.github/workflows/production-recipe-image-qa.yml",
      import.meta.url,
    ),
    "utf8",
  );
  const jobEnvironment =
    workflow.match(
      /environment: calora-production-recipe-image-qa\n    env:\n([\s\S]*?)    steps:/,
    )?.[1] ?? "";
  assert.doesNotMatch(jobEnvironment, /runner\.temp/);
  assert.match(
    workflow,
    /Run one bounded private review and rejection lifecycle\n        id: qa\n        continue-on-error: true\n        env:\n          CALORA_QA_CLEANUP_FILE: \$\{\{ runner\.temp \}\}/,
  );
  assert.match(
    workflow,
    /Recover an interrupted disposable QA lifecycle\n        if: always\(\)\n        env:\n          CALORA_QA_CLEANUP_FILE: \$\{\{ runner\.temp \}\}/,
  );
});
