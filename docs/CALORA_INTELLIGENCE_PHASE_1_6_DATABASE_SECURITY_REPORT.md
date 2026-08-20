# Calora Intelligence — Phase 1.6 Database & Security Report

## Executive verdict

Phase 1.6 safely removes API and test-time schema mutation, restores the Calora mobile TypeScript release check, and establishes the repository’s schema authority as the committed Drizzle schema plus Replit’s managed schema lifecycle.

**Phase 2 readiness: DO NOT APPROVE.** Development database evidence proves RLS is disabled and has no policies for every Calora table. Production Supabase/RLS evidence and negative cross-user testing remain unavailable.

## Scope completed

- Removed API startup DDL and test-time DDL fallbacks.
- Confirmed the managed post-merge setup applies the Drizzle schema to development.
- Moved account-deletion fence functions and triggers into source-controlled managed development setup and proved the fence with a real database test.
- Confirmed Replit Publish is the only supported production schema application point.
- Inspected development database tables, indexes, foreign keys, and RLS metadata.
- Corrected Premium Recipes error status handling without changing its access behavior.
- Executed complete API, mobile, development-database integration, typecheck, and static-asset security validation.

No visible Intelligence, Coach, server-side Intelligence facts, predictions, adaptive behavior, production build, or destructive database operation was introduced.

## Schema authority decision

| Concern | Decision |
| --- | --- |
| Canonical schema source | `lib/db/src/schema/index.ts` |
| Development schema application | Managed `scripts/post-merge.sh`, which runs `pnpm --filter db push` after a task merge |
| Production schema application | Replit Publish compares development and production schemas, requests confirmation for renames, then applies its reviewed diff |
| API startup behavior | No schema DDL or migration execution; startup no longer creates, alters, indexes, or installs functions/triggers |
| PostgreSQL support objects | Source-controlled `provision-support-objects` step runs after Drizzle in the managed development setup; production propagation requires Publish-path confirmation |
| Versioning | Drizzle schema changes are committed to Git; Replit manages schema application rather than custom production migration scripts |

This replaces the former competing startup-DDL authority. A custom production migration runner or boot-time self-healing DDL would conflict with the managed Replit PostgreSQL lifecycle and was intentionally not retained.

## Files modified

- `artifacts/api-server/src/index.ts`
- `artifacts/api-server/src/__tests__/sync.integration.test.ts`
- `artifacts/api-server/src/__tests__/referral-concurrency.integration.test.ts`
- `artifacts/api-server/src/__tests__/accountDeletionFence.integration.test.ts`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `lib/db/src/provision-support-objects.ts`
- `lib/db/package.json`
- `scripts/post-merge.sh`
- `docs/CALORA_INTELLIGENCE_PHASE_1_6_DATABASE_SECURITY_REPORT.md`

No dependencies, environment variables, production schema changes, generated migration files, or temporary debug artifacts were added.

## Schema parity matrix

Development metadata was queried directly from `information_schema`, `pg_indexes`, `information_schema` foreign-key metadata, and `pg_class`/`pg_policies`.

| Object | Drizzle | Development database | Former startup DDL | Result / safe action |
| --- | --- | --- | --- | --- |
| `calora_users` | Defined | Present; PK and external-ID unique index | Defined | MATCH |
| `calora_profiles` | Defined | Present; user cascade FK | Missing | Drift removed from runtime responsibility |
| `calora_food_items` | Defined | Present; source unique index | Defined | MATCH |
| `calora_diary_entries` | Defined | Present; client-id unique index and capture/image columns | Defined plus later alters | Managed schema now authoritative |
| `calora_weight_entries` | Defined | Present; user/date unique index | Missing | Drift removed from runtime responsibility |
| `calora_saved_meals` | Defined | Present | Missing | Drift removed from runtime responsibility |
| `calora_recipes` | Defined | Present; user cascade FK | Missing | Drift removed from runtime responsibility |
| `calora_recipe_items` | Defined | Present; recipe cascade and food restrict FKs | Missing | Drift removed from runtime responsibility |
| `calora_ai_capture_sessions` | Defined | Present; user cascade FK | Defined | MATCH |
| `calora_ai_capture_candidates` | Defined | Present; session cascade FK | Defined | MATCH |
| `calora_subscriptions` | Defined | Present; user/product unique index | Missing | Drift removed from runtime responsibility |
| `calora_referral_codes` | Defined | Present; code unique index | Defined | MATCH |
| `calora_referral_qualifications` | Defined | Present; session/user unique indexes | Defined | MATCH |
| `calora_referral_redemptions` | Defined | Present; referred-user unique index | Defined plus later alters | Managed schema now authoritative |
| `calora_sync_mutations` | Defined | Present; user cascade FK | Defined | MATCH |
| `calora_consent_events` | Defined | Present; user cascade FK | Missing | Drift removed from runtime responsibility |
| `calora_recipe_nutrition` | Defined | Present | Defined | MATCH |
| `calora_capture_rate_limits` | Defined | Present | Defined | MATCH |
| `calora_account_deletion_states` | Defined | Present | Defined plus later alters/check | Managed schema now authoritative |
| Deletion fence functions/triggers | Source-controlled support-object setup | Two functions and five triggers present | Former startup-only implementation | Development MATCH; production Publish propagation remains NOT VERIFIED |

## Fresh database and compatibility

**FRESH DATABASE VALIDATION: BLOCKED.** No disposable database was identified or created. The configured development database is shared and was not cleared or repurposed.

Existing-database compatibility is **PARTIAL**: no destructive schema change was introduced; legacy startup and test DDL were removed; the live development schema contains the Drizzle-declared Calora tables, indexes, foreign keys, deletion functions, and five deletion-fence triggers exercised by integration tests. A fresh empty-database provisioning run remains required before claiming full parity.

## Tenant isolation and RLS

### Repository and development findings

- Repository source contains no `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, `CREATE POLICY`, `ALTER POLICY`, or `auth.uid()` ownership policy.
- Development database metadata shows `rls_enabled = false`, `rls_forced = false`, and `policy_count = 0` for all 19 `calora_*` tables.
- API ownership filters are application protections only; they are not equivalent to database tenant isolation.
- `SUPABASE_SERVICE_ROLE_KEY` is used in server-side admin flows only; it must remain unavailable to mobile clients and bypasses normal Supabase RLS semantics.

**RLS STATUS: FAIL (development database); AWAITING EXTERNAL VERIFICATION (Supabase/production).**

### Ownership classification

| Tables | Classification | Intended ownership chain |
| --- | --- | --- |
| profiles, diary, weights, saved meals, recipes, subscriptions, sync mutations, consent events | USER-OWNED | direct `user_id` → `calora_users` |
| recipe items | USER-OWNED child | `recipe_id` → recipe `user_id` |
| capture candidates | USER-OWNED child | `session_id` → capture session `user_id` |
| capture sessions | USER-OWNED | direct `user_id` |
| food items, recipe nutrition | SHARED READ-ONLY / UNKNOWN | no direct user owner; exposure must be intentionally limited |
| referral codes, qualifications, redemptions | USER-OWNED / SERVICE-ONLY | Supabase external user identity; two-party referral rows need both participant rules |
| capture rate limits, account deletion states | SYSTEM/OPERATIONAL | server-owned; never client-readable |
| future Intelligence records | UNKNOWN | must define direct or transitive ownership, deletion, retention, and policies before creation |

### Required external Supabase checklist

1. Open the intended Supabase project, then **Database → Tables** and **Authentication → Policies**.
2. For every user-owned table listed above, confirm whether RLS is enabled and forced; capture the table settings.
3. Copy each SELECT, INSERT, UPDATE, and DELETE policy name plus its `USING` and `WITH CHECK` expressions.
4. Confirm ownership predicates derive from authenticated identity (`auth.uid()` or the project’s verified equivalent), not a client-supplied user ID.
5. Verify child-table policies traverse ownership through recipes/capture sessions rather than exposing children without a direct `user_id`.
6. Check role grants and all security-definer functions that read or write Calora tables.
7. Using two non-production Supabase identities, verify user A cannot read, modify, or delete user B’s diary, profile, weights, saved meals, private recipes/items, capture data, consent records, or sync mutations; verify same-user operations succeed.
8. Confirm server-only service-role behavior, its expected bypass, and that the service key is absent from all client builds.
9. Confirm Replit Publish carries the version-controlled account-deletion functions and five triggers to production, or provide their production catalog inventory.
10. Return policy screenshots or copied SQL plus the two-user test results for review.

## Service role and deletion review

The service-role key is consumed by server-side Supabase administration for authenticated account operations and QA/user provisioning; client environment files must not contain it. Server routes still require independently validated bearer identity before user-specific work.

Account deletion has application-level tests for forged/expired-token rejection plus a real development-database test that blocks a fenced user write after deletion starts. Full live deletion coverage across Auth, all Calora records, RevenueCat, retries, and future Intelligence records is **PARTIAL** and remains a prerequisite for persistent Intelligence data.

## Future Intelligence retention proposal

| Category | Proposed treatment |
| --- | --- |
| Ephemeral | In-memory computation inputs and navigation context; do not persist |
| Short-lived | Safe operational timing/error metadata with bounded retention |
| User-durable | Only user-confirmed preferences or explicitly saved, user-visible records |
| System-durable | Minimal deletion/audit state required for recovery and compliance |
| Should not be stored | Raw images, audio, Coach conversations, provider payloads, secrets, and hidden behavioral profiles |

## Premium Recipes TypeScript fix

The screen no longer imports an API error class that TypeScript could not resolve through the project reference. A small local, type-safe HTTP-status extractor handles `unknown` query errors and preserves the existing 401/403 copy and access-denial behavior. No `any`, suppression, or UI redesign was added.

## Executed validation

| Command | Result |
| --- | --- |
| `pnpm --filter @workspace/calora run typecheck` | PASS |
| `pnpm --filter @workspace/api-server run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 225 tests in 19 files |
| `pnpm --filter @workspace/db run provision-support-objects` | PASS — installed source-controlled functions and triggers in development |
| `pnpm --filter @workspace/api-server exec vitest run src/__tests__/accountDeletionFence.integration.test.ts src/__tests__/sync.integration.test.ts src/__tests__/referral-concurrency.integration.test.ts` | PASS — 14 real development-database tests |
| `pnpm --filter @workspace/calora test` | PASS — 884 tests in 50 files plus 6 static-asset security tests |
| `pnpm run typecheck` | PARTIAL — Calora/API pass; unrelated mockup-sandbox React ref typing errors remain |
| Metadata queries against development database | PASS — expected 19 Calora tables, declared indexes/FKs inspected; RLS disabled with zero policies |

## Release gate matrix

| Gate | Status | Evidence |
| --- | --- | --- |
| Migration authority | PARTIAL | Drizzle plus managed, source-controlled development support objects; production support-object propagation remains unproven |
| Schema parity | PARTIAL | Development table/index/FK/function/trigger metadata matches core requirements; fresh provision not fully tested |
| Fresh database provisioning | BLOCKED | No disposable database was available |
| Existing database compatibility | PARTIAL | Additive managed schema verified on development; no production database state asserted |
| RLS | FAIL / AWAITING EXTERNAL VERIFICATION | Development has RLS off and no policies; Supabase production evidence unavailable |
| Cross-user isolation | NOT TESTED | Requires two authenticated identities against intended database boundary |
| Service-role safety | PARTIAL | Server-only use identified; external deployment/client-bundle verification remains |
| Account deletion | PARTIAL | Development fence test passes; full live deletion path not exercised |
| TypeScript release check | PASS for Calora/API; PARTIAL workspace-wide | Premium Recipes errors resolved; unrelated mockup-sandbox errors remain |
| Existing test suite | PASS | API 225; Calora 884 + 6 static-asset tests |
| Intelligence Foundation regression | PASS | Included in complete Calora suite |
| Phase 2 readiness | DO NOT APPROVE | RLS, cross-user isolation, fresh provisioning, deletion/retention gates remain unresolved |

## Final engineering verdict

Calora now has no boot-time schema mutation. The required Premium Recipes release gate is restored, and the deletion fence is source-controlled and proven in development. However, managed production propagation of PostgreSQL support objects is not yet verified, and database-level tenant isolation is not merely unverified: the reachable development database currently has no RLS enabled and no policies. Do not enable `intelligence.facts.server_adapter`, do not create persistent Intelligence records, and do not begin Phase 2 until the external RLS checklist, two-user negative tests, fresh provisioning evidence, production support-object verification, and full deletion/retention design are complete.