-- Migration: 0008_recipe_nutrition_facts
-- Description: Add optional source-backed micronutrients to the recipe nutrition cache.
--
-- Existing rows are intentionally preserved. NULL means the source did not
-- provide a fact, which is distinct from a measured zero and must remain so.
--
-- Immutability guarantee: once applied, this file must never be edited.

ALTER TABLE IF EXISTS calora_recipe_nutrition
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
