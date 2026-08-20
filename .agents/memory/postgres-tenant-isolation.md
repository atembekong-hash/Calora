---
name: PostgreSQL tenant isolation
description: Current tenant-isolation boundary and the conditions required before PostgreSQL RLS can be a meaningful Calora control.
---

Calora's current defense is API-level ownership enforcement: authenticated Supabase identities are mapped server-side to the internal user UUID and active persistence queries must scope by that derived owner.

Database-level tenant isolation is not presently enforceable. The managed PostgreSQL API connection is a shared superuser/table-owner pool, has no request-scoped identity context, and has no RLS policies. RLS must not be described as a protection until the API runs through a non-superuser least-privilege role and each user operation establishes transaction-local identity safely.

**Why:** Table owners and superusers bypass RLS, while pooled connections without a transaction-local contract risk leaking identity between requests. Adding policy syntax before solving those conditions would look secure without protecting data.

**How to apply:** Keep server-derived owner predicates on every user-data query and preserve adversarial tests. Before considering RLS, prove a source-controlled managed-database role/grant lifecycle, a non-owner runtime role, a request transaction wrapper with local identity, service/deletion bypass boundaries, and direct SELECT/INSERT/UPDATE/DELETE cross-user denial tests.