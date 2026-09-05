-- Migration: 0004_recovery_warning_summary
-- Description: Preserve bounded, redacted suppressed recovery summaries across API restarts.
--
-- Immutability guarantee: once applied, this file must never be edited.
-- To change the schema, add a new numbered migration file.

CREATE TABLE IF NOT EXISTS calora_recovery_warning_summaries (
  cohort_key text PRIMARY KEY NOT NULL
    CHECK (char_length(cohort_key) = 64),
  correlation_keys jsonb NOT NULL,
  suppressed_cycle_count integer NOT NULL
    CHECK (suppressed_cycle_count > 0),
  first_seen_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS calora_recovery_warning_summaries_updated_at_idx
  ON calora_recovery_warning_summaries (updated_at);