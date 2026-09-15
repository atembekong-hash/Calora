# Calora Production API Remediation Preflight Report

**Date:** 2026-09-15  
**Scope:** Read-only preflight for the canonical API update.  
**Target:** `origin/main` at commit `d5b15e93a930dc3cd83dfd0751907b6501d1b272`  
**Target source tree:** `7208584091da3492fccb8e118209f7fcb5d93951`

## 1. Scope and prohibited actions

This report was prepared without:

- deploying or restarting production;
- modifying production data, schema, or environment variables;
- pushing or merging code;
- triggering GitHub Actions or EAS;
- building Android or iOS apps;
- submitting anything to TestFlight.

Production database checks were read-only `SELECT` queries. Local API integration tests used the development database and disposable test fixtures; they did not target the production database.

## 2. Executive result

The currently served production API is healthy, but the canonical API candidate is **not safe to deploy** as-is.

The blocking issue is a provable API/client contract break:

1. The live September 9 API still exposes `POST /api/v1/capture/:sessionId/approve`.
2. The canonical API server removes that route.
3. The canonical generated API client and canonical mobile scan screen still call `approveCapture`.
4. The existing TestFlight client from the live release also calls `approveCapture`.
5. A live probe confirms the difference:
   - production returns `401 {"message":"Please sign in first."}` for the route, proving the route exists and reaches authentication;
   - the current development API returns HTTP 404 `Cannot POST .../approve`, proving the candidate server does not expose it.

The candidate also removes recipe-list response fields that existed in the deployed contract. Those fields are optional in the generated types, but the mobile recipes screen still reads `nextOffset`, so the route response change requires an explicit client/server compatibility decision and contract test.

## 3. Live deployment control plane and release identity

### Confirmed control plane

The live TestFlight API is the **Replit autoscale deployment**, not Railway.

- Replit deployment target: `autoscale`
- Deployment router: `application`
- Primary public URL: `https://mycaloraapp.com`
- Additional API URL: `https://calorie-coach-pie35449.replit.app`
- Artifact: `artifacts/api-server`
- Production build command: `pnpm --filter @workspace/api-server run build`
- Production run command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`
- Runtime: `PORT=8080`, `NODE_ENV=production`
- Startup healthcheck: `/api/healthz`

Railway was inspected read-only. Its production API service is a separate, crashed/old service with a Railway-specific domain and is not the API origin used by the TestFlight build. It must not be restarted or redeployed as part of this work.

The build script obtains `HEAD` and `HEAD^{tree}` from the clean production checkout and compiles both into `/api/version`. It fails closed for a dirty production checkout and, when sensitive activation is requested, requires the requested activation SHA to equal the reviewed checkout SHA.

### Currently served release

Read-only `/api/version` and prior release attestation evidence identify the currently served API as:

- Git commit: `22cbe8a68905654f769e2ac5f5beab65f894cadf`
- source tree: `3a6f9b93cb7590d57d5f456fca1b993a0a61091a`
- source digest: `a736ac84ca77646f1c682149c5cc3e506c37ed5617a618f06c85c7b5db07f836`
- build timestamp: `2026-09-09T02:02:43.693Z`
- release ID: `calora-api-22cbe8a68905-20260909020243693`

Read-only health checks passed:

- `/api/healthz` returned `{"status":"ok"}`;
- `/api/version` returned the attestation above.

The deployment logs show the expected `artifacts/api-server/dist/index.mjs` startup and successful authenticated API traffic. The unrelated frontend/profile healthcheck errors in those logs do not change the API identity result.

The exact live source identity is proven by the compiled attestation. A separate provider/ref field identifying a GitHub branch was not exposed by the deployment metadata; the release SHA and source tree are the authoritative evidence available from the running API.

## 4. Candidate source comparison

The comparison is from deployed commit `22cbe8a...` to canonical `origin/main` commit `d5b15e93...`.

### Database and migrations

- All four SQL migrations already existed in the September 9 source.
- No migration file was added, removed, or changed between the deployed commit and canonical `origin/main`.
- The candidate database schema source adds only the already-migrated `calora_diary_entries.sync_metadata` definition.
- Every migration is additive/guarded; a static safety check found no destructive `DROP`, `TRUNCATE`, destructive `ALTER`, `DELETE`, or data-rewriting `UPDATE` pattern.

The four migration files are:

1. `0001_task_473_coach_fact_context.sql`
2. `0002_cross_device_diary_restore.sql`
3. `0003_recovery_warning_suppression.sql`
4. `0004_recovery_warning_summary.sql`

### API source changes

The API route paths are mostly stable, but behavior changed in these areas:

- capture: removes `/v1/capture/:sessionId/approve`;
- planner: substantial planner generation/catalog and fallback changes;
- recipes: nutrition/provider behavior and response contract changes;
- premium recipes: provider normalization and failure behavior;
- referral: qualification/activation behavior changes;
- restaurant foods: provider behavior changes;
- sync: diary restore/sync behavior changes;
- public pages and universal links: public response and asset behavior changes;
- account-deletion/recovery: shared warning and fence behavior changes;
- image metadata, CORS, branding, and release validation;
- generated OpenAPI/client/Zod contract files;
- workspace dependency and XML compatibility changes.

Unchanged requested backend surfaces include the route implementations for account, Coach, Coach Fact Context, Coach Fact Context consent, diary, and health, as well as the Supabase auth and RevenueCat helper modules.

### Contract break: capture approval

The deployed commit contains:

```text
POST /v1/capture/:sessionId/approve
```

The canonical API server does not contain that route. The canonical OpenAPI file and generated React client still contain `approveCapture`, and the canonical mobile scan screen still calls it after review. The September 9 mobile source also calls it from the scan screen and capture-acceptance coordinator.

This is not a theoretical mismatch. The route probes produced:

```text
production: HTTP 401 {"message":"Please sign in first."}
development candidate: HTTP 404 Cannot POST /api/v1/capture/.../approve
```

An existing TestFlight client can therefore reach a behaviorally required route on the current API and receive a 404 after the candidate is deployed. Capture review/approval and downstream server-issued capture proof can fail for existing users.

### Contract risk: recipes and premium recipe pagination

The candidate removes `terminalReason` from the premium recipe list and removes recipe-list pagination fields from the API contract/server response. The mobile recipes screen still reads `data.nextOffset` for pagination, and the older mobile source uses both `nextOffset` and `terminalReason`.

Even where the fields are optional, removing a response field that drives client pagination is not safe to classify as a transparent backend-only change without an exact client replay or a server compatibility retention decision.

## 5. Production database preflight

### Verified schema objects

Read-only production queries confirmed the expected objects for all four migrations:

- Coach Fact Context tables exist:
  - `calora_coach_fact_context_consents`
  - `calora_server_config`
  - `calora_cohort_memberships`
  - `calora_coach_fact_context_idempotency`
- `calora_cohort_memberships.expires_at` and `reviewed_at` exist.
- Coach nonce columns and timestamps exist.
- The diary `sync_metadata` column exists.
- Recovery warning tables exist:
  - `calora_recovery_warning_suppressions`
  - `calora_recovery_warning_summaries`
- All expected migration indexes were found.
- The Coach consent state check constraint was found.
- The recovery summary cohort-key check constraint was found.
- `pgcrypto` is installed.

### Support objects

The account-deletion support objects were also confirmed read-only:

- `calora_account_deletion_write_fence_trigger` exists on all five intended tables;
- each trigger has `BEFORE INSERT` and `BEFORE UPDATE` coverage;
- the `pgcrypto` extension required by the fence function is installed.

### Migration-history limitation

No public `__drizzle_migrations` or `drizzle_migrations` table was available in the production database query results.

Therefore:

- schema shape and support-object presence are proven;
- the exact migration application order, migration checksums, and whether the migration runner recorded those applications are not proven;
- a deployment must not claim a complete Drizzle migration ledger until a read-only ledger source is identified or a separately approved baseline/reconciliation procedure is defined.

This is an evidence/control-plane gap, not evidence that the four required schema shapes are missing.

### Coach rollout state

The production Coach Fact Context endpoint flag is present. The server-owned rollout key exists and is currently enabled by the read-only boolean check. There are zero reviewed active cohort memberships for the named cohort, so the deny-by-cohort behavior remains effective for cohort-gated access. Four consent rows exist. No rollout mutation was performed.

## 6. Environment and integration preflight

Only variable names and presence/status were recorded. Secret values were not printed or compared.

### Present/configured by name

The production/shared inventory contains the names required by the current backend for:

- Supabase Auth:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- OpenAI integration:
  - `AI_INTEGRATIONS_OPENAI_API_KEY`
  - `AI_INTEGRATIONS_OPENAI_BASE_URL`
- FatSecret gateway:
  - `FATSECRET_CLIENT_ID`
  - `FATSECRET_CLIENT_SECRET`
  - `FATSECRET_GATEWAY_SECRET`
  - `FATSECRET_GATEWAY_URL`
- TheMealDB:
  - `THEMEALDB_API_KEY`
- RevenueCat:
  - `REVENUECAT_PROJECT_ID`
  - `REVENUECAT_SECRET_API_KEY`
  - connected RevenueCat integration configuration
- storage/release infrastructure:
  - `DEFAULT_OBJECT_STORAGE_BUCKET_ID`
  - release attestation/provider variables recorded in the environment inventory
- runtime release controls:
  - `COACH_FACT_CONTEXT_ENABLED`
  - `RELEASE_SENSITIVE_ACTIVATION_REQUESTED`
  - `RELEASE_SENSITIVE_ACTIVATION_COMMIT`

Presence does not prove that a secret is valid for the intended production project or that a provider credential has the required scope. Those checks require provider-specific read-only verification or an approved deployment rehearsal.

### Required remediation for release binding

The configured production `RELEASE_SENSITIVE_ACTIVATION_COMMIT` is bound to an older reviewed SHA, not the canonical target SHA. The value of `RELEASE_SENSITIVE_ACTIVATION_REQUESTED` was intentionally not printed. If it is true for a candidate build, the build must fail closed until the activation commit is explicitly reconciled to the exact reviewed target. If it is false, the candidate remains in the non-sensitive path and must not be treated as sensitive-feature activation.

No production environment variable was changed.

### Optional or not proven

- `USDA_FOODDATA_API_KEY` was not present in the available secret inventory. The current capture code falls back to a demo key, which is not sufficient evidence for production nutrition availability.
- `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`, provider timeout overrides, and premium-provider override variables are optional/behavioral; their value correctness was not established without exposing environment values.
- Provider credentials were not exercised with mutating calls. RevenueCat entitlement reads and production data checks remained read-only.

## 7. Auth, provider, and feature review

- Supabase bearer verification remains the server authority for authenticated API access; the candidate does not change the Supabase auth helper.
- Account deletion still uses the local deletion state and provider erasure flow; the database fence triggers are present.
- RevenueCat server authorization remains connector-backed for premium entitlement reads and uses the server secret for customer erasure. No RevenueCat mutation was made.
- FatSecret restaurant/premium routes remain dependent on the configured gateway/provider path. Local tests cover restricted/error behavior without exposing credentials.
- TheMealDB and OpenAI-backed recipe paths are covered by local route tests; live provider mutation was not attempted.
- Coach Fact Context remains bounded by the environment flag, database rollout key, consent state, account eligibility, rate limiting, and nonce checks. No client or production rollout state was modified.
- No server-side notification route or health route source change was found between the deployed API and canonical target.

## 8. Validation performed

### Passed

- API test suite:
  - 35 test files passed;
  - 422 tests passed;
  - 1 integration test file skipped by its explicit pending rollback gate;
  - 4 tests skipped within that file.
- Full workspace typecheck passed:
  - shared libraries;
  - API server;
  - Calora;
  - FatSecret gateway;
  - mockup sandbox;
  - scripts.
- Local API production build completed successfully from the current clean working checkout. This validated the build pipeline only; it did not deploy the result.
- Migration static safety check passed: all four migrations pre-existed the deployed source and contained no destructive pattern.
- Production `/api/healthz` and `/api/version` checks passed.
- Production database object, index, constraint, extension, trigger, and rollout-key checks passed using read-only SQL.
- Capture approval route incompatibility was independently proven by production and development HTTP probes.

### Not proven

- A complete production Drizzle migration ledger.
- Exact validity/scope of every production provider credential.
- A full authenticated replay of every TestFlight 1.0.0 (2) route against a staging/candidate API.
- Safe compatibility of the removed capture approval endpoint.
- Safe compatibility of the changed recipe pagination response.

## 9. Rollback and release requirements

No deployment should be attempted until the contract blocker is resolved and the exact release candidate is frozen.

Required before any later deployment:

1. Restore `POST /v1/capture/:sessionId/approve` for backward compatibility, or release a deliberately coordinated mobile/API change that no longer requires it. Because the canonical mobile client still calls it, restoring the route is the least risky remediation.
2. Preserve `nextOffset` and any still-consumed pagination fields until the client contract is intentionally migrated, or prove the exact installed-client behavior with replay tests and a matching mobile release.
3. Reconcile the sensitive-release activation control to the exact reviewed source SHA, or explicitly prove the sensitive activation request is false and keep the candidate on the deny-all/non-sensitive path.
4. Obtain migration-ledger evidence or document an approved baseline reconciliation. Do not run `drizzle-kit push` against production as a substitute.
5. Run the post-merge migration runner and support-object provisioning only through the approved deployment/control-plane procedure, not API startup and not a client request path.
6. Build the API from the exact frozen candidate SHA, verify `/api/version` over canonical HTTPS, and compare commit, tree, and source digest before enabling any independent runtime control.
7. Preserve a rollback target to the currently served release:
   - commit `22cbe8a68905654f769e2ac5f5beab65f894cadf`;
   - source tree `3a6f9b93cb7590d57d5f456fca1b993a0a61091a`;
   - release ID `calora-api-22cbe8a68905-20260909020243693`.
8. Because the schema changes are additive, rollback should be an application release rollback, not destructive database reversal. Do not drop the four migration tables or the `sync_metadata` column during rollback.
9. After any future publish, verify health, release identity, capture approval, sync, recipes, planner, premium recipes, referral, account deletion fencing, and canonical public pages before widening traffic.

## 10. TestFlight conclusion

The existing TestFlight 1.0.0 (2) **cannot be certified for use with the canonical API update without a new coordinated compatibility decision**.

It calls `approveCapture`, and the candidate API returns 404 for that route. A new iOS build is not required for a backend-only release only when the backend preserves the existing client contract. This candidate does not preserve that contract. Restoring the endpoint is the preferred way to let the existing TestFlight build continue using the updated backend without a new iOS build.

## Final verdict

**BLOCKED — REMEDIATION REQUIRED**