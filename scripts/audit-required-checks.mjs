#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

function scalar(value) {
  const trimmed = value.replace(/\s+#.*$/, "").trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed;
}

export function extractWorkflowCheckNames(source, fileName = "workflow.yml") {
  const names = new Set();
  const lines = source.split(/\r?\n/);
  let workflowName;
  let inJobs = false;
  const jobs = [];

  for (const line of lines) {
    if (/^\S/.test(line) && !line.startsWith("#")) inJobs = false;

    const workflowMatch = line.match(/^name:\s*(.*?)\s*$/);
    if (workflowMatch) {
      workflowName = scalar(workflowMatch[1]);
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
      jobs[jobs.length - 1].displayName = scalar(displayNameMatch[1]);
    }
  }

  workflowName ||= basename(fileName).replace(/\.(?:ya?ml)$/i, "");
  if (workflowName) names.add(workflowName);
  for (const job of jobs) {
    names.add(job.id);
    if (job.displayName) names.add(job.displayName);
    names.add(`${workflowName} / ${job.displayName || job.id}`);
  }
  return [...names].sort();
}

async function workflowCheckNames(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /\.(?:ya?ml)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const names = new Set();
  for (const file of files) {
    const source = await readFile(join(directory, file), "utf8");
    for (const name of extractWorkflowCheckNames(source, file)) names.add(name);
  }
  return [...names].sort();
}

function requiredContextNames(response) {
  const values = [
    ...(Array.isArray(response?.contexts) ? response.contexts : []),
    ...(Array.isArray(response?.checks) ? response.checks : []),
  ];
  return [
    ...new Set(
      values
        .map((value) =>
          typeof value === "string" ? value.trim() : value?.context?.trim(),
        )
        .filter(Boolean),
    ),
  ].sort();
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${url}`);
  }
  return response.json();
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!repository) throw new Error("GITHUB_REPOSITORY is required.");
  if (!token) throw new Error("GITHUB_TOKEN (or GH_TOKEN) is required.");

  const apiUrl = (
    process.env.GITHUB_API_URL || "https://api.github.com"
  ).replace(/\/+$/, "");
  const repositoryResponse = await githubJson(
    `${apiUrl}/repos/${repository}`,
    token,
  );
  const defaultBranch = repositoryResponse.default_branch;
  if (!defaultBranch)
    throw new Error("GitHub did not return a default branch.");

  const checksResponse = await githubJson(
    `${apiUrl}/repos/${repository}/branches/${encodeURIComponent(defaultBranch)}/protection/required_status_checks`,
    token,
  ).catch((error) => {
    if (error.message.startsWith("GitHub API 404")) return {};
    throw error;
  });
  const required = requiredContextNames(checksResponse);
  const active = await workflowCheckNames(".github/workflows");
  const missing = required.filter((context) => !active.includes(context));

  console.log(`Required-check audit for default branch "${defaultBranch}"`);
  console.log(`Required contexts: ${required.length}`);
  console.log(`Active workflow check names: ${active.length}`);
  if (missing.length === 0) {
    console.log(
      "All required status contexts match active workflow check names.",
    );
    return;
  }
  console.error(
    "Missing or mismatched required contexts (possible orphaned checks):",
  );
  for (const context of missing) console.error(`- ${context}`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Required-check audit failed: ${error.message}`);
  process.exitCode = 2;
});
