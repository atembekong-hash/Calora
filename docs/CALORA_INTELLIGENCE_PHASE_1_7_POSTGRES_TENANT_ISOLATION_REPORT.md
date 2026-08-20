# Calora Intelligence Phase 1.7 — PostgreSQL Tenant-Isolation Report

**Status:** completed security review with constrained hardening  
**Scope:** managed PostgreSQL development environment and the Calora API. No Phase 2 work was performed.

## 1. Executive verdict

Calora currently has **API-enforced tenant isolation**, not database-enforced tenant isolation. The normal API path verifies a Supabase bearer token, derives the caller's external identity server-side, resolves it to a Calora UUID, and scopes the implemented user-data queries by that UUID.

However, the managed PostgreSQL API connection currently uses the `postgres` superuser/owner through one shared `pg.Pool`. PostgreSQL RLS is disabled on every Calora table and no request-scoped database identity exists. Therefore:

> **DATABASE-LEVEL TENANT ISOLATION: NOT ENFORCEABLE WITH CURRENT CONNECTION MODEL**

Enabling RLS under this pool/role would not protect records from the table owner/superuser and would be a misleading control. Phase 1.7 adds a defense-in-depth child-ownership predicate and permanent two-identity database integration tests for the active server persistence routes. It does **not** claim that API predicates are database isolation.

Visible Intelligence, persistent Intelligence facts, Coach changes, adaptive behavior, and `intelligence.facts.server_adapter` all remain disabled.

## 2. Exact environment inspected

- **Environment:** Replit-managed PostgreSQL development database.
- **Database:** `heliumdb`.
- **Server:** PostgreSQL 16.10.
- **Effective application/session role:** `postgres`.
- **Connection isolation:** `read committed`.
- **Calora relations inspected:** 19 typed `calora_*` tables.
- **Supabase boundary:** the configured Supabase project is the authentication provider; it does not host Calora domain tables.

No production database was mutated or inspected as part of this phase.

## 3. Auth → API → internal user → PostgreSQL trust chain

```text
Mobile client bearer token
  → Calora API Authorization header
  → Supabase Auth getUser(token) validation
  → verified Supabase user.id (external identity)
  → account-deletion write fence
  → lookup/create calora_users.external_id
  → server-resolved calora_users.id UUID
  → API query predicates on user_id or verified external identity
  → managed PostgreSQL Calora rows
```

### Trust boundaries

| Boundary | Trusted input | Protection and finding |
| --- | --- | --- |
| Client → API | Bearer token only | Body/query/path user IDs are not accepted as ownership authority. Invalid or absent bearer tokens are rejected. |
| API → Supabase Auth | Supabase `getUser(token)` result | The trusted identity is `user.id`, not an identifier supplied in client JSON. |
| External identity → internal UUID | `calora_users.external_id` unique lookup/create | Mapping is server-side and race-safe. The client does not supply the internal UUID. |
| API → PostgreSQL | Server-derived UUID/external identity predicates | Implemented user-data routes scope operations by the resolved owner. This is the current isolation control. |
| Account deletion | Admin-verified bearer, then an internal deletion worker | Tombstone/write-fence and exclusive deletion coordination block ordinary recreation while deletion is active. |

**Mapping-forgery finding:** no API route was found that accepts an arbitrary `user_id` as the row owner. Client-controlled identifiers include diary entry IDs, sync client/mutation IDs, capture-session IDs, and referral codes; implemented operations combine those identifiers with verified ownership or use an intentionally public referral-code lookup.

## 4. Connection and pooling model

| Item | Evidence | Result |
| --- | --- | --- |
| Driver/pool | `pg.Pool` plus Drizzle | One shared pool created from server-only `DATABASE_URL`. |
| API role | PostgreSQL `current_user`/`session_user` | `postgres`/`postgres`. |
| Per-request DB identity | Repository and runtime audit | Not present. No `SET LOCAL` user context, role switching, or per-user connection role exists. |
| Transaction-local identity | Capability vs. implementation | PostgreSQL could support it in a deliberate transaction design, but Calora does not establish it today. Many ordinary queries are not wrapped in a request transaction. |
| Pooler/prepared-statement behavior | NOT VERIFIED | The application directly creates `pg.Pool`; any managed upstream pooling behavior was not exposed by the inspected connection metadata. |
| Direct mobile PostgreSQL access | Repository scan | Not found. `DATABASE_URL` is consumed by the server/database package, not Expo application code. |

## 5. Database role and grants inventory

| Capability | Finding | Classification |
| --- | --- | ---|
| Read/update/delete all Calora rows | `postgres` owns all inspected Calora tables and is superuser | **OVER-PRIVILEGED** for request-path tenant enforcement; currently required by the managed lifecycle. |
| Create schema objects | `postgres` is superuser with create privileges | **REQUIRED FOR SERVER OPERATION** in the current managed development lifecycle, but unsuitable as a least-privilege API role. |
| Bypass RLS | `postgres` has `rolbypassrls` and superuser privileges | **OVER-PRIVILEGED**; RLS cannot protect against this role. |
| Assume other roles | No per-user/app roles were found | **UNKNOWN / NOT IMPLEMENTED**. |
| Database owner | `heliumdb` owner is `postgres` | **OVER-PRIVILEGED** for an API runtime credential. |
| Public schema | Owned by `pg_database_owner`; `PUBLIC` has usage | **EXPECTED** PostgreSQL default posture; no Calora-specific public grants were found. |
| Table grants | Only `postgres` was granted Calora table privileges | **EXPECTED** for the currently single-role service, but not least privilege. |
| Sequences | No Calora sequences found | **EXPECTED**; UUID defaults are used. |
| Functions | Two Calora functions, owned by `postgres`, neither `SECURITY DEFINER` | **EXPECTED**. |
| Triggers | Five deletion-fence triggers, enabled | **EXPECTED**. |
| Views/materialized views | None for `calora_*` | **EXPECTED**. |
| Extensions | `pgcrypto`, `plpgsql` | **EXPECTED**; `pgcrypto` supports deletion-state hashing. |

## 6. Table ownership and retention classification

| Table | Classification | Owner predicate / retention finding |
| --- | --- | --- |
| `calora_users` | USER-OWNED identity bridge | `external_id = verified Supabase user.id`; deleted in account erasure. |
| `calora_profiles` | USER-OWNED | `user_id → calora_users.id`; cascade delete. |
| `calora_diary_entries` | USER-OWNED | `user_id = resolved internal UUID`; cascade delete. |
| `calora_weight_entries` | USER-OWNED | `user_id → calora_users.id`; cascade delete. |
| `calora_saved_meals` | USER-OWNED | `user_id → calora_users.id`; cascade delete. |
| `calora_recipes` | USER-OWNED | `user_id → calora_users.id`; cascade delete. |
| `calora_recipe_items` | USER-OWNED CHILD | `recipe_id → calora_recipes.user_id`; cascade through recipe. |
| `calora_ai_capture_sessions` | USER-OWNED | `user_id = resolved internal UUID`; cascade delete. |
| `calora_ai_capture_candidates` | USER-OWNED CHILD | `session_id → capture_session.user_id`; cascade through session. |
| `calora_subscriptions` | USER-OWNED | `user_id → calora_users.id`; cascade delete. |
| `calora_sync_mutations` | USER-OWNED / audit | `user_id = resolved internal UUID`; cascade delete. |
| `calora_consent_events` | USER-OWNED audit | `user_id → calora_users.id`; cascade delete. |
| `calora_referral_codes` | USER-OWNED external-identity record | `user_id = verified external identity`; deleted during erasure. |
| `calora_referral_qualifications` | USER-OWNED external-identity record | `external_user_id = verified identity`; deleted during erasure. |
| `calora_referral_redemptions` | TWO-PARTY / audit | Each participant is a verified external identity; erasure anonymizes the deleted party rather than deleting the other party's reward history. |
| `calora_food_items` | SHARED | Global provider catalog keyed by source/source ID; intentionally survives account deletion. |
| `calora_recipe_nutrition` | SHARED | Provider meal-keyed nutrition cache; intentionally survives account deletion. |
| `calora_capture_rate_limits` | SYSTEM / OPERATIONAL | Server-derived user/IP rate-limit key; user-specific keys are removed at account deletion. |
| `calora_account_deletion_states` | SYSTEM / OPERATIONAL | Hashed deletion state; terminal tombstone intentionally survives to prevent post-erasure recreation. In-progress records temporarily retain a recovery identity only to complete erasure. |

No additional persistent Intelligence table or record type exists.

## 7. API authorization matrix

| Surface | Classification | Ownership enforcement |
| --- | --- | --- |
| Diary GET/POST/DELETE | AUTHENTICATED, USER-SCOPED | Resolved UUID scopes reads, inserts, and deletes; guessed entry IDs remain owner-bounded. |
| Diary first-log | AUTHENTICATED, USER-SCOPED | Verified capture session and its state-changing claim both include `user_id = resolved UUID`. |
| Sync | AUTHENTICATED, USER-SCOPED | Server supplies `user_id` for all upserts/mutation records; deletes require both resolved user and client ID. |
| Capture analyze/persist | AUTHENTICATED persistence, anonymous analysis allowed | Server derives persisted capture owner from verified identity; anonymous analysis creates no user record. |
| Referral | AUTHENTICATED, USER-SCOPED / TWO-PARTY | Verified external identity scopes own record access; referral-code lookup is intentionally public capability data. |
| Account deletion/recovery | SERVICE-ONLY after bearer verification | Caller identity is Admin-verified; recovery reads only eligible server-owned deletion states. |
| Planner and Coach | AUTHENTICATED, no Calora persistence found | No user-owned database rows are read or written by these routes. |
| Premium recipes / restaurant foods | AUTHENTICATED external-provider access | Provider source IDs are not Calora user-row identifiers. |
| Health/universal links/guest recipes | PUBLIC | Do not access user-owned Calora rows. |
| Profiles, weights, saved meals, recipes/items, subscriptions, consent | NO API DATABASE SURFACE FOUND | Schema ownership is defined, but no current server route reads or writes these tables. |

## 8. Child ownership findings and protection added

The diary first-log flow already rejects a foreign capture session before it reads its candidates. Phase 1.7 strengthened the child query itself so `calora_ai_capture_candidates` is joined to its parent session and filtered by the resolved session owner. The subsequent atomic session claim now also includes that same owner predicate.

This prevents a future refactor from accidentally treating a child `session_id` as sufficient authorization.

## 9. Tenant-isolation architecture decision

### Models evaluated

| Model | Assessment |
| --- | --- |
| API-only ownership predicates | Compatible and currently implemented. It is the actual effective isolation layer, but is vulnerable to future unscoped-query regressions and a compromised API credential. |
| Request-scoped PostgreSQL RLS | Not currently compatible as an enforced control: no request transaction/context is established and the connected role is a superuser/table owner. |
| Separate database roles | Strongly preferred future architecture, but not implemented or production-proven in the managed database lifecycle. |
| Hybrid API + RLS/least-privilege roles | Recommended target architecture after a non-superuser API role, source-controlled role/grant lifecycle, and transaction-local identity contract are proven. |

### Chosen model for this phase

**API-only authorization with regression hardening.**

This is the strongest truthful model available without unsafe or unverified managed-database role changes. The route predicates remain primary; child ownership has an additional direct predicate and permanent real-database regression coverage was added.

## 10. RLS decision and direct database isolation evidence

- All 19 Calora tables had `relrowsecurity = false` and `relforcerowsecurity = false`.
- `pg_policies` returned no Calora policies.
- The effective application role is `postgres`, which owns the tables and is superuser.
- No request-specific database identity is set.

**Direct database isolation result:** **NOT COMPATIBLE.** A direct test of user-context RLS cannot be truthfully executed because the application connection has no user context and its superuser/owner role bypasses the protection a policy would be intended to provide.

No RLS, role, grant, schema, or production database changes were performed in Phase 1.7.

## 11. USER_A / USER_B adversarial test matrix

The permanent real-database integration suite uses unique disposable identities and a real managed PostgreSQL schema. It mocks only the Supabase verifier boundary so it does not create/delete a real Supabase Auth account. Consequently, bearer-token exchange through Supabase is covered by existing auth route tests but **normal live Supabase sessions for these two identities remain NOT VERIFIED**.

| Test | USER_A / owner result | USER_B / foreign result | Result |
| --- | --- | --- | --- |
| Diary create/list | Owner creates and deletes own row | Foreign date list returns no owner rows | PASS |
| Diary guessed-ID delete | Owner delete removes row | Foreign delete returns idempotent 204 but database row remains | PASS |
| Sync same `clientId` upsert | Owner row remains unchanged | Foreign caller gets a separate row bound to their own user UUID | PASS |
| Sync guessed `clientId` delete | Owner row persists | Foreign delete only removes foreign caller's row | PASS |
| Capture session/candidate child access | Owner consumes own capture session | Foreign first-log is rejected before child candidates are read | PASS |
| Profiles, weights, saved meals, recipes/items, consent, subscriptions | NOT TESTED: no implemented API DB surfaces | NOT TESTED | NOT APPLICABLE TO CURRENT API / NOT VERIFIED FOR FUTURE SURFACES |
| Mutation-ID collision across users | NOT TESTED | NOT TESTED | NOT VERIFIED |

## 12. Service/admin and account-deletion review

| Path | Elevated reason | Boundary result |
| --- | --- | --- |
| Account deletion | Must remove application records, RevenueCat subscriber, and Supabase Auth identity | Admin-verifies bearer token; caller ID is not accepted from request data; advisory lock, row-lock state machine, and deletion fence constrain retries. |
| Pending-deletion recovery | Must complete a previously claimed erase after a failure | Server-owned worker reads only retry-eligible deletion states. |
| Referral reward processing | Needs two-party/referral state and provider grant coordination | Called from authenticated referral routes and server-side qualification evidence; no arbitrary owner ID is accepted. |
| Rate-limit cleanup | Cross-user operational cleanup | Operates only on expired operational bucket state. |

### Account deletion test result

`accountDeletionFence.integration.test.ts` passed against the real managed schema. It proves a deletion tombstone prevents a fenced identity from recreating a local user record. Full Auth-provider erasure was **NOT TESTED** with a disposable real Supabase account in this phase, so the end-to-end external-provider portion remains **PARTIAL**.

## 13. Credential security findings

- `DATABASE_URL` is required only by the database package/server runtime; no Expo public database variable or mobile database client was found.
- The Supabase service-role key is only created in server-side admin code and is used for account deletion.
- API logging serializes request method/path/status, not authorization headers or database URLs.
- This report contains no secret values.
- `artifacts/calora/env.example` contains a generic placeholder database URL only, not a credential.

## 14. Files created and modified

### Created

- `artifacts/api-server/src/__tests__/tenant-isolation.integration.test.ts`
- `docs/CALORA_INTELLIGENCE_PHASE_1_7_POSTGRES_TENANT_ISOLATION_REPORT.md`

### Modified

- `artifacts/api-server/src/routes/diary.ts`

## 15. Database changes performed

None. The integration tests inserted only disposable development fixtures and removed them during teardown. No schema DDL, RLS policy, database role, grant, or production change was made.

## 16. Validation commands and results

```text
pnpm --filter @workspace/api-server run typecheck
PASS

pnpm --filter @workspace/api-server exec vitest run src/__tests__/tenant-isolation.integration.test.ts
PASS — 3 tests in 1 file

pnpm --filter @workspace/api-server exec vitest run src/__tests__/diary.test.ts src/__tests__/sync.integration.test.ts src/__tests__/accountDeletionFence.integration.test.ts
PASS — 34 tests in 3 files

pnpm --filter @workspace/api-server test
PASS — 228 tests in 20 files

pnpm --filter @workspace/calora run typecheck
PASS

pnpm --filter @workspace/calora test
PASS — 884 Vitest tests in 50 files, plus 6 static-asset security tests
```

The API workflow was restarted after the change and started cleanly without boot-time schema writes.

## 17. Remaining unknowns and blockers

1. **BLOCKER:** production role/grant and support-object propagation have not been proven.
2. **BLOCKER:** a non-superuser API database role and transaction-local identity contract do not exist.
3. **NOT VERIFIED:** managed upstream pooler mode and production connection behavior.
4. **NOT VERIFIED:** end-to-end deletion of a dedicated real Supabase Auth account during this phase.
5. **NOT VERIFIED:** live Supabase-token sessions for the disposable USER_A/USER_B integration identities; the real-database route tests mock only the verifier boundary.
6. **NOT TESTED:** future API surfaces for schema tables that currently have no server route.

## 18. Acceptance-gate matrix

| Gate | Verdict | Evidence |
| --- | --- | --- |
| Auth identity mapping | PASS | Supabase `getUser` → server-only external-ID mapping → UUID mapping audited and regression-tested through authenticated route harnesses. |
| API tenant isolation | PARTIAL | Implemented active persistence routes have owner predicates and targeted real-database adversarial tests; no universal future-route guarantee exists. |
| Child ownership | PASS for active capture/diary flow | Parent-owner predicate is present in child read and atomic session claim; real-database foreign-session test passes. |
| Database role/grants | PARTIAL | Fully inventoried in development; role is knowingly over-privileged and no least-privilege runtime role exists. |
| Database-level isolation | NOT COMPATIBLE | Shared superuser/owner pool, no context, and no RLS policies. |
| Cross-user tests | PARTIAL | Real managed-DB two-identity tests cover diary, sync, and capture child flow; normal Supabase sessions and inactive schema surfaces are not tested. |
| Service/admin boundary | PARTIAL | Account/deletion/recovery/referral boundaries audited; full external provider deletion was not run with a disposable live Auth identity. |
| Account deletion | PARTIAL | Real DB write fence passes; full external Auth/provider erasure is not verified here. |
| Credential security | PASS | Server-only database/service credentials and no mobile direct DB access found. |
| Full regression suite | PASS | API 228 tests; Calora 884 tests plus 6 static-asset tests; both typechecks pass. |
| Phase 2 readiness | DO NOT APPROVE | Database-level tenant isolation is not enforceable with the current connection model, and listed production/live-auth evidence remains incomplete. |

## 19. Final stop condition

Phase 2 remains blocked. No visible Intelligence delivery, persistent Intelligence facts, Coach changes, adaptive behavior, or server facts adapter has been enabled.