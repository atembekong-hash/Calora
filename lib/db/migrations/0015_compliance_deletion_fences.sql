-- Migration: 0015_compliance_deletion_fences
-- Description: Extend the durable account-deletion write fence to server-owned
-- Coach request ledgers and rollout memberships. Forward-only; do not edit.

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
  ELSIF TG_TABLE_NAME = 'calora_coach_fact_context_idempotency' THEN
    PERFORM calora_assert_deletion_writable(NEW.external_user_id);
  ELSIF TG_TABLE_NAME = 'calora_cohort_memberships' THEN
    PERFORM calora_assert_deletion_writable(NEW.external_user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.calora_coach_fact_context_idempotency') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON public.calora_coach_fact_context_idempotency';
    EXECUTE 'CREATE TRIGGER calora_account_deletion_write_fence_trigger
      BEFORE INSERT OR UPDATE ON public.calora_coach_fact_context_idempotency
      FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence()';
  END IF;
  IF to_regclass('public.calora_cohort_memberships') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON public.calora_cohort_memberships';
    EXECUTE 'CREATE TRIGGER calora_account_deletion_write_fence_trigger
      BEFORE INSERT OR UPDATE ON public.calora_cohort_memberships
      FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence()';
  END IF;
END;
$$;
