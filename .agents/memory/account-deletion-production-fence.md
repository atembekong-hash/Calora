---
name: Account-deletion production fence
description: Production write-fence evidence and the observable API/log behavior for post-deletion writes.
---

The production deletion fence rejects a post-claim application write: the API
may expose a generic HTTP 503 while the deployment log carries the precise
`account deletion is in progress` database error class. Treat the log class,
not the generic HTTP status alone, as the behavioral proof.

**Why:** The sync path can cross the deletion boundary between authentication
and row creation, so the PostgreSQL trigger is the final enforcement point;
the route deliberately avoids exposing database details to callers.

**How to apply:** For future disposable production checks, record only counts,
HTTP status classes, and sanitized error classes; correlate a generic response
with deployment logs, and never persist test identities or credentials.