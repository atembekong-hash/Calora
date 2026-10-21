import { randomUUID } from "node:crypto";
import { chmod, readFile, rm, writeFile } from "node:fs/promises";

const REQUIRED_CONFIRMATION = "RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA";
const QA_RECIPE_TITLE = "QA verification lemon herb chicken bowl";
const QA_RECIPE_DESCRIPTION =
  "Isolated production quality-assurance fixture. Do not publish.";

export class QaVerificationError extends Error {
  constructor(code, status = null) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function nowIso(now) {
  return new Date(now()).toISOString();
}

function elapsedMs(now, startedAt) {
  return Math.max(0, now() - startedAt);
}

function expect(condition, code, status = null) {
  if (!condition) throw new QaVerificationError(code, status);
}

function getRequiredEnv(env, name) {
  const value = env[name]?.trim();
  expect(Boolean(value), "missing_required_configuration");
  return value;
}

function normalizeApiBaseUrl(value) {
  const url = new URL(value);
  expect(
    url.protocol === "https:" &&
      url.hostname === "mycaloraapp.com" &&
      url.pathname === "/api",
    "invalid_api_target",
  );
  return url.toString().replace(/\/$/, "");
}

function normalizeSupabaseUrl(value) {
  const url = new URL(value);
  expect(
    url.protocol === "https:" && url.hostname.endsWith(".supabase.co"),
    "invalid_supabase_target",
  );
  return url.toString().replace(/\/$/, "");
}

function responseCacheIsPrivateNoStore(response) {
  const cacheControl =
    response.headers.get("cache-control")?.toLowerCase() ?? "";
  return cacheControl.includes("private") && cacheControl.includes("no-store");
}

async function parseJson(response, code) {
  try {
    return await response.json();
  } catch {
    throw new QaVerificationError(code, response.status);
  }
}

async function request(fetchImpl, url, init, now) {
  const startedAt = now();
  const response = await fetchImpl(url, init);
  return { response, latencyMs: elapsedMs(now, startedAt) };
}

function newReport(now) {
  return {
    schemaVersion: "calora.production-recipe-image-qa.v1",
    startedAt: nowIso(now),
    result: "fail",
    release: {
      versionStatus: null,
      expectedCommitMatched: false,
    },
    authentication: {
      initialMediaStatus: null,
      initialMediaEmpty: false,
      anonymousPreviewStatus: null,
      anonymousPreviewDenied: false,
      crossAccountPreviewStatus: null,
      crossAccountIsolation: false,
    },
    media: {
      createStatus: null,
      createLatencyMs: null,
      terminalStoredNeedsReview: false,
      createReturnedLocator: false,
      reviewPreviewStatus: null,
      reviewPreviewLatencyMs: null,
      reviewPreviewPrivateNoStore: false,
      reviewPreviewLocatorPresent: false,
      previewImageStatus: null,
      previewImageContentTypeIsImage: false,
      rejectionStatus: null,
      rejectionTerminal: false,
      postRejectionStatus: null,
      postRejectionTerminal: false,
      postRejectionPrivateNoStore: false,
      semanticReview: "not_automated_media_rejected_not_published",
    },
    cleanup: {
      accountDeleteStatus: null,
      postDeleteMediaStatus: null,
      accountDeletionTerminal: false,
      noDirectAdminDeletionAfterMediaAttempt: true,
    },
    failure: null,
    completedAt: null,
    durationMs: null,
  };
}

async function adminRequest(
  fetchImpl,
  supabaseUrl,
  serviceRoleKey,
  path,
  init = {},
) {
  return fetchImpl(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function deleteAuthIdentityIfNoMediaWasAttempted({
  fetchImpl,
  supabaseUrl,
  serviceRoleKey,
  authUserId,
}) {
  if (!authUserId) return null;
  const response = await adminRequest(
    fetchImpl,
    supabaseUrl,
    serviceRoleKey,
    `/auth/v1/admin/users/${authUserId}`,
    {
      method: "DELETE",
    },
  );
  return response.status;
}

function cleanupFileFromEnv(env) {
  const value = env.CALORA_QA_CLEANUP_FILE?.trim();
  return value || null;
}

async function persistRecoveryEnvelope(filePath, envelope) {
  if (!filePath) return;
  await writeFile(filePath, JSON.stringify(envelope), {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(filePath, 0o600);
}

async function removeRecoveryEnvelope(filePath) {
  if (filePath) await rm(filePath, { force: true });
}

function validEnvelope(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof value.ownerAuthUserId === "string" &&
    typeof value.ownerAccessToken === "string" &&
    typeof value.ownerMediaAttempted === "boolean" &&
    typeof value.secondAuthUserId === "string"
  );
}

/**
 * Runs exactly one production QA image lifecycle against the expected deployed
 * release. It returns only sanitized facts; account identity, bearer tokens,
 * signed locators, request identifiers, recipe payloads, and image bytes stay
 * in process memory and are never included in the return value.
 */
export async function runProductionRecipeImageQa({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = Date.now,
} = {}) {
  const report = newReport(now);
  const startedAt = now();
  let authUserId = "";
  let secondAuthUserId = "";
  let accessToken = "";
  let secondAccessToken = "";
  let photoAttempted = false;
  let accountDeleteAttempted = false;
  let ownerCleanupTerminal = false;
  let secondCleanupTerminal = false;
  const cleanupFile = cleanupFileFromEnv(env);
  const recoveryEnvelope = {
    ownerAuthUserId: "",
    ownerAccessToken: "",
    ownerMediaAttempted: false,
    secondAuthUserId: "",
  };

  try {
    expect(
      env.CALORA_QA_RUN_CONFIRMATION === REQUIRED_CONFIRMATION,
      "production_confirmation_missing",
    );
    expect(typeof fetchImpl === "function", "fetch_unavailable");

    const apiBaseUrl = normalizeApiBaseUrl(
      getRequiredEnv(env, "CALORA_QA_API_BASE_URL"),
    );
    const supabaseUrl = normalizeSupabaseUrl(
      getRequiredEnv(env, "CALORA_QA_SUPABASE_URL"),
    );
    const anonKey = getRequiredEnv(env, "CALORA_QA_SUPABASE_ANON_KEY");
    const serviceRoleKey = getRequiredEnv(
      env,
      "CALORA_QA_SUPABASE_SERVICE_ROLE_KEY",
    );
    const testPassword = getRequiredEnv(env, "CALORA_QA_TEST_PASSWORD");
    const expectedCommit = getRequiredEnv(
      env,
      "CALORA_QA_EXPECTED_COMMIT",
    ).toLowerCase();
    expect(/^[0-9a-f]{40}$/.test(expectedCommit), "invalid_expected_commit");

    const version = await request(
      fetchImpl,
      `${apiBaseUrl}/version`,
      { headers: { Accept: "application/json" } },
      now,
    );
    report.release.versionStatus = version.response.status;
    expect(
      version.response.status === 200,
      "release_version_unavailable",
      version.response.status,
    );
    const versionBody = await parseJson(
      version.response,
      "release_version_unparseable",
    );
    report.release.expectedCommitMatched =
      String(versionBody.gitCommit ?? "").toLowerCase() === expectedCommit;
    expect(report.release.expectedCommitMatched, "unexpected_live_release");

    const runId = randomUUID();
    const provisionAndSignIn = async (role) => {
      const email = `qa-recipe-image-${role}-${randomUUID().replaceAll("-", "")}@qa.invalid`;
      const created = await adminRequest(
        fetchImpl,
        supabaseUrl,
        serviceRoleKey,
        "/auth/v1/admin/users",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password: testPassword,
            email_confirm: true,
            user_metadata: {
              qa_purpose: "production_recipe_image_verification",
              qa_role: role,
              qa_run: runId,
              qa_expires_at: new Date(now() + 60 * 60 * 1000).toISOString(),
            },
          }),
        },
      );
      expect(
        created.status === 200 || created.status === 201,
        "qa_account_provision_failed",
        created.status,
      );
      const createdBody = await parseJson(
        created,
        "qa_account_provision_unparseable",
      );
      const authId = typeof createdBody.id === "string" ? createdBody.id : "";
      expect(Boolean(authId), "qa_account_missing_identifier");

      const signIn = await request(
        fetchImpl,
        `${supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            apikey: anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password: testPassword }),
        },
        now,
      );
      expect(
        signIn.response.status === 200,
        "qa_sign_in_failed",
        signIn.response.status,
      );
      const signInBody = await parseJson(
        signIn.response,
        "qa_sign_in_unparseable",
      );
      const token =
        typeof signInBody.access_token === "string"
          ? signInBody.access_token
          : "";
      expect(Boolean(token), "qa_access_token_missing");
      return { authId, token };
    };

    ({ authId: authUserId, token: accessToken } =
      await provisionAndSignIn("owner"));
    recoveryEnvelope.ownerAuthUserId = authUserId;
    recoveryEnvelope.ownerAccessToken = accessToken;
    await persistRecoveryEnvelope(cleanupFile, recoveryEnvelope);
    ({ authId: secondAuthUserId, token: secondAccessToken } =
      await provisionAndSignIn("other"));
    recoveryEnvelope.secondAuthUserId = secondAuthUserId;
    await persistRecoveryEnvelope(cleanupFile, recoveryEnvelope);

    const authorizedJson = (method, path, body) =>
      request(
        fetchImpl,
        `${apiBaseUrl}${path}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            ...(body === undefined
              ? {}
              : { "Content-Type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
        now,
      );

    const initialMedia = await authorizedJson("GET", "/v1/recipes/media");
    report.authentication.initialMediaStatus = initialMedia.response.status;
    expect(
      initialMedia.response.status === 200,
      "initial_media_scope_unavailable",
      initialMedia.response.status,
    );
    const initialMediaBody = await parseJson(
      initialMedia.response,
      "initial_media_scope_unparseable",
    );
    report.authentication.initialMediaEmpty =
      Array.isArray(initialMediaBody.media) &&
      initialMediaBody.media.length === 0;
    expect(report.authentication.initialMediaEmpty, "qa_account_not_empty");

    photoAttempted = true;
    recoveryEnvelope.ownerMediaAttempted = true;
    await persistRecoveryEnvelope(cleanupFile, recoveryEnvelope);
    const createdPhoto = await authorizedJson("POST", "/v1/recipes/photo", {
      clientRecipeId: `qa-recipe-${runId}`,
      title: QA_RECIPE_TITLE,
      description: QA_RECIPE_DESCRIPTION,
      ingredients: ["1 chicken breast", "1 lemon", "1 teaspoon dried herbs"],
      instructions: [
        "Season the chicken with herbs.",
        "Cook the chicken until done.",
        "Finish with lemon and serve.",
      ],
      mealType: "dinner",
    });
    report.media.createStatus = createdPhoto.response.status;
    report.media.createLatencyMs = createdPhoto.latencyMs;
    expect(
      createdPhoto.response.status === 200,
      "photo_generation_not_terminal",
      createdPhoto.response.status,
    );
    const createdPhotoBody = await parseJson(
      createdPhoto.response,
      "photo_generation_unparseable",
    );
    const mediaId =
      typeof createdPhotoBody.mediaId === "string"
        ? createdPhotoBody.mediaId
        : "";
    report.media.terminalStoredNeedsReview =
      createdPhotoBody.status === "stored" &&
      createdPhotoBody.semanticReviewState === "needs_review";
    report.media.createReturnedLocator = Boolean(createdPhotoBody.imageUrl);
    expect(Boolean(mediaId), "photo_generation_missing_media_reference");
    expect(
      report.media.terminalStoredNeedsReview,
      "photo_generation_wrong_terminal_state",
    );
    expect(
      !report.media.createReturnedLocator,
      "photo_generation_exposed_unreviewed_locator",
    );

    const reviewPreview = await authorizedJson(
      "GET",
      `/v1/recipes/media/${mediaId}/review-preview`,
    );
    report.media.reviewPreviewStatus = reviewPreview.response.status;
    report.media.reviewPreviewLatencyMs = reviewPreview.latencyMs;
    report.media.reviewPreviewPrivateNoStore = responseCacheIsPrivateNoStore(
      reviewPreview.response,
    );
    expect(
      reviewPreview.response.status === 200,
      "review_preview_unavailable",
      reviewPreview.response.status,
    );
    const reviewPreviewBody = await parseJson(
      reviewPreview.response,
      "review_preview_unparseable",
    );
    const previewUrl =
      typeof reviewPreviewBody.imageUrl === "string"
        ? reviewPreviewBody.imageUrl
        : "";
    report.media.reviewPreviewLocatorPresent = Boolean(previewUrl);
    expect(
      reviewPreviewBody.status === "stored" &&
        reviewPreviewBody.semanticReviewState === "needs_review",
      "review_preview_wrong_state",
    );
    expect(
      report.media.reviewPreviewPrivateNoStore &&
        report.media.reviewPreviewLocatorPresent,
      "review_preview_not_private",
    );

    const anonymousPreview = await request(
      fetchImpl,
      `${apiBaseUrl}/v1/recipes/media/${mediaId}/review-preview`,
      {
        headers: { Accept: "application/json" },
      },
      now,
    );
    report.authentication.anonymousPreviewStatus =
      anonymousPreview.response.status;
    report.authentication.anonymousPreviewDenied =
      anonymousPreview.response.status === 401;
    expect(
      report.authentication.anonymousPreviewDenied,
      "anonymous_preview_not_denied",
      anonymousPreview.response.status,
    );

    const crossAccountPreview = await request(
      fetchImpl,
      `${apiBaseUrl}/v1/recipes/media/${mediaId}/review-preview`,
      {
        headers: {
          Authorization: `Bearer ${secondAccessToken}`,
          Accept: "application/json",
        },
      },
      now,
    );
    report.authentication.crossAccountPreviewStatus =
      crossAccountPreview.response.status;
    report.authentication.crossAccountIsolation =
      crossAccountPreview.response.status === 404;
    expect(
      report.authentication.crossAccountIsolation,
      "cross_account_preview_not_denied",
      crossAccountPreview.response.status,
    );

    const previewImage = await request(
      fetchImpl,
      previewUrl,
      { headers: { Accept: "image/*" } },
      now,
    );
    report.media.previewImageStatus = previewImage.response.status;
    report.media.previewImageContentTypeIsImage = (
      previewImage.response.headers.get("content-type") ?? ""
    )
      .toLowerCase()
      .startsWith("image/");
    expect(
      previewImage.response.status === 200 &&
        report.media.previewImageContentTypeIsImage,
      "review_preview_image_unavailable",
      previewImage.response.status,
    );

    const rejected = await authorizedJson(
      "POST",
      `/v1/recipes/media/${mediaId}/review`,
      { reviewState: "rejected" },
    );
    report.media.rejectionStatus = rejected.response.status;
    expect(
      rejected.response.status === 200,
      "review_rejection_failed",
      rejected.response.status,
    );
    const rejectedBody = await parseJson(
      rejected.response,
      "review_rejection_unparseable",
    );
    report.media.rejectionTerminal =
      rejectedBody.status === "stored" &&
      rejectedBody.semanticReviewState === "rejected";
    expect(
      report.media.rejectionTerminal,
      "review_rejection_wrong_terminal_state",
    );

    const postRejection = await authorizedJson(
      "GET",
      `/v1/recipes/media/${mediaId}`,
    );
    report.media.postRejectionStatus = postRejection.response.status;
    report.media.postRejectionPrivateNoStore = responseCacheIsPrivateNoStore(
      postRejection.response,
    );
    expect(
      postRejection.response.status === 200,
      "post_rejection_status_unavailable",
      postRejection.response.status,
    );
    const postRejectionBody = await parseJson(
      postRejection.response,
      "post_rejection_status_unparseable",
    );
    report.media.postRejectionTerminal =
      postRejectionBody.status === "stored" &&
      postRejectionBody.semanticReviewState === "rejected" &&
      !postRejectionBody.imageUrl;
    expect(
      report.media.postRejectionTerminal &&
        report.media.postRejectionPrivateNoStore,
      "post_rejection_state_not_private_terminal",
    );

    accountDeleteAttempted = true;
    const deleted = await authorizedJson("DELETE", "/v1/account");
    report.cleanup.accountDeleteStatus = deleted.response.status;
    report.cleanup.accountDeletionTerminal = deleted.response.status === 200;
    ownerCleanupTerminal = report.cleanup.accountDeletionTerminal;
    expect(
      report.cleanup.accountDeletionTerminal,
      "account_cleanup_not_terminal",
      deleted.response.status,
    );

    const postDeleteMedia = await authorizedJson("GET", "/v1/recipes/media");
    report.cleanup.postDeleteMediaStatus = postDeleteMedia.response.status;
    expect(
      postDeleteMedia.response.status === 401,
      "deleted_account_still_authorized",
      postDeleteMedia.response.status,
    );

    report.result = "pass";
  } catch (error) {
    report.failure = {
      code:
        error instanceof QaVerificationError
          ? error.code
          : "unexpected_runner_failure",
      status: error instanceof QaVerificationError ? error.status : null,
    };
  } finally {
    if (accessToken && !accountDeleteAttempted) {
      try {
        const cleanup = await request(
          fetchImpl,
          `${normalizeApiBaseUrl(env.CALORA_QA_API_BASE_URL)}/v1/account`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          },
          now,
        );
        report.cleanup.accountDeleteStatus = cleanup.response.status;
        report.cleanup.accountDeletionTerminal =
          cleanup.response.status === 200;
        ownerCleanupTerminal = report.cleanup.accountDeletionTerminal;
      } catch {
        report.cleanup.accountDeletionTerminal = false;
      }
    } else if (authUserId && !photoAttempted) {
      try {
        // No media-capable API call was reached, so a server-side Auth cleanup
        // cannot orphan generated media. Once photoAttempted is true, only the
        // owner-scoped account deletion saga is allowed to remove the account.
        const ownerDeleteStatus = await deleteAuthIdentityIfNoMediaWasAttempted(
          {
            fetchImpl,
            supabaseUrl: normalizeSupabaseUrl(env.CALORA_QA_SUPABASE_URL),
            serviceRoleKey: env.CALORA_QA_SUPABASE_SERVICE_ROLE_KEY,
            authUserId,
          },
        );
        ownerCleanupTerminal = [200, 204].includes(ownerDeleteStatus);
      } catch {
        // The report deliberately keeps this as a generic failure; no identity
        // or provider response is emitted to logs.
      }
    }
    if (secondAuthUserId) {
      try {
        const secondDeleteStatus =
          await deleteAuthIdentityIfNoMediaWasAttempted({
            fetchImpl,
            supabaseUrl: normalizeSupabaseUrl(env.CALORA_QA_SUPABASE_URL),
            serviceRoleKey: env.CALORA_QA_SUPABASE_SERVICE_ROLE_KEY,
            authUserId: secondAuthUserId,
          });
        if (![200, 204].includes(secondDeleteStatus)) {
          report.result = "fail";
          report.failure ??= {
            code: "secondary_qa_cleanup_not_terminal",
            status: secondDeleteStatus,
          };
        } else {
          secondCleanupTerminal = true;
        }
      } catch {
        // The secondary account never receives a media-generation capability.
        // Keep failure reporting generic and never emit its identity.
        report.result = "fail";
        report.failure ??= {
          code: "secondary_qa_cleanup_not_terminal",
          status: null,
        };
      }
    } else {
      secondCleanupTerminal = true;
    }
    if (ownerCleanupTerminal && secondCleanupTerminal) {
      await removeRecoveryEnvelope(cleanupFile);
    }
    report.completedAt = nowIso(now);
    report.durationMs = elapsedMs(now, startedAt);
  }

  return report;
}

export async function recoverProductionRecipeImageQa({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const filePath = cleanupFileFromEnv(env);
  const result = {
    schemaVersion: "calora.production-recipe-image-qa-recovery.v1",
    result: "not_needed",
    failure: null,
  };
  if (!filePath) return result;

  let envelope;
  try {
    envelope = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return result;
  }
  if (!validEnvelope(envelope)) {
    return { ...result, result: "fail", failure: "invalid_recovery_envelope" };
  }

  try {
    expect(
      env.CALORA_QA_RUN_CONFIRMATION === REQUIRED_CONFIRMATION,
      "production_confirmation_missing",
    );
    const apiBaseUrl = normalizeApiBaseUrl(
      getRequiredEnv(env, "CALORA_QA_API_BASE_URL"),
    );
    const supabaseUrl = normalizeSupabaseUrl(
      getRequiredEnv(env, "CALORA_QA_SUPABASE_URL"),
    );
    const serviceRoleKey = getRequiredEnv(
      env,
      "CALORA_QA_SUPABASE_SERVICE_ROLE_KEY",
    );
    if (envelope.ownerMediaAttempted) {
      expect(
        Boolean(envelope.ownerAccessToken),
        "recovery_owner_token_missing",
      );
      const response = await fetchImpl(`${apiBaseUrl}/v1/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${envelope.ownerAccessToken}`,
          Accept: "application/json",
        },
      });
      expect(
        response.status === 200,
        "recovery_account_cleanup_not_terminal",
        response.status,
      );
    } else if (envelope.ownerAuthUserId) {
      const status = await deleteAuthIdentityIfNoMediaWasAttempted({
        fetchImpl,
        supabaseUrl,
        serviceRoleKey,
        authUserId: envelope.ownerAuthUserId,
      });
      expect(
        [200, 204].includes(status),
        "recovery_owner_auth_cleanup_failed",
        status,
      );
    }
    if (envelope.secondAuthUserId) {
      const status = await deleteAuthIdentityIfNoMediaWasAttempted({
        fetchImpl,
        supabaseUrl,
        serviceRoleKey,
        authUserId: envelope.secondAuthUserId,
      });
      expect(
        [200, 204].includes(status),
        "recovery_secondary_auth_cleanup_failed",
        status,
      );
    }
    await removeRecoveryEnvelope(filePath);
    return { ...result, result: "pass" };
  } catch (error) {
    return {
      ...result,
      result: "fail",
      failure:
        error instanceof QaVerificationError
          ? error.code
          : "unexpected_recovery_failure",
    };
  }
}

async function main() {
  const report =
    process.argv[2] === "--recover"
      ? await recoverProductionRecipeImageQa()
      : await runProductionRecipeImageQa();
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (report.result === "fail") process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
