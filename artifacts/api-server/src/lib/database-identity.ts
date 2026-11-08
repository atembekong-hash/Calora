import {
  createDatabaseFromClient,
  db,
  pool,
  type CaloraDatabase,
} from "@workspace/db";
import {
  createIdentityAssertion,
  verifyIdentityAssertion,
} from "./identity-assertion.js";

const STAGED_RLS_MODE = "staged-rls";
const IDENTITY_SECRET_ENV = "CALORA_RLS_IDENTITY_SECRET";

export type DatabaseIdentityMode = "legacy" | "staged-rls";

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
  operation: (database: CaloraDatabase, inTransaction: boolean) => Promise<T>,
): Promise<T> {
  if (databaseIdentityMode() === "legacy") return operation(db, false);

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
    const result = await operation(database, true);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
