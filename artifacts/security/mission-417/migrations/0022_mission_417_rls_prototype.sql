-- Mission 417 least-privilege prototype.
-- NOT FOR PRODUCTION APPLICATION.
-- This migration is an isolated design artifact until the API is changed to
-- use transaction-scoped signed identity assertions and owner approval is
-- recorded. It must not be merged into a release branch as an active rollout.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'calora_api_runtime_rls') THEN
    CREATE ROLE calora_api_runtime_rls LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'calora_api_runtime_rls' AND rolbypassrls) THEN
    RAISE EXCEPTION 'calora_api_runtime_rls must not have BYPASSRLS';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.calora_identity_assertion_secrets (
  secret_key text PRIMARY KEY,
  secret_value text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calora_identity_assertion_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.calora_identity_assertion_secrets FROM PUBLIC, calora_api_runtime_rls;
GRANT USAGE ON SCHEMA extensions TO calora_api_runtime_rls;
GRANT EXECUTE ON FUNCTION extensions.digest(text, text) TO calora_api_runtime_rls;

CREATE OR REPLACE FUNCTION public.calora_current_external_user_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
DECLARE
  token text := current_setting('calora.identity_token', true);
  user_part text;
  expires_part text;
  nonce_part text;
  signature_part text;
  secret text;
  expected text;
BEGIN
  IF token IS NULL OR token !~ '^[A-Za-z0-9_-]{1,128}\.[0-9]+\.[A-Za-z0-9_-]{16,64}\.[0-9a-f]{64}$' THEN RETURN NULL; END IF;
  user_part := split_part(token, '.', 1);
  expires_part := split_part(token, '.', 2);
  nonce_part := split_part(token, '.', 3);
  signature_part := split_part(token, '.', 4);
  IF expires_part::bigint <= floor(extract(epoch FROM clock_timestamp()))::bigint THEN RETURN NULL; END IF;
  SELECT secret_value INTO secret FROM public.calora_identity_assertion_secrets WHERE secret_key = 'active' AND active LIMIT 1;
  IF secret IS NULL THEN RETURN NULL; END IF;
  expected := encode(extensions.hmac(user_part || '.' || expires_part || '.' || nonce_part, secret, 'sha256'), 'hex');
  IF expected <> signature_part THEN RETURN NULL; END IF;
  RETURN user_part;
EXCEPTION WHEN others THEN RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calora_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $function$
  SELECT id FROM public.calora_users WHERE external_id = public.calora_current_external_user_id() LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.calora_current_external_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calora_current_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calora_current_external_user_id() TO calora_api_runtime_rls;
GRANT EXECUTE ON FUNCTION public.calora_current_user_id() TO calora_api_runtime_rls;

-- Only user-owned tables are included in this prototype. Admin, migration,
-- provider-cache, rate-limit, and server-config tables remain inaccessible.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'calora_users','calora_account_deletion_states','calora_profiles','calora_diary_entries','calora_weight_entries',
    'calora_saved_meals','calora_recipes','calora_subscriptions','calora_sync_mutations',
    'calora_consent_events','calora_privacy_rights_requests','calora_coach_v2_settings',
    'calora_coach_v2_conversations','calora_coach_v2_turns','calora_referral_codes',
    'calora_referral_redemptions','calora_ai_capture_sessions','calora_ai_capture_candidates',
    'calora_referral_qualifications'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO calora_api_runtime_rls', table_name);
      EXECUTE format('DROP POLICY IF EXISTS mission417_owner_all ON public.%I', table_name);
      IF table_name = 'calora_users' THEN
        -- Provisioning has no current internal UUID yet. Bind this bridge
        -- table to the verified external identity; downstream tables use
        -- calora_current_user_id() after the bridge row exists.
        EXECUTE format('CREATE POLICY mission417_owner_all ON public.%I FOR ALL TO calora_api_runtime_rls USING (external_id = public.calora_current_external_user_id()) WITH CHECK (external_id = public.calora_current_external_user_id())', table_name);
      ELSIF table_name = 'calora_account_deletion_states' THEN
        EXECUTE format('CREATE POLICY mission417_owner_all ON public.%I FOR ALL TO calora_api_runtime_rls USING (identity_fingerprint = encode(extensions.digest(public.calora_current_external_user_id(), ''sha256''), ''hex'')) WITH CHECK (identity_fingerprint = encode(extensions.digest(public.calora_current_external_user_id(), ''sha256''), ''hex''))', table_name);
      ELSIF table_name = 'calora_coach_v2_turns' THEN
        EXECUTE format('CREATE POLICY mission417_owner_all ON public.%I FOR ALL TO calora_api_runtime_rls USING (EXISTS (SELECT 1 FROM public.calora_coach_v2_conversations c WHERE c.id = conversation_id AND c.user_id = public.calora_current_user_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.calora_coach_v2_conversations c WHERE c.id = conversation_id AND c.user_id = public.calora_current_user_id()))', table_name);
      ELSIF table_name = 'calora_referral_codes' THEN
        EXECUTE format('DROP POLICY IF EXISTS mission417_referral_code_read ON public.%I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS mission417_referral_code_write ON public.%I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS mission417_referral_code_update ON public.%I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS mission417_referral_code_delete ON public.%I', table_name);
        EXECUTE format('CREATE POLICY mission417_referral_code_read ON public.%I FOR SELECT TO calora_api_runtime_rls USING (true)', table_name);
        EXECUTE format('CREATE POLICY mission417_referral_code_write ON public.%I FOR INSERT TO calora_api_runtime_rls WITH CHECK (user_id = public.calora_current_external_user_id())', table_name);
        EXECUTE format('CREATE POLICY mission417_referral_code_update ON public.%I FOR UPDATE TO calora_api_runtime_rls USING (user_id = public.calora_current_external_user_id()) WITH CHECK (user_id = public.calora_current_external_user_id())', table_name);
        EXECUTE format('CREATE POLICY mission417_referral_code_delete ON public.%I FOR DELETE TO calora_api_runtime_rls USING (user_id = public.calora_current_external_user_id())', table_name);
      ELSIF table_name = 'calora_referral_redemptions' THEN
        EXECUTE format('CREATE POLICY mission417_owner_all ON public.%I FOR ALL TO calora_api_runtime_rls USING (referred_user_id = public.calora_current_external_user_id() OR referrer_user_id = public.calora_current_external_user_id()) WITH CHECK (referred_user_id = public.calora_current_external_user_id() OR referrer_user_id = public.calora_current_external_user_id())', table_name);
      ELSIF table_name = 'calora_ai_capture_candidates' THEN
        EXECUTE format('CREATE POLICY mission417_owner_all ON public.%I FOR ALL TO calora_api_runtime_rls USING (EXISTS (SELECT 1 FROM public.calora_ai_capture_sessions s WHERE s.id = session_id AND s.user_id = public.calora_current_user_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.calora_ai_capture_sessions s WHERE s.id = session_id AND s.user_id = public.calora_current_user_id()))', table_name);
      ELSIF table_name = 'calora_referral_qualifications' THEN
        EXECUTE format('CREATE POLICY mission417_owner_all ON public.%I FOR ALL TO calora_api_runtime_rls USING (external_user_id = public.calora_current_external_user_id()) WITH CHECK (external_user_id = public.calora_current_external_user_id())', table_name);
      ELSE
        EXECUTE format('CREATE POLICY mission417_owner_all ON public.%I FOR ALL TO calora_api_runtime_rls USING (user_id = public.calora_current_user_id()) WITH CHECK (user_id = public.calora_current_user_id())', table_name);
      END IF;
    END IF;
  END LOOP;
END
$$;
