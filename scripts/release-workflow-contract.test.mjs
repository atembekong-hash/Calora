import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = readFileSync(path.join(root, ".github/workflows/release-validation.yml"), "utf8");
const testflight = readFileSync(path.join(root, ".github/workflows/calora-testflight-upload.yml"), "utf8");
const testflightBuildJob = testflight.slice(0, testflight.indexOf("  attest-testflight-evidence:"));
const attestationJob = testflight.slice(testflight.indexOf("  attest-testflight-evidence:"));
const sha = "[0-9a-f]{40}";

test("release validation preserves the required job and emits an attested same-SHA gate", () => {
  assert.match(release, /name: Run release validation suite/);
  assert.match(release, /node scripts\/ci\/validate-expo-config\.mjs artifacts\/calora\/app\.json/);
  assert.match(release, /node scripts\/verify-db-source-provenance\.mjs/);
  assert.match(release, /pnpm --filter @workspace\/api-server run test:offline/);
  assert.match(release, /name: Attest release validation gate/);
  assert.match(release, /needs: release-validation/);
  assert.match(release, /id-token: write/);
  assert.match(release, /attestations: write/);
  assert.match(release, /name: calora-release-validation-gate/);
  assert.match(release, new RegExp(`uses: actions/attest@${sha}`));
});

test("TestFlight gate checks out source before repository code and before EAS credentials", () => {
  assert.match(testflight, /workflow_dispatch:/);
  assert.match(testflight, /workflow_id: 'release-validation\.yml'/);
  assert.match(testflight, /head_sha: expectedSha/);
  assert.match(testflight, /run\.conclusion === 'success'/);
  assert.match(testflight, /name: calora-release-validation-gate/);
  assert.match(testflight, /gh attestation verify/);
  assert.match(testflight, /--signer-workflow/);
  assert.match(testflight, /--source-digest/);
  assert.match(testflight, /--source-ref/);

  const checkoutIndex = testflightBuildJob.indexOf("Checkout exact dispatch source");
  const gateScriptIndex = testflightBuildJob.indexOf("scripts/release-workflow-provenance.mjs validate-validation-gate");
  const expoIndex = testflightBuildJob.indexOf("Setup Expo and EAS");
  assert.ok(checkoutIndex >= 0 && gateScriptIndex > checkoutIndex, "checkout must precede repository gate code");
  assert.ok(gateScriptIndex >= 0 && expoIndex > gateScriptIndex, "gate must precede Expo credential setup");
});

test("TestFlight verifies provider source identity before submit and isolates attestation privileges", () => {
  assert.match(testflightBuildJob, /eas build --platform ios --profile production --non-interactive --wait --json/);
  assert.match(testflightBuildJob, /eas build:view "\$EAS_BUILD_ID" --json/);
  assert.match(testflightBuildJob, /create-eas-build-provenance/);
  assert.match(testflightBuildJob, /artifacts\/calora\/app\.json/);
  assert.match(testflightBuildJob, /artifacts\/calora\/eas\.json/);
  assert.match(testflightBuildJob, /eas submit --platform ios --id "\$EAS_BUILD_ID" --non-interactive --wait/);
  assert.match(testflightBuildJob, /calora-testflight-release-evidence-\$\{\{ github\.run_id \}\}/);
  assert.doesNotMatch(testflightBuildJob, /id-token: write/);
  assert.doesNotMatch(testflightBuildJob, /attestations: write/);
  assert.match(attestationJob, /needs: testflight/);
  assert.match(attestationJob, /id-token: write/);
  assert.match(attestationJob, /attestations: write/);
  assert.match(attestationJob, new RegExp(`uses: actions/attest@${sha}`));

  const verifiedBuildIndex = testflightBuildJob.indexOf("Create strict EAS build provenance");
  const submitIndex = testflightBuildJob.indexOf("Submit the exact verified iOS build to TestFlight");
  assert.ok(verifiedBuildIndex >= 0 && submitIndex > verifiedBuildIndex, "provider build identity must be verified before submit");
});

test("all TestFlight workflow actions are immutable full-SHA pins", () => {
  for (const match of testflight.matchAll(/^\s*uses:\s+([^\s#]+)/gm)) {
    assert.match(match[1], /@[0-9a-f]{40}$/i, `mutable action reference: ${match[1]}`);
  }
});
