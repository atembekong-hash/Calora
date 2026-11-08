-- Mission 408 prototype: database-enforced tenant isolation.
--
-- NOT FOR PRODUCTION APPLICATION. This file is a review artifact and must not
-- be merged until the API is migrated to the new role and the owner provisions
-- the database-only assertion secret. It deliberately leaves the existing
-- calora_api_runtime role unchanged.
--
-- Security model:
--   1. Supabase verifies the bearer token in the API.
--   2. The API creates a short-lived HMAC assertion for that verified user.
--   3. The API starts one transaction and sets the assertion with SET LOCAL.
--   4. A SECURITY DEFINER verifier reads the database-only secret and returns
--      the user identity only after verifying the HMAC and expiry.
--   5. RLS policies compare rows with that verified identity.
--   6. COMMIT/ROLLBACK clears the transaction-local identity on pooled clients.
--
-- The assertion secret is never readable by the runtime role. The role may set
-- an arbitrary GUC, but cannot forge another user's signed assertion.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'calora_api_runtime_rls') THEN
    CREATE ROLE calora_api_runtime_rls LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'calora_api_runtime_rls' AND rolbypassrls) THEN
    RAISE EXCEPTION 'calora_api_runtime_rls must not have BYPASSRLS; provision a least-privilege role before applying this prototype';
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
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'calora_api_runtime'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.calora_identity_assertion_secrets FROM %I', role_name);
    END IF;
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.calora_current_external_user_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  token text := current_setting('calora.identity_token', true);
  user_part text;
  expires_part text;
  nonce_part text;
  signature_part text;
  payload text;
  secret text;
  expected text;
  expires_at bigint;
BEGIN
  IF token IS NULL OR token !~ '^[^.]+\.[0-9]+\.[^.]+\.[0-9a-f]{64}$' THEN
    RETURN NULL;
  END IF;
  user_part := split_part(token, '.', 1);
  expires_part := split_part(token, '.', 2);
  nonce_part := split_part(token, '.', 3);
  signature_part := split_part(token, '.', 4);
  expires_at := expires_part::bigint;
  IF expires_at < floor(extract(epoch FROM clock_timestamp()))::bigint THEN
    RETURN NULL;
  END IF;
  SELECT secret_value INTO secret
    FROM public.calora_identity_assertion_secrets
   WHERE secret_key = 'active' AND active = true
   LIMIT 1;
  IF secret IS NULL THEN
    RETURN NULL;
  END IF;
  payload := user_part || '.' || expires_part || '.' || nonce_part;
  expected := encode(extensions.hmac(payload, secret, 'sha256'), 'hex');
  IF expected <> signature_part THEN
    RETURN NULL;
  END IF;
  RETURN user_part;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.calora_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
  SELECT id FROM public.calora_users
   WHERE external_id = public.calora_current_external_user_id()
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.calora_current_external_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calora_current_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calora_current_external_user_id() TO calora_api_runtime_rls;
GRANT EXECUTE ON FUNCTION public.calora_current_user_id() TO calora_api_runtime_rls;

-- The API role has no direct access to secrets, migration state, admin state,
-- provider caches, or shared operational state. Those paths require narrowly
-- scoped SECURITY DEFINER functions to be added in the coordinated rollout.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'calora_identity_assertion_secrets','calora_migration_journal','calora_server_config',
    'calora_account_deletion_states','calora_capture_rate_limits',
    'calora_recovery_warning_suppressions','calora_recovery_warning_summaries',
    'calora_cohort_memberships','calora_referral_qualifications','calora_admin_principals',
    'calora_admin_sessions','calora_admin_audit_events','calora_admin_operational_alerts',
    'calora_admin_alert_deliveries'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM calora_api_runtime_rls', t);
    END IF;
  END LOOP;
END
$$;

-- User-scoped rows keyed by internal Calora user id.
ALTER TABLE public.calora_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_ai_capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_ai_capture_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_sync_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_privacy_rights_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_coach_fact_context_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_coach_v2_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_coach_v2_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_coach_v2_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_coach_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.calora_users,
  public.calora_profiles,
  public.calora_diary_entries,
  public.calora_weight_entries,
  public.calora_saved_meals,
  public.calora_recipes,
  public.calora_recipe_items,
  public.calora_ai_capture_sessions,
  public.calora_ai_capture_candidates,
  public.calora_subscriptions,
  public.calora_sync_mutations,
  public.calora_consent_events,
  public.calora_privacy_rights_requests,
  public.calora_coach_fact_context_consents,
  public.calora_coach_v2_settings,
  public.calora_coach_v2_conversations,
  public.calora_coach_v2_turns,
  public.calora_coach_reports,
  public.calora_recipe_media,
  public.calora_referral_codes,
  public.calora_referral_redemptions
TO calora_api_runtime_rls;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'calora_users','calora_profiles','calora_diary_entries','calora_weight_entries',
    'calora_saved_meals','calora_recipes','calora_recipe_items','calora_ai_capture_sessions',
    'calora_ai_capture_candidates','calora_subscriptions','calora_sync_mutations',
    'calora_consent_events','calora_privacy_rights_requests','calora_coach_fact_context_consents',
    'calora_coach_v2_settings','calora_coach_v2_conversations','calora_coach_v2_turns','calora_coach_reports'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS mission408_owner_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS mission408_owner_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS mission408_owner_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS mission408_owner_delete ON public.%I', t);
  END LOOP;
END
$$;

CREATE POLICY mission408_owner_select ON public.calora_users FOR SELECT TO calora_api_runtime_rls USING (external_id = public.calora_current_external_user_id());
CREATE POLICY mission408_owner_insert ON public.calora_users FOR INSERT TO calora_api_runtime_rls WITH CHECK (external_id = public.calora_current_external_user_id());
CREATE POLICY mission408_owner_update ON public.calora_users FOR UPDATE TO calora_api_runtime_rls USING (id = public.calora_current_user_id()) WITH CHECK (id = public.calora_current_user_id() AND external_id = public.calora_current_external_user_id());
CREATE POLICY mission408_owner_delete ON public.calora_users FOR DELETE TO calora_api_runtime_rls USING (id = public.calora_current_user_id());

CREATE POLICY mission408_owner_select ON public.calora_profiles FOR SELECT TO calora_api_runtime_rls USING (user_id = public.calora_current_user_id());
CREATE POLICY mission408_owner_insert ON public.calora_profiles FOR INSERT TO calora_api_runtime_rls WITH CHECK (user_id = public.calora_current_user_id());
CREATE POLICY mission408_owner_update ON public.calora_profiles FOR UPDATE TO calora_api_runtime_rls USING (user_id = public.calora_current_user_id()) WITH CHECK (user_id = public.calora_current_user_id());
CREATE POLICY mission408_owner_delete ON public.calora_profiles FOR DELETE TO calora_api_runtime_rls USING (user_id = public.calora_current_user_id());

-- All remaining internal-user tables use the same user_id policy contract.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'calora_diary_entries','calora_weight_entries','calora_saved_meals','calora_recipes',
    'calora_ai_capture_sessions','calora_subscriptions','calora_sync_mutations','calora_consent_events',
    'calora_privacy_rights_requests','calora_coach_fact_context_consents','calora_coach_v2_settings',
    'calora_coach_v2_conversations','calora_coach_reports'
  ] LOOP
    EXECUTE format('CREATE POLICY mission408_owner_select ON public.%I FOR SELECT TO calora_api_runtime_rls USING (user_id = public.calora_current_user_id())', t);
    EXECUTE format('CREATE POLICY mission408_owner_insert ON public.%I FOR INSERT TO calora_api_runtime_rls WITH CHECK (user_id = public.calora_current_user_id())', t);
    EXECUTE format('CREATE POLICY mission408_owner_update ON public.%I FOR UPDATE TO calora_api_runtime_rls USING (user_id = public.calora_current_user_id()) WITH CHECK (user_id = public.calora_current_user_id())', t);
    EXECUTE format('CREATE POLICY mission408_owner_delete ON public.%I FOR DELETE TO calora_api_runtime_rls USING (user_id = public.calora_current_user_id())', t);
  END LOOP;
END
$$;

CREATE POLICY mission408_owner_select ON public.calora_recipe_items FOR SELECT TO calora_api_runtime_rls
  USING (EXISTS (SELECT 1 FROM public.calora_recipes r WHERE r.id = recipe_id AND r.user_id = public.calora_current_user_id()));
CREATE POLICY mission408_owner_insert ON public.calora_recipe_items FOR INSERT TO calora_api_runtime_rls
  WITH CHECK (EXISTS (SELECT 1 FROM public.calora_recipes r WHERE r.id = recipe_id AND r.user_id = public.calora_current_user_id()));
CREATE POLICY mission408_owner_update ON public.calora_recipe_items FOR UPDATE TO calora_api_runtime_rls
  USING (EXISTS (SELECT 1 FROM public.calora_recipes r WHERE r.id = recipe_id AND r.user_id = public.calora_current_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calora_recipes r WHERE r.id = recipe_id AND r.user_id = public.calora_current_user_id()));
CREATE POLICY mission408_owner_delete ON public.calora_recipe_items FOR DELETE TO calora_api_runtime_rls
  USING (EXISTS (SELECT 1 FROM public.calora_recipes r WHERE r.id = recipe_id AND r.user_id = public.calora_current_user_id()));

CREATE POLICY mission408_owner_select ON public.calora_ai_capture_candidates FOR SELECT TO calora_api_runtime_rls
  USING (EXISTS (SELECT 1 FROM public.calora_ai_capture_sessions s WHERE s.id = session_id AND s.user_id = public.calora_current_user_id()));
CREATE POLICY mission408_owner_insert ON public.calora_ai_capture_candidates FOR INSERT TO calora_api_runtime_rls
  WITH CHECK (EXISTS (SELECT 1 FROM public.calora_ai_capture_sessions s WHERE s.id = session_id AND s.user_id = public.calora_current_user_id()));
CREATE POLICY mission408_owner_update ON public.calora_ai_capture_candidates FOR UPDATE TO calora_api_runtime_rls
  USING (EXISTS (SELECT 1 FROM public.calora_ai_capture_sessions s WHERE s.id = session_id AND s.user_id = public.calora_current_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calora_ai_capture_sessions s WHERE s.id = session_id AND s.user_id = public.calora_current_user_id()));
CREATE POLICY mission408_owner_delete ON public.calora_ai_capture_candidates FOR DELETE TO calora_api_runtime_rls
  USING (EXISTS (SELECT 1 FROM public.calora_ai_capture_sessions s WHERE s.id = session_id AND s.user_id = public.calora_current_user_id()));

-- Recipe media and referral rows use verified Supabase external identity.
ALTER TABLE public.calora_recipe_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_referral_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY mission408_external_select ON public.calora_recipe_media FOR SELECT TO calora_api_runtime_rls USING (owner_external_id = public.calora_current_external_user_id());
CREATE POLICY mission408_external_insert ON public.calora_recipe_media FOR INSERT TO calora_api_runtime_rls WITH CHECK (owner_external_id = public.calora_current_external_user_id());
CREATE POLICY mission408_external_update ON public.calora_recipe_media FOR UPDATE TO calora_api_runtime_rls USING (owner_external_id = public.calora_current_external_user_id()) WITH CHECK (owner_external_id = public.calora_current_external_user_id());
CREATE POLICY mission408_external_delete ON public.calora_recipe_media FOR DELETE TO calora_api_runtime_rls USING (owner_external_id = public.calora_current_external_user_id());
CREATE POLICY mission408_referral_code_all ON public.calora_referral_codes FOR ALL TO calora_api_runtime_rls USING (user_id = public.calora_current_external_user_id()) WITH CHECK (user_id = public.calora_current_external_user_id());
CREATE POLICY mission408_referral_redemption_select ON public.calora_referral_redemptions FOR SELECT TO calora_api_runtime_rls USING (referrer_user_id = public.calora_current_external_user_id() OR referred_user_id = public.calora_current_external_user_id());
CREATE POLICY mission408_referral_redemption_write ON public.calora_referral_redemptions FOR ALL TO calora_api_runtime_rls USING (referrer_user_id = public.calora_current_external_user_id() OR referred_user_id = public.calora_current_external_user_id()) WITH CHECK (referrer_user_id = public.calora_current_external_user_id() OR referred_user_id = public.calora_current_external_user_id());

-- Shared food/nutrition data is readable but not writable by the API role.
GRANT SELECT ON TABLE public.calora_food_items, public.calora_recipe_nutrition TO calora_api_runtime_rls;
ALTER TABLE public.calora_food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calora_recipe_nutrition ENABLE ROW LEVEL SECURITY;
CREATE POLICY mission408_shared_select ON public.calora_food_items FOR SELECT TO calora_api_runtime_rls USING (true);
CREATE POLICY mission408_shared_select ON public.calora_recipe_nutrition FOR SELECT TO calora_api_runtime_rls USING (true);

REVOKE ALL ON SCHEMA public, extensions FROM calora_api_runtime_rls;
GRANT USAGE ON SCHEMA public, extensions TO calora_api_runtime_rls;
