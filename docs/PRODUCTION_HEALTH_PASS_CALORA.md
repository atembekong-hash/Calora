# Production health verification — Calora

**Verification date:** 2026-08-22  
**Scope:** Post-publish health verification only. Coach Fact Context was not
activated, enrolled, consented, or sent to a provider.

## 1. Deployed revision

- Expected validated source revision: `a47782a81531f90010a5001d55665606e2804b31`
- Working tree before publishing: clean; no unexpected source changes.

## 2. Deployment result

- Deployment is active, public, and reports a successful build.
- The post-publish public endpoint checks below reached the deployed service.

## 3. Production `/api` result

- `GET /api` returned `200`.
- Response: `{"status":"ok"}`.

## 4. Production `/api/healthz` result

- `GET /api/healthz` returned `200`.
- Response: `{"status":"ok"}`.

## 5. Normal production API operation

- `GET /api/v1/recipes?limit=1` returned `200` with a normal recipe response.
- An anonymous Premium Recipes request returned the intended `401` sign-in
  response before entitlement verification.

## 6. RevenueCat v2 production result

Production is missing the non-secret configuration value
`REVENUECAT_PROJECT_ID`. It is absent from shared, development, and production
environment configuration.

The deployed v2 entitlement helper explicitly requires that value before it
constructs a RevenueCat request. Therefore, it correctly fails closed and the
following production checks were **not run**:

- RevenueCat connection authentication;
- project lookup;
- authorized test-account customer lookup;
- active-entitlement lookup;
- entitled Premium Recipes allow path;
- non-entitled authenticated Premium Recipes denial path.

No credential, customer identifier, entitlement record, or token was printed or
stored while detecting this blocker.

## 7. Previous RevenueCat failures

The previous upstream `401 Invalid API Key` condition and its contained Premium
Recipes `503` cannot be declared resolved in production. The deployed helper
cannot reach the repaired v2 connector until `REVENUECAT_PROJECT_ID` is
configured. This is intentionally fail-closed rather than an authorization
bypass.

## 8. Runtime and log findings

- Public API health and normal recipe reads are currently successful.
- Deployment logs contain startup-time probe failures, including `500` results
  for routed paths while artifact processes were starting. These are material
  observations even though the public API and explicit health endpoint later
  returned `200`.
- No post-publish successful Premium entitlement verification can be asserted
  because production configuration blocks that path before an external call.

## 9. Coach Fact Context dark-state verification

No Coach Fact Context control changed during publish or verification.

| Control | Post-publish evidence | State |
| --- | --- | --- |
| Process gate | No production `COACH_FACT_CONTEXT_ENABLED` environment value exists; an empty deployed request returned `404` unavailable before parsing, authentication, or provider use | Off / fail closed |
| Global rollout | Production read-only query found 0 rollout config rows | Off |
| Active cohort | Production read-only query found 0 active cohort rows | Empty |
| Consent rows | Production read-only query found 0 rows | Empty |
| Nonce rows | Production read-only query found 0 rows | Empty |
| Frozen allowlist | Source remains limited to the approved four daily fact keys | Unchanged |
| Provider traffic | No Fact Context payload, authenticated request, or provider call was made | None |

The previously authorized controlled account was not enrolled or activated.

## 10. Regression results

Pre-publish validation passed:

- API health tests: 2 passing;
- Premium Recipes tests: 15 passing;
- API typecheck: passing.

Post-publish smoke checks confirmed `GET /api`, `GET /api/healthz`, and normal
recipe browsing are healthy. RevenueCat entitlement enforcement cannot complete
its production regression until the missing project identifier is added.

## 11. Exact final production state

- API base health: healthy.
- Explicit API health: healthy.
- Normal recipe API: healthy.
- RevenueCat v2 production entitlement verification: blocked before provider
  access by absent `REVENUECAT_PROJECT_ID`.
- Premium entitlement allow/deny verification: incomplete.
- Coach Fact Context: dark and fail closed.
- Controlled account: not enrolled and not activated.

## 12. Remaining blocker

Configure the existing, non-secret `REVENUECAT_PROJECT_ID` value in the
production environment using the Calora RevenueCat project identifier already
approved for the repaired connector. Do not add a credential to source control
or chat. After configuration, rerun the read-only v2 project/customer/active
entitlement checks and both authenticated Premium Recipes allow/deny checks.
Continue to keep Coach Fact Context dark during that recheck.

POST-PUBLISH PRODUCTION VERDICT: BLOCKED