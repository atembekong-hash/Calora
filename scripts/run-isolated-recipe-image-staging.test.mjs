import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const harnessPath = path.join(
  root,
  "scripts/run-isolated-recipe-image-staging.mjs",
);

test("isolated recipe-image staging harness is local-only and never targets production providers", async () => {
  const source = await readFile(harnessPath, "utf8");
  assert.match(source, /NODE_ENV: "test"/);
  assert.match(source, /CALORA_TEST_REVENUECAT_V2_ORIGIN/);
  assert.match(source, /https:\/\/127\.0\.0\.1:\$\{address\.port\}/);
  assert.match(source, /http:\/\/127\.0\.0\.1:\$\{address\.port\}\/v1/);
  assert.match(source, /CREATE DATABASE/);
  assert.match(source, /DROP DATABASE IF EXISTS/);
  assert.match(source, /DROP ROLE IF EXISTS/);
  assert.match(source, /"\/api\/v1\/account"/);
  assert.match(source, /assert\.equal\(infrastructure\.objects\.size, 0\)/);
  assert.match(source, /assert\.equal\(afterDeletion\.status, 401\)/);
  assert.match(source, /human_visual_match_accepted/);
  assert.match(source, /human_visual_mismatch_rejected/);
  assert.doesNotMatch(source, /supabase\.co/);
  assert.doesNotMatch(source, /api\.revenuecat\.com/);
  assert.doesNotMatch(source, /mycaloraapp\.com/);
});

test("isolated staging harness retains only sanitized evidence after a complete run", async () => {
  const source = await readFile(harnessPath, "utf8");
  const serialized = source.slice(
    source.indexOf("const evidence ="),
    source.indexOf("const ownerRecipe ="),
  );
  assert.match(serialized, /imageSha256/);
  assert.match(serialized, /statuses/);
  assert.match(serialized, /latenciesMs/);
  assert.match(serialized, /cleanup/);
  assert.doesNotMatch(serialized, /authOwnerToken/);
  assert.doesNotMatch(serialized, /authServiceKey/);
  assert.doesNotMatch(serialized, /storageSecretKey/);
  assert.doesNotMatch(serialized, /acceptedPreviewUrl/);
});
