import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { checkAppleAndGoogleAssociationEvidence } from "../../../scripts/monitor-native-associations.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_ORIGIN = "https://calorie-coach-pie35449.replit.app";
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
  ["/api/legal/", "CaloraApp"],
  ["/api/legal/privacy", "Privacy Policy"],
  ["/api/legal/terms", "Terms of Use"],
  ["/api/legal/support", "Help & Support"],
  ["/api/legal/contact", "Help & Support"],
  ["/api/legal/delete-account", "Delete your account"],
  ["/api/legal/subscriptions", "Subscription Information"],
  ["/api/legal/help", "Help & Support"],
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

async function main() {
  const [status, expectedTree] = await Promise.all([
    git("status", "--porcelain", "--untracked-files=all"),
    git("rev-parse", "HEAD^{tree}"),
  ]);
  if (status) {
    throw new Error("Public release verification requires a clean checkout.");
  }

  const versionResponse = await fetchRequired(
    "/api/version",
    "application/json",
  );
  const version = await versionResponse.json();
  if (version.sourceTree !== expectedTree) {
    throw new Error(
      `Live source tree ${String(version.sourceTree)} does not match current source tree ${expectedTree}.`,
    );
  }
  console.info(`[PASS] Live API source tree matches ${expectedTree}.`);

  const associationEvidence = await checkAppleAndGoogleAssociationEvidence({
    origin,
    appleTeamId,
    androidFingerprint,
  });
  console.info(
    `[PASS] ${associationEvidence.checked.join(" and ")} verified for ${origin}.`,
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

  for (const [path, expectedHeading] of pages) {
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
    if (!html.includes(`rel="canonical" href="${canonicalOrigin}/api/legal/`)) {
      throw new Error(
        `${path} did not publish a canonical URL on the confirmed origin.`,
      );
    }
  }

  console.info(
    `Release verification: PASS — ${version.releaseId} at ${origin} from source tree ${expectedTree}.`,
  );
}

main().catch((error) => {
  console.error(
    `Release verification: FAIL — ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
