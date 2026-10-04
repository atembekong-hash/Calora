-- Migration: 0013_recipe_nutrition_decimal_macros
-- Description: Preserve normalized fractional recipe nutrition estimates.
--
-- The API intentionally accepts fractional calories and macronutrients from
-- source-backed and AI-derived estimates. The original cache baseline used
-- integer columns, which rejected otherwise valid estimates during its
-- best-effort L2 cache upsert. Widening these values is forward-only and
-- preserves every existing integer exactly; it does not create or alter rows.
ALTER TABLE calora_recipe_nutrition
  ALTER COLUMN calories TYPE double precision USING calories::double precision,
  ALTER COLUMN protein_g TYPE double precision USING protein_g::double precision,
  ALTER COLUMN carbs_g TYPE double precision USING carbs_g::double precision,
  ALTER COLUMN fat_g TYPE double precision USING fat_g::double precision;
