-- Migration: 0018_admin_operational_alerts
-- Description: Persistent, privacy-minimized operational alert state for the admin console.
-- External notification delivery remains intentionally unconfigured until an approved destination exists.

CREATE TABLE IF NOT EXISTS calora_admin_operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL UNIQUE CHECK (char_length(alert_key) BETWEEN 3 AND 120),
  severity text NOT NULL CHECK (severity IN ('warning', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  detail text NOT NULL CHECK (char_length(detail) BETWEEN 3 AND 500),
  occurrence_count integer NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by_principal_id uuid REFERENCES calora_admin_principals(id) ON DELETE RESTRICT,
  resolved_at timestamptz,
  resolved_by_principal_id uuid REFERENCES calora_admin_principals(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS calora_admin_operational_alerts_status_idx
  ON calora_admin_operational_alerts (status, severity, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS calora_admin_operational_alerts_last_seen_idx
  ON calora_admin_operational_alerts (last_seen_at DESC);

ALTER TABLE calora_admin_operational_alerts ENABLE ROW LEVEL SECURITY;
DO $admin_alert_grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE calora_admin_operational_alerts FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE calora_admin_operational_alerts FROM authenticated;
  END IF;
END
$admin_alert_grants$;
