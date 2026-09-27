-- Migration: 0011_coach_v2_conversations
-- Description: Durable, account-owned conversations for the clean-room Calora Coach.
--
-- This is a forward-only migration. Conversation content is scoped by the
-- internal Calora user UUID and is never exposed through direct client access.
-- Guests have no row and their chats remain ephemeral in memory.

CREATE TABLE IF NOT EXISTS calora_coach_v2_settings (
  user_id uuid PRIMARY KEY REFERENCES calora_users(id) ON DELETE CASCADE,
  personalization_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calora_coach_v2_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES calora_users(id) ON DELETE CASCADE,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS calora_coach_v2_one_active_conversation_idx
  ON calora_coach_v2_conversations (user_id)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS calora_coach_v2_conversations_user_updated_idx
  ON calora_coach_v2_conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS calora_coach_v2_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES calora_coach_v2_conversations(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal > 0),
  user_message text NOT NULL CHECK (char_length(user_message) BETWEEN 1 AND 2000),
  assistant_message text CHECK (assistant_message IS NULL OR char_length(assistant_message) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT calora_coach_v2_turns_conversation_ordinal_key UNIQUE (conversation_id, ordinal)
);
CREATE INDEX IF NOT EXISTS calora_coach_v2_turns_conversation_ordinal_idx
  ON calora_coach_v2_turns (conversation_id, ordinal ASC);

-- The API is the sole access path. No RLS policy is created, so direct anon or
-- authenticated Supabase clients cannot read or mutate Coach conversations.
ALTER TABLE calora_coach_v2_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calora_coach_v2_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calora_coach_v2_turns ENABLE ROW LEVEL SECURITY;
DO $coach_v2_grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE calora_coach_v2_settings, calora_coach_v2_conversations, calora_coach_v2_turns FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE calora_coach_v2_settings, calora_coach_v2_conversations, calora_coach_v2_turns FROM authenticated;
  END IF;
END
$coach_v2_grants$;

-- Reuse the immutable account-deletion predicate from migration 0006. New
-- Coach writes stop once an account is under deletion, while server-owned
-- deletion can still cascade records atomically with calora.deletion_worker.
CREATE OR REPLACE FUNCTION calora_coach_v2_write_fence()
RETURNS TRIGGER AS $$
DECLARE
  external_user_id text;
BEGIN
  IF current_setting('calora.deletion_worker', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'calora_coach_v2_settings' THEN
    SELECT external_id INTO external_user_id FROM calora_users WHERE id = NEW.user_id;
  ELSIF TG_TABLE_NAME = 'calora_coach_v2_conversations' THEN
    SELECT external_id INTO external_user_id FROM calora_users WHERE id = NEW.user_id;
  ELSIF TG_TABLE_NAME = 'calora_coach_v2_turns' THEN
    SELECT users.external_id INTO external_user_id
      FROM calora_coach_v2_conversations conversations
      INNER JOIN calora_users users ON users.id = conversations.user_id
      WHERE conversations.id = NEW.conversation_id;
  END IF;

  IF external_user_id IS NOT NULL THEN
    PERFORM calora_assert_deletion_writable(external_user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_coach_v2_settings;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
  BEFORE INSERT OR UPDATE ON calora_coach_v2_settings
  FOR EACH ROW EXECUTE FUNCTION calora_coach_v2_write_fence();
DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_coach_v2_conversations;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
  BEFORE INSERT OR UPDATE ON calora_coach_v2_conversations
  FOR EACH ROW EXECUTE FUNCTION calora_coach_v2_write_fence();
DROP TRIGGER IF EXISTS calora_account_deletion_write_fence_trigger ON calora_coach_v2_turns;
CREATE TRIGGER calora_account_deletion_write_fence_trigger
  BEFORE INSERT OR UPDATE ON calora_coach_v2_turns
  FOR EACH ROW EXECUTE FUNCTION calora_coach_v2_write_fence();
