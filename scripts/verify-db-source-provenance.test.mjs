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
    [0, 1, 2, 3, 4],
  );
  assert.equal(
    manifest.apiDatabase.files.some((file) => file.path.endsWith("/0005_recipe_media.sql")),
    true,
  );
  assert.equal(manifest.apiDatabase.files.some((file) => file.path.includes("DATABASE_URL")), false);
  assert.equal(JSON.stringify(manifest).includes("postgresql://"), false);
  assert.match(manifest.apiDatabase.sha256, /^[0-9a-f]{64}$/);
  assert.match(manifest.supabaseAuthControlPlane.sha256, /^[0-9a-f]{64}$/);
});
