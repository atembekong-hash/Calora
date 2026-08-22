# SYNTHETIC REHEARSAL — Coach Fact Context

**Rehearsal date:** 2026-08-22  
**Scope:** Non-production, synthetic-only validation of the dormant Coach Fact
Context path.  
**Production boundary:** No production database mutation, deployment, feature
gate, cohort, allowlist, consent, nonce, or real-user state was changed.

## Final result

**FULL PASS**

The rehearsal proved the development database’s real consent and rollout
controls, synthetic cleanup, dark-state restoration, strict route behavior,
client lifecycle containment, full automated regression coverage, and all four
required pending-completion rollback controls.

## Synthetic identity and safety controls

- Rollout synthetic identifier:
  `synthetic-coach-rehearsal-20260822-a`
- Consent synthetic identifier:
  `synthetic-coach-consent-20260822-a`
- No real email, customer account, diary content, Foundation fact, Coach
  message, or production data was used.
- The temporary development-only global configuration row and one reviewed,
  short-lived cohort member were removed before completion.
- The synthetic consent account was deleted, which removed its consent through
  the account-owned cascade. No synthetic nonce row remained.

## Tests performed and evidence

### 1. Initial development and production dark state — PASS

Read-only baseline queries in both environments returned:

```text
rollout_enabled=false
active_cohort_members=0
consent_rows=0
nonce_rows=0
```

The actual development `getCoachFactRolloutDecision` call for the synthetic
rollout identifier returned:

```text
{ "cohortEligible": false, "legacyFallbackEnabled": false,
  "reason": "dark_default_deny" }
```

### 2. Real server-owned eligibility and cohort gating — PASS

Only in development:

1. Inserted a temporary `coach_fact_context_rollout_enabled=true` JSON
   configuration row.
2. Inserted one reviewed synthetic membership in
   `coach_fact_context_v1` with a ten-minute expiry.
3. Called the real rollout module for that identifier.

The actual decision returned:

```text
{ "cohortEligible": true, "legacyFallbackEnabled": false,
  "reason": "cohort_eligible" }
```

This confirms the real development database, not a test mock, drives the
reviewed named-cohort decision.

### 3. Real consent lifecycle and account isolation — PASS

The real consent module was invoked for the synthetic consent identity:

```text
not_consented → consented_current → revoked
```

Each response used purpose `coach_fact_context_v1` and document version
`2026-08-21`. The synthetic account was then deleted. Targeted real-database
consent tests also passed, covering simultaneous account isolation, idempotent
accept/revoke, stale document version, database state constraint, cascade
deletion, and clean re-creation.

### 4. Rollback by membership removal — PASS

After deleting the temporary synthetic membership while the temporary global
row remained enabled, the real rollout module returned:

```text
{ "cohortEligible": false, "legacyFallbackEnabled": false,
  "reason": "cohort_deny" }
```

### 5. Global rollback and final cleanup — PASS

The temporary global configuration row was deleted. The real rollout module
then returned `dark_default_deny`. Final development and production queries
both returned zero enabled rollout, active cohort members, consent rows, and
nonce rows.

The running local API, with its normal server gate off, returned HTTP `404` for
the Fact Context path. This confirms unavailable dark-state behavior; it was
not used as a substitute for authenticated route validation.

### 6. Context construction, authorization, Coach delivery, and safety
containment — PASS (simulated provider/auth boundary)

Focused API route tests passed through the real route logic with mocked bearer
verification and provider transport:

- strict approved calorie/protein context formatting and allowlist validation;
- rejection of raw, legacy, unknown, malformed, oversized, deeply nested,
  expired, invalid-window, and excessive-future-skew payloads;
- missing consent, default-deny rollout, unavailable consent store, and
  idempotency-store failure all fail closed;
- risk-screened content does not reach the provider;
- provider response claims, actions, limitations, coverage, and nonce are
  reduced to deterministic supported output;
- rejected provider calls return safe unavailable handling;
- timeout aborts the provider call and late settlement cannot replace the
  failure;
- no legacy context fields, profile data, food names, or raw diary structures
  are included in the provider request.

Evidence: `pnpm --filter @workspace/api-server exec vitest run` across the
five focused Coach Fact Context test files passed **75 tests in 5 files**.

### 7. Idempotency and replay protection — PASS (route contract and database
claim behavior)

Focused route tests proved fresh nonce claim, duplicate-nonce HTTP `409`,
idempotency-store HTTP `503` fail-closed handling, and metadata-only nonce SQL
that excludes facts and messages. The rehearsal cleanup query found no
synthetic nonce row remaining.

### 8. Client lifecycle, expiry/revocation fencing, rollback, and Legacy Coach
fallback — PASS (simulated client boundary)

Focused Calora tests passed **52 tests in 5 files**, covering:

- client hard-off feature selection and Legacy Coach fallback;
- current server-consent requirement before Fact Context selection;
- account and hydration scope mismatch rejection;
- revoked consent and malformed local consent-cache handling;
- stale-result suppression after account change, sign-out, hydration reset,
  clear-data, deletion, unmount, and client rollback;
- no Fact Context-to-Legacy retry after a Fact Context selection;
- request-context expiry/validity construction.

### 9. Static and full regression verification — PASS

- `pnpm --filter @workspace/api-server run typecheck` — passed.
- `pnpm --filter @workspace/calora run typecheck` — passed.
- Focused API Coach tests — **5 files, 75 tests passed**.
- Focused Calora Coach tests — **5 files, 52 tests passed**.
- `pnpm --filter @workspace/api-server test` — **24 files, 300 tests
  passed**.
- `pnpm --filter @workspace/calora test` — **60 files, 1005 tests passed**,
  plus **6 server security tests passed**.

Expected simulated provider, rate-limit, and integration-failure log messages
appeared inside their existing test cases; no test suite failed.

### 10. Initial independent review

An independent architecture review found no observed control failure. It
confirmed that the evidence credibly proves dark-state control, synthetic
database lifecycle, mock-route/client behavior, cleanup, and regression
health. It identified the remaining live non-production authenticated egress
and pending-rollback exercise as a material evidence gap, not a discovered
production defect.

## Evidence boundaries

The pending-completion proof uses the real non-production consent, cohort,
configuration, and idempotency tables, with generated synthetic external
identities. It deliberately controls bearer verification and provider
settlement in-process so a completion can be held without relying on detached
shell clients. This verifies the route's race-boundary authorization recheck;
it does not replace the separately recorded live bearer/provider transport
evidence.

## Readiness determination

The system is **technically ready for a separately authorized controlled
activation**, subject to the independent governance, target-environment, and
dark-state gates already documented for that activation. This report does not
authorize, begin, or schedule controlled activation.

SYNTHETIC REHEARSAL VERDICT: FULL PASS

## Addendum: isolated authenticated runtime attempt

After the initial report, an isolated non-production API process was run on
local port 9000 with `COACH_FACT_CONTEXT_ENABLED=true` scoped only to that
temporary process. A generated, confirmed synthetic Supabase Auth identity was
used; it and its temporary files were deleted afterward.

The live consent endpoint returned `consented_current`. A valid authenticated
Fact Context request with only the deterministic calorie fact reached the
configured production-provider boundary and returned the safe unavailable
response (`502`); replaying its exact nonce returned `409`. This proves the
live bearer middleware, server-owned consent, real cohort authorization, nonce
claim, replay denial, and provider failure containment. No legacy retry
occurred.

For a deterministic pending-request exercise, a disposable local provider
simulator delayed its response and retained no request content. Its structural
log confirmed `legacy_context_detected=false` and two provider messages
(system plus the bounded synthetic conversation turn). A normal delayed
response was constrained to the approved response shape.

The original detached concurrent global-rollback capture was **inconclusive**:
the Replit command execution environment terminated both detached client
processes before they could write their delayed post-rollback responses.
The development global configuration was nevertheless changed to `false`
while the simulator had received a request, and all controls were subsequently
purged. This is not counted as proof that the server emitted the required
post-settlement `404`.

Final cleanup was rechecked after the attempt:

```text
development: rollout_enabled=false, active_cohort=0, consents=0, nonces=0
production:  rollout_enabled=false, active_cohort=0, consents=0, nonces=0
```

## Pending-completion rollback closure — FULL PASS

A deterministic database-backed integration rehearsal replaced the fragile
detached-client method. It can execute only with both `NODE_ENV=test` and the
explicit `COACH_FACT_CONTEXT_SYNTHETIC_REHEARSAL=development-only` opt-in.
Each case used a fresh generated synthetic external identity, real development
consent/config/cohort/idempotency state, and a provider promise held after
route entry. Before the provider promise settled, the test changed exactly one
control:

1. Deleted the reviewed cohort membership.
2. Set the global rollout configuration to boolean `false`.
3. Revoked the server-owned current consent.
4. Disabled `COACH_FACT_CONTEXT_ENABLED` in the isolated test process.

For all four cases, the real route rechecked authorization after provider
settlement and returned HTTP `404` with the unavailable response. Each case
also proved exactly one provider call, so no second egress or Legacy Coach
retry occurred. The test cleanup removes generated rows, restores the exact
original rollout-row presence/value, and restores the original process-local
server-gate value.

Evidence:

```text
coachFactContext.pendingRollback.integration.test.ts: 4 / 4 passed
API regression suite: 25 files / 304 tests passed
Independent review: PASS
Final development and production state: rollout=false, active cohort=0,
consents=0, nonces=0
```

SYNTHETIC REHEARSAL VERDICT: FULL PASS