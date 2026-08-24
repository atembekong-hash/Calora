import { createHash, createPublicKey, verify } from "node:crypto";

export const PROVIDER_ATTESTATION_SCHEMA_VERSION = "calora.provider-package-attestation.v1";
export const SHA256 = /^[0-9a-f]{64}$/i;

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isCanonicalHttpsUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.toString() === value
    );
  } catch {
    return false;
  }
}

function isCanonicalHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.origin === value
    );
  } catch {
    return false;
  }
}

export function isValidProviderPackageAttestation(attestation) {
  return (
    attestation &&
    attestation.schemaVersion === PROVIDER_ATTESTATION_SCHEMA_VERSION &&
    nonEmptyString(attestation.attestationId) &&
    nonEmptyString(attestation.provider) &&
    nonEmptyString(attestation.deployment?.id) &&
    isCanonicalHttpsOrigin(attestation.deployment?.targetOrigin) &&
    attestation.package?.format === "calora-api-deployment-artifact-directory.v1" &&
    SHA256.test(attestation.package?.sha256 ?? "") &&
    nonEmptyString(attestation.immutableRecord?.uri) &&
    isCanonicalHttpsUrl(attestation.immutableRecord.uri) &&
    typeof attestation.issuedAt === "string" &&
    !Number.isNaN(Date.parse(attestation.issuedAt))
  );
}

export function providerPublicKeyFingerprint(publicKey) {
  const parsed = createPublicKey(publicKey);
  if (parsed.asymmetricKeyType !== "ed25519") {
    throw new Error("Provider attestation public key must be Ed25519.");
  }
  return createHash("sha256")
    .update(parsed.export({ type: "spki", format: "der" }))
    .digest("hex");
}

export function verifyProviderPackageAttestation({
  attestationText,
  signature,
  publicKey,
  trustedPublicKeyFingerprint,
  expectedPackageSha256,
  expectedDeploymentId,
  expectedTargetOrigin,
}) {
  if (!SHA256.test(trustedPublicKeyFingerprint ?? "")) {
    throw new Error("Pinned provider public-key fingerprint must be SHA-256.");
  }
  if (!SHA256.test(expectedPackageSha256 ?? "")) {
    throw new Error("Expected final-package digest must be SHA-256.");
  }

  const attestation = JSON.parse(attestationText);
  if (!isValidProviderPackageAttestation(attestation)) {
    throw new Error("Provider package attestation has an invalid or unsupported shape.");
  }
  const canonicalAttestation = canonicalJson(attestation);
  if (attestationText !== `${canonicalAttestation}\n`) {
    throw new Error("Provider package attestation is not canonical JSON.");
  }

  const keyFingerprint = providerPublicKeyFingerprint(publicKey);
  if (keyFingerprint !== trustedPublicKeyFingerprint.toLowerCase()) {
    throw new Error("Provider attestation signer does not match the pinned provider trust anchor.");
  }
  const parsedPublicKey = createPublicKey(publicKey);
  if (!verify(null, Buffer.from(canonicalAttestation, "utf8"), parsedPublicKey, Buffer.from(signature.trim(), "base64"))) {
    throw new Error("Provider package attestation signature is invalid.");
  }
  if (attestation.package.sha256.toLowerCase() !== expectedPackageSha256.toLowerCase()) {
    throw new Error("Provider package attestation does not identify the staged final package.");
  }
  if (expectedDeploymentId && attestation.deployment.id !== expectedDeploymentId) {
    throw new Error("Provider package attestation deployment identity does not match the expected deployment.");
  }
  if (expectedTargetOrigin && attestation.deployment.targetOrigin !== expectedTargetOrigin) {
    throw new Error("Provider package attestation target origin does not match the expected production origin.");
  }

  return {
    attestation,
    canonicalAttestation,
    attestationSha256: createHash("sha256").update(attestationText, "utf8").digest("hex"),
    signatureSha256: createHash("sha256").update(signature, "utf8").digest("hex"),
    publicKeySha256: createHash("sha256").update(publicKey, "utf8").digest("hex"),
    signerPublicKeySha256: keyFingerprint,
  };
}