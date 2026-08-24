# Contextual Insights / Coach Fact Context Activation Readiness Report

## Final production activation preflight verdict

**BLOCKED — RELEASE NOT YET PUBLISHED**

The unsupported provider-attestation dependency has been removed from Calora's
controlled-pilot release boundary. Production remains deny-all because the
current reviewed release has not yet been published; no pilot activation is
authorized by this report.

## Supported release-verification model

The production release boundary now requires:

1. a clean reviewed Git checkout;
2. a production build explicitly bound to that exact reviewed commit;
3. compiled commit, tree, digest, timestamp, and release ID in `/api/version`;
4. canonical HTTPS checks for `/api/version` and `/api/healthz`; and
5. an exact comparison of the reviewed source identity with the live compiled
   identity before any runtime activation control is changed.

The production build fails closed when
`RELEASE_SENSITIVE_ACTIVATION_REQUESTED=true` is not paired with
`RELEASE_SENSITIVE_ACTIVATION_COMMIT` equal to its exact clean source commit.

Provider-signed final-package provenance remains optional defense in depth
against a stronger post-build artifact-replacement threat model. It is no
longer required for Calora's supported single-pilot activation path.

## Current source and live runtime

| Identity | Git commit | Git tree | Source digest |
| --- | --- | --- | --- |
| Current checked source before this release-preparation change | `47a6f0c804c67847b39b1c90c42f9c1d04d35ae6` | `6cfedff9a0cc30fe81b7424a7234e4a27eba5cd1` | `fed575cb86038550398e16b2e2e97b0595f5e29af2db42677a8b340859bc7072` |
| Current live production | `0dd2f5ab9755ddd8a4482b39292200da8df4801a` | `2bce932145cef18a3d50a4fe5b84df4297e6b5fd` | `481f82d9a34cd1da953961e752d08333eba651a89ec79a8c3e122b053ddf212e` |

**Source = live runtime: NO.**

The live API returned HTTP 200 from `/api/version` with the production identity
above and HTTP 200 from `/api/healthz`. The new identity verifier:

- passed when supplied the currently deployed identity; and
- failed closed when supplied the newer source identity.

This is the expected result before the normal Publish action.

## Implementation completed

- Removed the mandatory provider-attestation and external-signing dependency
  from the production build eligibility path.
- Added a build-time reviewed-commit binding for a sensitive release.
- Added `verify:release-identity`, which checks canonical HTTPS, rejects
  redirects, verifies health, and compares live compiled metadata exactly with
  the reviewed commit/tree/digest.
- Kept provider-package attestation tools available as optional future
  hardening.
- Updated the production artifact configuration and operator runbook for the
  supported Replit Publishing workflow.
- Preserved all Coach authorization, consent, cohort, rollout, rate-limit,
  nonce/replay, and Legacy Coach protections.

## Tests executed

| Check | Result |
| --- | --- |
| Provider package attestation and legacy release-verifier tests | 13 passed |
| Coach Fact Context regression suite | 71 passed |
| API TypeScript typecheck | passed |
| API development build | passed |
| Runtime identity verifier against current live release | passed |
| Runtime identity verifier against newer source versus older live release | failed closed as expected |
| API workflow restart | healthy |

## Production controls and runtime state

| Control | Result |
| --- | --- |
| Production health | HTTP 200 |
| Legacy Coach route | HTTP 404 |
| Fact Context route | HTTP 404 |
| Global Fact Context rollout | `false` |
| Active reviewed pilot memberships | `0` |
| Active Fact Context nonces | `0` |
| Unauthorized provider execution observed | none |
| Pilot activation | none |

Production logs for the reviewed interval show the legacy and Fact Context
routes returning 404 and no successful provider execution.

## Exact human action required

1. Ensure this release-preparation change is in a clean reviewed source
   checkout. Do not publish with an untracked prompt, uncommitted change, or
   unrelated source modification; the production build will stop safely.
2. Open **Publishing → Adjust settings → Production secrets**.
3. Set `RELEASE_SENSITIVE_ACTIVATION_REQUESTED` to exactly `true`.
4. Set `RELEASE_SENSITIVE_ACTIVATION_COMMIT` to the exact 40-character Git
   commit of the clean reviewed release being published.
5. Leave `COACH_FACT_CONTEXT_ENABLED` absent or set to a value other than
   `true`.
6. Click **Publish**. Do not change the database rollout flag, cohort, consent,
   nonce, or provider settings.
7. After the deployment reports healthy, provide the published release identity
   to the agent. The agent will run `verify:release-identity`, verify the
   deny-all production state, and then provide the separate one-pilot preflight.

Do not paste credentials, signing keys, session tokens, pilot identities, or
other private values into chat or source control.

## Rollback procedure

If the new deployment is unhealthy or its live identity does not exactly match
the reviewed release, stop before any activation control is changed and restore
the last healthy deployment through Publishing.

If a later separately authorized activation needs immediate rollback:

1. set `COACH_FACT_CONTEXT_ENABLED` to a value other than `true` or remove it;
2. confirm the global rollout value is `false`;
3. confirm active reviewed pilot membership count is `0`;
4. confirm the Fact Context route returns 404; and
5. verify production health.

## Files changed

- `artifacts/api-server/build.mjs`
- `artifacts/api-server/.replit-artifact/artifact.toml`
- `artifacts/api-server/package.json`
- `artifacts/api-server/src/routes/coachFactContext.ts`
- `scripts/verify-api-runtime-identity.mjs`
- `docs/COACH_FACT_CONTEXT_OPERATOR_CONTROL_PLANE.md`
- `docs/production/CONTEXTUAL_INSIGHTS_FINAL_ACTIVATION_READINESS_REPORT.md`

## Production changes made

None. Production release, process gate, rollout, cohort, consent, nonce, and
provider state remain unchanged.