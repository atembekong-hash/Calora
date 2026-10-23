import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import https from "node:https";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = {
  lentil: process.env.CALORA_STAGING_LENTIL_IMAGE_PATH ?? "",
  salmon: process.env.CALORA_STAGING_SALMON_IMAGE_PATH ?? "",
};
const certificatePath = process.env.CALORA_STAGING_TLS_CERT_PATH ?? "";
const keyPath = process.env.CALORA_STAGING_TLS_KEY_PATH ?? "";
const evidencePath =
  process.env.CALORA_STAGING_EVIDENCE_PATH ??
  path.join(os.tmpdir(), "calora-isolated-recipe-image-staging-evidence.json");
const startedAt = Date.now();
const runId = randomUUID();
const databaseName = `calora_staging_recipe_image_${randomBytes(8).toString("hex")}`;
const databaseRole = `calora_staging_${randomBytes(8).toString("hex")}`;
const databasePassword = randomBytes(32).toString("base64url");
const providerApiKey = randomBytes(24).toString("base64url");
const authServiceKey = randomBytes(24).toString("base64url");
const authOwnerToken = randomBytes(24).toString("base64url");
const authViewerToken = randomBytes(24).toString("base64url");
const storageAccessKey = randomBytes(16).toString("hex");
const storageSecretKey = randomBytes(32).toString("hex");
const storageBucket = `calora-staging-${randomBytes(6).toString("hex")}`;
// Supabase Auth Admin validates its user identifier before issuing DELETE.
// These IDs are fresh UUIDs that live only in this process-local harness.
const ownerId = randomUUID();
const viewerId = randomUUID();
let dbCreated = false;
let roleCreated = false;
let apiChild;
let databasePool;
const servers = [];

function fail(message) {
  throw new Error(`isolated_recipe_image_staging: ${message}`);
}

function assertSafeFixturePath(label, value) {
  if (!value || !path.isAbsolute(value)) fail(`${label}_path_is_required`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      command,
      args,
      { cwd: root, ...options },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `${command}_failed:${error.code ?? "unknown"}:${stderr.trim().slice(0, 240)}`,
            ),
          );
          return;
        }
        resolve({ stdout, stderr });
      },
    );
    child.stdin?.end();
  });
}

async function psql(sql, database = "postgres") {
  await run("sudo", [
    "-u",
    "postgres",
    "psql",
    "-v",
    "ON_ERROR_STOP=1",
    "-d",
    database,
    "-c",
    sql,
  ]);
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("staging_server_missing_address"));
        return;
      }
      servers.push(server);
      resolve(`https://127.0.0.1:${address.port}`);
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function json(res, status, payload) {
  const bytes = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": String(bytes.length),
    "cache-control": "no-store",
  });
  res.end(bytes);
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function requestBody(req) {
  const chunks = [];
  for await (const chunk of req)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function requestJson(origin, method, pathname, token, body) {
  const began = Date.now();
  const response = await fetch(`${origin}${pathname}`, {
    method,
    redirect: "error",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let jsonBody;
  if (text) {
    try {
      jsonBody = JSON.parse(text);
    } catch {
      fail(`non_json_api_response:${method}:${pathname}`);
    }
  }
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    json: jsonBody,
    latencyMs: Date.now() - began,
  };
}

function fetchTrustedPreview(url, certificate) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        ca: certificate,
        rejectUnauthorized: true,
        timeout: 10_000,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    request.once("timeout", () =>
      request.destroy(new Error("preview_timeout")),
    );
    request.once("error", reject);
  });
}

function startApi(databaseUrl) {
  return new Promise((resolve, reject) => {
    const portServer = net.createServer();
    portServer.listen(0, "127.0.0.1", () => {
      const address = portServer.address();
      if (!address || typeof address === "string") {
        portServer.close();
        reject(new Error("api_address_missing"));
        return;
      }
      portServer.close(() => {
        const child = execFile(
          process.execPath,
          ["--enable-source-maps", "artifacts/api-server/dist/index.mjs"],
          {
            cwd: root,
            env: {
              ...process.env,
              PORT: String(address.port),
              DATABASE_URL: databaseUrl,
              NODE_EXTRA_CA_CERTS: certificatePath,
            },
          },
        );
        let output = "";
        child.stdout?.on("data", (chunk) => {
          output += String(chunk);
        });
        child.stderr?.on("data", (chunk) => {
          output += String(chunk);
        });
        const deadline = Date.now() + 15_000;
        const check = async () => {
          try {
            const response = await fetch(
              `http://127.0.0.1:${address.port}/api/healthz`,
            );
            if (response.status === 200)
              return resolve({
                child,
                origin: `http://127.0.0.1:${address.port}`,
              });
          } catch {
            // The compiled process is still booting.
          }
          if (Date.now() >= deadline) {
            child.kill("SIGTERM");
            reject(
              new Error(`compiled_api_readiness_timeout:${output.slice(-500)}`),
            );
            return;
          }
          setTimeout(check, 100);
        };
        child.once("error", reject);
        child.once("exit", (code) => {
          if (Date.now() < deadline)
            reject(
              new Error(`compiled_api_exited:${code}:${output.slice(-500)}`),
            );
        });
        void check();
      });
    });
  });
}

function closeApi(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) return resolve();
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 5_000).unref();
  });
}

async function createInfrastructure({ certificate, key, lentilImage }) {
  const deletionStages = {
    storageList: 0,
    storageDelete: 0,
    revenueCatLookup: 0,
    revenueCatDelete: 0,
    authDelete: 0,
  };
  const identities = new Map([
    [
      authOwnerToken,
      { id: ownerId, email: "staging-owner@example.test", deleted: false },
    ],
    [
      authViewerToken,
      { id: viewerId, email: "staging-viewer@example.test", deleted: false },
    ],
  ]);
  const authServer = https.createServer(
    { cert: certificate, key },
    async (req, res) => {
      const pathname = new URL(req.url ?? "/", "https://localhost").pathname;
      const bearer = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : "";
      if (pathname === "/auth/v1/user" && req.method === "GET") {
        const identity = identities.get(bearer);
        if (!identity || identity.deleted)
          return json(res, 401, { message: "invalid" });
        return json(res, 200, {
          id: identity.id,
          email: identity.email,
          app_metadata: { status: "active" },
          user_metadata: {},
        });
      }
      const match = pathname.match(/^\/auth\/v1\/admin\/users\/(.+)$/);
      if (match && req.method === "DELETE") {
        deletionStages.authDelete += 1;
        if (bearer !== authServiceKey)
          return json(res, 401, { message: "invalid" });
        const id = decodeURIComponent(match[1]);
        const identity = [...identities.values()].find(
          (candidate) => candidate.id === id,
        );
        if (!identity) return json(res, 404, { message: "missing" });
        identity.deleted = true;
        return json(res, 200, { id: identity.id });
      }
      return json(res, 404, { message: "not_found" });
    },
  );
  const authOrigin = await listen(authServer);

  const objects = new Map();
  const storageServer = https.createServer(
    { cert: certificate, key },
    async (req, res) => {
      const requestUrl = new URL(req.url ?? "/", "https://localhost");
      const bucketPath = `/${storageBucket}`;
      const objectPrefix = `${bucketPath}/`;
      if (
        requestUrl.pathname !== bucketPath &&
        !requestUrl.pathname.startsWith(objectPrefix)
      )
        return json(res, 404, { message: "not_found" });
      const objectName = decodeURIComponent(
        requestUrl.pathname === bucketPath
          ? ""
          : requestUrl.pathname.slice(objectPrefix.length),
      );
      if (
        req.method === "GET" &&
        requestUrl.searchParams.get("list-type") === "2"
      ) {
        deletionStages.storageList += 1;
        const prefix = requestUrl.searchParams.get("prefix") ?? "";
        const names = [...objects.keys()].filter((name) =>
          name.startsWith(prefix),
        );
        const payload = `<?xml version="1.0"?><ListBucketResult><IsTruncated>false</IsTruncated>${names.map((name) => `<Contents><Key>${xmlEscape(name)}</Key></Contents>`).join("")}</ListBucketResult>`;
        res.writeHead(200, {
          "content-type": "application/xml",
          "content-length": String(Buffer.byteLength(payload)),
        });
        res.end(payload);
        return;
      }
      if (req.method === "PUT") {
        objects.set(objectName, await requestBody(req));
        res.writeHead(200, { "content-length": "0" });
        res.end();
        return;
      }
      if (req.method === "GET") {
        const object = objects.get(objectName);
        if (!object) return json(res, 404, { message: "not_found" });
        res.writeHead(200, {
          "content-type": "image/png",
          "content-length": String(object.length),
        });
        res.end(object);
        return;
      }
      if (req.method === "DELETE") {
        deletionStages.storageDelete += 1;
        const existed = objects.delete(objectName);
        res.writeHead(existed ? 204 : 404, { "content-length": "0" });
        res.end();
        return;
      }
      return json(res, 405, { message: "method_not_allowed" });
    },
  );
  const storageOrigin = await listen(storageServer);

  const providerServer = http.createServer(async (req, res) => {
    if (
      req.method !== "POST" ||
      req.url !== "/v1/images/generations" ||
      req.headers.authorization !== `Bearer ${providerApiKey}`
    ) {
      json(res, 404, { error: { message: "not_found" } });
      return;
    }
    await requestBody(req);
    json(res, 200, {
      created: Math.floor(Date.now() / 1_000),
      data: [{ b64_json: lentilImage.toString("base64") }],
    });
  });
  const providerOrigin = await new Promise((resolve, reject) => {
    providerServer.once("error", reject);
    providerServer.listen(0, "127.0.0.1", () => {
      providerServer.off("error", reject);
      const address = providerServer.address();
      if (!address || typeof address === "string")
        return reject(new Error("provider_missing_address"));
      resolve(`http://127.0.0.1:${address.port}/v1`);
    });
  });
  servers.push(providerServer);

  let customerDeleted = false;
  const revenueCatServer = https.createServer(
    { cert: certificate, key },
    async (req, res) => {
      const pathname = new URL(req.url ?? "/", "https://localhost").pathname;
      const expected = `/v2/projects/staging-project/customers/${encodeURIComponent(ownerId)}`;
      if (
        pathname !== expected ||
        req.headers.authorization !== "Bearer staging-revenuecat-secret"
      ) {
        return json(res, 404, { message: "not_found" });
      }
      if (req.method === "GET") {
        deletionStages.revenueCatLookup += 1;
        return customerDeleted
          ? json(res, 404, { message: "not_found" })
          : json(res, 200, { id: ownerId });
      }
      if (req.method === "DELETE") {
        deletionStages.revenueCatDelete += 1;
        customerDeleted = true;
        res.writeHead(204, { "content-length": "0" });
        res.end();
        return;
      }
      return json(res, 405, { message: "method_not_allowed" });
    },
  );
  const revenueCatOrigin = await listen(revenueCatServer);

  return {
    authOrigin,
    storageOrigin,
    providerOrigin,
    revenueCatOrigin,
    objects,
    identities,
    revenueCatDeleted: () => customerDeleted,
    deletionStages,
  };
}

async function main() {
  assertSafeFixturePath("lentil_image", assets.lentil);
  assertSafeFixturePath("salmon_image", assets.salmon);
  assertSafeFixturePath("tls_certificate", certificatePath);
  assertSafeFixturePath("tls_key", keyPath);
  const [lentilImage, salmonImage, certificate, key] = await Promise.all([
    readFile(assets.lentil),
    readFile(assets.salmon),
    readFile(certificatePath),
    readFile(keyPath),
  ]);
  if (
    !lentilImage.length ||
    !salmonImage.length ||
    lentilImage.length > 15 * 1024 * 1024 ||
    salmonImage.length > 15 * 1024 * 1024
  ) {
    fail("fixture_image_size_invalid");
  }

  await psql(
    `CREATE ROLE ${databaseRole} LOGIN PASSWORD ${sqlLiteral(databasePassword)}`,
  );
  roleCreated = true;
  await psql(`CREATE DATABASE ${databaseName} OWNER ${databaseRole}`);
  dbCreated = true;
  const databaseUrl = `postgresql://${databaseRole}:${encodeURIComponent(databasePassword)}@127.0.0.1:5432/${databaseName}`;

  const infrastructure = await createInfrastructure({
    certificate,
    key,
    lentilImage,
  });
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    MIGRATION_DATABASE_URL: databaseUrl,
    EXPO_PUBLIC_SUPABASE_URL: infrastructure.authOrigin,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: "staging-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: authServiceKey,
    RECIPE_PHOTO_STORAGE_ENDPOINT: infrastructure.storageOrigin,
    RECIPE_PHOTO_STORAGE_FORCE_PATH_STYLE: "true",
    RECIPE_PHOTO_BUCKET: storageBucket,
    RECIPE_PHOTO_ACCESS_KEY_ID: storageAccessKey,
    RECIPE_PHOTO_SECRET_ACCESS_KEY: storageSecretKey,
    RECIPE_PHOTO_STORAGE_REGION: "auto",
    AI_INTEGRATIONS_OPENAI_BASE_URL: infrastructure.providerOrigin,
    AI_INTEGRATIONS_OPENAI_API_KEY: providerApiKey,
    REVENUECAT_PROJECT_ID: "staging-project",
    REVENUECAT_SECRET_API_KEY: "staging-revenuecat-secret",
    CALORA_TEST_REVENUECAT_V2_ORIGIN: infrastructure.revenueCatOrigin,
  });

  await run("pnpm", [
    "--filter",
    "@workspace/db",
    "run",
    "bootstrap-empty-target",
    "--",
    "--approve-empty-calora-target",
  ]);
  await run("pnpm", ["--filter", "@workspace/db", "run", "migrate"]);
  await run("pnpm", [
    "--filter",
    "@workspace/db",
    "run",
    "provision-support-objects",
  ]);

  const startedApi = await startApi(databaseUrl);
  apiChild = startedApi.child;
  const apiOrigin = startedApi.origin;

  const evidence = {
    kind: "isolated_staging_recipe_image_e2e",
    runId,
    recipeFixtures: {
      accepted: {
        semanticReview: "human_visual_match_accepted",
        imageSha256: sha256(lentilImage),
        expectedDistinctReferenceSha256: sha256(salmonImage),
      },
      rejected: {
        semanticReview: "human_visual_mismatch_rejected",
        reason: "lentil image deliberately returned for a salmon recipe",
      },
    },
    statuses: {},
    latenciesMs: {},
    cleanup: {},
  };

  const ownerRecipe = {
    clientRecipeId: `staging-lentil-${runId}`,
    title: "Staging Lentil Mushroom Bowl",
    description:
      "A vegetarian lentil bowl with mushrooms, roasted carrots, and spinach.",
    ingredients: [
      "brown lentils",
      "mushrooms",
      "carrots",
      "baby spinach",
      "lemon",
      "herbs",
    ],
    instructions: [
      "Cook the lentils until tender.",
      "Roast carrots until browned.",
      "Sauté mushrooms with herbs.",
      "Combine with spinach and lemon dressing.",
    ],
    cuisine: "Mediterranean",
    mealType: "Dinner",
    dietaryContext: ["vegetarian", "dairy-free", "egg-free"],
  };
  const createAccepted = await requestJson(
    apiOrigin,
    "POST",
    "/api/v1/recipes/photo",
    authOwnerToken,
    ownerRecipe,
  );
  evidence.statuses.createAccepted = createAccepted.status;
  evidence.latenciesMs.createAccepted = createAccepted.latencyMs;
  assert.equal(
    createAccepted.status,
    200,
    "accepted fixture generation failed",
  );
  assert.equal(createAccepted.json?.status, "stored");
  assert.equal(createAccepted.json?.semanticReviewState, "needs_review");
  assert.equal(typeof createAccepted.json?.mediaId, "string");
  assert.equal(createAccepted.json?.imageUrl, undefined);
  const acceptedMediaId = createAccepted.json.mediaId;

  const anonymousPreview = await requestJson(
    apiOrigin,
    "GET",
    `/api/v1/recipes/media/${acceptedMediaId}/review-preview`,
    "",
    undefined,
  );
  const crossAccountPreview = await requestJson(
    apiOrigin,
    "GET",
    `/api/v1/recipes/media/${acceptedMediaId}/review-preview`,
    authViewerToken,
    undefined,
  );
  evidence.statuses.anonymousPreview = anonymousPreview.status;
  evidence.statuses.crossAccountPreview = crossAccountPreview.status;
  assert.equal(anonymousPreview.status, 401);
  assert.equal(crossAccountPreview.status, 404);

  const acceptedPreview = await requestJson(
    apiOrigin,
    "GET",
    `/api/v1/recipes/media/${acceptedMediaId}/review-preview`,
    authOwnerToken,
    undefined,
  );
  evidence.statuses.acceptedPreview = acceptedPreview.status;
  evidence.latenciesMs.acceptedPreview = acceptedPreview.latencyMs;
  assert.equal(acceptedPreview.status, 200);
  assert.equal(acceptedPreview.headers["cache-control"], "private, no-store");
  assert.equal(acceptedPreview.json?.status, "stored");
  assert.equal(acceptedPreview.json?.semanticReviewState, "needs_review");
  const acceptedPreviewUrl = acceptedPreview.json?.imageUrl;
  assert.equal(typeof acceptedPreviewUrl, "string");
  assert.equal(
    new URL(acceptedPreviewUrl).searchParams.get("X-Amz-Expires"),
    "900",
  );
  const acceptedPreviewBytes = await fetchTrustedPreview(
    acceptedPreviewUrl,
    certificate,
  );
  assert.equal(acceptedPreviewBytes.status, 200);
  assert.equal(sha256(acceptedPreviewBytes.body), sha256(lentilImage));

  const acceptReview = await requestJson(
    apiOrigin,
    "POST",
    `/api/v1/recipes/media/${acceptedMediaId}/review`,
    authOwnerToken,
    { reviewState: "accepted" },
  );
  evidence.statuses.acceptReview = acceptReview.status;
  assert.equal(acceptReview.status, 200);
  assert.equal(acceptReview.json?.semanticReviewState, "accepted");
  const acceptedDelivery = await requestJson(
    apiOrigin,
    "POST",
    "/api/v1/recipes/photo-url",
    authOwnerToken,
    { mediaId: acceptedMediaId },
  );
  evidence.statuses.acceptedDelivery = acceptedDelivery.status;
  assert.equal(acceptedDelivery.status, 200);
  assert.equal(acceptedDelivery.headers["cache-control"], "private, no-store");
  assert.equal(acceptedDelivery.json?.status, "url_ready");
  const acceptedDeliveryUrl = acceptedDelivery.json?.imageUrl;
  assert.equal(typeof acceptedDeliveryUrl, "string");
  const acceptedDeliveryBytes = await fetchTrustedPreview(
    acceptedDeliveryUrl,
    certificate,
  );
  assert.equal(acceptedDeliveryBytes.status, 200);
  assert.equal(sha256(acceptedDeliveryBytes.body), sha256(lentilImage));
  const rendered = await requestJson(
    apiOrigin,
    "POST",
    `/api/v1/recipes/media/${acceptedMediaId}/rendered`,
    authOwnerToken,
    {},
  );
  evidence.statuses.renderedAcknowledgement = rendered.status;
  assert.equal(rendered.status, 204);

  const mismatchRecipe = {
    clientRecipeId: `staging-salmon-${runId}`,
    title: "Staging Citrus Salmon Bowl",
    description:
      "Seared salmon with rice, edamame, cucumber, avocado, and citrus.",
    ingredients: [
      "salmon",
      "brown rice",
      "edamame",
      "cucumber",
      "avocado",
      "orange",
    ],
    instructions: [
      "Sear the salmon.",
      "Cook brown rice.",
      "Arrange edamame and cucumber.",
      "Finish with citrus and sesame.",
    ],
    cuisine: "Pacific",
    mealType: "Dinner",
    dietaryContext: [],
  };
  const createRejected = await requestJson(
    apiOrigin,
    "POST",
    "/api/v1/recipes/photo",
    authOwnerToken,
    mismatchRecipe,
  );
  evidence.statuses.createMismatch = createRejected.status;
  evidence.latenciesMs.createMismatch = createRejected.latencyMs;
  assert.equal(createRejected.status, 200);
  assert.equal(createRejected.json?.status, "stored");
  assert.equal(createRejected.json?.semanticReviewState, "needs_review");
  const rejectedMediaId = createRejected.json?.mediaId;
  assert.equal(typeof rejectedMediaId, "string");
  const mismatchPreview = await requestJson(
    apiOrigin,
    "GET",
    `/api/v1/recipes/media/${rejectedMediaId}/review-preview`,
    authOwnerToken,
    undefined,
  );
  evidence.statuses.mismatchPreview = mismatchPreview.status;
  assert.equal(mismatchPreview.status, 200);
  assert.equal(mismatchPreview.headers["cache-control"], "private, no-store");
  const mismatchPreviewBytes = await fetchTrustedPreview(
    mismatchPreview.json?.imageUrl,
    certificate,
  );
  assert.equal(mismatchPreviewBytes.status, 200);
  assert.equal(sha256(mismatchPreviewBytes.body), sha256(lentilImage));
  assert.notEqual(sha256(mismatchPreviewBytes.body), sha256(salmonImage));
  const rejectReview = await requestJson(
    apiOrigin,
    "POST",
    `/api/v1/recipes/media/${rejectedMediaId}/review`,
    authOwnerToken,
    { reviewState: "rejected" },
  );
  evidence.statuses.rejectReview = rejectReview.status;
  assert.equal(rejectReview.status, 200);
  assert.equal(rejectReview.json?.status, "stored");
  assert.equal(rejectReview.json?.semanticReviewState, "rejected");
  const rejectedDelivery = await requestJson(
    apiOrigin,
    "POST",
    "/api/v1/recipes/photo-url",
    authOwnerToken,
    { mediaId: rejectedMediaId },
  );
  evidence.statuses.rejectedDelivery = rejectedDelivery.status;
  assert.equal(rejectedDelivery.status, 200);
  assert.equal(rejectedDelivery.json?.imageUrl, undefined);

  const listedBeforeDeletion = await requestJson(
    apiOrigin,
    "GET",
    "/api/v1/recipes/media",
    authOwnerToken,
    undefined,
  );
  evidence.statuses.listBeforeDeletion = listedBeforeDeletion.status;
  assert.equal(listedBeforeDeletion.status, 200);
  assert.equal(
    listedBeforeDeletion.headers["cache-control"],
    "private, no-store",
  );
  assert.equal(listedBeforeDeletion.json?.media?.length, 2);

  const deletion = await requestJson(
    apiOrigin,
    "DELETE",
    "/api/v1/account",
    authOwnerToken,
    undefined,
  );
  evidence.statuses.accountDeletion = deletion.status;
  evidence.latenciesMs.accountDeletion = deletion.latencyMs;
  if (deletion.status !== 200) {
    const { Client } = await import("pg");
    const checkpointReader = new Client({ connectionString: databaseUrl });
    await checkpointReader.connect();
    const checkpoint = await checkpointReader.query(
      "SELECT state, stage FROM calora_account_deletion_states ORDER BY updated_at DESC LIMIT 1",
    );
    await checkpointReader.end();
    const row = checkpoint.rows[0] ?? {};
    const stage = typeof row.stage === "string" ? row.stage : "none";
    const state = typeof row.state === "string" ? row.state : "none";
    fail(
      `account_deletion_failed:${deletion.status}:${state}:${stage}:${JSON.stringify(infrastructure.deletionStages)}`,
    );
  }
  assert.equal(deletion.status, 200);
  assert.equal(infrastructure.objects.size, 0);
  assert.equal(infrastructure.revenueCatDeleted(), true);
  assert.equal(infrastructure.identities.get(authOwnerToken)?.deleted, true);
  const afterDeletion = await requestJson(
    apiOrigin,
    "GET",
    "/api/v1/recipes/media",
    authOwnerToken,
    undefined,
  );
  evidence.statuses.ownerAfterDeletion = afterDeletion.status;
  assert.equal(afterDeletion.status, 401);

  const { Client } = await import("pg");
  const verifier = new Client({ connectionString: databaseUrl });
  await verifier.connect();
  const [mediaCount, deletionStateCount] = await Promise.all([
    verifier.query(
      "SELECT COUNT(*)::integer AS count FROM calora_recipe_media",
    ),
    verifier.query(
      "SELECT COUNT(*)::integer AS count FROM calora_account_deletion_states WHERE state = 'deleted'",
    ),
  ]);
  await verifier.end();
  evidence.cleanup.recipeMediaRowsRemaining = mediaCount.rows[0]?.count ?? -1;
  evidence.cleanup.terminalDeletionTombstones =
    deletionStateCount.rows[0]?.count ?? -1;
  evidence.cleanup.storageObjectsRemaining = infrastructure.objects.size;
  evidence.cleanup.ownerAuthDeleted = Boolean(
    infrastructure.identities.get(authOwnerToken)?.deleted,
  );
  evidence.cleanup.viewerAuthProcessScopedOnly = Boolean(
    infrastructure.identities.get(authViewerToken),
  );
  assert.equal(evidence.cleanup.recipeMediaRowsRemaining, 0);
  assert.equal(evidence.cleanup.storageObjectsRemaining, 0);
  assert.equal(evidence.cleanup.ownerAuthDeleted, true);
  assert.equal(evidence.cleanup.terminalDeletionTombstones, 1);

  evidence.finalVerdict = "PASS";
  evidence.durationMs = Date.now() - startedAt;
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });
  process.stdout.write(
    `${JSON.stringify({ verdict: evidence.finalVerdict, evidencePath, durationMs: evidence.durationMs })}\n`,
  );
}

try {
  await main();
} finally {
  if (apiChild) await closeApi(apiChild).catch(() => undefined);
  if (databasePool) await databasePool.end().catch(() => undefined);
  await Promise.all(
    servers.map((server) => closeServer(server).catch(() => undefined)),
  );
  try {
    const db = await import("@workspace/db");
    await db.pool.end();
  } catch {
    // The process may fail before the API imports its database singleton.
  }
  if (dbCreated)
    await psql(`DROP DATABASE IF EXISTS ${databaseName}`).catch(
      () => undefined,
    );
  if (roleCreated)
    await psql(`DROP ROLE IF EXISTS ${databaseRole}`).catch(() => undefined);
  // The evidence remains only when the full lifecycle has completed. Failed
  // runs retain no credentials, URLs, accounts, objects, or database target.
  if (!net.isIP("127.0.0.1")) fail("loopback_sanity_failed");
}
