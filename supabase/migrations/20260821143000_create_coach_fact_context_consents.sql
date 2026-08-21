-- Server-authoritative consent ledger for the dormant Coach Fact Context path.
-- This table stores consent metadata only: never facts, prompts, messages, or
-- any other user nutrition content. Deleting calora_users cascades this row.
CREATE TABLE IF NOT EXISTS public.calora_coach_fact_context_consents (
  user_id uuid NOT NULL REFERENCES public.calora_users(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  document_version text NOT NULL,
  state text NOT NULL CHECK (state IN ('consented_current', 'revoked')),
  decided_at timestamptz NOT NULL,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS calora_coach_fact_context_consents_user_purpose_idx
  ON public.calora_coach_fact_context_consents (user_id, purpose);

ALTER TABLE public.calora_coach_fact_context_consents ENABLE ROW LEVEL SECURITY;

-- The mobile client never accesses this ledger through the public data API.
-- It is read and written only by the authenticated API server service role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.calora_coach_fact_context_consents FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.calora_coach_fact_context_consents FROM authenticated;
  END IF;
END
$$;