import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const diary = fs.readFileSync(path.join(root, "artifacts/api-server/src/routes/diary.ts"), "utf8");
const privacy = fs.readFileSync(path.join(root, "artifacts/api-server/src/routes/privacyRights.ts"), "utf8");
const sync = fs.readFileSync(path.join(root, "artifacts/api-server/src/routes/sync.ts"), "utf8");
const identity = fs.readFileSync(path.join(root, "artifacts/api-server/src/lib/database-identity.ts"), "utf8");

 test("diary reads, writes, and deletes use the verified identity executor", () => {
  assert.ok((diary.match(/withVerifiedDatabaseIdentity/g) ?? []).length >= 4);
  assert.match(diary, /ensureUserRow\(auth\.id, auth\.email, database, inTransaction\)/);
  assert.match(diary, /database\.insert\(diaryEntriesTable\)/);
  assert.match(diary, /database\n\s+\.delete\(diaryEntriesTable\)/);
});

test("privacy request reads and writes use scoped identity and deletion fencing", () => {
  assert.ok((privacy.match(/withVerifiedDatabaseIdentity/g) ?? []).length >= 3);
  assert.match(privacy, /assertAccountWritable\(auth\.id, database, inTransaction\)/);
  assert.match(privacy, /database\n\s+\.insert\(privacyRightsRequestsTable\)/);
});

test("unsupported surfaces remain visible rather than silently claiming staged certification", () => {
  assert.match(sync, /db\s*\.transaction\(async \(tx\)/);
  assert.doesNotMatch(sync, /withVerifiedDatabaseIdentity/);
  assert.match(identity, /no privileged fallback/);
});

console.info("mission419 API-wide identity contracts: PASS");
