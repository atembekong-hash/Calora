import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

import { createDatabaseSourceProvenance } from "./verify-db-source-provenance.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("creates separate non-secret API database and Supabase Auth source provenance", () => {
  const manifest = createDatabaseSourceProvenance({ root });
  assert.equal(manifest.schemaVersion, "calora.database-source-provenance.v1");
  assert.match(manifest.gitCommit, /^[0-9a-f]{40}$/);
  assert.match(manifest.sourceTree, /^[0-9a-f]{40}$/);
  assert.equal(manifest.apiDatabase.plane, "calora-api-postgresql-source");
  assert.equal(
    manifest.supabaseAuthControlPlane.doesNotAttestApiDatabase,
    true,
  );
  assert.deepEqual(
    manifest.apiDatabase.journal.map((entry) => entry.idx),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0005_recipe_media.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0006_account_deletion_write_fences.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0007_account_deletion_object_storage_stage.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0008_recipe_nutrition_facts.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0009_recipe_nutrition_cache_baseline.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0010_capture_rate_limits.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0011_coach_v2_conversations.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0012_profile_cross_device_preferences.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0013_recipe_nutrition_decimal_macros.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0014_pgcrypto_extension_schema.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0015_compliance_deletion_fences.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0016_coach_reports.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0017_admin_control_plane.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0018_admin_operational_alerts.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0019_admin_alert_deliveries.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.endsWith("/0020_privacy_rights_requests.sql"),
    ),
    true,
  );
  assert.equal(
    manifest.apiDatabase.journal.find(
      (entry) => entry.tag === "0008_recipe_nutrition_facts",
    )?.sha256,
    "6924b4fcc069f67496123a9dc069f40c05e7b03b3446d7c7d3a42da088b1ba96",
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) =>
      file.path.includes("DATABASE_URL"),
    ),
    false,
  );
  assert.equal(JSON.stringify(manifest).includes("postgresql://"), false);
  assert.match(manifest.apiDatabase.sha256, /^[0-9a-f]{64}$/);
  assert.match(manifest.supabaseAuthControlPlane.sha256, /^[0-9a-f]{64}$/);
});
