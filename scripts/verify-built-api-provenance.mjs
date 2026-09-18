#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const workspaceDir = process.cwd();
const artifactDir =
  process.argv[process.argv.indexOf("--artifact-dir") + 1] ||
  path.resolve(workspaceDir, "artifacts/api-server/dist");
const FULL_SHA = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const RELEASE_ID = /^calora-api-[0-9a-f]{12}-\d{14,17}$/i;

async function git(...args) {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceDir });
  return stdout.trim();
}

async function digestDirectory(directory) {
  const files = [];
  async function visit(relativePath = "") {
    const entries = await readdir(path.join(directory, relativePath), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const child = path.join(relativePath, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile() && child !== "release-provenance.json")
        files.push(child);
      else if (!entry.isFile())
        throw new Error(`Unsupported artifact entry: ${child}`);
    }
  }
  await visit();
  files.sort();
  const hash = createHash("sha256");
  const metadata = [];
  for (const relativePath of files) {
    const absolutePath = path.join(directory, relativePath);
    const [contents, info] = await Promise.all([
      readFile(absolutePath),
      stat(absolutePath),
    ]);
    const normalizedPath = relativePath.split(path.sep).join("/");
    const digest = createHash("sha256").update(contents).digest("hex");
    metadata.push({ path: normalizedPath, sha256: digest, size: info.size });
    hash.update(normalizedPath, "utf8");
    hash.update("\0");
    hash.update(String(info.size), "utf8");
    hash.update("\0");
    hash.update(contents);
  }
  return { sha256: hash.digest("hex"), files: metadata };
}

async function main() {
  const provenancePath = path.join(artifactDir, "release-provenance.json");
  const provenance = JSON.parse(await readFile(provenancePath, "utf8"));
  assert.equal(provenance.schemaVersion, "calora.build-provenance.v1");
  assert.match(provenance.releaseId, RELEASE_ID);
  assert.ok(!Number.isNaN(Date.parse(provenance.issuedAt)));
  assert.match(provenance.source.gitCommit, FULL_SHA);
  assert.match(provenance.source.sourceTree, FULL_SHA);
  assert.match(provenance.source.sourceDigest, SHA256);
  assert.match(provenance.artifact.sha256, SHA256);
  assert.equal(provenance.artifact.format, "calora-api-dist-directory.v1");
  assert.equal(typeof provenance.sensitiveActivationAllowed, "boolean");

  const [gitCommit, sourceTree] = await Promise.all([
    git("rev-parse", "HEAD"),
    git("rev-parse", "HEAD^{tree}"),
  ]);
  const sourceDigest = createHash("sha256")
    .update(`${gitCommit}\n${sourceTree}\n`, "utf8")
    .digest("hex");
  assert.equal(provenance.source.gitCommit, gitCommit);
  assert.equal(provenance.source.sourceTree, sourceTree);
  assert.equal(provenance.source.sourceDigest, sourceDigest);

  const artifact = await digestDirectory(artifactDir);
  assert.equal(provenance.artifact.sha256, artifact.sha256);
  assert.deepEqual(provenance.artifact.files, artifact.files);
  console.log(
    JSON.stringify({
      verified: true,
      releaseId: provenance.releaseId,
      gitCommit,
      sourceTree,
      sourceDigest,
      artifactSha256: artifact.sha256,
      sensitiveActivationAllowed: provenance.sensitiveActivationAllowed,
    }),
  );
}

main().catch((error) => {
  console.error(`Built API provenance verification failed: ${error.message}`);
  process.exit(1);
});
