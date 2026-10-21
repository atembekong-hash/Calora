import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const workflow = readFileSync(
  path.join(root, ".github/workflows/database-integration-postgres.yml"),
  "utf8",
);

test("portable database workflow runs a pull request once and retains a post-merge main check", () => {
  assert.match(
    workflow,
    /on:\n  push:\n    branches:\n      - main\n  pull_request:\n  workflow_dispatch:/,
  );
});

test("portable database workflow enables only disposable integrations and inert child API provider setup", () => {
  assert.match(
    workflow,
    /DATABASE_URL: postgresql:\/\/postgres:postgres@127\.0\.0\.1:5432\/calora_integration_ci/,
  );
  assert.match(workflow, /CALORA_RUN_DB_INTEGRATION_TESTS: "true"/);
  assert.match(
    workflow,
    /AI_INTEGRATIONS_OPENAI_BASE_URL: http:\/\/127\.0\.0\.1:1\/openai-test/,
  );
  assert.match(
    workflow,
    /AI_INTEGRATIONS_OPENAI_API_KEY: calora-vitest-openai-key/,
  );
  assert.match(
    workflow,
    /pnpm --filter @workspace\/db run bootstrap-empty-target\n          -- --approve-empty-calora-target/,
  );
  assert.match(
    workflow,
    /pnpm --filter @workspace\/api-server run test:integration:postgres/,
  );
});

test("portable database workflow pins every action and its ephemeral PostgreSQL image", () => {
  for (const line of workflow.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("uses:")) {
      assert.match(trimmed, /@[0-9a-f]{40}(?:\s|$|#)/);
    }
    if (trimmed.startsWith("image:")) {
      assert.match(trimmed, /@sha256:/);
    }
  }
});
