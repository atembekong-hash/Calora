/**
 * Migration runner for calora_* tables.
 *
 * Applies all pending SQL migrations from the migrations/ folder in
 * deterministic, immutable order (ascending by filename index). Each
 * migration is recorded in the Calora-owned migration journal so it
 * is never replayed.
 *
 * Invocation:
 *   pnpm --filter @workspace/db run migrate
 *
 * Safety rules enforced here:
 *  - Production requires MIGRATION_DATABASE_URL; the runtime DATABASE_URL
 *    never receives schema-mutation privileges.
 *  - Migrations are run atomically with the journal boundary update.
 *  - The migrations/ folder is resolved relative to this file; the runner
 *    refuses to start if the folder is missing.
 *  - This script must never be called from API server startup or a client
 *    request path — it is exclusively a post-merge / deployment-time tool.
 */
import { readMigrationFiles, type MigrationMeta } from "drizzle-orm/migrator";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import { buildDatabasePoolConfig, getMigrationDatabaseUrl } from "./connection";

const { Pool } = pg;

const migrationDatabaseUrl = getMigrationDatabaseUrl();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../migrations");
const migrationsSchema = "public";
const migrationsTable = "calora_migration_journal";

const pool = new Pool(buildDatabasePoolConfig(migrationDatabaseUrl));

type MigrationJournalRow = { hash: string; created_at: string | number };

const successfulFeatureAllowancesMigration = {
  folderMillis: 1794531600000,
};

async function isAlreadyAppliedSuccessfulFeatureAllowances(
  client: pg.PoolClient,
  migration: MigrationMeta,
): Promise<boolean> {
  if (
    migration.folderMillis !== successfulFeatureAllowancesMigration.folderMillis
  ) {
    return false;
  }

  const result = await client.query<{ matches: boolean }>(`
    SELECT (
      (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'calora_feature_usage'
          AND column_name IN ('user_id', 'feature', 'day_key', 'successful_count',
                              'pending_keys', 'completed_keys', 'updated_at')) = 7
      AND EXISTS (SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'calora_feature_usage'
          AND indexname = 'calora_feature_usage_pkey')
      AND EXISTS (SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'calora_feature_usage'
          AND indexname = 'calora_feature_usage_day_idx')
    ) AS matches
  `);
  return result.rows[0]?.matches === true;
}

function migrationIsPending(
  migration: MigrationMeta,
  lastApplied: MigrationJournalRow | undefined,
): boolean {
  return !lastApplied || Number(lastApplied.created_at) < migration.folderMillis;
}

async function runMigrations(): Promise<void> {
  console.info("[migrate] Applying pending migrations from", migrationsFolder);
  const migrations = readMigrationFiles({ migrationsFolder });
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${migrationsSchema}.${migrationsTable} (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);
    await client.query(
      `REVOKE ALL PRIVILEGES ON TABLE ${migrationsSchema}.${migrationsTable} FROM PUBLIC`,
    );
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'calora_api_runtime') THEN
          REVOKE ALL PRIVILEGES ON TABLE public.calora_migration_journal FROM calora_api_runtime;
        END IF;
      END
      $$
    `);
    const history = await client.query<MigrationJournalRow>(`
      SELECT hash, created_at
        FROM ${migrationsSchema}.${migrationsTable}
       ORDER BY created_at DESC
       LIMIT 1
    `);
    const lastApplied = history.rows[0];

    for (const migration of migrations) {
      if (!migrationIsPending(migration, lastApplied)) continue;
      const alreadyApplied = await isAlreadyAppliedSuccessfulFeatureAllowances(
        client,
        migration,
      );
      if (!alreadyApplied) {
        for (const statement of migration.sql) {
          if (statement.trim()) await client.query(statement);
        }
      }
      await client.query(
        `INSERT INTO ${migrationsSchema}.${migrationsTable} (hash, created_at) VALUES ($1, $2)`,
        [migration.hash, migration.folderMillis],
      );
    }
    await client.query("COMMIT");
    committed = true;
    console.info("[migrate] All migrations applied successfully.");
  } finally {
    if (!committed) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    client.release();
  }
}

runMigrations()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error: unknown) => {
    await pool.end();
    console.error("[migrate] Migration failed:", error);
    process.exitCode = 1;
  });
