-- Migration: 0005_recipe_media
-- Description: Persist owner-scoped generated recipe media and explicit lifecycle state.
--
-- Immutability guarantee: once applied, this file must never be edited.
-- To change the schema, add a new numbered migration file.

CREATE TABLE IF NOT EXISTS calora_recipe_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_external_id text NOT NULL,
  client_recipe_id text NOT NULL,
  content_hash text NOT NULL,
  recipe_payload jsonb NOT NULL,
  image_id uuid,
  object_key text,
  model_version text NOT NULL,
  prompt_version text NOT NULL,
  status text NOT NULL DEFAULT 'generating',
  semantic_review_state text NOT NULL DEFAULT 'needs_review',
  attempts integer NOT NULL DEFAULT 1,
  last_error_code text,
  last_attempt_at timestamptz,
  url_last_issued_at timestamptz,
  last_rendered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calora_recipe_media_content_hash_chk CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT calora_recipe_media_status_chk CHECK (status IN ('generating', 'stored', 'url_ready', 'retryable_error', 'superseded')),
  CONSTRAINT calora_recipe_media_review_chk CHECK (semantic_review_state IN ('needs_review', 'accepted', 'rejected')),
  CONSTRAINT calora_recipe_media_attempts_chk CHECK (attempts >= 1),
  CONSTRAINT calora_recipe_media_object_pair_chk CHECK ((image_id IS NULL) = (object_key IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS calora_recipe_media_owner_recipe_hash_idx
  ON calora_recipe_media (owner_external_id, client_recipe_id, content_hash);
CREATE UNIQUE INDEX IF NOT EXISTS calora_recipe_media_owner_image_idx
  ON calora_recipe_media (owner_external_id, image_id)
  WHERE image_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS calora_recipe_media_owner_updated_idx
  ON calora_recipe_media (owner_external_id, updated_at DESC);

ALTER TABLE calora_recipe_media ENABLE ROW LEVEL SECURITY;

DO $calora_recipe_media_grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE calora_recipe_media FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE calora_recipe_media FROM authenticated;
  END IF;
END
$calora_recipe_media_grants$;

COMMENT ON TABLE calora_recipe_media IS
  'Server-owned generated recipe media. owner_external_id is resolved from the authenticated token; signed locators are never durable identity.';
COMMENT ON COLUMN calora_recipe_media.semantic_review_state IS
  'Generated pixels are not exact recipe proof. needs_review is the truthful default until the user accepts or rejects the depiction.';
