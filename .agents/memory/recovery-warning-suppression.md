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

Suppressed-cycle summaries are intentionally process-local and cadence-bound:
they add operator visibility without turning the summary into a second
cross-instance coordination table or a dependency for deletion retries.

**Why:** The shared claim already decides which instance owns an immediate
warning; durable aggregate counters would expand the sensitive operational
state without improving recovery correctness.

**How to apply:** Record only opaque cohort digests and validated redacted
correlation keys, cap the buffer, and flush summaries on a slow timer.