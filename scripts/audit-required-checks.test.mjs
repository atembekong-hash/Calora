import test from "node:test";
import assert from "node:assert/strict";

import {
  auditBranchRulesets,
  auditBranchProtection,
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

test("requires strict checks, reviews, administrator enforcement, and signatures", () => {
  const incomplete = auditBranchProtection({
    defaultBranch: "main",
    requiredContexts: ["Run release validation suite"],
    activeCheckNames: ["Run release validation suite"],
    protection: {
      required_status_checks: { strict: false },
      enforce_admins: { enabled: false },
      required_pull_request_reviews: { required_approving_review_count: 0 },
    },
    requiredSignatures: { enabled: false },
  });

  assert.equal(incomplete.ok, false);
  assert.equal(incomplete.policyIssues.length, 4);
  assert.match(formatAuditReport(incomplete), /verified commit signatures/);

  const complete = auditBranchProtection({
    defaultBranch: "main",
    requiredContexts: ["Run release validation suite"],
    activeCheckNames: ["Run release validation suite"],
    protection: {
      required_status_checks: { strict: true },
      enforce_admins: { enabled: true },
      required_pull_request_reviews: { required_approving_review_count: 1 },
    },
    requiredSignatures: { enabled: true },
  });

  assert.equal(complete.ok, true);
  assert.deepEqual(complete.policyIssues, []);
  assert.match(formatAuditReport(complete), /controls are present/);
});

test("audits active branch rulesets against workflow checks and app binding", () => {
  const report = auditBranchRulesets({
    activeCheckNames: collectWorkflowCheckNames([
      { path: "release-validation.yml", source: releaseValidationWorkflow },
    ]),
    rulesets: [
      {
        id: 17,
        name: "Calora Release Protection",
        target: "branch",
        enforcement: "active",
        conditions: {
          ref_name: {
            include: ["refs/heads/release/calora-onboarding-and-plus"],
          },
        },
        rules: [
          { type: "required_signatures" },
          {
            type: "pull_request",
            parameters: {
              dismiss_stale_reviews_on_push: true,
              required_approving_review_count: 1,
            },
          },
          {
            type: "required_status_checks",
            parameters: {
              strict_required_status_checks_policy: true,
              required_status_checks: [
                { context: "Run release validation suite", integration_id: 15368 },
              ],
            },
          },
        ],
      },
      {
        id: 18,
        name: "Inactive historical ruleset",
        target: "branch",
        enforcement: "disabled",
        conditions: {
          ref_name: { include: ["refs/heads/old-release"] },
        },
        rules: [],
      },
      {
        id: 19,
        name: "Tag ruleset",
        target: "tag",
        enforcement: "active",
        conditions: {
          ref_name: { include: ["refs/tags/v*"] },
        },
        rules: [],
      },
    ],
  });

  assert.equal(report.ok, true);
  assert.equal(report.activeRulesetCount, 1);
  assert.deepEqual(report.reports[0].targets, [
    "refs/heads/release/calora-onboarding-and-plus",
  ]);
});

test("fails active branch rulesets with stale checks, weak strictness, or wildcard app binding", () => {
  const report = auditBranchRulesets({
    activeCheckNames: ["Run release validation suite"],
    rulesets: [
      {
        id: 22,
        name: "Stale release protection",
        target: "branch",
        enforcement: "active",
        conditions: {
          ref_name: { include: ["refs/heads/release/legacy"] },
        },
        rules: [
          {
            type: "required_status_checks",
            parameters: {
              strict_required_status_checks_policy: false,
              required_status_checks: [
                { context: "Verify workspace release foundation", integration_id: -1 },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.reports[0].missingContexts, [
    "Verify workspace release foundation",
  ]);
  assert.equal(report.reports[0].policyIssues.length, 4);
  const combined = formatAuditReport({
    defaultBranch: "main",
    requiredContexts: [],
    activeCheckNames: ["Run release validation suite"],
    policyIssues: [],
    branchRulesetAudit: report,
  });
  assert.match(combined, /Branch-ruleset issues/);
  assert.match(combined, /bound to GitHub Actions integration/);
  assert.match(combined, /current branch head/);
});

test("requires active release branch rulesets to retain main review and signature protections", () => {
  const report = auditBranchRulesets({
    activeCheckNames: ["Run release validation suite"],
    rulesets: [
      {
        id: 24,
        name: "Weak release rule",
        target: "branch",
        enforcement: "active",
        conditions: { ref_name: { include: ["refs/heads/release/weak"] } },
        rules: [
          {
            type: "required_status_checks",
            parameters: {
              strict_required_status_checks_policy: true,
              required_status_checks: [
                { context: "Run release validation suite", integration_id: 15368 },
              ],
            },
          },
          {
            type: "pull_request",
            parameters: {
              dismiss_stale_reviews_on_push: false,
              required_approving_review_count: 0,
            },
          },
        ],
      },
    ],
  });

  assert.equal(report.ok, false);
  assert.match(
    report.reports[0].policyIssues.join("\n"),
    /Verified commit signatures are required/,
  );
  assert.match(
    report.reports[0].policyIssues.join("\n"),
    /approvals must be dismissed/,
  );
  assert.match(
    report.reports[0].policyIssues.join("\n"),
    /At least 1 approving pull-request review/,
  );
});
