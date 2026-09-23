#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const RELEASE_GATE_SCHEMA = "calora.release-validation-gate.v1";
export const EAS_BUILD_PROVENANCE_SCHEMA = "calora.eas-build-provenance.v2";
export const EAS_SUBMISSION_PROVENANCE_SCHEMA =
  "calora.testflight-submission-provenance.v2";
export const RELEASE_WORKFLOW_PATH = ".github/workflows/release-validation.yml";
export const REQUIRED_JOB_NAME = "Run release validation suite";
const SHA = /^[0-9a-f]{40}$/;
const POSITIVE_INTEGER = /^[1-9][0-9]*$/;
const EAS_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUNDLE_ID = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

function fail(message) {
  throw new Error(`[release-provenance] ${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`unable to read canonical JSON from ${path.basename(filePath)}: ${error.message}`);
  }
}

function writeCanonicalJson(filePath, payload) {
  writeFileSync(filePath, `${JSON.stringify(payload)}\n`, { encoding: "utf8", mode: 0o600 });
}

function requiredEnv(name, pattern) {
  const value = String(process.env[name] ?? "").trim();
  if (!value || (pattern && !pattern.test(value))) fail(`${name} is missing or malformed.`);
  return value;
}

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    fail(`git ${args.join(" ")} failed.`);
  }
}

function assertExactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} has an unexpected schema.`);
  }
}

function assertString(value, label, pattern) {
  if (typeof value !== "string" || !value || (pattern && !pattern.test(value))) {
    fail(`${label} is missing or malformed.`);
  }
  return value;
}

function requiredEnvFrom(env, name, pattern) {
  const value = String(env[name] ?? "").trim();
  if (!value || (pattern && !pattern.test(value))) fail(`${name} is missing or malformed.`);
  return value;
}

export function createValidationGate({ env = process.env, gitRead = git } = {}) {
  const repository = String(env.GITHUB_REPOSITORY ?? "").trim();
  const ref = String(env.GITHUB_REF ?? "").trim();
  const commitSha = String(env.GITHUB_SHA ?? "").trim();
  const workflowRunId = String(env.GITHUB_RUN_ID ?? "").trim();
  const runAttempt = String(env.GITHUB_RUN_ATTEMPT ?? "").trim();
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) fail("GITHUB_REPOSITORY is missing or malformed.");
  if (ref !== "refs/heads/main") fail("validation gate is only valid for refs/heads/main.");
  if (!SHA.test(commitSha)) fail("GITHUB_SHA is missing or malformed.");
  if (!POSITIVE_INTEGER.test(workflowRunId) || !POSITIVE_INTEGER.test(runAttempt)) {
    fail("GITHUB_RUN_ID or GITHUB_RUN_ATTEMPT is missing or malformed.");
  }
  const head = gitRead(["rev-parse", "HEAD"]);
  const treeSha = gitRead(["rev-parse", `${commitSha}^{tree}`]);
  if (head !== commitSha || !SHA.test(treeSha)) fail("checked-out commit does not match GITHUB_SHA or has no valid tree.");
  return {
    schemaVersion: RELEASE_GATE_SCHEMA,
    repository,
    ref,
    commitSha,
    treeSha,
    workflowPath: RELEASE_WORKFLOW_PATH,
    workflowRunId,
    runAttempt,
    jobName: REQUIRED_JOB_NAME,
  };
}

export function validateValidationGate(gate, { repository, ref, commitSha, workflowRunId, runAttempt } = {}) {
  assertExactKeys(
    gate,
    ["schemaVersion", "repository", "ref", "commitSha", "treeSha", "workflowPath", "workflowRunId", "runAttempt", "jobName"],
    "validation gate",
  );
  assertString(gate.schemaVersion, "validation gate schemaVersion");
  if (gate.schemaVersion !== RELEASE_GATE_SCHEMA) fail("validation gate schema version is unsupported.");
  assertString(gate.repository, "validation gate repository", /^[^/\s]+\/[^/\s]+$/);
  assertString(gate.ref, "validation gate ref", /^refs\/heads\/[A-Za-z0-9._/-]+$/);
  assertString(gate.commitSha, "validation gate commitSha", SHA);
  assertString(gate.treeSha, "validation gate treeSha", SHA);
  assertString(gate.workflowPath, "validation gate workflowPath");
  assertString(gate.workflowRunId, "validation gate workflowRunId", POSITIVE_INTEGER);
  assertString(gate.runAttempt, "validation gate runAttempt", POSITIVE_INTEGER);
  assertString(gate.jobName, "validation gate jobName");
  if (gate.workflowPath !== RELEASE_WORKFLOW_PATH || gate.jobName !== REQUIRED_JOB_NAME) {
    fail("validation gate does not bind the required release workflow and job.");
  }
  for (const [name, expected] of Object.entries({ repository, ref, commitSha, workflowRunId, runAttempt })) {
    if (expected !== undefined && gate[name] !== expected) fail(`validation gate ${name} does not match the selected run.`);
  }
  return gate;
}

export function selectSuccessfulValidationRun(runs, commitSha) {
  if (!Array.isArray(runs) || !SHA.test(commitSha)) fail("validation run inputs are malformed.");
  const matches = runs.filter(
    (run) =>
      run?.event === "push" &&
      run?.status === "completed" &&
      run?.conclusion === "success" &&
      run?.head_branch === "main" &&
      run?.head_sha === commitSha &&
      POSITIVE_INTEGER.test(String(run?.id ?? "")) &&
      POSITIVE_INTEGER.test(String(run?.run_attempt ?? "")),
  );
  if (matches.length !== 1) fail("exactly one successful same-SHA push validation run is required.");
  return matches[0];
}

function pickBuild(payload) {
  const build = Array.isArray(payload) ? payload.at(-1) : payload?.build ?? payload;
  if (!build || typeof build !== "object") fail("EAS response does not contain a build object.");
  return build;
}

export function extractEasBuildId(payload) {
  const id = pickBuild(payload).id;
  if (typeof id !== "string" || !EAS_ID.test(id)) fail("EAS did not return a valid immutable build id.");
  return id.toLowerCase();
}

/** Reads only non-secret, checked-in mobile release identity fields. */
export function readExpectedEasIdentity(appConfig, easConfig) {
  const expo = appConfig?.expo;
  const projectId = expo?.extra?.eas?.projectId;
  const bundleIdentifier = expo?.ios?.bundleIdentifier;
  const appVersion = expo?.version;
  const appBuildVersion = expo?.ios?.buildNumber;
  const ascAppId = easConfig?.submit?.production?.ios?.ascAppId;
  if (!EAS_ID.test(String(projectId ?? ""))) fail("authoritative Expo config lacks a valid EAS project ID.");
  if (!BUNDLE_ID.test(String(bundleIdentifier ?? ""))) fail("authoritative Expo config lacks a valid iOS bundle identifier.");
  if (!String(appVersion ?? "").trim() || !String(appBuildVersion ?? "").trim()) {
    fail("authoritative Expo config lacks an iOS version or build number.");
  }
  if (!POSITIVE_INTEGER.test(String(ascAppId ?? ""))) fail("production submit config lacks an App Store Connect app ID.");
  if (easConfig?.build?.production?.ios?.distribution !== "store") {
    fail("production EAS profile is not configured for App Store distribution.");
  }
  return Object.freeze({
    easProjectId: String(projectId).toLowerCase(),
    bundleIdentifier: String(bundleIdentifier),
    appVersion: String(appVersion),
    appBuildVersion: String(appBuildVersion),
    ascAppId: String(ascAppId),
  });
}

function parseVerifiedEasBuild(payload, expected, commitSha) {
  const build = pickBuild(payload);
  const id = extractEasBuildId(build);
  const projectId = String(build?.project?.id ?? "").toLowerCase();
  const platform = String(build?.platform ?? "").toLowerCase();
  const status = String(build?.status ?? "").toUpperCase();
  const profile = String(build?.buildProfile ?? "");
  const gitCommitHash = String(build?.gitCommitHash ?? "").toLowerCase();
  const distribution = String(build?.distribution ?? "").toLowerCase();
  const artifactUrl = String(build?.artifacts?.applicationArchiveUrl ?? "");
  if (projectId !== expected.easProjectId) fail("EAS build belongs to an unexpected project.");
  if (platform !== "ios") fail("EAS build is not an iOS build.");
  if (status !== "FINISHED") fail("EAS build is not finished successfully.");
  if (profile !== "production") fail("EAS build was not created with the production profile.");
  if (gitCommitHash !== commitSha) fail("EAS build source commit does not match the gated commit.");
  if (String(build?.appVersion ?? "") !== expected.appVersion || String(build?.appBuildVersion ?? "") !== expected.appBuildVersion) {
    fail("EAS build app version or build number does not match authoritative source configuration.");
  }
  if (distribution !== "store") fail("EAS build is not an App Store distribution artifact.");
  if (!artifactUrl.startsWith("https://")) fail("EAS build does not expose a secure application archive URL.");
  if (build?.isForIosSimulator === true) fail("EAS build is a simulator artifact and cannot be submitted to TestFlight.");
  return {
    id,
    platform,
    status,
    profile,
    gitCommitHash,
    distribution,
    applicationArchiveUrlSha256: sha256(artifactUrl),
  };
}

const EAS_BUILD_PROVENANCE_KEYS = [
  "schemaVersion", "repository", "ref", "commitSha", "treeSha", "validationWorkflowRunId", "validationRunAttempt",
  "easProjectId", "iosBundleIdentifier", "ascAppId", "easBuildId", "platform", "status", "profile", "gitCommitHash",
  "appVersion", "appBuildVersion", "distribution", "applicationArchiveUrlSha256", "validationGateSha256", "easBuildResponseSha256",
];

function assertEasBuildProvenance(buildProvenance) {
  assertExactKeys(buildProvenance, EAS_BUILD_PROVENANCE_KEYS, "EAS build provenance");
  if (buildProvenance.schemaVersion !== EAS_BUILD_PROVENANCE_SCHEMA || !EAS_ID.test(buildProvenance.easBuildId)) {
    fail("EAS build provenance is malformed.");
  }
  assertString(buildProvenance.easProjectId, "EAS build provenance easProjectId", EAS_ID);
  for (const field of ["gitCommitHash", "commitSha", "treeSha"]) {
    assertString(buildProvenance[field], `EAS build provenance ${field}`, SHA);
  }
  assertString(buildProvenance.iosBundleIdentifier, "EAS build provenance iosBundleIdentifier", BUNDLE_ID);
  assertString(buildProvenance.ascAppId, "EAS build provenance ascAppId", POSITIVE_INTEGER);
  if (buildProvenance.platform !== "ios" || buildProvenance.status !== "FINISHED" || buildProvenance.profile !== "production" || buildProvenance.distribution !== "store") {
    fail("EAS build provenance does not describe a completed production App Store iOS build.");
  }
  return buildProvenance;
}

export function createEasBuildProvenance({ rawBuild, gate, expected, env = process.env } = {}) {
  const repository = requiredEnvFrom(env, "GITHUB_REPOSITORY", /^[^/\s]+\/[^/\s]+$/);
  const ref = requiredEnvFrom(env, "GITHUB_REF", /^refs\/heads\/main$/);
  const commitSha = requiredEnvFrom(env, "GITHUB_SHA", SHA);
  const validatedGate = validateValidationGate(gate, { repository, ref, commitSha });
  const build = parseVerifiedEasBuild(rawBuild, expected, commitSha);
  return {
    schemaVersion: EAS_BUILD_PROVENANCE_SCHEMA,
    repository: validatedGate.repository,
    ref: validatedGate.ref,
    commitSha: validatedGate.commitSha,
    treeSha: validatedGate.treeSha,
    validationWorkflowRunId: validatedGate.workflowRunId,
    validationRunAttempt: validatedGate.runAttempt,
    easProjectId: expected.easProjectId,
    iosBundleIdentifier: expected.bundleIdentifier,
    ascAppId: expected.ascAppId,
    easBuildId: build.id,
    platform: build.platform,
    status: build.status,
    profile: build.profile,
    gitCommitHash: build.gitCommitHash,
    appVersion: expected.appVersion,
    appBuildVersion: expected.appBuildVersion,
    distribution: build.distribution,
    applicationArchiveUrlSha256: build.applicationArchiveUrlSha256,
    validationGateSha256: sha256(`${JSON.stringify(validatedGate)}\n`),
    easBuildResponseSha256: sha256(JSON.stringify(rawBuild)),
  };
}

function parseSubmissionId(text) {
  const matches = [...String(text).matchAll(/submissions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi)]
    .map((match) => match[1].toLowerCase());
  const unique = [...new Set(matches)];
  if (unique.length !== 1) fail("EAS submit output did not contain one immutable submission id.");
  return unique[0];
}

export function createEasSubmissionProvenance({ rawSubmitText, buildProvenance, env = process.env } = {}) {
  const build = assertEasBuildProvenance(buildProvenance);
  const repository = requiredEnvFrom(env, "GITHUB_REPOSITORY", /^[^/\s]+\/[^/\s]+$/);
  const ref = requiredEnvFrom(env, "GITHUB_REF", /^refs\/heads\/main$/);
  const commitSha = requiredEnvFrom(env, "GITHUB_SHA", SHA);
  if (build.repository !== repository || build.ref !== ref || build.commitSha !== commitSha || build.gitCommitHash !== commitSha) {
    fail("EAS build provenance does not match the submission context.");
  }
  return {
    schemaVersion: EAS_SUBMISSION_PROVENANCE_SCHEMA,
    repository,
    ref,
    commitSha,
    treeSha: build.treeSha,
    validationWorkflowRunId: build.validationWorkflowRunId,
    validationRunAttempt: build.validationRunAttempt,
    easProjectId: build.easProjectId,
    iosBundleIdentifier: build.iosBundleIdentifier,
    ascAppId: build.ascAppId,
    easBuildId: build.easBuildId,
    easSubmissionId: parseSubmissionId(rawSubmitText),
    platform: "ios",
    profile: "production",
    appVersion: build.appVersion,
    appBuildVersion: build.appBuildVersion,
    easBuildProvenanceSha256: sha256(`${JSON.stringify(build)}\n`),
    easSubmitResponseSha256: sha256(String(rawSubmitText)),
  };
}

function usage() {
  fail("usage: create-validation-gate <out> | validate-validation-gate <gate> <run> | create-eas-build-provenance <raw-build-view> <gate> <app-json> <eas-json> <out> | create-eas-submission-provenance <raw-submit> <build-provenance> <out>");
}

function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  if (command === "create-validation-gate" && rest.length === 1) {
    writeCanonicalJson(rest[0], createValidationGate());
    return;
  }
  if (command === "validate-validation-gate" && rest.length === 2) {
    const run = readJson(rest[1]);
    const selected = selectSuccessfulValidationRun([run], requiredEnv("GITHUB_SHA", SHA));
    validateValidationGate(readJson(rest[0]), {
      repository: requiredEnv("GITHUB_REPOSITORY", /^[^/\s]+\/[^/\s]+$/),
      ref: requiredEnv("GITHUB_REF", /^refs\/heads\/main$/),
      commitSha: selected.head_sha,
      workflowRunId: String(selected.id),
      runAttempt: String(selected.run_attempt),
    });
    return;
  }
  if (command === "create-eas-build-provenance" && rest.length === 5) {
    writeCanonicalJson(rest[4], createEasBuildProvenance({
      rawBuild: readJson(rest[0]),
      gate: readJson(rest[1]),
      expected: readExpectedEasIdentity(readJson(rest[2]), readJson(rest[3])),
    }));
    return;
  }
  if (command === "create-eas-submission-provenance" && rest.length === 3) {
    writeCanonicalJson(rest[2], createEasSubmissionProvenance({ rawSubmitText: readFileSync(rest[0], "utf8"), buildProvenance: readJson(rest[1]) }));
    return;
  }
  usage();
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[release-provenance] unknown failure");
    process.exitCode = 1;
  }
}
