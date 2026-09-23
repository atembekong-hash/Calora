import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = readFileSync(path.join(root, ".github/workflows/release-validation.yml"), "utf8");
const testflight = readFileSync(path.join(root, ".github/workflows/calora-testflight-upload.yml"), "utf8");

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
  assert.match(release, /uses: actions\/attest@v4/);
});

test("TestFlight fails closed on an attested same-SHA push validation before credentials", () => {
  assert.match(testflight, /workflow_dispatch:/);
  assert.match(testflight, /workflow_id: 'release-validation\.yml'/);
  assert.match(testflight, /head_sha: expectedSha/);
  assert.match(testflight, /run\.conclusion === 'success'/);
  assert.match(testflight, /name: calora-release-validation-gate/);
  assert.match(testflight, /gh attestation verify/);
  assert.match(testflight, /--signer-workflow/);
  assert.match(testflight, /--source-digest/);
  assert.match(testflight, /--source-ref/);
  assert.match(testflight, /eas build --platform ios --profile production --non-interactive --wait --json/);
  assert.match(testflight, /eas submit --platform ios --id "\$EAS_BUILD_ID" --non-interactive --wait/);
  assert.match(testflight, /calora-eas-build-provenance-\$\{\{ github\.run_id \}\}/);
  assert.match(testflight, /calora-testflight-submission-provenance-\$\{\{ github\.run_id \}\}/);

  const gateIndex = testflight.indexOf("Require protected current main source and successful validation");
  const expoIndex = testflight.indexOf("Setup Expo and EAS");
  const submitIndex = testflight.indexOf("Submit the exact iOS build to TestFlight");
  const buildAttestationIndex = testflight.indexOf("Attest EAS build provenance");
  assert.ok(gateIndex >= 0 && expoIndex > gateIndex, "gate must run before Expo credentials");
  assert.ok(buildAttestationIndex >= 0 && submitIndex > buildAttestationIndex, "build provenance must be attested before submit");
});
