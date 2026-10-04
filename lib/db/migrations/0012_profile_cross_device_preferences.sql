-- Migration: 0012_profile_cross_device_preferences
-- Description: Add nullable profile-owned nutrition-target and unit
-- preferences. Existing rows intentionally remain NULL: no legacy value is
-- inferred and no existing profile row is rewritten by this forward-only
-- migration. A later explicit profile save records the account's chosen values.

ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS target_mode text;
ALTER TABLE calora_profiles
  DROP CONSTRAINT IF EXISTS calora_profiles_target_mode_chk;
ALTER TABLE calora_profiles
  ADD CONSTRAINT calora_profiles_target_mode_chk
  CHECK (target_mode IS NULL OR target_mode IN ('automatic', 'custom'));

ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS protein_target_grams integer;
ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS carbs_target_grams integer;
ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS fat_target_grams integer;

ALTER TABLE calora_profiles
  ADD COLUMN IF NOT EXISTS units text;
ALTER TABLE calora_profiles
  DROP CONSTRAINT IF EXISTS calora_profiles_units_chk;
ALTER TABLE calora_profiles
  ADD CONSTRAINT calora_profiles_units_chk
  CHECK (units IS NULL OR units IN ('metric', 'imperial'));

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
