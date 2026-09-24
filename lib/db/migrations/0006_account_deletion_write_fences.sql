-- Migration: 0006_account_deletion_write_fences
-- Description: Make account-deletion state and database write fences durable,
-- versioned production schema rather than an out-of-band support-object step.
--
-- Immutability guarantee: once applied, this file must never be edited.
-- To change the schema, add a new numbered migration file.
--
-- This migration is forward-only and non-destructive. It preserves existing
-- deletion-state records, replaces only the named trigger function definitions,
-- and atomically recreates the six named BEFORE INSERT OR UPDATE fences.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS calora_account_deletion_states (
  identity_fingerprint text PRIMARY KEY,
  state text NOT NULL,
  operation_id uuid,
  stage text NOT NULL DEFAULT 'application',
  lease_expires_at timestamptz,
  recovery_external_user_id text,
  requested_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_error text
);

CREATE OR REPLACE FUNCTION calora_assert_deletion_writable(external_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM calora_account_deletion_states
    WHERE identity_fingerprint = encode(digest(external_user_id, 'sha256'), 'hex')
      AND state <> 'active'
  ) THEN
    RAISE EXCEPTION 'account deletion is in progress' USING ERRCODE = '55000';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calora_account_deletion_write_fence()
RETURNS TRIGGER AS $$
DECLARE
  rate_limit_user_id TEXT;
BEGIN
  IF current_setting('calora.deletion_worker', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'calora_users' THEN
    PERFORM calora_assert_deletion_writable(NEW.external_id);
  ELSIF TG_TABLE_NAME = 'calora_referral_codes' THEN
    PERFORM calora_assert_deletion_writable(NEW.user_id);
  ELSIF TG_TABLE_NAME = 'calora_referral_redemptions' THEN
    PERFORM calora_assert_deletion_writable(NEW.referrer_user_id);
    PERFORM calora_assert_deletion_writable(NEW.referred_user_id);
  ELSIF TG_TABLE_NAME = 'calora_referral_qualifications' THEN
    PERFORM calora_assert_deletion_writable(NEW.external_user_id);
  ELSIF TG_TABLE_NAME = 'calora_recipe_media' THEN
    PERFORM calora_assert_deletion_writable(NEW.owner_external_id);
  ELSIF TG_TABLE_NAME = 'calora_capture_rate_limits' THEN
    rate_limit_user_id := substring(NEW.key FROM '(?:^|:)user:(.+)$');
    IF rate_limit_user_id IS NOT NULL THEN
      PERFORM calora_assert_deletion_writable(rate_limit_user_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_users;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
BEFORE INSERT OR UPDATE ON calora_users
FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence();

DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_referral_codes;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
BEFORE INSERT OR UPDATE ON calora_referral_codes
FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence();

DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_referral_redemptions;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
BEFORE INSERT OR UPDATE ON calora_referral_redemptions
FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence();

DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_referral_qualifications;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
BEFORE INSERT OR UPDATE ON calora_referral_qualifications
FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence();

DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_recipe_media;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
BEFORE INSERT OR UPDATE ON calora_recipe_media
FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence();

DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_capture_rate_limits;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
BEFORE INSERT OR UPDATE ON calora_capture_rate_limits
FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence();
