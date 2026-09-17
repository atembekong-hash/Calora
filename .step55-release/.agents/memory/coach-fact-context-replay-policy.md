---
name: Coach Fact Context replay policy
description: When the dark Coach Fact Context path should or should not add persistent nonce consumption.
---

Calora does not require exactly-once Fact Context provider egress or audit semantics in the current dark/controlled-activation design. Do not add a nonce-consumption database system merely to prevent a duplicate request inside the short context TTL.

**Why:** A duplicate remains bounded by authenticated identity, current server-side consent, server gate, deny-all cohort control, account-bound request scope, strict payload validation, and rate limiting. It cannot grant authorization or expose new data; persistence would add new sensitive lifecycle and deletion obligations before product value requires it.

**How to apply:** If a future rollout promises exactly-once egress, billing-grade audit semantics, or cross-request idempotency, stop and separately authorize server-issued cryptographic nonces with atomic per-account consumption. Otherwise retain the documented TTL-bound replay boundary.