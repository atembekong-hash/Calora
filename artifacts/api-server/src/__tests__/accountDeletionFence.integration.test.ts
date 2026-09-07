import express from "express";
import request from "supertest";
import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  ACCOUNT_DELETION_FENCE_ERROR_CLASS,
  AccountDeletionInProgressError,
  classifyAccountDeletionError,
} from "../lib/account-deletion-state.js";

const {
  verifyBearerTokenMock,
  hasActivePremiumEntitlementMock,
  loggerWarnMock,
} = vi.hoisted(() => ({
  verifyBearerTokenMock: vi.fn(),
  hasActivePremiumEntitlementMock: vi.fn(),
  loggerWarnMock: vi.fn(),
}));

vi.mock("../lib/supabase-auth.js", () => ({
  verifyBearerToken: verifyBearerTokenMock,
}));

vi.mock("../lib/revenuecat.js", () => ({
  hasActivePremiumEntitlement: hasActivePremiumEntitlementMock,
}));

vi.mock("../lib/logger.js", () => ({
  logger: {
    warn: loggerWarnMock,
    error: vi.fn(),
  },
}));

const HAS_DB = Boolean(process.env.DATABASE_URL);
const DATABASE_REQUIRED =
  process.env.ACCOUNT_DELETION_FENCE_REQUIRE_DATABASE === "true";
if (DATABASE_REQUIRED && !HAS_DB) {
  throw new Error(
    "DATABASE_URL must be set when account-deletion fence database verification is required.",
  );
}
const EXPECTED_FENCED_TABLES = [
  "calora_capture_rate_limits",
  "calora_referral_codes",
  "calora_referral_qualifications",
  "calora_referral_redemptions",
  "calora_users",
] as const;

describe("account deletion fence classification", () => {
  it("normalizes application and trigger failures without accepting arbitrary database text", () => {
    expect(
      classifyAccountDeletionError(new AccountDeletionInProgressError()),
    ).toBe(ACCOUNT_DELETION_FENCE_ERROR_CLASS);
    expect(
      classifyAccountDeletionError({
        code: "55000",
        message: "account deletion is in progress",
      }),
    ).toBe(ACCOUNT_DELETION_FENCE_ERROR_CLASS);
    expect(
      classifyAccountDeletionError({
        code: "55000",
        message: "account deletion is in progress for raw-account-id",
      }),
    ).toBeNull();
  });
});

describe.skipIf(!HAS_DB && !DATABASE_REQUIRED)(
  "account deletion fence provider routes (real limiter and trigger)",
  () => {
    it("returns generic unavailable responses without provider calls or account details", async () => {
      const { pool } = await import("@workspace/db");
      const { default: premiumRecipesRouter } =
        await import("../routes/premiumRecipes.js");
      const { default: restaurantFoodsRouter } =
        await import("../routes/restaurantFoods.js");
      const run = randomUUID().slice(0, 8);
      const externalUserId = `premium-fence-${run}`;
      const premiumAccountKey = `premium-recipes:user:${externalUserId}`;
      const restaurantAccountKey = `restaurant-foods:user:${externalUserId}`;
      const premiumIpKey = "premium-recipes:ip:198.51.100.42";
      const accountKeys = [
        premiumAccountKey,
        restaurantAccountKey,
        premiumIpKey,
      ];

      verifyBearerTokenMock.mockResolvedValue({
        id: externalUserId,
        email: `${externalUserId}@example.com`,
      });
      hasActivePremiumEntitlementMock.mockResolvedValue(true);
      loggerWarnMock.mockReset();
      const providerFetchMock = vi.fn();
      vi.stubGlobal("fetch", providerFetchMock);
      vi.stubEnv("PREMIUM_RECIPE_PROVIDER_URL", "https://provider.example");
      vi.stubEnv("FATSECRET_GATEWAY_URL", "https://gateway.example");
      vi.stubEnv("FATSECRET_GATEWAY_SECRET", "test-gateway-secret");

      const app = express();
      app.set("trust proxy", 1);
      app.use(express.json());
      app.use(premiumRecipesRouter);
      app.use(restaurantFoodsRouter);

      try {
        await pool.query(
          `INSERT INTO calora_account_deletion_states (identity_fingerprint, state)
           VALUES (encode(digest($1, 'sha256'), 'hex'), 'deleting')`,
          [externalUserId],
        );

        const premiumResponse = await request(app)
          .get("/v1/premium-recipes?query=breakfast")
          .set("X-Forwarded-For", "198.51.100.42");
        const restaurantResponse = await request(app)
          .get("/v1/restaurant-foods?query=burger")
          .set("X-Forwarded-For", "198.51.100.42");

        expect(premiumResponse.status).toBe(503);
        expect(premiumResponse.body).toEqual({
          message:
            "Premium recipes are temporarily unavailable. Please try again shortly.",
        });
        expect(restaurantResponse.status).toBe(503);
        expect(restaurantResponse.body).toEqual({
          message: "Restaurant search is temporarily unavailable.",
        });
        expect(providerFetchMock).not.toHaveBeenCalled();
        expect(
          `${JSON.stringify(premiumResponse.body)}${JSON.stringify(
            restaurantResponse.body,
          )}`,
        ).not.toContain(externalUserId);

        const rateLimitRows = await pool.query<{ key: string }>(
          `SELECT key
             FROM calora_capture_rate_limits
            WHERE key = ANY($1::text[])
            ORDER BY key`,
          [accountKeys],
        );
        expect(rateLimitRows.rows.map(({ key }) => key)).toEqual([
          premiumIpKey,
        ]);

        expect(loggerWarnMock.mock.calls).toEqual([
          [
            {
              errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
              route: "/v1/premium-recipes",
              count: 1,
              schemaVersion: "calora.account-deletion-fence-signal.v1",
            },
            "Account deletion fence rejected premium recipe request",
          ],
          [
            {
              errorClass: ACCOUNT_DELETION_FENCE_ERROR_CLASS,
              route: "/v1/restaurant-foods",
              count: 1,
              schemaVersion: "calora.account-deletion-fence-signal.v1",
            },
            "Account deletion fence rejected restaurant food request",
          ],
        ]);
        expect(JSON.stringify(loggerWarnMock.mock.calls)).not.toContain(
          externalUserId,
        );
        expect(JSON.stringify(loggerWarnMock.mock.calls)).not.toContain(
          "account deletion is in progress",
        );
      } finally {
        await pool.query(
          `DELETE FROM calora_capture_rate_limits WHERE key = ANY($1::text[])`,
          [accountKeys],
        );
        await pool.query(
          `DELETE FROM calora_account_deletion_states
            WHERE identity_fingerprint = encode(digest($1, 'sha256'), 'hex')`,
          [externalUserId],
        );
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        vi.clearAllMocks();
      }
    });
  },
);

describe.skipIf(!HAS_DB && !DATABASE_REQUIRED)(
  "account deletion database fence (real schema)",
  () => {
    let pool: (typeof import("@workspace/db"))["pool"];
    const run = randomUUID().slice(0, 8);
    const externalUserId = `deletion-fence-${run}`;
    const referredUserId = `deletion-fence-referred-${run}`;
    const referralCode = `DELFENCE${run.toUpperCase()}`;
    const qualificationSessionId = `deletion-fence-capture-${run}`;
    const rateLimitKey = `user:${externalUserId}`;

    async function expectDeletionFence(write: Promise<unknown>) {
      await expect(write).rejects.toMatchObject({
        code: "55000",
        message: "account deletion is in progress",
      });
    }

    it("blocks post-deletion writes to every fenced account table", async () => {
      pool = (await import("@workspace/db")).pool;
      await pool.query(
        `INSERT INTO calora_account_deletion_states (identity_fingerprint, state)
       VALUES (encode(digest($1, 'sha256'), 'hex'), 'active')`,
        [externalUserId],
      );

      await pool.query(
        `INSERT INTO calora_users (external_id, email) VALUES ($1, $2)`,
        [externalUserId, `${externalUserId}@example.com`],
      );
      await pool.query(
        `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)`,
        [externalUserId, referralCode],
      );
      await pool.query(
        `INSERT INTO calora_referral_redemptions
         (code, referrer_user_id, referred_user_id)
       VALUES ($1, $2, $3)`,
        [referralCode, externalUserId, referredUserId],
      );
      await pool.query(
        `INSERT INTO calora_referral_qualifications
         (external_user_id, capture_session_id, expires_at)
       VALUES ($1, $2, now() + interval '1 hour')`,
        [externalUserId, qualificationSessionId],
      );
      await pool.query(
        `INSERT INTO calora_capture_rate_limits (key, count, reset_at)
       VALUES ($1, 1, now() + interval '1 minute')`,
        [rateLimitKey],
      );
      await pool.query(
        `UPDATE calora_account_deletion_states
       SET state = 'deleting'
       WHERE identity_fingerprint = encode(digest($1, 'sha256'), 'hex')`,
        [externalUserId],
      );

      await expectDeletionFence(
        pool.query(
          `INSERT INTO calora_users (external_id, email) VALUES ($1, $2)`,
          [externalUserId, `${externalUserId}@example.com`],
        ),
      );
      await expectDeletionFence(
        pool.query(
          `INSERT INTO calora_referral_codes (user_id, code) VALUES ($1, $2)`,
          [externalUserId, referralCode],
        ),
      );
      await expectDeletionFence(
        pool.query(
          `INSERT INTO calora_referral_redemptions
           (code, referrer_user_id, referred_user_id)
         VALUES ($1, $2, $3)`,
          [referralCode, externalUserId, referredUserId],
        ),
      );
      await expectDeletionFence(
        pool.query(
          `INSERT INTO calora_referral_qualifications
           (external_user_id, capture_session_id, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')`,
          [externalUserId, qualificationSessionId],
        ),
      );
      await expectDeletionFence(
        pool.query(
          `INSERT INTO calora_capture_rate_limits (key, count, reset_at)
         VALUES ($1, 1, now() + interval '1 minute')`,
          [rateLimitKey],
        ),
      );

      await expectDeletionFence(
        pool.query(
          `UPDATE calora_users SET email = $2 WHERE external_id = $1`,
          [externalUserId, `${externalUserId}+updated@example.com`],
        ),
      );
      await expectDeletionFence(
        pool.query(
          `UPDATE calora_referral_codes SET code = $2 WHERE user_id = $1`,
          [externalUserId, `${referralCode}-UPDATED`],
        ),
      );
      await expectDeletionFence(
        pool.query(
          `UPDATE calora_referral_redemptions
         SET status = 'rewarded'
         WHERE referrer_user_id = $1 AND referred_user_id = $2`,
          [externalUserId, referredUserId],
        ),
      );
      await expectDeletionFence(
        pool.query(
          `UPDATE calora_referral_qualifications
         SET expires_at = now() + interval '2 hours'
         WHERE external_user_id = $1 AND capture_session_id = $2`,
          [externalUserId, qualificationSessionId],
        ),
      );
      await expectDeletionFence(
        pool.query(
          `UPDATE calora_capture_rate_limits
         SET count = 2
         WHERE key = $1`,
          [rateLimitKey],
        ),
      );
    });

    afterAll(async () => {
      if (!pool) return;
      const cleanupClient = await pool.connect();
      try {
        await cleanupClient.query("BEGIN");
        await cleanupClient.query(
          `DELETE FROM calora_referral_redemptions
         WHERE referrer_user_id = $1 OR referred_user_id = $2`,
          [externalUserId, referredUserId],
        );
        await cleanupClient.query(
          `DELETE FROM calora_referral_qualifications
         WHERE external_user_id = $1 OR capture_session_id = $2`,
          [externalUserId, qualificationSessionId],
        );
        await cleanupClient.query(
          `DELETE FROM calora_referral_codes WHERE user_id = $1`,
          [externalUserId],
        );
        await cleanupClient.query(
          `DELETE FROM calora_capture_rate_limits WHERE key = $1`,
          [rateLimitKey],
        );
        await cleanupClient.query(
          `DELETE FROM calora_users WHERE external_id = $1`,
          [externalUserId],
        );
        await cleanupClient.query(
          `DELETE FROM calora_account_deletion_states
         WHERE identity_fingerprint = encode(digest($1, 'sha256'), 'hex')`,
          [externalUserId],
        );
        await cleanupClient.query("COMMIT");
      } catch (error) {
        await cleanupClient.query("ROLLBACK");
        throw error;
      } finally {
        cleanupClient.release();
      }
    });
  },
);

describe.skipIf(!HAS_DB && !DATABASE_REQUIRED)(
  "account deletion fence provisioning (disposable schema)",
  () => {
    it("creates enabled INSERT/UPDATE fence triggers on every expected fresh-schema table", async () => {
      const { pool } = await import("@workspace/db");
      const { provisionDatabaseSupportObjects } =
        await import("../../../../lib/db/src/provision-support-objects.js");
      const client = await pool.connect();
      const schemaName = `calora_fence_${randomUUID().replaceAll("-", "")}`;
      const quotedSchemaName = `"${schemaName}"`;

      try {
        await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
        await client.query(`SET search_path TO ${quotedSchemaName}, public`);
        await client.query(`
        CREATE TABLE calora_account_deletion_states (
          identity_fingerprint text PRIMARY KEY,
          state text NOT NULL
        );
        CREATE TABLE calora_users (external_id text);
        CREATE TABLE calora_referral_codes (user_id text);
        CREATE TABLE calora_referral_redemptions (
          referrer_user_id text,
          referred_user_id text
        );
        CREATE TABLE calora_referral_qualifications (external_user_id text);
        CREATE TABLE calora_capture_rate_limits (key text);
      `);

        await provisionDatabaseSupportObjects(client);

        const catalog = await client.query<{
          table_name: string;
          enabled: string;
          is_before: boolean;
          is_row: boolean;
          on_insert: boolean;
          on_update: boolean;
        }>(
          `SELECT
           relation.relname AS table_name,
           trigger.tgenabled AS enabled,
           (trigger.tgtype & 2) <> 0 AS is_before,
           (trigger.tgtype & 1) <> 0 AS is_row,
           (trigger.tgtype & 4) <> 0 AS on_insert,
           (trigger.tgtype & 16) <> 0 AS on_update
         FROM pg_trigger AS trigger
         JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = $1
           AND trigger.tgname = 'calora_account_deletion_write_fence_trigger'
           AND NOT trigger.tgisinternal
         ORDER BY relation.relname`,
          [schemaName],
        );

        expect(catalog.rows).toEqual(
          EXPECTED_FENCED_TABLES.map((tableName) => ({
            table_name: tableName,
            enabled: "O",
            is_before: true,
            is_row: true,
            on_insert: true,
            on_update: true,
          })),
        );
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
    });

    it("repairs missing, disabled, and drifted triggers when re-provisioning an existing schema", async () => {
      const { pool } = await import("@workspace/db");
      const { provisionDatabaseSupportObjects } =
        await import("../../../../lib/db/src/provision-support-objects.js");
      const client = await pool.connect();
      const schemaName = `calora_fence_${randomUUID().replaceAll("-", "")}`;
      const quotedSchemaName = `"${schemaName}"`;

      try {
        await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
        await client.query(`SET search_path TO ${quotedSchemaName}, public`);
        await client.query(`
        CREATE TABLE calora_account_deletion_states (
          identity_fingerprint text PRIMARY KEY,
          state text NOT NULL
        );
        CREATE TABLE calora_users (external_id text);
        CREATE TABLE calora_referral_codes (user_id text);
        CREATE TABLE calora_referral_redemptions (
          referrer_user_id text,
          referred_user_id text
        );
        CREATE TABLE calora_referral_qualifications (external_user_id text);
        CREATE TABLE calora_capture_rate_limits (key text);
      `);

        await provisionDatabaseSupportObjects(client);

        await client.query(`
          DROP TRIGGER calora_account_deletion_write_fence_trigger
            ON calora_users;
          ALTER TABLE calora_referral_codes
            DISABLE TRIGGER calora_account_deletion_write_fence_trigger;
          DROP TRIGGER calora_account_deletion_write_fence_trigger
            ON calora_referral_redemptions;
          CREATE TRIGGER calora_account_deletion_write_fence_trigger
            AFTER INSERT ON calora_referral_redemptions
            FOR EACH ROW
            EXECUTE FUNCTION calora_account_deletion_write_fence();
          DROP TRIGGER calora_account_deletion_write_fence_trigger
            ON calora_referral_qualifications;
          CREATE TRIGGER calora_account_deletion_write_fence_trigger
            BEFORE UPDATE ON calora_referral_qualifications
            FOR EACH ROW
            EXECUTE FUNCTION calora_account_deletion_write_fence();
        `);
        await client.query(`
          CREATE OR REPLACE FUNCTION calora_account_deletion_write_fence()
          RETURNS TRIGGER AS $$
          BEGIN
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql
        `);

        await provisionDatabaseSupportObjects(client);

        const catalog = await client.query<{
          table_name: string;
          enabled: string;
          is_before: boolean;
          is_row: boolean;
          on_insert: boolean;
          on_update: boolean;
        }>(
          `SELECT
           relation.relname AS table_name,
           trigger.tgenabled AS enabled,
           (trigger.tgtype & 2) <> 0 AS is_before,
           (trigger.tgtype & 1) <> 0 AS is_row,
           (trigger.tgtype & 4) <> 0 AS on_insert,
           (trigger.tgtype & 16) <> 0 AS on_update
         FROM pg_trigger AS trigger
         JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = $1
           AND trigger.tgname = 'calora_account_deletion_write_fence_trigger'
           AND NOT trigger.tgisinternal
         ORDER BY relation.relname`,
          [schemaName],
        );
        const functionCatalog = await client.query<{
          definition: string;
        }>(
          `SELECT pg_get_functiondef(procedure.oid) AS definition
           FROM pg_proc AS procedure
           JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
           WHERE namespace.nspname = $1
             AND procedure.proname = 'calora_account_deletion_write_fence'
             AND pg_get_function_identity_arguments(procedure.oid) = ''
          `,
          [schemaName],
        );

        expect(catalog.rows).toEqual(
          EXPECTED_FENCED_TABLES.map((tableName) => ({
            table_name: tableName,
            enabled: "O",
            is_before: true,
            is_row: true,
            on_insert: true,
            on_update: true,
          })),
        );
        expect(functionCatalog.rows).toHaveLength(1);
        expect(functionCatalog.rows[0]?.definition).toContain(
          "calora_assert_deletion_writable",
        );

        const externalUserId = `repaired-fence-${randomUUID()}`;
        await client.query(
          `INSERT INTO calora_account_deletion_states
             (identity_fingerprint, state)
           VALUES (encode(digest($1, 'sha256'), 'hex'), 'deleting')`,
          [externalUserId],
        );
        await expect(
          client.query(`INSERT INTO calora_users (external_id) VALUES ($1)`, [
            externalUserId,
          ]),
        ).rejects.toMatchObject({
          code: "55000",
          message: "account deletion is in progress",
        });
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
    });

    it("rolls back functions and earlier triggers when a later fenced table is missing", async () => {
      const { pool } = await import("@workspace/db");
      const { provisionDatabaseSupportObjects } =
        await import("../../../../lib/db/src/provision-support-objects.js");
      const client = await pool.connect();
      const schemaName = `calora_fence_${randomUUID().replaceAll("-", "")}`;
      const quotedSchemaName = `"${schemaName}"`;

      try {
        await client.query(`CREATE SCHEMA ${quotedSchemaName}`);
        await client.query(`SET search_path TO ${quotedSchemaName}`);
        await client.query(`
        CREATE TABLE calora_account_deletion_states (
          identity_fingerprint text PRIMARY KEY,
          state text NOT NULL
        );
        CREATE TABLE calora_users (external_id text);
        CREATE TABLE calora_referral_codes (user_id text);
        CREATE TABLE calora_referral_redemptions (
          referrer_user_id text,
          referred_user_id text
        );
        CREATE TABLE calora_referral_qualifications (external_user_id text);
        CREATE TABLE calora_capture_rate_limits (key text);
      `);

        await provisionDatabaseSupportObjects(client);

        await client.query(`
          CREATE OR REPLACE FUNCTION calora_assert_deletion_writable(external_user_id TEXT)
          RETURNS VOID AS $$
          BEGIN
            RAISE NOTICE 'rollback sentinel';
            IF EXISTS (
              SELECT 1 FROM calora_account_deletion_states
              WHERE identity_fingerprint = encode(digest(external_user_id, 'sha256'), 'hex')
                AND state <> 'active'
            ) THEN
              RAISE EXCEPTION 'account deletion is in progress' USING ERRCODE = '55000';
            END IF;
          END;
          $$ LANGUAGE plpgsql
        `);

        const functionsBeforeFailure = await client.query<{
          routine_name: string;
          object_id: string;
          xmin: string;
          definition: string;
        }>(
          `SELECT
             procedure.proname AS routine_name,
             procedure.oid::text AS object_id,
             procedure.xmin::text AS xmin,
             pg_get_functiondef(procedure.oid) AS definition
           FROM pg_proc AS procedure
           JOIN pg_namespace AS namespace
             ON namespace.oid = procedure.pronamespace
           WHERE namespace.nspname = $1
             AND procedure.proname IN (
               'calora_assert_deletion_writable',
               'calora_account_deletion_write_fence'
             )
           ORDER BY procedure.proname`,
          [schemaName],
        );

        const triggersBeforeFailure = await client.query<{
          table_name: string;
          object_id: string;
          xmin: string;
          definition: string;
        }>(
          `SELECT
             relation.relname AS table_name,
             trigger.oid::text AS object_id,
             trigger.xmin::text AS xmin,
             pg_get_triggerdef(trigger.oid) AS definition
           FROM pg_trigger AS trigger
           JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
           JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
           WHERE namespace.nspname = $1
             AND trigger.tgname = 'calora_account_deletion_write_fence_trigger'
             AND NOT trigger.tgisinternal
           ORDER BY relation.relname`,
          [schemaName],
        );

        await client.query(`DROP TABLE calora_capture_rate_limits`);

        await expect(
          provisionDatabaseSupportObjects(client),
        ).rejects.toMatchObject({
          code: "42P01",
        });

        const functionsAfterFailure = await client.query<{
          routine_name: string;
          object_id: string;
          xmin: string;
          definition: string;
        }>(
          `SELECT
             procedure.proname AS routine_name,
             procedure.oid::text AS object_id,
             procedure.xmin::text AS xmin,
             pg_get_functiondef(procedure.oid) AS definition
           FROM pg_proc AS procedure
           JOIN pg_namespace AS namespace
             ON namespace.oid = procedure.pronamespace
           WHERE namespace.nspname = $1
             AND procedure.proname IN (
               'calora_assert_deletion_writable',
               'calora_account_deletion_write_fence'
             )
           ORDER BY procedure.proname`,
          [schemaName],
        );
        const triggersAfterFailure = await client.query<{
          table_name: string;
          object_id: string;
          xmin: string;
          definition: string;
        }>(
          `SELECT
             relation.relname AS table_name,
             trigger.oid::text AS object_id,
             trigger.xmin::text AS xmin,
             pg_get_triggerdef(trigger.oid) AS definition
           FROM pg_trigger AS trigger
           JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
           JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
           WHERE namespace.nspname = $1
             AND trigger.tgname = 'calora_account_deletion_write_fence_trigger'
             AND NOT trigger.tgisinternal
           ORDER BY relation.relname`,
          [schemaName],
        );

        expect(functionsAfterFailure.rows).toEqual(functionsBeforeFailure.rows);
        expect(triggersAfterFailure.rows).toEqual(
          triggersBeforeFailure.rows.filter(
            ({ table_name }) => table_name !== "calora_capture_rate_limits",
          ),
        );
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
    });
  },
);
