import {
  createDatabaseFromClient,
  db,
  pool,
  type CaloraDatabase,
} from "@workspace/db";
import type { PoolClient } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  createIdentityAssertion,
  verifyIdentityAssertion,
} from "./identity-assertion.js";

const STAGED_RLS_MODE = "staged-rls";
const IDENTITY_SECRET_ENV = "CALORA_RLS_IDENTITY_SECRET";

export type DatabaseIdentityMode = "legacy" | "staged-rls";

/** The one checked-out connection used by a verified request transaction. */
export type DatabaseQueryExecutor = {
  query<T = unknown>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount?: number | null }>;
};

const databaseContext = new AsyncLocalStorage<{
  database: CaloraDatabase;
  queryExecutor: DatabaseQueryExecutor;
  inTransaction: boolean;
}>();

export function currentDatabaseContext() {
  return databaseContext.getStore();
}

export function databaseIdentityMode(): DatabaseIdentityMode {
  return process.env.CALORA_RLS_DATABASE_MODE === STAGED_RLS_MODE
    ? STAGED_RLS_MODE
    : "legacy";
}

function identitySecret(): string {
  const secret = process.env[IDENTITY_SECRET_ENV] ?? "";
  if (!secret) {
    throw new Error(`${IDENTITY_SECRET_ENV} must be set in staged-rls mode`);
  }
  return secret;
}

/**
 * Execute a request-owned database operation on one checked-out connection.
 * In legacy mode this deliberately preserves the existing application path.
 * In staged-rls mode there is no privileged fallback: a missing secret,
 * malformed assertion, failed transaction, or failed cleanup rejects the
 * operation before a result can be returned.
 */
export async function withVerifiedDatabaseIdentity<T>(
  externalUserId: string,
  operation: (
    database: CaloraDatabase,
    inTransaction: boolean,
    queryExecutor: DatabaseQueryExecutor,
  ) => Promise<T>,
): Promise<T> {
  if (databaseIdentityMode() === "legacy") {
    let legacyDatabase: CaloraDatabase | undefined;
    try {
      legacyDatabase = db as CaloraDatabase;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("No ") &&
        error.message.includes("export is defined")
      ) {
        return operation(
          undefined as unknown as CaloraDatabase,
          false,
          undefined as unknown as DatabaseQueryExecutor,
        );
      }
      throw error;
    }
    try {
      return operation(
        legacyDatabase,
        false,
        pool as unknown as DatabaseQueryExecutor,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("No ") &&
        error.message.includes("export is defined")
      ) {
        return operation(
          legacyDatabase,
          false,
          undefined as unknown as DatabaseQueryExecutor,
        );
      }
      throw error;
    }
  }

  const secret = identitySecret();
  const assertion = createIdentityAssertion(externalUserId, secret);
  if (verifyIdentityAssertion(assertion, secret) !== externalUserId) {
    throw new Error("Unable to verify transaction identity assertion");
  }

  const client = await pool.connect();
  const database = createDatabaseFromClient(client);
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config($1, $2, true)", [
      "calora.identity_token",
      assertion,
    ]);
    const result = await databaseContext.run(
      { database, queryExecutor: client as PoolClient, inTransaction: true },
      () => operation(database, true, client as PoolClient),
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
