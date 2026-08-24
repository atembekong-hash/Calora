import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { mkdir, readdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  canonicalJson,
  verifyProviderPackageAttestation,
} from "../../scripts/lib/provider-package-attestation.mjs";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(artifactDir, "../..");
const execFileAsync = promisify(execFile);
const MANIFEST_SCHEMA_VERSION = "calora.artifact-provenance.v1";

function isFullGitSha(value) {
  return /^[0-9a-f]{40}$/i.test(value);
}

async function git(...args) {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceDir });
  return stdout.trim();
}

async function getReleaseAttestation() {
  let gitCommit;
  let sourceTree;
  let dirty;
  try {
    [gitCommit, sourceTree, dirty] = await Promise.all([
      git("rev-parse", "HEAD"),
      git("rev-parse", "HEAD^{tree}"),
      // Production provenance must cover every source input. Ignoring
      // untracked files would allow a bundled route/module outside HEAD's tree
      // to be attested as though it belonged to the claimed revision.
      git("status", "--porcelain", "--untracked-files=all"),
    ]);
  } catch (error) {
    throw new Error("Release attestation requires a readable Git checkout.", { cause: error });
  }

  if (!isFullGitSha(gitCommit) || !isFullGitSha(sourceTree)) {
    throw new Error("Release attestation rejected malformed Git provenance.");
  }
  if (process.env.NODE_ENV === "production" && dirty) {
    throw new Error("Release attestation requires a clean production Git checkout.");
  }

  const buildTimestamp = new Date().toISOString();
  const sourceDigest = createHash("sha256")
    .update(`${gitCommit}\n${sourceTree}\n`, "utf8")
    .digest("hex");
  const releaseId = `calora-api-${gitCommit.slice(0, 12)}-${buildTimestamp.replace(/[-:.TZ]/g, "")}`;

  return { gitCommit, sourceTree, sourceDigest, buildTimestamp, releaseId };
}

async function digestDirectory(directory) {
  const files = [];
  async function visit(relativePath = "") {
    const entries = await readdir(path.join(directory, relativePath), { withFileTypes: true });
    for (const entry of entries) {
      const child = path.join(relativePath, entry.name);
      if (entry.isDirectory()) {
        await visit(child);
      } else if (entry.isFile()) {
        files.push(child);
      } else {
        throw new Error(`Release artifact contains unsupported entry: ${child}`);
      }
    }
  }
  await visit();
  files.sort();

  const hash = createHash("sha256");
  const artifactFiles = [];
  for (const relativePath of files) {
    const absolutePath = path.join(directory, relativePath);
    const [contents, info] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);
    const normalizedPath = relativePath.split(path.sep).join("/");
    const digest = createHash("sha256").update(contents).digest("hex");
    artifactFiles.push({ path: normalizedPath, sha256: digest, size: info.size });
    hash.update(normalizedPath, "utf8");
    hash.update("\0");
    hash.update(String(info.size), "utf8");
    hash.update("\0");
    hash.update(contents);
  }
  return { sha256: hash.digest("hex"), files: artifactFiles };
}

async function verifyStagedProviderPackage(release, artifact) {
  const requested = process.env.RELEASE_SENSITIVE_ACTIVATION_REQUESTED === "true";
  if (!requested) return null;
  if (process.env.NODE_ENV !== "production") {
    throw new Error("Sensitive release activation may only be requested in a production build.");
  }
  const fields = [
    "RELEASE_PROVIDER_ATTESTATION_FILE",
    "RELEASE_PROVIDER_ATTESTATION_SIGNATURE_FILE",
    "RELEASE_PROVIDER_ATTESTATION_PUBLIC_KEY_FILE",
    "RELEASE_PROVIDER_TRUSTED_PUBLIC_KEY_SHA256",
    "RELEASE_PROVIDER_DEPLOYMENT_ID",
    "RELEASE_PROVIDER_TARGET_ORIGIN",
  ];
  for (const field of fields) {
    if (!process.env[field]) throw new Error(`Sensitive release activation requires ${field}.`);
  }
  const fileFields = fields.slice(0, 3);
  for (const field of fileFields) {
    if (!path.isAbsolute(process.env[field])) {
      throw new Error(`${field} must be an absolute provider-retained path outside the workspace.`);
    }
  }
  const [attestationPath, signaturePath, publicKeyPath] = fileFields.map((field) => process.env[field]);
  const [canonicalWorkspaceDir, ...directories] = await Promise.all([
    realpath(workspaceDir),
    ...[attestationPath, signaturePath, publicKeyPath].map((file) => realpath(path.dirname(file))),
  ]);
  if (directories.some((directory) => !path.relative(canonicalWorkspaceDir, directory).startsWith(".."))) {
    throw new Error("Provider attestation evidence must resolve outside the deployable workspace.");
  }
  const [attestationText, signature, publicKey] = await Promise.all([
    readFile(attestationPath, "utf8"),
    readFile(signaturePath, "utf8"),
    readFile(publicKeyPath, "utf8"),
  ]);
  const verified = verifyProviderPackageAttestation({
    attestationText,
    signature,
    publicKey,
    trustedPublicKeyFingerprint: process.env.RELEASE_PROVIDER_TRUSTED_PUBLIC_KEY_SHA256,
    expectedPackageSha256: artifact.sha256,
    expectedDeploymentId: process.env.RELEASE_PROVIDER_DEPLOYMENT_ID,
    expectedTargetOrigin: process.env.RELEASE_PROVIDER_TARGET_ORIGIN,
  });
  return {
    ...verified,
    evidence: {
      attestationPath,
      signaturePath,
      publicKeyPath,
    },
  };
}

async function writeSignedExternalManifest(release, distDir) {
  const manifestDir = process.env.RELEASE_ATTESTATION_MANIFEST_DIR;
  const signingKey = process.env.RELEASE_ATTESTATION_SIGNING_KEY;
  const finalArtifactDir = process.env.RELEASE_ATTESTATION_ARTIFACT_DIR;
  // This build-time enrollment check detects an accidental signing-key swap.
  // The activation verifier must obtain its trusted fingerprint from the
  // separately controlled approval trust record, not from this environment.
  const expectedSigningKeyFingerprint = process.env.RELEASE_ATTESTATION_SIGNING_KEY_FINGERPRINT?.toLowerCase();
  const isProduction = process.env.NODE_ENV === "production";
  if (!manifestDir || !signingKey || (isProduction && (!finalArtifactDir || !expectedSigningKeyFingerprint))) {
    if (isProduction) {
      throw new Error(
        "Production release attestation requires RELEASE_ATTESTATION_MANIFEST_DIR, RELEASE_ATTESTATION_SIGNING_KEY, RELEASE_ATTESTATION_SIGNING_KEY_FINGERPRINT, and RELEASE_ATTESTATION_ARTIFACT_DIR.",
      );
    }
    return;
  }
  if (expectedSigningKeyFingerprint && !/^[0-9a-f]{64}$/.test(expectedSigningKeyFingerprint)) {
    throw new Error("Release attestation signing key fingerprint must be a SHA-256 value.");
  }

  if (!path.isAbsolute(manifestDir)) {
    throw new Error("Release attestation manifest directory must be an absolute path outside the deployable workspace.");
  }
  if (isProduction && !path.isAbsolute(finalArtifactDir)) {
    throw new Error("Production release attestation artifact directory must be an absolute final deployment staging path.");
  }
  // An immutable retention mount must be provisioned by the deployment control
  // plane. Creating a new production directory here could silently redirect
  // evidence to an unreviewed, mutable filesystem location.
  if (!isProduction) await mkdir(manifestDir, { recursive: true });
  const [outputDir, canonicalWorkspaceDir, artifactRoot] = await Promise.all([
    realpath(manifestDir),
    realpath(workspaceDir),
    realpath(finalArtifactDir || distDir),
  ]);
  if (!path.relative(canonicalWorkspaceDir, outputDir).startsWith("..")) {
    throw new Error("Release attestation manifest directory must resolve outside the deployable workspace.");
  }
  if (isProduction && !path.relative(canonicalWorkspaceDir, artifactRoot).startsWith("..")) {
    throw new Error("Release attestation artifact directory must resolve outside the deployable workspace.");
  }
  const artifact = await digestDirectory(artifactRoot);
  const providerPackage = await verifyStagedProviderPackage(release, artifact);
  const privateKey = createPrivateKey(signingKey);
  if (privateKey.asymmetricKeyType !== "ed25519") {
    throw new Error("Release attestation signing key must be an Ed25519 private key.");
  }
  const publicKey = createPublicKey(privateKey).export({ type: "spki", format: "pem" });
  const signingKeyFingerprint = createHash("sha256")
    .update(createPublicKey(privateKey).export({ type: "spki", format: "der" }))
    .digest("hex");
  if (expectedSigningKeyFingerprint && signingKeyFingerprint !== expectedSigningKeyFingerprint) {
    throw new Error("Release attestation signing key does not match the independently pinned fingerprint.");
  }
  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    releaseId: release.releaseId,
    issuedAt: release.buildTimestamp,
    signingKeyFingerprint,
    artifact: {
      // Production requires the deployment staging directory, including every
      // external runtime module. A dist-only digest is insufficient when Node
      // resolves native/external packages from the final deployment artifact.
      format: "calora-api-deployment-artifact-directory.v1",
      path: process.env.RELEASE_ATTESTATION_ARTIFACT_NAME || "deployment-artifact",
      sha256: artifact.sha256,
      files: artifact.files,
    },
    source: {
      gitCommit: release.gitCommit,
      sourceTree: release.sourceTree,
      sourceDigest: release.sourceDigest,
    },
    sensitiveActivationEligible: providerPackage !== null,
    ...(providerPackage ? {
      providerPackageAttestation: {
        attestationId: providerPackage.attestation.attestationId,
        provider: providerPackage.attestation.provider,
        deployment: providerPackage.attestation.deployment,
        immutableRecord: providerPackage.attestation.immutableRecord,
        issuedAt: providerPackage.attestation.issuedAt,
        attestationSha256: providerPackage.attestationSha256,
        signatureSha256: providerPackage.signatureSha256,
        signerPublicKeySha256: providerPackage.signerPublicKeySha256,
      },
    } : {}),
  };
  const canonicalManifest = canonicalJson(manifest);
  const signature = sign(null, Buffer.from(canonicalManifest, "utf8"), privateKey).toString("base64");
  const manifestPath = path.join(outputDir, `${release.releaseId}.manifest.json`);
  const signaturePath = path.join(outputDir, `${release.releaseId}.manifest.sig`);
  const publicKeyPath = path.join(outputDir, `${release.releaseId}.public-key.pem`);
  // Immutable evidence must never be replaced by a repeated build invocation.
  await Promise.all([
    writeFile(manifestPath, `${canonicalManifest}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(signaturePath, `${signature}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(publicKeyPath, publicKey, { encoding: "utf8", flag: "wx" }),
  ]);
}

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  const release = await getReleaseAttestation();
  await rm(distDir, { recursive: true, force: true });

  const sensitiveActivationRequested = process.env.RELEASE_SENSITIVE_ACTIVATION_REQUESTED === "true";
  if (sensitiveActivationRequested && process.env.NODE_ENV !== "production") {
    throw new Error("Sensitive release activation may only be requested in a production build.");
  }
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    define: {
      __RELEASE_GIT_COMMIT__: JSON.stringify(release.gitCommit),
      __RELEASE_SOURCE_TREE__: JSON.stringify(release.sourceTree),
      __RELEASE_SOURCE_DIGEST__: JSON.stringify(release.sourceDigest),
      __RELEASE_BUILD_TIMESTAMP__: JSON.stringify(release.buildTimestamp),
      __RELEASE_ID__: JSON.stringify(release.releaseId),
       // This repository can verify and retain provider-issued package evidence
       // for a rehearsal, but the configured Publishing service has no atomic
       // provider stage→attest→deploy contract yet. A mutable build request must
       // never enable the sensitive route; keep production traffic deny-all.
       __SENSITIVE_RELEASE_ACTIVATION_ALLOWED__: "false",
    },
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "@resvg/resvg-js",
      "@resvg/resvg-js-linux-x64-gnu",
      "@resvg/resvg-js-linux-arm64-gnu",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
  // This stays outside dist so replacing a deployed artifact cannot replace its
  // signed evidence at the same time. Production fails closed without an
  // externally retained signing location and key.
  await writeSignedExternalManifest(release, distDir);
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
