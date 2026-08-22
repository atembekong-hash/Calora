# Calora pre-activation production health remediation

**Assessment date:** 2026-08-22  
**Scope:** Production-health remediation before any Coach Fact Context
activation. This work did not activate, enroll, consent, or send provider
traffic for Coach Fact Context.

## Executive result

Two independent issues were found:

1. The API service base path, `/api`, returned `404` even though the explicit
   health endpoint, `/api/healthz`, was healthy. Deployment logs showed probes
   against service paths, so this could produce misleading unhealthy deployment
   signals.
2. RevenueCat entitlement verification failed upstream with `401`, provider
   code `7225`, and the message `Invalid API Key.` The application correctly
   contained this as a Premium-recipes `503`, but valid entitlement checks
   cannot succeed until the connector credential is repaired.

The base-path health fix has been implemented and verified in development. It
requires a user-initiated Publish to become active in production. RevenueCat
remains blocked by a user-managed connector credential; no secret was read,
changed, or exposed.

## Confirmed production evidence

| Check | Result |
| --- | --- |
| Deployment | Active public autoscale deployment with a successful build |
| `GET /api/healthz` | `200` with `{"status":"ok"}` |
| `GET /api` before the source fix is published | `404` |
| `GET /invite` | `200` |
| Apple universal-link document | `200` |
| Android asset-link document | `200` |
| RevenueCat connector status | Reported healthy by connector metadata |
| RevenueCat subscriber lookup through that connector | `401`, provider code `7225`, `Invalid API Key.` |
| Premium-route behavior in logs | Entitlement lookup `401` was contained as the intended `503`; no provider recipe request followed |

The source and artifact configuration already identify `/api/healthz` as the
explicit startup health endpoint. The additional `/api` response is a
compatibility response for path-level probes, not a change to authentication,
business logic, or database behavior.

## Implemented remediation

The API now returns the same minimal dependency-free status payload from both:

- `/api`
- `/api/healthz`

The new regression test verifies both paths. Validation completed successfully:

- focused health test: 2 passing;
- API typecheck: passing;
- full API suite: 25 passing files, 302 passing tests, with 4 intentionally
  skipped opt-in rehearsal tests;
- restarted local API workflow: both development routes returned
  `{"status":"ok"}`.

## RevenueCat root cause and required safe repair

The API code does not build a RevenueCat authorization header or read a
RevenueCat environment variable. It uses the Replit RevenueCat connector proxy.
The direct read-only lookup through that same connector produced the provider's
specific `Invalid API Key` response. This confirms a connector credential,
credential type, or RevenueCat-project mismatch rather than an API-route bug.

Before rechecking production, update the **existing Replit RevenueCat
connection** with a current server-side RevenueCat REST/secret API key for the
Calora project and entitlement `caloraapp_pro`. Do not use a mobile public SDK
key, and do not paste any key into chat or source control. After the connection
is updated, rerun a read-only subscriber lookup and a valid entitlement path;
the lookup must no longer return `401`.

## Coach Fact Context prerequisite state

No Fact Context control was changed.

| Control | Evidence | State |
| --- | --- | --- |
| Production process gate | No production `COACH_FACT_CONTEXT_ENABLED` environment value is configured; an empty unauthenticated request to the deployed endpoint returned the expected unavailable `404` before body parsing or provider work | Off / fail closed |
| Global rollout config | Production read-only query found 0 matching configuration rows | Off |
| Active cohort | Production read-only query found 0 active members in `coach_fact_context_v1` | Empty |
| Server-owned consent | Production read-only query found 0 consent rows | Empty |
| Idempotency nonce ledger | Production read-only query found 0 nonce rows | Empty |
| Required operational tables | All four rollout, cohort, consent, and idempotency tables are present | Present |
| Frozen fact allowlist | Source remains restricted to the four approved daily fact keys | Unchanged |
| Client capability | Current client source keeps `intelligence.coach.fact_context` hard-false | Dark in current source; a released native binary cannot be independently inspected from this environment |

## Residual risk and release boundary

The production base-path health repair is not live until the user publishes the
validated source. RevenueCat entitlement verification remains unavailable until
the existing connector credential is corrected. These are blocking production
health prerequisites; neither condition authorizes a Coach Fact Context change.

After both are resolved, repeat the production checks for `/api`,
`/api/healthz`, RevenueCat subscriber lookup, Premium entitlement behavior, and
the dark Fact Context controls. Do not activate Coach Fact Context as part of
that recheck.

PRE-ACTIVATION HEALTH VERDICT: BLOCKED