-- Mission 422 staged referral durability artifact.
-- NOT FOR PRODUCTION APPLICATION.
-- Apply only to a synthetic disposable database after explicit review.

CREATE TABLE IF NOT EXISTS public.calora_referral_reward_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id uuid NOT NULL REFERENCES public.calora_referral_redemptions(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('referred', 'referrer')),
  attempt_key uuid NOT NULL DEFAULT gen_random_uuid(),
  state text NOT NULL DEFAULT 'processing' CHECK (state IN ('processing', 'retry', 'granted')),
  lease_until timestamptz NOT NULL,
  provider_granted_at timestamptz,
  last_error text,
  reconciliation_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (redemption_id, side),
  UNIQUE (attempt_key)
);

CREATE INDEX IF NOT EXISTS calora_referral_reward_attempts_lease_idx
  ON public.calora_referral_reward_attempts (state, lease_until);

ALTER TABLE public.calora_referral_reward_attempts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.calora_referral_reward_attempts
  TO calora_api_runtime_rls;
DROP POLICY IF EXISTS mission422_owner_all ON public.calora_referral_reward_attempts;
CREATE POLICY mission422_owner_all
  ON public.calora_referral_reward_attempts
  FOR ALL TO calora_api_runtime_rls
  USING (
    EXISTS (
      SELECT 1
        FROM public.calora_referral_redemptions r
       WHERE r.id = redemption_id
         AND (r.referred_user_id = public.calora_current_external_user_id()
           OR r.referrer_user_id = public.calora_current_external_user_id())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.calora_referral_redemptions r
       WHERE r.id = redemption_id
         AND (r.referred_user_id = public.calora_current_external_user_id()
           OR r.referrer_user_id = public.calora_current_external_user_id())
    )
  );

COMMENT ON TABLE public.calora_referral_reward_attempts IS
  'Mission 422 staged-only claim/lease/reconciliation state; do not auto-apply to production.';
