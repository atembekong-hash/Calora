# Calora Intelligence Phase 2B — Remediation Report

## Scope completed

This remediation made Coach Fact Context authorization and failure boundaries deployable without activating the feature. Client and server Fact Context gates remain off, cohorts remain deny-all, the fact allowlist is unchanged, and legacy Coach behavior was not migrated or retired.

## Migration added

`supabase/migrations/20260821143000_create_coach_fact_context_consents.sql`

The idempotent migration creates the versioned, server-authoritative `calora_coach_fact_context_consents` ledger with:

- internal `calora_users.id` ownership;
- one consent row per `(user_id, purpose)`;
- document version, state, decision, revocation, and update metadata only;
- no Fact Context values, Foundation facts, prompts, messages, or conversation content;
- `ON DELETE CASCADE` from `calora_users`;
- Row Level Security enabled and public client roles revoked when those roles exist in the target database.

## Supabase/database verification

The migration was applied to the available development PostgreSQL database with `psql` and `ON_ERROR_STOP`.

Verified against the live schema:

- the consent table exists;
- `user_id` has a foreign key to `calora_users(id)` with `ON DELETE CASCADE`;
- `calora_coach_fact_context_consents_user_purpose_idx` exists.

## Consent lifecycle proof

The real-database consent integration tests prove:

- authenticated-server-facing external identities are resolved to internal user ownership;
- accept is idempotent;
- read returns only the current account’s status;
- revoke is idempotent;
- a stale stored document version reports `stale_version`;
- an explicit revoke restores the current authoritative document version and reports `revoked`;
- Account A cannot read or affect Account B’s consent;
- no fact values are stored in the ledger.

### Defect found and fixed

The expanded real-schema test found that revoking an older-version consent record left its old `documentVersion` unchanged, so serialization continued to report `stale_version`. The revoke upsert now records the current document version together with the revoked state.

## Deletion and recreated-account proof

The real database integration suite deletes the owning `calora_users` record and proves the consent row cascades away. It then resolves the same external identity again and proves the recreated internal account starts as `not_consented`, never inheriting the deleted account’s decision.

The account deletion route already deletes the owned `calora_users` row in its application-data transaction; the verified foreign-key cascade therefore covers the consent ledger in that deletion sequence.

## Activation coordinator architecture

`CoachFactActivationCoordinator` is the sole dormant Fact Context architecture selector:

1. It requires the existing client feature gate to be enabled.
2. It requires an authenticated account and hydrated local state.
3. It fetches current consent directly from the server for each Fact Context selection.
4. It never reads AsyncStorage consent cache to authorize egress.
5. It creates a Fact Context selection only for current, purpose-scoped server consent.
6. It carries the account ID and hydration generation that produced the consent/fact selection into the request boundary.
7. It rejects an account or hydration mismatch before egress.
8. It delegates only a Fact Context payload to the dark request client; legacy context is never a parameter to that path.

When the client gate is off, it returns the legacy selection without reading server consent or transmitting Fact Context. This preserves the current legacy Coach behavior and prevents mixed legacy/new context payloads.

## Account and hydration lifecycle

The coordinator uses the existing in-memory request lifecycle scope. A response is accepted only while:

- the original request scope is active;
- account ID matches the selection;
- hydration generation matches the selection;
- nonce matches the generated context;
- the 60-second context has not expired.

Existing lifecycle fences invalidate active scopes on account-bound Calora state cleanup and consent revocation. The coordinator additionally rejects changed account/hydration inputs before a request begins, so Account A facts cannot be sent while Account B is current.

## Architecture-selection guarantee

Each coordinator request receives exactly one selection:

- `legacy`: no Fact Context request occurs;
- `fact_context`: only the sanitized `factContext`, messages, and current screen are sent to the dark endpoint.

There is no legacy fallback parameter or combined payload in the dark request helper. Server strict-request validation separately rejects legacy/raw/unknown coexistence.

## Provider timeout implementation

The dark endpoint now uses `createDarkCoachCompletion` with a 12-second `AbortController` deadline:

- the provider transport receives an abort signal at deadline;
- a race ensures a late completion cannot alter the deterministic unavailable result;
- timeout, rejection, empty output, malformed output, and unsupported claims resolve through the existing unavailable or limited safe responses;
- no partial provider output is sent to the client.

## Replay-policy decision

**Calora does not currently require exactly-once Fact Context egress or audit semantics.**

A repeated request within the 60-second context TTL is not authorization: bearer authentication, current server consent, server gate, deny-all cohort, account-bound request scope, strict payload validation, and per-account rate limiting still apply. A duplicate can only cause bounded duplicate provider egress for the same currently authorized account; it cannot bypass consent or expose new data.

Therefore, this remediation intentionally does not add nonce persistence or server nonce consumption. If a future rollout requires exactly-once provider egress, billing-grade audit semantics, or cross-request idempotency, it must stop and separately authorize server-issued cryptographic nonces plus atomic per-account consumption storage.

## Files changed

- `supabase/migrations/20260821143000_create_coach_fact_context_consents.sql`
- `artifacts/api-server/src/lib/coach-fact-consent.ts`
- `artifacts/api-server/src/routes/coachFactContext.ts`
- `artifacts/api-server/src/__tests__/coachFactConsent.integration.test.ts`
- `artifacts/api-server/src/__tests__/coachFactContext.test.ts`
- `artifacts/calora/lib/intelligence/coachFactActivationCoordinator.ts`
- `artifacts/calora/lib/intelligence/index.ts`
- `artifacts/calora/lib/__tests__/coachFactActivationCoordinator.test.ts`

## Tests and results

Passed:

- real-database Coach Fact Context consent integration tests: **2 tests**;
- focused Fact Context API tests: **12 tests**;
- focused Calora coordinator and Fact Context tests: **9 tests**;
- Calora typecheck: passed;
- API server typecheck: passed;
- complete `pnpm test`: passed, including Calora tests and **23 API test files / 244 API tests**.

The workspace-wide typecheck remains blocked by two pre-existing React ref-type errors in `artifacts/mockup-sandbox` (`calendar.tsx` and `spinner.tsx`). That artifact is outside this remediation; Calora and API typechecks are clean.

## Regressions

No Calora or API regression was found. Test logs contain expected simulated failure warnings from existing diary-sync and recipe failure-path tests.

## Remaining blockers and deferred validation

No activation is authorized by this report. Before any controlled activation, retain and verify:

- named server-side cohort design and rollback rehearsal;
- client/server gate-disagreement coverage under a separately approved gate change;
- real authenticated account-deletion saga verification through the external Auth provider;
- physical Android/iOS, responsive, large-text, TalkBack, VoiceOver, offline, force-close, and real-device performance validation;
- product approval for any controlled opt-in cohort;
- any future exactly-once egress/audit requirement as a separate persistence design.

## Gate and cohort confirmation

- `intelligence.coach.fact_context`: **OFF**
- `COACH_FACT_CONTEXT_ENABLED`: **OFF by default and not changed**
- server rollout cohort: **deny-all**
- Progress longitudinal Intelligence flags: **unchanged and OFF**
- Fact Context allowlist: **unchanged**
- legacy Coach: **unchanged**

REMEDIATION VERDICT: READY FOR PHASE 2B RE-REVIEW