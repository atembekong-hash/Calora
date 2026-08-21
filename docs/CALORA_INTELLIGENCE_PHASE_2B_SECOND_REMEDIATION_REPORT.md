# Calora Intelligence Phase 2B — Second Remediation Report

## Scope and final dark state

This remediation strengthens the dormant Coach Fact Context boundary only. It does not activate the feature.

- Client `intelligence.coach.fact_context`: **OFF**
- Server `COACH_FACT_CONTEXT_ENABLED`: **OFF**
- Named server cohort: **empty and disabled (deny all)**
- Fact Context allowlist: **unchanged**
- Legacy Coach: **available for current users**
- Longitudinal Intelligence flags: **OFF**

## Corrected database authority and DDL proof

Calora domain data is managed PostgreSQL through the canonical Drizzle schema and `DATABASE_URL` deployment path (`lib/db/src/schema/index.ts`, `lib/db/drizzle.config.ts`, and `scripts/post-merge.sh`). The prior Supabase migration is now inert documentation, preventing a competing domain-schema authority.

The managed PostgreSQL schema now declares the metadata-only consent ledger with:

- account ownership through `calora_users`;
- a composite user/purpose key and matching unique index;
- `ON DELETE CASCADE`;
- a database check allowing only `consented_current` or `revoked`;
- version, state, decision/revocation timestamps, and update metadata only.

`pnpm --filter @workspace/db run push` applied the canonical schema to the development managed PostgreSQL target, followed by support-object provisioning. No Fact Context, Foundation fact, prompt, message, or conversation data is stored.

## Consent lifecycle and deletion proof

The real-database consent integration suite now verifies accept, read, idempotent accept/revoke, stale document version, current authoritative document version after revoke, A/B isolation, cascade deletion, and recreated external identity starting `not_consented`. It also proves the database rejects an invalid consent state.

## Server freshness and timestamp policy

The Fact Context lifetime remains exactly **60 seconds**. The server now enforces:

- `expiresAt` strictly after `generatedAt`;
- an exact 60-second interval;
- a maximum future client clock skew of **10 seconds**;
- server-observed expiry rejection;
- strict schema parsing before provider access.

Focused adversarial tests cover expiry, malformed timestamps, future generation, skew-boundary acceptance, excessive/short intervals, old/replayed contexts, and strict raw/legacy payload rejection.

## Live coordinator and exactly-one architecture

`CoachFactActivationCoordinator` is now reached through the live Coach send adapter. The screen synchronizes its authenticated account ID, hydration generation, and consent state into a stable lifecycle fence before sending.

- When the dark flag denies Fact Context, one legacy request is sent with legacy context only.
- A future eligible selection can use only the sanitized Fact Context request path.
- The Fact Context branch never retries with broad legacy context.
- A stale/unavailable selection produces no assistant turn.

The current default-off controls ensure existing users retain the exact legacy route.

## Synchronous lifecycle epoch and invalidation

The client adapter has a synchronous epoch that binds account, hydration generation, consent, selection, nonce, and expiry. Live render-state synchronization invalidates a pending response when scope changes before it settles. The public invalidation hook also invalidates the coordinator request scope.

Focused tests cover A→B switching, sign-out, hydration reset, clear-data, consent revoke, deletion path, client rollback, expiry, and stale-response suppression. Server completion rechecks the server gate, cohort eligibility, and current consent after provider completion, so a gate-off, cohort removal, or revocation during a pending provider request cannot return a Fact Context response.

## Server-owned cohort and rollback rehearsal

The rollout module now has an explicit named, server-owned cohort mechanism with an empty immutable membership set and disabled cohort gate. It is deterministic, account scoped, has no client enrollment API, stores no Fact Context values, and has no logs containing account membership.

Tests confirm default deny and empty membership. Endpoint tests simulate an eligible decision, then server-gate rollback and cohort denial, confirming new egress is blocked; the post-provider eligibility recheck prevents a late provider completion from surfacing after rollback.

## Security boundaries retained

Bearer authentication, server-authoritative consent, cache-only authorization prohibition, strict request shape, frozen allowlist, raw/legacy rejection, pre-egress risk screening, deterministic claim validation, 12-second provider deadline/abort, privacy-safe dark-route logging, 60-second TTL, and account isolation remain in place.

## Files created, modified, or neutralized

- `lib/db/src/schema/index.ts`
- `supabase/migrations/20260821143000_create_coach_fact_context_consents.sql` (neutralized; no competing DDL)
- `artifacts/api-server/src/lib/coach-fact-rollout.ts`
- `artifacts/api-server/src/routes/coachFactContext.ts`
- `artifacts/api-server/src/__tests__/coachFactConsent.integration.test.ts`
- `artifacts/api-server/src/__tests__/coachFactContext.test.ts`
- `artifacts/api-server/src/__tests__/coachFactRollout.test.ts`
- `artifacts/calora/app/coach.tsx`
- `artifacts/calora/lib/intelligence/coachLifecycleEpoch.ts`
- `artifacts/calora/lib/intelligence/useCoachSendAdapter.ts`
- `artifacts/calora/lib/intelligence/index.ts`
- `artifacts/calora/lib/__tests__/coachSendAdapter.test.ts`

## Validation

Passed during this remediation:

- managed PostgreSQL schema push and support-object provisioning;
- real-database consent integration tests;
- API server typecheck;
- Calora typecheck;
- API server regression suite: **24 files / 263 tests**;
- Calora regression suite: **59 files / 987 tests**.

Expected simulated provider and persistence failure warnings remain in unrelated existing tests.

## Defects discovered and fixed

1. The initial reconciliation found local work already directly based on `origin/main`; no commits were lost or overwritten.
2. The first client adapter draft used a permanent `null` account scope. It now uses the real authenticated account ID.
3. The first epoch draft only advanced when another send began. The live Coach screen now synchronizes epoch state on the render that observes account, hydration, or consent changes.
4. The first managed schema test exposed that the target database had not yet received the state check constraint. Applying the canonical Drizzle schema corrected this and the real-database assertion now passes.
5. An accidental debug-only API test was removed.

## Remaining blockers and deferred validation

No activation is authorized by this report. A separate final Phase 2B activation-readiness review must independently verify the production deployment procedure, full authenticated deletion saga, gate/cohort operations, and end-to-end client behavior under an expressly approved cohort.

The following remain deferred and are **not** marked passed: physical Android/iOS validation, responsive behavior, large text, TalkBack, VoiceOver, offline, force-close, and real-device performance validation.

SECOND REMEDIATION VERDICT: READY FOR FINAL PHASE 2B ACTIVATION-READINESS REVIEW