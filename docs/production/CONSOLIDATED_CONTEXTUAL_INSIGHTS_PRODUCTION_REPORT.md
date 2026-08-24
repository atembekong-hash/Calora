# Consolidated Contextual Insights Production Readiness Report

## Executive verdict

**PRODUCTION RELEASE VERIFICATION: BLOCKED**

The unsupported provider-package attestation dependency has been removed from
Calora's controlled-pilot release path. The remaining blocker is the normal
release step: the current reviewed source has not yet been published, so the
live production runtime is still an older release.

No production activation occurred. Fact Context remains deny-all.

## Current source and live runtime

| Identity | Git commit | Git tree | Source digest |
| --- | --- | --- | --- |
| Current checked source before release-preparation changes | `47a6f0c804c67847b39b1c90c42f9c1d04d35ae6` | `6cfedff9a0cc30fe81b7424a7234e4a27eba5cd1` | `fed575cb86038550398e16b2e2e97b0595f5e29af2db42677a8b340859bc7072` |
| Current live production | `0dd2f5ab9755ddd8a4482b39292200da8df4801a` | `2bce932145cef18a3d50a4fe5b84df4297e6b5fd` | `481f82d9a34cd1da953961e752d08333eba651a89ec79a8c3e122b053ddf212e` |

**SOURCE = LIVE RUNTIME: NO**

The live API reports release ID
`calora-api-0dd2f5ab9755-20260824043415112` and build timestamp
`2026-08-24T04:34:15.112Z`.

## Supported release-verification model

Calora's supported controlled-pilot release boundary requires:

1. A clean reviewed Git checkout.
2. A production build explicitly bound to that reviewed commit.
3. Compiled commit, source tree, source digest, timestamp, and release ID in
   the live `/api/version` response.
4. Canonical HTTPS checks for both `/api/version` and `/api/healthz`.
5. An exact source-to-live comparison before any Fact Context runtime gate can
   be enabled.

The production build compiles sensitive-release eligibility only when:

- `RELEASE_SENSITIVE_ACTIVATION_REQUESTED` is exactly `true`; and
- `RELEASE_SENSITIVE_ACTIVATION_COMMIT` exactly matches the production build's
  clean Git commit.

The process gate, database rollout flag, reviewed cohort membership, account
eligibility, consent, rate protection, nonce/replay handling, and legacy-route
retirement remain independent runtime requirements.

## Provider package attestation

**UNSUPPORTED ATTESTATION DEPENDENCY: REMOVED**

Provider-signed final-package attestation is optional defense in depth for the
stronger threat model of post-build package replacement. It is not required for
Calora's supported single-pilot release path because Replit Publishing does not
provide the needed atomic stage → attest → deploy capability.

The provider-attestation verifier and its tests remain available for a future
environment that can supply those records.

## Implementation completed

- Replaced the mandatory provider-attestation release gate with a supported,
  commit-bound production build model.
- Added `verify:release-identity`, a deterministic verifier for reviewed
  commit/tree/digest versus canonical live HTTPS metadata and health.
- Updated the API production artifact configuration.
- Updated the operator runbook for the supported Replit Publishing workflow.
- Preserved all existing Coach Fact Context safety and authorization controls.

## Tests and validation

| Check | Result |
| --- | --- |
| Provider package attestation and legacy release-verifier tests | 13 passed |
| Coach Fact Context regression suite | 71 passed |
| API TypeScript typecheck | passed |
| API development build | passed |
| Runtime identity verifier using current live identity | passed |
| Runtime identity verifier using newer source against older runtime | failed closed as expected |
| API development workflow after restart | healthy |

The release-identity verifier requires canonical HTTPS, rejects redirects,
checks `/api/version` and `/api/healthz`, and fails when the live compiled
commit, tree, or digest does not equal the reviewed source.

## Production state at verification

| Control | Result |
| --- | --- |
| Deployment health | healthy; `/api/healthz` returned HTTP 200 |
| Legacy Coach route | `POST /api/v1/coach/respond` returned HTTP 404 |
| Fact Context route | `POST /api/v1/coach/fact-context/respond` returned HTTP 404 |
| Global Fact Context rollout | `false` |
| Active reviewed pilot memberships | `0` |
| Active Fact Context nonces | `0` |
| Unauthorized provider execution observed | none |
| Pilot activation | none |

Production logs for the verification window show both Coach routes returning
404 and no successful Fact Context provider execution.

## Exact owner-controlled release procedure

1. Ensure the release source is clean and reviewed. Do not publish with an
   untracked prompt, uncommitted source change, or unrelated modification.
2. Open **Publishing → Adjust settings → Production secrets**.
3. Set `RELEASE_SENSITIVE_ACTIVATION_REQUESTED` to exactly `true`.
4. Set `RELEASE_SENSITIVE_ACTIVATION_COMMIT` to the exact 40-character Git
   commit of the clean reviewed release to publish.
5. Leave `COACH_FACT_CONTEXT_ENABLED` absent or set it to a value other than
   `true`.
6. Click **Publish** and wait for the deployment health check to succeed.
7. Run the release-identity verifier against the published origin:

   ```sh
   pnpm --filter @workspace/api-server run verify:release-identity -- \
     --git-commit "<reviewed 40-character commit>" \
     --source-tree "<reviewed 40-character tree>" \
     --source-digest "<reviewed SHA-256 digest>" \
     --live-url "https://<published-api-origin>"
   ```

8. Verify production health, both route 404 responses while the process gate is
   off, global rollout `false`, zero active reviewed pilots, and zero active
   nonces.
9. Only after that release verification is successful may a separately approved
   controlled-pilot preflight be considered. This report does not authorize
   pilot activation.

Do not paste signing keys, session tokens, credentials, pilot identities, or
other private values into chat or source control.

## Rollback procedure

For a failed deployment or identity mismatch, restore the last healthy
deployment in Publishing before changing any activation control.

For a later separately authorized activation rollback:

1. Remove `COACH_FACT_CONTEXT_ENABLED` or set it to any value other than
   `true`.
2. Set the global Fact Context rollout value to JSON boolean `false`.
3. Remove or expire all active reviewed pilot memberships.
4. Verify the Fact Context route returns HTTP 404.
5. Verify zero active nonces and healthy production status.

## Final readiness

**CONTEXTUAL INSIGHTS READY FOR ACTIVATION: NO**

The app is ready for the owner-controlled release-verification step, but not
for Fact Context activation until the newly published release has passed the
exact identity and deny-all preflight checks.

## Related reports

- `docs/production/TASK_503_CURRENT_RELEASE_REATTESTATION_REPORT.md`
- `docs/production/CONTEXTUAL_INSIGHTS_FINAL_ACTIVATION_READINESS_REPORT.md`
- `docs/contextual-insights/CONTEXTUAL_INSIGHTS_FINAL_COMPLETION_REPORT.md`