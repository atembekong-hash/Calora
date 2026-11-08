#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const VERSION = "calora.encrypted-backup.v1";
function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; }
const input = arg("--input")?.trim();
const validateOnly = process.argv.includes("--validate-only");
if (!input) throw new Error("--input is required");
if (!validateOnly && process.env.CALORA_RECOVERY_NONPRODUCTION !== "true") {
  throw new Error("Restore requires CALORA_RECOVERY_NONPRODUCTION=true; production restores are intentionally unsupported by this tool");
}
if (!validateOnly && process.env.CALORA_RECOVERY_TARGET_ACK !== "DISPOSABLE_EMPTY_NONPRODUCTION") {
  throw new Error("Restore requires CALORA_RECOVERY_TARGET_ACK=DISPOSABLE_EMPTY_NONPRODUCTION");
}
const encoded = process.env.CALORA_BACKUP_KEY_B64;
if (!encoded) throw new Error("CALORA_BACKUP_KEY_B64 is required");
const key = Buffer.from(encoded, "base64");
if (key.length !== 32) throw new Error("CALORA_BACKUP_KEY_B64 must decode to exactly 32 bytes");
const envelope = JSON.parse(await fs.readFile(input, "utf8"));
if (envelope.schemaVersion !== VERSION || envelope.algorithm !== "aes-256-gcm") throw new Error("Unsupported backup envelope");
const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64url"));
decipher.setAuthTag(Buffer.from(envelope.authTag, "base64url"));
const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64url")), decipher.final()]);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "calora-restore-"));
const tarPath = path.join(temp, "bundle.tar.gz");
const dumpPath = path.join(temp, "database.dump");
try {
  await fs.writeFile(tarPath, plaintext, { mode: 0o600 });
  const listing = await new Promise((resolve, reject) => {
    const child = spawn("tar", ["-tzf", tarPath], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (c) => { stdout += c.toString(); });
    child.stderr.on("data", (c) => { stderr += c.toString(); });
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(`tar listing failed: ${stderr}`)));
  });
  for (const member of listing.trim().split(/\r?\n/).filter(Boolean)) {
    if (path.isAbsolute(member) || member.split("/").includes("..") || !["database.dump", "manifest.json"].includes(member)) {
      throw new Error(`Unsafe archive member: ${member}`);
    }
  }
  await new Promise((resolve, reject) => {
    const child = spawn("tar", ["-xzf", tarPath, "-C", temp], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = ""; child.stderr.on("data", (c) => { stderr += c.toString(); });
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`tar failed: ${stderr}`)));
  });
  const manifest = JSON.parse(await fs.readFile(path.join(temp, "manifest.json"), "utf8"));
  if (manifest.schemaVersion !== VERSION) throw new Error("Unsupported manifest");
  const digest = crypto.createHash("sha256").update(await fs.readFile(path.join(temp, "manifest.json"))).digest("hex");
  if (digest !== envelope.manifestSha256) throw new Error("Manifest checksum mismatch");
  if (validateOnly) {
    console.log(JSON.stringify({ status: "validated", backupId: manifest.backupId, environment: manifest.environment, databaseSha256: manifest.database.sha256 }));
    process.exit(0);
  }
  const databaseUrl = process.env.CALORA_RECOVERY_DATABASE_URL;
  if (!databaseUrl) throw new Error("CALORA_RECOVERY_DATABASE_URL is required for restore");
  await new Promise((resolve, reject) => {
    const child = spawn("pg_restore", ["--exit-on-error", "--no-owner", "--no-privileges", "--dbname", databaseUrl, dumpPath], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = ""; child.stderr.on("data", (c) => { stderr += c.toString(); });
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`pg_restore failed: ${stderr.slice(-2000)}`)));
  });
  console.log(JSON.stringify({ status: "restored", backupId: manifest.backupId, environment: manifest.environment }));
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
