# Mission 407 — Production Database Security Boundary Certification

**Assessment date:** 2026-11-07  
**Primary control:** CAL-15  
**Starting protected-main SHA:** `b94cdbcf248d2d716ae590646b62a11ff905b0e3`  
**Production release SHA:** `eefba459c190605a63eb9db874556ddf9bebb5c6`  
**Mission branch:** `mission/407-database-security-boundary`  
**Production mutation:** none  
**Verdict:** **CAL-15 remains BLOCKED — the live role boundary is now evidenced, but the API runtime role bypasses RLS and the Railway `DATABASE_URL` identity cannot be independently compared through the authorized control-plane metadata.**

## Executive verdict

The current read-only investigation corrected an important evidence error from earlier reports. The active Supabase project `caloraapp` (`pzdulhkpwbrbrgskwwwe`) currently contains the complete Calora schema, including 37 application and operational tables, not an empty or unrelated schema. Its table names, migration journal, role names, ownership, and row-count metadata are consistent with the Calora PostgreSQL source model and with the Railway API's required database variables.

The 37 `rls_enabled_no_policy` findings are intentional deny-by-default direct-client controls, not missing user-facing policies. The live metadata shows no table grants for `anon` or `authenticated`; the mobile client uses only the public Supabase Auth URL/anon key and contains no direct Calora table queries. The API runtime is the sole domain-data path.

However, the live `calora_api_runtime` role has `BYPASSRLS = true` and effective full CRUD on representative Calora tables. Therefore RLS is not an independent tenant boundary for API traffic. Tenant separation currently depends on verified bearer identity, route ownership predicates, deletion fences, and service-side code. That application boundary passes the isolated two-user integration suite, but CAL-15 cannot be marked PASS without either a separately approved compensating-control exception or a least-privilege redesign that removes the runtime role's RLS bypass while preserving the API's required operations.

Four mutable function-search-path warnings are also confirmed. The functions are not `SECURITY DEFINER`, but they run in trigger/helper paths under the runtime role and contain unqualified public references. A four-function `ALTER FUNCTION ... SET search_path = pg_catalog, public, extensions` migration and regression contract have been staged on the Mission 407 branch. The migration is deliberately **not merged** because Railway's API `preDeployCommand` automatically runs the database migration runner; merging it would be an unauthorized production database mutation.

Leaked-password protection remains disabled in Supabase Auth. Enabling it is a provider configuration change and was not performed.

## Production identity and release isolation

Railway production was inspected read-only in project `attractive-harmony`, environment `production`. The API, Calora web service, and FatSecret gateway all remain sourced from `release/calora-production`; there are no staged changes and all three services are healthy. The API deployment is `10585054-72e1-4727-af32-86521826aa9c`; the Calora web deployment is `74436264-2a55-4310-b4f8-5e9874ceaacc`; the gateway deployment is `dde8a33d-fdcd-4dfa-a421-6f8f1332216c`.

The API service exposes variable names `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`, but the authorized Railway metadata does not expose their values. No secret-value retrieval was attempted. The active Supabase project exposes the host `db.pzdulhkpwbrbrgskwwwe.supabase.co`, and the public application configuration references `https://pzdulhkpwbrbrgskwwwe.supabase.co`.

The strongest non-secret corroboration is the live Supabase schema: it contains all expected Calora tables, all 37 are owned by `calora_migrator`, the migration journal has eight rows, the expected runtime/migrator roles exist, and the schema has active Calora data. This is strong evidence that the inspected Supabase project is the current Calora persistence target. It is not a cryptographic equality proof of Railway's hidden `DATABASE_URL`. A sanitized provider-side database fingerprint or owner-controlled control-plane comparison is still required for independent identity certification.

## Database-role and access-boundary matrix

| Access path | Observed boundary | Result |
|---|---|---|
| Anonymous mobile/web client | Uses public Supabase Auth URL and anon key; no direct Calora table calls found; live `anon` has no Calora table privileges | **PASS — deny by metadata/source** |
| Authenticated mobile/web client | Uses Auth/session APIs and the Calora API; live `authenticated` has no Calora table privileges | **PASS — deny by metadata/source** |
| API bearer verification | `supabase-auth.ts` calls Supabase `auth.getUser(token)` and derives the user ID server-side; caller-supplied IDs are not trusted | **PASS — source** |
| API runtime database role | `calora_api_runtime` exists, is login-capable, has `BYPASSRLS = true`, and has effective SELECT/INSERT/UPDATE/DELETE on representative Calora tables | **BLOCKED / risk** |
| Migration role | `calora_migrator` owns all 37 Calora tables and has effective CRUD; it is a separate login-capable role with `BYPASSRLS = false` | **PASS — separation evidenced; credential lifecycle still owner-controlled** |
| Supabase service role | Exists with `BYPASSRLS = true`; no direct Calora table grants were returned in the inspected metadata; application source uses it only for privileged Supabase Auth deletion | **PASS for intended Auth scope; live credential usage remains hidden** |
| Background workers | Source uses the API database package and deletion-fence state; no separate worker database credential was found in the inspected source | **BLOCKED — live worker identity not independently verified** |
| Recipe photo storage | API uses private owner-prefixed object names, signed access, and deletion saga; Railway exposes object-storage variable names only | **BLOCKED — live bucket policy/object identity not independently verified** |
| Administrative operations | Admin routes use a separate authenticated session/control-plane path and admin tables are direct-client denied | **PASS — source/metadata scope; live admin exercise not performed** |

## Analysis of all 37 RLS findings

Every Calora table reported by the Supabase advisor has RLS enabled and zero explicit policies. The findings cover user-owned tables such as `calora_profiles`, `calora_diary_entries`, `calora_users`, `calora_weight_entries`, `calora_saved_meals`, `calora_recipes`, and `calora_recipe_media`; system tables such as rate limits, deletion states, recovery warnings, and the migration journal; Coach and consent tables; referral tables; and admin control-plane tables.

The source baseline and migrations intentionally implement the direct-client boundary as:

- enable RLS on the Calora tables;
- revoke table privileges from `anon` and `authenticated`;
- keep the API as the only domain-data access path;
- use verified external identity and application ownership predicates in API routes;
- use a separate migration role and a runtime role.

The live effective-privilege checks confirm that `anon` and `authenticated` cannot select, insert, update, or delete representative Calora tables. The findings therefore do not represent an exposed direct-client table path. They also do not prove tenant isolation for the API runtime, because that role bypasses RLS. No generic per-user policies were added: doing so without a role and migration design would risk blocking legitimate API writes or creating false assurance.

## Function search paths

The four advisor warnings are confirmed:

- `calora_assert_deletion_writable(text)`
- `calora_coach_v2_write_fence()`
- `calora_admin_audit_events_immutable()`
- `calora_account_deletion_write_fence()`

All four are `SECURITY INVOKER`, owned by `calora_migrator`, and currently have `proconfig = NULL`, meaning no function-local search path is pinned. Their definitions contain unqualified references to Calora tables and helper functions. Although the functions are not security-definer functions, pinning the search path is the smallest safe hardening change for trigger execution under a mutable session environment.

The staged correction is `lib/db/migrations/0021_function_search_path_hardening.sql`. It pins each function to `pg_catalog, public, extensions` and changes no tables, rows, grants, roles, policies, or credentials. The accompanying regression contract requires all four functions and rejects grants, policy creation, destructive DDL, and table deletion. The disposable PostgreSQL rehearsal applied the migration successfully and verified all four `proconfig` values, then completed a transaction rollback rehearsal.

## Leaked-password protection

Supabase Auth reports leaked-password protection disabled. This is an Auth control, not a Calora table-policy finding. It should be enabled through the Supabase Auth security configuration after the owner confirms the desired user-facing behavior and rollout timing. No configuration change was made in Mission 407.

## Confirmed weakness and remediation status

The confirmed database-security weakness is not direct anonymous table exposure. It is that the API runtime database role bypasses RLS, making RLS non-authoritative for API traffic. Application-level ownership controls are strong and pass adversarial two-user tests, but they are not an independent database-enforced tenant boundary.

The smallest immediate correction is the staged function-search-path hardening. The required CAL-15 remediation is larger and must be designed separately. Options are:

1. replace `BYPASSRLS` on the API runtime role with a least-privilege role and implement a tested database authorization context/policy design; or
2. retain the API-only architecture and obtain a formally approved compensating-control exception covering route ownership predicates, role grants, adversarial tests, code review, deployment provenance, and monitoring.

The migration must not be merged until the owner approves the production database-security approach, because Railway automatically runs `pnpm --filter @workspace/db run migrate` in the API pre-deploy hook.

## Isolated validation

The following isolated evidence was produced without production credentials or customer data:

- Search-path regression contract: **2/2 passing**.
- Disposable migration apply and rollback rehearsal: **PASS**.
- Tenant-isolation integration suite on a freshly bootstrapped disposable PostgreSQL database: **3/3 passing**.
- Account-deletion fence integration suite: **6/6 passing**.
- Privacy-rights integration suite: **3/3 passing**.
- Combined database integration run: **12/12 passing**.
- API TypeScript validation: **PASS**.
- Client TypeScript validation: **PASS**.
- Security, database-workflow, provider-attestation, release, and API-release contracts: **27/27 passing**.

These results validate the application boundary and migration behavior in isolation. They do not elevate CAL-15 to PASS while the live API runtime role bypasses RLS.

## Migration and rollback readiness

The staged migration is forward-only and contains four `ALTER FUNCTION` statements. It is transaction-safe under the repository migration runner. The rollback procedure is to apply the inverse statements manually through the approved migration operator:

```sql
ALTER FUNCTION public.calora_assert_deletion_writable(text) RESET search_path;
ALTER FUNCTION public.calora_coach_v2_write_fence() RESET search_path;
ALTER FUNCTION public.calora_admin_audit_events_immutable() RESET search_path;
ALTER FUNCTION public.calora_account_deletion_write_fence() RESET search_path;
```

Rollback should be used only if the owner-approved rollout observes a function-resolution regression and after preserving the migration journal and deployment evidence. The inverse is not committed as an automatic migration because automatic rollback would itself be a production mutation.

## GitHub and Railway disposition

Mission 407 has a dedicated branch, `mission/407-database-security-boundary`, based on protected main `b94cdbcf248d2d716ae590646b62a11ff905b0e3`. The branch contains the staged migration, regression contract, and this evidence report. It is not promoted to `release/calora-production` and no production deployment was triggered.

A PR may carry the evidence and staged migration for review, but it must remain unmerged until the owner separately approves the production database-security design and confirms that applying the migration is authorized. The existing production release branch remains `eefba459c190605a63eb9db874556ddf9bebb5c6`.

## CAL-15 reassessment

**CAL-15: BLOCKED.**

The direct client path is independently denied by live grants and source inspection. The application-level cross-user boundary is validated on disposable PostgreSQL. But the API runtime role has `BYPASSRLS = true`, so the database does not independently enforce tenant isolation for the path that handles customer data. Railway's hidden database URL also prevents a final cryptographic identity comparison through the available authorized metadata.

This is not classified as FAIL because no cross-user data exposure was reproduced and the application authorization boundary is effective in the isolated adversarial suite. It is not PASS because mandatory independent database-boundary evidence is absent and the role configuration explicitly bypasses RLS.

## Owner approvals still required

1. Approve a sanitized Railway-to-Supabase database identity comparison or provide an owner-controlled fingerprint attestation without exposing a connection string.
2. Approve the least-privilege/RLS redesign or a documented compensating-control exception for the API runtime role.
3. Approve applying migration `0021_function_search_path_hardening.sql` in production after a review of the automatic Railway pre-deploy migration hook.
4. Approve enabling Supabase Auth leaked-password protection.
5. Provide independent production evidence for object-storage bucket policy and worker/database credential boundaries.

## Recommended Mission 408

Design and validate the API runtime least-privilege boundary in a disposable clone. The next mission should model the actual `calora_api_runtime` and `calora_migrator` roles, define an explicit authorization context for user-scoped operations, test owner and cross-user reads/writes/deletes, test deletion fences and admin operations, and measure migration rollback. Do not connect the redesign to Railway or merge it until the role/policy contract is accepted.
