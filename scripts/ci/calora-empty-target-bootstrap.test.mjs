import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const databaseUrl = process.env.DATABASE_URL;
const { Client } = pg;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the disposable empty-target bootstrap test.");
}

async function resetDatabase() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      DROP SCHEMA IF EXISTS drizzle CASCADE;
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
    `);
  } finally {
    await client.end();
  }
}

function bootstrap(expectedStatus = 0) {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@workspace/db",
      "run",
      "bootstrap-empty-target",
      "--",
      "--approve-empty-calora-target",
    ],
    { cwd: root, env: process.env, encoding: "utf8" },
  );
  assert.equal(
    result.status,
    expectedStatus,
    `bootstrap exit=${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return `${result.stdout}\n${result.stderr}`;
}

function migrate(env = process.env) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@workspace/db", "run", "migrate"],
    { cwd: root, env, encoding: "utf8" },
  );
  assert.equal(
    result.status,
    0,
    `migrate exit=${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return `${result.stdout}\n${result.stderr}`;
}

async function query(sql) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await client.query(sql);
  } finally {
    await client.end();
  }
}

// A truly empty target receives the complete 29-table baseline, server-only
// RLS/grants, and no fabricated domain rows.
await resetDatabase();
const emptyOutput = bootstrap();
assert.match(emptyOutput, /installed 29 Calora tables/);
const migrationOutput = migrate();
assert.match(migrationOutput, /All migrations applied successfully/);
const fresh = await query(`
  SELECT
    (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'calora_%'
        AND c.relname <> 'calora_migration_journal') AS table_count,
    (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'calora_%'
        AND c.relname <> 'calora_migration_journal' AND c.reltuples > 0) AS nonempty_table_count,
    (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT t.tgisinternal AND t.tgname = 'calora_account_deletion_write_fence_trigger') AS fence_count,
    (SELECT count(*)::int FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'calora_%' AND rowsecurity) AS rls_table_count,
    (SELECT count(*)::int FROM public.calora_migration_journal) AS migration_boundary_count
`);
assert.deepEqual(fresh.rows, [{
  table_count: 29,
  nonempty_table_count: 0,
  fence_count: 9,
  rls_table_count: 29,
  migration_boundary_count: 1,
}]);
const deletionFenceDefinition = await query(`
  SELECT pg_get_functiondef('public.calora_assert_deletion_writable(text)'::regprocedure) AS definition
`);
assert.match(
  deletionFenceDefinition.rows[0]?.definition ?? "",
  /extensions\.digest\(external_user_id, 'sha256'\)/,
  "bootstrap must bind deletion fencing to the canonical pgcrypto schema",
);

// The deployment migrator owns its table journal and may create application
// objects only in public. It must not need database-wide CREATE merely because
// the immutable journal already exists.
const fixtureMigrator = "calora_migrator_fixture";
const fixtureMigratorPassword = "calora-bootstrap-fixture-only";
await query(`
  CREATE ROLE ${fixtureMigrator} LOGIN PASSWORD '${fixtureMigratorPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  GRANT USAGE, CREATE ON SCHEMA public TO ${fixtureMigrator};
  GRANT SELECT, INSERT ON public.calora_migration_journal TO ${fixtureMigrator};
`);
try {
  const fixtureUrl = new URL(databaseUrl);
  fixtureUrl.username = fixtureMigrator;
  fixtureUrl.password = fixtureMigratorPassword;
  const restrictedOutput = migrate({
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: fixtureUrl.toString(),
    MIGRATION_DATABASE_URL: "",
  });
  assert.match(restrictedOutput, /All migrations applied successfully/);
} finally {
  await query(`
    REVOKE SELECT, INSERT ON public.calora_migration_journal FROM ${fixtureMigrator};
    REVOKE USAGE, CREATE ON SCHEMA public FROM ${fixtureMigrator};
    DROP ROLE ${fixtureMigrator};
  `);
}

// The only admitted legacy shape is the known empty nutrition cache. The
// bootstrap reconciles it atomically before creating the canonical baseline.
await resetDatabase();
await query(`
  CREATE TABLE public.calora_recipe_nutrition (
    meal_id text PRIMARY KEY,
    calories integer NOT NULL,
    protein_g integer NOT NULL,
    carbs_g integer NOT NULL,
    fat_g integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
`);
const legacyOutput = bootstrap();
assert.match(legacyOutput, /reconciled_empty_cache=true/);
const reconciled = await query(`
  SELECT data_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'calora_recipe_nutrition'
     AND column_name = 'calories'
`);
assert.deepEqual(reconciled.rows, [{ data_type: "double precision" }]);

// Any non-empty Calora table is a hard stop. The launcher must never accept a
// target containing historical user/application data.
await resetDatabase();
await query(`
  CREATE TABLE public.calora_recipe_nutrition (
    meal_id text PRIMARY KEY,
    calories integer NOT NULL,
    protein_g integer NOT NULL,
    carbs_g integer NOT NULL,
    fat_g integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  INSERT INTO public.calora_recipe_nutrition (meal_id, calories, protein_g, carbs_g, fat_g)
  VALUES ('synthetic-local-fixture', 1, 1, 1, 1);
`);
const refusal = bootstrap(1);
assert.match(refusal, /refusing to replace calora_recipe_nutrition because it contains rows/);
const preserved = await query("SELECT count(*)::int AS count FROM public.calora_recipe_nutrition");
assert.deepEqual(preserved.rows, [{ count: 1 }]);

console.info("empty-target bootstrap accepts only blank/known-empty local fixtures and preserves non-empty targets");
