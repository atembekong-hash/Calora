# Calora pre-activation production health remediation

**Assessment date:** 2026-08-22  
**Scope:** Historical production-health remediation snapshot taken before the
later approved-pilot authentication and consent repair. This assessment did not
activate, enroll, consent, or send provider traffic for Coach Fact Context.
Its zero-consent evidence is not the later post-repair verification state.

**Current status:** This pre-publish assessment is superseded by the released
production verification in `ACTIVATION_REMEDIATIONS_RELEASED_CALORA.md`. That
later report identifies the deployed revision and records final production
`GET /api`, `GET /api/healthz`, RevenueCat v2, authenticated missing-customer
denial, and dark-gate checks.

## Executive result

Two independent issues were found:

1. The API service base path, `/api`, returned `404` even though the explicit
   health endpoint, `/api/healthz`, was healthy. Deployment logs showed probes
   against service paths, so this could produce misleading unhealthy deployment
   signals.
2. RevenueCat entitlement verification initially failed upstream with `401`,
   provider code `7225`, and the message `Invalid API Key.` The application
   correctly contained this as a Premium-recipes `503`. The existing connector
   has since been repaired and read-only RevenueCat project and customer
   lookups now return `200`.

At the time of this historical assessment, the base-path health fix had been
implemented and verified in development but still required publishing. No
credential value was exposed, copied, or changed during the RevenueCat recheck.
The live Premium allow path was verified through the development API proxy.

## Confirmed production evidence

| Check | Result |
| --- | --- |
| Deployment | Active public autoscale deployment with a successful build |
| `GET /api/healthz` | `200` with `{"status":"ok"}` |
| `GET /api` before the source fix is published | `404` |
| `GET /invite` | `200` |
| Apple universal-link document | `200` |
| Android asset-link document | `200` |
| RevenueCat connector status | Repaired; authenticated read-only project and customer lookups returned `200` |
| RevenueCat entitlement records | 41 customer records examined; v2 found one active `caloraapp_pro` entitlement and 40 customers without it |
| Legacy subscriber lookup | v1 returned `401` for the active customer despite the repaired v2 connection, so it could not be used for entitlement authorization |
| Premium-route deny behavior | Focused route and helper tests confirm an authenticated account without the entitlement receives `403` |
| Premium-route allow behavior | The authorized active internal test account reached `GET /api/v1/premium-recipes` through the development proxy with `200` and an available catalog; it did not return `401`, `403`, or `503` |

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

## RevenueCat repair and remaining validation

The API code does not build a RevenueCat authorization header or read a
RevenueCat credential. It uses the Replit RevenueCat connector proxy and the
non-secret configured project ID.
The former provider-specific `Invalid API Key` response is no longer present:
read-only v2 project, customer, and active-entitlement lookups all returned
`200` through the existing connection. This confirms the repaired connection
can perform server-side RevenueCat reads without exposing a credential.

The old v1 subscriber endpoint still returned `401` for the active internal
test customer. The Premium entitlement helper now uses the supported v2
project/customer active-entitlements API instead: it resolves the stable
`caloraapp_pro` lookup key to RevenueCat's opaque entitlement ID, then checks
only that customer's currently active records. It fails closed for missing
configuration and provider failures.

The focused helper tests cover active access, no-entitlement denial, and an
upstream verification failure. The full API suite passed, and the active
internal test account reached the real Premium list route successfully. No
subscription, entitlement, customer, credential, or account data was changed
to perform the check.

## Coach Fact Context prerequisite state (historical pre-repair snapshot)

No Fact Context control was changed during this historical health assessment.
The zero consent count below predates the later approved-pilot repair recorded
in `ACTIVATION_REMEDIATIONS_RELEASED_CALORA.md`; it does not describe the
post-repair state.

| Control | Evidence | State |
| --- | --- | --- |
| Production process gate | No production `COACH_FACT_CONTEXT_ENABLED` environment value is configured; an empty unauthenticated request to the deployed endpoint returned the expected unavailable `404` before body parsing or provider work | Off / fail closed |
| Global rollout config | Production read-only query found 0 matching configuration rows | Off |
| Active cohort | Production read-only query found 0 active members in `coach_fact_context_v1` | Empty |
| Server-owned consent | Production read-only query found 0 consent rows | Empty |
| Idempotency nonce ledger | Production read-only query found 0 nonce rows | Empty |
| Required operational tables | All four rollout, cohort, consent, and idempotency tables are present | Present |
| Frozen fact allowlist | Source remains restricted to `daily.calorie_status` and `daily.protein_status` only | Unchanged |
| Client capability | Current client source keeps `intelligence.coach.fact_context` hard-false | Dark in current source; a released native binary cannot be independently inspected from this environment |

## Residual risk and release boundary

At the time of this historical assessment, publishing remained necessary before
production health could be considered clear. That blocker was subsequently
resolved and rechecked against the deployed revision in
`ACTIVATION_REMEDIATIONS_RELEASED_CALORA.md`; this document must not be used as
the current production-readiness verdict.

HISTORICAL PRE-PUBLISH HEALTH VERDICT: BLOCKED — SUPERSEDED BY THE FINAL
RELEASED PRODUCTION VERIFICATION REPORT
