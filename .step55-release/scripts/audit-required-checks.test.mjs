import test from "node:test";
import assert from "node:assert/strict";

import {
  auditRequiredChecks,
  collectWorkflowCheckNames,
  extractWorkflowCheckNames,
  formatAuditReport,
  requiredContextNames,
} from "./audit-required-checks.mjs";

const releaseValidationWorkflow = `
name: Release validation

on:
  pull_request:

jobs:
  release-validation:
    name: Run release validation suite
    runs-on: ubuntu-latest
`;

const formerMandatoryWorkflow = `
name: Mandatory CI release gate

on:
  pull_request:

jobs:
  verify:
    name: Verify workspace release foundation
    runs-on: ubuntu-latest
`;

test("extracts workflow and Actions job check-name aliases", () => {
  assert.deepEqual(
    extractWorkflowCheckNames(
      releaseValidationWorkflow,
      ".github/workflows/release-validation.yml",
    ),
    [
      "Release validation",
      "Release validation / Run release validation suite",
      "Run release validation suite",
      "release-validation",
    ],
  );
});

test("collects names from every active workflow source", () => {
  const names = collectWorkflowCheckNames([
    {
      path: ".github/workflows/release-validation.yml",
      source: releaseValidationWorkflow,
    },
    {
      path: ".github/workflows/mandatory-ci-release-gate.yml",
      source: formerMandatoryWorkflow,
    },
  ]);

  assert.ok(
    names.includes("Release validation / Run release validation suite"),
  );
  assert.ok(
    names.includes(
      "Mandatory CI release gate / Verify workspace release foundation",
    ),
  );
  assert.ok(names.includes("verify"));
});

test("normalizes both legacy contexts and newer required check records", () => {
  assert.deepEqual(
    requiredContextNames({
      contexts: ["release-validation", "legacy-context"],
      checks: [
        { context: "Release validation / Run release validation suite" },
        { context: "release-validation" },
      ],
    }),
    [
      "Release validation / Run release validation suite",
      "legacy-context",
      "release-validation",
    ],
  );
});

test("reports an orphaned required context without changing configuration", () => {
  const report = auditRequiredChecks({
    defaultBranch: "main",
    requiredContexts: [
      "Release validation / Run release validation suite",
      "Mandatory CI release gate / Verify workspace release foundation",
      "renamed-or-removed-check",
    ],
    activeCheckNames: collectWorkflowCheckNames([
      { path: "release-validation.yml", source: releaseValidationWorkflow },
      {
        path: "mandatory-ci-release-gate.yml",
        source: formerMandatoryWorkflow,
      },
    ]),
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.missingContexts, ["renamed-or-removed-check"]);
  assert.match(formatAuditReport(report), /possible orphaned checks/);
  assert.match(formatAuditReport(report), /renamed-or-removed-check/);
  assert.match(formatAuditReport(report), /does not change either setting/);
});

test("passes clearly when the protected branch has no required contexts", () => {
  const report = auditRequiredChecks({
    defaultBranch: "main",
    requiredContexts: [],
    activeCheckNames: ["some-check"],
  });

  assert.equal(report.ok, true);
  assert.match(formatAuditReport(report), /no orphaned required checks/);
});
