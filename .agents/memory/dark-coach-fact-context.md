---
name: Dark Coach Fact Context
description: Guardrails for the future migration from broad legacy Coach context to the sanitized fact context.
---

The sanitized Coach Fact Context is a default-off, consent-gated replacement
boundary, not an additive payload. Any rollout must keep the context’s closed
allowlist, deterministic value shapes, deterministic fact statements, short
TTL, nonce/lifecycle discard rules, and independent purpose-scoped consent.
Model-generated user-specific prose and metadata must not pass through without
deterministic validation; server-generated neutral output is safer.

**Why:** A security review found that allowing arbitrary metadata strings or
unvalidated non-observation response fields reintroduced prompt-injection and
unsupported-claim channels even when observation claims were checked.

**How to apply:** Broad availability is authorized only for active signed-in
users with current server-owned purpose consent while the global kill switch,
release-bound process gate, account-status checks, and completion-time
reauthorization remain active. New fact categories need their own explicit
allowlist, deterministic server reconstruction, adversarial tests, and security
review; never broaden generic string fields for convenience.

For durable consent, use a server-authoritative, account-scoped,
purpose/version ledger with an optional local cache that cannot authorize
egress. The legacy generic Coach consent is never proof for this purpose.

**Why:** Local-only state cannot provide cross-device, deletion, or
server-enforceable consent guarantees; a cached affirmative decision can become
stale or be forged.

**How to apply:** Cache only for restrictive offline UI. The server must deny
unknown, revoked, or outdated consent and must enforce consent independently of
client flags before Fact Context reaches a provider.