# Mission 401 — Recovery Evidence Preservation and Safe Retirement Readiness

**Date:** 2026-11-07  
**Verdict:** **RETIREMENT_BLOCKED**  
**Commercial disaster-recovery status:** **NOT CERTIFIED — CAL-17 remains BLOCKED**

## Executive verdict

The temporary Supabase recovery project is positively identified and its evidence has been preserved in the numbered certification reports. Read-only checks confirm that it is distinct from production, healthy, populated, and not referenced by repository source or deployed Edge Functions.

The project is **not safe to retire yet**. Object-storage recovery, authentication/application configuration recovery, external-provider reconciliation, and complete verification that no protected Railway secret references the recovery project remain incomplete. Deleting the project now could destroy evidence needed to close CAL-17.

No project was deleted, paused, reset, restored, migrated, modified, or connected to production. No secret values, credentials, authentication tokens, or customer records were printed or committed.

## Evidence preservation

Mission 400’s sanitized report remains present and complete:

- `25_MISSION_400_DATABASE_RECOVERY_VERIFICATION.md`
- `23_MISSION_398_RECOVERY_CERTIFICATION_VERDICT.md`
- `22_MISSION_398_EXTERNAL_RECOVERY_SOURCES.md`
- Authoritative register `02_AUTHORITATIVE_CERTIFICATION_REGISTER.md`

The preserved evidence covers:

1. Recovery identity and creation timestamp.
2. Owner-observed source backup timestamp and “Restoration complete” confirmation.
3. Recovery PostgreSQL version and health.
4. 37-table schema inventory.
5. Bounded aggregate counts without record values.
6. RLS, grant, constraint, and deletion-trigger findings.
7. Migration-boundary correspondence.
8. Sanitized PostgreSQL startup-error classification.
9. Object-storage, authentication, external-provider, and complete-service recovery gaps.
10. Temporary-project retirement conditions.

## Project identity and isolation checks

Recovery identity:

- Name: `calora-recovery-test-20261107`
- Immutable project ID: `rqiwgktdqiqqwipznyyf`
- Region: `us-west-2`
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: 17.11.0.018
- Created: `2026-11-07T21:41:16.950326Z`

Production identity:

- Name: `caloraapp`
- Immutable project ID: `pzdulhkpwbrbrgskwwwe`
- Region: `us-west-2`
- Status: `ACTIVE_HEALTHY`

The IDs are distinct and were positively re-verified through Supabase project inventory. The recovery project has no Edge Functions. Repository, CI, deployment, and integration searches found no recovery-project ID, name, or database host outside the numbered evidence reports themselves.

Railway production service configuration was inspected without revealing secret values:

- API sources `main`; variable names include production database, Supabase, migration, and recipe-object-storage settings.
- App sources `main`; variable names include production API and Supabase settings.
- FatSecret gateway sources `release/calora-production`.

The Railway tool exposes variable names but not secret values. Therefore the absence of the recovery project ID in source and visible configuration is positive evidence, but it does **not** prove that the hidden values of `EXPO_PUBLIC_SUPABASE_URL`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or object-storage settings do not reference the recovery project. Provider-level secret equality remains owner-blocked.

## Security findings requiring follow-up

These findings were observed on the **recovery project only** and must not be treated as independently verified production findings:

- 4 functions with mutable search paths.
- Leaked-password protection disabled.
- Insufficient MFA options.
- 15 unindexed foreign keys.
- 2 duplicate indexes.
- 17 unused indexes.
- 37 RLS-enabled tables without explicit policies. This is consistent with the source-documented design that revokes `anon`, `authenticated`, and `public` table grants; the recovery metadata returned no such table grants.

No security policy, index, function, authentication setting, permission, or database object was changed.

## Retirement readiness checklist

| Requirement | Result | Evidence / blocker |
|---|---|---|
| Recovery identity preserved | PASS | Immutable project ID and name re-verified. |
| Production identity distinguished | PASS | Production project ID is different and re-verified. |
| Mission 400 evidence preserved | PASS | Numbered report and supporting reports exist in the repository. |
| No repository or Edge Function dependency | PASS | Searches found no recovery references; Edge Functions list is empty. |
| No Railway source/config mutation | PASS | All three services remain unchanged; no staged changes. |
| Hidden Railway secret non-reference | BLOCKED | Variable values are not exposed by authorized inspection. Owner/provider dashboard equality check required. |
| Private object-storage recovery | BLOCKED | No object inventory/checksum or restore evidence. |
| Authentication/application recovery | BLOCKED | Auth settings, redirects, providers, MFA, and secrets not verified. |
| RevenueCat/external-provider reconciliation | BLOCKED | Provider state is outside the database and was not reconciled. |
| CAL-17 closure | BLOCKED | Complete-service recovery remains uncertified. |
| Billing amount | BLOCKED | Organization is currently Pro and the recovery compute is reported as Nano, but no dollar amount or project-level usage was exposed through authorized metadata. |
| Safe deletion now | NO | Deletion could destroy unresolved recovery evidence and the temporary project’s remaining investigation surface. |

## Cost exposure assessment

Supabase organization metadata currently reports the `pro` plan. Owner-provided recovery evidence identifies the temporary project as using Nano compute. The available read-only metadata does not provide a dollar amount, current usage, or project-specific billing line item. It is therefore unsafe to invent a cost estimate.

The owner should inspect the Supabase billing dashboard for the temporary project and record the current compute/storage usage before retirement. Until then, continuing charges are possible and unquantified.

## Safe deletion procedure — prepared, not executed

Deletion requires a separate explicit owner decision. The following procedure is prepared for later use:

1. Confirm the immutable target ID is exactly `rqiwgktdqiqqwipznyyf` and the displayed name is `calora-recovery-test-20261107`.
2. Confirm production remains exactly `pzdulhkpwbrbrgskwwwe` / `caloraapp`; never delete by name alone.
3. Preserve the final sanitized reports, provider metadata, aggregate checks, log classifications, and any object-storage/auth/provider evidence outside the temporary project.
4. Confirm no Railway secret, CI environment, application configuration, Edge Function, storage workflow, or external provider references the recovery ID or URL. This requires owner/provider inspection of hidden secret values.
5. Confirm object-storage, authentication, and external-provider investigations are complete or explicitly waived.
6. Review irreversible consequences: project deletion removes the recovery database and project services, destroys remaining recovery evidence, and cannot restore missing object-storage/provider state.
7. Review the current Pro/Nano billing page and record the expected billing stop/settlement behavior; no dollar estimate is asserted here.
8. Obtain explicit owner approval naming the immutable project ID for deletion. No approval is implied by this report.
9. Execute deletion only through the supported Supabase control plane, never through an inferred or ambiguous project name.
10. After deletion, verify production project `pzdulhkpwbrbrgskwwwe` remains `ACTIVE_HEALTHY`, Railway services remain healthy, and no production deployment or configuration changed.

## Exact owner actions required

Before retirement:

1. Perform owner-controlled equality checks on hidden Railway/Supabase configuration values to prove production does not reference `rqiwgktdqiqqwipznyyf`.
2. Preserve or complete private object-storage inventory and restore evidence.
3. Complete authentication/application and RevenueCat/provider-state recovery checks, or document an explicit risk acceptance.
4. Capture the current Supabase billing amount/usage for the Nano recovery project.
5. Explicitly approve or decline deletion by immutable project ID.

## Final recommendation

**RETIREMENT_BLOCKED.** Keep the recovery project online and unchanged until the remaining evidence is preserved and the owner completes the checks above. Do not mark CAL-17 PASS and do not delete the temporary project based solely on successful database restoration.
