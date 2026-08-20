-- rls_auto_enable is an internal event-trigger handler. It must not be
-- callable through the public Supabase RPC surface.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;