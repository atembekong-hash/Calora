import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  canonicalJson,
  providerPublicKeyFingerprint,
} from "./lib/provider-package-attestation.mjs";

const verifier = path.join(path.dirname(fileURLToPath(import.meta.url)), "verify-api-release.mjs");
let fixture;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function signedText(value, privateKey) {
  const text = `${canonicalJson(value)}\n`;
  return { text, signature: sign(null, Buffer.from(text.trim()), privateKey).toString("base64") };
}

function createSelfSignedCertificate(certificateDirectory, commonName = "localhost") {
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-keyout", path.join(certificateDirectory, "key.pem"),
    "-out", path.join(certificateDirectory, "cert.pem"),
    "-subj", `/CN=${commonName}`,
  ], { stdio: "ignore" });
}

function createExpiredCertificate(certificateDirectory) {
  const rootKey = path.join(certificateDirectory, "root-key.pem");
  const rootCert = path.join(certificateDirectory, "root-cert.pem");
  const leafKey = path.join(certificateDirectory, "key.pem");
  const leafRequest = path.join(certificateDirectory, "leaf.csr");
  const database = path.join(certificateDirectory, "index.txt");
  const serial = path.join(certificateDirectory, "serial");
  const newCertificates = path.join(certificateDirectory, "new-certs");
  const config = path.join(certificateDirectory, "openssl.cnf");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "365",
    "-keyout", rootKey, "-out", rootCert, "-subj", "/CN=Calora test root",
  ], { stdio: "ignore" });
  execFileSync("openssl", [
    "req", "-newkey", "rsa:2048", "-nodes",
    "-keyout", leafKey, "-out", leafRequest, "-subj", "/CN=localhost",
  ], { stdio: "ignore" });
  execFileSync("mkdir", ["-p", newCertificates]);
  execFileSync("sh", ["-c", `: > "${database}"; echo 1000 > "${serial}"`]);
  execFileSync("sh", ["-c", `cat > "${config}" <<'EOF'
[ ca ]
default_ca = CA_default
[ CA_default ]
database = ${database}
serial = ${serial}
new_certs_dir = ${newCertificates}
default_md = sha256
policy = policy_any
[ policy_any ]
commonName = supplied
EOF`]);
  execFileSync("openssl", [
    "ca", "-batch", "-config", config, "-cert", rootCert, "-keyfile", rootKey,
    "-in", leafRequest, "-out", path.join(certificateDirectory, "cert.pem"),
    "-startdate", "20200101000000Z", "-enddate", "20210101000000Z",
  ], { stdio: "ignore" });
  return rootCert;
}

async function createFixture({ hostname = "localhost", certificate = createSelfSignedCertificate } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "calora-release-verifier-"));
  const certificateDirectory = path.join(root, "certificate");
  const evidenceDirectory = path.join(root, "approval-records");
  const inputDirectory = path.join(root, "signed-input");
  await Promise.all([
    (async () => {
      const { mkdir } = await import("node:fs/promises");
      await Promise.all([mkdir(certificateDirectory), mkdir(evidenceDirectory), mkdir(inputDirectory)]);
    })(),
  ]);
  const trustCertificate = certificate(certificateDirectory);

  const [key, cert] = await Promise.all([
    readFile(path.join(certificateDirectory, "key.pem")),
    readFile(path.join(certificateDirectory, "cert.pem")),
  ]);
  let mode = "valid";
  const server = https.createServer({ key, cert }, (request, response) => {
    if (mode === "redirect") {
      response.writeHead(302, { location: "https://example.invalid/api/version" });
      response.end();
      return;
    }
    if (request.url === "/api/healthz") {
      response.writeHead(mode === "unhealthy" ? 503 : 200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: mode !== "unhealthy" }));
      return;
    }
    if (request.url === "/api/version") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        releaseId: mode === "version-mismatch" ? "forged-release" : "release-123",
        gitCommit: "a".repeat(40),
        sourceTree: "b".repeat(40),
        sourceDigest: "c".repeat(64),
      }));
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const targetOrigin = `https://${hostname}:${server.address().port}`;
  const { privateKey: providerPrivateKey, publicKey: providerPublicKey } = generateKeyPairSync("ed25519");
  const providerPublicKeyText = providerPublicKey.export({ type: "spki", format: "pem" });
  const providerAttestation = {
    schemaVersion: "calora.provider-package-attestation.v1",
    attestationId: "provider-record-123",
    provider: "trusted-publisher",
    deployment: { id: "deploy-123", targetOrigin },
    package: { format: "calora-api-deployment-artifact-directory.v1", sha256: "d".repeat(64) },
    immutableRecord: { uri: "https://publisher.example/records/provider-record-123" },
    issuedAt: "2026-08-24T12:00:00.000Z",
  };
  const signedProvider = signedText(providerAttestation, providerPrivateKey);
  const { privateKey: releasePrivateKey, publicKey: releasePublicKey } = generateKeyPairSync("ed25519");
  const releasePublicKeyText = releasePublicKey.export({ type: "spki", format: "pem" });
  const releaseFingerprint = providerPublicKeyFingerprint(releasePublicKeyText);
  const providerFingerprint = providerPublicKeyFingerprint(providerPublicKeyText);
  const manifest = {
    schemaVersion: "calora.artifact-provenance.v1",
    releaseId: "release-123",
    issuedAt: "2026-08-24T12:00:00.000Z",
    source: { gitCommit: "a".repeat(40), sourceTree: "b".repeat(40), sourceDigest: "c".repeat(64) },
    artifact: { sha256: "d".repeat(64), format: "calora-api-deployment-artifact-directory.v1", files: [] },
    signingKeyFingerprint: releaseFingerprint,
    sensitiveActivationEligible: true,
    providerPackageAttestation: {
      attestationId: providerAttestation.attestationId,
      provider: providerAttestation.provider,
      deployment: providerAttestation.deployment,
      attestationSha256: sha256(signedProvider.text),
      signatureSha256: sha256(signedProvider.signature),
      signerPublicKeySha256: providerPublicKeyFingerprint(providerPublicKeyText),
    },
  };
  const signedManifest = signedText(manifest, releasePrivateKey);
  const files = {
    manifest: path.join(inputDirectory, "manifest.json"),
    signature: path.join(inputDirectory, "manifest.sig"),
    publicKey: path.join(inputDirectory, "release.pub"),
    providerAttestation: path.join(inputDirectory, "provider.json"),
    providerSignature: path.join(inputDirectory, "provider.sig"),
    providerPublicKey: path.join(inputDirectory, "provider.pub"),
  };
  await Promise.all([
    writeFile(files.manifest, signedManifest.text),
    writeFile(files.signature, signedManifest.signature),
    writeFile(files.publicKey, releasePublicKeyText),
    writeFile(files.providerAttestation, signedProvider.text),
    writeFile(files.providerSignature, signedProvider.signature),
    writeFile(files.providerPublicKey, providerPublicKeyText),
  ]);
  return {
    root, evidenceDirectory, files, releaseFingerprint, providerFingerprint, targetOrigin,
    trustCertificate: trustCertificate ?? path.join(certificateDirectory, "cert.pem"),
    setMode(nextMode) { mode = nextMode; },
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

function run({
  evidencePath,
  deploymentId = "deploy-123",
  targetOrigin = fixture.targetOrigin,
  liveUrl = fixture.targetOrigin,
  productionTls = false,
  trustCertificate,
} = {}) {
  const args = [
    verifier, "--manifest", fixture.files.manifest, "--signature", fixture.files.signature,
    "--public-key", fixture.files.publicKey, "--trusted-public-key-sha256", fixture.releaseFingerprint,
    "--provider-attestation", fixture.files.providerAttestation, "--provider-signature", fixture.files.providerSignature,
    "--provider-public-key", fixture.files.providerPublicKey,
    "--trusted-provider-public-key-sha256", fixture.providerFingerprint,
    "--provider-deployment-id", deploymentId, "--target-origin", targetOrigin,
    "--live-url", liveUrl, "--evidence-file", evidencePath,
  ];
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (productionTls) {
      delete env.NODE_TLS_REJECT_UNAUTHORIZED;
      if (trustCertificate) {
        env.NODE_EXTRA_CA_CERTS = trustCertificate;
      } else {
        delete env.NODE_EXTRA_CA_CERTS;
      }
    } else {
      env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    const child = spawn(process.execPath, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

async function assertNoApproval(result, evidencePath) {
  assert.equal(result.status, 1, result.stderr);
  await assert.rejects(readFile(evidencePath));
}

before(async () => { fixture = await createFixture(); });
after(async () => {
  await fixture.close();
  await rm(fixture.root, { recursive: true, force: true });
});

describe("verify-api-release CLI", () => {
  it("retains a verification record for signed evidence and matching live service", async () => {
    const evidencePath = path.join(fixture.evidenceDirectory, "valid.json");
    const result = await run({ evidencePath });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    const record = JSON.parse(await readFile(evidencePath, "utf8"));
    assert.equal(output.verified, true);
    assert.equal(record.releaseId, "release-123");
    assert.equal(record.liveChecks.versionStatus, 200);
    assert.equal(record.liveChecks.healthStatus, 200);
    assert.equal(output.evidence.recordPath, evidencePath);
    assert.equal(record.verified, true);
  });

  it("accepts a valid certificate trusted by the production invocation", async () => {
    const evidencePath = path.join(fixture.evidenceDirectory, "trusted.json");
    const result = await run({
      evidencePath,
      productionTls: true,
      trustCertificate: fixture.trustCertificate,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(await readFile(evidencePath, "utf8")).verified, true);
  });

  it("fails closed without a trusted certificate before writing approval evidence", async () => {
    const evidencePath = path.join(fixture.evidenceDirectory, "untrusted.json");
    await assertNoApproval(await run({ evidencePath, productionTls: true }), evidencePath);
  });

  it("fails closed for expired and hostname-mismatched certificates before writing approval evidence", async () => {
    const expired = await createFixture({ certificate: createExpiredCertificate });
    const mismatch = await createFixture({ hostname: "127.0.0.1" });
    const originalFixture = fixture;
    try {
      const expiredEvidence = path.join(expired.evidenceDirectory, "expired.json");
      fixture = expired;
      await assertNoApproval(await run({
        evidencePath: expiredEvidence,
        productionTls: true,
        trustCertificate: expired.trustCertificate,
      }), expiredEvidence);

      const mismatchEvidence = path.join(mismatch.evidenceDirectory, "hostname-mismatch.json");
      fixture = mismatch;
      await assertNoApproval(await run({
        evidencePath: mismatchEvidence,
        productionTls: true,
        trustCertificate: mismatch.trustCertificate,
      }), mismatchEvidence);
    } finally {
      await Promise.all([expired.close(), mismatch.close()]);
      await Promise.all([
        rm(expired.root, { recursive: true, force: true }),
        rm(mismatch.root, { recursive: true, force: true }),
      ]);
      fixture = originalFixture;
    }
  });

  it("blocks tampered manifests and mismatched provider deployment identity or origin before approval", async () => {
    const original = await readFile(fixture.files.manifest, "utf8");
    await writeFile(fixture.files.manifest, original.replace("release-123", "forged-release"));
    await assertNoApproval(await run({ evidencePath: path.join(fixture.evidenceDirectory, "forged.json") }), path.join(fixture.evidenceDirectory, "forged.json"));
    await writeFile(fixture.files.manifest, original);

    const deploymentEvidence = path.join(fixture.evidenceDirectory, "wrong-deployment.json");
    await assertNoApproval(await run({ evidencePath: deploymentEvidence, deploymentId: "deploy-forged" }), deploymentEvidence);
    const originEvidence = path.join(fixture.evidenceDirectory, "wrong-origin.json");
    await assertNoApproval(await run({ evidencePath: originEvidence, targetOrigin: "https://localhost:444" }), originEvidence);
  });

  it("blocks redirects, version drift, and unhealthy live endpoints before approval", async () => {
    for (const mode of ["redirect", "version-mismatch", "unhealthy"]) {
      fixture.setMode(mode);
      const evidencePath = path.join(fixture.evidenceDirectory, `${mode}.json`);
      await assertNoApproval(await run({ evidencePath }), evidencePath);
    }
    fixture.setMode("valid");
  });

  it("rejects a pre-existing protected approval record without overwriting it", async () => {
    const evidencePath = path.join(fixture.evidenceDirectory, "protected.json");
    const protectedRecord = "retain this approval record\n";
    await writeFile(evidencePath, protectedRecord);
    const result = await run({ evidencePath });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(await readFile(evidencePath, "utf8"), protectedRecord);
  });
});