-- Migration: 0001_task_473_coach_fact_context
-- Version: task-473
-- Description: Task 473 forward-only schema additions for Coach Fact Context.
--   Single immutable authority for consent, rollout, and replay-prevention tables.
--
-- Immutability guarantee: once applied, this file must never be edited.
-- To change the schema, add a new numbered migration file.
--
-- Safety mechanics:
--   All DDL uses IF NOT EXISTS / IF EXISTS guards so this migration is safe
--   to run against a dev DB that already had parts applied manually, and safe
--   to apply on a fresh DB before or after any baseline script.

-- ── Coach Fact Context consent ledger ────────────────────────────────────────
-- Server-authoritative record of coach-fact-context consent per user+purpose.
-- Contains consent metadata only — never Fact Context, Foundation facts,
-- prompts, or conversation content.
-- PK: (user_id, purpose) — one row per user per purpose.
-- FK: user_id → calora_users(id) ON DELETE CASCADE.
-- CHECK: state must be one of the two explicit terminal values.
CREATE TABLE IF NOT EXISTS calora_coach_fact_context_consents (
  user_id          uuid        NOT NULL REFERENCES calora_users(id) ON DELETE CASCADE,
  purpose          text        NOT NULL,
  document_version text        NOT NULL,
  state            text        NOT NULL,
  decided_at       timestamptz NOT NULL,
  revoked_at       timestamptz,
  updated_at       timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT calora_coach_fact_context_consents_user_id_purpose_pk PRIMARY KEY (user_id, purpose),
  CONSTRAINT calora_coach_fact_context_consents_state_chk
    CHECK (state IN ('consented_current', 'revoked'))
);
CREATE UNIQUE INDEX IF NOT EXISTS calora_coach_fact_context_consents_user_purpose_idx
  ON calora_coach_fact_context_consents (user_id, purpose);

-- ── Server-owned operational config (deny-default gate store) ────────────────
-- Absent key ⟹ feature disabled. Never exposed via client API.
-- The global on/off switch for the Coach Fact Context rollout is the row
-- with key = 'coach_fact_context_rollout_enabled' and value = true (jsonb).
CREATE TABLE IF NOT EXISTS calora_server_config (
  key        text    PRIMARY KEY NOT NULL,
  value      jsonb   NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ── Server-owned named cohort memberships (deny-default, time-bounded) ───────
-- Absence of a row means the user is NOT in the cohort.
-- Populated only by offline server-side review and explicit approval —
-- never by any client-facing path.
--
-- expires_at: hard expiry timestamp. NULL means the membership does not expire
--   by time alone (revocation must be done by deleting the row). A non-NULL
--   value means the rollout gate must check that NOW() < expires_at before
--   granting access.
-- reviewed_at: timestamp of the last explicit server-side approval review.
--   Must be non-NULL for a membership to be considered active; a NULL value
--   means the row was inserted without review and must be treated as inactive.
CREATE TABLE IF NOT EXISTS calora_cohort_memberships (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  cohort_name      text        NOT NULL,
  external_user_id text        NOT NULL,
  added_at         timestamptz DEFAULT now() NOT NULL,
  added_by         text        NOT NULL,
  expires_at       timestamptz,
  reviewed_at      timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS calora_cohort_memberships_cohort_user_idx
  ON calora_cohort_memberships (cohort_name, external_user_id);

-- Add expires_at and reviewed_at to existing rows that predate this migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calora_cohort_memberships' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE calora_cohort_memberships ADD COLUMN expires_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calora_cohort_memberships' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE calora_cohort_memberships ADD COLUMN reviewed_at timestamptz;
  END IF;
END;
$$;

-- ── Coach Fact Context idempotency / replay-prevention ledger ────────────────
-- One row per (external_user_id, request_nonce). The nonce is atomically
-- claimed before any provider call — a replay attempt with the same nonce
-- is detected and rejected even when the original call never completed.
--
-- NEVER stores facts, messages, prompt text, or any other content.
-- Structural metadata only: who claimed the nonce and when it expires.
CREATE TABLE IF NOT EXISTS calora_coach_fact_context_idempotency (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  external_user_id text        NOT NULL,
  request_nonce    text        NOT NULL,
  claimed_at       timestamptz DEFAULT now() NOT NULL,
  expires_at       timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS calora_coach_fact_context_idempotency_user_nonce_idx
  ON calora_coach_fact_context_idempotency (external_user_id, request_nonce);
