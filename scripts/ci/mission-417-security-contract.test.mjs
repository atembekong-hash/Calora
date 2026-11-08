import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("artifacts/security/mission-417/migrations/0022_mission_417_rls_prototype.sql", "utf8");
const hardening = fs.readFileSync("artifacts/security/mission-417/migrations/0021_function_search_path_hardening.sql", "utf8");
const identity = fs.readFileSync("artifacts/security/mission-417/identity-context.ts", "utf8");

test("function hardening pins every reported security function", () => {
  for (const name of ["calora_assert_deletion_writable", "calora_coach_v2_write_fence", "calora_admin_audit_events_immutable", "calora_account_deletion_write_fence"]) {
    const start = hardening.indexOf(`FUNCTION public.${name}`);
    assert.notEqual(start, -1, name);
    const block = hardening.slice(start, start + 260);
    assert.match(block, /SECURITY DEFINER/);
    assert.match(block, /SET search_path = pg_catalog, public, extensions/);
  }
});

test("RLS prototype is least-privilege and explicitly non-production", () => {
  assert.match(migration, /NOT FOR PRODUCTION APPLICATION/);
  assert.match(migration, /NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS/);
  assert.match(migration, /calora_api_runtime_rls must not have BYPASSRLS/);
  assert.match(migration, /calora_identity_assertion_secrets/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.calora_identity_assertion_secrets FROM PUBLIC, calora_api_runtime_rls/);
  assert.doesNotMatch(migration, /DROP\s+DATABASE|TRUNCATE\s+TABLE|DROP\s+TABLE/i);
});

test("identity helper rejects malformed and expired assertions", () => {
  assert.match(identity, /randomBytes\(16\)/);
  assert.match(identity, /expiresAt <= nowSeconds/);
  assert.match(identity, /timingSafeEqual/);
  assert.match(identity, /set_config\(\$1, \$2, true\)/);
  assert.match(identity, /ROLLBACK/);
});
