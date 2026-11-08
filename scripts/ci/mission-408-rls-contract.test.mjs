import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../../lib/db/migrations/0022_mission_408_rls_prototype.sql", import.meta.url), "utf8");

const ownerTables = [
  "calora_users", "calora_profiles", "calora_diary_entries", "calora_weight_entries",
  "calora_saved_meals", "calora_recipes", "calora_recipe_items", "calora_ai_capture_sessions",
  "calora_ai_capture_candidates", "calora_subscriptions", "calora_sync_mutations",
  "calora_consent_events", "calora_privacy_rights_requests", "calora_coach_fact_context_consents",
  "calora_coach_v2_settings", "calora_coach_v2_conversations", "calora_coach_v2_turns",
  "calora_coach_reports", "calora_recipe_media", "calora_referral_codes", "calora_referral_redemptions",
];

test("prototype names a non-bypass runtime role", () => {
  assert.match(migration, /calora_api_runtime_rls LOGIN/);
  assert.match(migration, /NOBYPASSRLS/);
  assert.match(migration, /must not have BYPASSRLS/);
});

test("prototype protects every owner table with RLS policy coverage", () => {
  for (const table of ownerTables) assert.match(migration, new RegExp(table));
  assert.match(migration, /CREATE POLICY mission408_owner_select/);
  assert.match(migration, /CREATE POLICY mission408_external_select/);
});

test("prototype binds identity to SET LOCAL and a database-only secret", () => {
  assert.match(migration, /calora\.identity_token/);
  assert.match(migration, /calora_identity_assertion_secrets/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = pg_catalog, public, extensions/);
  assert.match(migration, /clock_timestamp/);
});

test("prototype is non-destructive and does not grant direct client access", () => {
  assert.doesNotMatch(migration, /DROP\s+TABLE/i);
  assert.doesNotMatch(migration, /TRUNCATE/i);
  assert.doesNotMatch(migration, /DELETE\s+FROM/i);
  assert.match(migration, /REVOKE ALL ON TABLE/);
  assert.match(migration, /FROM PUBLIC/);
  assert.match(migration, /GRANT SELECT ON TABLE public\.calora_food_items/);
});
