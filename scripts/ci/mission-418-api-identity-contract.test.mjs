import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const identity = fs.readFileSync(path.join(root, "artifacts/api-server/src/lib/database-identity.ts"), "utf8");
const profile = fs.readFileSync(path.join(root, "artifacts/api-server/src/routes/profile.ts"), "utf8");
const sql = fs.readFileSync(path.join(root, "artifacts/security/mission-417/migrations/0022_mission_417_rls_prototype.sql"), "utf8");

test("staged API identity integration is explicit and fail-closed", () => {
  assert.match(identity, /CALORA_RLS_DATABASE_MODE/);
  assert.match(identity, /staged-rls/);
  assert.match(identity, /must be set in staged-rls mode/);
  assert.match(identity, /BEGIN/);
  assert.match(identity, /COMMIT/);
  assert.match(identity, /ROLLBACK/);
  assert.match(identity, /client\.release\(\)/);
  assert.match(identity, /set_config/);
  assert.match(identity, /verifyIdentityAssertion/);
});

test("profile handlers use the verified identity executor for all account mutations", () => {
  assert.equal((profile.match(/withVerifiedDatabaseIdentity/g) ?? []).length, 4);
  assert.match(profile, /ensureUserRow\(auth\.id, auth\.email, database, inTransaction\)/);
  assert.doesNotMatch(profile, /db\.delete\(profilesTable\)/);
});

test("staged user bridge permits first-account provisioning without broadening ownership", () => {
  assert.match(sql, /table_name = 'calora_users'/);
  assert.match(sql, /external_id = public\.calora_current_external_user_id\(\)/);
  assert.match(sql, /calora_account_deletion_states/);
  assert.match(sql, /GRANT USAGE ON SCHEMA extensions/);
});

console.info("mission418 API identity contracts: PASS");
