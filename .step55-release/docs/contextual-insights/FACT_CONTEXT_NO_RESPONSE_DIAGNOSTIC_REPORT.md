# Fact Context No-Response Diagnostic Report

## Scope

Focused production investigation of the approved pilot's Coach send flow. No
application code, rollout control, consent record, cohort record, provider
configuration, or deployment was changed.

## Root Cause

The approved pilot does not have a current `coach_fact_context_v1` consent
record in production. The mobile coordinator correctly treats that as
`consent_not_current` and does not dispatch a Fact Context response request.

The visible user message is appended locally before this authorization check.
That is why the user turn appears while no provider-backed Coach reply follows.

## Exact Failure Point

1. The Coach screen appends the user turn locally and invokes
   `CoachFactActivationCoordinator`.
2. The coordinator obtains current server consent using
   `GET /api/v1/coach/fact-context/consent`.
3. Production data confirms the approved pilot has no current consent record
   for purpose `coach_fact_context_v1` and document version `2026-08-21`.
4. The coordinator returns
   `{ kind: "unavailable", reason: "consent_not_current" }`.
5. The response POST is not attempted, so no nonce is created, rate limiter is
   not evaluated, and the AI provider is not called.

Relevant implementation:

- `artifacts/calora/lib/intelligence/coachFactActivationCoordinator.ts`
  returns `consent_not_current` before request dispatch.
- `artifacts/calora/app/coach.tsx` renders the unavailable-state assistant
  message for terminal unavailable results.

## Endpoint and Response Evidence

### Actual pilot flow

- Consent endpoint: `GET /api/v1/coach/fact-context/consent`
- Expected result for the approved pilot under the current database state:
  authenticated `200` response with non-current consent status.
- Fact Context response endpoint:
  `POST /api/v1/coach/fact-context/respond`
- Actual pilot POST status: not sent. The client stops at the consent gate.

### Live production endpoint probe

An unauthenticated, empty-body diagnostic probe to the response endpoint
returned:

```json
{"message":"Coach Fact Context is unavailable."}
```

with HTTP status `404`. This is the route's deny-all behavior while its
process gate is closed and occurs before token, consent, cohort, nonce,
rate-limit, or provider processing.

Production logs also contain historical `POST
/api/v1/coach/fact-context/respond` requests with HTTP `404`; no provider
completion or provider-error entry was recorded for those requests.

## Production Authorization Evidence

- Production global rollout:
  `coach_fact_context_rollout_enabled = false`.
- Active reviewed `coach_fact_context_v1` cohort memberships: `0`.
- Active Fact Context idempotency/nonce claims: `0`.
- Current consent records for the approved pilot: absent.
- The production response route is fail-closed with HTTP `404` while the
  process gate is closed.
- The approved pilot's dedicated-account metadata had been verified before
  this diagnosis. It is not reached for this attempted send because the
  client-side consent gate stops first.
- The authentication token cannot be independently inspected from the mobile
  device in this investigation. The actual response route is not reached, so
  no route-level token verification result exists for this send.

## Provider, Nonce, Rate Limit, and Payload

None are reached for the attempted pilot send:

- No response POST means no request nonce is created or validated.
- No rate-limit check runs.
- No provider request is attempted.
- No provider response, parse result, or Coach response payload exists for
  the client to render.

The mobile response parser and assistant rendering path are therefore not the
failure point for this incident.

## Files Changed

None. The observed behavior is the intended explicit-consent and deny-all
security boundary, not a code defect.

## Tests Run

```text
pnpm --filter @workspace/calora exec vitest run \
  lib/__tests__/coachFactActivationCoordinator.test.ts
```

Result: `6 passed`.

The targeted suite confirms a non-current consent produces
`consent_not_current` and no Fact Context request is dispatched or replaced
with Legacy Coach.

## Deployment and Mobile Build

- Backend republish required: **No**.
- New mobile build required: **No**.

These answers apply only to the Fact Context no-response incident documented
here. Later production-hardening changes to native associated-domain and app-link
configuration require a new signed mobile build before direct HTTPS invite
handoff can be certified.

## Remaining Blocker

The approved pilot must provide real, current in-app consent. Even after that
consent is recorded, Fact Context will remain unavailable while the production
process gate, global rollout, and reviewed cohort membership remain
intentionally closed.

## Exact Next Human Action

If the goal is to record consent only, sign in as the approved pilot and tap
**Allow summarized Fact Context** in Coach. Do not expect a provider-backed
Coach reply while the rollout remains off. No rollout or activation control
should be changed unless separately authorized through the controlled
production-operator process.