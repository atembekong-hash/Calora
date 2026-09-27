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

// Migrations 0001–0008 are forward-only additions to Calora's existing base
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
    // database. Reset both application and Drizzle state so each scenario
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

async function verifyExpectedColumns(scenario, expectedMigrationCount = 9) {
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

    const history = await client.query(
      `SELECT count(*)::int AS count
         FROM drizzle.__drizzle_migrations`,
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

// A fresh nutrition-cache deployment must receive the canonical table from
// forward migration 0009 after the existing Calora base schema is present.
await resetDatabase(prerequisiteSchema);
runMigrations("fresh cache schema");
const fresh = await verifyExpectedColumns("fresh cache schema");
try {
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
    CREATE SCHEMA drizzle;
    CREATE TABLE drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('historical-0008-recorded-without-cache', 1790483200000);
  `);
} finally {
  await historical.end();
}
runMigrations("historical 0008 no-cache upgrade");
const historicalUpgrade = await verifyExpectedColumns("historical 0008 no-cache upgrade", 2);
try {
  const rows = await historicalUpgrade.query(
    "SELECT count(*)::int AS count FROM calora_recipe_nutrition",
  );
  assert.equal(rows.rows[0]?.count, 0, "historical repair must not fabricate rows");
  const history = await historicalUpgrade.query(
    "SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations",
  );
  assert.equal(history.rows[0]?.count, 2, "historical upgrade must append only 0009");
} finally {
  await historicalUpgrade.end();
}

console.info("recipe nutrition fresh, legacy, and historical-upgrade migration smoke tests passed");
