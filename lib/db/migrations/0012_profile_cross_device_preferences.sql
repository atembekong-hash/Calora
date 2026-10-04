-- Migration: 0012_profile_cross_device_preferences
-- Description: Persist profile-owned nutrition-target and unit preferences in
-- the existing account-authoritative profile row. The migration is additive,
-- forward-only, and never rewrites an existing user's measurements or goals.

ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS target_mode text;
UPDATE calora_profiles
  SET target_mode = 'custom'
  WHERE target_mode IS NULL;
ALTER TABLE calora_profiles
  ALTER COLUMN target_mode SET DEFAULT 'custom';
ALTER TABLE calora_profiles
  ALTER COLUMN target_mode SET NOT NULL;
ALTER TABLE calora_profiles
  DROP CONSTRAINT IF EXISTS calora_profiles_target_mode_chk;
ALTER TABLE calora_profiles
  ADD CONSTRAINT calora_profiles_target_mode_chk
  CHECK (target_mode IN ('automatic', 'custom'));

ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS protein_target_grams integer;
ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS carbs_target_grams integer;
ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS fat_target_grams integer;

ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS units text;
UPDATE calora_profiles
  SET units = 'metric'
  WHERE units IS NULL;
ALTER TABLE calora_profiles
  ALTER COLUMN units SET DEFAULT 'metric';
ALTER TABLE calora_profiles
  ALTER COLUMN units SET NOT NULL;
ALTER TABLE calora_profiles
  DROP CONSTRAINT IF EXISTS calora_profiles_units_chk;
ALTER TABLE calora_profiles
  ADD CONSTRAINT calora_profiles_units_chk
  CHECK (units IN ('metric', 'imperial'));

ALTER TABLE calora_profiles
  DROP CONSTRAINT IF EXISTS calora_profiles_protein_target_grams_chk;
ALTER TABLE calora_profiles
  ADD CONSTRAINT calora_profiles_protein_target_grams_chk
  CHECK (protein_target_grams IS NULL OR protein_target_grams BETWEEN 0 AND 1000);
ALTER TABLE calora_profiles
  DROP CONSTRAINT IF EXISTS calora_profiles_carbs_target_grams_chk;
ALTER TABLE calora_profiles
  ADD CONSTRAINT calora_profiles_carbs_target_grams_chk
  CHECK (carbs_target_grams IS NULL OR carbs_target_grams BETWEEN 0 AND 1000);
ALTER TABLE calora_profiles
  DROP CONSTRAINT IF EXISTS calora_profiles_fat_target_grams_chk;
ALTER TABLE calora_profiles
  ADD CONSTRAINT calora_profiles_fat_target_grams_chk
  CHECK (fat_target_grams IS NULL OR fat_target_grams BETWEEN 0 AND 1000);
