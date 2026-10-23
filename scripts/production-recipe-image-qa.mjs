import { chmod, readFile, rm, writeFile } from "node:fs/promises";

const REQUIRED_CONFIRMATION = "RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA";
const QA_RECIPE_TITLE = "QA verification lemon herb chicken bowl";
const QA_RECIPE_DESCRIPTION =
  "Isolated production quality-assurance fixture. Do not publish.";
const NETWORK_TIMEOUT_MS = 30_000;
const RECOVERY_ENVELOPE_SCHEMA =
  "calora.production-recipe-image-qa.recovery.v3";

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

function qaRunId(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  expect(/^[0-9]{1,20}$/.test(normalized), "invalid_qa_run_identifier");
  return normalized;
}

function qaEmail(runId, role) {
  expect(["owner", "other"].includes(role), "invalid_qa_role");
  return `qa-recipe-image-${role}-${runId}@qa.invalid`;
}

function normalizeApiBaseUrl(value) {
  const url = new URL(value);
  expect(
    url.protocol === "https:" &&
      url.hostname === "mycaloraapp.com" &&
      url.pathname === "/api" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash,
    "invalid_api_target",
  );
  return url.toString().replace(/\/$/, "");
}

function normalizeSupabaseUrl(value) {
  const url = new URL(value);
  expect(
    url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/",
    "invalid_supabase_target",
  );
  return url.origin;
}

function normalizeRecipePhotoOrigin(value) {
  const url = new URL(value);
  expect(
    url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/",
    "invalid_recipe_photo_origin",
  );
  return url.origin;
}

function normalizeReviewPreviewUrl(value, trustedOrigin) {
  const url = new URL(value);
  expect(
    url.protocol === "https:" &&
      url.origin === trustedOrigin &&
      !url.username &&
      !url.password &&
      !url.hash,
    "invalid_review_preview_locator",
  );
  return url.toString();
}

function responseCacheIsPrivateNoStore(response) {
  const cacheControl =
    response.headers.get("cache-control")?.toLowerCase() ?? "";
  return cacheControl.includes("private") && cacheControl.includes("no-store");
}

function hardenedRequestInit(init = {}) {
  return {
    ...init,
    redirect: "error",
    signal: init.signal ?? AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  };
}

async function parseJson(response, code) {
  try {
    return await response.json();
  } catch {
    throw new QaVerificationError(code, response.status);
  }
}

async function request(fetchImpl, url, init, now, networkFailureCode) {
  const startedAt = now();
  try {
    const response = await fetchImpl(url, hardenedRequestInit(init));
    return { response, latencyMs: elapsedMs(now, startedAt) };
  } catch {
    throw new QaVerificationError(networkFailureCode);
  }
}

async function verifyExpectedLiveRelease({
  fetchImpl,
  apiBaseUrl,
  expectedCommit,
  now,
}) {
  const version = await request(
    fetchImpl,
    `${apiBaseUrl}/version`,
    { headers: { Accept: "application/json" } },
    now,
    "release_version_unavailable",
  );
  expect(
    version.response.status === 200,
    "release_version_unavailable",
    version.response.status,
  );
  const versionBody = await parseJson(
    version.response,
    "release_version_unparseable",
  );
  expect(
    String(versionBody.gitCommit ?? "").toLowerCase() === expectedCommit,
    "unexpected_live_release",
  );
  return version.response.status;
}

function newReport(now) {
  return {
    schemaVersion: "calora.production-recipe-image-qa.v3",
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
      postDeletePreviewImageStatus: null,
      postDeletePreviewImageUnavailable: false,
      secondaryAccountDeleteStatus: null,
      secondaryPostDeleteMediaStatus: null,
      secondaryAccountDeletionTerminal: false,
      noDirectAdminDeletionAfterCaloraApiUse: true,
    },
    failure: null,
    completedAt: null,
    durationMs: null,
  };
}

function setFailure(report, error, fallbackCode = "unexpected_runner_failure") {
  report.result = "fail";
  report.failure ??= {
    code: error instanceof QaVerificationError ? error.code : fallbackCode,
    status: error instanceof QaVerificationError ? error.status : null,
  };
}

async function adminRequest(
  fetchImpl,
  supabaseUrl,
  serviceRoleKey,
  path,
  init = {},
  now = Date.now,
) {
  return (
    await request(
      fetchImpl,
      `${supabaseUrl}${path}`,
      {
        ...init,
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      },
      now,
      "qa_admin_request_unavailable",
    )
  ).response;
}

async function deleteAuthIdentityBeforeCaloraApiUse({
  fetchImpl,
  supabaseUrl,
  serviceRoleKey,
  authUserId,
  now,
}) {
  expect(Boolean(authUserId), "qa_cleanup_identifier_missing");
  const response = await adminRequest(
    fetchImpl,
    supabaseUrl,
    serviceRoleKey,
    `/auth/v1/admin/users/${authUserId}`,
    { method: "DELETE" },
    now,
  );
  expect(
    [200, 204, 404].includes(response.status),
    "pre_api_auth_cleanup_not_terminal",
    response.status,
  );
}

function cleanupFileFromEnv(env) {
  const value = env.CALORA_QA_CLEANUP_FILE?.trim();
  return value || null;
}

function emptyIdentityEnvelope() {
  return {
    authUserId: "",
    provisioningMayHaveBeenCalled: false,
    caloraApiMayHaveBeenCalled: false,
  };
}

function recoveryEnvelope(runId, assumeProvisioningMayHaveBeenCalled = false) {
  return {
    schemaVersion: RECOVERY_ENVELOPE_SCHEMA,
    runId,
    owner: {
      ...emptyIdentityEnvelope(),
      provisioningMayHaveBeenCalled: assumeProvisioningMayHaveBeenCalled,
    },
    other: {
      ...emptyIdentityEnvelope(),
      provisioningMayHaveBeenCalled: assumeProvisioningMayHaveBeenCalled,
    },
  };
}

function validIdentityEnvelope(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof value.authUserId === "string" &&
    typeof value.provisioningMayHaveBeenCalled === "boolean" &&
    typeof value.caloraApiMayHaveBeenCalled === "boolean"
  );
}

function validEnvelope(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    value.schemaVersion === RECOVERY_ENVELOPE_SCHEMA &&
    typeof value.runId === "string" &&
    /^[0-9]{1,20}$/.test(value.runId) &&
    validIdentityEnvelope(value.owner) &&
    validIdentityEnvelope(value.other)
  );
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

async function readRecoveryEnvelope(filePath) {
  if (!filePath) return null;
  try {
    const envelope = JSON.parse(await readFile(filePath, "utf8"));
    expect(validEnvelope(envelope), "invalid_recovery_envelope");
    return envelope;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    if (error instanceof QaVerificationError) throw error;
    throw new QaVerificationError("invalid_recovery_envelope");
  }
}

async function provisionQaIdentity({
  fetchImpl,
  supabaseUrl,
  serviceRoleKey,
  testPassword,
  runId,
  role,
  now,
}) {
  const created = await adminRequest(
    fetchImpl,
    supabaseUrl,
    serviceRoleKey,
    "/auth/v1/admin/users",
    {
      method: "POST",
      body: JSON.stringify({
        email: qaEmail(runId, role),
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
    now,
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
  const authUserId = typeof createdBody.id === "string" ? createdBody.id : "";
  expect(Boolean(authUserId), "qa_account_missing_identifier");
  return authUserId;
}

async function signInQaIdentity({
  fetchImpl,
  supabaseUrl,
  anonKey,
  testPassword,
  runId,
  role,
  now,
  failureCode,
}) {
  const signIn = await request(
    fetchImpl,
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: qaEmail(runId, role),
        password: testPassword,
      }),
    },
    now,
    failureCode,
  );
  expect(signIn.response.status === 200, failureCode, signIn.response.status);
  const signInBody = await parseJson(signIn.response, "qa_sign_in_unparseable");
  const token =
    typeof signInBody.access_token === "string" ? signInBody.access_token : "";
  expect(Boolean(token), "qa_access_token_missing");
  return token;
}

function authorizedJson(
  fetchImpl,
  apiBaseUrl,
  accessToken,
  method,
  path,
  body,
  now,
) {
  return request(
    fetchImpl,
    `${apiBaseUrl}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    now,
    "qa_authenticated_request_unavailable",
  );
}

async function cancelResponseBody(response) {
  if (response.body) await response.body.cancel().catch(() => undefined);
}

async function deleteAndVerifyQaAccount({
  fetchImpl,
  apiBaseUrl,
  accessToken,
  now,
  previewUrl = "",
  onDeleteStatus,
  onPostDeleteMediaStatus,
  onPostDeletePreviewImageStatus,
}) {
  const deleted = await authorizedJson(
    fetchImpl,
    apiBaseUrl,
    accessToken,
    "DELETE",
    "/v1/account",
    undefined,
    now,
  );
  onDeleteStatus(deleted.response.status);
  expect(
    deleted.response.status === 200,
    "account_cleanup_not_terminal",
    deleted.response.status,
  );

  const postDeleteMedia = await authorizedJson(
    fetchImpl,
    apiBaseUrl,
    accessToken,
    "GET",
    "/v1/recipes/media",
    undefined,
    now,
  );
  onPostDeleteMediaStatus(postDeleteMedia.response.status);
  expect(
    postDeleteMedia.response.status === 401,
    "deleted_account_still_authorized",
    postDeleteMedia.response.status,
  );

  if (!previewUrl) return;
  const postDeletePreview = await request(
    fetchImpl,
    previewUrl,
    { headers: { Accept: "image/*" } },
    now,
    "post_delete_preview_check_unavailable",
  );
  onPostDeletePreviewImageStatus(postDeletePreview.response.status);
  await cancelResponseBody(postDeletePreview.response);
  expect(
    postDeletePreview.response.status !== 200,
    "deleted_account_media_object_still_accessible",
    postDeletePreview.response.status,
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
  let ownerAccessToken = "";
  let secondAccessToken = "";
  let ownerCleanupAttempted = false;
  let secondCleanupAttempted = false;
  let ownerCleanupTerminal = false;
  let secondCleanupTerminal = false;
  let previewUrl = "";
  const cleanupFile = cleanupFileFromEnv(env);
  let envelope;
  let apiBaseUrl = "";
  let supabaseUrl = "";
  let serviceRoleKey = "";
  let testPassword = "";
  let anonKey = "";

  const persistEnvelope = async () => {
    await persistRecoveryEnvelope(cleanupFile, envelope);
  };

  const cleanupOwnerThroughSaga = async () => {
    ownerCleanupAttempted = true;
    await deleteAndVerifyQaAccount({
      fetchImpl,
      apiBaseUrl,
      accessToken: ownerAccessToken,
      now,
      previewUrl,
      onDeleteStatus: (status) => {
        report.cleanup.accountDeleteStatus = status;
      },
      onPostDeleteMediaStatus: (status) => {
        report.cleanup.postDeleteMediaStatus = status;
      },
      onPostDeletePreviewImageStatus: (status) => {
        report.cleanup.postDeletePreviewImageStatus = status;
        report.cleanup.postDeletePreviewImageUnavailable = status !== 200;
      },
    });
    ownerCleanupTerminal = true;
    report.cleanup.accountDeletionTerminal = true;
  };

  const cleanupSecondThroughSaga = async () => {
    secondCleanupAttempted = true;
    await deleteAndVerifyQaAccount({
      fetchImpl,
      apiBaseUrl,
      accessToken: secondAccessToken,
      now,
      onDeleteStatus: (status) => {
        report.cleanup.secondaryAccountDeleteStatus = status;
      },
      onPostDeleteMediaStatus: (status) => {
        report.cleanup.secondaryPostDeleteMediaStatus = status;
      },
      onPostDeletePreviewImageStatus: () => undefined,
    });
    secondCleanupTerminal = true;
    report.cleanup.secondaryAccountDeletionTerminal = true;
  };

  const cleanupBeforeCaloraApiUse = async (identity, setTerminal) => {
    await deleteAuthIdentityBeforeCaloraApiUse({
      fetchImpl,
      supabaseUrl,
      serviceRoleKey,
      authUserId: identity.authUserId,
      now,
    });
    setTerminal();
  };

  try {
    expect(
      env.CALORA_QA_RUN_CONFIRMATION === REQUIRED_CONFIRMATION,
      "production_confirmation_missing",
    );
    expect(typeof fetchImpl === "function", "fetch_unavailable");

    apiBaseUrl = normalizeApiBaseUrl(
      getRequiredEnv(env, "CALORA_QA_API_BASE_URL"),
    );
    supabaseUrl = normalizeSupabaseUrl(
      getRequiredEnv(env, "CALORA_QA_SUPABASE_URL"),
    );
    const recipePhotoOrigin = normalizeRecipePhotoOrigin(
      getRequiredEnv(env, "CALORA_QA_RECIPE_PHOTO_ORIGIN"),
    );
    anonKey = getRequiredEnv(env, "CALORA_QA_SUPABASE_ANON_KEY");
    serviceRoleKey = getRequiredEnv(env, "CALORA_QA_SUPABASE_SERVICE_ROLE_KEY");
    testPassword = getRequiredEnv(env, "CALORA_QA_TEST_PASSWORD");
    const expectedCommit = getRequiredEnv(
      env,
      "CALORA_QA_EXPECTED_COMMIT",
    ).toLowerCase();
    const runId = qaRunId(getRequiredEnv(env, "CALORA_QA_RUN_ID"));
    expect(/^[0-9a-f]{40}$/.test(expectedCommit), "invalid_expected_commit");

    report.release.versionStatus = await verifyExpectedLiveRelease({
      fetchImpl,
      apiBaseUrl,
      expectedCommit,
      now,
    });
    report.release.expectedCommitMatched = true;

    // The recovery envelope contains only an internal QA run identifier and
    // internal Auth identifiers/state. It never holds a bearer token, password,
    // service-role key, recipe payload, preview locator, or image content.
    envelope = recoveryEnvelope(runId);
    await persistEnvelope();

    envelope.owner.provisioningMayHaveBeenCalled = true;
    await persistEnvelope();
    envelope.owner.authUserId = await provisionQaIdentity({
      fetchImpl,
      supabaseUrl,
      serviceRoleKey,
      testPassword,
      runId,
      role: "owner",
      now,
    });
    await persistEnvelope();
    ownerAccessToken = await signInQaIdentity({
      fetchImpl,
      supabaseUrl,
      anonKey,
      testPassword,
      runId,
      role: "owner",
      now,
      failureCode: "qa_owner_sign_in_failed",
    });

    envelope.other.provisioningMayHaveBeenCalled = true;
    await persistEnvelope();
    envelope.other.authUserId = await provisionQaIdentity({
      fetchImpl,
      supabaseUrl,
      serviceRoleKey,
      testPassword,
      runId,
      role: "other",
      now,
    });
    await persistEnvelope();
    secondAccessToken = await signInQaIdentity({
      fetchImpl,
      supabaseUrl,
      anonKey,
      testPassword,
      runId,
      role: "other",
      now,
      failureCode: "qa_other_sign_in_failed",
    });

    // Mark before each request: even a connection loss can leave a server-side
    // account record, which must then be cleaned through the account saga.
    envelope.owner.caloraApiMayHaveBeenCalled = true;
    await persistEnvelope();
    const initialMedia = await authorizedJson(
      fetchImpl,
      apiBaseUrl,
      ownerAccessToken,
      "GET",
      "/v1/recipes/media",
      undefined,
      now,
    );
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

    const createdPhoto = await authorizedJson(
      fetchImpl,
      apiBaseUrl,
      ownerAccessToken,
      "POST",
      "/v1/recipes/photo",
      {
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
      },
      now,
    );
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
      fetchImpl,
      apiBaseUrl,
      ownerAccessToken,
      "GET",
      `/v1/recipes/media/${mediaId}/review-preview`,
      undefined,
      now,
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
    const returnedPreviewUrl =
      typeof reviewPreviewBody.imageUrl === "string"
        ? reviewPreviewBody.imageUrl
        : "";
    report.media.reviewPreviewLocatorPresent = Boolean(returnedPreviewUrl);
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
    previewUrl = normalizeReviewPreviewUrl(
      returnedPreviewUrl,
      recipePhotoOrigin,
    );

    const anonymousPreview = await request(
      fetchImpl,
      `${apiBaseUrl}/v1/recipes/media/${mediaId}/review-preview`,
      { headers: { Accept: "application/json" } },
      now,
      "anonymous_preview_request_unavailable",
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

    envelope.other.caloraApiMayHaveBeenCalled = true;
    await persistEnvelope();
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
      "cross_account_preview_request_unavailable",
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
      "review_preview_image_unavailable",
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
    await cancelResponseBody(previewImage.response);

    const rejected = await authorizedJson(
      fetchImpl,
      apiBaseUrl,
      ownerAccessToken,
      "POST",
      `/v1/recipes/media/${mediaId}/review`,
      { reviewState: "rejected" },
      now,
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
      fetchImpl,
      apiBaseUrl,
      ownerAccessToken,
      "GET",
      `/v1/recipes/media/${mediaId}`,
      undefined,
      now,
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

    await cleanupOwnerThroughSaga();
    await cleanupSecondThroughSaga();
    report.result = "pass";
  } catch (error) {
    setFailure(report, error);
  } finally {
    if (envelope && apiBaseUrl && supabaseUrl && serviceRoleKey) {
      if (envelope.owner.authUserId && !ownerCleanupAttempted) {
        try {
          if (envelope.owner.caloraApiMayHaveBeenCalled) {
            expect(Boolean(ownerAccessToken), "owner_qa_cleanup_token_missing");
            await cleanupOwnerThroughSaga();
          } else {
            await cleanupBeforeCaloraApiUse(envelope.owner, () => {
              ownerCleanupTerminal = true;
              report.cleanup.accountDeletionTerminal = true;
            });
          }
        } catch (cleanupError) {
          setFailure(report, cleanupError, "owner_qa_cleanup_not_terminal");
        }
      }
      if (envelope.other.authUserId && !secondCleanupAttempted) {
        try {
          if (envelope.other.caloraApiMayHaveBeenCalled) {
            expect(
              Boolean(secondAccessToken),
              "secondary_qa_cleanup_token_missing",
            );
            await cleanupSecondThroughSaga();
          } else {
            await cleanupBeforeCaloraApiUse(envelope.other, () => {
              secondCleanupTerminal = true;
              report.cleanup.secondaryAccountDeletionTerminal = true;
            });
          }
        } catch (cleanupError) {
          setFailure(report, cleanupError, "secondary_qa_cleanup_not_terminal");
        }
      }
    }

    const ownerCleanupSafe =
      (!envelope?.owner.provisioningMayHaveBeenCalled &&
        !envelope?.owner.authUserId) ||
      ownerCleanupTerminal;
    const secondCleanupSafe =
      (!envelope?.other.provisioningMayHaveBeenCalled &&
        !envelope?.other.authUserId) ||
      secondCleanupTerminal;
    if (!ownerCleanupSafe || !secondCleanupSafe) {
      setFailure(
        report,
        new QaVerificationError(
          ownerCleanupSafe
            ? "secondary_qa_cleanup_not_terminal"
            : "owner_qa_cleanup_not_terminal",
        ),
      );
    }
    if (ownerCleanupSafe && secondCleanupSafe) {
      try {
        await removeRecoveryEnvelope(cleanupFile);
      } catch (error) {
        setFailure(report, error, "recovery_envelope_removal_failed");
      }
    }
    report.completedAt = nowIso(now);
    report.durationMs = elapsedMs(now, startedAt);
  }

  return report;
}

async function recoverOneQaIdentity({
  envelope,
  role,
  fetchImpl,
  apiBaseUrl,
  supabaseUrl,
  anonKey,
  serviceRoleKey,
  testPassword,
  now,
  persistEnvelope,
}) {
  const identity = envelope[role];
  if (!identity.provisioningMayHaveBeenCalled && !identity.authUserId) return;
  if (identity.authUserId && !identity.caloraApiMayHaveBeenCalled) {
    await deleteAuthIdentityBeforeCaloraApiUse({
      fetchImpl,
      supabaseUrl,
      serviceRoleKey,
      authUserId: identity.authUserId,
      now,
    });
    return;
  }

  let accessToken;
  try {
    accessToken = await signInQaIdentity({
      fetchImpl,
      supabaseUrl,
      anonKey,
      testPassword,
      runId: envelope.runId,
      role,
      now,
      failureCode: "recovery_qa_sign_in_failed",
    });
  } catch (error) {
    // A pre-API identity with no returned Auth id cannot own Calora data or a
    // storage prefix. Re-create only its deterministic alias, then erase that
    // exact returned id. This closes the "request never reached Auth" case
    // without listing users or treating an invalid-password response as proof
    // that an identity does not exist. State-bearing or known-id identities
    // remain fail-closed and must authenticate for the account-deletion saga.
    if (identity.authUserId || identity.caloraApiMayHaveBeenCalled) throw error;
    identity.authUserId = await provisionQaIdentity({
      fetchImpl,
      supabaseUrl,
      serviceRoleKey,
      testPassword,
      runId: envelope.runId,
      role,
      now,
    });
    await persistEnvelope();
    await deleteAuthIdentityBeforeCaloraApiUse({
      fetchImpl,
      supabaseUrl,
      serviceRoleKey,
      authUserId: identity.authUserId,
      now,
    });
    return;
  }
  await deleteAndVerifyQaAccount({
    fetchImpl,
    apiBaseUrl,
    accessToken,
    now,
    onDeleteStatus: () => undefined,
    onPostDeleteMediaStatus: () => undefined,
    onPostDeletePreviewImageStatus: () => undefined,
  });
}

/**
 * Recovers a prior, potentially interrupted run using a non-secret, internal
 * QA run identifier. It never retains or recovers a bearer token. If an
 * identity may have touched Calora, it must pass through DELETE /v1/account;
 * direct Admin deletion is reserved for a known identity before Calora API use.
 */
export async function recoverProductionRecipeImageQa({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = Date.now,
} = {}) {
  const filePath = cleanupFileFromEnv(env);
  const result = {
    schemaVersion: "calora.production-recipe-image-qa-recovery.v3",
    result: "not_needed",
    failure: null,
  };

  let envelope;
  try {
    envelope = await readRecoveryEnvelope(filePath);
    if (!envelope) {
      const requestedRunId = env.CALORA_QA_RECOVERY_RUN_ID?.trim();
      if (!requestedRunId) return result;
      // The original runner workspace may be unavailable, so the recovery
      // cannot prove which deterministic QA identities were created. Treat
      // both as potentially provisioned and fail closed until their normal
      // sign-in and deletion-saga cleanup are terminal.
      envelope = recoveryEnvelope(qaRunId(requestedRunId), true);
    }
  } catch (error) {
    return {
      ...result,
      result: "fail",
      failure:
        error instanceof QaVerificationError
          ? error.code
          : "invalid_recovery_envelope",
    };
  }

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
    await verifyExpectedLiveRelease({
      fetchImpl,
      apiBaseUrl,
      expectedCommit,
      now,
    });
    const persistEnvelope = async () => {
      await persistRecoveryEnvelope(filePath, envelope);
    };
    const failures = [];

    for (const role of ["owner", "other"]) {
      try {
        await recoverOneQaIdentity({
          envelope,
          role,
          fetchImpl,
          apiBaseUrl,
          supabaseUrl,
          anonKey,
          serviceRoleKey,
          testPassword,
          now,
          persistEnvelope,
        });
      } catch (error) {
        failures.push(
          error instanceof QaVerificationError
            ? error.code
            : "unexpected_recovery_failure",
        );
      }
    }

    if (failures.length > 0) {
      return {
        ...result,
        result: "fail",
        failure: failures[0],
      };
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
