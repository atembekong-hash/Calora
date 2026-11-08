# Mission 428 — Coach Staged-RLS Real-Handler Rehearsal

## Scope

This continuation added the missing disposable staged-RLS coverage for Coach Fact Context consent and nonce tables, then exercised authenticated HTTP handlers using three synthetic users and a restricted non-superuser, non-BYPASSRLS PostgreSQL runtime role.

## Source correction

`artifacts/security/mission-417/migrations/0022_mission_417_rls_prototype.sql` now includes least-privilege grants and owner predicates for:

- `calora_coach_fact_context_consents`, bound through `user_id = calora_current_user_id()`.
- `calora_coach_fact_context_idempotency`, bound through `external_user_id = calora_current_external_user_id()`.

The change is staged/disposable only. No production database or role was modified.

## Real-handler evidence

The expanded `mission422-real-handler-rls.integration.test.ts` mounts the actual Coach V2 and Fact Context consent routers. The rehearsal verified:

1. User A can accept and read current Fact Context consent.
2. User B cannot see User A's consent and starts in `not_consented` state.
3. User A can create/read an archived completed Coach conversation through the actual HTTP routes.
4. User B receives an indistinguishable `404` when attempting to delete User A's conversation.
5. User A can delete the archived conversation through the actual route.
6. Existing sync, diary, referral, and referral crash-recovery cases continue to pass in the same run.

Result: **5 tests passed**, including the new Coach isolation test, under the disposable non-BYPASSRLS runtime.

## Remaining P1 boundary discovered

A provider-isolated attempt to exercise `POST /v1/coach/v2/chat` returned the intended fail-closed `503` because the shared persistent rate limiter uses `calora_capture_rate_limits` through the restricted runtime pool, while the staged prototype intentionally excludes operational rate-limit tables from application RLS grants. This is a real staged-runtime integration boundary, not a provider failure. The next correction should route rate-limit accounting through a narrowly scoped server-owned mechanism (preferably a security-definer function or dedicated restricted operational role) rather than granting broad access to user-keyed buckets. No unmetered fallback was enabled.
