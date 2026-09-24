-- Migration: 0007_account_deletion_object_storage_stage
-- Description: Start new account-deletion sagas at the object-storage erasure
-- checkpoint so configured private media is deleted before application cleanup.
--
-- Immutability guarantee: once applied, this file must never be edited.
-- To change the schema, add a new numbered migration file.
--
-- Existing rows retain their recorded stage for resumable recovery. This only
-- changes the default used when an active identity receives a new claim.

ALTER TABLE IF EXISTS calora_account_deletion_states
  ALTER COLUMN stage SET DEFAULT 'object_storage';
