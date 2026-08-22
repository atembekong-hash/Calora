# Calora Coach Fact Context — Production Evidence Report

**Evidence date:** 2026-08-22  
**Scope:** Production-safe schema and dark-state verification, plus the
authorized non-production rehearsal only if its production prerequisite passes.  
**Hard boundary honored:** No real account was enrolled, no production Fact
Context traffic was enabled, no allowlist was expanded, and Legacy Coach was not
changed.

## Executive result

Production evidence is **blocked**. The live deployment is healthy and the
public Fact Context route rejects requests, but read-only inspection of the
actual production managed-PostgreSQL replica found no Phase 2B migration
history and none of the four required canonical tables. This is a material
schema mismatch, so this task stopped before any production mutation and before
the conditional non-production synthetic rehearsal.

## Production deployment evidence

- Deployment status: active autoscale deployment with a successful build.
- Public application root: HTTP `200`.
- `POST /v1/coach/fact-context/respond` with an empty JSON body: HTTP `404`
  (`Not Found`), consistent with a closed production endpoint gate.
- The client source keeps `intelligence.coach.fact_context` hard-false.
- The server route enables only when `COACH_FACT_CONTEXT_ENABLED` is exactly
  `true`; this is default-deny when absent or any other value.
- Legacy Coach remains present in the reviewed client send path.

The public 404 proves that the dormant endpoint did not accept the probe. It
does not replace database evidence.

## Production migration and schema inspection

The following read-only production queries were executed against the managed
PostgreSQL production replica:

1. Drizzle migration journal query: no rows returned.
2. Information-schema table query for:
   - `calora_coach_fact_context_consents`
   - `calora_server_config`
   - `calora_cohort_memberships`
   - `calora_coach_fact_context_idempotency`

   No rows returned.
3. Constraint query for the same tables: no rows returned.
4. Index query for the same tables: no rows returned.
5. Column query for the same tables: no rows returned.

Consequently, production cannot currently prove:

- immutable application of `0001_task_473_coach_fact_context.sql`;
- the consent ledger primary key, state check, or `ON DELETE CASCADE` foreign
  key to Calora accounts;
- server configuration primary key;
- reviewed/expiring named cohort structure and its unique member index;
- per-account nonce uniqueness or metadata-only idempotency structure;
- compatibility between the deployed schema and the current server's canonical
  Phase 2B database access.

This is a material mismatch from the committed migration, not an absence that
may be inferred safe from development. No ad-hoc DDL, `drizzle-kit push`, or
database write was attempted. Production schema changes must be applied through
the approved publish-time managed-database migration flow, then re-inspected
read-only.

## Production deny-all and privacy evidence

Because the four canonical operational tables are absent, production cannot
provide a database-backed count for enabled global configuration, active cohort
membership, or eligible accounts. The endpoint's observed HTTP `404`, the
hard-false client gate, and default-deny server environment predicate prevent
the test request from reaching Fact Context handling, but they do not establish
the required operational-table evidence.

No production consent, rollout, or replay record was read because those
canonical tables do not exist on the inspected target. No user-level data was
requested or disclosed. The committed schema and route design retain only
structural consent/cohort/nonce metadata and fail closed when required database
lookups fail; this is development implementation evidence, not production
schema proof.

## Non-production synthetic rehearsal

**Not performed.** The authorization requires this rehearsal only after
production dark-state verification succeeds. The missing production migration
and canonical tables failed that prerequisite. Skipping the rehearsal avoids
creating temporary gates or synthetic records while the target schema is not
verified.

The prior development-only rehearsal remains historical evidence only; it does
not satisfy this task's requested final rehearsal against the current deployed
artifacts.

## Cleanup verification

No new synthetic identity, consent, cohort membership, server configuration,
nonce record, test authorization, or server gate was created during this task.
Accordingly, no cleanup mutation was needed and no production state was changed.

## Regression results

The reviewed implementation remains healthy in development:

- `pnpm --filter @workspace/db run migrate` — passed
- `pnpm run typecheck:libs` — passed
- `pnpm --filter @workspace/api-server run typecheck` — passed
- `pnpm --filter @workspace/calora run typecheck` — passed
- `pnpm --filter @workspace/api-server test` — 24 files, 300 tests passed
- `pnpm --filter @workspace/calora test` — 60 files, 1005 tests passed

Expected simulated failure logs appeared only in existing test cases; no suite
failed.

## Remaining blocker and minimum next action

**Blocker:** The actual production managed PostgreSQL target has not applied
the committed Phase 2B migration.

**Minimum next action:** Use the established Replit publish-time
managed-database schema migration procedure to apply the committed forward
migration to production. Do not use an ad-hoc production script or `db push`.
After publication completes, rerun the read-only production schema and
deny-all queries from this report. Only if those checks pass may a separately
authorized non-production synthetic rehearsal proceed.

## Deferred validation

The following remain explicitly deferred and are neither run nor claimed as
passed: physical iOS/Android validation, responsive layout, large text,
TalkBack, VoiceOver, and accessibility QA. They do not alter this report's
schema-evidence blocker.

PRODUCTION EVIDENCE VERDICT: BLOCKED