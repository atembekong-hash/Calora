import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { validateRecoveryTarget } from "../recovery/validate-recovery-target.mjs";

const workflow = fs.readFileSync(".github/workflows/calora-database-recovery.yml", "utf8");
const valid = {
  target: "staging",
  attestation: "CALORA_STAGING_RECOVERY_V1",
  ref: "refs/heads/main",
  databaseUrl: "postgresql://recovery.example.test:5432/staging_recovery",
  targetId: "calora-staging-recovery",
  endpointHost: "recovery.example.test",
  databaseName: "staging_recovery",
};

function rejects(input, expected) {
  assert.throws(() => validateRecoveryTarget({ ...valid, ...input }), new RegExp(expected));
}

test("accepts only a fully matching protected non-production target", () => {
  assert.deepEqual(validateRecoveryTarget(valid), {
    target: "staging",
    githubEnvironment: "calora-recovery-staging",
    targetId: "calora-staging-recovery",
    endpointHost: "recovery.example.test",
    databaseName: "staging_recovery",
  });
});

test("rejects unsupported, empty, and production-like target aliases", () => {
  rejects({ target: "production" }, /target is not approved/);
  rejects({ target: "prod" }, /target is not approved/);
  rejects({ target: "" }, /target is missing/);
  rejects({ target: "staging-production" }, /target is not approved/);
});

test("rejects an unapproved ref before target identity can be accepted", () => {
  rejects({ ref: "refs/heads/release/calora-production" }, /workflow ref is not approved/);
  rejects({ ref: "refs/tags/v1.0.0" }, /workflow ref is not approved/);
});

test("rejects missing or mismatched protected binding and attestation", () => {
  rejects({ attestation: "" }, /target attestation is missing/);
  rejects({ attestation: "CALORA_DISPOSABLE_RECOVERY_V1" }, /attestation does not match/);
  rejects({ targetId: "calora-production" }, /target identity does not match/);
  rejects({ endpointHost: "production.example.test" }, /endpoint host does not match/);
  rejects({ databaseName: "calora_production" }, /database name does not match/);
});

test("rejects malformed or ambiguous database endpoint metadata", () => {
  rejects({ databaseUrl: "not-a-database-url" }, /endpoint metadata is invalid/);
  rejects({ databaseUrl: "https://recovery.example.test/staging_recovery" }, /scheme is not approved/);
  rejects({ databaseUrl: "postgresql://recovery.example.test" }, /database name is missing/);
  rejects({ databaseUrl: "postgresql://recovery.example.test:5432/other_db" }, /database name does not match/);
});

test("workflow rejects free-form labels and validates before protected secrets or pg_dump", () => {
  assert.match(workflow, /type: choice/);
  assert.doesNotMatch(workflow, /inputs\.environment/);
  assert.match(workflow, /environment: \$\{\{ needs\.attest-target\.outputs\.github_environment \}\}/);
  assert.match(workflow, /CALORA_RECOVERY_TARGET_ID: \$\{\{ vars\.CALORA_RECOVERY_TARGET_ID \}\}/);
  assert.match(workflow, /Revalidate target binding before database commands/);
  assert.match(workflow, /node scripts\/recovery\/validate-recovery-target\.mjs/);
  assert.match(workflow, /needs: validate-target/);
  assert.ok(workflow.indexOf("Revalidate target binding before database commands") < workflow.lastIndexOf("- name: Create encrypted recovery bundle"));
  const attestStart = workflow.indexOf("  attest-target:");
  const recoveryStart = workflow.indexOf("  recovery-bundle:");
  const attestBlock = workflow.slice(attestStart, recoveryStart);
  assert.doesNotMatch(attestBlock, /secrets\.CALORA_RECOVERY_/);
  assert.match(workflow.slice(recoveryStart), /CALORA_BACKUP_DATABASE_URL: \$\{\{ secrets\.CALORA_RECOVERY_DATABASE_URL \}\}/);
  assert.ok(workflow.indexOf("Validate non-secret target identity") < recoveryStart);
  assert.match(workflow, /WORKFLOW_REF: \$\{\{ github\.ref \}\}/);
  assert.match(workflow, /refs\/heads\/main/);
});

test("rejection messages contain no endpoint, target secret, or key material", () => {
  assert.throws(() => validateRecoveryTarget({ ...valid, endpointHost: "other.example.test", databaseUrl: "postgresql://secret-user:secret-password@recovery.example.test:5432/staging_recovery" }), (error) => {
    assert.match(error.message, /database endpoint host does not match/);
    assert.doesNotMatch(error.message, /secret-password|secret-user/);
    return true;
  });
});
