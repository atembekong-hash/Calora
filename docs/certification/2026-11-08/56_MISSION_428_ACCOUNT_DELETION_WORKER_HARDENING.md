# Mission 428 — Account-Deletion Worker Hardening

The account-deletion saga no longer holds a PostgreSQL session advisory lock across object-storage, RevenueCat, or Supabase Auth calls. Ownership is provided by the existing atomic account-deletion lease and operation ID. This removes a long-lived database connection and lock from the external-call path while preserving stale-worker protection: checkpoint, failure, and completion writes remain conditional on the matching operation ID.

No production database, provider, storage, deployment, native build, or store operation was performed. The account deletion route and recovery worker behavior remain otherwise unchanged.

Validation passed: API TypeScript validation; account and account-deletion-state suites, 25/25; deletion-fence monitor contract suite, 22/22; and `git diff --check`.

This is source and unit evidence. Disposable non-BYPASSRLS end-to-end recovery-worker evidence and production backup/provider/device evidence remain pending; CAL-17 and CAL-15 remain blocked.
