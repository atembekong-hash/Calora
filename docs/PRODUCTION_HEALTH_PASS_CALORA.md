# Calora production health verification

**Verification date:** 2026-08-22  
**Scope:** Rerun of the post-publish production health verification after the
non-secret RevenueCat project identifier was configured. Coach Fact Context
remained dark throughout this work.

## Result at a glance

| Check | Result |
| --- | --- |
| Published deployment | Active public autoscale deployment; successful build |
| API base health | `GET /api` returned `200 {"status":"ok"}` |
| Explicit health | `GET /api/healthz` returned `200 {"status":"ok"}` |
| Normal recipes | `GET /api/v1/recipes?limit=1` returned `200` |
| RevenueCat v2 project and entitlement configuration | Pass |
| RevenueCat v2 customer and active-entitlement reads | Pass |
| Entitled Premium Recipes path | Authenticated `200` |
| Anonymous Premium Recipes path | Correct `401` |
| Authenticated non-entitled Premium Recipes path | Not verified |
| Coach Fact Context | Still dark; no rollout state changed |

## Deployment and health

- Validated deployed revision: `a47782a81531f90010a5001d55665606e2804b31`.
- Deployment metadata reports an active public autoscale deployment with a
  successful build.
- The public API base route and explicit health route each returned `200` with
  the expected minimal `{"status":"ok"}` response.
- A normal recipe listing returned `200`, confirming the public API is serving
  beyond its dependency-free health response.

## RevenueCat v2 verification

`REVENUECAT_PROJECT_ID` is now configured in the production runtime. Its value
was treated as non-secret configuration and is intentionally not repeated in
this report.

Read-only requests through the existing authenticated RevenueCat connection
passed:

1. RevenueCat project listing returned `200` and contained the configured
   Calora project.
2. Project entitlement listing returned `200` and contained the stable
   `caloraapp_pro` lookup key.
3. Project customer listing returned `200`.
4. Active-entitlement reads returned `200` for all 41 listed customers.
5. Exactly one customer had the resolved Premium entitlement; 40 did not.

No RevenueCat customer, entitlement identifier, credential, token, or response
body was written to logs or this report.

## Premium Recipes authorization behavior

### Entitled allow path

The one active RevenueCat customer was securely correlated to its existing
controlled Supabase test account without exposing the account identifier. That
account authenticated using an existing approved test fixture and
`GET /api/v1/premium-recipes?limit=1` returned `200`.

This confirms the live sequence:

1. Supabase bearer-token verification;
2. RevenueCat v2 entitlement lookup;
3. Premium entitlement recognition; and
4. Premium Recipes access.

The entitled check did not return `401` or `503`.

### Anonymous boundary

An anonymous request to Premium Recipes returned the expected `401` sign-in
response before entitlement work.

### Authenticated non-entitled deny path

An authenticated production request for a known non-entitled controlled account
could not be completed. The available test-credential fixtures authenticate the
entitled account, while the older documented QA fixture did not authenticate
and no mapped non-entitled controlled credential is available in this
environment.

Therefore, the required live `403` assertion is **not** substituted with the
anonymous `401`, a local test, or a synthetic account. The route's local
regression coverage still verifies `403` for an authenticated account without
the entitlement, but production deny behavior remains incomplete.

The dedicated follow-up record is
`docs/NON_PREMIUM_DENY_PROOF_CALORA.md`. It confirms that no explicitly
designated non-entitled controlled account is available in the current
verification materials, so no undesignated customer or broken fixture was used.

## Runtime logs

- Deployment logs include `500` health-probe entries during process startup,
  before the API server reported its port and before the service settled.
- The current public `/api` and `/api/healthz` checks are both healthy at
  `200`.
- No deployment log entry matched:
  - `Invalid API Key`;
  - `premium entitlement verification unavailable`; or
  - a Premium Recipes entitlement `503`.

The startup probe observations should remain visible in release monitoring, but
they do not contradict the subsequent successful live health checks.

## Coach Fact Context dark-state boundary

No Coach Fact Context configuration, rollout membership, consent record, nonce,
process-gate value, provider request, or account enrollment was created or
modified during this verification.

The deployed Fact Context route returned `404` to an empty unauthenticated
request, consistent with the unavailable/dark path. The existing frozen
allowlist remains unchanged. This verification did not authorize or perform a
controlled activation.

## Remaining requirement

Use the existing approved non-entitled internal test account and its mapped
credential to make one authenticated request to
`GET /api/v1/premium-recipes?limit=1`. It must return `403`, not `401`, `200`,
or `503`. Record only the status and outcome; do not put account identifiers,
passwords, or access tokens into logs or this report.

POST-PUBLISH PRODUCTION VERDICT: BLOCKED