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
2. RevenueCat entitlement verification initially failed upstream with `401`,
   provider code `7225`, and the message `Invalid API Key.` The application
   correctly contained this as a Premium-recipes `503`. The existing connector
   has since been repaired and read-only RevenueCat project and customer
   lookups now return `200`.

The base-path health fix has been implemented and verified in development. It
requires a user-initiated Publish to become active in production. No secret was
read, changed, or exposed during the RevenueCat recheck. A live Premium allow
path remains unverified because the connected project has no active
`caloraapp_pro` customer available for testing.

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
| RevenueCat entitlement records | 41 customer records examined; no active `caloraapp_pro` entitlement was present |
| Premium-route deny behavior | Focused route tests confirm authenticated accounts without entitlement receive `403`; the local QA credentials are no longer accepted, so this could not be repeated against a live session |
| Premium-route allow behavior | Pending an active test entitlement; no live account can currently exercise the allow path |

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
RevenueCat environment variable. It uses the Replit RevenueCat connector proxy.
The former provider-specific `Invalid API Key` response is no longer present:
read-only project, customer, and active-entitlement lookups all returned
`200` through the existing connection. This confirms the repaired connection
can perform server-side RevenueCat reads without exposing a credential.

There are currently no customers with an active `caloraapp_pro` entitlement in
the connected project. The Premium route's deny and unavailable branches remain
covered by the focused test suite, but the live allow path cannot be exercised
until a designated test account has an active entitlement. Do not grant,
purchase, reset, or otherwise alter a customer solely for this recheck without
the account owner's approval.

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
validated source. RevenueCat entitlement verification is available again, but
live Premium allow-path validation remains blocked until an active test account
is available. Neither condition authorizes a Coach Fact Context change.

After an active test account is available, repeat the Premium entitlement allow
check and confirm the route does not return `401` or `503`. Do not activate
Coach Fact Context as part of that recheck.

PRE-ACTIVATION HEALTH VERDICT: PARTIALLY UNBLOCKED — RevenueCat connector
verification is repaired; Premium allow-path verification remains pending an
active test account.