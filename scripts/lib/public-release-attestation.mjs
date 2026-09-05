const FULL_SHA = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const RELEASE_ID = /^calora-api-[0-9a-f]{12}-\d{14,17}$/i;

export const PUBLIC_RELEASE_ATTESTATION_SCHEMA =
  "calora.release-attestation.v1";

export function canonicalHttpsOrigin(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.origin !== value ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Published release URL must be a canonical HTTPS origin.");
  }
  return url.origin;
}

/**
 * Copy only the public, non-sensitive release identity exposed by /api/version.
 * This deliberately drops any future fields so deployment records cannot leak
 * into the aggregate monitor report.
 */
export function sanitizePublishedReleaseAttestation(value) {
  if (
    !value ||
    value.schemaVersion !== PUBLIC_RELEASE_ATTESTATION_SCHEMA ||
    !FULL_SHA.test(value.gitCommit ?? "") ||
    !FULL_SHA.test(value.sourceTree ?? "") ||
    !SHA256.test(value.sourceDigest ?? "") ||
    !RELEASE_ID.test(value.releaseId ?? "") ||
    typeof value.buildTimestamp !== "string" ||
    Number.isNaN(Date.parse(value.buildTimestamp))
  ) {
    throw new Error("Published API release attestation has an invalid shape.");
  }

  return {
    schemaVersion: PUBLIC_RELEASE_ATTESTATION_SCHEMA,
    gitCommit: value.gitCommit,
    sourceTree: value.sourceTree,
    sourceDigest: value.sourceDigest,
    buildTimestamp: value.buildTimestamp,
    releaseId: value.releaseId,
  };
}

export async function fetchPublishedReleaseAttestation(origin) {
  const canonicalOrigin = canonicalHttpsOrigin(origin);
  const response = await fetch(`${canonicalOrigin}/api/version`, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    headers: { "user-agent": "calora-public-release-verifier/1.0" },
  });
  if (
    response.type === "opaqueredirect" ||
    new URL(response.url).origin !== canonicalOrigin
  ) {
    throw new Error("Published release attestation redirected off the canonical origin.");
  }
  if (!response.ok) {
    throw new Error(`/api/version returned HTTP ${response.status}.`);
  }

  let value;
  try {
    value = await response.json();
  } catch {
    throw new Error("/api/version did not return valid JSON.");
  }
  return sanitizePublishedReleaseAttestation(value);
}