---
name: Recovery warning suppression
description: Privacy and availability boundaries for shared account-deletion recovery warning cooldowns.
---

Shared recovery-warning cooldowns are operational state only: persist a digest of
the aggregate warning signature, keep the record bounded and short-lived, and
never persist raw account identifiers or provider error text. Suppression must
be fail-open for observability and must never block deletion retries.

**Why:** Horizontally scaled API instances need one cooldown authority during a
provider outage, while recovery still needs immediate signals for new accounts,
stages, and states and must continue retrying independently.

**How to apply:** Keep warning identity construction limited to redacted,
stage-aware values; hash again at the persistence boundary; use an atomic
shared claim; and treat persistence failure as permission to emit the warning.