---
name: Account-deletion timestamp boundary
description: Runtime timestamp shapes returned by the PostgreSQL recovery-state query.
---

Recovery-state timestamps must be normalized to `Date` objects at the database
reader boundary before age or overdue calculations.

**Why:** The production-shaped `pg` path returned timestamp fields as strings,
which caused the detached recovery cycle to fail safely but skip its stuck-
deletion warning when the age helper called `getTime()`.

**How to apply:** When adding or changing recovery-state queries, accept the
driver's string-or-Date shape and normalize it immediately; keep a regression
fixture for string-valued timestamps.