import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for the disposable recipe nutrition migration smoke test.",
  );
}

// Migrations 0001–0013 are forward-only additions to Calora's existing base
// application schema. This is the smallest representative base required by
// those immutable migrations; it deliberately omits the nutrition cache. A
// blank public schema is not a supported migration input because the historic
// chain references the existing managed Calora application tables.
const prerequisiteSchema = `
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  CREATE TABLE calora_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_id text NOT NULL);
  CREATE TABLE calora_diary_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE calora_referral_codes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL);
  CREATE TABLE calora_referral_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id text NOT NULL,
    referred_user_id text NOT NULL
  );
  CREATE TABLE calora_referral_qualifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_user_id text NOT NULL);
  CREATE TABLE calora_capture_rate_limits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL);
  -- Representative existing account profile: migration 0012 must add only
  -- nullable columns and must never infer or write preference values here.
  CREATE TABLE calora_profiles (
    user_id uuid PRIMARY KEY,
    goal text NOT NULL,
    activity_level text NOT NULL,
    diet_preference text NOT NULL,
    age integer NOT NULL,
    height_cm numeric(5, 1) NOT NULL,
    weight_kg numeric(5, 1) NOT NULL,
    target_weight_kg numeric(5, 1) NOT NULL,
    calorie_target integer NOT NULL,
    consent_version text NOT NULL,
    consent_accepted_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
  );
  INSERT INTO calora_profiles (
    user_id, goal, activity_level, diet_preference, age, height_cm, weight_kg,
    target_weight_kg, calorie_target, consent_version, consent_accepted_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000012', 'maintain', 'moderate', 'Everything', 31,
    170.0, 72.0, 72.0, 2100, 'calora-onboarding-v1', now(), now()
  );
`;

const legacySchema = `${prerequisiteSchema}
  CREATE TABLE calora_recipe_nutrition (
    meal_id text PRIMARY KEY,
    calories integer NOT NULL,
    protein_g integer NOT NULL,
    carbs_g integer NOT NULL,
    fat_g integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  INSERT INTO calora_recipe_nutrition (meal_id, calories, protein_g, carbs_g, fat_g)
  VALUES ('legacy-recipe', 425, 21, 64, 12);
`;

const expectedMicronutrientColumns = [
  "saturated_fat_g",
  "trans_fat_g",
  "monounsaturated_fat_g",
  "polyunsaturated_fat_g",
  "fiber_g",
  "sugars_g",
  "added_sugars_g",
  "cholesterol_mg",
  "sodium_mg",
  "potassium_mg",
  "calcium_mg",
  "iron_mg",
  "magnesium_mg",
  "zinc_mg",
  "phosphorus_mg",
  "selenium_mcg",
  "copper_mg",
  "vitamin_a_mcg",
  "vitamin_c_mg",
  "vitamin_d_mcg",
  "vitamin_e_mg",
  "vitamin_k_mcg",
  "thiamin_mg",
  "riboflavin_mg",
  "niacin_mg",
  "vitamin_b5_mg",
  "vitamin_b6_mg",
  "vitamin_b12_mcg",
  "folate_mcg",
  "choline_mg",
];

async function resetDatabase(schemaSql = null) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // This executable is intentionally admitted only against a disposable test
    // database. Reset both application and Calora migration-journal state so each scenario
    // proves the source-controlled migration sequence independently.
    await client.query(`
      DROP SCHEMA IF EXISTS drizzle CASCADE;
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
    `);
    if (schemaSql) await client.query(schemaSql);
  } finally {
    await client.end();
  }
}

function runMigrations(scenario) {
  const migration = spawnSync(
    "pnpm",
    ["--filter", "@workspace/db", "run", "migrate"],
    { cwd: root, env: process.env, encoding: "utf8" },
  );
  if (migration.status !== 0) {
    throw new Error(
      `${scenario} migration runner failed.\nstdout:\n${migration.stdout}\nstderr:\n${migration.stderr}`,
    );
  }
}

async function verifyExpectedColumns(scenario, expectedMigrationCount = 13) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const columns = await client.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'calora_recipe_nutrition'`,
    );
    const actual = new Map(
      columns.rows.map((row) => [row.column_name, row.data_type]),
    );
    for (const column of expectedMicronutrientColumns) {
      assert.equal(
        actual.get(column),
        "double precision",
        `${scenario} migration must create ${column} as double precision`,
      );
    }
    assert.equal(
      actual.get("meal_id"),
      "text",
      `${scenario} migration must retain the canonical meal identifier`,
    );
    for (const column of ["calories", "protein_g", "carbs_g", "fat_g"]) {
      assert.equal(
        actual.get(column),
        "double precision",
        `${scenario} migration must preserve fractional ${column} values`,
      );
    }

    const preferenceColumns = await client.query(
      `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'calora_profiles'
          AND column_name IN ('target_mode', 'protein_target_grams', 'carbs_target_grams', 'fat_target_grams', 'units')`,
    );
    const preferenceMap = new Map(
      preferenceColumns.rows.map((row) => [row.column_name, row]),
    );
    for (const [column, type] of [
      ['target_mode', 'text'],
      ['protein_target_grams', 'integer'],
      ['carbs_target_grams', 'integer'],
      ['fat_target_grams', 'integer'],
      ['units', 'text'],
    ]) {
      const columnInfo = preferenceMap.get(column);
      assert.equal(columnInfo?.data_type, type, `${scenario} must add ${column} with its intended type`);
      assert.equal(columnInfo?.is_nullable, 'YES', `${scenario} must keep legacy ${column} unknown until an explicit save`);
    }
    const legacyProfile = await client.query(
      `SELECT target_mode, protein_target_grams, carbs_target_grams, fat_target_grams, units
         FROM calora_profiles
        WHERE user_id = '00000000-0000-0000-0000-000000000012'`,
    );
    assert.deepEqual(
      legacyProfile.rows,
      [{
        target_mode: null,
        protein_target_grams: null,
        carbs_target_grams: null,
        fat_target_grams: null,
        units: null,
      }],
      `${scenario} migration must not backfill inferred profile preferences`,
    );

    const history = await client.query(
      `SELECT count(*)::int AS count
         FROM public.calora_migration_journal`,
    );
    assert.equal(
      history.rows[0]?.count,
      expectedMigrationCount,
      `${scenario} must record the expected immutable migration history`,
    );

    return client;
  } catch (error) {
    await client.end();
    throw error;
  }
}

async function verifyCaptureRateLimiter(client, scenario) {
  const columns = await client.query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'calora_capture_rate_limits'`,
  );
  const actual = new Map(
    columns.rows.map((row) => [row.column_name, row.data_type]),
  );
  assert.equal(
    actual.get("key"),
    "text",
    `${scenario} must retain the limiter key`,
  );
  assert.equal(
    actual.get("count"),
    "integer",
    `${scenario} must add the limiter count`,
  );
  assert.equal(
    actual.get("reset_at"),
    "timestamp with time zone",
    `${scenario} must add the limiter reset time`,
  );

  const index = await client.query(
    `SELECT indexdef
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'calora_capture_rate_limits'
        AND indexname = 'calora_capture_rate_limits_key_idx'`,
  );
  assert.match(
    index.rows[0]?.indexdef ?? "",
    /CREATE UNIQUE INDEX/i,
    `${scenario} must make the limiter key suitable for atomic upsert`,
  );

  const trigger = await client.query(
    `SELECT 1
       FROM pg_trigger trigger
       JOIN pg_class table_ref ON table_ref.oid = trigger.tgrelid
      WHERE table_ref.relname = 'calora_capture_rate_limits'
        AND trigger.tgname = 'calora_account_deletion_write_fence_trigger'
        AND NOT trigger.tgisinternal`,
  );
  assert.equal(
    trigger.rowCount,
    1,
    `${scenario} must retain the account-deletion write fence on the limiter`,
  );
}

async function verifyCoachV2Storage(client, scenario) {
  const tables = await client.query(
    `SELECT tablename, rowsecurity
       FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'calora_coach_v2_settings',
          'calora_coach_v2_conversations',
          'calora_coach_v2_turns'
        )`,
  );
  assert.deepEqual(
    tables.rows.sort((left, right) =>
      left.tablename.localeCompare(right.tablename),
    ),
    [
      { tablename: "calora_coach_v2_conversations", rowsecurity: true },
      { tablename: "calora_coach_v2_settings", rowsecurity: true },
      { tablename: "calora_coach_v2_turns", rowsecurity: true },
    ],
    `${scenario} must create private Coach V2 storage with RLS enabled`,
  );

  const triggers = await client.query(
    `SELECT table_ref.relname
       FROM pg_trigger trigger
       JOIN pg_class table_ref ON table_ref.oid = trigger.tgrelid
      WHERE table_ref.relname IN (
        'calora_coach_v2_settings',
        'calora_coach_v2_conversations',
        'calora_coach_v2_turns'
      )
        AND trigger.tgname = 'calora_account_deletion_write_fence_trigger'
        AND NOT trigger.tgisinternal`,
  );
  assert.deepEqual(
    triggers.rows.map((row) => row.relname).sort(),
    [
      "calora_coach_v2_conversations",
      "calora_coach_v2_settings",
      "calora_coach_v2_turns",
    ],
    `${scenario} must attach an account-deletion write fence to every Coach V2 table`,
  );
}

// A fresh nutrition-cache deployment must receive the canonical table from
// forward migration 0009 after the existing Calora base schema is present.
await resetDatabase(prerequisiteSchema);
runMigrations("fresh cache schema");
const fresh = await verifyExpectedColumns("fresh cache schema");
try {
  await verifyCaptureRateLimiter(fresh, "fresh cache schema");
  await verifyCoachV2Storage(fresh, "fresh cache schema");
  const rows = await fresh.query(
    "SELECT count(*)::int AS count FROM calora_recipe_nutrition",
  );
  assert.equal(rows.rows[0]?.count, 0, "fresh cache must not fabricate rows");
} finally {
  await fresh.end();
}

// A legacy pre-feature cache table must be upgraded without changing core
// macros, and omitted micronutrients must remain NULL rather than zero.
await resetDatabase(legacySchema);
runMigrations("legacy schema");
const legacy = await verifyExpectedColumns("legacy schema");
try {
  await verifyCaptureRateLimiter(legacy, "legacy schema");
  await verifyCoachV2Storage(legacy, "legacy schema");
  const rows = await legacy.query(
    `SELECT calories, protein_g, carbs_g, fat_g, fiber_g, iron_mg
       FROM calora_recipe_nutrition
      WHERE meal_id = 'legacy-recipe'`,
  );
  assert.deepEqual(
    rows.rows,
    [
      {
        calories: 425,
        protein_g: 21,
        carbs_g: 64,
        fat_g: 12,
        fiber_g: null,
        iron_mg: null,
      },
    ],
    "migration must preserve legacy macros and leave absent facts null",
  );

  await legacy.query(
    `UPDATE calora_recipe_nutrition
        SET fiber_g = 9.5, iron_mg = 3.25, vitamin_c_mg = 18
      WHERE meal_id = 'legacy-recipe'`,
  );
  const stored = await legacy.query(
    `SELECT fiber_g, iron_mg, vitamin_c_mg
       FROM calora_recipe_nutrition
      WHERE meal_id = 'legacy-recipe'`,
  );
  assert.deepEqual(stored.rows, [
    { fiber_g: 9.5, iron_mg: 3.25, vitamin_c_mg: 18 },
  ]);
} finally {
  await legacy.end();
}

// A deployed database may have recorded the original 0008 guarded ALTER TABLE
// while the cache did not exist. Drizzle will not replay historical migration
// bytes, so simulate that ledger state and prove forward-only 0009 repairs it.
await resetDatabase(prerequisiteSchema);
const historical = new Client({ connectionString: databaseUrl });
await historical.connect();
try {
  await historical.query(`
    CREATE TABLE public.calora_migration_journal (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
    INSERT INTO public.calora_migration_journal (hash, created_at)
    VALUES ('historical-0008-recorded-without-cache', 1790483200000);
    -- The abbreviated historical fixture records the immutable 0006 fence
    -- migration without replaying every managed base migration. Recreate its
    -- trigger function so forward-only 0010 can safely attach the limiter
    -- fence exactly as it would on a real upgraded database.
    CREATE FUNCTION calora_account_deletion_write_fence()
    RETURNS trigger AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
    CREATE FUNCTION calora_assert_deletion_writable(external_user_id text)
    RETURNS void AS $$ BEGIN RETURN; END; $$ LANGUAGE plpgsql;
  `);
} finally {
  await historical.end();
}
runMigrations("historical 0008 no-cache upgrade");
const historicalUpgrade = await verifyExpectedColumns(
  "historical 0008 no-cache upgrade",
  6,
);
try {
  await verifyCaptureRateLimiter(
    historicalUpgrade,
    "historical 0008 no-cache upgrade",
  );
  await verifyCoachV2Storage(
    historicalUpgrade,
    "historical 0008 no-cache upgrade",
  );
  const rows = await historicalUpgrade.query(
    "SELECT count(*)::int AS count FROM calora_recipe_nutrition",
  );
  assert.equal(
    rows.rows[0]?.count,
    0,
    "historical repair must not fabricate rows",
  );
  const history = await historicalUpgrade.query(
    "SELECT count(*)::int AS count FROM public.calora_migration_journal",
  );
  assert.equal(
    history.rows[0]?.count,
    6,
    "historical upgrade must append only 0009 through 0013",
  );
} finally {
  await historicalUpgrade.end();
}

console.info(
  "recipe nutrition fresh, legacy, and historical-upgrade migration smoke tests passed",
);
