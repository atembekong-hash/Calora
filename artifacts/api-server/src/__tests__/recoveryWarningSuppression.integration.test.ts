import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";

const { deleteUser, warn } = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("../lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    auth: { admin: { deleteUser } },
  }),
}));

vi.mock("../lib/revenuecat.js", () => ({
  deleteRevenueCatSubscriber: vi.fn(),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { warn },
  noteSuppressedRecoveryWarning: vi.fn(),
}));

const HAS_DB = Boolean(process.env.DATABASE_URL);
const DATABASE_REQUIRED =
  process.env.RECOVERY_WARNING_SUPPRESSION_REQUIRE_DATABASE === "true";
if (DATABASE_REQUIRED && !HAS_DB) {
  throw new Error(
    "DATABASE_URL must be set when recovery-warning suppression database verification is required.",
  );
}

const MIGRATION_SQL = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../lib/db/migrations/0003_recovery_warning_suppression.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

describe.skipIf(!HAS_DB && !DATABASE_REQUIRED)(
  "recovery warning suppression migration (disposable schema)",
  () => {
    let pool: (typeof import("@workspace/db"))["pool"];

    it.each(["fresh", "existing-compatible"])(
      "provisions the suppression table and expiry index on a %s schema",
      async (schemaKind) => {
        const { pool: databasePool } = await import("@workspace/db");
        pool = databasePool;
        const client = await pool.connect();
        const schemaName = `calora_recovery_${randomUUID().replaceAll("-", "")}`;
        const quotedSchemaName = `"${schemaName}"`;

        try {
          await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
          await client.query(`SET search_path TO ${quotedSchemaName}`);

          if (schemaKind === "existing-compatible") {
            await client.query(`
              CREATE TABLE calora_recovery_warning_suppressions (
                warning_key text PRIMARY KEY NOT NULL,
                emitted_at timestamptz NOT NULL,
                expires_at timestamptz NOT NULL
              )
            `);
          }

          await client.query("BEGIN");
          try {
            await client.query(MIGRATION_SQL);
            await client.query("COMMIT");
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          }

          const tableMetadata = await client.query<{
            table_name: string;
            relation_kind: string;
            primary_key_name: string | null;
          }>(
            `SELECT
               relation.relname AS table_name,
               relation.relkind AS relation_kind,
               primary_key.conname AS primary_key_name
             FROM pg_class AS relation
             JOIN pg_namespace AS namespace
               ON namespace.oid = relation.relnamespace
             LEFT JOIN pg_constraint AS primary_key
               ON primary_key.conrelid = relation.oid
              AND primary_key.contype = 'p'
             WHERE namespace.nspname = $1
               AND relation.relname = 'calora_recovery_warning_suppressions'`,
            [schemaName],
          );

          expect(tableMetadata.rows).toEqual([
            {
              table_name: "calora_recovery_warning_suppressions",
              relation_kind: "r",
              primary_key_name:
                "calora_recovery_warning_suppressions_pkey",
            },
          ]);

          const expiryIndexMetadata = await client.query<{
            index_name: string;
            is_unique: boolean;
            is_valid: boolean;
            columns: string[];
          }>(
            `SELECT
               index_relation.relname AS index_name,
               index_info.indisunique AS is_unique,
               index_info.indisvalid AS is_valid,
               array_to_string(
                 array_agg(attribute.attname ORDER BY key_position.ordinality),
                 ','
               ) AS columns
             FROM pg_index AS index_info
             JOIN pg_class AS index_relation
               ON index_relation.oid = index_info.indexrelid
             JOIN pg_class AS table_relation
               ON table_relation.oid = index_info.indrelid
             JOIN pg_namespace AS namespace
               ON namespace.oid = table_relation.relnamespace
             JOIN LATERAL unnest(index_info.indkey) WITH ORDINALITY
               AS key_position(attnum, ordinality)
               ON true
             JOIN pg_attribute AS attribute
               ON attribute.attrelid = table_relation.oid
              AND attribute.attnum = key_position.attnum
             WHERE namespace.nspname = $1
               AND table_relation.relname = 'calora_recovery_warning_suppressions'
               AND index_relation.relname =
                 'calora_recovery_warning_suppressions_expires_at_idx'
             GROUP BY
               index_relation.relname,
               index_info.indisunique,
               index_info.indisvalid`,
            [schemaName],
          );

          expect(expiryIndexMetadata.rows).toEqual([
            {
              index_name:
                "calora_recovery_warning_suppressions_expires_at_idx",
              is_unique: false,
              is_valid: true,
            columns: "expires_at",
            },
          ]);
        } finally {
          try {
            await client.query("RESET search_path");
          } finally {
            try {
              await client.query(
                `DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`,
              );
            } finally {
              client.release();
            }
          }
        }
      },
    );
  },
);

describe.skipIf(!HAS_DB && !DATABASE_REQUIRED)(
  "recovery warning suppression claims (disposable schema)",
  () => {
    it(
      "allows exactly one of two concurrent API instances to claim a warning",
      async () => {
        const { pool } = await import("@workspace/db");
        const { claimRecoveryWarningSuppression } =
          await import("../lib/account-deletion-state.js");
        const schemaName = `calora_recovery_claim_${randomUUID().replaceAll("-", "")}`;
        const quotedSchemaName = `"${schemaName}"`;
        const warningSignature =
          "failed:0123456789abcdef:revenuecat|overdue:fedcba9876543210:application";
        const warningKey = createHash("sha256")
          .update(warningSignature)
          .digest("hex");
        const now = new Date("2026-09-05T09:00:00.000Z");

        async function configurePoolSearchPath(): Promise<void> {
          const maxClients = pool.options.max ?? 10;
          const clients: PoolClient[] = [];
          try {
            for (let index = 0; index < maxClients; index += 1) {
              const client = await pool.connect();
              clients.push(client);
              await client.query(
                `SET search_path TO ${quotedSchemaName}, public`,
              );
            }
          } finally {
            for (const client of clients) {
              client.release();
            }
          }
        }

        async function resetPoolSearchPath(): Promise<void> {
          const maxClients = pool.options.max ?? 10;
          const resetClients: PoolClient[] = [];
          const releasedClients = new Set<PoolClient>();
          try {
            for (let index = 0; index < maxClients; index += 1) {
              resetClients.push(await pool.connect());
            }
            for (const client of resetClients) {
              try {
                await client.query("RESET search_path");
              } finally {
                client.release();
                releasedClients.add(client);
              }
            }
          } catch (error) {
            for (const client of resetClients) {
              if (!releasedClients.has(client)) {
                client.release();
              }
            }
            throw error;
          }
        }

        try {
          const setupClient = await pool.connect();
          try {
            await setupClient.query(`CREATE SCHEMA ${quotedSchemaName}`);
            await setupClient.query(`SET search_path TO ${quotedSchemaName}`);
            await setupClient.query(MIGRATION_SQL);
            await setupClient.query("RESET search_path");
          } finally {
            setupClient.release();
          }

          await configurePoolSearchPath();

          const claims = await Promise.all([
            claimRecoveryWarningSuppression(warningSignature, now),
            claimRecoveryWarningSuppression(warningSignature, now),
          ]);

          expect(claims.sort()).toEqual([false, true]);

          const verificationClient = await pool.connect();
          try {
            const rows = await verificationClient.query<{
              warning_key: string;
              emitted_at: Date;
              expires_at: Date;
            }>(
              `SELECT warning_key, emitted_at, expires_at
               FROM calora_recovery_warning_suppressions`,
            );

            expect(rows.rows).toHaveLength(1);
            expect(rows.rows[0]).toMatchObject({
              warning_key: warningKey,
              emitted_at: now,
              expires_at: new Date(
                now.getTime() + 15 * 60 * 1000,
              ),
            });
            expect(JSON.stringify(rows.rows)).not.toContain(
              warningSignature,
            );
          } finally {
            verificationClient.release();
          }
        } finally {
          await resetPoolSearchPath();
          const cleanupClient = await pool.connect();
          try {
            await cleanupClient.query(
              `DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`,
            );
          } finally {
            cleanupClient.release();
          }
        }
      },
      30_000,
    );
  },
);

describe.skipIf(!HAS_DB && !DATABASE_REQUIRED)(
  "recovery warning suppression outage (disposable schema)",
  () => {
    let pool: (typeof import("@workspace/db"))["pool"];
    let schemaName: string;
    let quotedSchemaName: string;

    async function configurePoolSearchPath(): Promise<void> {
      const maxClients = pool.options.max ?? 10;
      const clients: PoolClient[] = [];
      try {
        for (let index = 0; index < maxClients; index += 1) {
          const client = await pool.connect();
          clients.push(client);
          await client.query(
            `SET search_path TO ${quotedSchemaName}, public`,
          );
        }
      } finally {
        for (const client of clients) client.release();
      }
    }

    async function resetPoolSearchPath(): Promise<void> {
      const maxClients = pool.options.max ?? 10;
      const clients: PoolClient[] = [];
      try {
        for (let index = 0; index < maxClients; index += 1) {
          clients.push(await pool.connect());
        }
        for (const client of clients) {
          await client.query("RESET search_path");
          client.release();
        }
      } catch (error) {
        for (const client of clients) client.release();
        throw error;
      }
    }

    beforeAll(async () => {
      ({ pool } = await import("@workspace/db"));
      schemaName = `calora_recovery_outage_${randomUUID().replaceAll("-", "")}`;
      quotedSchemaName = `"${schemaName}"`;

      const client = await pool.connect();
      try {
        await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
        await client.query(`
          CREATE TABLE ${quotedSchemaName}.calora_account_deletion_states (
            identity_fingerprint text PRIMARY KEY NOT NULL,
            state text NOT NULL,
            operation_id uuid,
            stage text NOT NULL DEFAULT 'application',
            lease_expires_at timestamptz,
            recovery_external_user_id text,
            requested_at timestamptz,
            completed_at timestamptz,
            updated_at timestamptz NOT NULL DEFAULT now(),
            last_error text
          )
        `);
        // Shadow the public suppression table with a relation that cannot be
        // deleted from. This forces the actual cooldown claim to receive a
        // database error while leaving the recovery-state tables available.
        await client.query(`
          CREATE MATERIALIZED VIEW ${quotedSchemaName}.calora_recovery_warning_suppressions
          AS SELECT 'unavailable'::text AS warning_key
        `);
      } finally {
        client.release();
      }

      await configurePoolSearchPath();
    });

    afterAll(async () => {
      await resetPoolSearchPath();
      await pool.query(`DROP SCHEMA IF EXISTS ${quotedSchemaName} CASCADE`);
    });

    it(
      "emits redacted warning metadata and completes a later retry when the cooldown table is unavailable",
      async () => {
        const rawAccountId = "raw-auth-id-that-must-not-be-logged";
        const fingerprint = createHash("sha256")
          .update(rawAccountId)
          .digest("hex");
        const requestedAt = new Date(Date.now() - 20 * 60 * 1000);
        warn.mockReset();
        deleteUser.mockReset();
        deleteUser
          .mockRejectedValueOnce(
            new Error(`provider failed for ${rawAccountId}`),
          )
          .mockResolvedValueOnce({ error: null });

        await pool.query(
          `INSERT INTO ${quotedSchemaName}.calora_account_deletion_states (
             identity_fingerprint, state, stage, recovery_external_user_id,
             requested_at, updated_at, lease_expires_at
           ) VALUES ($1, 'deleting', 'auth', $2, $3, $3, NOW() - INTERVAL '1 second')`,
          [fingerprint, rawAccountId, requestedAt],
        );

        const { recoverPendingAccountDeletions, runAccountDeletion } =
          await import("../routes/account.js");
        await recoverPendingAccountDeletions();

        expect(deleteUser).toHaveBeenCalledOnce();
        expect(warn).toHaveBeenCalledOnce();
        const [fields, message] = warn.mock.calls[0];
        expect(message).toBe("Account deletion recovery needs attention");
        expect(fields).toMatchObject({
          event: "account_deletion_recovery",
          attemptedCount: 1,
          failureCount: 1,
          failureStages: { application: 0, revenuecat: 0, auth: 1 },
          unresolvedCount: 1,
          overdueCount: 1,
          overdueStages: { application: 0, revenuecat: 0, auth: 1 },
          correlationKeys: [fingerprint.slice(0, 16)],
        });
        expect(JSON.stringify(fields)).not.toContain(rawAccountId);
        expect(JSON.stringify(fields)).not.toContain("provider failed");

        // A failed worker renews no lease; make the following attempt
        // unambiguously eligible without waiting for the recovery timer.
        await pool.query(
          `UPDATE ${quotedSchemaName}.calora_account_deletion_states
           SET lease_expires_at = NOW() - INTERVAL '1 second'
           WHERE identity_fingerprint = $1`,
          [fingerprint],
        );
        await expect(runAccountDeletion(rawAccountId)).resolves.toBe("completed");

        expect(deleteUser).toHaveBeenCalledTimes(2);
        const recoveryState = await pool.query(
          `SELECT state, recovery_external_user_id, last_error, lease_expires_at
           FROM ${quotedSchemaName}.calora_account_deletion_states
           WHERE identity_fingerprint = $1`,
          [fingerprint],
        );
        expect(recoveryState.rows).toEqual([
          {
            state: "deleted",
            recovery_external_user_id: null,
            last_error: null,
            lease_expires_at: null,
          },
        ]);
      },
      30_000,
    );
  },
);
