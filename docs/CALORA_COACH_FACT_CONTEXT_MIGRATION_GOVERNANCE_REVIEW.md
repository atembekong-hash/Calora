# Calora Coach Fact Context — Migration Governance Review

**Review date:** 2026-08-22  
**Scope:** Read-only review of Replit-managed production schema deployment,
audit evidence, production schema, and dark-state controls.  
**No mutation performed:** No migration was re-run, no journal row was added,
no DDL or `drizzle-kit push` was executed, and no production Phase 2B table was
altered.

## 1. Actual Replit Publish database deployment mechanism

For Replit-managed PostgreSQL, the supported production schema mechanism is
**Publish-time schema diffing**:

1. Replit Publish introspects development and production schemas.
2. It computes and presents the schema diff, including rename confirmation when
   needed.
3. On user confirmation, Publish applies the resulting schema changes to the
   managed production database.

This is the platform-supported production path. It is not an agent-run
production migration command, startup DDL, `drizzle-kit push`, direct SQL, or
Supabase SQL.

The project also has a separate development lifecycle:

- `scripts/post-merge.sh` runs automatically after task merges.
- It runs `pnpm --filter @workspace/db run migrate`, then support-object
  provisioning, against the development database.
- `lib/db/src/migrate.ts` uses Drizzle's migrator and records development
  migration execution in `__drizzle_migrations`.

Accordingly, the earlier project runbook language that describes the
Drizzle migration runner as a production Publish mechanism is not compatible
with the supported managed-database Publish model and must not be treated as
evidence of a production Drizzle journal.

## 2. Is `__drizzle_migrations` expected in production?

**No, not as a required artifact of the supported Replit Publish schema-diff
flow.** The production read-only replica exposed no table with a
Drizzle-migration name. That does not demonstrate a failed Publish because
Publish applies the approved schema change through its managed diff mechanism;
it is not required to invoke this repository's Drizzle runner or copy its
history table into production.

The repository's `__drizzle_migrations` expectation applies to its explicit
development migration runner. It is not a supported basis for requiring a
production journal after a managed Publish schema diff.

## 3. Authoritative audit trail and evidence limits

The supported audit trail for a managed production schema update is:

1. the authoritative repository commit and schema source;
2. the user-confirmed Publish record/history for that commit;
3. Publish's managed schema-diff result;
4. a post-publish, read-only production schema comparison;
5. a saved release evidence report.

Available evidence:

- At the time of publication, `main` and `origin/main` both pointed to
  `a85b0b36e0c6b246b48388431ac3e7e76f824405`.
- That commit contains the immutable Phase 2B SQL migration
  `lib/db/migrations/0001_task_473_coach_fact_context.sql`.
- The canonical Drizzle schema source also models all four Phase 2B tables and
  their application-facing constraints.
- Replit deployment metadata reports an active public autoscale deployment with
  a successful build after publication.
- The post-publish production schema matches the expected Phase 2B structure.

Unavailable from the current environment:

- a Replit deployment/build ID;
- an immutable deployed commit SHA;
- Publish-time schema-diff/build log lines;
- a platform schema revision record;
- deployment logs containing schema-application evidence.

The deployment-log query returned no matching records. Replit documentation
identifies Publishing history as the supported place to inspect deployment
history; Enterprise audit logs may provide additional organization-level
records. Neither record was exposed through the available read-only APIs.

## 4. Migration file versus schema-diff deployment

The committed SQL migration file is an immutable **development migration
artifact**. The canonical Drizzle model is the declarative schema source used
to represent the same Phase 2B tables for the application and schema tooling.

Under Replit Publish:

- Publish applies a managed schema diff between development and production.
- It does not need to execute
  `lib/db/migrations/0001_task_473_coach_fact_context.sql` directly.
- It does not promise to maintain the project's
  `__drizzle_migrations` journal in production.

Implications:

- **Reproducibility:** preserve immutable SQL migration files and canonical
  schema source in the reviewed repository commit.
- **Forward-only changes:** make a new reviewed migration/schema change for
  every later alteration; never edit an applied artifact.
- **Rollback:** use a reviewed forward fix or platform rollback/re-publish
  process, not manual production DDL.
- **Drift detection:** compare production schema read-only against the
  repository's canonical schema after every material Publish.
- **Auditability:** save the commit, Publish history/build identity when
  available, schema comparison, and post-publish health result in the release
  report.

## 5. Production schema comparison and fingerprint

Read-only production inspection re-verified all required tables:

1. `calora_coach_fact_context_consents`
2. `calora_server_config`
3. `calora_cohort_memberships`
4. `calora_coach_fact_context_idempotency`

The comparison found no difference from the canonical Phase 2B shape:

- expected columns, PostgreSQL types, nullability, and metadata-only fields;
- consent composite primary key;
- consent foreign key to `calora_users(id)` with `ON DELETE CASCADE`;
- consent-state check for `consented_current` or `revoked`;
- configuration primary key;
- cohort unique `(cohort_name, external_user_id)` index;
- nonce unique `(external_user_id, request_nonce)` index;
- expected primary-key and supporting indexes.

The deterministic production metadata fingerprint, built from ordered columns,
constraints, and indexes across the four tables, is:

```text
algorithm: MD5
schema fingerprint: 13931375fbf1f6b2ec5a3efef31e2c07
canonical metadata lines: 35
```

This is a schema-shape fingerprint, not a claim that the SQL file itself was
executed by Publish.

## 6. Deployment-risk analysis

The current Phase 2B schema is structurally safe and present, but treating a
development Drizzle journal as required production evidence would create an
unsupported and risky pressure to add manual production bookkeeping. That must
not happen.

The remaining governance risk is documentary: this environment cannot obtain a
platform-issued record tying the exact deployed revision to the authorized
commit. Schema equivalence plus branch state is strong technical evidence, but
not an immutable commit-to-deployment linkage.

## 7. Future migration-governance policy

For Calora managed PostgreSQL changes:

1. **Authoritative repository source:** retain the reviewed canonical Drizzle
   schema and immutable, forward-only SQL migration artifact in the same
   protected commit.
2. **Development application:** use the configured post-merge runner only for
   development; preserve its Drizzle journal as development evidence.
3. **Production mechanism:** use Replit Publish's managed schema-diff flow
   only. Review rename/destructive prompts and never select an overwrite-data
   option unless separately authorized.
4. **Required preflight:** record branch/commit, confirm schema source and
   migration artifact, verify development behavior, and confirm no unrelated
   production state will be altered.
5. **Required post-publish verification:** capture Publish history/build
   identity when the platform exposes it; run read-only schema and data-state
   checks; record a deterministic schema fingerprint and health smoke result.
6. **Drift detection:** compare production metadata to the canonical schema
   after each material migration and before controlled feature activation.
7. **Rollback / forward fix:** use a reviewed forward schema correction or
   supported Publish rollback process. Never use manual production DDL,
   ad-hoc scripts, startup repair, direct production `db push`, or manual
   migration-journal inserts.
8. **Evidence retained in reports:** repository commit, Publish
   deployment/build identity when available, schema fingerprint/comparison,
   data-state counts, dark-state check, smoke result, and any platform warning.

## 8. Final production dark-state proof

The re-check confirms:

- Client `intelligence.coach.fact_context`: **OFF**.
- Server Fact Context: **default deny**; public response endpoint remains
  inaccessible with HTTP `404`.
- Global rollout configuration: **absent/not `true`**.
- Active reviewed and unexpired `coach_fact_context_v1` members: **0**.
- Consent rows / real eligible accounts: **0**.
- Idempotency rows: **0**.
- Fact Context allowlist: **unchanged**.
- Longitudinal Intelligence flags: **OFF**.
- Legacy Coach: **available**.

No synthetic rehearsal was run.

## 9. Final determination and smallest supported corrective action

**Determination: C. INSUFFICIENT EVIDENCE.**

The missing `__drizzle_migrations` journal is a **documentary governance
mismatch**, not a real schema-deployment failure under the supported Replit
Publish model. The current production schema is consistent with the reviewed
Phase 2B design. However, the available environment cannot retrieve the
platform-issued Publish history/build record that immutably links the schema
deployment to commit `a85b0b36e0c6b246b48388431ac3e7e76f824405`.

**Smallest supported corrective action:** obtain and preserve the existing
Replit Publish history entry (deployment/build identity, timestamp, and
deployed revision if shown) for this publication, then append that immutable
platform evidence to this report. Do not re-publish, modify the schema, or
create a manual journal record merely to satisfy the evidence gap.

The system is **not yet ready** for separate non-production synthetic rehearsal
authorization because the requested commit-to-deployment audit linkage remains
unproven.

MIGRATION GOVERNANCE VERDICT: INSUFFICIENT EVIDENCE