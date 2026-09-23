#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MANIFEST_SCHEMA = "calora.database-source-provenance.v1";
const API_DATABASE_PLANE = "calora-api-postgresql-source";
const SUPABASE_AUTH_PLANE = "supabase-auth-control-plane-source";

function fail(message) {
  throw new Error(`[db-source-provenance] ${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortedFiles(root, relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const walk = (current) =>
    readdirSync(current, { withFileTypes: true })
      .flatMap((entry) => {
        const child = path.join(current, entry.name);
        return entry.isDirectory() ? walk(child) : [child];
      })
      .sort();
  return walk(directory).map((absolute) => path.relative(root, absolute).split(path.sep).join("/"));
}

function fileRecord(root, relativePath) {
  const content = readFileSync(path.join(root, relativePath));
  return { path: relativePath, sha256: sha256(content) };
}

function git(root, args) {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  } catch {
    fail(`git ${args.join(" ")} failed.`);
  }
}

export function createDatabaseSourceProvenance({ root = process.cwd(), gitRead = git } = {}) {
  const journalPath = "lib/db/migrations/meta/_journal.json";
  const journal = JSON.parse(readFileSync(path.join(root, journalPath), "utf8"));
  if (journal?.dialect !== "postgresql" || !Array.isArray(journal?.entries)) {
    fail("migration journal is malformed.");
  }
  const entries = journal.entries.map((entry, index) => {
    if (entry?.idx !== index || !/^\d{4}_[a-z0-9_]+$/.test(String(entry?.tag ?? ""))) {
      fail("migration journal entries must be ordered, indexed, and named.");
    }
    const migrationPath = `lib/db/migrations/${entry.tag}.sql`;
    return { idx: entry.idx, tag: entry.tag, ...fileRecord(root, migrationPath) };
  });

  const apiPaths = [
    "lib/db/drizzle.config.ts",
    journalPath,
    ...entries.map((entry) => entry.path),
    "lib/db/src/migrate.ts",
    "lib/db/src/provision-support-objects.ts",
    "scripts/post-merge.sh",
    ...sortedFiles(root, "lib/db/src/schema"),
  ].sort();
  const apiFiles = apiPaths.map((relativePath) => fileRecord(root, relativePath));
  const supabaseFiles = sortedFiles(root, "supabase/migrations").map((relativePath) =>
    fileRecord(root, relativePath),
  );
  const commitSha = gitRead(root, ["rev-parse", "HEAD"]);
  const treeSha = gitRead(root, ["rev-parse", "HEAD^{tree}"]);
  if (!/^[0-9a-f]{40}$/.test(commitSha) || !/^[0-9a-f]{40}$/.test(treeSha)) {
    fail("repository commit or tree is malformed.");
  }

  const apiPayload = { plane: API_DATABASE_PLANE, files: apiFiles, journal: entries };
  const supabasePayload = {
    plane: SUPABASE_AUTH_PLANE,
    doesNotAttestApiDatabase: true,
    files: supabaseFiles,
  };
  return {
    schemaVersion: MANIFEST_SCHEMA,
    gitCommit: commitSha,
    sourceTree: treeSha,
    apiDatabase: {
      ...apiPayload,
      sha256: sha256(JSON.stringify(apiPayload)),
    },
    supabaseAuthControlPlane: {
      ...supabasePayload,
      sha256: sha256(JSON.stringify(supabasePayload)),
    },
  };
}

function main(args = process.argv.slice(2)) {
  if (args.length !== 1) fail("usage: verify-db-source-provenance.mjs <output-path>");
  const manifest = createDatabaseSourceProvenance();
  writeFileSync(args[0], `${JSON.stringify(manifest)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`[db-source-provenance] wrote source manifest for ${manifest.gitCommit}`);
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[db-source-provenance] unknown failure");
    process.exitCode = 1;
  }
}
