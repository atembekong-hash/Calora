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
CREATE INDEX IF NOT EXISTS calora_coach_reports_digest_idx ON calora_coach_reports (message_ref_digest);
CREATE INDEX IF NOT EXISTS calora_coach_reports_expiry_idx ON calora_coach_reports (expires_at);
