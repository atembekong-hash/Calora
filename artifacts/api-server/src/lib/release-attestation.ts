/**
 * These constants are replaced by build.mjs while bundling. They deliberately
 * have inert sentinels in source so an unbuilt source import can never pretend
 * to be an attested release.
 */
declare const __RELEASE_GIT_COMMIT__: string;
declare const __RELEASE_SOURCE_TREE__: string;
declare const __RELEASE_SOURCE_DIGEST__: string;
declare const __RELEASE_BUILD_TIMESTAMP__: string;
declare const __RELEASE_ID__: string;

// `typeof` keeps unbundled TypeScript test imports safe: absent build constants
// resolve to empty values and therefore fail closed below.
const compiledValue = (value: unknown): string =>
  typeof value === "string" ? value : "";

const rawReleaseAttestation = {
  schemaVersion: "calora.release-attestation.v1",
  gitCommit: compiledValue(typeof __RELEASE_GIT_COMMIT__ === "string" ? __RELEASE_GIT_COMMIT__ : ""),
  sourceTree: compiledValue(typeof __RELEASE_SOURCE_TREE__ === "string" ? __RELEASE_SOURCE_TREE__ : ""),
  sourceDigest: compiledValue(typeof __RELEASE_SOURCE_DIGEST__ === "string" ? __RELEASE_SOURCE_DIGEST__ : ""),
  buildTimestamp: compiledValue(typeof __RELEASE_BUILD_TIMESTAMP__ === "string" ? __RELEASE_BUILD_TIMESTAMP__ : ""),
  releaseId: compiledValue(typeof __RELEASE_ID__ === "string" ? __RELEASE_ID__ : ""),
} as const;

export type ReleaseAttestation = typeof rawReleaseAttestation;

const FULL_SHA = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const RELEASE_ID = /^calora-api-[0-9a-f]{12}-\d{14,17}$/i;

function isCompiledAttestation(value: ReleaseAttestation): boolean {
  return (
    FULL_SHA.test(value.gitCommit) &&
    FULL_SHA.test(value.sourceTree) &&
    SHA256.test(value.sourceDigest) &&
    RELEASE_ID.test(value.releaseId) &&
    !Number.isNaN(Date.parse(value.buildTimestamp))
  );
}

/**
 * This is compiled into the bundle, never read from process.env or a request.
 * A runtime environment cannot replace the identity of an already-built API.
 */
export const releaseAttestation: Readonly<ReleaseAttestation> | null =
  isCompiledAttestation(rawReleaseAttestation)
    ? Object.freeze(rawReleaseAttestation)
    : null;