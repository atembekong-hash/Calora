# Threat Model — Calora

## Project Overview

Calora is a local-first mobile nutrition app (Expo / React Native) backed by a
stateless Express API server (`artifacts/api-server`) and a PostgreSQL database
(Drizzle ORM). User identity is provided by Supabase Auth; the mobile client
holds the session and sends a Supabase-issued JWT as a `Bearer` token. Paid
entitlements are owned by RevenueCat. Nutrition/AI features call OpenAI
(via the Replit AI Integrations proxy), Open Food Facts, USDA, TheMealDB, and
FatSecret.

The client is local-first: most user data lives in on-device AsyncStorage and is
synced opportunistically. The server is the authority for anything that must not
be client-forged: identity, cross-user isolation, referral qualification,
account deletion, and AI cost.

## Assets

- **User session tokens** — Supabase JWTs held on the device. Compromise allows
  full impersonation of a user's server-side data.
- **Personal wellness data** — diary entries, weight, mood, hydration, profile.
  PII-adjacent and sensitive; must be scoped to the owning user.
- **Application secrets** — Supabase service-role key, OpenAI proxy credentials,
  RevenueCat proxy access, DB connection string. Server-side only; never shipped
  to the client. (Note: `EXPO_PUBLIC_*` keys — Supabase anon/publishable key and
  RevenueCat public SDK keys — are intentionally public client keys.)
- **AI provider budget** — OpenAI calls behind recipe, capture, planner, and
  coach endpoints. Uncontrolled access is a direct financial / DoS exposure.
- **Referral / entitlement grants** — server-authoritative promo grants. Abuse
  yields unearned paid access.

## Trust Boundaries

- **Mobile client → API** — every request crosses this boundary. The client is
  untrusted; the server authenticates each request via `verifyBearerToken` and
  derives the user id from the token, never from the request body.
- **API → PostgreSQL** — all queries use Drizzle parameterized statements /
  tagged-template parameters. No string-concatenated SQL.
- **API → external services** — OpenAI, USDA, Open Food Facts, TheMealDB,
  FatSecret, RevenueCat, Supabase Admin. Server holds the credentials.
- **Public vs authenticated** — public: health check, universal-links files,
  `/invite` landing, recipe *browsing*. Authenticated (Bearer required): recipe
  generation, capture analyze, planner generate, coach respond, diary, sync,
  account delete, referral.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/app.ts`,
  `artifacts/api-server/src/index.ts` (migrations + start).
- Auth chokepoint: `artifacts/api-server/src/lib/supabase-auth.ts`
  (`verifyBearerToken`) — token-derived identity for every authed route.
- Highest-cost surfaces: `routes/recipes.ts`, `routes/capture.ts`,
  `routes/planner.ts`, `routes/coach.ts` (all call OpenAI).
- Cross-user isolation surfaces: `routes/diary.ts`, `routes/sync.ts`,
  `routes/referral.ts`, `routes/account.ts`.
- Admin-only credential: `lib/supabase-admin.ts` (service-role key; server-only,
  lazy-init, 503 when unconfigured).
- Static file serving (path-traversal-sensitive): `artifacts/calora/server/serve.js`.
  Regression proof: `artifacts/calora/server/serve.security.cjs`.
- Dev-only: `artifacts/mockup-sandbox`, `scripts/` (QA provisioning) — not
  production runtime.

## Threat Categories

### Spoofing

Identity comes only from a Supabase-verified Bearer token. `verifyBearerToken`
validates the JWT against the Supabase project and returns null for missing,
malformed, or invalid tokens; no route trusts a body-supplied user id. Forged
and expired tokens are rejected (verified live: forged token → 401).
**Guarantee:** every endpoint that reads/writes user data or spends AI budget
MUST require a valid Bearer token and derive identity server-side.

### Tampering

Sync accepts a bounded outbox (≤100 mutations, UUID mutation ids, server-side
idempotency table); deletes and updates are scoped to the authenticated owner.
Referral qualification requires a server-owned capture/diary event, not a client
claim. **Guarantee:** business-critical state (referral eligibility, ownership)
MUST be validated server-side against server-recorded events.

### Information Disclosure

API responses are scoped to the token-derived user. Request logging (Pino)
strips query strings. Error responses return generic messages, not stack traces.
`console.error` is used for server-side diagnostics; raw request bodies and
tokens must not be logged. **Guarantee:** logs and error responses MUST NOT
contain tokens, service-role keys, or full request bodies. The API's wildcard
CORS policy MUST remain non-credentialed while authentication uses explicit
Bearer headers; it must be reassessed before any cookie-authoritative browser
session is introduced.

### Denial of Service / Cost

The expensive AI endpoints are the primary DoS/cost surface. Capture analyze is
protected by the shared persistent 30/hour rate limiter keyed by verified user
id (falling back to trusted-proxy IP); anonymous capture fails closed (503)
when the limiter store is unavailable. Recipe generation, planner generation,
and coach respond all require a verified account (closing the
previously-unauthenticated planner/coach AI endpoints) and now also enforce
persistent per-account quotas through a shared atomic limiter: planner 20/hr,
coach 40/hr, recipe concepts 30/hr, recipe generation 30/hr — each returning
429 + `Retry-After` before any provider call. Public recipe browsing/detail is
per-IP rate-limited (120/hr), and nutrition cache misses are coalesced per meal
id so concurrent anonymous requests share a single provider call.
**Guarantee:** every endpoint that calls a paid AI provider MUST be rate-limited
and either require authentication or (for deliberately public browsing) be
IP-limited with cache-miss coalescing; anonymous paid-AI paths MUST fail closed
when the limiter store is unavailable. **Residual:** authenticated limiters are
intentionally fail-open on DB error (availability over strictness) — bounded to
verified accounts; all anonymous paid-AI paths (public recipes, anonymous
capture) fail closed (503). Monitor limiter DB errors.

The dependency audit has one remaining vulnerable package, `image-size`, with
two high infinite-loop advisories covering ICNS and JXL/HEIF parsers. It is
reachable only through Metro build tooling. No unaffected npm release exists as
of 2026-08-19, so forcing an unsupported major cannot remove the risk.
**Guarantee:** production request handling MUST NOT import or invoke Metro/image
parsing tooling, and the Expo/Metro chain MUST be upgraded when a compatible
fixed release becomes available.

The `uuid` buffer-bounds advisory also remains on v3 and v7 copies in Expo's
`@expo/ngrok` and `xcode` build-time chains. Pnpm rates it moderate while the
Replit dependency scanner rates each installed copy high. The patched release
is an incompatible major beyond the parent ranges, and the vulnerable buffered
UUID-generation APIs are not part of deployed request handling. **Guarantee:**
do not force those majors under Expo; upgrade them through a supported Expo
toolchain release.

### Elevation of Privilege

No role/admin surface is exposed to clients. The Supabase service-role key lives
only in `lib/supabase-admin.ts`, is lazy-initialized, and is used exclusively for
account deletion after the caller's own token is verified. SQL is parameterized
throughout. Static file serving normalizes and confines paths under the build
root. The production server builds a trusted file index at startup, denies
symlinks, canonicalizes request paths as lookup keys, and never constructs a
filesystem path from request data. **Guarantee:** the service-role client MUST
never be importable by client code, every privileged action MUST first verify
the caller's own token, and public static requests MUST only resolve to files
that were verified inside the real build root at startup.
