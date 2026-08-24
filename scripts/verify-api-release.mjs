#!/usr/bin/env node
/**
 * Pre-activation release verifier.
 *
 * The trusted deployment digest must come from the deployment control plane,
 * image registry, or an independently downloaded final artifact. It is
 * deliberately not accepted from /api/version: a replaced artifact can lie
 * about its own identity.
 */
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";

const SHA256 = /^[0-9a-f]{64}$/i;
const FULL_SHA = /^[0-9a-f]{40}$/i;

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    "Usage: node scripts/verify-api-release.mjs --manifest <file> --signature <file> --public-key <file> --trusted-public-key-sha256 <sha256> --trusted-deployment-digest <sha256> --live-url <https-url>",
  );
  process.exit(2);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) usage(`Missing ${name}.`);
  return process.argv[index + 1];
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function validManifest(manifest) {
  return manifest &&
    manifest.schemaVersion === "calora.artifact-provenance.v1" &&
    typeof manifest.releaseId === "string" &&
    typeof manifest.issuedAt === "string" &&
    !Number.isNaN(Date.parse(manifest.issuedAt)) &&
    FULL_SHA.test(manifest.source?.gitCommit ?? "") &&
    FULL_SHA.test(manifest.source?.sourceTree ?? "") &&
    SHA256.test(manifest.source?.sourceDigest ?? "") &&
    SHA256.test(manifest.artifact?.sha256 ?? "") &&
    manifest.artifact?.format === "calora-api-deployment-artifact-directory.v1" &&
    SHA256.test(manifest.signingKeyFingerprint ?? "") &&
    Array.isArray(manifest.artifact?.files);
}

async function main() {
  const manifestPath = argument("--manifest");
  const signaturePath = argument("--signature");
  const publicKeyPath = argument("--public-key");
  const trustedPublicKeyFingerprint = argument("--trusted-public-key-sha256").toLowerCase();
  const trustedDeploymentDigest = argument("--trusted-deployment-digest").toLowerCase();
  const liveUrl = argument("--live-url").replace(/\/$/, "");
  if (!SHA256.test(trustedPublicKeyFingerprint)) usage("Trusted public key fingerprint must be SHA-256.");
  if (!SHA256.test(trustedDeploymentDigest)) usage("Trusted deployment digest must be SHA-256.");
  if (!liveUrl.startsWith("https://")) usage("Live URL must use HTTPS.");

  const [manifestText, signature, publicKey] = await Promise.all([
    readFile(manifestPath, "utf8"),
    readFile(signaturePath, "utf8"),
    readFile(publicKeyPath, "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  if (!validManifest(manifest)) throw new Error("Manifest has an invalid or unsupported shape.");
  const canonicalManifest = canonicalJson(manifest);
  if (manifestText !== `${canonicalManifest}\n`) {
    throw new Error("Manifest is not canonical JSON; refusing ambiguous signed data.");
  }
  const parsedPublicKey = createPublicKey(publicKey);
  if (parsedPublicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("Trusted release public key must be Ed25519.");
  }
  const actualPublicKeyFingerprint = createHash("sha256")
    .update(parsedPublicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
  if (
    actualPublicKeyFingerprint !== trustedPublicKeyFingerprint ||
    actualPublicKeyFingerprint !== manifest.signingKeyFingerprint.toLowerCase()
  ) {
    throw new Error("Release signing key does not match the independently pinned trusted key.");
  }
  if (!verify(null, Buffer.from(canonicalManifest, "utf8"), parsedPublicKey, Buffer.from(signature.trim(), "base64"))) {
    throw new Error("External manifest signature is invalid.");
  }
  if (manifest.artifact.sha256.toLowerCase() !== trustedDeploymentDigest) {
    throw new Error("Trusted deployment artifact digest does not match the signed manifest.");
  }

  const liveOrigin = new URL(liveUrl).origin;
  const fetchLive = async (path) => {
    const response = await fetch(`${liveUrl}${path}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.type === "opaqueredirect" || new URL(response.url).origin !== liveOrigin || !response.url.startsWith("https://")) {
      throw new Error("Live endpoint redirected or left the HTTPS deployment origin.");
    }
    return response;
  };
  const [versionResponse, healthResponse] = await Promise.all([
    fetchLive("/api/version"),
    fetchLive("/api/healthz"),
  ]);
  if (!versionResponse.ok) throw new Error(`Live version endpoint failed with ${versionResponse.status}.`);
  if (!healthResponse.ok) throw new Error(`Live health endpoint failed with ${healthResponse.status}.`);
  const version = await versionResponse.json();
  for (const key of ["releaseId", "gitCommit", "sourceTree", "sourceDigest"]) {
    const expected = key === "gitCommit" || key === "sourceTree" || key === "sourceDigest"
      ? manifest.source[key]
      : manifest[key];
    if (version[key] !== expected) throw new Error(`Live version ${key} does not match the signed manifest.`);
  }

  console.log(JSON.stringify({
    verified: true,
    releaseId: manifest.releaseId,
    artifactSha256: manifest.artifact.sha256,
    gitCommit: manifest.source.gitCommit,
    sourceTree: manifest.source.sourceTree,
  }));
}

main().catch((error) => {
  console.error(`Release verification failed: ${error.message}`);
  process.exit(1);
});