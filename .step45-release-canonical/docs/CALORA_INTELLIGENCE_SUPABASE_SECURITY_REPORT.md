# Calora Intelligence — Supabase Security Report

## Executive verdict

Direct Supabase management access verified and remediated the configured Calora
Supabase project. A publicly executable `SECURITY DEFINER` event-trigger helper
was removed from the public RPC surface.

**Phase 2 is not approved.** The Supabase project does not contain any Calora
application tables, so database-level tenant isolation for Calora data cannot
be implemented or verified there. The actual Calora domain schema remains in
the separate managed PostgreSQL database.

## Verified project and environment

| Property | Verified value |
| --- | --- |
| Project reference | `pzdulhkpwbrbrgskwwwe` |
| Project name | `caloraapp` |
| Project status | `ACTIVE_HEALTHY` |
| Region | `us-west-2` |
| Configured app URL match | Yes; the mobile and API auth configuration use this project reference |
| Supabase branches | None; this is the primary project |
| Environment label | **UNKNOWN** — Supabase exposes no development/staging/production label for this project |
| Auth user count | 10 at inspection time |

The project identity is unambiguous: it is the active `caloraapp` project
configured by Calora for Supabase Auth. Its environment tier cannot be inferred
from a project name, URL, or branch absence, so this report does not label it
production.

## Original and final database security state

| Property | Original | Final |
| --- | --- | --- |
| Public application tables | None | None |
| `calora_*` tables in Supabase | None | None |
| Public-table RLS state | No public tables to inspect | No public tables to inspect |
| FORCE RLS | No public tables to inspect | No public tables to inspect |
| Public-schema policies | None | None |
| Public-schema table grants | None | None |
| Applied Supabase migrations | None | One security migration |
| `public.rls_auto_enable()` | `SECURITY DEFINER`, executable by `PUBLIC` | `SECURITY DEFINER`, executable only by `postgres` |
| Security advisor | Two public-function warnings plus leaked-password warning | Leaked-password warning only |

The project includes Supabase-managed schemas such as `auth`, `storage`, and
`realtime`, but contains no Calora domain schema in `public` or another
application schema. Direct REST checks and managed PostgreSQL metadata both
confirmed this.

## Table-by-table ownership classification

The following are Calora's **repository-defined intended classifications** from
the canonical Drizzle schema. They are not live Supabase tables.

| Table | Classification | Intended ownership / exposure |
| --- | --- | --- |
| `calora_users` | USER-OWNED | Maps Supabase Auth `external_id` to internal UUID |
| `calora_profiles` | USER-OWNED | Direct internal `user_id` owner |
| `calora_diary_entries` | USER-OWNED | Direct internal `user_id` owner |
| `calora_weight_entries` | USER-OWNED | Direct internal `user_id` owner |
| `calora_saved_meals` | USER-OWNED | Direct internal `user_id` owner |
| `calora_recipes` | USER-OWNED | Direct internal `user_id` owner |
| `calora_recipe_items` | USER-OWNED CHILD | `recipe_items → recipes → owning user` |
| `calora_ai_capture_sessions` | USER-OWNED | Direct internal `user_id` owner |
| `calora_ai_capture_candidates` | USER-OWNED CHILD | `capture_candidates → capture_sessions → owning user` |
| `calora_subscriptions` | SERVICE-ONLY | Server-managed entitlement state |
| `calora_sync_mutations` | USER-OWNED | Direct internal `user_id` owner |
| `calora_consent_events` | USER-OWNED | Direct internal `user_id` owner |
| `calora_referral_codes` | USER-OWNED / SERVICE-ONLY | Supabase Auth external identity; server-mediated |
| `calora_referral_qualifications` | SERVICE-ONLY | Server-verified qualification records |
| `calora_referral_redemptions` | SERVICE-ONLY | Two-party server-mediated referral records |
| `calora_food_items` | SHARED READ-ONLY | No direct user owner; exposure must be deliberate |
| `calora_recipe_nutrition` | SHARED READ-ONLY | No direct user owner; exposure must be deliberate |
| `calora_capture_rate_limits` | SYSTEM/OPERATIONAL | Never mobile-client accessible |
| `calora_account_deletion_states` | SYSTEM/OPERATIONAL | Never mobile-client accessible |

## Policies, grants, and security-definer functions

### Calora tenant policies

No Calora RLS policy was created, changed, or tested because no Calora table
exists in this Supabase project. It would be unsafe and misleading to create
generic policies without the live data schema and its internal-user-ID bridge.

### Grants reviewed

- Public-schema table grants: none, because public contains no tables.
- Original routine grant: `PUBLIC` could execute
  `public.rls_auto_enable()`.
- Final routine grant: only `postgres` retains `EXECUTE`.
- `anon`, `authenticated`, and `service_role` each return `false` for
  `has_function_privilege(..., 'public.rls_auto_enable()', 'EXECUTE')`.

### Security-definer remediation

`public.rls_auto_enable()` is an internal event-trigger function that enables
RLS after public-table creation. It has an `ensure_rls` event-trigger
dependency and no repository callers or recent invocation evidence. It is not
an application RPC and ordinary Supabase roles do not need to execute it.

Applied, source-controlled policy logic:

```sql
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
```

The applied managed migration is named `revoke_public_rls_auto_enable`.

## Service-role findings

- `SUPABASE_SERVICE_ROLE_KEY` is consumed only in server-side
  `artifacts/api-server/src/lib/supabase-admin.ts`.
- Mobile/Expo code uses the public URL and anon key; it does not import or use
  the service-role key.
- The account-deletion endpoint validates the bearer identity and does not
  trust a caller-supplied user ID.
- Service role is used for privileged Supabase Auth user deletion, not as a
  client-side RLS bypass.
- This project has no domain tables for the service role to access.

No secret value, password, token, or key was displayed or saved.

## Child-resource ownership protections

No live Supabase child tables exist to protect. The required production data
model remains:

- `recipe_items → recipes → owning user`
- `capture_candidates → capture_sessions → owning user`

Any future move of this schema to Supabase must implement these as transitive
ownership predicates based on the verified Supabase Auth identity, not
client-supplied ownership fields.

## Cross-user and same-user validation matrix

| Resource | USER_A → USER_B negative test | Same-user test | Reason |
| --- | --- | --- | --- |
| Profile | BLOCKED | BLOCKED | No Calora table in Supabase |
| Diary | BLOCKED | BLOCKED | No Calora table in Supabase |
| Weights | BLOCKED | BLOCKED | No Calora table in Supabase |
| Saved meals | BLOCKED | BLOCKED | No Calora table in Supabase |
| Recipes | BLOCKED | BLOCKED | No Calora table in Supabase |
| Recipe items | BLOCKED | BLOCKED | No Calora table in Supabase |
| Capture sessions | BLOCKED | BLOCKED | No Calora table in Supabase |
| Capture candidates | BLOCKED | BLOCKED | No Calora table in Supabase |
| Consent | BLOCKED | BLOCKED | No Calora table in Supabase |
| Sync mutations | BLOCKED | BLOCKED | No Calora table in Supabase |

No test identity or data was created because there is no safe target table for
the requested operations. No cross-user isolation claim is made.

## Account-deletion validation

The Supabase security change does not alter Calora account deletion. Existing
API validation includes the real managed-PostgreSQL account-deletion fence
regression test, which passed as part of the API suite. The Supabase project
contains Auth users but no corresponding Calora domain/deletion-state tables,
so it cannot validate the application-data deletion fence.

## Repository and live database changes

| Category | Changes |
| --- | --- |
| Repository | Added `supabase/migrations/20260820150000_revoke_public_rls_auto_enable.sql`; updated this report |
| Supabase database | Applied migration `revoke_public_rls_auto_enable` |
| Data changes | None |
| Auth user changes | None |
| Calora table changes | None |
| API startup DDL | None added |
| Intelligence behavior | None enabled |

The migration records the exact live Supabase security change. It is a
Supabase-specific security migration; `lib/db/src/schema/index.ts` remains the
canonical schema authority for Calora’s application data in managed PostgreSQL.

## Validation commands and results

| Validation | Result |
| --- | --- |
| Supabase managed project identity lookup | PASS — `caloraapp`, matching configured reference |
| Supabase schema/table metadata inventory | PASS — no Calora public tables |
| Supabase policy / public grant inventory | PASS — no public table policies or grants |
| Security-definer definition, dependency, and caller search | PASS — event-trigger helper, no repository caller, no recent invocation evidence |
| `has_function_privilege` for `anon`, `authenticated`, `service_role` | PASS — all false after remediation |
| Supabase security advisor | PASS for function exposure — two SECURITY DEFINER execution warnings resolved |
| `pnpm --filter @workspace/calora run typecheck` | PASS |
| `pnpm --filter @workspace/api-server run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 225 tests in 19 files |
| `pnpm --filter @workspace/calora test` | PASS — 884 tests in 50 files plus 6 static-asset security tests |
| Calora database integration and account-deletion fence test | PASS — included in API suite |
| Supabase RLS / two-user tenant tests | BLOCKED — no Calora data schema in this project |

## Remaining unknowns and security risks

1. Supabase exposes no authoritative environment label; do not treat the
   branchless primary project as production without confirmation.
2. Leaked-password protection remains disabled in Supabase Auth. This is the
   only remaining Supabase security-advisor warning.
3. Calora database-level tenant isolation remains unverified in the separate
   managed PostgreSQL database where Calora tables live.
4. Production propagation of the managed-PostgreSQL account-deletion support
   objects remains unverified.
5. A future migration of Calora data into Supabase requires a separately
   approved schema/RLS design, transitive child policies, and executed
   two-user negative tests.

## Phase 2 readiness

**DO NOT APPROVE PHASE 2.**

`intelligence.facts.server_adapter` must remain blocked. Do not enable
persistent Intelligence facts, Today Intelligence, post-log Intelligence,
Progress Intelligence, Coach fact context, proactive Intelligence, or adaptive
Intelligence until tenant isolation is proven in the database that actually
stores Calora domain data.