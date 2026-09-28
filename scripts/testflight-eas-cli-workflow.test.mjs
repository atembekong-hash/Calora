import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflow = readFileSync(
  path.join(root, ".github/workflows/calora-testflight-upload.yml"),
  "utf8",
);

test("TestFlight build-number preflight uses the supported EAS CLI build-list client", () => {
  assert.match(workflow, /eas-version: 24\.8\.0/);
  assert.match(workflow, /token: \$\{\{ secrets\.EXPO_TOKEN \}\}/);
  assert.match(workflow, /Verify monotonic iOS production build number/);
  assert.match(workflow, /pnpm run test:release:ios-build-number/);
  assert.match(workflow, /eas build --platform ios --profile production --non-interactive --wait --json/);
  assert.match(workflow, /eas submit --platform ios --id "\$EAS_BUILD_ID" --non-interactive --wait/);
});
