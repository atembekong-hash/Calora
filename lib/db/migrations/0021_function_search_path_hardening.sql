-- Mission 407: pin trigger/helper function name resolution to trusted schemas.
--
-- This migration is intentionally staged for owner approval. Railway's API
-- preDeploy hook runs the migration runner automatically, so merging this file
-- into main or release/calora-production would be a production mutation.
--
-- The functions are SECURITY INVOKER, but they execute in write-trigger paths
-- under the API runtime role. Pinning search_path prevents an untrusted schema
-- earlier in a role/session search_path from shadowing unqualified references.
-- The explicit public/extension schemas preserve the existing behavior.

ALTER FUNCTION public.calora_assert_deletion_writable(text)
  SET search_path = pg_catalog, public, extensions;

ALTER FUNCTION public.calora_coach_v2_write_fence()
  SET search_path = pg_catalog, public, extensions;

ALTER FUNCTION public.calora_admin_audit_events_immutable()
  SET search_path = pg_catalog, public, extensions;

ALTER FUNCTION public.calora_account_deletion_write_fence()
  SET search_path = pg_catalog, public, extensions;
