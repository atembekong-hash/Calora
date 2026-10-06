-- Calora empty-target baseline bootstrap
--
-- Generated from the reviewed Drizzle schema at protected source commit
-- d6ad1b1e9e8a79cdfcdb824a906526112fe310a4, then reviewed and made
-- target-safe. This is NOT a forward migration and must be executed only by
-- `bootstrap-empty-target` after its empty-target checks pass.
--
-- It creates no user rows and contains no DROP, TRUNCATE, or DELETE statement.
-- The launcher is responsible for the one allowed reconciliation step: dropping
-- an existing *empty* `public.calora_recipe_nutrition` cache table after proving
-- it is the only Calora table present.

--
-- Name: calora_account_deletion_write_fence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calora_account_deletion_write_fence() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE rate_limit_user_id TEXT;
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
    $_$;


--
-- Name: calora_assert_deletion_writable(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calora_assert_deletion_writable(external_user_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM calora_account_deletion_states
        WHERE identity_fingerprint = encode(digest(external_user_id, 'sha256'), 'hex')
          AND state <> 'active'
      ) THEN
        RAISE EXCEPTION 'account deletion is in progress' USING ERRCODE = '55000';
      END IF;
    END;
    $$;


--
-- Name: calora_coach_v2_write_fence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calora_coach_v2_write_fence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  external_user_id text;
BEGIN
  IF current_setting('calora.deletion_worker', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'calora_coach_v2_settings' THEN
    SELECT external_id INTO external_user_id FROM calora_users WHERE id = NEW.user_id;
  ELSIF TG_TABLE_NAME = 'calora_coach_v2_conversations' THEN
    SELECT external_id INTO external_user_id FROM calora_users WHERE id = NEW.user_id;
  ELSIF TG_TABLE_NAME = 'calora_coach_v2_turns' THEN
    SELECT users.external_id INTO external_user_id
      FROM calora_coach_v2_conversations conversations
      INNER JOIN calora_users users ON users.id = conversations.user_id
      WHERE conversations.id = NEW.conversation_id;
  END IF;

  IF external_user_id IS NOT NULL THEN
    PERFORM calora_assert_deletion_writable(external_user_id);
  END IF;
  RETURN NEW;
END;
$$;




--
-- Name: calora_account_deletion_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_account_deletion_states (
    identity_fingerprint text NOT NULL,
    state text NOT NULL,
    operation_id uuid,
    stage text DEFAULT 'object_storage'::text NOT NULL,
    lease_expires_at timestamp with time zone,
    recovery_external_user_id text,
    requested_at timestamp with time zone,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error text
);


--
-- Name: calora_ai_capture_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_ai_capture_candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    name text NOT NULL,
    calories numeric(9,2) NOT NULL,
    protein_g numeric(9,2) NOT NULL,
    carbs_g numeric(9,2) NOT NULL,
    fat_g numeric(9,2) NOT NULL,
    confidence integer NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    accepted boolean DEFAULT false NOT NULL
);


--
-- Name: calora_ai_capture_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_ai_capture_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    mode text NOT NULL,
    input_uri text,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone
);


--
-- Name: calora_capture_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_capture_rate_limits (
    key text NOT NULL,
    count integer NOT NULL,
    reset_at timestamp with time zone NOT NULL
);


--
-- Name: calora_coach_fact_context_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_coach_fact_context_consents (
    user_id uuid NOT NULL,
    purpose text NOT NULL,
    document_version text NOT NULL,
    state text NOT NULL,
    decided_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calora_coach_fact_context_consents_state_chk CHECK ((state = ANY (ARRAY['consented_current'::text, 'revoked'::text])))
);


--
-- Name: calora_coach_fact_context_idempotency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_coach_fact_context_idempotency (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_user_id text NOT NULL,
    request_nonce text NOT NULL,
    claimed_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: calora_coach_v2_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_coach_v2_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_coach_v2_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_coach_v2_settings (
    user_id uuid NOT NULL,
    personalization_enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_coach_v2_turns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_coach_v2_turns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    ordinal integer NOT NULL,
    user_message text NOT NULL,
    assistant_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT calora_coach_v2_turns_assistant_message_check CHECK (((assistant_message IS NULL) OR ((char_length(assistant_message) >= 1) AND (char_length(assistant_message) <= 4000)))),
    CONSTRAINT calora_coach_v2_turns_ordinal_check CHECK ((ordinal > 0)),
    CONSTRAINT calora_coach_v2_turns_user_message_check CHECK (((char_length(user_message) >= 1) AND (char_length(user_message) <= 2000)))
);


--
-- Name: calora_cohort_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_cohort_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cohort_name text NOT NULL,
    external_user_id text NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    added_by text NOT NULL,
    expires_at timestamp with time zone,
    reviewed_at timestamp with time zone
);


--
-- Name: calora_consent_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_consent_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    consent_type text NOT NULL,
    version text NOT NULL,
    accepted boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_diary_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_diary_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    food_item_id uuid,
    client_id text,
    capture_session_id uuid,
    entry_date date NOT NULL,
    meal text NOT NULL,
    name text NOT NULL,
    serving text NOT NULL,
    calories numeric(9,2) NOT NULL,
    protein_g numeric(9,2) NOT NULL,
    carbs_g numeric(9,2) NOT NULL,
    fat_g numeric(9,2) NOT NULL,
    provenance text NOT NULL,
    confidence integer NOT NULL,
    notes text,
    image_url text,
    image_source text,
    sync_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    client_updated_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_food_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_food_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source text NOT NULL,
    source_id text NOT NULL,
    barcode text,
    name text NOT NULL,
    brand text,
    serving_amount numeric(9,3) NOT NULL,
    serving_unit text NOT NULL,
    calories numeric(9,2) NOT NULL,
    protein_g numeric(9,2) NOT NULL,
    carbs_g numeric(9,2) NOT NULL,
    fat_g numeric(9,2) NOT NULL,
    verified_at timestamp with time zone,
    correction_version integer DEFAULT 1 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_profiles (
    user_id uuid NOT NULL,
    goal text NOT NULL,
    activity_level text NOT NULL,
    diet_preference text NOT NULL,
    age integer NOT NULL,
    height_cm numeric(5,1) NOT NULL,
    weight_kg numeric(5,1) NOT NULL,
    target_weight_kg numeric(5,1) NOT NULL,
    calorie_target integer NOT NULL,
    target_mode text,
    protein_target_grams integer,
    carbs_target_grams integer,
    fat_target_grams integer,
    units text,
    consent_version text NOT NULL,
    consent_accepted_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calora_profiles_carbs_target_grams_chk CHECK (((carbs_target_grams IS NULL) OR ((carbs_target_grams >= 0) AND (carbs_target_grams <= 1000)))),
    CONSTRAINT calora_profiles_fat_target_grams_chk CHECK (((fat_target_grams IS NULL) OR ((fat_target_grams >= 0) AND (fat_target_grams <= 1000)))),
    CONSTRAINT calora_profiles_protein_target_grams_chk CHECK (((protein_target_grams IS NULL) OR ((protein_target_grams >= 0) AND (protein_target_grams <= 1000)))),
    CONSTRAINT calora_profiles_target_mode_chk CHECK (((target_mode IS NULL) OR (target_mode = ANY (ARRAY['automatic'::text, 'custom'::text])))),
    CONSTRAINT calora_profiles_units_chk CHECK (((units IS NULL) OR (units = ANY (ARRAY['metric'::text, 'imperial'::text]))))
);


--
-- Name: calora_recipe_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_recipe_items (
    recipe_id uuid NOT NULL,
    food_item_id uuid NOT NULL,
    quantity_grams numeric(9,3) NOT NULL,
    preparation_state text
);


--
-- Name: calora_recipe_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_recipe_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_external_id text NOT NULL,
    client_recipe_id text NOT NULL,
    content_hash text NOT NULL,
    recipe_payload jsonb NOT NULL,
    image_id uuid,
    object_key text,
    model_version text NOT NULL,
    prompt_version text NOT NULL,
    status text DEFAULT 'generating'::text NOT NULL,
    semantic_review_state text DEFAULT 'needs_review'::text NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    last_error_code text,
    last_attempt_at timestamp with time zone,
    url_last_issued_at timestamp with time zone,
    last_rendered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calora_recipe_media_attempts_chk CHECK ((attempts >= 1)),
    CONSTRAINT calora_recipe_media_content_hash_chk CHECK ((content_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT calora_recipe_media_object_pair_chk CHECK (((image_id IS NULL) = (object_key IS NULL))),
    CONSTRAINT calora_recipe_media_review_chk CHECK ((semantic_review_state = ANY (ARRAY['needs_review'::text, 'accepted'::text, 'rejected'::text]))),
    CONSTRAINT calora_recipe_media_status_chk CHECK ((status = ANY (ARRAY['generating'::text, 'stored'::text, 'url_ready'::text, 'retryable_error'::text, 'superseded'::text])))
);


--
-- Name: TABLE calora_recipe_media; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.calora_recipe_media IS 'Server-owned generated recipe media. owner_external_id is resolved from the authenticated token; signed locators are never durable identity.';


--
-- Name: COLUMN calora_recipe_media.semantic_review_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.calora_recipe_media.semantic_review_state IS 'Generated pixels are not exact recipe proof. needs_review is the truthful default until the user accepts or rejects the depiction.';


--
-- Name: calora_recipe_nutrition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_recipe_nutrition (
    meal_id text NOT NULL,
    calories double precision NOT NULL,
    protein_g double precision NOT NULL,
    carbs_g double precision NOT NULL,
    fat_g double precision NOT NULL,
    saturated_fat_g double precision,
    trans_fat_g double precision,
    monounsaturated_fat_g double precision,
    polyunsaturated_fat_g double precision,
    fiber_g double precision,
    sugars_g double precision,
    added_sugars_g double precision,
    cholesterol_mg double precision,
    sodium_mg double precision,
    potassium_mg double precision,
    calcium_mg double precision,
    iron_mg double precision,
    magnesium_mg double precision,
    zinc_mg double precision,
    phosphorus_mg double precision,
    selenium_mcg double precision,
    copper_mg double precision,
    vitamin_a_mcg double precision,
    vitamin_c_mg double precision,
    vitamin_d_mcg double precision,
    vitamin_e_mg double precision,
    vitamin_k_mcg double precision,
    thiamin_mg double precision,
    riboflavin_mg double precision,
    niacin_mg double precision,
    vitamin_b5_mg double precision,
    vitamin_b6_mg double precision,
    vitamin_b12_mcg double precision,
    folate_mcg double precision,
    choline_mg double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    yield_servings numeric(7,2) NOT NULL,
    source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_recovery_warning_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_recovery_warning_summaries (
    cohort_key text NOT NULL,
    correlation_keys jsonb NOT NULL,
    suppressed_cycle_count integer NOT NULL,
    first_seen_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: calora_recovery_warning_suppressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_recovery_warning_suppressions (
    warning_key text NOT NULL,
    emitted_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: calora_referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_referral_codes (
    user_id text NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_referral_qualifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_referral_qualifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_user_id text NOT NULL,
    capture_session_id text NOT NULL,
    approved_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_referral_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_referral_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    referrer_user_id text NOT NULL,
    referred_user_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    qualified_at timestamp with time zone,
    qualified_signal text,
    referred_rewarded_at timestamp with time zone,
    referrer_rewarded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_saved_meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_saved_meals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    kind text DEFAULT 'meal'::text NOT NULL,
    calories numeric(9,2) NOT NULL,
    protein_g numeric(9,2) NOT NULL,
    carbs_g numeric(9,2) NOT NULL,
    fat_g numeric(9,2) NOT NULL,
    food_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_server_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_server_config (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    product_id text NOT NULL,
    entitlement text NOT NULL,
    status text NOT NULL,
    expires_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_sync_mutations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_sync_mutations (
    mutation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    entity text NOT NULL,
    operation text NOT NULL,
    payload jsonb NOT NULL,
    client_updated_at timestamp with time zone NOT NULL,
    processed_at timestamp with time zone
);


--
-- Name: calora_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_id text NOT NULL,
    email text,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_weight_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calora_weight_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    entry_date date NOT NULL,
    weight_kg numeric(5,1) NOT NULL,
    source text NOT NULL,
    client_updated_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calora_account_deletion_states calora_account_deletion_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_account_deletion_states
    ADD CONSTRAINT calora_account_deletion_states_pkey PRIMARY KEY (identity_fingerprint);


--
-- Name: calora_ai_capture_candidates calora_ai_capture_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_ai_capture_candidates
    ADD CONSTRAINT calora_ai_capture_candidates_pkey PRIMARY KEY (id);


--
-- Name: calora_ai_capture_sessions calora_ai_capture_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_ai_capture_sessions
    ADD CONSTRAINT calora_ai_capture_sessions_pkey PRIMARY KEY (id);


--
-- Name: calora_capture_rate_limits calora_capture_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_capture_rate_limits
    ADD CONSTRAINT calora_capture_rate_limits_pkey PRIMARY KEY (key);


--
-- Name: calora_coach_fact_context_consents calora_coach_fact_context_consents_user_id_purpose_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_fact_context_consents
    ADD CONSTRAINT calora_coach_fact_context_consents_user_id_purpose_pk PRIMARY KEY (user_id, purpose);


--
-- Name: calora_coach_fact_context_idempotency calora_coach_fact_context_idempotency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_fact_context_idempotency
    ADD CONSTRAINT calora_coach_fact_context_idempotency_pkey PRIMARY KEY (id);


--
-- Name: calora_coach_v2_conversations calora_coach_v2_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_v2_conversations
    ADD CONSTRAINT calora_coach_v2_conversations_pkey PRIMARY KEY (id);


--
-- Name: calora_coach_v2_settings calora_coach_v2_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_v2_settings
    ADD CONSTRAINT calora_coach_v2_settings_pkey PRIMARY KEY (user_id);


--
-- Name: calora_coach_v2_turns calora_coach_v2_turns_conversation_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_v2_turns
    ADD CONSTRAINT calora_coach_v2_turns_conversation_ordinal_key UNIQUE (conversation_id, ordinal);


--
-- Name: calora_coach_v2_turns calora_coach_v2_turns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_v2_turns
    ADD CONSTRAINT calora_coach_v2_turns_pkey PRIMARY KEY (id);


--
-- Name: calora_cohort_memberships calora_cohort_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_cohort_memberships
    ADD CONSTRAINT calora_cohort_memberships_pkey PRIMARY KEY (id);


--
-- Name: calora_consent_events calora_consent_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_consent_events
    ADD CONSTRAINT calora_consent_events_pkey PRIMARY KEY (id);


--
-- Name: calora_diary_entries calora_diary_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_diary_entries
    ADD CONSTRAINT calora_diary_entries_pkey PRIMARY KEY (id);


--
-- Name: calora_food_items calora_food_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_food_items
    ADD CONSTRAINT calora_food_items_pkey PRIMARY KEY (id);


--
-- Name: calora_profiles calora_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_profiles
    ADD CONSTRAINT calora_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: calora_recipe_items calora_recipe_items_recipe_id_food_item_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_recipe_items
    ADD CONSTRAINT calora_recipe_items_recipe_id_food_item_id_pk PRIMARY KEY (recipe_id, food_item_id);


--
-- Name: calora_recipe_media calora_recipe_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_recipe_media
    ADD CONSTRAINT calora_recipe_media_pkey PRIMARY KEY (id);


--
-- Name: calora_recipe_nutrition calora_recipe_nutrition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_recipe_nutrition
    ADD CONSTRAINT calora_recipe_nutrition_pkey PRIMARY KEY (meal_id);


--
-- Name: calora_recipes calora_recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_recipes
    ADD CONSTRAINT calora_recipes_pkey PRIMARY KEY (id);


--
-- Name: calora_recovery_warning_summaries calora_recovery_warning_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_recovery_warning_summaries
    ADD CONSTRAINT calora_recovery_warning_summaries_pkey PRIMARY KEY (cohort_key);


--
-- Name: calora_recovery_warning_suppressions calora_recovery_warning_suppressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_recovery_warning_suppressions
    ADD CONSTRAINT calora_recovery_warning_suppressions_pkey PRIMARY KEY (warning_key);


--
-- Name: calora_referral_codes calora_referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_referral_codes
    ADD CONSTRAINT calora_referral_codes_pkey PRIMARY KEY (user_id);


--
-- Name: calora_referral_qualifications calora_referral_qualifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_referral_qualifications
    ADD CONSTRAINT calora_referral_qualifications_pkey PRIMARY KEY (id);


--
-- Name: calora_referral_redemptions calora_referral_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_referral_redemptions
    ADD CONSTRAINT calora_referral_redemptions_pkey PRIMARY KEY (id);


--
-- Name: calora_saved_meals calora_saved_meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_saved_meals
    ADD CONSTRAINT calora_saved_meals_pkey PRIMARY KEY (id);


--
-- Name: calora_server_config calora_server_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_server_config
    ADD CONSTRAINT calora_server_config_pkey PRIMARY KEY (key);


--
-- Name: calora_subscriptions calora_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_subscriptions
    ADD CONSTRAINT calora_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: calora_sync_mutations calora_sync_mutations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_sync_mutations
    ADD CONSTRAINT calora_sync_mutations_pkey PRIMARY KEY (mutation_id);


--
-- Name: calora_users calora_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_users
    ADD CONSTRAINT calora_users_pkey PRIMARY KEY (id);


--
-- Name: calora_weight_entries calora_weight_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_weight_entries
    ADD CONSTRAINT calora_weight_entries_pkey PRIMARY KEY (id);


--
-- Name: calora_capture_rate_limits_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_capture_rate_limits_key_idx ON public.calora_capture_rate_limits USING btree (key);


--
-- Name: calora_capture_rate_limits_reset_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calora_capture_rate_limits_reset_at_idx ON public.calora_capture_rate_limits USING btree (reset_at);


--
-- Name: calora_coach_fact_context_consents_user_purpose_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_coach_fact_context_consents_user_purpose_idx ON public.calora_coach_fact_context_consents USING btree (user_id, purpose);


--
-- Name: calora_coach_fact_context_idempotency_user_nonce_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_coach_fact_context_idempotency_user_nonce_idx ON public.calora_coach_fact_context_idempotency USING btree (external_user_id, request_nonce);


--
-- Name: calora_coach_v2_conversations_user_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calora_coach_v2_conversations_user_updated_idx ON public.calora_coach_v2_conversations USING btree (user_id, updated_at DESC);


--
-- Name: calora_coach_v2_one_active_conversation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_coach_v2_one_active_conversation_idx ON public.calora_coach_v2_conversations USING btree (user_id) WHERE (archived_at IS NULL);


--
-- Name: calora_coach_v2_turns_conversation_ordinal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calora_coach_v2_turns_conversation_ordinal_idx ON public.calora_coach_v2_turns USING btree (conversation_id, ordinal);


--
-- Name: calora_cohort_memberships_cohort_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_cohort_memberships_cohort_user_idx ON public.calora_cohort_memberships USING btree (cohort_name, external_user_id);


--
-- Name: calora_diary_entries_user_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_diary_entries_user_client_id_idx ON public.calora_diary_entries USING btree (user_id, client_id) WHERE (client_id IS NOT NULL);


--
-- Name: calora_food_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_food_source_idx ON public.calora_food_items USING btree (source, source_id);


--
-- Name: calora_recipe_media_owner_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_recipe_media_owner_image_idx ON public.calora_recipe_media USING btree (owner_external_id, image_id) WHERE (image_id IS NOT NULL);


--
-- Name: calora_recipe_media_owner_recipe_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_recipe_media_owner_recipe_hash_idx ON public.calora_recipe_media USING btree (owner_external_id, client_recipe_id, content_hash);


--
-- Name: calora_recipe_media_owner_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calora_recipe_media_owner_updated_idx ON public.calora_recipe_media USING btree (owner_external_id, updated_at);


--
-- Name: calora_recovery_warning_summaries_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calora_recovery_warning_summaries_updated_at_idx ON public.calora_recovery_warning_summaries USING btree (updated_at);


--
-- Name: calora_recovery_warning_suppressions_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calora_recovery_warning_suppressions_expires_at_idx ON public.calora_recovery_warning_suppressions USING btree (expires_at);


--
-- Name: calora_referral_codes_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_referral_codes_code_idx ON public.calora_referral_codes USING btree (code);


--
-- Name: calora_referral_qualification_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_referral_qualification_session_idx ON public.calora_referral_qualifications USING btree (capture_session_id);


--
-- Name: calora_referral_qualification_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_referral_qualification_user_idx ON public.calora_referral_qualifications USING btree (external_user_id);


--
-- Name: calora_referral_redemptions_referred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_referral_redemptions_referred_idx ON public.calora_referral_redemptions USING btree (referred_user_id);


--
-- Name: calora_subscription_user_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_subscription_user_product_idx ON public.calora_subscriptions USING btree (user_id, product_id);


--
-- Name: calora_users_external_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_users_external_id_idx ON public.calora_users USING btree (external_id);


--
-- Name: calora_weight_user_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX calora_weight_user_date_idx ON public.calora_weight_entries USING btree (user_id, entry_date);


--
-- Name: calora_capture_rate_limits calora_account_deletion_write_fence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calora_account_deletion_write_fence_trigger BEFORE INSERT OR UPDATE ON public.calora_capture_rate_limits FOR EACH ROW EXECUTE FUNCTION public.calora_account_deletion_write_fence();


--
-- Name: calora_coach_v2_conversations calora_account_deletion_write_fence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calora_account_deletion_write_fence_trigger BEFORE INSERT OR UPDATE ON public.calora_coach_v2_conversations FOR EACH ROW EXECUTE FUNCTION public.calora_coach_v2_write_fence();


--
-- Name: calora_coach_v2_settings calora_account_deletion_write_fence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calora_account_deletion_write_fence_trigger BEFORE INSERT OR UPDATE ON public.calora_coach_v2_settings FOR EACH ROW EXECUTE FUNCTION public.calora_coach_v2_write_fence();


--
-- Name: calora_coach_v2_turns calora_account_deletion_write_fence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calora_account_deletion_write_fence_trigger BEFORE INSERT OR UPDATE ON public.calora_coach_v2_turns FOR EACH ROW EXECUTE FUNCTION public.calora_coach_v2_write_fence();


--
-- Name: calora_recipe_media calora_account_deletion_write_fence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calora_account_deletion_write_fence_trigger BEFORE INSERT OR UPDATE ON public.calora_recipe_media FOR EACH ROW EXECUTE FUNCTION public.calora_account_deletion_write_fence();


--
-- Name: calora_referral_codes calora_account_deletion_write_fence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calora_account_deletion_write_fence_trigger BEFORE INSERT OR UPDATE ON public.calora_referral_codes FOR EACH ROW EXECUTE FUNCTION public.calora_account_deletion_write_fence();


--
-- Name: calora_referral_qualifications calora_account_deletion_write_fence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calora_account_deletion_write_fence_trigger BEFORE INSERT OR UPDATE ON public.calora_referral_qualifications FOR EACH ROW EXECUTE FUNCTION public.calora_account_deletion_write_fence();


--
-- Name: calora_referral_redemptions calora_account_deletion_write_fence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calora_account_deletion_write_fence_trigger BEFORE INSERT OR UPDATE ON public.calora_referral_redemptions FOR EACH ROW EXECUTE FUNCTION public.calora_account_deletion_write_fence();


--
-- Name: calora_users calora_account_deletion_write_fence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calora_account_deletion_write_fence_trigger BEFORE INSERT OR UPDATE ON public.calora_users FOR EACH ROW EXECUTE FUNCTION public.calora_account_deletion_write_fence();


--
-- Name: calora_ai_capture_candidates calora_ai_capture_candidates_session_id_calora_ai_capture_sessi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_ai_capture_candidates
    ADD CONSTRAINT calora_ai_capture_candidates_session_id_calora_ai_capture_sessi FOREIGN KEY (session_id) REFERENCES public.calora_ai_capture_sessions(id) ON DELETE CASCADE;


--
-- Name: calora_ai_capture_sessions calora_ai_capture_sessions_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_ai_capture_sessions
    ADD CONSTRAINT calora_ai_capture_sessions_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_coach_fact_context_consents calora_coach_fact_context_consents_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_fact_context_consents
    ADD CONSTRAINT calora_coach_fact_context_consents_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_coach_v2_conversations calora_coach_v2_conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_v2_conversations
    ADD CONSTRAINT calora_coach_v2_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_coach_v2_settings calora_coach_v2_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_v2_settings
    ADD CONSTRAINT calora_coach_v2_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_coach_v2_turns calora_coach_v2_turns_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_coach_v2_turns
    ADD CONSTRAINT calora_coach_v2_turns_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.calora_coach_v2_conversations(id) ON DELETE CASCADE;


--
-- Name: calora_consent_events calora_consent_events_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_consent_events
    ADD CONSTRAINT calora_consent_events_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_diary_entries calora_diary_entries_capture_session_id_calora_ai_capture_sessi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_diary_entries
    ADD CONSTRAINT calora_diary_entries_capture_session_id_calora_ai_capture_sessi FOREIGN KEY (capture_session_id) REFERENCES public.calora_ai_capture_sessions(id) ON DELETE SET NULL;


--
-- Name: calora_diary_entries calora_diary_entries_food_item_id_calora_food_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_diary_entries
    ADD CONSTRAINT calora_diary_entries_food_item_id_calora_food_items_id_fk FOREIGN KEY (food_item_id) REFERENCES public.calora_food_items(id) ON DELETE SET NULL;


--
-- Name: calora_diary_entries calora_diary_entries_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_diary_entries
    ADD CONSTRAINT calora_diary_entries_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_profiles calora_profiles_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_profiles
    ADD CONSTRAINT calora_profiles_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_recipe_items calora_recipe_items_food_item_id_calora_food_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_recipe_items
    ADD CONSTRAINT calora_recipe_items_food_item_id_calora_food_items_id_fk FOREIGN KEY (food_item_id) REFERENCES public.calora_food_items(id) ON DELETE RESTRICT;


--
-- Name: calora_recipe_items calora_recipe_items_recipe_id_calora_recipes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_recipe_items
    ADD CONSTRAINT calora_recipe_items_recipe_id_calora_recipes_id_fk FOREIGN KEY (recipe_id) REFERENCES public.calora_recipes(id) ON DELETE CASCADE;


--
-- Name: calora_recipes calora_recipes_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_recipes
    ADD CONSTRAINT calora_recipes_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_saved_meals calora_saved_meals_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_saved_meals
    ADD CONSTRAINT calora_saved_meals_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_subscriptions calora_subscriptions_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_subscriptions
    ADD CONSTRAINT calora_subscriptions_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_sync_mutations calora_sync_mutations_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_sync_mutations
    ADD CONSTRAINT calora_sync_mutations_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_weight_entries calora_weight_entries_user_id_calora_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calora_weight_entries
    ADD CONSTRAINT calora_weight_entries_user_id_calora_users_id_fk FOREIGN KEY (user_id) REFERENCES public.calora_users(id) ON DELETE CASCADE;


--
-- Name: calora_coach_v2_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calora_coach_v2_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: calora_coach_v2_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calora_coach_v2_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: calora_coach_v2_turns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calora_coach_v2_turns ENABLE ROW LEVEL SECURITY;

--
-- Name: calora_recipe_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calora_recipe_media ENABLE ROW LEVEL SECURITY;


-- The API is the sole Calora data-plane access path.  The application verifies
-- Supabase bearer tokens server-side and applies owner predicates in SQL; no
-- direct PostgREST/Data API table access is part of this contract.  Deny the
-- browser roles explicitly so a future direct-client integration must add a
-- separately reviewed policy rather than inheriting accidental grants.
DO $calora_server_only_access$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'calora_account_deletion_states',
    'calora_ai_capture_candidates',
    'calora_ai_capture_sessions',
    'calora_capture_rate_limits',
    'calora_coach_fact_context_consents',
    'calora_coach_fact_context_idempotency',
    'calora_coach_v2_conversations',
    'calora_coach_v2_settings',
    'calora_coach_v2_turns',
    'calora_cohort_memberships',
    'calora_consent_events',
    'calora_diary_entries',
    'calora_food_items',
    'calora_profiles',
    'calora_recipe_items',
    'calora_recipe_media',
    'calora_recipe_nutrition',
    'calora_recipes',
    'calora_recovery_warning_summaries',
    'calora_recovery_warning_suppressions',
    'calora_referral_codes',
    'calora_referral_qualifications',
    'calora_referral_redemptions',
    'calora_saved_meals',
    'calora_server_config',
    'calora_subscriptions',
    'calora_sync_mutations',
    'calora_users',
    'calora_weight_entries'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
    END IF;
  END LOOP;
END
$calora_server_only_access$;
