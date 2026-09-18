# Calora Phase 4 — Auth, Deep-Link, and Native URL Migration Report

**Phase:** 4 — Branded domain auth, deep-link, and native URL migration  
**Product:** Calora  
**Publisher:** Etiendem Technologies  
**Canonical production origin:** `https://mycaloraapp.com`  
**Prepared:** 2026-09-08

## Executive summary

Phase 4 source/configuration work is complete and independently tested within
the current no-build boundary. The verified production backend topology is the
API artifact at `https://mycaloraapp.com/api`; the previously referenced
`https://api.mycaloraapp.com` hostname is not used because it is deferred and
was not independently configured as a necessary production API surface.

The native production EAS configuration now points to
`https://mycaloraapp.com`. The existing branded authentication callback,
invite links, iOS associated domain, Android intent filters, Expo Router
origin, and public/legal URL set are preserved or verified. A safe branded
browser fallback now exists at `/auth/callback`; it keeps callback query/hash
data client-side and does not echo one-time codes or tokens into HTML.

Supabase behavioral probes confirm that the branded callback is accepted for
recovery-link generation. The Google OAuth authorize flow reaches Google with
the branded callback requested. Legacy custom-scheme and deliberately
unlisted recovery redirects fall back to the Supabase Site URL rather than
being delivered as unapproved callbacks.

The current production deployment was not republished, and no Expo/EAS or
native build was triggered. Consequently, the new callback fallback is
verified in the running API workflow but awaits owner-controlled publishing,
and the new EAS API origin will reach released native binaries only after a
separately authorized signed build.

## Repo-wide runtime URL inventory

| Reference | Classification | Evidence and handling |
|---|---|---|
| `https://mycaloraapp.com` | KEEP / MIGRATE NOW | Canonical production origin for API, web, auth, legal, support, and invites. |
| `https://mycaloraapp.com/api` | KEEP / MIGRATE NOW | Verified API surface; health and authenticated-route behavior pass. |
| `https://www.mycaloraapp.com` | DEFER | Accepted only as a safe canonicalization input in invite rendering; no hostname rollout. |
| `https://api.mycaloraapp.com` | REMOVE FROM PRODUCTION OUTPUT / DEFER | Replaced in the production EAS profile; no separate API hostname was created. |
| `https://calorie-coach-pie35449.replit.app` | KEEP temporarily / HISTORICAL COMPATIBILITY | Existing production URL remains healthy and was not removed. |
| `https://calora.app` | HISTORICAL ONLY / REMOVE FROM PRODUCTION OUTPUT | No non-test runtime source contains this retired public domain. |
| `caloraapp://` | KEEP | Compatibility-sensitive custom scheme remains unchanged. |
| `https://mycaloraapp.com/auth/callback` | MIGRATE NOW | Native callback, Supabase redirect target, association files, and browser fallback use this exact path. |
| `https://mycaloraapp.com/invite` | MIGRATE NOW | Branded invite fallback route. |
| `https://mycaloraapp.com/invite/<code>` | MIGRATE NOW | Server-generated referral URLs and web fallback route. |
| `caloraapp://invite/<code>` | KEEP | Native invite fallback remains supported. |
| Development Replit/localhost values | DEVELOPMENT ONLY / HISTORICAL ONLY | Dev scripts and test fixtures retain local values; none appear in production runtime configuration. |

The inventory covered public/legal URLs, OAuth and password-reset targets,
email verification options, invite/referral links, Universal Links, Android
App Links, Expo Router origin, API base URLs, CORS, notification/share
references, and deep-link fallback paths. No production notification or
transactional-email template contained an additional unbranded runtime URL.

## Backend topology decision

The API artifact explicitly owns the branded apex and mounts its REST API at
`/api`. Independent production checks returned:

- `https://mycaloraapp.com/api/healthz` → HTTP 200, `{"status":"ok"}`
- `https://mycaloraapp.com/api/v1/diary` without credentials → HTTP 401
- `https://mycaloraapp.com/api/v1/diary` with `Origin: https://mycaloraapp.com` → HTTP 401 with the branded CORS header
- `https://mycaloraapp.com/api/v1/diary` with `Origin: https://evil.example` → HTTP 403
- branded CORS preflight → HTTP 204 with `Access-Control-Allow-Origin: https://mycaloraapp.com`
- original Replit API health → HTTP 200

This proves that the branded apex is the working API origin and that
authentication and browser-origin policy are enforced there. A separate
`api.mycaloraapp.com` hostname is not necessary for the current architecture.

## API hostname decision

The production native API origin is:

`https://mycaloraapp.com`

The client app appends `/api` through its generated API client routing. The
production EAS profile was changed from the deferred
`https://api.mycaloraapp.com` value to the verified branded origin. No DNS
record or separate API hostname was created.

## Auth callback inventory

### Google OAuth

`signInWithGoogle()` requests:

`https://mycaloraapp.com/auth/callback`

The Expo WebBrowser callback and deep-link callback both pass through the same
PKCE exchange boundary. Duplicate callback deliveries are coalesced by the
existing code-key arbitration logic.

An external authorize probe returned HTTP 302 to Google’s OAuth endpoint. The
requested branded callback was accepted by Supabase’s authorize handoff.

### Email sign-up and verification

Email sign-up and resend-verification flows use the same branded
`emailRedirectTo` callback. No custom scheme or Replit preview URL is used.

### Password recovery

Password reset uses:

`https://mycaloraapp.com/auth/callback`

A disposable confirmed Auth user was created for the probe, recovery links
were generated for the branded, legacy custom-scheme, and deliberately
unlisted targets, and the disposable user was deleted afterward. Results:

- branded target → generated action link preserved
  `https://mycaloraapp.com/auth/callback`
- legacy `caloraapp://auth/callback` → fell back to the Supabase Site URL
- unlisted HTTPS target → fell back to the Supabase Site URL

### Magic link

No `signInWithOtp` or separate magic-link runtime flow is present in the
current client. The available email verification and recovery flows are
covered above.

### Mobile and browser return

The native app owns `/auth/callback` through the branded HTTPS association
configuration. The API now returns a branded no-store browser handoff page
when a browser receives the route without an installed app. The page does not
echo callback query values into its HTML; the explicit button reconstructs the
custom-scheme handoff from browser-local `search` and `hash` values.

### Account deletion reauthentication

Account deletion uses the existing authenticated API/session boundary and
does not introduce a separate callback URL. No auth or native identifier was
renamed.

## Supabase redirect status

No Supabase dashboard or project setting was mutated. Behavioral probes against
the configured project verified the branded recovery redirect as accepted and
legacy/unlisted destinations as rejected or Site URL fallback.

The Supabase Management API read probe returned HTTP 401, so the exact
dashboard allow-list values were not exported through that management endpoint.
This did not block the migration because the generated-link behavior directly
verified the required branded redirect. No owner Supabase change is currently
required. If the owner later changes Auth redirect settings, the exact
branded callback must remain:

`https://mycaloraapp.com/auth/callback`

## OAuth callback status

- Google provider authorize handoff: verified, HTTP 302 to Google.
- Branded callback target: `https://mycaloraapp.com/auth/callback`.
- PKCE flow: preserved.
- Duplicate browser/router delivery arbitration: preserved.
- Legacy custom scheme: preserved for app compatibility, not used as the
  approved Supabase web redirect.
- Invalid/unlisted redirect behavior: falls back to the configured Supabase
  Site URL.

## iOS Universal Links status

Native configuration already contains:

`applinks:mycaloraapp.com`

The bundle ID remains:

`com.etiendem.caloraapp`

The production AASA endpoint returned HTTP 200, JSON content type, no redirect,
and the expected application identifier:

`B5344GJRMT.com.etiendem.caloraapp`

The AASA file exposes only:

- `/invite/*`
- `/auth/callback`

The Apple association CDN checker also passed the exact application identity
and callback-path validation. This report does not claim device-level
Universal Link success because no signed native build was installed or tested.

## AASA evidence

Endpoint:

`https://mycaloraapp.com/.well-known/apple-app-site-association`

Observed:

- HTTP 200
- `application/json`
- no redirect
- exact bundle ID match
- exact auth callback component `/auth/callback`
- invite component `/invite/*`
- Apple association CDN evidence passed

The configured Apple Team ID and server response matched through the
association monitor without exposing the identifier in runtime logs.

## Android App Links status

Native configuration already contains two HTTPS intent filters for host
`mycaloraapp.com`:

- `/invite`
- `/auth/callback`

The Android package remains:

`com.etiendem.caloraapp`

The production assetlinks endpoint returned HTTP 200, JSON content type, no
redirect, the required package, and the configured SHA-256 certificate
fingerprint. The local association monitor passed the exact package,
fingerprint, and relation check.

This report does not claim device-level App Link success because no signed
native build was installed or tested in this phase.

## Assetlinks evidence

Endpoint:

`https://mycaloraapp.com/.well-known/assetlinks.json`

Observed:

- HTTP 200
- `application/json`
- no redirect
- relation `delegate_permission/common.handle_all_urls`
- package `com.etiendem.caloraapp`
- configured production certificate fingerprint present
- Google Digital Asset Links statements checker passed

The provider checker response was validated using its wrapped `statements`
shape rather than treating it as the direct assetlinks array.

## Production signing fingerprint status

The server-side production fingerprint configuration is present and matches
the public assetlinks response. The Apple association and Google Digital
Asset Links provider checks both passed.

The final native binary signing identity was not independently re-obtained in
this phase because no Expo/EAS build or signed-device validation was
authorized. The configured native association values were not fabricated or
changed.

## Invite/referral migration

Production-facing invite URLs are branded:

- `https://mycaloraapp.com/invite`
- `https://mycaloraapp.com/invite/<code>`

Native fallback remains:

- `caloraapp://invite/<code>`

The API referral route generates branded invite URLs. The native referral
helper accepts the custom scheme and branded universal-link shape, normalizes
the code, stores it under the existing local-state key, and activates the
existing authenticated referral flow.

Verified:

- invite route HTTP 200
- invalid/special-character code sanitization through deterministic tests
- branded OG URL and image metadata
- explicit custom-scheme app-open control
- no automatic crawler-unfriendly deep-link redirect
- no `calora.app` output
- no preview URL in generated invite output

## Production API client configuration

Changed:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://mycaloraapp.com"
      }
    }
  }
}
```

The app’s API URL validator continues to require an absolute HTTPS origin
without a path, query, fragment, or credentials. The API client therefore
resolves the verified origin safely and does not embed `/api` twice.

The development command still uses the development domain by design. It is
not part of production output.

## Legal/public/email URL normalization

The canonical brand module and API public pages use:

- `https://mycaloraapp.com/`
- `/privacy`
- `/terms`
- `/support`
- `/contact`
- `/delete-account`
- `/subscriptions`
- `/help`
- `/auth/callback`
- `/invite/<code>`

Email verification, resend verification, and password recovery all use the
branded callback. Provider-owned URLs such as Google, Apple, Google Play,
Supabase, and App Store destinations remain external as required.

## Exact files changed

- `artifacts/calora/eas.json`
  - changed only the production `EXPO_PUBLIC_API_URL` from the deferred API
    hostname to `https://mycaloraapp.com`
- `artifacts/api-server/src/routes/universal-links.ts`
  - added the safe branded `/auth/callback` browser fallback
- `artifacts/api-server/src/__tests__/universal-links.test.ts`
  - added callback status, cache, branding, and non-echo tests
- `05_CALORA_PHASE4_AUTH_DEEPLINK_NATIVE_MIGRATION_REPORT.md`
  - this report

No compatibility-sensitive identifiers, subscription products, database
identifiers, local-state keys, notification identifiers, native bundle IDs,
package names, Expo slug, or custom URL scheme were changed.

## External settings changed

None.

No Cloudflare DNS, email DNS, Supabase dashboard, Google OAuth provider,
Apple identifier, Android signing credential, RevenueCat configuration,
deployment setting, environment variable, or production infrastructure was
mutated.

## External owner actions required

The API artifact has now been republished and the live production callback and
route matrix have passed. The only remaining owner action is to authorize a
later signed Expo/EAS native build and device validation so released binaries
embed the branded API origin and real-device Universal/App Links behavior can
be tested. No DNS change is required.

## Deterministic test results

Passed:

- API universal-link test suite: 38 tests
- API server TypeScript typecheck
- Calora auth logic and real-auth simulation: 14 tests
- Calora TypeScript typecheck
- native association monitor:
  - production AASA
  - production assetlinks
  - Apple association CDN
  - Google Digital Asset Links statements
- local running `/auth/callback` fallback: HTTP 200, `no-store`
- callback query/token non-echo check
- production EAS JSON assertion for branded API origin
- branded CORS allowlist and preflight behavior
- branded API health and unauthenticated auth enforcement
- original Replit API health
- complete existing branded public route matrix
- invite fallback and association endpoint matrix
- static non-test runtime scan for `api.mycaloraapp.com` and `calora.app`

No Expo/EAS build, signed native build, native device test, GitHub push, or
production republish was performed.

## Security checks

- Callback HTML never echoes `code`, `access_token`, or other query values.
- Callback and invite pages are `no-store` and `noindex`.
- CORS allows the branded origin and rejects an unrelated browser origin.
- Supabase callback exchanges remain PKCE-based and duplicate-delivery-safe.
- No secrets were written to source, the report, or runtime output.
- No `calora.app` reference remains in non-test runtime sources.
- No Replit preview/development hostname remains in production EAS
  configuration.
- AASA and assetlinks are served as JSON without redirects.
- Existing email DNS and payment/subscription identifiers were untouched.

## Regression results

The existing production web/API foundation remains healthy:

- branded root and legal/support routes: HTTP 200
- branded API health: HTTP 200
- original Replit API health: HTTP 200
- existing unauthenticated protected API route: HTTP 401
- branded CORS request: allowed
- unrelated-origin CORS request: HTTP 403
- invite and native association endpoints: HTTP 200

The one production activation gap is intentional: before owner publishing,
the deployed API cannot contain the newly added `/auth/callback` route or the
updated source bundle. The running API workflow contains and serves the new
route successfully.

## Rollback plan

### Auth callbacks and Supabase redirects

If callback behavior regresses, restore the previous
`universal-links.ts` callback route implementation and keep the branded
Supabase callback allow-list entry. Do not remove the branded callback until a
replacement is verified. The legacy custom scheme remains available for
native compatibility.

### Native API base URL

Before a signed build is distributed, revert only the production
`EXPO_PUBLIC_API_URL` value in `eas.json` if the branded API origin fails.
Keep the separate API hostname deferred; do not invent DNS to compensate for
an unverified topology.

### Universal Links and Android App Links

Keep the server AASA and assetlinks responses serving both intended paths and
the existing identifiers. If a provider cache or signed build regresses,
restore the prior validated response values without changing bundle ID,
package name, Team ID, or certificate fingerprints.

### Invite URLs

Keep branded generated invites and preserve the custom-scheme
`caloraapp://invite/<code>` fallback. Do not delete the old route or local
pending-code key until branded app-open behavior is verified with a signed
build.

### Public absolute URLs

Restore only a specific changed source value if a regression is proven. Do not
alter Cloudflare or email DNS as a rollback shortcut.

## Remaining blockers

No code-level Phase 4 blocker remains. Two owner-controlled release actions
remain before this migration can be considered validated across all surfaces:

- authorize and distribute a later signed native build containing the updated
  production API origin;
- perform real-device iOS Universal Link and Android App Link validation.

Native device-level Universal Link and App Link behavior remains unclaimed
until a signed iOS/Android build is installed and tested. This is an explicit
release-evidence boundary, not a fabricated success claim.

## Exact next recommended phase

Owner-controlled native release validation:

1. authorize a signed Expo/EAS production build;
2. install and test iOS Universal Links and Android App Links on real
   devices;
3. record the signed-device evidence and retain the old Replit URL and
   compatibility scheme until those checks pass.

Do not change `www`, create `api.mycaloraapp.com`, modify DNS/email, change
Supabase redirects, rename native identifiers, or perform unrelated Phase 5
work as part of that activation.

## POST-REPUBLISH PRODUCTION VERIFICATION

**Verification scope:** read-only production checks after the owner republished
the current Replit deployment. No source, DNS, Supabase, Apple, Google,
RevenueCat, native-build, or deployment-setting changes were made during this
verification.

### Deployment state

`getDeploymentInfo()` reports:

- `success: true`
- `isDeployed: true`
- `hasSuccessfulBuild: true`
- `visibility: public`
- `deploymentType: autoscale`
- primary URL: `https://mycaloraapp.com`
- additional URL: `https://calorie-coach-pie35449.replit.app`

The original Replit URL remains healthy:

- `https://calorie-coach-pie35449.replit.app/api/healthz` → HTTP 200

Recent deployment logs show a short cluster of healthcheck errors at process
startup while the two artifact processes were being launched. The same
deployment then logged successful requests, including multiple
`/auth/callback` HTTP 200 responses. Current live probes pass the full matrix,
so this was transient startup timing rather than a production regression.

### Live `/auth/callback` evidence

Production probes against `https://mycaloraapp.com/auth/callback` returned:

- HTTP 200
- `Content-Type: text/html; charset=utf-8`
- `Cache-Control: no-store`
- `X-Robots-Tag: noindex`
- branded `Continue in Calora` content
- `caloraapp://auth/callback` custom-scheme handoff available
- no redirect loop
- no placeholder page

Representative harmless callback shapes were tested:

- no query or fragment
- `?error=access_denied&error_description=cancelled`
- `?code=harmless-test-code&access_token=harmless-test-token`
- `#access_token=harmless-hash-token&refresh_token=harmless-refresh-token`

None of the harmless query/hash values were echoed into returned HTML. The
handoff continues to reconstruct the custom-scheme target from browser-local
`window.location.search` and `window.location.hash`.

### Full branded production route matrix

| Route | Status | Observed content type |
|---|---:|---|
| `/` | 200 | `text/html` |
| `/api/healthz` | 200 | `application/json` |
| `/privacy` | 200 | `text/html` |
| `/terms` | 200 | `text/html` |
| `/support` | 200 | `text/html` |
| `/contact` | 200 | `text/html` |
| `/delete-account` | 200 | `text/html` |
| `/subscriptions` | 200 | `text/html` |
| `/help` | 200 | `text/html` |
| `/auth/callback` | 200 | `text/html` |
| `/invite/test` | 200 | `text/html` |
| `/.well-known/apple-app-site-association` | 200 | `application/json` |
| `/.well-known/assetlinks.json` | 200 | `application/json` |
| `/robots.txt` | 200 | `text/plain` |
| `/sitemap.xml` | 200 | `application/xml` |
| `/site.webmanifest` | 200 | `application/manifest+json` |

All requests completed without a redirect loop.

### API results

- `https://mycaloraapp.com/api/healthz` → HTTP 200, `{"status":"ok"}`
- protected `/api/v1/diary` without credentials → HTTP 401 with the expected
  sign-in message
- branded origin `https://mycaloraapp.com` → allowed CORS header
- unrelated origin `https://unrelated.example` → HTTP 403, no CORS allowance
- branded preflight → `Access-Control-Allow-Origin:
  https://mycaloraapp.com`
- production EAS configuration still resolves the API origin to
  `https://mycaloraapp.com`; no double `/api` construction is present

### Auth behavior results

- Google OAuth authorize probe → HTTP 302 to
  `https://accounts.google.com/o/oauth2/v2/auth`
- branded recovery-link target preserved:
  `https://mycaloraapp.com/auth/callback`
- legacy `caloraapp://auth/callback` recovery target safely fell back to the
  Supabase Site URL
- deliberately unlisted HTTPS recovery target safely fell back to the
  Supabase Site URL
- disposable probe user was deleted after the checks
- PKCE callback arbitration and trusted-host/path validation remain covered by
  the existing auth tests

### AASA results

`https://mycaloraapp.com/.well-known/apple-app-site-association` returned:

- HTTP 200
- `application/json`
- no redirect
- application identifier `B5344GJRMT.com.etiendem.caloraapp`
- `/auth/callback` support
- `/invite/*` support

The Apple association CDN checker passed the exact application identity and
callback-path validation. No real-device Universal Link success is claimed.

### Assetlinks results

`https://mycaloraapp.com/.well-known/assetlinks.json` returned:

- HTTP 200
- `application/json`
- no redirect
- package `com.etiendem.caloraapp`
- configured SHA-256 signing fingerprint present
- relation `delegate_permission/common.handle_all_urls`

The Google Digital Asset Links statements checker passed. No real-device
Android App Link success is claimed.

### Production-output scan

The production-facing source/configuration scan found:

- no `https://api.mycaloraapp.com`
- no `https://calora.app`
- no localhost or loopback value in public output
- no Replit preview/development hostname in production EAS configuration
- no secrets, tokens, credentials, or debug values in public output

The only loopback match is an intentional server-side
`127.0.0.1:1106` object-storage sidecar URL in `routes/recipes.ts`; it is
internal infrastructure configuration and is never emitted to clients. The
only `replit.dev` match is a development/production explanatory comment in
the invite renderer. Historical reports, tests, and development fixtures were
excluded from the production-output determination.

### Deterministic tests and regression status

Passed after republish:

- API route, CORS, and public-page suites: 56 tests
- API TypeScript typecheck
- Calora auth/deep-link suites: 14 tests
- Calora TypeScript typecheck
- native auth preflight unit tests: 5 tests
- native association monitor
- Apple association CDN evidence
- Google Digital Asset Links evidence
- complete live branded route matrix
- callback no-echo checks
- Supabase recovery-link behavior checks
- original Replit production health

The startup healthcheck log entries were transient and are followed by
successful live responses. No genuine Phase 4 production regression remains.

### Remaining owner action

Only the owner-authorized signed native build and device-level validation
remain. Do not trigger that build as part of this verification. After it is
authorized separately, validate iOS Universal Links and Android App Links
without changing the already-verified server configuration.

## Final verdict

OWNER NATIVE BUILD ACTION REQUIRED