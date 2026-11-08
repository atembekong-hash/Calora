import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migration = await readFile(
  new URL("../../lib/db/migrations/0021_function_search_path_hardening.sql", import.meta.url),
  "utf8",
);

const functions = [
  "calora_assert_deletion_writable(text)",
  "calora_coach_v2_write_fence()",
  "calora_admin_audit_events_immutable()",
  "calora_account_deletion_write_fence()",
];

test("search-path hardening covers every mutable production function", () => {
  for (const signature of functions) {
    assert.match(
      migration,
      new RegExp(
        `ALTER FUNCTION public\\.${signature.replace(/[()]/g, "\\$&")}\\s+SET search_path = pg_catalog, public, extensions`,
      ),
      `missing pinned search_path for ${signature}`,
    );
  }
});

test("search-path hardening does not grant client table access or use destructive DDL", () => {
  assert.doesNotMatch(migration, /GRANT|REVOKE|DROP TABLE|TRUNCATE|DELETE FROM/i);
  assert.doesNotMatch(migration, /CREATE POLICY/i);
});
