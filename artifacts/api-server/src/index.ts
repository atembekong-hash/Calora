import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Ensure the nutrition persistence table exists before accepting traffic.
// This is a safe no-op if the table was already created by a prior push.
async function runStartupMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_recipe_nutrition (
      meal_id   TEXT        PRIMARY KEY,
      calories  INTEGER     NOT NULL,
      protein_g INTEGER     NOT NULL,
      carbs_g   INTEGER     NOT NULL,
      fat_g     INTEGER     NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);
  // Referral qualification prerequisites — the server-verified chain
  // (user rows → capture sessions/candidates → diary entries → referral
  // redemptions) must exist on a fresh database before accepting traffic.
  // Column definitions mirror lib/db/src/schema/index.ts; every statement
  // is a safe no-op when already applied by a prior push or boot.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_users (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id  TEXT        NOT NULL,
      email        TEXT,
      display_name TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS calora_users_external_id_idx
      ON calora_users (external_id)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_food_items (
      id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      source             TEXT          NOT NULL,
      source_id          TEXT          NOT NULL,
      barcode            TEXT,
      name               TEXT          NOT NULL,
      brand              TEXT,
      serving_amount     NUMERIC(9,3)  NOT NULL,
      serving_unit       TEXT          NOT NULL,
      calories           NUMERIC(9,2)  NOT NULL,
      protein_g          NUMERIC(9,2)  NOT NULL,
      carbs_g            NUMERIC(9,2)  NOT NULL,
      fat_g              NUMERIC(9,2)  NOT NULL,
      verified_at        TIMESTAMPTZ,
      correction_version INTEGER       DEFAULT 1 NOT NULL,
      metadata           JSONB         DEFAULT '{}'::jsonb NOT NULL,
      created_at         TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
      updated_at         TIMESTAMPTZ   DEFAULT NOW() NOT NULL
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS calora_food_source_idx
      ON calora_food_items (source, source_id)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_diary_entries (
      id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id           UUID          NOT NULL REFERENCES calora_users(id) ON DELETE CASCADE,
      food_item_id      UUID          REFERENCES calora_food_items(id) ON DELETE SET NULL,
      entry_date        DATE          NOT NULL,
      meal              TEXT          NOT NULL,
      name              TEXT          NOT NULL,
      serving           TEXT          NOT NULL,
      calories          NUMERIC(9,2)  NOT NULL,
      protein_g         NUMERIC(9,2)  NOT NULL,
      carbs_g           NUMERIC(9,2)  NOT NULL,
      fat_g             NUMERIC(9,2)  NOT NULL,
      provenance        TEXT          NOT NULL,
      confidence        INTEGER       NOT NULL,
      notes             TEXT,
      client_updated_at TIMESTAMPTZ   NOT NULL,
      created_at        TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
      updated_at        TIMESTAMPTZ   DEFAULT NOW() NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_ai_capture_sessions (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID        NOT NULL REFERENCES calora_users(id) ON DELETE CASCADE,
      mode        TEXT        NOT NULL,
      input_uri   TEXT,
      status      TEXT        NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      reviewed_at TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_ai_capture_candidates (
      id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID          NOT NULL REFERENCES calora_ai_capture_sessions(id) ON DELETE CASCADE,
      name       TEXT          NOT NULL,
      calories   NUMERIC(9,2)  NOT NULL,
      protein_g  NUMERIC(9,2)  NOT NULL,
      carbs_g    NUMERIC(9,2)  NOT NULL,
      fat_g      NUMERIC(9,2)  NOT NULL,
      confidence INTEGER       NOT NULL,
      evidence   JSONB         DEFAULT '{}'::jsonb NOT NULL,
      accepted   BOOLEAN       DEFAULT FALSE NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_referral_codes (
      user_id    TEXT        PRIMARY KEY,
      code       TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS calora_referral_codes_code_idx
      ON calora_referral_codes (code)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_referral_redemptions (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      code                 TEXT        NOT NULL,
      referrer_user_id     TEXT        NOT NULL,
      referred_user_id     TEXT        NOT NULL,
      status               TEXT        DEFAULT 'pending' NOT NULL,
      qualified_at         TIMESTAMPTZ,
      qualified_signal     TEXT,
      referred_rewarded_at TIMESTAMPTZ,
      referrer_rewarded_at TIMESTAMPTZ,
      created_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS calora_referral_redemptions_referred_idx
      ON calora_referral_redemptions (referred_user_id)
  `);
  // Qualification columns — safe no-op when the table pre-dates them.
  await pool.query(`
    ALTER TABLE calora_referral_redemptions
      ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS qualified_signal TEXT
  `);
  // client_id for idempotent diary sync — nullable so pre-sync rows are
  // unaffected; unique per user when present.
  await pool.query(`
    ALTER TABLE calora_diary_entries
      ADD COLUMN IF NOT EXISTS client_id TEXT
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS calora_diary_entries_user_client_id_idx
      ON calora_diary_entries (user_id, client_id)
      WHERE client_id IS NOT NULL
  `);
  // capture_session_id links a synced diary row back to the server-recorded
  // AI capture session that produced it.  Written by POST /v1/sync when the
  // client provides a captureSessionId that the server can verify.  NULL for
  // rows synced without a session reference or written via POST /v1/diary.
  // Used by hasSyncedDiaryEntry Path 2 to gate referral qualification on
  // image/barcode provenance.
  await pool.query(`
    ALTER TABLE calora_diary_entries
      ADD COLUMN IF NOT EXISTS capture_session_id UUID
        REFERENCES calora_ai_capture_sessions(id) ON DELETE SET NULL
  `);
  // Mutation ledger for outbox sync idempotency.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_sync_mutations (
      mutation_id      UUID        PRIMARY KEY,
      user_id          UUID        NOT NULL REFERENCES calora_users(id) ON DELETE CASCADE,
      entity           TEXT        NOT NULL,
      operation        TEXT        NOT NULL,
      payload          JSONB       NOT NULL,
      client_updated_at TIMESTAMPTZ NOT NULL,
      processed_at     TIMESTAMPTZ
    )
  `);
  // Persistent rate-limit buckets for POST /v1/capture/analyze.
  // State survives restarts and is consistent across multiple instances.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calora_capture_rate_limits (
      key      TEXT        PRIMARY KEY,
      count    INTEGER     NOT NULL,
      reset_at TIMESTAMPTZ NOT NULL
    )
  `);
  logger.info("Startup migrations complete");
}

// ---------------------------------------------------------------------------
// Periodic cleanup — remove rate-limit rows that expired more than 2 hours
// ago.  Expired rows are already inert (the upsert resets any window whose
// reset_at is in the past) so this is purely a storage hygiene pass.
// Runs once per hour; errors are logged but never crash the server.
// ---------------------------------------------------------------------------
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function cleanupExpiredRateLimitRows(): Promise<void> {
  try {
    const result = await pool.query<{ count: string }>(
      `WITH deleted AS (
         DELETE FROM calora_capture_rate_limits
         WHERE reset_at < NOW() - INTERVAL '2 hours'
         RETURNING 1
       )
       SELECT COUNT(*)::text AS count FROM deleted`,
    );
    const count = Number(result.rows[0]?.count ?? 0);
    logger.info({ count }, "Rate-limit cleanup: removed expired rows");
  } catch (err) {
    logger.error({ err }, "Rate-limit cleanup failed");
  }
}

runStartupMigrations()
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");

      // Schedule the first cleanup shortly after boot, then repeat hourly.
      setTimeout(() => {
        cleanupExpiredRateLimitRows();
        setInterval(cleanupExpiredRateLimitRows, RATE_LIMIT_CLEANUP_INTERVAL_MS);
      }, 60_000); // initial delay: 1 minute after startup
    });
  })
  .catch((err) => {
    logger.error({ err }, "Startup migration failed — aborting");
    process.exit(1);
  });
