# Mission 400 — Database Recovery Verification

**Date:** 2026-11-07  
**Verdict:** **PARTIALLY VERIFIED**  
**Commercial disaster-recovery certification:** **NOT CERTIFIED / CAL-17 remains BLOCKED**

## Executive verdict

The temporary Supabase recovery project is positively identified, healthy, structurally populated, and isolated by a distinct project ID. Read-only verification supports a successful provider-managed database restoration and a structurally coherent Calora schema.

The verification does **not** establish complete service recovery. Private object-storage recovery, authentication configuration recovery, RevenueCat/provider-state recovery, production Railway wiring, and an independent off-site backup/restore capability remain incomplete. CAL-17 therefore remains BLOCKED rather than PASS.

No production project was queried. No migration, write, restore, deletion, deployment, restart, rollback, credential change, native build, or external transaction was performed.

## Recovery-project identity

Supabase project inventory positively matched the owner-provided recovery name and immutable ID:

- Name: `calora-recovery-test-20261107`
- Project ID/ref: `rqiwgktdqiqqwipznyyf`
- Region: `us-west-2`
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: 17.11.0.018 / PostgreSQL 17
- Created: `2026-11-07T21:41:16.950326Z`
- Production project, separately identified and not selected: `caloraapp` / `pzdulhkpwbrbrgskwwwe`
- Organization: `Etiendem Technologies`, current plan `pro`

The owner supplied screenshot evidence stating that the selected source backup was **2026-11-07 08:01:20 UTC** and that Supabase displayed “Restoration complete.” Those screenshots are treated as observed evidence, not as independent proof of data completeness.

## Verification checklist

| Control | Result | Evidence and interpretation |
|---|---|---|
| Recovery project identity | PASS | Provider inventory and `get_project` matched the immutable recovery project ID and name. |
| Recovery project health | PASS | Supabase reports `ACTIVE_HEALTHY`. |
| PostgreSQL availability/version | PASS | Provider metadata reports PostgreSQL 17.11.0.018. |
| Public Calora table surface | PASS | 37 public `calora_*` tables were returned, including the source-controlled application areas. |
| Row-level security enabled | PASS, with qualification | All 37 public tables report RLS enabled. Supabase’s advisor also reports 37 “RLS enabled, no policy” informational findings; source migrations intentionally use RLS plus revoked anon/authenticated/public table grants rather than per-user policies. |
| Anonymous/public table grants | PASS by metadata check | No `anon`, `authenticated`, or `public` table grants were returned for public Calora tables. |
| Primary/unique/foreign/check constraints | PASS | 105 integrity constraints were present; zero were unvalidated. |
| Foreign-key aggregate integrity | PASS for tested relationships | Zero orphan profiles, diary entries, or recipes were found in bounded aggregate checks. |
| Account-deletion protections | PASS by structural check | 13 deletion-fence triggers were present, matching the source migration definitions; the canonical deletion-writable function was present. |
| Extensions | PASS | `pgcrypto` 1.3 and `plpgsql` 1.0 were present. |
| Source migration correspondence | PASS with boundary qualification | The recovery journal has eight rows whose timestamps correspond exactly to source migrations 0013–0020; the repository’s reviewed empty-target baseline intentionally records the final migration boundary rather than replaying historical DDL. |
| Representative restored data | PASS | Aggregate counts found 6 users, 4 profiles, 132 diary entries, and 37 recipe-media rows. Recipes and subscriptions reported zero rows in the bounded check. No record values were selected. |
| Recipe/nutrition structures | PASS structurally | `calora_recipe_media` and full `calora_recipe_nutrition` columns are present; no content-level media-object restoration was proven. |
| Full aggregate table-count comparison to backup-time evidence | BLOCKED | No sanitized backup-time table-count manifest was supplied. Current aggregate checks are recovery-time evidence only. |
| Private object-storage recovery | BLOCKED | Database metadata cannot prove that private recipe-photo bytes or object keys were restored. No object-storage inventory or restore manifest was available. |
| Auth configuration recovery | BLOCKED | Auth schema exists, but users/auth configuration, providers, MFA settings, redirect URLs, and auth secrets were not inspected. No authentication transaction was attempted. |
| External provider-state recovery | BLOCKED | RevenueCat and other provider-side state is outside the database. No provider export/reconciliation evidence was available. |
| Recovery project isolation from Railway | BLOCKED | The recovery ID is absent from repository source and no Edge Functions exist, but Railway secret values were not exposed or queried; complete non-reference proof requires owner/provider configuration inspection. |
| Recovery project public exposure | PARTIAL | No Edge Functions are deployed and no public table grants were found. Provider-level project/network and storage-bucket exposure were not fully inspectable through the available read-only tools. |

## Recovery schema and source comparison

The source repository contains 20 ordered Calora migrations and a reviewed 33-table empty-target baseline. Later migrations add the additional current tables. The recovery project reports 37 public Calora tables, all with primary-key metadata and the expected foreign-key relationships.

The recovery project’s Calora migration journal contains eight rows with `created_at` boundaries matching source migrations 0013 through 0020, ending at `0020_privacy_rights_requests`. This is consistent with a database that had the reviewed earlier schema baseline and then received the final eight forward migrations. The migration journal ordering is monotonic and the eight rows are bounded by `LIMIT 20`; no journal values beyond hashes/timestamps were used.

## PostgreSQL error investigation

The owner’s screenshot reported 139 requests, a 54.7% success rate, and 13 PostgreSQL errors. Read-only unified-log analysis covered `2026-11-07T21:35:00Z` through `2026-11-07T21:50:00Z`.

The log window contained 13 `ERROR`/`FATAL` PostgreSQL events:

- 2 `42P01` errors from `postgres_exporter` at 21:42:38–21:43:37 UTC.
- 1 `42P01` error from `realtime_migrations` at 21:44:01 UTC.
- 8 `57P01` administrative-shutdown events between 21:44:03 and 21:44:50 UTC, attributed to provider-managed PostgREST, exporter, and internal sessions.
- 1 `57014` query-cancelled event during authentication at 21:44:03 UTC.
- 1 `57P03` cannot-connect-now event at 21:44:36 UTC.

The errors clustered within approximately two minutes of project creation and restoration activity. No application service, Calora Railway service, customer request, SQL parameter, credential, or raw error message was retrieved. The available evidence is most consistent with transient provider startup/restart and readiness activity, including probes arriving before all restored objects/services were ready. The 42P01 events mean some provider probes referenced an unavailable relation at that moment; the logs do not prove whether this was expected provisioning order or an unresolved missing-object defect.

**Classification:** likely transient startup/recovery events; **not proven harmless**, but no continuing availability failure was evidenced by the final `ACTIVE_HEALTHY` status. No further investigation is authorized without owner-approved provider log access beyond the sanitized aggregate view.

## Security and isolation findings

Positive findings:

- Recovery and production have distinct immutable project IDs.
- No repository source references the recovery project ID or name.
- No Edge Functions are deployed on the recovery project.
- All public Calora tables have RLS enabled.
- No public/anon/authenticated table grants were returned.
- All 105 inspected integrity constraints are validated.
- Account-deletion fence trigger count matches the source migration definition.

Qualification and advisor findings:

- Supabase security advisors report 37 RLS-enabled/no-policy informational findings. This aligns with source migrations that deliberately revoke table access for `anon`, `authenticated`, and `public` rather than creating client-facing RLS policies. It should remain an owner-reviewed security decision before launch.
- Four functions have mutable search paths according to the recovery-project advisor.
- The security advisor reports leaked-password protection disabled and insufficient MFA options.
- Performance advisors report 15 unindexed foreign keys, 2 duplicate indexes, and 17 unused indexes. These are not restoration defects, but they are unresolved operational findings in the recovered project.
- Recovery project Railway/environment secret values were not exposed; therefore non-reference to recovery cannot be certified solely from this sandbox.

## Disaster-recovery assessment against Missions 398–399

| Recovery dimension | Status |
|---|---|
| Provider-managed database restoration completed | PASS based on project identity, healthy status, populated schema/data, and owner screenshot evidence |
| Database structural integrity | PASS for inspected metadata, constraints, RLS/grants, trigger controls, and bounded relationships |
| Database content completeness versus backup | BLOCKED; no backup-time aggregate manifest |
| Authentication/application configuration recovery | BLOCKED |
| Private recipe object-storage recovery | BLOCKED |
| RevenueCat/external-provider recovery | BLOCKED |
| Independent off-site backup capability | BLOCKED / not evidenced in this mission |
| End-to-end production disaster-recovery certification | NOT CERTIFIED |

## Smallest remaining steps to close CAL-17

1. Preserve the recovery-project evidence and create a sanitized backup-time manifest containing table names and aggregate counts, without customer values.
2. Independently inventory and restore-test private recipe object storage; record object counts/checksums without exposing images or keys.
3. Verify authentication settings, provider configuration, redirect configuration, MFA/password-protection posture, and production-to-recovery non-reference through owner-controlled provider dashboards.
4. Reconcile RevenueCat and other external-provider state through their approved export/reconciliation workflows.
5. Repeat a documented restore rehearsal in an isolated environment and measure RTO/RPO.
6. Keep CAL-17 blocked until all mandatory dimensions above are independently evidenced.

No PITR purchase or paid add-on activation is recommended or performed.

## Temporary-project retirement checklist

Do **not** delete or pause the recovery project as part of this mission. Before retirement, the owner should confirm:

- This report and all sanitized provider evidence are preserved outside the temporary project.
- Object-storage and external-provider investigations are complete or explicitly waived.
- No unresolved query or audit requires the project.
- Railway, application, CI, Supabase Auth, Storage, and external integrations do not depend on it.
- The owner positively distinguishes `rqiwgktdqiqqwipznyyf` from production `pzdulhkpwbrbrgskwwwe`.
- The owner explicitly approves deletion or pausing.
- Current Pro/Nano billing is checked in the Supabase billing dashboard. The available metadata does not expose a dollar estimate; ongoing Nano compute/storage usage may incur charge exposure until retirement.

## Evidence references

- Supabase project inventory and project metadata for recovery ID `rqiwgktdqiqqwipznyyf`.
- Supabase recovery `list_tables` verbose metadata; no customer row values selected.
- Recovery aggregate SQL checks for table counts, constraints, RLS, extensions, grants, and orphan relationships; every query was recovery-project-only and bounded with `LIMIT`.
- Recovery `list_migrations` provider metadata.
- Recovery unified logs, 21:35–21:50 UTC, aggregated by source, SQLSTATE, service category, and timestamp; raw messages and parameters were not retrieved.
- Supabase security, health, and performance advisors.
- Repository source: `lib/db/migrations/`, `lib/db/bootstrap/0000_calora_empty_target_baseline.sql`, `lib/db/src/bootstrap-empty-target.ts`, `lib/db/src/migrate.ts`.
- Owner-provided restoration screenshots and backup timestamp, treated as observed evidence.

## Final verdict

**PARTIALLY VERIFIED:** the database restoration is real, structurally coherent, populated, and shows no tested referential-integrity failures. The PostgreSQL errors are temporally clustered provider startup/recovery events, not proven application failures.

**Overall commercial disaster-recovery status: NOT CERTIFIED.** Object storage, authentication/application configuration, external provider state, recovery-project non-reference through secret configuration, and independent complete-service recovery remain unverified. CAL-17 must remain **BLOCKED**.
