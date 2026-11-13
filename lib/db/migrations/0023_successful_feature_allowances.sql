-- Server-authoritative daily successful-operation allowances.
-- Pending operations do not consume an allowance until finalized successfully.
-- Idempotency keys make retries and duplicate taps safe.
CREATE TABLE IF NOT EXISTS calora_feature_usage (
  user_id text NOT NULL,
  feature text NOT NULL,
  day_key date NOT NULL,
  successful_count integer NOT NULL DEFAULT 0,
  pending_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  completed_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, day_key),
  CONSTRAINT calora_feature_usage_successful_count_nonnegative CHECK (successful_count >= 0)
);

CREATE INDEX IF NOT EXISTS calora_feature_usage_day_idx
  ON calora_feature_usage (day_key, feature);
