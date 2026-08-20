---
name: Managed database support objects
description: The boundary between Drizzle table schema application and PostgreSQL functions/triggers in Calora's managed lifecycle.
---

Drizzle's managed schema push covers the typed relational schema but does not by itself establish PostgreSQL extensions, functions, or triggers. Keep API startup free of schema mutation. Any support objects needed in development must be source-controlled and applied through the managed setup lifecycle; treat their production propagation as unverified until a supported Publish path and catalog inventory prove it.

**Why:** Account-deletion write fencing depended on PostgreSQL functions and triggers that had previously been installed opportunistically at API startup. Removing startup DDL exposed that a newly provisioned schema could lack the security fence.

**How to apply:** When adding database-enforced behavior beyond tables, columns, indexes, and foreign keys, identify its supported development and production application path before relying on it. Add a real-database behavioral test and inventory proof; do not claim a production security gate passes from application-level ownership checks or development-only setup.