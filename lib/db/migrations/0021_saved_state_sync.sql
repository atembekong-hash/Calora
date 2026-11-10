-- Migration: 0021_saved_state_sync
-- Description: Account-scoped saved meals/recipes synchronization with tombstones.
CREATE TABLE IF NOT EXISTS calora_saved_state_sync (
  user_id uuid PRIMARY KEY REFERENCES calora_users(id) ON DELETE CASCADE,
  saved_meals jsonb NOT NULL DEFAULT '[]'::jsonb,
  saved_recipe_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_meal_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_recipe_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_updated_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calora_saved_state_sync ENABLE ROW LEVEL SECURITY;
DO $saved_state_grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE calora_saved_state_sync FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE calora_saved_state_sync FROM authenticated;
  END IF;
END
$saved_state_grants$;
DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_saved_state_sync;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
  BEFORE INSERT OR UPDATE ON calora_saved_state_sync
  FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence();
