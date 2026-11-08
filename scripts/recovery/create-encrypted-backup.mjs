#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const VERSION = "calora.encrypted-backup.v1";
const REQUIRED_KEY_BYTES = 32;

function usage() {
  console.error("Usage: create-encrypted-backup.mjs --output <file> --environment <label> [--metadata <json>] [--storage-manifest <json>] [--provider-manifest <json>]");
  process.exitCode = 2;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function requireValue(name) {
  const value = arg(name)?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function rejectSecretLikeContent(value, source) {
  const text = JSON.stringify(value);
  if (/(password|secret|token|private[_-]?key|access[_-]?key|api[_-]?key|credential)/i.test(text)) {
    throw new Error(`${source} contains a secret-like field; provide only sanitized metadata`);
  }
}

async function readJson(file, label) {
  const value = JSON.parse(await fs.readFile(file, "utf8"));
  rejectSecretLikeContent(value, label);
  return value;
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} failed (${code}): ${stderr.slice(-1000)}`)));
  });
}

async function sha256(file) {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(file));
  return hash.digest("hex");
}

function keyFromEnvironment() {
  const encoded = process.env.CALORA_BACKUP_KEY_B64;
  if (!encoded) throw new Error("CALORA_BACKUP_KEY_B64 is required and must be supplied by the secret manager");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== REQUIRED_KEY_BYTES) throw new Error("CALORA_BACKUP_KEY_B64 must decode to exactly 32 bytes");
  return key;
}

const output = requireValue("--output");
const environment = requireValue("--environment");
const metadataPath = arg("--metadata");
const storageManifestPath = arg("--storage-manifest");
const providerManifestPath = arg("--provider-manifest");
if (!process.env.CALORA_BACKUP_DATABASE_URL && !process.env.PGHOST) {
  throw new Error("Provide CALORA_BACKUP_DATABASE_URL or standard PG* connection environment variables");
}
const key = keyFromEnvironment();
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "calora-backup-"));
const dumpPath = path.join(temp, "database.dump");
const tarPath = path.join(temp, "bundle.tar.gz");
try {
  await run("pg_dump", [
    "--format=custom", "--no-owner", "--no-privileges", "--file", dumpPath,
    ...(process.env.CALORA_BACKUP_DATABASE_URL ? [process.env.CALORA_BACKUP_DATABASE_URL] : []),
  ], process.env);
  const metadata = metadataPath ? await readJson(metadataPath, "metadata") : {};
  const storage = storageManifestPath ? await readJson(storageManifestPath, "storage manifest") : { status: "not-supplied" };
  const provider = providerManifestPath ? await readJson(providerManifestPath, "provider manifest") : { status: "not-supplied" };
  const manifest = {
    schemaVersion: VERSION,
    backupId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    environment,
    gitCommit: process.env.GITHUB_SHA || metadata.gitCommit || null,
    database: { format: "pg_dump-custom", sha256: await sha256(dumpPath) },
    storage,
    provider,
    metadata,
  };
  rejectSecretLikeContent(manifest, "generated manifest");
  await fs.writeFile(path.join(temp, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  await run("tar", ["-czf", tarPath, "-C", temp, "database.dump", "manifest.json"]);
  const plaintext = await fs.readFile(tarPath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const envelope = {
    schemaVersion: VERSION,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    manifestSha256: await sha256(path.join(temp, "manifest.json")),
  };
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true, mode: 0o700 });
  await fs.writeFile(output, `${JSON.stringify(envelope)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ schemaVersion: VERSION, output: path.resolve(output), backupId: manifest.backupId, createdAt: manifest.createdAt }));
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
