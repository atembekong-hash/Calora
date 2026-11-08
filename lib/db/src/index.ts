import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { buildDatabasePoolConfig } from "./connection";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool(buildDatabasePoolConfig(process.env.DATABASE_URL));
export const db = drizzle(pool, { schema });
export type CaloraDatabase = typeof db;
export function createDatabaseFromClient(client: pg.PoolClient): CaloraDatabase {
  return drizzle(client, { schema }) as unknown as CaloraDatabase;
}

export * from "./schema";
export {
  buildDatabasePoolConfig,
  getMigrationDatabaseUrl,
  preserveStrictTlsVerification,
} from "./connection";
