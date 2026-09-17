-- Migration: 0002_cross_device_diary_restore
-- Description: Preserve allowlisted client diary details across account restore.
--
-- Immutability guarantee: once applied, this file must never be edited.
-- To change the schema, add a new numbered migration file.
--
-- IF NOT EXISTS keeps this safe for development databases where Drizzle schema
-- push applied the additive column before the immutable migration was merged.

ALTER TABLE calora_diary_entries
  ADD COLUMN IF NOT EXISTS sync_metadata jsonb DEFAULT '{}'::jsonb NOT NULL;