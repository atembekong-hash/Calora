-- Migration: 0009_recipe_nutrition_cache_baseline
-- Description: Forward-only repair for the recipe nutrition cache foundation.
--
-- Historical migration 0008 intentionally remains immutable. Some databases
-- may have recorded its earlier guarded ALTER TABLE while the cache table did
-- not exist. This forward migration converges that supported application
-- baseline without rewriting migration history or fabricating nutrition data.

CREATE TABLE IF NOT EXISTS calora_recipe_nutrition (
  meal_id text PRIMARY KEY,
  calories integer NOT NULL,
  protein_g integer NOT NULL,
  carbs_g integer NOT NULL,
  fat_g integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calora_recipe_nutrition
  ADD COLUMN IF NOT EXISTS saturated_fat_g double precision,
  ADD COLUMN IF NOT EXISTS trans_fat_g double precision,
  ADD COLUMN IF NOT EXISTS monounsaturated_fat_g double precision,
  ADD COLUMN IF NOT EXISTS polyunsaturated_fat_g double precision,
  ADD COLUMN IF NOT EXISTS fiber_g double precision,
  ADD COLUMN IF NOT EXISTS sugars_g double precision,
  ADD COLUMN IF NOT EXISTS added_sugars_g double precision,
  ADD COLUMN IF NOT EXISTS cholesterol_mg double precision,
  ADD COLUMN IF NOT EXISTS sodium_mg double precision,
  ADD COLUMN IF NOT EXISTS potassium_mg double precision,
  ADD COLUMN IF NOT EXISTS calcium_mg double precision,
  ADD COLUMN IF NOT EXISTS iron_mg double precision,
  ADD COLUMN IF NOT EXISTS magnesium_mg double precision,
  ADD COLUMN IF NOT EXISTS zinc_mg double precision,
  ADD COLUMN IF NOT EXISTS phosphorus_mg double precision,
  ADD COLUMN IF NOT EXISTS selenium_mcg double precision,
  ADD COLUMN IF NOT EXISTS copper_mg double precision,
  ADD COLUMN IF NOT EXISTS vitamin_a_mcg double precision,
  ADD COLUMN IF NOT EXISTS vitamin_c_mg double precision,
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg double precision,
  ADD COLUMN IF NOT EXISTS vitamin_e_mg double precision,
  ADD COLUMN IF NOT EXISTS vitamin_k_mcg double precision,
  ADD COLUMN IF NOT EXISTS thiamin_mg double precision,
  ADD COLUMN IF NOT EXISTS riboflavin_mg double precision,
  ADD COLUMN IF NOT EXISTS niacin_mg double precision,
  ADD COLUMN IF NOT EXISTS vitamin_b5_mg double precision,
  ADD COLUMN IF NOT EXISTS vitamin_b6_mg double precision,
  ADD COLUMN IF NOT EXISTS vitamin_b12_mcg double precision,
  ADD COLUMN IF NOT EXISTS folate_mcg double precision,
  ADD COLUMN IF NOT EXISTS choline_mg double precision;
