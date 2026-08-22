---
name: Managed database support objects
description: The boundary between Drizzle table schema application and PostgreSQL functions/triggers in Calora's managed lifecycle.
---

Drizzle's managed schema push covers the typed relational schema but does not by itself establish PostgreSQL extensions, functions, or triggers. Keep API startup free of schema mutation. Any support objects needed in development must be source-controlled and applied through the managed setup lifecycle; treat their production propagation as unverified until a supported Publish path and catalog inventory prove it.

**Why:** Account-deletion write fencing depended on PostgreSQL functions and triggers that had previously been installed opportunistically at API startup. Removing startup DDL exposed that a newly provisioned schema could lack the security fence.

**How to apply:** When adding database-enforced behavior beyond tables, columns, indexes, and foreign keys, identify its supported development and production application path before relying on it. Add a real-database behavioral test and inventory proof; do not claim a production security gate passes from application-level ownership checks or development-only setup.

For safety-sensitive Calora domain tables, retain a committed, forward-only
Drizzle migration and its development journal; never treat `drizzle-kit push`
as production deployment authority. Replit-managed production schema changes
are instead applied through the user-confirmed Publish schema-diff flow, which
does not promise a project `__drizzle_migrations` record.

**Why:** Requiring a development Drizzle journal in production would pressure
an unsupported manual bookkeeping change even when the managed Publish flow
correctly applied the reviewed schema.

**How to apply:** Keep Supabase DDL inert for Calora domain data. For every
material publish, retain the reviewed commit and immutable migration artifact,
capture the platform Publish identity when exposed, and compare the production
schema read-only against canonical source. Correct defects only through a new
forward change and Publish; never manual DDL, manual journal inserts, or
deployment/startup migration scripts.