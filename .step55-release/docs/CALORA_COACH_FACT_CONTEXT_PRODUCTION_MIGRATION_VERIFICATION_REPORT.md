# Calora Coach Fact Context — Production Migration Verification Report

**Verification date:** 2026-08-22  
**Scope:** Managed PostgreSQL publish-time schema deployment and read-only
production verification only.  
**Authorized commit at publication:** `a85b0b36e0c6b246b48388431ac3e7e76f824405`
(`Document blocked Coach Fact Context production evidence`).

## Hard-boundary result

No Coach Fact Context gate, cohort, real account, allowlist, or Legacy Coach
behavior was changed. No synthetic rehearsal was run. No production SQL write,
ad-hoc DDL, `drizzle-kit push`, Supabase migration, or alternate migration
authority was used.

## Procedure used

The schema was applied through Replit's managed **Publish** flow after the
production preflight:

- `main` and `origin/main` both referenced
  `a85b0b36e0c6b246b48388431ac3e7e76f824405`.
- The committed forward migration
  `lib/db/migrations/0001_task_473_coach_fact_context.sql` was present.
- The source migration runner remains the canonical Drizzle runner and records
  migrations in `__drizzle_migrations`.
- The Supabase consent migration remains inert and was not used.
- Client source retains
  `intelligence.coach.fact_context: false`; server source remains default-deny
  unless `COACH_FACT_CONTEXT_ENABLED` is exactly `true`.

No data-overwrite path was selected or requested during publication.

## Publish and application health

- Production deployment: active autoscale deployment with a successful build.
- Public application remained reachable after publish.
- `POST /v1/coach/fact-context/respond` with `{}` returned HTTP `404`
  (`Not Found`), confirming that the dark endpoint remains inaccessible.

## Production schema evidence

Read-only inspection of the actual managed PostgreSQL production replica found
all four expected tables:

1. `calora_coach_fact_context_consents`
2. `calora_server_config`
3. `calora_cohort_memberships`
4. `calora_coach_fact_context_idempotency`

Their columns match the committed Phase 2B schema, including consent decision
metadata, server-owned JSON configuration, reviewed/expiring cohort metadata,
and nonce claim expiry metadata.

The following safeguards were present:

- consent primary key `(user_id, purpose)`;
- consent account foreign key to `calora_users(id)` with `ON DELETE CASCADE`;
- consent-state check allowing only `consented_current` or `revoked`;
- server configuration primary key on `key`;
- cohort primary key and unique `(cohort_name, external_user_id)` index;
- idempotency primary key and unique
  `(external_user_id, request_nonce)` index;
- expected supporting unique indexes for the consent, cohort, and nonce
  structures.

This confirms compatibility with the current API's Phase 2B table and
rollout-query shape.

## Migration-history evidence

The production replica returned no `__drizzle_migrations` table or other
Drizzle-named migration journal. The project migration runner explicitly
requires this table to record immutable migration application.

The published schema is structurally compatible with
`0001_task_473_coach_fact_context.sql`, but the requested independent proof
that this exact committed migration is recorded as applied is unavailable from
the production target. Replit Publish's schema-diff application produced the
required tables but did not expose a Drizzle journal record in the read-only
replica.

## Metadata-only privacy proof

All four Phase 2B tables contained zero rows:

| Table | Production row count |
| --- | ---: |
| `calora_coach_fact_context_consents` | 0 |
| `calora_server_config` | 0 |
| `calora_cohort_memberships` | 0 |
| `calora_coach_fact_context_idempotency` | 0 |

Therefore no Fact Context values, Foundation facts, Coach messages, prompts,
nutrition content, provider responses, consent decisions, cohort entries, or
nonce records were stored by this deployment.

## Production dark-state proof

Read-only production checks confirmed:

- global `coach_fact_context_rollout_enabled` is absent/not `true`;
- active reviewed, unexpired membership in `coach_fact_context_v1` is `0`;
- consent rows are `0`;
- nonce/idempotency rows are `0`;
- the public Fact Context response endpoint is closed with HTTP `404`.

The client hard-false feature flag, unchanged four-key server allowlist,
default-deny server predicate, longitudinal Intelligence flags remaining off,
and available Legacy Coach path were preserved in the reviewed deployed source.

## Errors and warnings

- **Warning / evidence gap:** Production has no discoverable
  `__drizzle_migrations` journal. This prevents independent confirmation that
  the immutable Phase 2B migration was recorded as applied, despite the exact
  expected schema being present.
- No publish failure, runtime error, production data write, or dark-state
  violation was observed.

## Remaining blocker

Resolve or formally govern the missing production migration-journal evidence.
Do not create a manual journal row or run an ad-hoc migration. The accepted
evidence path must retain a trustworthy, inspectable record that the committed
Phase 2B migration was applied through the supported deployment process.

## Exact final gate and cohort state

- Client `intelligence.coach.fact_context`: **OFF**
- Server `COACH_FACT_CONTEXT_ENABLED`: **default deny / endpoint observed
  closed**
- Global rollout configuration: **absent or false**
- Active `coach_fact_context_v1` membership: **0**
- Eligible real accounts: **0**
- Allowlist: **unchanged**
- Longitudinal Intelligence: **OFF**
- Legacy Coach: **available**

PRODUCTION MIGRATION VERDICT: BLOCKED