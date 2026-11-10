-- Mission 417: staged hardening artifact, not an active application migration.
-- It preserves the existing function signatures and bodies while pinning the
-- trusted schemas used by security-sensitive functions.
-- Apply only after owner-approved API/runtime-role rollout planning.

CREATE OR REPLACE FUNCTION public.calora_assert_deletion_writable(external_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.calora_account_deletion_states
    WHERE identity_fingerprint = encode(extensions.digest(external_user_id, 'sha256'), 'hex')
      AND state <> 'active'
  ) THEN
    RAISE EXCEPTION 'account deletion is in progress' USING ERRCODE = '55000';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calora_account_deletion_write_fence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE rate_limit_user_id text;
BEGIN
  IF current_setting('calora.deletion_worker', true) = 'on' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'calora_users' THEN
    PERFORM public.calora_assert_deletion_writable(NEW.external_id);
  ELSIF TG_TABLE_NAME = 'calora_referral_codes' THEN
    PERFORM public.calora_assert_deletion_writable(NEW.user_id);
  ELSIF TG_TABLE_NAME = 'calora_referral_redemptions' THEN
    PERFORM public.calora_assert_deletion_writable(NEW.referrer_user_id);
    PERFORM public.calora_assert_deletion_writable(NEW.referred_user_id);
  ELSIF TG_TABLE_NAME = 'calora_referral_qualifications' THEN
    PERFORM public.calora_assert_deletion_writable(NEW.external_user_id);
  ELSIF TG_TABLE_NAME = 'calora_recipe_media' THEN
    PERFORM public.calora_assert_deletion_writable(NEW.owner_external_id);
  ELSIF TG_TABLE_NAME = 'calora_capture_rate_limits' THEN
    rate_limit_user_id := substring(NEW.key FROM '(?:^|:)user:(.+)$');
    IF rate_limit_user_id IS NOT NULL THEN PERFORM public.calora_assert_deletion_writable(rate_limit_user_id); END IF;
  ELSIF TG_TABLE_NAME = 'calora_coach_fact_context_idempotency' THEN
    PERFORM public.calora_assert_deletion_writable(NEW.external_user_id);
  ELSIF TG_TABLE_NAME = 'calora_cohort_memberships' THEN
    PERFORM public.calora_assert_deletion_writable(NEW.external_user_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calora_coach_v2_write_fence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE external_user_id text;
BEGIN
  IF current_setting('calora.deletion_worker', true) = 'on' THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_TABLE_NAME = 'calora_coach_v2_settings' THEN
    SELECT external_id INTO external_user_id FROM public.calora_users WHERE id = NEW.user_id;
  ELSIF TG_TABLE_NAME = 'calora_coach_v2_conversations' THEN
    SELECT external_id INTO external_user_id FROM public.calora_users WHERE id = NEW.user_id;
  ELSIF TG_TABLE_NAME = 'calora_coach_v2_turns' THEN
    SELECT users.external_id INTO external_user_id
      FROM public.calora_coach_v2_conversations conversations
      INNER JOIN public.calora_users users ON users.id = conversations.user_id
      WHERE conversations.id = NEW.conversation_id;
  ELSIF TG_TABLE_NAME = 'calora_coach_reports' AND NEW.user_id IS NOT NULL THEN
    SELECT external_id INTO external_user_id FROM public.calora_users WHERE id = NEW.user_id;
  END IF;
  IF external_user_id IS NOT NULL THEN PERFORM public.calora_assert_deletion_writable(external_user_id); END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calora_admin_audit_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
BEGIN
  RAISE EXCEPTION 'administrative audit events are immutable' USING ERRCODE = '55000';
END;
$function$;
