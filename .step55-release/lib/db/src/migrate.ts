/**
 * Drizzle migration runner for calora_* tables.
 *
 * Applies all pending SQL migrations from the migrations/ folder in
 * deterministic, immutable order (ascending by filename index). Each
 * migration is recorded in drizzle's __drizzle_migrations table so it
 * is never replayed.
 *
 * Invocation:
 *   pnpm --filter @workspace/db run migrate
 *
 * Safety rules enforced here:
 *  - DATABASE_URL must be set; the runner never starts without it.
 *  - Migrations are run inside a transaction per-file when drizzle supports it.
 *  - The migrations/ folder is resolved relative to this file; the runner
 *    refuses to start if the folder is missing.
 *  - This script must never be called from API server startup or a client
 *    request path — it is exclusively a post-merge / deployment-time tool.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before running migrations.");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../migrations");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function runMigrations(): Promise<void> {
  console.info("[migrate] Applying pending migrations from", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.info("[migrate] All migrations applied successfully.");
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
