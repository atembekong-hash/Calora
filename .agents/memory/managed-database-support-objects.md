---
name: Managed database support objects
description: The boundary between Drizzle table schema application and PostgreSQL functions/triggers in Calora's managed lifecycle.
---

Drizzle's managed schema push covers the typed relational schema but does not by itself establish PostgreSQL extensions, functions, or triggers. Keep API startup free of schema mutation. Any support objects needed in development must be source-controlled and applied through the managed setup lifecycle; treat their production propagation as unverified until a supported Publish path and catalog inventory prove it.

**Why:** Account-deletion write fencing depended on PostgreSQL functions and triggers that had previously been installed opportunistically at API startup. Removing startup DDL exposed that a newly provisioned schema could lack the security fence.

**How to apply:** When adding database-enforced behavior beyond tables, columns, indexes, and foreign keys, identify its supported development and production application path before relying on it. Add a real-database behavioral test and inventory proof; do not claim a production security gate passes from application-level ownership checks or development-only setup.

For safety-sensitive Calora domain tables, use a committed, forward-only Drizzle
migration and the migration journal rather than treating `drizzle-kit push` as
deployment authority. A migration must be safe for already-provisioned
development schemas and must never be edited after application.

**Why:** Schema push has no immutable history or target-application evidence,
which leaves consent and rollout controls ambiguous during production review.

**How to apply:** Keep Supabase DDL inert for Calora domain data, test the
managed PostgreSQL constraints directly, and correct an applied schema only
with a new forward migration.