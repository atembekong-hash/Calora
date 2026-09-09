---
name: Independent limiter side effects
description: Failure handling for concurrent database-backed limiter operations whose writes remain observable.
---

When concurrent database-backed checks can each create observable state, wait for every check to settle before returning because one rejection determines the response.

**Why:** A fail-closed account-deletion response returned as soon as the user limiter rejected, while an independent IP limiter write was still pending; fresh PostgreSQL verification observed the response before that write.

**How to apply:** Prefer `Promise.allSettled` or an equivalent join when independent operations must finish even if one fails. Classify all rejection reasons, return the safest response, and preserve the completed side effects.