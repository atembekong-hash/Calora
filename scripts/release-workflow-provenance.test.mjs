import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EAS_BUILD_PROVENANCE_SCHEMA,
  EAS_SUBMISSION_PROVENANCE_SCHEMA,
  RELEASE_GATE_SCHEMA,
  RELEASE_WORKFLOW_PATH,
  REQUIRED_JOB_NAME,
  createEasBuildProvenance,
  createEasSubmissionProvenance,
  createValidationGate,
  extractEasBuildId,
  readExpectedEasIdentity,
  selectSuccessfulValidationRun,
  validateValidationGate,
} from "./release-workflow-provenance.mjs";

const sha = "a".repeat(40);
const tree = "b".repeat(40);
const repository = "atembekong-hash/Calora";
const projectId = "1f202325-5b9a-4260-978f-abbd3252b9ee";
const buildId = "9f1e5407-1111-2222-3333-444444444444";
const env = {
  GITHUB_REPOSITORY: repository,
  GITHUB_REF: "refs/heads/main",
  GITHUB_SHA: sha,
  GITHUB_RUN_ID: "1234",
  GITHUB_RUN_ATTEMPT: "2",
};

function gate(overrides = {}) {
  return {
    schemaVersion: RELEASE_GATE_SCHEMA,
    repository,
    ref: "refs/heads/main",
    commitSha: sha,
    treeSha: tree,
    workflowPath: RELEASE_WORKFLOW_PATH,
    workflowRunId: "1234",
    runAttempt: "2",
    jobName: REQUIRED_JOB_NAME,
    ...overrides,
  };
}

function run(overrides = {}) {
  return {
    id: 1234,
    run_attempt: 2,
    event: "push",
    status: "completed",
    conclusion: "success",
    head_branch: "main",
    head_sha: sha,
    ...overrides,
  };
}

const expected = readExpectedEasIdentity(
  {
    expo: {
      version: "1.0.0",
      ios: { bundleIdentifier: "com.etiendem.caloraapp", buildNumber: "8" },
      extra: { eas: { projectId } },
    },
  },
  {
    build: { production: { ios: { distribution: "store" } } },
    submit: { production: { ios: { ascAppId: "6800321660" } } },
  },
);

function easBuild(overrides = {}) {
  return {
    id: buildId,
    project: { id: projectId },
    platform: "IOS",
    status: "FINISHED",
    buildProfile: "production",
    gitCommitHash: sha,
    appVersion: "1.0.0",
    appBuildVersion: "8",
    distribution: "STORE",
    isForIosSimulator: false,
    artifacts: { applicationArchiveUrl: "https://expo.example.test/archive.ipa?temporary=opaque" },
    accessToken: "must-not-serialize",
    ...overrides,
  };
}

test("creates a same-SHA validation gate with the fixed schema", () => {
  const value = createValidationGate({
    env,
    gitRead: (args) => (args.join(" ") === "rev-parse HEAD" ? sha : tree),
  });
  assert.deepEqual(value, gate());
});

test("rejects a validation gate when a binding or schema field is altered", () => {
  validateValidationGate(gate(), {
    repository,
    ref: "refs/heads/main",
    commitSha: sha,
    workflowRunId: "1234",
    runAttempt: "2",
  });
  for (const altered of [
    gate({ commitSha: "c".repeat(40) }),
    gate({ workflowPath: ".github/workflows/other.yml" }),
    gate({ jobName: "Other job" }),
    { ...gate(), unexpected: true },
  ]) {
    assert.throws(
      () => validateValidationGate(altered, { repository, ref: "refs/heads/main", commitSha: sha, workflowRunId: "1234", runAttempt: "2" }),
      /validation gate/i,
    );
  }
});

test("selects one successful same-SHA push validation run and rejects ambiguity", () => {
  assert.deepEqual(selectSuccessfulValidationRun([run(), run({ id: 999, event: "pull_request" })], sha), run());
  for (const candidate of [run({ conclusion: "failure" }), run({ event: "workflow_dispatch" }), run({ head_branch: "feature" }), run({ head_sha: "c".repeat(40) })]) {
    assert.throws(() => selectSuccessfulValidationRun([candidate], sha), /exactly one/i);
  }
  assert.throws(() => selectSuccessfulValidationRun([run(), run({ id: 999 })], sha), /exactly one/i);
});

test("binds EAS build provenance to project, profile, source, release identity, and archive", () => {
  assert.equal(extractEasBuildId([easBuild()]), buildId);
  const build = createEasBuildProvenance({ rawBuild: easBuild(), gate: gate(), expected, env });
  assert.equal(build.schemaVersion, EAS_BUILD_PROVENANCE_SCHEMA);
  assert.equal(build.easBuildId, buildId);
  assert.equal(build.easProjectId, projectId);
  assert.equal(build.gitCommitHash, sha);
  assert.equal(build.applicationArchiveUrlSha256.length, 64);
  assert.equal(JSON.stringify(build).includes("must-not-serialize"), false);
  assert.equal(JSON.stringify(build).includes("archive.ipa"), false);

  for (const [label, altered] of [
    ["wrong project", easBuild({ project: { id: "2".repeat(8) + "-1111-2222-3333-444444444444" } })],
    ["wrong profile", easBuild({ buildProfile: "preview" })],
    ["wrong source", easBuild({ gitCommitHash: "c".repeat(40) })],
    ["unfinished", easBuild({ status: "ERRORED" })],
    ["wrong version", easBuild({ appBuildVersion: "7" })],
    ["internal distribution", easBuild({ distribution: "INTERNAL" })],
    ["missing archive", easBuild({ artifacts: {} })],
  ]) {
    assert.throws(() => createEasBuildProvenance({ rawBuild: altered, gate: gate(), expected, env }), /EAS build|archive|version/i, label);
  }
});

test("binds TestFlight submission provenance to a fully verified EAS build", () => {
  const build = createEasBuildProvenance({ rawBuild: easBuild(), gate: gate(), expected, env });
  const submission = createEasSubmissionProvenance({
    rawSubmitText: "Submission details: https://expo.dev/accounts/example/projects/calora/submissions/4e591d1f-aaaa-bbbb-cccc-111111111111",
    buildProvenance: build,
    env,
  });
  assert.equal(submission.schemaVersion, EAS_SUBMISSION_PROVENANCE_SCHEMA);
  assert.equal(submission.easSubmissionId, "4e591d1f-aaaa-bbbb-cccc-111111111111");
  assert.equal(submission.easBuildId, build.easBuildId);
  assert.equal(submission.ascAppId, "6800321660");
  assert.throws(
    () => createEasSubmissionProvenance({ rawSubmitText: "no immutable ID", buildProvenance: build, env }),
    /submission id/i,
  );
  assert.throws(
    () => createEasSubmissionProvenance({ rawSubmitText: "submissions/4e591d1f-aaaa-bbbb-cccc-111111111111", buildProvenance: { ...build, gitCommitHash: "c".repeat(40) }, env }),
    /submission context/i,
  );
});

test("command writes canonical gate JSON without reading runtime credentials", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "calora-release-gate-"));
  const output = path.join(root, "gate.json");
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(output, `${JSON.stringify(gate())}\n`);
  const loaded = JSON.parse(await readFile(output, "utf8"));
  assert.deepEqual(loaded, gate());
  assert.equal(JSON.stringify(loaded).includes("postgresql://"), false);
});
