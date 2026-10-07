-- Migration: 0017_admin_control_plane
-- Description: Forward-only, server-enforced Calora administration foundation.
-- This migration also repairs the prior Coach-report schema omission in the
-- reviewed empty-target baseline. No consumer-facing data is copied or exposed.

CREATE TABLE IF NOT EXISTS calora_coach_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES calora_users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('guest', 'account')),
  message_ref_digest text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('unsafe', 'inaccurate', 'privacy', 'other')),
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);
ALTER TABLE calora_coach_reports
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE calora_coach_reports
   SET scope = COALESCE(scope, CASE WHEN user_id IS NULL THEN 'guest' ELSE 'account' END),
       expires_at = COALESCE(expires_at, created_at + interval '90 days')
 WHERE scope IS NULL OR expires_at IS NULL;
ALTER TABLE calora_coach_reports
  ALTER COLUMN scope SET NOT NULL,
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '90 days');
ALTER TABLE calora_coach_reports
  DROP CONSTRAINT IF EXISTS calora_coach_reports_scope_check;
ALTER TABLE calora_coach_reports
  ADD CONSTRAINT calora_coach_reports_scope_check CHECK (scope IN ('guest', 'account'));
ALTER TABLE calora_coach_reports
  DROP CONSTRAINT IF EXISTS calora_coach_reports_status_check;
ALTER TABLE calora_coach_reports
  ADD CONSTRAINT calora_coach_reports_status_check
  CHECK (status IN ('received', 'under_review', 'resolved', 'dismissed', 'escalated'));
CREATE INDEX IF NOT EXISTS calora_coach_reports_digest_idx ON calora_coach_reports (message_ref_digest);
CREATE INDEX IF NOT EXISTS calora_coach_reports_expiry_idx ON calora_coach_reports (expires_at);
CREATE INDEX IF NOT EXISTS calora_coach_reports_status_created_idx ON calora_coach_reports (status, created_at DESC);

CREATE TABLE calora_admin_principals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_user_id text NOT NULL,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  role text NOT NULL CHECK (role IN ('owner', 'operations', 'support', 'content', 'moderation', 'analyst')),
  granted_by_principal_id uuid REFERENCES calora_admin_principals(id) ON DELETE RESTRICT,
  grant_reason text NOT NULL CHECK (char_length(grant_reason) BETWEEN 3 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by_principal_id uuid REFERENCES calora_admin_principals(id) ON DELETE RESTRICT,
  revocation_reason text CHECK (revocation_reason IS NULL OR char_length(revocation_reason) BETWEEN 3 AND 500),
  CONSTRAINT calora_admin_principals_bootstrap_audit_check
    CHECK (granted_by_principal_id IS NOT NULL OR grant_reason = 'bootstrap')
);
CREATE UNIQUE INDEX calora_admin_principals_external_user_idx
  ON calora_admin_principals (external_user_id);
CREATE INDEX calora_admin_principals_active_role_idx
  ON calora_admin_principals (role) WHERE revoked_at IS NULL;

CREATE TABLE calora_admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id uuid NOT NULL REFERENCES calora_admin_principals(id) ON DELETE RESTRICT,
  token_digest text NOT NULL CHECK (char_length(token_digest) = 64),
  csrf_digest text NOT NULL CHECK (char_length(csrf_digest) = 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  reauth_until timestamptz,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX calora_admin_sessions_active_principal_idx
  ON calora_admin_sessions (principal_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE calora_admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_principal_id uuid REFERENCES calora_admin_principals(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (char_length(action) BETWEEN 3 AND 100),
  target_type text,
  target_reference text,
  result text NOT NULL CHECK (result IN ('success', 'denied', 'failed')),
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calora_admin_audit_events_created_idx ON calora_admin_audit_events (created_at DESC);
CREATE INDEX calora_admin_audit_events_action_created_idx ON calora_admin_audit_events (action, created_at DESC);

CREATE OR REPLACE FUNCTION calora_admin_audit_events_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'administrative audit events are immutable' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER calora_admin_audit_events_immutable_trigger
  BEFORE UPDATE OR DELETE ON calora_admin_audit_events
  FOR EACH ROW EXECUTE FUNCTION calora_admin_audit_events_immutable();

-- Repair and extend the existing Coach deletion fence so no report can be
-- inserted or changed once the associated account is being erased.
CREATE OR REPLACE FUNCTION calora_coach_v2_write_fence()
RETURNS TRIGGER AS $$
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
  ELSIF TG_TABLE_NAME = 'calora_coach_reports' AND NEW.user_id IS NOT NULL THEN
    SELECT external_id INTO external_user_id FROM calora_users WHERE id = NEW.user_id;
  END IF;

  IF external_user_id IS NOT NULL THEN
    PERFORM calora_assert_deletion_writable(external_user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_coach_reports;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
  BEFORE INSERT OR UPDATE ON calora_coach_reports
  FOR EACH ROW EXECUTE FUNCTION calora_coach_v2_write_fence();

ALTER TABLE calora_coach_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE calora_admin_principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE calora_admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calora_admin_audit_events ENABLE ROW LEVEL SECURITY;
DO $admin_grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE calora_coach_reports, calora_admin_principals,
      calora_admin_sessions, calora_admin_audit_events FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE calora_coach_reports, calora_admin_principals,
      calora_admin_sessions, calora_admin_audit_events FROM authenticated;
  END IF;
END
$admin_grants$;
