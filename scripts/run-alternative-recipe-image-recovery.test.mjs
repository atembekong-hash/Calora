import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runAlternativeRecovery } from "./run-alternative-recipe-image-recovery.mjs";

test("alternative runner refuses GitHub-hosted execution before reading credentialed configuration", async () => {
  const report = await runAlternativeRecovery({
    env: {
      GITHUB_ACTIONS: "true",
      CALORA_QA_ALTERNATIVE_RUNNER_ID: "manus-sandbox",
      CALORA_QA_RUN_CONFIRMATION: "RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA",
      CALORA_QA_EXPECTED_COMMIT: "a".repeat(40),
      CALORA_QA_RECOVERY_RUN_ID: "39891020186",
    },
  });
  assert.deepEqual(report, {
    schemaVersion: "calora.production-recipe-image-alternative.v1",
    result: "fail",
    failure: "github_hosted_runner_forbidden",
  });
});

test("alternative runner requires explicit sandbox identity and confirmation", async () => {
  const report = await runAlternativeRecovery({
    env: {
      CALORA_QA_ALTERNATIVE_RUNNER_ID: "",
      CALORA_QA_RUN_CONFIRMATION: "",
      CALORA_QA_EXPECTED_COMMIT: "a".repeat(40),
      CALORA_QA_RECOVERY_RUN_ID: "39891020186",
    },
  });
  assert.deepEqual(report, {
    schemaVersion: "calora.production-recipe-image-alternative.v1",
    result: "fail",
    failure: "alternative_runner_identity_missing",
  });
});

test("alternative runner source does not contain production credential values or GitHub secret interpolation", async () => {
  const source = await readFile(new URL("./run-alternative-recipe-image-recovery.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /CALORA_QA_SUPABASE_SERVICE_ROLE_KEY\s*:/);
  assert.doesNotMatch(source, /\$\{\{\s*secrets\./);
  assert.match(source, /CALORA_QA_ALTERNATIVE_RUNNER_ID/);
  assert.match(source, /github_hosted_runner_forbidden/);
});
