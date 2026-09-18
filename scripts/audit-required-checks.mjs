#!/usr/bin/env node

/**
 * Compare the required status contexts on the repository's default branch
 * with the check names exposed by the workflow files in this checkout.
 *
 * This is intentionally read-only. It never updates branch protection or
 * merges code. The workflow invokes it on pull requests so a workflow rename
 * or removal is reported before it leaves a required context orphaned.
 */
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

export const AUDIT_SCHEMA_VERSION = "calora.required-check-audit.v2";

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
  const report = auditBranchProtection({
    defaultBranch,
    requiredContexts: requiredContextNames(
      protectionResponse?.required_status_checks || {},
    ),
    activeCheckNames: collectWorkflowCheckNames(workflows),
    protection: protectionResponse,
    requiredSignatures: requiredSignaturesResponse,
  });

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
