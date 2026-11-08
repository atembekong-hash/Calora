# Mission 408 — Least-Privilege Runtime Role and RLS Rehearsal

**Assessment date:** 2026-11-07
**Primary control:** CAL-15
**Starting protected-main SHA:** `b94cdbcf248d2d716ae590646b62a11ff905b0e3`
**Mission branch:** `mission/408-least-privilege-rls`
**Production mutation:** none
**Verdict:** **Prototype and isolated security rehearsal PASS; CAL-15 remains BLOCKED for production**

## What was implemented

This mission turns the Mission 407 recommendation into a reviewable, isolated prototype. It does not change the live API role, production database, Railway configuration, secrets, customer data, or migration journal.

The prototype adds `0022_mission_408_rls_prototype.sql`. It provisions a separate `calora_api_runtime_rls` role with `NOBYPASSRLS`, no schema-mutation privileges, and no direct access to secrets or server-owned operational tables. The role is intentionally separate from the current `calora_api_runtime` role, which remains unchanged and continues to have `BYPASSRLS = true` in production.

A transaction-local signed identity context is used instead of trusting a caller-supplied user ID. The API-side prototype in `artifacts/security/mission-408/identity-context.ts` creates a short-lived HMAC assertion from the identity already verified by Supabase. The database-side `SECURITY DEFINER` verifier reads a database-only secret, validates the signature and expiry, and resolves the external identity to the internal `calora_users.id`. The API must set the assertion with `SET LOCAL` inside the same transaction that performs the read or write. Commit and rollback clear the value, preventing pooled-connection identity leakage.

The prototype applies owner policies to the internal-user tables, relationship policies to recipe items and capture candidates, external-identity policies to recipe media and referral records, and read-only policies to shared food and nutrition reference data. Server-owned operational, migration, account-deletion, recovery-warning, cohort, referral-qualification, and admin tables are not exposed to the runtime role; they require separately scoped server functions in the coordinated rollout.

## Table coverage

The 37-table production surface was classified rather than given one generic policy. The owner-policy family covers `calora_users`, `calora_profiles`, `calora_diary_entries`, `calora_weight_entries`, `calora_saved_meals`, `calora_recipes`, `calora_recipe_items`, `calora_ai_capture_sessions`, `calora_ai_capture_candidates`, `calora_subscriptions`, `calora_sync_mutations`, `calora_consent_events`, `calora_privacy_rights_requests`, `calora_coach_fact_context_consents`, `calora_coach_v2_settings`, `calora_coach_v2_conversations`, `calora_coach_v2_turns`, and `calora_coach_reports`.

The external-identity family covers `calora_recipe_media`, `calora_referral_codes`, and `calora_referral_redemptions`. The shared-reference family gives read-only access to `calora_food_items` and `calora_recipe_nutrition`. The following remain server-only and are deliberately excluded from direct runtime-role grants: `calora_migration_journal`, `calora_server_config`, `calora_account_deletion_states`, `calora_capture_rate_limits`, `calora_recovery_warning_suppressions`, `calora_recovery_warning_summaries`, `calora_cohort_memberships`, `calora_referral_qualifications`, `calora_admin_principals`, `calora_admin_sessions`, `calora_admin_audit_events`, `calora_admin_operational_alerts`, and `calora_admin_alert_deliveries`.

This classification is important for compatibility. Rate-limit buckets, deletion workers, admin control-plane operations, recovery summaries, and migration state cannot be safely treated as ordinary user-owned rows. Each requires a narrowly scoped `SECURITY DEFINER` function or a separate service role in the production integration phase.

## Isolated evidence

A disposable PostgreSQL database was created, populated only with synthetic Mission 408 users and diary rows, and destroyed after the rehearsal. The repository bootstrap and the required migration fixtures were applied locally. No production URL, Supabase credential, Railway credential, or customer row was used.

The adversarial harness completed **18/18 scenarios**:

- signed owner read returned only the owner's row;
- the database verifier resolved the expected external identity;
- cross-user user-row reads returned zero rows;
- cross-user diary reads returned zero rows;
- cross-user insert was denied;
- cross-user update affected zero rows;
- cross-user delete affected zero rows;
- absent identity context returned zero rows;
- expired identity context returned zero rows;
- forged identity context returned zero rows;
- a committed transaction did not leak identity into the next transaction;
- shared food reference data was readable;
- shared food reference data was not writable;
- server-owned configuration was not readable by the runtime role;
- anonymous role table access remained denied;
- the prototype runtime role reported `rolbypassrls = false`;
- the prototype runtime role did not own the application table;
- two separate pooled clients concurrently saw only their own user's row.

The static migration contract and the prior search-path hardening contract passed **6/6 tests**. The API TypeScript check passed. The client TypeScript check passed. The SQL rehearsal applied the prototype and completed without production connectivity.

## Security decisions and limitations

The prototype intentionally does not make `calora_api_runtime` less privileged in place. Removing `BYPASSRLS` from the existing role before the API has been migrated would risk a production outage. The new role also has no production password in this branch. Role credentials, assertion-secret provisioning, API pool routing, and service-function grants must be owner-controlled deployment steps.

The prototype is not yet wired into the API request lifecycle. Existing routes still use the current Drizzle pool and application predicates. Therefore this mission demonstrates that a least-privilege database boundary can work against the source-controlled schema; it does not claim that live customer traffic is already protected by the new role.

The SQL migration is intentionally not eligible for production application yet. Railway's API pre-deploy hook automatically runs database migrations, so merging or promoting it before the API adapter, compatibility matrix, role credential, secret rotation, and rollback procedure are approved would create a production database mutation without a coordinated application rollout.

## Production baseline

Railway production `attractive-harmony` was healthy before the rehearsal: three services, zero services with issues, zero recent failures, and no pending staged or applying work. The active Supabase project `caloraapp` (`pzdulhkpwbrbrgskwwwe`) was `ACTIVE_HEALTHY`. No production deployment, restart, migration, role change, secret change, or customer-data operation was performed.

Mission 407's live evidence remains authoritative for the current production weakness: the existing `calora_api_runtime` role has `BYPASSRLS = true`, while direct `anon` and `authenticated` table access is denied. This mission does not change that finding.

## Production rollout plan

The safe rollout is a separate owner-approved change, not an automatic consequence of this PR.

1. Create and password-provision the least-privilege login role through the owner-controlled database operator. Verify `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, and `NOBYPASSRLS` without exposing the credential.
2. Provision the HMAC assertion secret in the database-only secret table and the matching API secret through the approved secret manager. Record only fingerprints, never values.
3. Add a database adapter that acquires a pooled client, begins a transaction, sets the signed assertion with `SET LOCAL`, runs the complete route operation on that client, and commits or rolls back. Do not mix the transaction-scoped client with the existing global Drizzle pool.
4. Add narrowly scoped `SECURITY DEFINER` functions for rate-limit buckets, deletion/recovery workers, admin operations, and migration/operator paths. Keep those paths out of the user runtime role.
5. Run the full route matrix against a disposable clone with two users, expired assertions, forged assertions, missing context, concurrent clients, account-deletion fences, Coach data, recipe media, referral operations, and admin boundaries.
6. Deploy the API adapter and role change in a controlled release window, verify health and application metrics, then migrate route families incrementally. Do not remove the old role's access until all production traffic has moved and rollback evidence is captured.
7. After a stable observation period, remove `BYPASSRLS` from the old role or revoke its application table grants through a separately approved migration. This is a production security mutation and requires its own confirmation.

Rollback is fail-closed: stop routing new API traffic to the new role, restore the prior application release and connection configuration, and preserve the migration journal and role/secret fingerprints. Do not automatically regrant broad privileges or reset policies. Any policy or role rollback must be an explicit owner-approved database operation with a post-rollback two-user isolation check.

## Certification decision

**CAL-15 remains BLOCKED.** The prototype proves the proposed database-enforced boundary on isolated infrastructure, but the live API still uses the RLS-bypassing role and the adapter is not integrated into production. The correct next evidence is an owner-approved coordinated integration and production verification, not a status upgrade based on this rehearsal alone.

The Mission 407 function-search-path hardening remains staged and separately blocked pending approval because it would be applied by Railway's pre-deploy migration hook. No native Android or iOS build was triggered.

## References

[1]: https://github.com/atembekong-hash/Calora/blob/main/lib/db/migrations/0022_mission_408_rls_prototype.sql "Mission 408 least-privilege RLS prototype"
[2]: https://github.com/atembekong-hash/Calora/blob/main/scripts/ci/mission-408-rls-rehearsal.mjs "Mission 408 isolated adversarial rehearsal"
[3]: https://github.com/atembekong-hash/Calora/blob/main/docs/certification/2026-11-07/33_MISSION_407_DATABASE_SECURITY_BOUNDARY_CERTIFICATION.md "Mission 407 production database boundary evidence"
