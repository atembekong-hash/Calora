-- Migration: 0019_admin_alert_deliveries
-- Description: Durable, privacy-minimized outbound alert delivery state.

CREATE TABLE IF NOT EXISTS calora_admin_alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES calora_admin_operational_alerts(id) ON DELETE CASCADE,
  fingerprint text NOT NULL CHECK (char_length(fingerprint) BETWEEN 16 AND 128),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  UNIQUE (alert_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS calora_admin_alert_deliveries_recent_idx
  ON calora_admin_alert_deliveries (created_at DESC, status);

ALTER TABLE calora_admin_alert_deliveries ENABLE ROW LEVEL SECURITY;
DO $admin_alert_delivery_grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE calora_admin_alert_deliveries FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE calora_admin_alert_deliveries FROM authenticated;
  END IF;
END
$admin_alert_delivery_grants$;
