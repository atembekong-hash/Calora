# Mission 406 — Tenant Isolation and Commercial Entitlement Certification

**Assessment date:** 2026-11-07  
**Scope:** source-level tenant authorization and paid-feature enforcement only  
**Branch:** `mission/406-security-revenue`  
**Starting protected-main SHA:** `7a671df1b9bffa8a30e5e15bdff21a496736fe28`  
**Production release SHA observed:** `eefba459c190605a63eb9db874556ddf9bebb5c6`  
**Verdict:** **NOT CERTIFIED — CAL-15 remains blocked; CAL-27 source defect remediated but live billing lifecycle evidence remains blocked**

## 1. Executive summary

Mission 406 completed the authorized forensic review of tenant isolation and the commercial Plus recipe entitlement boundary. One reproducible authorization defect was found and repaired: the API's premium-recipe authorization function authenticated the caller and applied rate limits, but explicitly skipped the existing server-authoritative RevenueCat entitlement check. As a result, any authenticated account could request Plus recipe list and detail data.

The repair now calls `hasActivePremiumEntitlement(user.id)` before either premium route reaches provider work. An inactive entitlement receives HTTP 403; an unavailable RevenueCat verification receives a generic HTTP 503. Provider diagnostics are logged only as sanitized classifications and are not returned to callers. Anonymous, rate-limited, and account-deletion-fenced paths retain their earlier ordering and behavior.

Tenant-isolation tests pass against a freshly bootstrapped and migrated disposable PostgreSQL schema. However, the production Supabase metadata shows RLS enabled on Calora tables but no RLS policies, and the Railway service's database/project values are not exposed by the authorized metadata tools. The application-level authorization boundary is therefore evidenced, but a production database-level isolation or equivalent control cannot be independently certified in this mission. CAL-15 remains BLOCKED rather than being falsely marked PASS.

No production database, customer row, credential, secret, environment variable, Railway configuration, native build, or store submission was changed.

## 2. Root cause and source repair

### Confirmed defect

`artifacts/api-server/src/routes/premiumRecipes.ts` contained a comment stating that billing should not prevent authenticated users from browsing the Plus catalogue. The function returned `{ allowed: true }` immediately after authentication, rate-limit, and deletion-fence checks. The imported `hasActivePremiumEntitlement` implementation and its RevenueCat tests existed, but the premium recipe routes did not invoke it.

### Repair

The authorization function now:

1. Requires a verified signed-in user.
2. Applies the existing account/IP rate-limit checks.
3. Preserves the account-deletion write-fence check.
4. Calls `hasActivePremiumEntitlement(user.id)`.
5. Returns a generic 403 for an inactive entitlement.
6. Returns a generic 503 when entitlement verification is unavailable or fails unexpectedly.
7. Prevents provider list/detail work when access is denied or entitlement verification is unavailable.

The list and detail routes both use this shared authorization function, so the boundary is not limited to catalogue pagination.

## 3. Evidence matrix

| Requirement | Evidence | Result | Verdict |
|---|---|---|---|
| Authenticated non-subscriber cannot browse Plus recipes | `premiumRecipes.test.ts`: inactive entitlement returns 403; provider fetch is not called | Reproduced before repair and passing after repair | **PASS — source scope** |
| RevenueCat uncertainty fails closed | `premiumRecipes.test.ts`: entitlement failure returns generic 503 with no provider diagnostic | Passing | **PASS — source scope** |
| Anonymous access remains denied before entitlement/provider work | Existing premium route regression | Passing | **PASS — source scope** |
| Detail route uses the same entitlement boundary | Shared `requirePremiumAccess` call used by list and detail routes | Source verified; shared tests cover route behavior | **PASS — source scope** |
| Two-user diary/sync/capture isolation | Fresh disposable PostgreSQL: tenant-isolation integration suite | 3/3 passing | **PASS — isolated application/schema scope** |
| Privacy request contract | Disposable-local API suite | 3/3 passing | **PASS — contract scope** |
| Account-deletion fence interaction | Disposable-local API suite | 6/6 passing | **PASS — isolated scope** |
| Production DB RLS/equivalent boundary | Supabase metadata: Calora tables have RLS enabled, but security advisor reports no policies on the Calora tables; Railway hides actual DB URL/project values | Not independently certifiable | **BLOCKED** |
| Production subscription lifecycle | No current purchase, restore, renewal, expiration, cancellation, refund, revocation, webhook, or cross-device evidence | Not executed and not authorized in this mission | **BLOCKED** |

## 4. Production read-only baseline

- Railway project: `attractive-harmony`; environment: `production`.
- `@workspace/api-server`: live, latest successful deployment `10585054-72e1-4727-af32-86521826aa9c`, source branch `release/calora-production`.
- `@workspace/calora`: live, latest successful deployment `74436264-2a55-4310-b4f8-5e9874ceaacc`, source branch `release/calora-production`.
- Railway metadata exposes variable names including `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REVENUECAT_PROJECT_ID`, and RevenueCat API keys, but no secret values were read or serialized. Variable-name metadata alone cannot prove that the Railway database and Supabase project are the same production persistence boundary.
- Supabase project `caloraapp`, immutable ID `pzdulhkpwbrbrgskwwwe`, is `ACTIVE_HEALTHY` in `us-west-2` on PostgreSQL 17.6.1.155.
- Read-only schema metadata reports Calora tables with RLS enabled and populated production tables. The Supabase security advisor reports 37 `rls_enabled_no_policy` findings for Calora tables, plus four mutable function search paths and leaked-password protection disabled. These findings were recorded only; no provider changes were made.

## 5. Validation results

### Focused API and commercial tests

- Premium recipe routes: **33/33 passing**.
- RevenueCat server entitlement tests: **16/16 passing**.
- Account-deletion fence integration suite: **6/6 passing**.
- Tenant-isolation integration suite on a freshly bootstrapped disposable schema: **3/3 passing**.
- Privacy rights contract suite: **3/3 passing**.
- Client RevenueCat/premium suites: **24/24 passing**.
- API TypeScript validation: **PASS**.
- Client TypeScript validation: **PASS**.

### Full applicable suites

- API offline suite: **46 test files, 561 tests passing**. It was rerun with a non-routable synthetic AI base URL solely to satisfy import-time configuration; no outbound AI request was made.
- Client CI suite: **193 test files, 2,013 tests passing**, plus **29 server/build/security checks passing**.
- Release/provider/API contract tests: **22/22 passing**.

The first API offline attempt failed only because the local shell lacked `AI_INTEGRATIONS_OPENAI_BASE_URL`; the first tenant attempt failed only because the selected disposable database had not been bootstrapped and lacked `calora_users`. Both were corrected by using repository-supported local-only configuration and a freshly bootstrapped disposable database. No production failure is inferred from either harness-preparation failure.

## 6. Certification-register decisions

- **CAL-15:** remains **BLOCKED**. Application-level two-user isolation is now directly demonstrated on a source-controlled schema, but production DB-level RLS/equivalent isolation is not independently evidenced; current Supabase advisor findings explicitly show RLS without policies.
- **CAL-27:** moves from **FAIL** to **BLOCKED**. The premium-benefit enforcement defect is repaired and covered, but the historical/store lifecycle certification remains incomplete and no live transaction or signed native release was authorized.
- Overall launch verdict remains **NOT CERTIFIED — BLOCKED**.

## 7. Remaining owner actions

1. Confirm, using a sanitized control-plane record, which production database URL/project backs Railway API persistence; do not disclose the value.
2. Define and validate the intended database boundary: policy-backed tenant isolation for direct database roles, or a documented and independently tested equivalent that cannot be bypassed by an exposed credential.
3. Address the Supabase security-advisor findings through a separately approved database-security change. Do not add policies blindly: first document the API database role, service-role bypass behavior, policy test matrix, and rollback plan.
4. Complete store purchase, restore, renewal, expiration, cancellation, refund, revocation, webhook, and cross-device evidence on an authorized test account.
5. Re-run CAL-15 and CAL-27 certification after those evidence items are available.

## Final verdict

**Source-level commercial authorization is repaired and validated. Tenant application boundaries are validated on disposable infrastructure. Calora is not commercially certified for launch in this mission because production database isolation and the complete live billing lifecycle remain unverified.**
