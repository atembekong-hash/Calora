import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflow = readFileSync(
  path.join(root, ".github/workflows/calora-android-internal-build.yml"),
  "utf8",
);

test("Android APK gate binds the build to the dispatched current protected main revision", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /const expectedSha = context\.sha;/);
  assert.match(
    workflow,
    /context\.ref !== 'refs\/heads\/main' \|\| mainRef\.object\.sha !== expectedSha/,
  );
  assert.match(workflow, /head_sha: expectedSha/);
  assert.match(workflow, /--source-digest "\$GITHUB_SHA"/);
  assert.match(workflow, /--source-ref "\$GITHUB_REF"/);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /git rev-parse HEAD\)" = "\$GITHUB_SHA"/);
  assert.match(
    workflow,
    /const expectedCommit = String\(process\.env\.GITHUB_SHA \?\? ""\)\.toLowerCase\(\);/,
  );
  assert.doesNotMatch(workflow, /b1fcf98c27dae79d72a680a547a21863a9082425/);
});
