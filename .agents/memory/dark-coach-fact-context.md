---
name: Dark Coach Fact Context
description: Guardrails for the future migration from broad legacy Coach context to the sanitized fact context.
---

The sanitized Coach Fact Context is a dark, default-off replacement boundary,
not an additive payload. Any future rollout must keep the context’s closed
allowlist, deterministic value shapes, deterministic fact statements, short
TTL, nonce/lifecycle discard rules, and independent purpose-scoped consent.
Model-generated user-specific prose and metadata must not pass through without
deterministic validation; server-generated neutral output is safer.

**Why:** A security review found that allowing arbitrary metadata strings or
unvalidated non-observation response fields reintroduced prompt-injection and
unsupported-claim channels even when observation claims were checked.

**How to apply:** Do not enable either gate or migrate legacy Coach traffic
until separate consent/rollout authorization. New fact categories need their
own explicit allowlist, deterministic server reconstruction, adversarial tests,
and security review; never broaden generic string fields for convenience.