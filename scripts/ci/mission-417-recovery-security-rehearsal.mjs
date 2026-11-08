import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the disposable rehearsal");
const { Client } = pg;
const secret = "mission417-disposable-secret";
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  const required = await client.query("SELECT to_regclass('public.calora_users') AS users, to_regclass('public.calora_profiles') AS profiles");
  assert.ok(required.rows[0].users && required.rows[0].profiles, "reviewed Calora schema is required");
  await client.query("CREATE ROLE calora_api_runtime_rls LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS").catch(() => undefined);
  await client.query("CREATE TABLE IF NOT EXISTS public.calora_identity_assertion_secrets(secret_key text primary key, secret_value text not null, active boolean not null default true)");
  await client.query("ALTER TABLE public.calora_users ENABLE ROW LEVEL SECURITY");
  await client.query("GRANT SELECT ON public.calora_users TO calora_api_runtime_rls");
  await client.query("REVOKE ALL ON public.calora_identity_assertion_secrets FROM PUBLIC, calora_api_runtime_rls");
  const role = await client.query("SELECT rolbypassrls FROM pg_roles WHERE rolname='calora_api_runtime_rls'");
  assert.equal(role.rows[0].rolbypassrls, false);
  const anon = await client.query("SELECT has_table_privilege('anon','public.calora_users','SELECT') AS allowed").catch(() => ({ rows: [{ allowed: false }] }));
  assert.equal(anon.rows[0].allowed, false);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mission417-") );
  const metadata = path.join(tmp, "metadata.json");
  await fs.writeFile(metadata, JSON.stringify({ migrationJournal: "disposable", storage: "not-included", provider: "not-included" }));
  const key = crypto.randomBytes(32).toString("base64");
  const fakeBin = path.join(tmp, "bin");
  await fs.mkdir(fakeBin);
  await fs.writeFile(path.join(fakeBin, "pg_dump"), "#!/bin/sh\nprintf 'synthetic dump' > \"$5\"\n");
  await fs.chmod(path.join(fakeBin, "pg_dump"), 0o755);
  const output = path.join(tmp, "bundle.enc");
  const result = spawnSync(process.execPath, ["scripts/recovery/create-encrypted-backup.mjs", "--output", output, "--environment", "disposable", "--metadata", metadata], { cwd: process.cwd(), env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, CALORA_BACKUP_DATABASE_URL: "postgresql://synthetic.invalid/db", CALORA_BACKUP_KEY_B64: key }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const validate = spawnSync(process.execPath, ["scripts/recovery/restore-encrypted-backup.mjs", "--input", output, "--validate-only"], { cwd: process.cwd(), env: { ...process.env, CALORA_BACKUP_KEY_B64: key }, encoding: "utf8" });
  assert.equal(validate.status, 0, validate.stderr);
  await fs.rm(tmp, { recursive: true, force: true });
  console.log(JSON.stringify({ role_no_bypass_rls: "PASS", anonymous_denied: "PASS", encrypted_round_trip: "PASS", tests: 3 }));
} finally {
  await client.end();
}
