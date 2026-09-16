#!/usr/bin/env node

/**
 * Supported pre-activation release check for the managed Publishing path.
 * It compares the reviewed clean-source identity with immutable build metadata
 * compiled into the live API, while requiring canonical HTTPS and health.
 */
const FULL_SHA = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : "";
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function canonicalHttpsOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== value || url.username || url.password || url.search || url.hash) {
    throw new Error("Live URL must be a canonical HTTPS origin.");
  }
  return url;
}

async function fetchSameOrigin(origin, pathname) {
  const response = await fetch(`${origin}${pathname}`, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.type === "opaqueredirect" || new URL(response.url).origin !== origin || !response.url.startsWith("https://")) {
    throw new Error(`Live ${pathname} redirected or left the canonical HTTPS origin.`);
  }
  return response;
}

async function main() {
  const expectedCommit = argument("--git-commit").toLowerCase();
  const expectedTree = argument("--source-tree").toLowerCase();
  const expectedDigest = argument("--source-digest").toLowerCase();
  const liveUrl = canonicalHttpsOrigin(argument("--live-url")).origin;
  if (!FULL_SHA.test(expectedCommit) || !FULL_SHA.test(expectedTree) || !SHA256.test(expectedDigest)) {
    throw new Error("Expected commit, tree, or source digest is malformed.");
  }

  const [versionResponse, healthResponse] = await Promise.all([
    fetchSameOrigin(liveUrl, "/api/version"),
    fetchSameOrigin(liveUrl, "/api/healthz"),
  ]);
  if (!versionResponse.ok) throw new Error(`Live version endpoint failed with ${versionResponse.status}.`);
  if (!healthResponse.ok) throw new Error(`Live health endpoint failed with ${healthResponse.status}.`);

  const version = await versionResponse.json();
  if (
    version.gitCommit?.toLowerCase() !== expectedCommit ||
    version.sourceTree?.toLowerCase() !== expectedTree ||
    version.sourceDigest?.toLowerCase() !== expectedDigest
  ) {
    throw new Error("Live compiled release identity does not match the reviewed source.");
  }
  if (typeof version.releaseId !== "string" || !version.releaseId || Number.isNaN(Date.parse(version.buildTimestamp))) {
    throw new Error("Live version response lacks valid compiled release metadata.");
  }
  console.log(JSON.stringify({
    verified: true,
    gitCommit: version.gitCommit,
    sourceTree: version.sourceTree,
    sourceDigest: version.sourceDigest,
    releaseId: version.releaseId,
    buildTimestamp: version.buildTimestamp,
    liveUrl,
    liveChecks: { versionStatus: versionResponse.status, healthStatus: healthResponse.status },
  }));
}

main().catch((error) => {
  console.error(`Release identity verification failed: ${error.message}`);
  process.exit(1);
});