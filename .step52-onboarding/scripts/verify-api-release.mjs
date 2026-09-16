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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, realpath, writeFile } from "node:fs/promises";
import {
  canonicalJson,
  SHA256,
  verifyProviderPackageAttestation,
} from "./lib/provider-package-attestation.mjs";

const FULL_SHA = /^[0-9a-f]{40}$/i;
const workspaceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    "Usage: node scripts/verify-api-release.mjs --manifest <file> --signature <file> --public-key <file> --trusted-public-key-sha256 <sha256> --provider-attestation <file> --provider-signature <file> --provider-public-key <file> --trusted-provider-public-key-sha256 <sha256> --provider-deployment-id <id> --target-origin <https-url> --live-url <https-url> --evidence-file <absolute-external-file>",
  );
  process.exit(2);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) usage(`Missing ${name}.`);
  return process.argv[index + 1];
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
    Array.isArray(manifest.artifact?.files) &&
    manifest.sensitiveActivationEligible === true &&
    typeof manifest.providerPackageAttestation?.attestationId === "string" &&
    typeof manifest.providerPackageAttestation?.provider === "string" &&
    typeof manifest.providerPackageAttestation?.deployment?.id === "string" &&
    typeof manifest.providerPackageAttestation?.deployment?.targetOrigin === "string" &&
    SHA256.test(manifest.providerPackageAttestation?.attestationSha256 ?? "") &&
    SHA256.test(manifest.providerPackageAttestation?.signatureSha256 ?? "") &&
    SHA256.test(manifest.providerPackageAttestation?.signerPublicKeySha256 ?? "");
}

async function main() {
  const manifestPath = argument("--manifest");
  const signaturePath = argument("--signature");
  const publicKeyPath = argument("--public-key");
  const trustedPublicKeyFingerprint = argument("--trusted-public-key-sha256").toLowerCase();
  const providerAttestationPath = argument("--provider-attestation");
  const providerSignaturePath = argument("--provider-signature");
  const providerPublicKeyPath = argument("--provider-public-key");
  const trustedProviderPublicKeyFingerprint = argument("--trusted-provider-public-key-sha256").toLowerCase();
  const providerDeploymentId = argument("--provider-deployment-id");
  const targetOrigin = argument("--target-origin").replace(/\/$/, "");
  const liveUrl = argument("--live-url").replace(/\/$/, "");
  const evidencePath = argument("--evidence-file");
  if (!SHA256.test(trustedPublicKeyFingerprint)) usage("Trusted public key fingerprint must be SHA-256.");
  if (!SHA256.test(trustedProviderPublicKeyFingerprint)) usage("Trusted provider public-key fingerprint must be SHA-256.");
  if (!targetOrigin.startsWith("https://") || new URL(targetOrigin).origin !== targetOrigin) {
    usage("Target origin must be a canonical HTTPS origin.");
  }
  if (!liveUrl.startsWith("https://")) usage("Live URL must use HTTPS.");
  if (evidencePath && !path.isAbsolute(evidencePath)) {
    usage("Evidence file must be an absolute path in the protected external approval record.");
  }

  const [manifestText, signature, publicKey, providerAttestationText, providerSignature, providerPublicKey] = await Promise.all([
    readFile(manifestPath, "utf8"),
    readFile(signaturePath, "utf8"),
    readFile(publicKeyPath, "utf8"),
    readFile(providerAttestationPath, "utf8"),
    readFile(providerSignaturePath, "utf8"),
    readFile(providerPublicKeyPath, "utf8"),
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
  const providerVerification = verifyProviderPackageAttestation({
    attestationText: providerAttestationText,
    signature: providerSignature,
    publicKey: providerPublicKey,
    trustedPublicKeyFingerprint: trustedProviderPublicKeyFingerprint,
    expectedPackageSha256: manifest.artifact.sha256,
    expectedDeploymentId: providerDeploymentId,
    expectedTargetOrigin: targetOrigin,
  });
  const manifestProvider = manifest.providerPackageAttestation;
  if (
    providerVerification.attestation.attestationId !== manifestProvider.attestationId ||
    providerVerification.attestation.provider !== manifestProvider.provider ||
    providerVerification.attestationSha256 !== manifestProvider.attestationSha256 ||
    providerVerification.signatureSha256 !== manifestProvider.signatureSha256 ||
    providerVerification.signerPublicKeySha256 !== manifestProvider.signerPublicKeySha256 ||
    providerVerification.attestation.deployment.id !== manifestProvider.deployment.id ||
    providerVerification.attestation.deployment.targetOrigin !== manifestProvider.deployment.targetOrigin
  ) {
    throw new Error("Signed release manifest is not bound to the pinned provider package attestation.");
  }

  const liveOrigin = new URL(liveUrl).origin;
  if (liveOrigin !== targetOrigin) {
    throw new Error("Live URL origin does not match the provider-attested target origin.");
  }
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

  const result = {
    verified: true,
    verifiedAt: new Date().toISOString(),
    releaseId: manifest.releaseId,
    artifactSha256: manifest.artifact.sha256,
    gitCommit: manifest.source.gitCommit,
    sourceTree: manifest.source.sourceTree,
    sourceDigest: manifest.source.sourceDigest,
    signerPublicKeySha256: actualPublicKeyFingerprint,
    liveUrl,
    liveChecks: {
      versionStatus: versionResponse.status,
      healthStatus: healthResponse.status,
    },
    evidence: {
      manifestPath: path.resolve(manifestPath),
      manifestSha256: createHash("sha256").update(manifestText, "utf8").digest("hex"),
      signaturePath: path.resolve(signaturePath),
      signatureSha256: createHash("sha256").update(signature, "utf8").digest("hex"),
      publicKeyPath: path.resolve(publicKeyPath),
      publicKeySha256: createHash("sha256").update(publicKey, "utf8").digest("hex"),
      providerAttestationPath: path.resolve(providerAttestationPath),
      providerAttestationSha256: providerVerification.attestationSha256,
      providerSignaturePath: path.resolve(providerSignaturePath),
      providerSignatureSha256: providerVerification.signatureSha256,
      providerPublicKeyPath: path.resolve(providerPublicKeyPath),
      providerPublicKeySha256: providerVerification.publicKeySha256,
      providerSignerPublicKeySha256: providerVerification.signerPublicKeySha256,
      providerDeploymentId,
      targetOrigin,
      providerImmutableRecordUri: providerVerification.attestation.immutableRecord.uri,
    },
  };
  if (evidencePath) {
    const [canonicalWorkspaceDir, evidenceDirectory] = await Promise.all([
      realpath(workspaceDir),
      realpath(path.dirname(evidencePath)),
    ]);
    if (!path.relative(canonicalWorkspaceDir, evidenceDirectory).startsWith("..")) {
      throw new Error("Evidence file must resolve outside the deployable workspace.");
    }
    await writeFile(evidencePath, `${canonicalJson(result)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    result.evidence.recordPath = evidencePath;
  }
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(`Release verification failed: ${error.message}`);
  process.exit(1);
});