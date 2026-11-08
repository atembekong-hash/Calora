# Mission 417 — Recovery Bundle and Least-Privilege Security Execution

**Date:** 2026-11-08
**Scope:** Repository-only implementation and isolated validation
**Production mutation:** None
**Railway mutation:** None
**Native builds/submissions:** None
**Database mutation:** None outside a disposable local PostgreSQL database

## Executive verdict

**CONDITIONAL / NOT READY FOR PRODUCTION ROLLOUT.** The repository now contains a manual-only encrypted recovery-bundle workflow, fail-closed validation/restore tooling, and a staged least-privilege/RLS prototype with hardened security-function search paths. These artifacts were validated statically and in an isolated disposable PostgreSQL rehearsal. They are not production proof: the recovery workflow is not yet connected to approved production backup custody, and the RLS prototype is deliberately outside the auto-applied migration directory because the API has not been migrated to transaction-scoped identity context.

## Implemented artifacts

| Artifact | Purpose | Production status |
|---|---|---|
| `.github/workflows/calora-database-recovery.yml` | Manual-only encrypted backup bundle workflow, read-only checkout permission, 30-day encrypted artifact retention, explicit failed-run evidence | Not enabled for production custody |
| `scripts/recovery/create-encrypted-backup.mjs` | Custom-format `pg_dump`, sanitized manifest, AES-256-GCM envelope, 32-byte managed-key requirement, secret-like metadata rejection | Safe tooling; requires owner-approved secret bindings |
| `scripts/recovery/restore-encrypted-backup.mjs` | Authenticated decryption, archive path validation, manifest checksum verification, validate-only mode, non-production restore gates | Fail-closed; production restore intentionally unsupported |
| `docs/operations/CALORA_ENCRYPTED_RECOVERY_BUNDLE_RUNBOOK.md` | Custody, restore, external-state, and owner-approval runbook | Documentation only |
| `artifacts/security/mission-417/migrations/0021_function_search_path_hardening.sql` | Preserves existing trigger behavior while pinning trusted search paths | Staged artifact, not auto-applied |
| `artifacts/security/mission-417/migrations/0022_mission_417_rls_prototype.sql` | Isolated runtime role, signed identity context, user-owned-table policy prototype | Staged artifact, not auto-applied |
| `artifacts/security/mission-417/identity-context.ts` | Bounded signed assertion creation/verification and transaction-scoped context helper | Not wired into live API database access |
| `scripts/ci/mission-417-security-contract.test.mjs` | Static search-path, privilege, assertion, and non-destructive SQL contracts | Passing |
| `scripts/ci/recovery-bundle-contract.test.mjs` | Manual-only workflow, encrypted envelope, fail-closed restore, archive traversal, and placement contracts | Passing |
| `scripts/ci/mission-417-recovery-security-rehearsal.mjs` | Disposable database role boundary and encrypted round-trip rehearsal | Passing in local disposable database |

## Validation evidence

The following checks passed in `/tmp/calora-m417-main`:

```text
node --test scripts/ci/recovery-bundle-contract.test.mjs scripts/ci/mission-417-security-contract.test.mjs
8 tests passed, 0 failed

node --check scripts/recovery/create-encrypted-backup.mjs
node --check scripts/recovery/restore-encrypted-backup.mjs
node --check scripts/ci/mission-417-recovery-security-rehearsal.mjs
passed

git diff --check
passed
```

A synthetic encrypted-backup round trip passed: a fake `pg_dump` produced a disposable archive, the creator emitted an authenticated `calora.encrypted-backup.v1` envelope, and `--validate-only` successfully decrypted, extracted, checksum-verified, and validated the manifest without connecting to a database.

A disposable PostgreSQL rehearsal passed after the repository empty-target bootstrap:

```json
{"role_no_bypass_rls":"PASS","anonymous_denied":"PASS","encrypted_round_trip":"PASS","tests":3}
```

The disposable database was destroyed after the run. No production Supabase or Railway database was queried or changed.

The staged SQL was also applied to fresh disposable databases with `ON_ERROR_STOP=1`. The RLS prototype created the non-bypass-RLS runtime role and 12 owner-policy instances, including the special conversation-ownership predicate for Coach turns. The function-hardening artifact applied cleanly and preserved the verified signatures for all four functions while setting `search_path=pg_catalog, public, extensions`. Both disposable databases were destroyed after verification.

## Safety decisions

The staged SQL was moved out of `lib/db/migrations/` into `artifacts/security/mission-417/migrations/`. This prevents an accidental merge from causing the normal migration runner to apply the RLS prototype or function replacements. The hardening artifact preserves the original function signatures and substantive trigger behavior; it adds `SECURITY DEFINER` and `SET search_path = pg_catalog, public, extensions` with explicit `public`/`extensions` references.

The restore command refuses to mutate any target unless both `CALORA_RECOVERY_NONPRODUCTION=true` and `CALORA_RECOVERY_TARGET_ACK=DISPOSABLE_EMPTY_NONPRODUCTION` are present. It does not use `--clean`, `DROP DATABASE`, or `TRUNCATE`. It validates tar members before extraction and uses `--exit-on-error --no-owner --no-privileges` for a disposable target.

## Remaining production blockers

1. **Backup custody is not closed.** The owner must approve the external artifact store, retention, encryption-key escrow/rotation, runner trust boundary, schedule, and alert destination.
2. **External state is not in the database archive.** Recipe-photo objects, Auth configuration, RevenueCat lifecycle/catalog state, Railway configuration, and provider credentials require separate sanitized manifests and provider-side restore/reconciliation evidence.
3. **RLS is not integrated with the API.** Existing API code uses pooled Drizzle/database access that has not been changed to set a verified transaction-scoped identity assertion. Do not apply the prototype to production until that integration, connection-pool isolation, background-worker identity, and rollback plan are reviewed.
4. **Production least-privilege rollout is not authorized.** No live role, grant, policy, function, or migration was changed in this mission.
5. **Recovery proof remains incomplete.** The local rehearsal proves tooling behavior only. A provider-side restore rehearsal from an approved encrypted artifact is still required before CAL-17 can become launch-ready.

## Owner-gated next sequence

1. Approve backup custody and alerting design.
2. Bind the workflow only to approved non-production/replica credentials and the external key manager.
3. Produce sanitized storage/provider manifests without secrets or customer rows.
4. Run one approved restore rehearsal into a newly created disposable database, then execute migration-journal, constraints, RLS, deletion-fence, tenant-isolation, and application-compatibility checks.
5. Separately implement and review API transaction identity integration.
6. Apply function hardening first in a controlled environment; measure errors and rollback readiness.
7. Apply the least-privilege/RLS policy set only after explicit owner approval and a production change window.
8. Re-run commercial, tenant-isolation, privacy-rights, recovery, and release-candidate certification. Any candidate SHA change invalidates affected prior evidence.

## Files intentionally not changed

No Railway source branch, environment variable, credential, domain, Supabase project, production database, release branch, native build configuration, store submission, or customer data was modified.
