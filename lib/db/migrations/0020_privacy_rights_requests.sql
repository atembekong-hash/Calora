-- Migration: 0020_privacy_rights_requests
-- Description: Account-scoped privacy-rights intake and status ledger.
-- This records request metadata only; it does not decide legal applicability or SLA.

CREATE TABLE IF NOT EXISTS calora_privacy_rights_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES calora_users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('access', 'correct', 'delete', 'portability', 'restrict', 'withdraw_consent')),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'needs_verification', 'in_review', 'completed', 'declined')),
  requester_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS calora_privacy_rights_requests_user_created_idx
  ON calora_privacy_rights_requests (user_id, created_at DESC);

ALTER TABLE calora_privacy_rights_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE calora_privacy_rights_requests FROM anon, authenticated;

DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_privacy_rights_requests;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
  BEFORE INSERT OR UPDATE ON calora_privacy_rights_requests
  FOR EACH ROW EXECUTE FUNCTION calora_account_deletion_write_fence();
