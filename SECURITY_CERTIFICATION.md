# Calora Production Security Certification

**Date:** 2026-09-05
**Residual hardening retest:** 2026-08-19
**Account-deletion finality retest:** 2026-08-20
**Current security retest:** 2026-09-05
**Scope:** Authorized, non-destructive audit of the Calora API server
(`artifacts/api-server`), the Expo mobile client (`artifacts/calora`), the
shared DB/schema (`lib/db`), and deployment/configuration. No destructive tests
were run against real users, transactions, or third parties.

**Verdict:** **Security controls hardened in development; not an unconditional
production-launch certification.** The current retest confirms that every
paid-provider AI route uses fail-closed quota protection, capture no longer
returns raw provider errors, and mobile OAuth callbacks reject foreign
scheme/host/path combinations before consuming credentials. Export/share now
requires an explicit warning acknowledgement. Compatible dependency fixes
removed the current `qs`, `fast-uri`, `decode-uri-component`, `@xmldom/xmldom`,
and `uuid` findings. Two high `image-size` advisories remain only in Metro
build tooling with no unaffected release. Native OAuth competing-app behavior,
production deletion recovery, device-level storage protection, and provider/
store boundaries still require release validation.

---

## Current Security Retest — 2026-09-05

### Confirmed repairs

- **Paid-AI quota enforcement:** capture, planner, authenticated recipe
  generation/photo, and Coach Fact Context now pass `failClosed: true` to the
  shared persistent limiter. A limiter database failure returns a bounded
  denial instead of allowing an unmetered provider call. The capture regression
  suite verifies both anonymous and authenticated failure behavior.
- **Provider error disclosure:** capture logs provider failures server-side and
  returns the fixed public message
  `Capture provider unavailable. Please try again shortly.` The regression test
  asserts that a provider exception string is not returned to the caller.
- **OAuth callback validation:** `handleOAuthCallbackUrl` accepts only the exact
  configured `caloraapp://auth/callback` protocol, host, port, and path, with no
  URL credentials. Wrong scheme/host callbacks are rejected before PKCE exchange
  or implicit-token session creation; the auth regression suite covers this.
- **Export disclosure warning:** the profile export action now explains that the
  portable file may contain profile, diary, health, memory, and Coach data and
  requires an explicit “Share export” choice before writing the share file.
- **Dependency remediation:** compatible overrides are locked for `qs@6.16.0`,
  `fast-uri@3.1.7`, `decode-uri-component@0.5.0`,
  `@xmldom/xmldom@0.9.12`, and `uuid@11.1.1`. Expo config, API/mobile
  typechecks, and both workflows start successfully after the lockfile update.

### Current scan evidence

| Check | Result |
|---|---|
| `runDependencyAudit` | 0 critical, 2 high — both `image-size` in Metro; no high/critical finding reaches API request handling |
| `pnpm audit --json` | 0 critical, 2 high, 0 moderate, 0 low; remaining advisories are `image-size` through `@expo/metro` |
| `runSastScan` | 0 high/critical; 5 medium expected public/example configuration identifiers |
| `runHoundDogScan` | 0 findings |
| API/mobile typechecks | passed |
| Full mobile suite | 1,139 tests passed; native static-server security tests included |
| Full API suite | 376 tests passed, 4 intentionally skipped |
| Workflows | Expo Metro and API server both running after restart |

### Residual risks and release gates

1. **Custom-scheme hijacking remains a native release residual.** The parser
   allowlist prevents arbitrary URLs from being consumed, but another installed
   application may still claim `caloraapp://` on platforms that do not enforce
   universal links. Legacy email confirmation may carry access/refresh tokens.
   Validate the production Supabase redirect configuration, iOS associated
   domains, Android app links, and competing-app behavior on disposable native
   builds.
2. **Broad export is intentional but sensitive.** The export is user initiated
   and warned, but it includes health, diary, profile, memories, and Coach data.
   Confirm the product/privacy decision for encrypted local storage and whether
   a future redacted export is required.
3. **Local domain state is plaintext AsyncStorage.** Auth storage uses secure
   storage, but wellness state can be exposed by device backup or rooted-device
   access. This is not resolved by the current server controls.
4. **Malformed AI requests can consume quota.** Some routes rate-limit before
   full semantic validation. This is bounded to the caller's own bucket and
   does not create provider work, but validation-before-metering is a follow-up
   hardening opportunity.
5. **`image-size` remains a build-tool residual.** Metro uses affected parser
   versions with no unaffected npm release. Production API/mobile request
   handling does not import Metro; upgrade the supported Expo/Metro chain when a
   fixed release is published.
6. **Production deployment remains required for final certification.** Perform a
   disposable-account deletion and forced-recovery exercise after deployment,
   including database support-object permissions, and validate real RevenueCat,
   Supabase, OpenAI, FatSecret, store-billing, and native OAuth boundaries.

Historical audit entries below are retained as evidence of prior remediation;
the current retest above is authoritative for the present workspace state.

---

## Security Surface Map

| Surface | Auth | Notes |
|---|---|---|
| `GET /api/v1/health` | public | liveness only |
| `GET /.well-known/*`, `GET /invite/*` | public | universal-links + invite landing; static, no user data |
| `GET /api/v1/recipes`, `GET /api/v1/recipes/:id` | public | TheMealDB browsing; OpenAI nutrition estimation on miss now coalesced (single-flight) + per-IP rate limited (120/hr) |
| `POST /api/v1/recipes/concepts`, `/generated` | Bearer | arbitrary-prompt AI; 30/hr per-user limit each (added) |
| `POST /api/v1/capture/analyze` | Bearer or IP | AI capture; 30/hr shared limiter — fail-closed (503) for all callers when the limiter store is unavailable |
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
| Replit dependency scan | `runDependencyAudit` | 2 high installed-version findings, both `image-size` advisories in Metro build tooling with no fixed release |
| Pnpm dependency audit | `pnpm audit --json` | 0 critical, 2 high (`image-size`), 0 moderate/low after compatible overrides; see current retest |
| Static-server traversal | Node HTTP regression suite | normal asset + manifest succeed; raw/encoded/backslash traversal, malformed encoding, base-prefix collision, and outside-root symlink cannot disclose files (6/6) ✅ |
| SAST | `runSastScan` | 0 high/critical after static-server hardening; 5 medium expected public/example config identifiers in `eas.json`/`.replit`/`env.example` ✅ |
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

## Residual Hardening Retest — 2026-08-19

### Dependency remediation

- `brace-expansion@5.0.8` was replaced with patched `5.0.9` through a targeted
  `minimatch@10.2.5` override. The dependency audit no longer reports its
  unbounded-array DoS advisory.
- Four additional vulnerable transitive packages were replaced with fixed
  releases through exact-version overrides: `postcss@8.4.49` → `8.5.23`
  (resolving both source-map file-disclosure advisories),
  `nanoid@3.3.16` → `3.3.18` (zero-size generator infinite loop),
  `js-yaml@4.3.0` → `4.3.1` (`!!omap` quadratic CPU consumption), and
  `fast-uri@3.1.4` → `3.1.5` (backslash authority host confusion). PostCSS is
  the only cross-minor override; the full Expo production export verifies its
  compatibility with the current Metro configuration.
- Direct API build dependency `esbuild@0.27.3` and its workspace pin were moved
  to `0.28.1`, resolving the low Windows development-server arbitrary-file-read
  advisory. The Linux production API bundle and typecheck pass with the update.
- `image-size@1.2.1` remains through `metro@0.83.x`. Two high advisories affect
  crafted image parsing: an ICNS infinite loop (`GHSA-w3rx-r6r6-pgpr`) and
  JXL/HEIF infinite loops (`GHSA-5p2g-fcmc-qvqq`). This package is reachable
  only in Expo/React Native build tooling; neither the mobile runtime nor API
  server imports it.
  As of this retest, npm publishes no unaffected `image-size` release (the
  latest `2.0.2` is also in the affected range), and Metro declares
  `image-size@^1.0.2`. Forcing a major override would create an unsupported Expo
  toolchain without removing either advisory. After the compatible overrides,
  `pnpm audit --json` reports 2 high findings, both for this package. This is
  therefore an accepted, non-production residual until Metro adopts a fixed
  release.

### Static-server containment

The production static server now indexes trusted build files at startup. HTTP
request paths are percent-decoded with malformed input rejected, canonicalized
as URL keys, and looked up in that trusted index; request data is never used to
construct a filesystem path. Symlinks are denied, indexed files are verified to
resolve inside the real build root, and base-path stripping requires an exact
segment boundary. A six-case HTTP regression suite covers normal assets,
platform manifests, raw/encoded/backslash traversal, malformed encodings,
base-prefix collisions, and outside-root symlinks. The follow-up SAST run reports
zero high/critical findings.

### CORS decision

The API retains wildcard CORS. Authentication is exclusively an explicit
`Authorization: Bearer` header; the server has no cookie-authentication parser
or credentialed CORS mode, so browsers cannot ambiently attach an authenticated
session from another origin. Keeping origins open avoids breaking native Expo,
development, and artifact deployment origins that are not stable at build time.
This decision must be revisited before adding cookie authentication,
`Access-Control-Allow-Credentials`, or any browser-authoritative session.

## Residual / Untested Risk (honest disclosure)

1. **Public recipe browsing still triggers OpenAI on first miss.** Now coalesced
   and IP-rate-limited (120/hr), so concurrent amplification is closed and the
   worst case is bounded to the finite TheMealDB corpus, estimated once and
   DB-cached. Remaining residual is normal first-visit provider cost.
2. **Paid-AI rate limiters fail closed on DB error.** Capture, planner,
   authenticated recipe generation/photo, public recipe paths, and Coach Fact
   Context deny work when the limiter store is unavailable, so an outage cannot
   grant an unmetered provider call. Verified by regression tests; monitor
   limiter DB errors.
3. **One transitive build-tool package has two high DoS advisories.**
   `image-size` remains in Metro with ICNS and JXL/HEIF infinite-loop findings.
   No unaffected npm release exists as of 2026-08-19, and the package is not
   reachable from deployed mobile or API runtime code. Monitor Expo/Metro and
   update as soon as a compatible fixed release is available.
4. **CORS is `*`.** Safe today because auth is header-based Bearer, not cookies.
   Revisit before cookie-based or credentialed browser auth is introduced.
5. **No penetration testing of Supabase/RevenueCat/OpenAI provider internals** —
   out of authorized scope; these are trusted managed services.

## Account-deletion finality retest — 2026-08-20

The earlier account-deletion workflow was not release-safe: concurrent requests
could overlap provider calls, authenticated writes could outlive the initial
application guard, and an interrupted operation depended on the user retaining a
valid session to retry. Those defects were remediated and independently reviewed.

- A session-scoped PostgreSQL advisory lock now gives one deletion operation
  ownership across application cleanup, RevenueCat erasure, and Supabase Auth
  removal. Conditional operation IDs prevent stale workers from changing
  checkpoints or a terminal tombstone.
- The deletion state persists a short-lived recovery identifier only while
  erasure is incomplete. A server-owned recovery loop resumes staged work after
  failure without relying on a user JWT, and removes that identifier on the
  terminal state. An already-absent Auth identity is treated as an idempotent
  successful final stage.
- Startup migrations create every directly external-ID-linked deletion table and
  install database write fences for user rows, referrals, qualifications, and
  user-keyed rate-limit buckets. This prevents recreation after deletion begins
  even if future route middleware is missed.
- The mobile client now treats an in-progress deletion as pending rather than
  completed, clears device data best-effort, removes the profile photo, and
  signs out after a server-confirmed request.
- A final completion review identified and repaired a concurrent-referral edge
  case: when both participants delete at once, the deletion transaction is
  explicitly authorized to anonymize their shared referral row while normal
  application writes remain database-fenced.

**Retest evidence:** API type check and mobile type check passed; API tests
passed **217/217**; mobile tests passed **860/860**; the API workflow completed
startup migrations and served normally. An independent architecture review passed
the operation ownership, recovery, fence, and client behavior.

**Remaining production gate:** perform one disposable-account deletion and
forced-recovery exercise after deployment, including the database role's ability
to create `pgcrypto` and install the write-fence triggers. Native device,
production deployment, provider-internal, store billing, and OAuth boundaries
remain outside this development-environment certification.
