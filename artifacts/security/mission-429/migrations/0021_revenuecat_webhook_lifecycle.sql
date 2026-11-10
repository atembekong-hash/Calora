-- Mission 429: RevenueCat webhook lifecycle ledger.
-- Review and apply only through the approved production migration procedure.
BEGIN;

ALTER TABLE calora_subscriptions
  ADD COLUMN IF NOT EXISTS last_event_timestamp_ms BIGINT;

CREATE TABLE IF NOT EXISTS calora_revenuecat_webhook_events (
  event_id TEXT PRIMARY KEY,
  app_user_id TEXT,
  event_type TEXT NOT NULL,
  event_timestamp_ms BIGINT,
  environment TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received', 'applied', 'ignored', 'dead_letter')),
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS calora_revenuecat_webhook_events_user_received_idx
  ON calora_revenuecat_webhook_events(app_user_id, received_at);
CREATE INDEX IF NOT EXISTS calora_revenuecat_webhook_events_status_received_idx
  ON calora_revenuecat_webhook_events(status, received_at);

COMMENT ON TABLE calora_revenuecat_webhook_events IS
  'Durable idempotency and audit ledger for RevenueCat webhook deliveries; payloads are provider data, not client claims.';

COMMIT;
