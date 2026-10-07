/**
 * Builds a brand-new Calora application schema only after proving that the
 * target contains no Calora application data. The reviewed baseline replaces
 * historical forward DDL, then records the immutable migration cutoff so
 * deployment-time migration tooling never replays that history.
 *
 * Invocation (one-shot, deployment tooling only):
 *   pnpm --filter @workspace/db run bootstrap-empty-target -- --approve-empty-calora-target
 *
 * Safety contract:
 * - requires an explicit command-line acknowledgement;
 * - takes a transaction-scoped advisory lock;
 * - refuses any existing calora_* table except the known empty,
 *   schema-drifted calora_recipe_nutrition cache table;
 * - refuses that cache table when it contains even one row;
 * - drops only that proven-empty cache table before installing the reviewed
 *   schema-only baseline;
 * - never runs from API startup or an HTTP request path.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readMigrationFiles } from "drizzle-orm/migrator";
import pg from "pg";
import { buildDatabasePoolConfig } from "./connection";

const { Pool } = pg;
const APPROVAL_FLAG = "--approve-empty-calora-target";
const LEGACY_EMPTY_CACHE = "calora_recipe_nutrition";
const EXPECTED_TABLE_COUNT = 33;
const MIGRATIONS_SCHEMA = "public";
const MIGRATIONS_TABLE = "calora_migration_journal";

type ExistingTableRow = { table_name: string };
type EmptyTableRow = { is_empty: boolean };
type CountRow = { count: string };
type QueryClient = Pick<pg.Pool | pg.PoolClient, "query">;

function fail(message: string): never {
  throw new Error(`[bootstrap-empty-target] ${message}`);
}

function baselinePath(): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dirname, "../bootstrap/0000_calora_empty_target_baseline.sql");
}

function migrationsPath(): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(dirname, "../migrations");
}

async function listCaloraTables(pool: QueryClient): Promise<string[]> {
  const result = await pool.query<ExistingTableRow>(`
    SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname LIKE 'calora_%'
     ORDER BY c.relname
  `);
  return result.rows.map((row) => row.table_name);
}

async function legacyCacheIsEmpty(pool: QueryClient): Promise<boolean> {
  const result = await pool.query<EmptyTableRow>(`
    SELECT NOT EXISTS (
      SELECT 1
        FROM public.calora_recipe_nutrition
       LIMIT 1
    ) AS is_empty
  `);
  return result.rows[0]?.is_empty === true;
}

async function loadBaseline(): Promise<{ sql: string; sha256: string }> {
  const sql = await readFile(baselinePath(), "utf8");
  return {
    sql,
    sha256: createHash("sha256").update(sql).digest("hex"),
  };
}

async function recordBootstrapMigrationBoundary(client: QueryClient): Promise<void> {
  const boundary = readMigrationFiles({ migrationsFolder: migrationsPath() }).at(-1);
  if (!boundary) {
    fail("migration journal is empty; refusing to create an unsafe bootstrap boundary");
  }

  await client.query(`
    CREATE TABLE ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
  await client.query(
    `INSERT INTO ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} (hash, created_at) VALUES ($1, $2)`,
    [boundary.hash, boundary.folderMillis],
  );
  await client.query(
    `REVOKE ALL PRIVILEGES ON TABLE ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} FROM PUBLIC`,
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
}

/**
 * Exposed for disposable database tests.  Callers must own the target and
 * explicitly pass the acknowledgement flag; this function never discovers or
 * selects a production target itself.
 */
export async function bootstrapEmptyCaloraTarget({
  connectionString = process.env.DATABASE_URL,
  approved = process.argv.includes(APPROVAL_FLAG),
}: {
  connectionString?: string;
  approved?: boolean;
} = {}): Promise<{ baselineSha256: string; tableCount: number; reconciledEmptyCache: boolean }> {
  if (!approved) {
    fail(`requires ${APPROVAL_FLAG}`);
  }
  if (!connectionString) {
    fail("DATABASE_URL must be set before an empty-target bootstrap.");
  }

  const pool = new Pool(buildDatabasePoolConfig(connectionString));
  const baseline = await loadBaseline();
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL search_path = public, extensions");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('calora-empty-target-bootstrap', 0))");

    const tables = await listCaloraTables(client);
    const recognizedLegacyCache = tables.length === 1 && tables[0] === LEGACY_EMPTY_CACHE;
    if (tables.length > 0 && !recognizedLegacyCache) {
      fail(`refusing non-empty-target bootstrap; existing Calora tables: ${tables.join(", ")}`);
    }

    let reconciledEmptyCache = false;
    if (recognizedLegacyCache) {
      if (!(await legacyCacheIsEmpty(client))) {
        fail("refusing to replace calora_recipe_nutrition because it contains rows");
      }
      // This is the only destructive statement in this launcher.  The prior
      // checks prove it is the sole Calora table and has zero rows.
      await client.query("DROP TABLE public.calora_recipe_nutrition");
      reconciledEmptyCache = true;
    }

    await client.query("CREATE SCHEMA IF NOT EXISTS extensions");
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions");
    await client.query(baseline.sql);
    await recordBootstrapMigrationBoundary(client);

    const count = await client.query<CountRow>(`
      SELECT count(*)::text AS count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relname LIKE 'calora_%'
         AND c.relname <> '${MIGRATIONS_TABLE}'
    `);
    const tableCount = Number(count.rows[0]?.count ?? "0");
    if (tableCount !== EXPECTED_TABLE_COUNT) {
      fail(`baseline produced ${tableCount} Calora tables; expected ${EXPECTED_TABLE_COUNT}`);
    }

    await client.query("COMMIT");
    committed = true;
    return { baselineSha256: baseline.sha256, tableCount, reconciledEmptyCache };
  } catch (error) {
    if (!committed) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the bootstrap error; callers must not mistake rollback
        // failure for successful initialization.
      }
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  bootstrapEmptyCaloraTarget()
    .then(({ baselineSha256, tableCount, reconciledEmptyCache }) => {
      console.info(
        `[bootstrap-empty-target] installed ${tableCount} Calora tables; baseline sha256=${baselineSha256}; reconciled_empty_cache=${reconciledEmptyCache}`,
      );
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "[bootstrap-empty-target] unknown failure");
      process.exitCode = 1;
    });
}
