-- Supabase installs pgcrypto in the dedicated extensions schema.  The Calora
-- runtime role intentionally does not inherit a broad extension search_path,
-- so deletion-fence hashing must reference pgcrypto explicitly.
--
-- The managed deployment grants schema USAGE to the narrow migrator and API
-- roles before this migration runs.  This migration contains no data rewrite.

CREATE OR REPLACE FUNCTION public.calora_assert_deletion_writable(external_user_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM calora_account_deletion_states
        WHERE identity_fingerprint = encode(extensions.digest(external_user_id, 'sha256'), 'hex')
          AND state <> 'active'
      ) THEN
        RAISE EXCEPTION 'account deletion is in progress' USING ERRCODE = '55000';
      END IF;
    END;
    $$;
