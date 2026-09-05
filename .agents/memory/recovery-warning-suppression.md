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

Suppressed-cycle summaries are cadence-bound and may persist only as a separate,
bounded redacted cohort store so a restart does not erase operator visibility.
This store is not a second suppression authority and is never a dependency for
deletion retries.

**Why:** The shared claim already decides which instance owns an immediate
warning; durable summary state is useful only to preserve low-frequency
visibility across restarts and must not expand into account or provider data.

**How to apply:** Record only opaque cohort digests, validated redacted
correlation keys, bounded counters, and timestamps; restore and flush
best-effort, and drain queued writes during graceful shutdown.