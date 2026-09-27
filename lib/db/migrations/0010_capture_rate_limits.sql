-- Migration: 0010_capture_rate_limits
-- Description: Make the persistent capture limiter an immutable migration
-- prerequisite instead of relying on out-of-band schema provisioning.
--
-- This migration is forward-only and idempotent. Existing production limiter
-- rows are retained. New installations receive the canonical table and index.

CREATE TABLE IF NOT EXISTS calora_capture_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL CHECK (count >= 0),
  reset_at timestamptz NOT NULL
);

-- Earlier out-of-band provisioning could leave a minimal table behind. Bring
-- that shape forward without rewriting existing valid buckets. A duplicate
-- key deliberately makes the unique-index step fail rather than silently
-- discarding rate-limit state.
ALTER TABLE calora_capture_rate_limits
  ADD COLUMN IF NOT EXISTS count integer;
UPDATE calora_capture_rate_limits SET count = 0 WHERE count IS NULL;
ALTER TABLE calora_capture_rate_limits
  ALTER COLUMN count SET NOT NULL;

ALTER TABLE calora_capture_rate_limits
  ADD COLUMN IF NOT EXISTS reset_at timestamptz;
UPDATE calora_capture_rate_limits SET reset_at = now() WHERE reset_at IS NULL;
ALTER TABLE calora_capture_rate_limits
  ALTER COLUMN reset_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS calora_capture_rate_limits_key_idx
  ON calora_capture_rate_limits (key);
CREATE INDEX IF NOT EXISTS calora_capture_rate_limits_reset_at_idx
  ON calora_capture_rate_limits (reset_at);

-- The account-deletion write fence must protect limiter writes made after this
-- table is created. The function is established by immutable migration 0006.
DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger
  ON calora_capture_rate_limits;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
  BEFORE INSERT OR UPDATE ON calora_capture_rate_limits
  FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence();
