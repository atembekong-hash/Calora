---
name: Supabase Auth boundary
description: The operational boundary between Calora's Supabase Auth project and its managed PostgreSQL application data.
---

The configured Calora Supabase project is the active Auth project but has no Calora domain tables, policies, or migrations. Calora's `calora_*` data schema is currently stored in the separate managed PostgreSQL database.

**Why:** RLS policies can only protect tables in the database where they exist. Applying generic Supabase RLS to an Auth-only project would not establish tenant isolation for Calora records.

**How to apply:** Treat Supabase Auth identity as the external identity provider and preserve the internal user-row bridge in the application database. Do not claim Supabase RLS proves Calora tenant isolation unless the domain tables are deliberately migrated there and verified with real two-user tests.