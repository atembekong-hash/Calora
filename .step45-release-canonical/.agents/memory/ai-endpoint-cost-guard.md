---
name: AI endpoint cost guard
description: Every route touching a paid AI provider needs a quota and either auth or an IP key with cache-miss coalescing.
---

# AI endpoint cost/DoS guard

Any API route that can trigger a paid provider call is a cost/DoS asset and
must uphold:

1. **Identity or IP gate** — arbitrary-prompt routes require a verified account;
   deliberately public browsing routes may stay anonymous but must be keyed by
   IP instead.
2. **Persistent rate limit** — use the shared atomic limiter with an
   endpoint-namespaced key (keys share one table, so namespacing matters);
   return 429 + `Retry-After` *before* any provider work.
3. **Cache-miss coalescing** — public cached AI paths must coalesce concurrent
   misses for the same key into one provider call. A background/stale
   single-flight guard does NOT protect the synchronous miss path.

**Why:** several AI routes shipped without one of these controls, each letting
a caller amplify provider cost. A finite upstream corpus does not bound
*concurrent* cache-miss amplification, and an IP quota is not a control if it
fails open.

**How to apply:** when adding or reviewing any route that awaits a provider
call, check all three. Failure policy: every paid-provider limiter must fail
CLOSED when the limiter store is unavailable, including authenticated routes;
otherwise a database outage becomes an unmetered provider-cost path. Monitor
limiter DB errors and surface a bounded temporary-unavailable response.
