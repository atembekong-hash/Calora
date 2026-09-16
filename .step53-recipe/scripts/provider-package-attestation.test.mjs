import { generateKeyPairSync, sign } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalJson,
  providerPublicKeyFingerprint,
  verifyProviderPackageAttestation,
} from "./lib/provider-package-attestation.mjs";

function signedFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const attestation = {
    schemaVersion: "calora.provider-package-attestation.v1",
    attestationId: "provider-record-123",
    provider: "trusted-publisher",
    deployment: { id: "deploy-123", targetOrigin: "https://api.calora.example" },
    package: {
      format: "calora-api-deployment-artifact-directory.v1",
      sha256: "a".repeat(64),
    },
    immutableRecord: { uri: "https://publisher.example/records/provider-record-123" },
    issuedAt: "2026-08-24T12:00:00.000Z",
  };
  const attestationText = `${canonicalJson(attestation)}\n`;
  return {
    attestationText,
    signature: sign(null, Buffer.from(attestationText.trim(), "utf8"), privateKey).toString("base64"),
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
  };
}

describe("provider package attestation", () => {
  it("accepts a pinned provider signature for the exact package, deployment, and origin", () => {
    const fixture = signedFixture();
    const result = verifyProviderPackageAttestation({
      ...fixture,
      trustedPublicKeyFingerprint: providerPublicKeyFingerprint(fixture.publicKey),
      expectedPackageSha256: "a".repeat(64),
      expectedDeploymentId: "deploy-123",
      expectedTargetOrigin: "https://api.calora.example",
    });
    assert.equal(result.attestation.attestationId, "provider-record-123");
  });

  for (const [name, override] of [
    ["wrong package", { expectedPackageSha256: "b".repeat(64) }],
    ["wrong deployment", { expectedDeploymentId: "deploy-other" }],
    ["wrong origin", { expectedTargetOrigin: "https://other.example" }],
    ["wrong trust anchor", { trustedPublicKeyFingerprint: "c".repeat(64) }],
  ]) it(`fails closed for a ${name}`, () => {
    const fixture = signedFixture();
    assert.throws(() => verifyProviderPackageAttestation({
      ...fixture,
      trustedPublicKeyFingerprint: providerPublicKeyFingerprint(fixture.publicKey),
      expectedPackageSha256: "a".repeat(64),
      expectedDeploymentId: "deploy-123",
      expectedTargetOrigin: "https://api.calora.example",
      ...override,
    }));
  });

  it("rejects non-canonical or tampered provider records", () => {
    const fixture = signedFixture();
    assert.throws(() => verifyProviderPackageAttestation({
      ...fixture,
      attestationText: `${fixture.attestationText}\n`,
      trustedPublicKeyFingerprint: providerPublicKeyFingerprint(fixture.publicKey),
      expectedPackageSha256: "a".repeat(64),
    }), /not canonical JSON/);
  });
});