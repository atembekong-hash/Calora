import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const creator = fs.readFileSync("scripts/recovery/create-encrypted-backup.mjs", "utf8");
const restorer = fs.readFileSync("scripts/recovery/restore-encrypted-backup.mjs", "utf8");
const workflow = fs.readFileSync(".github/workflows/calora-database-recovery.yml", "utf8");

test("recovery workflow is manual-only and read-scoped", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+schedule:/m);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.match(workflow, /retention-days: 30/);
});

test("backup creator requires a 32-byte managed key and encrypted authenticated envelope", () => {
  assert.match(creator, /CALORA_BACKUP_KEY_B64/);
  assert.match(creator, /key\.length !== REQUIRED_KEY_BYTES/);
  assert.match(creator, /aes-256-gcm/);
  assert.match(creator, /getAuthTag/);
  assert.match(creator, /--no-owner/);
  assert.match(creator, /--no-privileges/);
  assert.match(creator, /rejectSecretLikeContent/);
  assert.match(creator, /temporaryOutput/);
  assert.match(creator, /fs\.rename\(temporaryOutput, resolvedOutput\)/);
});

test("restore is fail-closed for production and verifies the manifest before mutation", () => {
  assert.match(restorer, /CALORA_RECOVERY_NONPRODUCTION !== "true"/);
  assert.match(restorer, /DISPOSABLE_EMPTY_NONPRODUCTION/);
  assert.match(restorer, /Manifest checksum mismatch/);
  assert.match(restorer, /Database archive checksum mismatch/);
  assert.match(restorer, /Missing database archive checksum/);
  assert.match(restorer, /Unsafe archive member/);
  assert.match(restorer, /tar.*-tzf/);
  assert.match(restorer, /--exit-on-error/);
  assert.match(restorer, /--no-owner/);
  assert.match(restorer, /--no-privileges/);
});

test("manual workflow validates before upload and emits sanitized evidence", () => {
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /Validate encrypted recovery bundle before upload/);
  assert.match(workflow, /Write sanitized recovery evidence/);
  assert.match(workflow, /calora\.recovery-evidence\.v1/);
  assert.match(workflow, /retention-days: 30/);
});

test("staged security SQL is not in the auto-applied migration directory", () => {
  assert.equal(fs.existsSync("lib/db/migrations/0021_function_search_path_hardening.sql"), false);
  assert.equal(fs.existsSync("lib/db/migrations/0022_mission_417_rls_prototype.sql"), false);
  assert.equal(fs.existsSync("artifacts/security/mission-417/migrations/0021_function_search_path_hardening.sql"), true);
  assert.equal(fs.existsSync("artifacts/security/mission-417/migrations/0022_mission_417_rls_prototype.sql"), true);
});

test("recovery tooling does not contain destructive database reset flags", () => {
  for (const source of [creator, restorer]) {
    assert.doesNotMatch(source, /\b(--clean|DROP\s+DATABASE|TRUNCATE\s+TABLE)\b/i);
  }
});
