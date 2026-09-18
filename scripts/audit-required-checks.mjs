#!/usr/bin/env node

/**
 * Compare protected-branch required status contexts and active branch
 * rulesets with the check names exposed by the workflow files in this
 * checkout.
 *
 * This is intentionally read-only. It never updates branch protection or
 * merges code. The workflow invokes it on pull requests so a workflow rename
 * or removal is reported before it leaves a required context orphaned.
 */
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

export const AUDIT_SCHEMA_VERSION = "calora.required-check-audit.v2";
export const REQUIRED_STATUS_CHECK_INTEGRATION_ID = 15368;

function stripYamlComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "#") {
      return value.slice(0, index).trim();
    }
  }
  return value.trim();
}

function parseYamlScalar(value) {
  const scalar = stripYamlComment(value);
  if (
    scalar.length >= 2 &&
    ((scalar.startsWith('"') && scalar.endsWith('"')) ||
      (scalar.startsWith("'") && scalar.endsWith("'")))
  ) {
    return scalar.slice(1, -1).replaceAll("''", "'");
  }
  return scalar;
}

function addName(names, value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (name) names.add(name);
}

/**
 * Extract the check-name aliases GitHub Actions can expose for one workflow.
 * A job's display name is the normal check name; the ids and unqualified
 * names are retained because older required checks can use those contexts.
 *
 * @param {string} source
 * @param {string} [fileName]
 * @returns {string[]}
 */
export function extractWorkflowCheckNames(source, fileName = "workflow.yml") {
  if (typeof source !== "string") {
    throw new TypeError("Workflow source must be a string.");
  }

  const names = new Set();
  const lines = source.split(/\r?\n/);
  let workflowName = null;
  let inJobs = false;
  const jobs = [];

  for (const line of lines) {
    if (/^\S/.test(line) && !line.startsWith("#")) {
      inJobs = false;
    }

    const workflowMatch = line.match(/^name:\s*(.*?)\s*$/);
    if (workflowMatch) {
      workflowName = parseYamlScalar(workflowMatch[1]);
      continue;
    }

    if (/^jobs:\s*(?:#.*)?$/.test(line)) {
      inJobs = true;
      continue;
    }

    if (!inJobs) continue;

    const jobMatch = line.match(/^ {2}(["']?)([A-Za-z0-9_.-]+)\1:\s*(?:#.*)?$/);
    if (jobMatch) {
      jobs.push({ id: jobMatch[2], displayName: null });
      continue;
    }

    const displayNameMatch = line.match(/^ {4}name:\s*(.*?)\s*$/);
    if (displayNameMatch && jobs.length > 0) {
      jobs[jobs.length - 1].displayName = parseYamlScalar(displayNameMatch[1]);
    }
  }

  workflowName ||= basename(fileName).replace(/\.(?:ya?ml)$/i, "");
  addName(names, workflowName);

  for (const job of jobs) {
    addName(names, job.id);
    addName(names, job.displayName);
    if (workflowName) {
      addName(names, `${workflowName} / ${job.displayName || job.id}`);
    }
  }

  return [...names].sort();
}

/**
 * @param {{path?: string, source: string}[]} workflows
 * @returns {string[]}
 */
export function collectWorkflowCheckNames(workflows) {
  if (!Array.isArray(workflows)) {
    throw new TypeError("Workflows must be an array.");
  }

  const names = new Set();
  for (const workflow of workflows) {
    if (!workflow || typeof workflow.source !== "string") {
      throw new TypeError("Each workflow must include string source.");
    }
    for (const name of extractWorkflowCheckNames(
      workflow.source,
      workflow.path || "workflow.yml",
    )) {
      names.add(name);
    }
  }
  return [...names].sort();
}

function requiredContextName(value) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value.context === "string") return value.context.trim();
  return "";
}

/**
 * @param {object} response GitHub required-status-checks response
 * @returns {string[]}
 */
export function requiredContextNames(response) {
  if (!response || typeof response !== "object") {
    throw new TypeError("Required checks response must be an object.");
  }

  const contexts = Array.isArray(response.contexts) ? response.contexts : [];
  const checks = Array.isArray(response.checks) ? response.checks : [];
  return [
    ...new Set(
      [...contexts, ...checks].map(requiredContextName).filter(Boolean),
    ),
  ].sort();
}

/**
 * @param {{
 *   defaultBranch: string,
 *   requiredContexts: string[],
 *   activeCheckNames: string[],
 * }} input
 */
export function auditRequiredChecks(input) {
  const requiredContexts = [...new Set(input.requiredContexts)].sort();
  const activeCheckNames = [...new Set(input.activeCheckNames)].sort();
  const activeNames = new Set(activeCheckNames);
  const missing = requiredContexts.filter(
    (context) => !activeNames.has(context),
  );

  return {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    defaultBranch: input.defaultBranch,
    requiredContexts,
    activeCheckNames,
    matchedContexts: requiredContexts.filter((context) =>
      activeNames.has(context),
    ),
    missingContexts: missing,
    ok: missing.length === 0,
  };
}

/**
 * Audit the release-protection controls that must accompany the required
 * workflow context. This stays read-only so a misconfigured repository fails
 * before a release rather than being silently repaired by CI.
 *
 * @param {{
 *   defaultBranch: string,
 *   requiredContexts: string[],
 *   activeCheckNames: string[],
 *   protection: object|null,
 *   requiredSignatures: object|null,
 * }} input
 */
export function auditBranchProtection(input) {
  const report = auditRequiredChecks(input);
  const policyIssues = [];
  const protection = input.protection || {};
  const statusChecks = protection.required_status_checks;
  const reviews = protection.required_pull_request_reviews;
  const admins = protection.enforce_admins;
  const signatures = input.requiredSignatures;

  if (statusChecks?.strict !== true) {
    policyIssues.push("Required status checks must require the current branch head.");
  }
  if (admins?.enabled !== true) {
    policyIssues.push("Required branch protection must apply to administrators.");
  }
  if (
    !reviews ||
    !Number.isInteger(reviews.required_approving_review_count) ||
    reviews.required_approving_review_count < 1
  ) {
    policyIssues.push("Main must require at least one approving pull-request review.");
  }
  if (!signatures || signatures.enabled !== true) {
    policyIssues.push("Main must require verified commit signatures.");
  }

  return {
    ...report,
    policyIssues,
    ok: report.ok && policyIssues.length === 0,
  };
}

/**
 * Return active branch-targeting rulesets. Inactive rulesets and rulesets for
 * other targets are not release gates and must not create false failures.
 *
 * @param {object[]} rulesets
 * @returns {object[]}
 */
export function activeBranchRulesets(rulesets) {
  if (!Array.isArray(rulesets)) {
    throw new TypeError("Rulesets must be an array.");
  }

  return rulesets.filter((ruleset) => {
    const refs = ruleset?.conditions?.ref_name?.include;
    return (
      ruleset?.enforcement === "active" &&
      ruleset?.target === "branch" &&
      Array.isArray(refs) &&
      refs.some((ref) => typeof ref === "string" && ref.trim())
    );
  });
}

/**
 * Audit every active branch ruleset against the workflow check names in this
 * checkout. A ruleset that accepts any app, omits strict head enforcement,
 * review/signature parity, or names a check no workflow can emit is a
 * release-blocking configuration error.
 *
 * @param {{
 *   rulesets: object[],
 *   activeCheckNames: string[],
 *   expectedIntegrationId?: number,
 *   requiredApprovingReviewCount?: number,
 *   requireStaleReviewDismissal?: boolean,
 *   requireVerifiedSignatures?: boolean,
 * }} input
 */
export function auditBranchRulesets(input) {
  const activeCheckNames = [...new Set(input.activeCheckNames)].sort();
  const activeNames = new Set(activeCheckNames);
  const expectedIntegrationId =
    input.expectedIntegrationId ?? REQUIRED_STATUS_CHECK_INTEGRATION_ID;
  const requiredApprovingReviewCount =
    input.requiredApprovingReviewCount ?? 1;
  const requireStaleReviewDismissal =
    input.requireStaleReviewDismissal ?? true;
  const requireVerifiedSignatures = input.requireVerifiedSignatures ?? true;
  const reports = activeBranchRulesets(input.rulesets).map((ruleset) => {
    const targets = ruleset.conditions.ref_name.include
      .map((ref) => (typeof ref === "string" ? ref.trim() : ""))
      .filter(Boolean);
    const statusRules = Array.isArray(ruleset.rules)
      ? ruleset.rules.filter((rule) => rule?.type === "required_status_checks")
      : [];
    const pullRequestRules = Array.isArray(ruleset.rules)
      ? ruleset.rules.filter((rule) => rule?.type === "pull_request")
      : [];
    const hasRequiredSignatures = Array.isArray(ruleset.rules)
      ? ruleset.rules.some((rule) => rule?.type === "required_signatures")
      : false;
    const requiredContexts = [];
    const missingContexts = [];
    const policyIssues = [];

    if (statusRules.length === 0) {
      policyIssues.push("No required status-check rule is configured.");
    }
    if (requireVerifiedSignatures && !hasRequiredSignatures) {
      policyIssues.push("Verified commit signatures are required.");
    }
    if (pullRequestRules.length === 0) {
      policyIssues.push("No pull-request review rule is configured.");
    }

    for (const pullRequestRule of pullRequestRules) {
      const parameters = pullRequestRule.parameters || {};
      if (
        requireStaleReviewDismissal &&
        parameters.dismiss_stale_reviews_on_push !== true
      ) {
        policyIssues.push(
          "Pull-request approvals must be dismissed after new reviewable commits.",
        );
      }
      if (
        !Number.isInteger(parameters.required_approving_review_count) ||
        parameters.required_approving_review_count <
          requiredApprovingReviewCount
      ) {
        policyIssues.push(
          `At least ${requiredApprovingReviewCount} approving pull-request review is required.`,
        );
      }
    }

    for (const statusRule of statusRules) {
      const parameters = statusRule.parameters || {};
      if (parameters.strict_required_status_checks_policy !== true) {
        policyIssues.push(
          "Required status checks must require the current branch head.",
        );
      }

      const checks = parameters.required_status_checks;
      if (!Array.isArray(checks) || checks.length === 0) {
        policyIssues.push("Required status-check rule has no configured checks.");
        continue;
      }

      for (const check of checks) {
        const context = requiredContextName(check);
        if (!context) {
          policyIssues.push("A required status check is missing its context name.");
          continue;
        }
        requiredContexts.push(context);
        if (!activeNames.has(context)) missingContexts.push(context);

        if (
          !Number.isInteger(check.integration_id) ||
          check.integration_id !== expectedIntegrationId
        ) {
          policyIssues.push(
            `Status check "${context}" must be bound to GitHub Actions integration ${expectedIntegrationId}.`,
          );
        }
      }
    }

    const uniqueRequiredContexts = [...new Set(requiredContexts)].sort();
    const uniqueMissingContexts = [...new Set(missingContexts)].sort();
    const uniquePolicyIssues = [...new Set(policyIssues)];
    return {
      id: ruleset.id ?? null,
      name: ruleset.name || "Unnamed ruleset",
      targets,
      requiredContexts: uniqueRequiredContexts,
      missingContexts: uniqueMissingContexts,
      policyIssues: uniquePolicyIssues,
      ok: uniqueMissingContexts.length === 0 && uniquePolicyIssues.length === 0,
    };
  });

  return {
    activeRulesetCount: reports.length,
    reports,
    ok: reports.every((report) => report.ok),
  };
}

export function formatAuditReport(report) {
  const lines = [
    `Required-check audit for default branch "${report.defaultBranch}"`,
    `Required contexts: ${report.requiredContexts.length}`,
    `Active workflow check names: ${report.activeCheckNames.length}`,
  ];

  if (report.requiredContexts.length === 0) {
    lines.push(
      "No required status contexts are configured; there are no orphaned required checks to report.",
    );
  } else if (report.ok) {
    lines.push(
      "All required status contexts match active workflow check names.",
    );
  } else {
    lines.push(
      "Missing or mismatched required contexts (possible orphaned checks):",
    );
    for (const context of report.missingContexts) lines.push(`- ${context}`);
    lines.push(
      "Review the workflow job/check name or branch protection; this audit does not change either setting.",
    );
  }

  if (report.policyIssues?.length) {
    lines.push("Branch-protection policy issues:");
    for (const issue of report.policyIssues) lines.push(`- ${issue}`);
  } else if (report.policyIssues) {
    lines.push("Branch-protection policy controls are present.");
  }

  if (report.branchRulesetAudit) {
    lines.push(
      `Active branch rulesets audited: ${report.branchRulesetAudit.activeRulesetCount}`,
    );
    if (report.branchRulesetAudit.ok) {
      lines.push(
        "All active branch rulesets use current workflow checks, strict head enforcement, and the expected app binding.",
      );
    } else {
      lines.push("Branch-ruleset issues:");
      for (const ruleset of report.branchRulesetAudit.reports) {
        if (ruleset.ok) continue;
        lines.push(`- ${ruleset.name} (${ruleset.targets.join(", ")}):`);
        for (const context of ruleset.missingContexts) {
          lines.push(`  missing workflow check: ${context}`);
        }
        for (const issue of ruleset.policyIssues) lines.push(`  ${issue}`);
      }
      lines.push(
        "Review the targeted branch workflow and ruleset; this audit does not change either setting.",
      );
    }
  }

  return lines.join("\n");
}

async function readWorkflowSources(workflowsDirectory) {
  const entries = await readdir(workflowsDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /\.(?:ya?ml)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    files.map(async (file) => ({
      path: join(workflowsDirectory, file),
      source: await readFile(join(workflowsDirectory, file), "utf8"),
    })),
  );
}

async function fetchGitHubJson(url, token, { allowNotFound = false } = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub API request failed (${response.status} ${response.statusText}): ${body.slice(0, 300)}`,
    );
  }
  return response.json();
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function usage() {
  return [
    "Usage: node scripts/audit-required-checks.mjs",
    "  [--repository <owner>/<repo>]",
    "  [--default-branch <branch>]",
    "  [--workflows-dir <directory>]",
    "  [--api-url <url>]",
    "",
    "Requires GITHUB_TOKEN (or GH_TOKEN) when run against GitHub.",
  ].join("\n");
}

async function run() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(usage());
    return;
  }

  const repository =
    argumentValue(args, "--repository") || process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const workflowsDirectory =
    argumentValue(args, "--workflows-dir") || ".github/workflows";
  const apiUrl = (
    argumentValue(args, "--api-url") ||
    process.env.GITHUB_API_URL ||
    "https://api.github.com"
  ).replace(/\/+$/, "");

  if (!repository) throw new Error("GITHUB_REPOSITORY is required.");
  if (!token) throw new Error("GITHUB_TOKEN (or GH_TOKEN) is required.");

  const repositoryResponse = await fetchGitHubJson(
    `${apiUrl}/repos/${repository}`,
    token,
  );
  const defaultBranch =
    argumentValue(args, "--default-branch") ||
    repositoryResponse.default_branch;
  if (!defaultBranch)
    throw new Error("GitHub did not return a default branch.");

  const protectionUrl = `${apiUrl}/repos/${repository}/branches/${encodeURIComponent(defaultBranch)}/protection`;
  const [protectionResponse, requiredSignaturesResponse] = await Promise.all([
    fetchGitHubJson(protectionUrl, token, { allowNotFound: true }),
    fetchGitHubJson(`${protectionUrl}/required_signatures`, token, {
      allowNotFound: true,
    }),
  ]);
  const workflows = await readWorkflowSources(workflowsDirectory);
  const activeCheckNames = collectWorkflowCheckNames(workflows);
  const rulesetSummaries = await fetchGitHubJson(
    `${apiUrl}/repos/${repository}/rulesets?per_page=100`,
    token,
  );
  if (!Array.isArray(rulesetSummaries)) {
    throw new Error("GitHub did not return a ruleset list.");
  }
  const activeRulesetSummaries = activeBranchRulesets(rulesetSummaries);
  const rulesets = await Promise.all(
    activeRulesetSummaries.map((ruleset) =>
      fetchGitHubJson(
        `${apiUrl}/repos/${repository}/rulesets/${encodeURIComponent(ruleset.id)}`,
        token,
      ),
    ),
  );
  const branchRulesetAudit = auditBranchRulesets({
    rulesets,
    activeCheckNames,
    requiredApprovingReviewCount:
      protectionResponse?.required_pull_request_reviews
        ?.required_approving_review_count ?? 1,
    requireStaleReviewDismissal:
      protectionResponse?.required_pull_request_reviews
        ?.dismiss_stale_reviews === true,
    requireVerifiedSignatures: requiredSignaturesResponse?.enabled === true,
  });
  const report = auditBranchProtection({
    defaultBranch,
    requiredContexts: requiredContextNames(
      protectionResponse?.required_status_checks || {},
    ),
    activeCheckNames,
    protection: protectionResponse,
    requiredSignatures: requiredSignaturesResponse,
  });
  report.branchRulesetAudit = branchRulesetAudit;
  report.ok = report.ok && branchRulesetAudit.ok;

  console.log(formatAuditReport(report));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error(`Required-check audit failed: ${error.message}`);
    process.exitCode = 2;
  });
}
