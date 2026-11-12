import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const capture = fs.readFileSync("artifacts/api-server/src/routes/capture.ts", "utf8");
const sync = fs.readFileSync("artifacts/api-server/src/routes/sync.ts", "utf8");
const referral = fs.readFileSync("artifacts/api-server/src/routes/referral.ts", "utf8");

test("capture session persistence and approval use the verified identity executor", () => {
  assert.match(capture, /withVerifiedDatabaseIdentity\(user\.id/);
  assert.match(capture, /ensureUserRow\(user\.id, user\.email, database, inTransaction\)/);
  assert.match(capture, /aiCaptureSessionsTable/);
  assert.match(capture, /aiCaptureCandidatesTable/);
  assert.match(capture, /POST \/v1\/capture\/:sessionId\/approve|router\.post\("\/v1\/capture\/:sessionId\/approve"/);
});

test("sync and referral external-grant paths remain visible for separate integration work", () => {
  assert.match(sync, /withVerifiedDatabaseIdentity\(\s*user\.id/);
  assert.match(sync, /async \(database, inTransaction\)/);
  assert.match(sync, /assertAccountWritable\(user\.id, executor, true\)/);
  assert.match(referral, /grantPromoDays/);
  assert.match(referral, /\.update\(referralRedemptionsTable\)/);
});

test("no broad privileged fallback is introduced by Mission 420", () => {
  assert.doesNotMatch(capture, /BYPASSRLS|SET ROLE|calora_api_runtime_rls/);
  assert.doesNotMatch(sync, /BYPASSRLS|SET ROLE|calora_api_runtime_rls/);
});

console.log("mission420 API security contracts: PASS");
