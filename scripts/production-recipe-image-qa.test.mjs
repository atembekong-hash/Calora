import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  recoverProductionRecipeImageQa,
  runProductionRecipeImageQa,
} from "./production-recipe-image-qa.mjs";

const EXPECTED_COMMIT = "a".repeat(40);
const QA_RUN_ID = "1234567890";
const PREVIEW_URL =
  "https://storage.example/preview?capability=private-preview";

function makeEnv(overrides = {}) {
  return {
    CALORA_QA_RUN_CONFIRMATION: "RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA",
    CALORA_QA_API_BASE_URL: "https://mycaloraapp.com/api",
    CALORA_QA_SUPABASE_URL: "https://example.supabase.co",
    CALORA_QA_SUPABASE_ANON_KEY: "public-test-key",
    CALORA_QA_SUPABASE_SERVICE_ROLE_KEY: "service-test-key",
    CALORA_QA_TEST_PASSWORD: "test-password",
    CALORA_QA_RECIPE_PHOTO_ORIGIN: "https://storage.example",
    CALORA_QA_EXPECTED_COMMIT: EXPECTED_COMMIT,
    CALORA_QA_RUN_ID: QA_RUN_ID,
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

function assertHardenedRequest(init) {
  assert.equal(init.redirect, "error");
  assert.ok(init.signal instanceof AbortSignal);
}

function successFetch() {
  const calls = [];
  let signInCount = 0;
  let ownerDeleted = false;
  const deletedTokens = new Set();
  const fetchImpl = async (url, init = {}) => {
    assertHardenedRequest(init);
    calls.push({ url: String(url), init });
    const value = String(url);
    if (value.endsWith("/api/version"))
      return json(200, { gitCommit: EXPECTED_COMMIT });
    if (value.endsWith("/auth/v1/admin/users") && init.method === "POST") {
      return json(201, { id: `internal-id-${calls.length}` });
    }
    if (value.includes("/auth/v1/token?grant_type=password")) {
      signInCount += 1;
      return json(200, {
        access_token:
          signInCount === 1 ? "owner-access-token" : "other-access-token",
      });
    }
    if (value.endsWith("/api/v1/recipes/media") && init.method === "GET") {
      const bearer = init.headers?.Authorization;
      if (deletedTokens.has(bearer)) return json(401, {});
      return bearer === "Bearer owner-access-token"
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
          imageUrl: PREVIEW_URL,
        },
        { "cache-control": "private, no-store" },
      );
    }
    if (value === PREVIEW_URL) {
      if (ownerDeleted) return empty(404);
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
      if (init.headers?.Authorization === "Bearer owner-access-token") {
        ownerDeleted = true;
      }
      deletedTokens.add(init.headers?.Authorization);
      return json(200, { message: "deleted" });
    }
    throw new Error(`Unexpected request ${init.method ?? "GET"} ${value}`);
  };
  return { fetchImpl, calls };
}

function sensitiveValues() {
  return [
    "owner-access-token",
    "other-access-token",
    "service-test-key",
    "test-password",
    "internal-id",
    PREVIEW_URL,
    "capability=private-preview",
    QA_RUN_ID,
  ];
}

function assertSanitized(value) {
  const emitted = JSON.stringify(value);
  for (const sensitiveValue of sensitiveValues()) {
    assert.doesNotMatch(
      emitted,
      new RegExp(sensitiveValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
}

async function withCleanupFile(callback) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "calora-qa-recovery-"),
  );
  const cleanupFile = path.join(directory, "cleanup.json");
  try {
    await callback(cleanupFile);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("runs one private review-and-reject lifecycle through deletion sagas and emits only sanitized evidence", async () => {
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
  assert.equal(report.cleanup.postDeletePreviewImageStatus, 404);
  assert.equal(report.cleanup.postDeletePreviewImageUnavailable, true);
  assert.equal(report.cleanup.secondaryAccountDeletionTerminal, true);
  assert.equal(report.cleanup.secondaryPostDeleteMediaStatus, 401);
  assert.equal(report.cleanup.noDirectAdminDeletionAfterCaloraApiUse, true);
  assertSanitized(report);

  assert.equal(
    calls.filter((call) => String(call.url).endsWith("/api/v1/recipes/photo"))
      .length,
    1,
  );
  assert.equal(
    calls.filter((call) => String(call.url).endsWith("/api/v1/account")).length,
    2,
  );
  assert.equal(
    calls.filter(
      (call) =>
        String(call.url).includes("/auth/v1/admin/users/") &&
        call.init.method === "DELETE",
    ).length,
    0,
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
      assertHardenedRequest(init);
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

test("fails closed without following a credentialed Supabase redirect", async () => {
  const seen = [];
  const report = await runProductionRecipeImageQa({
    env: makeEnv(),
    fetchImpl: async (url, init = {}) => {
      seen.push({ url: String(url), init });
      assertHardenedRequest(init);
      if (String(url).endsWith("/api/version"))
        return json(200, { gitCommit: EXPECTED_COMMIT });
      if (String(url).endsWith("/auth/v1/admin/users")) {
        assert.equal(init.headers.apikey, "service-test-key");
        assert.equal(init.headers.Authorization, "Bearer service-test-key");
        return new Response(null, {
          status: 302,
          headers: { location: "https://untrusted.example/redirect" },
        });
      }
      throw new Error("redirect target must never be requested");
    },
  });

  assert.equal(report.result, "fail");
  assert.deepEqual(report.failure, {
    code: "qa_account_provision_failed",
    status: 302,
  });
  assert.equal(
    seen.some((call) => call.url.includes("untrusted.example")),
    false,
  );
  assertSanitized(report);
});

test("directly cleans a created owner if its normal sign-in fails before Calora API access", async () => {
  const calls = [];
  const report = await runProductionRecipeImageQa({
    env: makeEnv(),
    fetchImpl: async (url, init = {}) => {
      assertHardenedRequest(init);
      calls.push({ url: String(url), init });
      if (String(url).endsWith("/api/version"))
        return json(200, { gitCommit: EXPECTED_COMMIT });
      if (
        String(url).endsWith("/auth/v1/admin/users") &&
        init.method === "POST"
      )
        return json(201, { id: "owner-internal-id" });
      if (String(url).includes("/auth/v1/token?grant_type=password"))
        return json(500, { token: "must-not-report" });
      if (
        String(url).endsWith("/auth/v1/admin/users/owner-internal-id") &&
        init.method === "DELETE"
      )
        return empty(204);
      throw new Error("Unexpected request");
    },
  });

  assert.equal(report.result, "fail");
  assert.deepEqual(report.failure, {
    code: "qa_owner_sign_in_failed",
    status: 500,
  });
  assert.equal(
    calls.filter((call) =>
      call.url.endsWith("/auth/v1/admin/users/owner-internal-id"),
    ).length,
    1,
  );
  assert.equal(
    calls.some((call) => call.url.includes("/api/v1/recipes/")),
    false,
  );
  assertSanitized(report);
});

test("cleans both provisioned identities when secondary sign-in fails before Calora API access", async () => {
  const calls = [];
  let created = 0;
  let signIns = 0;
  const report = await runProductionRecipeImageQa({
    env: makeEnv(),
    fetchImpl: async (url, init = {}) => {
      assertHardenedRequest(init);
      calls.push({ url: String(url), init });
      const value = String(url);
      if (value.endsWith("/api/version"))
        return json(200, { gitCommit: EXPECTED_COMMIT });
      if (value.endsWith("/auth/v1/admin/users") && init.method === "POST") {
        created += 1;
        return json(201, {
          id: created === 1 ? "owner-internal-id" : "other-internal-id",
        });
      }
      if (value.includes("/auth/v1/token?grant_type=password")) {
        signIns += 1;
        return signIns === 1
          ? json(200, { access_token: "owner-access-token" })
          : json(500, { password: "must-not-report" });
      }
      if (
        (value.endsWith("/auth/v1/admin/users/owner-internal-id") ||
          value.endsWith("/auth/v1/admin/users/other-internal-id")) &&
        init.method === "DELETE"
      )
        return empty(204);
      throw new Error("Unexpected request");
    },
  });

  assert.equal(report.result, "fail");
  assert.deepEqual(report.failure, {
    code: "qa_other_sign_in_failed",
    status: 500,
  });
  assert.equal(
    calls.filter((call) => call.url.includes("/auth/v1/admin/users/")).length,
    2,
  );
  assert.equal(
    calls.some((call) => call.url.includes("/api/v1/recipes/")),
    false,
  );
  assertSanitized(report);
});

test("preserves a non-secret recovery record when an owner provisioning outcome is ambiguous", async () => {
  await withCleanupFile(async (cleanupFile) => {
    const report = await runProductionRecipeImageQa({
      env: makeEnv({ CALORA_QA_CLEANUP_FILE: cleanupFile }),
      fetchImpl: async (url, init = {}) => {
        assertHardenedRequest(init);
        if (String(url).endsWith("/api/version"))
          return json(200, { gitCommit: EXPECTED_COMMIT });
        if (String(url).endsWith("/auth/v1/admin/users")) {
          throw new Error(
            "simulated transport loss after an unknown provider outcome",
          );
        }
        throw new Error("Unexpected request");
      },
    });

    assert.equal(report.result, "fail");
    assert.deepEqual(report.failure, {
      code: "qa_admin_request_unavailable",
      status: null,
    });
    const envelope = JSON.parse(await readFile(cleanupFile, "utf8"));
    assert.deepEqual(envelope, {
      schemaVersion: "calora.production-recipe-image-qa.recovery.v3",
      runId: QA_RUN_ID,
      owner: {
        authUserId: "",
        provisioningMayHaveBeenCalled: true,
        caloraApiMayHaveBeenCalled: false,
      },
      other: {
        authUserId: "",
        provisioningMayHaveBeenCalled: false,
        caloraApiMayHaveBeenCalled: false,
      },
    });
    assert.doesNotMatch(
      JSON.stringify(envelope),
      /access-token|service-test-key|test-password/,
    );
    assertSanitized(report);
  });
});

test("keeps an interrupted cleanup envelope and attempts both account recoveries when owner cleanup is non-terminal", async () => {
  await withCleanupFile(async (cleanupFile) => {
    await writeFile(
      cleanupFile,
      JSON.stringify({
        schemaVersion: "calora.production-recipe-image-qa.recovery.v3",
        runId: QA_RUN_ID,
        owner: {
          authUserId: "owner-internal-id",
          provisioningMayHaveBeenCalled: true,
          caloraApiMayHaveBeenCalled: true,
        },
        other: {
          authUserId: "other-internal-id",
          provisioningMayHaveBeenCalled: true,
          caloraApiMayHaveBeenCalled: true,
        },
      }),
      { mode: 0o600 },
    );
    const calls = [];
    let signIns = 0;
    const report = await recoverProductionRecipeImageQa({
      env: makeEnv({ CALORA_QA_CLEANUP_FILE: cleanupFile }),
      fetchImpl: async (url, init = {}) => {
        assertHardenedRequest(init);
        calls.push({ url: String(url), init });
        const value = String(url);
        if (value.includes("/auth/v1/token?grant_type=password")) {
          signIns += 1;
          return json(200, {
            access_token:
              signIns === 1 ? "owner-access-token" : "other-access-token",
          });
        }
        if (value.endsWith("/api/v1/account") && init.method === "DELETE") {
          return init.headers.Authorization === "Bearer owner-access-token"
            ? json(502, { secret: "must-not-report" })
            : json(200, {});
        }
        if (value.endsWith("/api/v1/recipes/media") && init.method === "GET")
          return json(401, {});
        throw new Error("Unexpected recovery request");
      },
    });

    assert.deepEqual(report, {
      schemaVersion: "calora.production-recipe-image-qa-recovery.v3",
      result: "fail",
      failure: "account_cleanup_not_terminal",
    });
    assert.equal(
      calls.filter((call) => call.url.endsWith("/api/v1/account")).length,
      2,
    );
    assert.equal(
      calls.some(
        (call) =>
          call.url.endsWith("/api/v1/account") &&
          call.init.headers.Authorization === "Bearer other-access-token",
      ),
      true,
    );
    assert.equal(
      JSON.parse(await readFile(cleanupFile, "utf8")).runId,
      QA_RUN_ID,
    );
    assertSanitized(report);
  });
});

test("can recover a runner-loss QA lifecycle from a manually supplied run identifier without a bearer token", async () => {
  const calls = [];
  let signIns = 0;
  const report = await recoverProductionRecipeImageQa({
    env: makeEnv({
      CALORA_QA_CLEANUP_FILE: "",
      CALORA_QA_RECOVERY_RUN_ID: QA_RUN_ID,
    }),
    fetchImpl: async (url, init = {}) => {
      assertHardenedRequest(init);
      calls.push({ url: String(url), init });
      const value = String(url);
      if (value.includes("/auth/v1/token?grant_type=password")) {
        signIns += 1;
        return json(200, {
          access_token:
            signIns === 1 ? "owner-access-token" : "other-access-token",
        });
      }
      if (value.endsWith("/api/v1/account") && init.method === "DELETE")
        return json(200, {});
      if (value.endsWith("/api/v1/recipes/media") && init.method === "GET")
        return json(401, {});
      throw new Error("Unexpected recovery request");
    },
  });

  assert.deepEqual(report, {
    schemaVersion: "calora.production-recipe-image-qa-recovery.v3",
    result: "pass",
    failure: null,
  });
  assert.equal(
    calls.filter((call) => call.url.endsWith("/api/v1/account")).length,
    2,
  );
  assert.equal(
    calls.some((call) => String(call.url).includes("internal-id")),
    false,
  );
  assertSanitized(report);
});

test("workflow confines privileged values to trusted Node steps, retains protected-main checks, and uploads only sanitized reports", async () => {
  const workflow = await readFile(
    new URL(
      "../.github/workflows/production-recipe-image-qa.yml",
      import.meta.url,
    ),
    "utf8",
  );
  const jobPreamble =
    workflow.match(
      /environment: calora-production-recipe-image-qa\n([\s\S]*?)    steps:/,
    )?.[1] ?? "";
  assert.doesNotMatch(jobPreamble, /\$\{\{ secrets\./);
  assert.doesNotMatch(
    jobPreamble,
    /CALORA_QA_(SUPABASE_SERVICE_ROLE_KEY|TEST_PASSWORD)/,
  );
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /test "\$\{GITHUB_REF\}" = "refs\/heads\/main"/);
  assert.match(
    workflow,
    /test "\$\{CALORA_QA_EXPECTED_COMMIT\}" = "\$\{GITHUB_SHA\}"/,
  );
  assert.match(
    workflow,
    /Run one bounded private review and rejection lifecycle[\s\S]*?CALORA_QA_SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.CALORA_QA_SUPABASE_SERVICE_ROLE_KEY \}\}/,
  );
  assert.match(
    workflow,
    /Recover an interrupted disposable QA lifecycle[\s\S]*?CALORA_QA_SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.CALORA_QA_SUPABASE_SERVICE_ROLE_KEY \}\}/,
  );
  assert.doesNotMatch(
    workflow.match(/Upload sanitized QA evidence[\s\S]*/)?.[0] ?? "",
    /CALORA_QA_SUPABASE_SERVICE_ROLE_KEY|CALORA_QA_TEST_PASSWORD|\$\{\{ secrets\./,
  );
  assert.match(
    workflow,
    /node scripts\/production-recipe-image-qa\.mjs > "\$\{RUNNER_TEMP\}\/calora-production-recipe-image-qa\.json"/,
  );
  assert.match(
    workflow,
    /node scripts\/production-recipe-image-qa\.mjs --recover > "\$\{RUNNER_TEMP\}\/calora-production-recipe-image-qa-recovery\.json"/,
  );
  assert.doesNotMatch(workflow, /\| tee/);
  assert.match(
    workflow,
    /if \(!\["pass", "not_needed"\]\.includes\(recovery\.result\)\)/,
  );
  assert.match(workflow, /if-no-files-found: error/);
});

test("CLI failure output contains only a structured sanitized report", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/production-recipe-image-qa.mjs"],
    {
      cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        CALORA_QA_RUN_CONFIRMATION: "wrong-confirmation",
        CALORA_QA_SUPABASE_SERVICE_ROLE_KEY: "service-test-key",
        CALORA_QA_TEST_PASSWORD: "test-password",
        CALORA_QA_RUN_ID: QA_RUN_ID,
      },
    },
  );
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.stdout);
  assert.equal(report.result, "fail");
  assert.deepEqual(report.failure, {
    code: "production_confirmation_missing",
    status: null,
  });
  assertSanitized(report);
  assertSanitized({ stdout: result.stdout, stderr: result.stderr });
});
