# Calora Intelligence Phase 2B final remediation evidence

## Verdict

**REMEDIATION COMPLETE — ACTIVATION REMAINS BLOCKED PENDING SEPARATE APPROVAL.**

The implementation closes the readiness blockers without activating the
feature. No real account was enrolled and no production traffic was enabled.

## Controls implemented

1. **Managed PostgreSQL authority**
   - One committed, forward-safe Drizzle migration establishes the consent
     ledger and operational Fact Context records.
   - The migration runner records immutable application history.
   - The Supabase consent migration remains intentionally inert.
   - Direct development schema inspection confirmed the consent composite
     primary key, cascade foreign key, and state check.

2. **Server-owned rollout**
   - A server config record is the global runtime switch; an absent/non-true
     value denies all access.
   - Cohort membership is named, server-owned, reviewer-marked, and expires
     unless explicitly maintained.
   - There is no client enrollment path. Database errors fail closed.
   - At completion, no runtime gate or cohort member was enabled.

3. **Minimized fact boundary**
   - The live Coach boundary derives only approved daily calorie and protein
     facts for the dark coordinator.
   - It filters every other fact key before selection. Legacy Coach retains
     broad local context only on its pre-egress Legacy branch.

4. **Lifecycle and request hardening**
   - Mounted adapters unregister on unmount and synchronously invalidate
     pending responses on account, hydration, consent, rollback, clear-data,
     and teardown transitions.
   - Request validation rejects unknown nested keys, non-primitive values,
     oversized strings, excess turns, aggregate message overages, and deep
     payloads before provider egress.
   - The atomic per-account nonce ledger rejects replay and concurrent duplicate
     Fact Context attempts without retaining content.

## Validation evidence

Completed in development:

- `pnpm --filter @workspace/db run migrate`
- `pnpm run typecheck:libs`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/calora run typecheck`
- `pnpm --filter @workspace/api-server test` — 24 files, 300 tests passing
- `pnpm --filter @workspace/calora test` — 60 files, 1005 tests passing
- Direct managed PostgreSQL query of consent constraints

The focused test coverage includes direct request abuse, unknown nested
structures, body/message budgets, replay conflict, rollout denial, expiry and
review checks, provider deadline behavior, stale lifecycle settlement, and
unmount cleanup. It also constructs the real mobile calorie/protein Fact
Context payload and submits it to the API router, guarding the exact-string
protocol contract.

## Synthetic activation and rollback rehearsal

A development-only, synthetic identifier was added to the named cohort with a
five-minute expiry and a reviewed timestamp while the server config was set to
the JSON boolean `true`. Direct operational queries confirmed both controls
were active. The temporary cohort record, global config record, and any
synthetic idempotency record were then deleted. A final query confirmed zero
enabled global switches and zero active cohort members. No customer identity,
Fact Context value, conversation, or provider request was used.

## Final dark state

- Client Fact Context gate: OFF
- Server environment gate: OFF by default
- Operational global config: no enabled value
- Operational cohort: DENY ALL
- Fact Context allowlist: unchanged
- Longitudinal Intelligence flags: OFF
- Legacy Coach: retained

## Deferred approval boundary

The deployment and rollback procedure is documented in
`COACH_FACT_CONTEXT_DEPLOYMENT_AND_ROLLBACK_RUNBOOK.md`. A future controlled
synthetic rehearsal and any activation decision require separate authorization.