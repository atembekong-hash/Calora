# Calora Production Security Certification

**Date:** 2026-08-18
**Scope:** Authorized, non-destructive audit of the Calora API server
(`artifacts/api-server`), the Expo mobile client (`artifacts/calora`), the
shared DB/schema (`lib/db`), and deployment/configuration. No destructive tests
were run against real users, transactions, or third parties.

**Verdict:** **Ready, with documented residual risks.** Confirmed AI cost/DoS
vulnerabilities were found and remediated: (1) planner and coach AI endpoints
were unauthenticated and unthrottled, and (2) public recipe-detail cache misses
were uncoalesced, allowing concurrent anonymous OpenAI amplification. All are now
fixed and verified. Remaining residual risks below are lower severity.

---

## Security Surface Map

| Surface | Auth | Notes |
|---|---|---|
| `GET /api/v1/health` | public | liveness only |
| `GET /.well-known/*`, `GET /invite/*` | public | universal-links + invite landing; static, no user data |
| `GET /api/v1/recipes`, `GET /api/v1/recipes/:id` | public | TheMealDB browsing; OpenAI nutrition estimation on miss now coalesced (single-flight) + per-IP rate limited (120/hr) |
| `POST /api/v1/recipes/concepts`, `/generated` | Bearer | arbitrary-prompt AI; 30/hr per-user limit each (added) |
| `POST /api/v1/capture/analyze` | Bearer or IP | AI capture; 30/hr shared limiter — fail-open for verified users, fail-closed (503) for anonymous |
| `POST /api/v1/planner/generate` | **Bearer (fixed)** | arbitrary-prompt AI; 20/hr per-user limit (added) |
| `POST /api/v1/coach/respond` | **Bearer (fixed)** | arbitrary-prompt AI; 40/hr per-user limit (added) |
| `GET/POST/DELETE /api/v1/diary*` | Bearer | owner-scoped |
| `POST /api/v1/sync/mutations` | Bearer | bounded outbox, idempotent, owner-scoped |
| `DELETE /api/v1/account` | Bearer + service-role | verifies caller token, 503 if admin unconfigured |
| `/api/v1/referral/*` | Bearer | server-verified qualification, claim-first idempotent grants |

## Validation Ledger

| Check | Method | Result |
|---|---|---|
| Anonymous → planner/coach | live curl | **401** (was 200) ✅ |
| Forged Bearer → planner | live curl | 401 ✅ |
| Per-account rate limit → 429 | unit test + code | ✅ |
| Cross-user diary isolation | existing tests | owner-scoped ✅ |
| SQL injection | code review | parameterized (Drizzle) throughout ✅ |
| Body-supplied user id | code review | none; identity token-derived ✅ |
| Service-role key exposure | code review | server-only, lazy-init, never client-imported ✅ |
| CORS wildcard | live curl | `*` present, but auth is Bearer (not cookies) → no credential theft; acceptable ⚠️ |
| Error/log disclosure | code review | generic error messages; Pino strips query strings ✅ |
| Dependency audit | `runDependencyAudit` | 2 high (transitive DoS: `brace-expansion`, `image-size`) — see residual |
| SAST | `runSastScan` | only expected public client keys in `eas.json`/`.replit`/`env.example`; static-server path handling is normalized/confined ✅ |
| Secrets/PII dataflow | `runHoundDogScan` | 2 low (QA script logs its own test email) — not production ✅ |

## Confirmed Vulnerabilities — Remediated

**1. Unauthenticated, unthrottled AI endpoints (High).**
`POST /v1/planner/generate` and `POST /v1/coach/respond` invoked the paid OpenAI
provider with **no authentication and no rate limit**, accepting arbitrary
prompts. Any anonymous caller could drive unbounded provider cost / DoS.

**Fix:** both endpoints now require a verified Supabase Bearer token
(`verifyBearerToken`, consistent with recipes/capture) and enforce a persistent,
atomic per-account rate limit via a new shared limiter
(`src/lib/rate-limit.ts`): planner 20/hr, coach 40/hr. The authenticated
recipe-generation routes (`/v1/recipes/concepts`, `/v1/recipes/generated`) —
previously auth-gated but unthrottled — now enforce the same shared per-user
limiter (30/hr each, endpoint-namespaced keys). The mobile client already
attaches the Bearer token automatically, so signed-in users are unaffected.
Verified live (401 for anonymous/forged) and by unit tests (401 + 429 with no
provider invocation).

**2. Uncoalesced public recipe cache-miss OpenAI amplification (Medium–High).**
`GET /v1/recipes/:id` called `estimateNutrition` synchronously on an L1/L2 cache
miss with no single-flight guard for the miss path — concurrent anonymous
requests for the same uncached meal each issued their own OpenAI call before any
cache write completed, allowing concurrency-based cost amplification.

**Fix:** cache-miss estimation is now coalesced per meal id
(`estimateNutritionCoalesced` — concurrent misses share one OpenAI call and one
cache write), and both public recipe routes enforce a per-IP rate limit
(120/hr) via the shared limiter, configured **fail-closed** (503 when the
limiter store is unavailable) because these routes are anonymous. Verified live
(browsing 200) and by dedicated tests: 429 before any upstream/provider work,
503 on limiter degradation with no provider call, and a true concurrent
cold-miss test asserting exactly one model call.

## Residual / Untested Risk (honest disclosure)

1. **Public recipe browsing still triggers OpenAI on first miss.** Now coalesced
   and IP-rate-limited (120/hr), so concurrent amplification is closed and the
   worst case is bounded to the finite TheMealDB corpus, estimated once and
   DB-cached. Remaining residual is normal first-visit provider cost.
2. **Authenticated rate limiters are fail-open on DB error.** Intentional
   (availability > strictness) and bounded to verified accounts. Every
   anonymous paid-AI path — public recipe routes and anonymous capture — fails
   **closed** (503) when the limiter store is unavailable, so unmetered public
   traffic can never trigger provider calls. Verified by tests (503 + no
   provider invocation on limiter failure). Monitor limiter DB errors.
3. **Two transitive dependency DoS CVEs** (`brace-expansion`, `image-size`) —
   both high, both fixable by upgrade. Not in a confirmed exploitable path but
   should be patched.
4. **CORS is `*`.** Safe today because auth is header-based Bearer, not cookies.
   Revisit if cookie-based auth is ever introduced.
5. **No penetration testing of Supabase/RevenueCat/OpenAI provider internals** —
   out of authorized scope; these are trusted managed services.
