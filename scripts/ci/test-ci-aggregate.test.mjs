import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
);
const releaseValidation = readFileSync(
  path.join(root, ".github/workflows/release-validation.yml"),
  "utf8",
);

const controlledSuites = [
  "pnpm --filter @workspace/calora run test:ci",
  "pnpm --filter @workspace/calora run test:release:native-preflight-unit",
  "pnpm --filter @workspace/api-server run test:offline",
  "pnpm --filter @workspace/scripts run test",
  "pnpm --filter @workspace/fatsecret-gateway run typecheck",
  "pnpm --filter @workspace/fatsecret-gateway run test",
];

test("test:ci is the complete deterministic controlled-suite aggregate", () => {
  assert.equal(
    packageJson.scripts.test,
    "pnpm --filter @workspace/calora run test && pnpm --filter @workspace/api-server run test && pnpm --filter @workspace/scripts run test",
    "the compatibility root test command must remain unchanged",
  );
  assert.equal(
    packageJson.scripts["test:ci"],
    controlledSuites.join(" && "),
    "test:ci must run every controlled suite, including FatSecret typecheck and tests",
  );
});

test("Calora CI uses a serial Vitest runner while preserving the developer command", () => {
  const caloraPackage = JSON.parse(
    readFileSync(path.join(root, "artifacts/calora/package.json"), "utf8"),
  );
  assert.equal(
    caloraPackage.scripts.test,
    "vitest run && node --test server/serve.security.cjs server/serve-web.test.cjs scripts/build-web.test.mjs scripts/expo-config-authority.test.cjs scripts/health-connect-privacy-policy.test.cjs",
  );
  assert.equal(
    caloraPackage.scripts["test:ci"],
    "vitest run --maxWorkers=1 && node --test server/serve.security.cjs server/serve-web.test.cjs scripts/build-web.test.mjs scripts/expo-config-authority.test.cjs scripts/health-connect-privacy-policy.test.cjs",
  );
});

test("the scripts suite validates the checked-in QA coverage ledger", () => {
  const scriptsPackage = JSON.parse(
    readFileSync(path.join(root, "scripts/package.json"), "utf8"),
  );
  assert.match(
    scriptsPackage.scripts.test,
    /\.\/ci\/validate-qa-coverage-ledger\.test\.mjs/,
  );
});

test("release validation invokes the named deterministic test aggregate", () => {
  assert.match(
    releaseValidation,
    /- name: Run complete test suite[\s\S]*?run: pnpm run test:ci/,
    "release validation must invoke the root test:ci aggregate",
  );
});
