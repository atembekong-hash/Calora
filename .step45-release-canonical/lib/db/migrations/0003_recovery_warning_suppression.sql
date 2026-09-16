-- Migration: 0003_recovery_warning_suppression
-- Description: Share bounded account-deletion recovery warning cooldowns across API instances.
--
-- Immutability guarantee: once applied, this file must never be edited.
-- To change the schema, add a new numbered migration file.

CREATE TABLE IF NOT EXISTS calora_recovery_warning_suppressions (
  warning_key text PRIMARY KEY NOT NULL,
  emitted_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS calora_recovery_warning_suppressions_expires_at_idx
  ON calora_recovery_warning_suppressions (expires_at);