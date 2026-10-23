import { mkdir, mkdtemp, rm } from "node:fs/promises";
import dns from "node:dns/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { recoverProductionRecipeImageQa } from "./production-recipe-image-qa.mjs";

const CONFIRMATION = "RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA";
const SUPABASE_HOST = "pzdulhkpwbrbrgskwwwe.supabase.co";
const API_ORIGINS = ["https://mycaloraapp.com", "https://app.mycaloraapp.com"];
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const execFileAsync = promisify(execFile);

function fail(code) {
  return { schemaVersion: "calora.production-recipe-image-alternative.v1", result: "fail", failure: code };
}

async function publicJson(url) {
  const response = await fetch(url, {
    redirect: "error",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`public_http_${response.status}`);
  return response.json();
}

export async function runCredentialFreePreflight({ expectedCommit } = {}) {
  if (!SHA_PATTERN.test(expectedCommit ?? "")) return fail("invalid_expected_commit");
  const report = {
    schemaVersion: "calora.production-recipe-image-alternative.preflight.v1",
    runner: "manus-sandbox",
    host: SUPABASE_HOST,
    dns: "fail",
    nodeHttps: "fail",
    tls: "fail",
    api: [],
    result: "fail",
  };
  try {
    report.dns = (await dns.lookup(SUPABASE_HOST, { all: true })).length ? "pass" : "fail";
    const response = await fetch(`https://${SUPABASE_HOST}/`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    report.nodeHttps = [200, 404, 405].includes(response.status) ? "pass" : "fail";
    report.tls = "pass";
    for (const origin of API_ORIGINS) {
      const version = await publicJson(`${origin}/api/version`);
      const health = await publicJson(`${origin}/health`);
      const gitCommit = String(version.gitCommit ?? "").toLowerCase();
      const healthy = health.status === "ok" || health.ok === true;
      report.api.push({ origin, gitCommit, healthy });
    }
    const apiPass = report.api.length === API_ORIGINS.length && report.api.every(
      (entry) => entry.gitCommit === expectedCommit && entry.healthy,
    );
    report.result = report.dns === "pass" && report.nodeHttps === "pass" && report.tls === "pass" && apiPass ? "pass" : "fail";
    if (!apiPass) report.failure = "production_release_or_health_mismatch";
  } catch {
    report.failure = "credential_free_connectivity_unavailable";
  }
  return report;
}

export async function runAlternativeRecovery({ env = process.env } = {}) {
  if (env.GITHUB_ACTIONS === "true") return fail("github_hosted_runner_forbidden");
  if (env.CALORA_QA_ALTERNATIVE_RUNNER_ID !== "manus-sandbox") return fail("alternative_runner_identity_missing");
  if (env.CALORA_QA_RUN_CONFIRMATION !== CONFIRMATION) return fail("production_confirmation_missing");
  if (!SHA_PATTERN.test(env.CALORA_QA_EXPECTED_COMMIT ?? "")) return fail("invalid_expected_commit");
  if (!/^[0-9]{1,20}$/.test(env.CALORA_QA_RECOVERY_RUN_ID ?? "")) return fail("invalid_recovery_run_identifier");

  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
    if (stdout.trim().toLowerCase() !== env.CALORA_QA_EXPECTED_COMMIT.toLowerCase()) {
      return fail("local_source_commit_mismatch");
    }
  } catch {
    return fail("local_source_commit_unavailable");
  }

  const preflight = await runCredentialFreePreflight({ expectedCommit: env.CALORA_QA_EXPECTED_COMMIT.toLowerCase() });
  if (preflight.result !== "pass") {
    return {
      schemaVersion: "calora.production-recipe-image-alternative.v1",
      runner: "manus-sandbox",
      preflight,
      result: "fail",
      failure: preflight.failure ?? "credential_free_preflight_failed",
    };
  }

  const workdir = env.CALORA_QA_ALTERNATIVE_WORKDIR?.trim() || await mkdtemp(path.join(os.tmpdir(), "calora-recipe-image-recovery-"));
  await mkdir(workdir, { recursive: true, mode: 0o700 });
  const cleanupFile = env.CALORA_QA_CLEANUP_FILE?.trim() || path.join(workdir, "cleanup.json");
  const recoveryEnv = {
    ...env,
    CALORA_QA_CLEANUP_FILE: cleanupFile,
  };
  const report = await recoverProductionRecipeImageQa({ env: recoveryEnv });
  if (report.result === "pass" && !env.CALORA_QA_ALTERNATIVE_WORKDIR) {
    await rm(workdir, { recursive: true, force: true });
  }
  return {
    schemaVersion: "calora.production-recipe-image-alternative.v1",
    runner: "manus-sandbox",
    preflight,
    recovery: report,
    result: report.result === "pass" ? "pass" : "fail",
  };
}

async function main() {
  const report = process.argv.includes("--preflight")
    ? await runCredentialFreePreflight({ expectedCommit: process.env.CALORA_QA_EXPECTED_COMMIT })
    : await runAlternativeRecovery();
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (report.result === "fail") process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
