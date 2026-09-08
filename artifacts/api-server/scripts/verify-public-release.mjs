import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  checkAppleAndGoogleAssociationEvidence,
  formatAssociationFreshnessPolicy,
} from "../../../scripts/monitor-native-associations.mjs";
import { fetchPublishedReleaseAttestation } from "../../../scripts/lib/public-release-attestation.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_ORIGIN = "https://mycaloraapp.com";
const SUPPORT_EMAIL = "support@mycaloraapp.com";
const origin = (
  process.env.PUBLIC_VERIFY_ORIGIN ||
  process.env.PUBLIC_WEB_ORIGIN ||
  DEFAULT_ORIGIN
).replace(/\/+$/, "");
const canonicalOrigin = (
  process.env.PUBLIC_CANONICAL_ORIGIN || DEFAULT_ORIGIN
).replace(/\/+$/, "");

const pages = [
  ["/", "Calora", "/"],
  ["/privacy", "Privacy Policy", "/privacy"],
  ["/terms", "Terms of Use", "/terms"],
  ["/support", "Help & Support", "/support"],
  ["/contact", "Contact Calora", "/contact"],
  ["/delete-account", "Delete your account", "/delete-account"],
  ["/subscriptions", "Subscription Information", "/subscriptions"],
  ["/help", "Calora Help", "/support"],
];

const appleTeamId =
  process.env.APPLE_TEAM_ID || process.env.CALORA_APPLE_TEAM_ID;
const androidFingerprint =
  process.env.ANDROID_SHA256_FINGERPRINT ||
  process.env.CALORA_ANDROID_SHA256_FINGERPRINT;

async function git(...args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: new URL("../../..", import.meta.url),
  });
  return stdout.trim();
}

async function fetchRequired(path, expectedContentType) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "follow",
    headers: { "user-agent": "calora-public-release-verifier/1.0" },
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}.`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes(expectedContentType)) {
    throw new Error(
      `${path} returned unexpected content type ${contentType || "(missing)"}.`,
    );
  }
  return response;
}

export { fetchPublishedReleaseAttestation };

export async function main() {
  const [status, currentTree] = await Promise.all([
    git("status", "--porcelain", "--untracked-files=all"),
    git("rev-parse", "HEAD^{tree}"),
  ]);
  if (status) {
    throw new Error("Public release verification requires a clean checkout.");
  }

  const expectedTree =
    process.env.PUBLIC_VERIFY_EXPECTED_SOURCE_TREE?.trim() || currentTree;
  const version = await fetchPublishedReleaseAttestation(origin);
  if (version.sourceTree !== expectedTree) {
    throw new Error(
      `Live source tree ${String(version.sourceTree)} does not match expected source tree ${expectedTree}.`,
    );
  }
  console.info(`[PASS] Live API source tree matches ${currentTree}.`);

  const associationEvidence = await checkAppleAndGoogleAssociationEvidence({
    origin,
    appleTeamId,
    androidFingerprint,
  });
  console.info(
    `[PASS] ${associationEvidence.checked.join(" and ")} verified for ${origin}.`,
  );
  console.info(
    formatAssociationFreshnessPolicy(associationEvidence.freshnessPolicy),
  );
  for (const warning of associationEvidence.warnings ?? []) {
    console.warn(`[WARN] ${warning}`);
  }

  const healthResponse = await fetchRequired("/api", "application/json");
  const health = await healthResponse.json();
  if (health.status !== "ok") {
    throw new Error(
      `/api returned unexpected health status ${JSON.stringify(health)}.`,
    );
  }

  for (const [path, expectedHeading, canonicalPath] of pages) {
    const response = await fetchRequired(path, "text/html");
    const html = await response.text();
    if (
      !html.includes(expectedHeading) &&
      !html.includes(expectedHeading.replace("&", "&amp;"))
    ) {
      throw new Error(
        `${path} did not contain the expected heading ${expectedHeading}.`,
      );
    }
    if (!html.includes(SUPPORT_EMAIL)) {
      throw new Error(`${path} did not publish the monitored support channel.`);
    }
    if (!html.includes(`rel="canonical" href="${canonicalOrigin}${canonicalPath}"`)) {
      throw new Error(
        `${path} did not publish a canonical URL on the confirmed origin.`,
      );
    }
  }

  console.info(
    `Release verification: PASS — ${version.releaseId} at ${origin} from source tree ${expectedTree}.`,
  );
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(
      `Release verification: FAIL — ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  });
}
