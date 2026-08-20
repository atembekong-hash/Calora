# Calora Intelligence Phase 1.8 — Least-Privilege PostgreSQL + RLS Report

**Status:** blocked at the mandatory platform/rollback feasibility gate.  
**Result:** no PostgreSQL role, credential, grant, RLS, or application connection change was made.

## 1. Executive verdict

Phase 1.8 cannot safely establish a real PostgreSQL tenant-isolation layer in the currently proven managed-database lifecycle.

The development API still uses the sole `postgres` login role through one `DATABASE_URL`. That role is database superuser, table owner, role creator, and RLS bypasser. The repository and documented managed platform flow provide no verified separate runtime credential, source-controlled custom-role lifecycle, production propagation path for roles/policies/support objects, or rollback procedure.

Creating a development-only `calora_api` role or enabling RLS without proving those controls survive deployment would create an untrustworthy split-brain security design and could leave the API unable to access its database. Per the Phase 1.8 stop condition, this phase records the constraint rather than faking database isolation.

> **DATABASE-LEVEL TENANT ISOLATION: NOT IMPLEMENTED — PLATFORM LIFECYCLE NOT VERIFIED**
>
> **PHASE 2 READINESS: DO NOT APPROVE**

No visible Intelligence, server-persisted Intelligence fact, Coach, adaptive, prediction, notification, or UI behavior was changed.

## 2. Previous versus final connection architecture

| State | Connection architecture |
| --- | --- |
| Before Phase 1.8 | API/database package creates one `pg.Pool` from `DATABASE_URL`; effective role is `postgres`. |
| Final Phase 1.8 | Unchanged. No safe runtime-role separation could be proven. |
| Target required for RLS | Separate non-owner, non-superuser API credential; server-derived request transaction context; source-controlled policies/grants; explicit service bypass; proven publish propagation and rollback. |

## 3. Roles created or changed

**None.**

Live development metadata showed only `postgres` as a login role. PostgreSQL built-in roles were present but no Calora API runtime role existed.

## 4. Runtime role privileges

The current effective runtime role is `postgres`:

| Privilege | Result |
| --- | --- |
| Login | Yes |
| Superuser | Yes |
| Create roles | Yes |
| Bypass RLS | Yes |
| Database/table owner | Yes, for inspected Calora data |
| Calora table privileges | Full SELECT, INSERT, UPDATE, DELETE, TRIGGER, REFERENCES, and TRUNCATE grants |

This is not a least-privilege role and cannot enforce RLS against normal API queries.

## 5. Admin and migration role privileges

No distinct Calora schema-admin role exists. The same `postgres` role is used by:

- Drizzle schema push in development;
- source-controlled development support-object provisioning;
- normal API runtime connection;
- real-database integration tests.

The existing development lifecycle runs Drizzle push followed by support-object provisioning. It is intentionally not API startup work, but it is not a verified production role/grant/policy lifecycle.

## 6. Request-scoped identity design

**NOT IMPLEMENTED.**

The desired trusted chain remains:

```text
verified Supabase bearer token
→ verified external identity
→ server-side calora_users UUID mapping
→ transaction-local PostgreSQL identity
→ non-superuser API role
→ RLS policy
```

The first three stages exist today. The PostgreSQL transaction-local context, non-superuser role, and policies do not.

No global/session-level user setting was added because it could leak across pooled connections.

## 7. Transaction wrapper design

**NOT IMPLEMENTED.**

No reusable authenticated transaction wrapper was added because its safe purpose depends on an effective non-superuser runtime role and verified policy lifecycle. Implementing a wrapper against the existing superuser pool would not provide database enforcement.

## 8. RLS policy matrix

| Table class | Policy status | Reason |
| --- | --- | --- |
| User-owned UUID tables | NOT IMPLEMENTED | Runtime role bypasses RLS and no safe role lifecycle is proven. |
| User-owned child tables | NOT IMPLEMENTED | Parent-traversal policy would have the same ineffective superuser runtime boundary. |
| Shared tables | NOT IMPLEMENTED | No least-privilege access model exists to grant explicit read/write operations. |
| System/service tables | NOT IMPLEMENTED | Normal runtime and elevated service paths are not yet separated. |
| Two-party referral tables | NOT IMPLEMENTED | Requires explicit service/two-party design after the role boundary is established. |

Live development evidence: all 19 `calora_*` tables had RLS disabled, FORCE RLS disabled, and no rows existed in `pg_policies`.

## 9. Child-table policies

**NOT IMPLEMENTED.**

Phase 1.7's API defense-in-depth remains intact: capture-candidate reads join through the capture-session parent and scope to the server-resolved owner; the atomic session claim repeats the owner predicate. This is API protection, not an RLS policy.

## 10. Shared and system table handling

No database policy or grant change was made. Current classifications remain:

- shared: food catalog and recipe nutrition;
- system/operational: capture rate limits and deletion states;
- two-party: referral redemptions;
- server-managed user data: subscriptions and qualification records.

These must receive explicit least-privilege decisions only after a safe runtime/service-role boundary exists.

## 11. Service and admin bypass model

**Unchanged and not yet role-separated.**

Account deletion, deletion recovery, referral settlement, and operational cleanup use server-controlled application paths. Their caller identity and deletion-fence constraints remain in place, but they currently share the privileged database credential.

No ordinary user request can supply an arbitrary internal owner ID as authorization. However, a separate elevated database role was not created because production credential management and rollback are not proven.

## 12. FORCE RLS decision

**NOT APPROPRIATE / NOT IMPLEMENTED.**

FORCE RLS cannot make the current superuser runtime role safe. It would also introduce unproven interaction risk for table ownership, managed schema application, account deletion, and support-object provisioning.

## 13. Real User A / User B results

**NOT TESTED in Phase 1.8.**

Phase 1.7's real-managed-database integration suite uses disposable run-namespaced records and mocks only the Supabase verification boundary. It proves active diary, sync, and capture-child API ownership predicates, but it is not a real Supabase Auth session test.

Creating disposable Auth accounts is deferred until a safe non-superuser role and direct database policy test can be exercised end-to-end. No real customer accounts were accessed or deleted.

## 14. Direct database isolation results

**NOT TESTABLE / NOT IMPLEMENTED.**

The effective application role is `postgres`, which owns the tables, is superuser, and bypasses RLS. There is no non-superuser runtime credential or transaction-local user identity against which a genuine cross-user SELECT/INSERT/UPDATE/DELETE denial test could run.

## 15. Pool identity-leak tests

**NOT TESTABLE / NOT IMPLEMENTED.**

No request-local database context exists. A pool-leak test would be meaningless without a transaction-local identity and a non-superuser role for policies to enforce.

## 16. Failure-mode tests

**NOT IMPLEMENTED for RLS architecture.**

The existing API tests continue to cover invalid/missing bearer handling, owner predicates, sync ownership, capture-child ownership, and deletion fencing. The following Phase 1.8 architecture tests are blocked until platform lifecycle support is available:

- missing/malformed database user context;
- pooled-context cleanup after commit, rollback, throw, and retry;
- direct RLS policy denial;
- normal-role service operation denial;
- non-superuser privilege audit.

## 17. Account-deletion results

No account-deletion implementation changed. Existing real-database deletion-fence coverage remains the applicable baseline. Full disposable live Supabase Auth deletion remains not tested in this phase.

## 18. Performance measurements

**NOT MEASURABLE.**

No transaction wrapper, runtime-role change, or RLS policy was installed, so there is no truthful before/after security-overhead measurement.

## 19. Files created

- `docs/CALORA_INTELLIGENCE_PHASE_1_8_LEAST_PRIVILEGE_RLS_REPORT.md`

## 20. Files modified

None.

## 21. Database changes

None. All database inspection was read-only.

## 22. Secrets and environment changes

None. No credential was created, read, rotated, logged, or exposed.

## 23. Exact validation and inspection commands

```text
checkDatabase()
PASS — development database reachable

SELECT current_user, session_user, role capabilities FROM pg_roles
PASS — effective role confirmed as postgres with superuser, create-role, and bypass-RLS capabilities

SELECT Calora table ownership and RLS flags from pg_class
PASS — 19 Calora tables owned by postgres; RLS and FORCE RLS disabled

SELECT Calora policies from pg_policies
PASS — no policies

SELECT Calora table grants from information_schema.role_table_grants
PASS — postgres is the only Calora table grantee

Repository lifecycle audit
PASS — one DATABASE_URL, one pg.Pool, no runtime-role credential, no role/grant/policy lifecycle, and no verified rollback path found

Replit managed PostgreSQL documentation review
PASS — standard managed connection details expose a single DATABASE_URL; separate application runtime credentials are not documented as a default managed flow
```

## 24. Test counts and results

No code or database policy changed in this blocked phase, so no new functional regression suite was run solely for a non-existent implementation.

Applicable Phase 1.7 baseline evidence remains:

| Command | Result |
| --- | --- |
| `pnpm --filter @workspace/api-server run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 228 tests in 20 files |
| `pnpm --filter @workspace/calora run typecheck` | PASS |
| `pnpm --filter @workspace/calora test` | PASS — 884 Vitest tests in 50 files plus 6 static-asset tests |
| tenant-isolation integration suite | PASS — 3 real-managed-database tests with mocked verifier boundary |

## 25. Deployment and production propagation evidence

**PRODUCTION SECURITY PROPAGATION: NOT VERIFIED.**

The proven lifecycle applies declarative Drizzle tables and development support objects after merge. It does not prove custom PostgreSQL roles, role passwords, grants, RLS policies, or support objects are propagated/preserved in production. No production database was changed or inspected.

## 26. Rollback design

**NOT AVAILABLE / NOT VERIFIED.**

No reliable rollback plan exists for:

- a failed runtime-role credential change;
- incomplete grants;
- an RLS policy blocking legitimate traffic;
- a managed publish that omits custom roles or policies.

The existing schema push and development support-object provisioner are not a reversible role/policy deployment mechanism. This missing rollback is a blocking condition before any least-privilege mutation.

## 27. Remaining unknowns

1. Whether the managed PostgreSQL platform can preserve custom non-superuser roles and their credentials through publishing.
2. Whether a second runtime connection credential can be securely configured and rotated in this project.
3. Whether source-controlled grants/RLS/support objects can be applied in production independently of table schema diffs.
4. Managed upstream pooling behavior and its compatibility with transaction-local settings.
5. A tested rollback process for role, grant, policy, or runtime credential failure.

## 28. Remaining blockers

1. No distinct non-superuser API runtime role.
2. No separate runtime credential.
3. No source-controlled managed PostgreSQL role/grant/RLS lifecycle.
4. No verified production propagation.
5. No safe rollback.
6. No effective direct database RLS test target.

## 29. Acceptance-gate matrix

| Gate | Verdict | Evidence |
| --- | --- | --- |
| Least-privilege runtime role | BLOCKED | Only `postgres` runtime role exists; it is superuser/table owner/bypass RLS. |
| Migration/runtime privilege separation | FAIL | Same privileged credential serves both lifecycle and API runtime. |
| Request-local identity | FAIL | No transaction-local database identity contract exists. |
| Pool identity isolation | FAIL | No request-local identity exists to isolate or test. |
| RLS user-owned tables | FAIL | No policies and current role bypasses RLS. |
| Child-table RLS | FAIL | No policies. |
| Shared/system table access | PARTIAL | Classifications and API boundaries exist; least-privilege database permissions do not. |
| Service/admin bypass | PARTIAL | Application paths are deliberate; database credentials are not separated. |
| Real User A / User B API isolation | NOT TESTED | No disposable real Supabase sessions were created in this blocked phase. |
| Direct database isolation | FAIL | No effective non-superuser role/context/policy target. |
| Account deletion | PARTIAL | Existing database fence passes; role/RLS compatibility and live Auth erasure remain unverified. |
| Production propagation | NOT VERIFIED | No managed publish proof for custom roles/policies/credentials. |
| Performance | NOT MEASURABLE | No safe architecture change was installed. |
| Regression suite | PASS (baseline) | Phase 1.7 suites passed; no code change in this phase. |
| Phase 2 readiness | DO NOT APPROVE | Core least-privilege and database-isolation gates are blocked or failed. |

## 30. Final stop condition

Phase 1.8 stops here for review. Calora remains on its tested API-authorization model from Phase 1.7, without claiming database RLS protection. All Intelligence delivery flags and persistent Intelligence capabilities remain disabled. Phase 2 must not begin.