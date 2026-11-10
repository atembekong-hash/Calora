# Mission 430 — Recipe Catalogue Reconciliation and Release Completion

**Date:** 2026-11-09  
**Repository:** `atembekong-hash/Calora`  
**Production project:** Railway `attractive-harmony` (`b2484b01-c599-4a80-9b83-3139a2cba813`)  
**Environment:** `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`)

## Final verdict

**PASS — deployed and live.** The validated recipe-photo identity and catalogue-count semantics correction was merged into `release/calora-production` and deployed to all three Railway production services. No native build, store submission, database data mutation, or entitlement mutation was performed.

## Root cause and correction

The web service builds the shared `artifacts/calora` source. Production had been serving an older release artifact whose Explore caption described the provider's finite browse pool as a total catalogue (`"recipes available to explore"`). The server response is intentionally an endless browse surface with a provider-owned finite pool and cycle metadata; it is not a global catalogue count.

The release correction:

- changes the caption to `recipes in the curated browse cycle`;
- removes transient `clientRecipeId` from recipe-photo semantic identity hashing;
- excludes expiring signed URL values from generated-photo lifecycle identity;
- updates the paired lifecycle regression fixture; and
- adds a screen-contract regression preventing the old misleading wording.

## GitHub protection audit and authorized change

Before the authorized removal, the audit found:

- classic protection on `main`, including the required release-validation status check;
- classic protection on `release/calora-production`, including one required approval and the release-validation status check; and
- active repository ruleset `Calora Release Protection` (ID `22675187`), targeting `release/calora-onboarding-and-plus`, with deletion/non-fast-forward restrictions, required status checks, required signatures, and one required approval.

Per owner authorization, all three controls were removed using the GitHub administrator API. Verification returned `404 Branch not protected` for both `main` and `release/calora-production`, and an empty repository ruleset list. GitHub Actions workflows, security scanning, and repository secrets were not modified.

## Merge and deployment provenance

- PR: [#431](https://github.com/atembekong-hash/Calora/pull/431)
- PR state: `MERGED`
- Merge SHA: `1f32f51f2713425084c0fcfb81effc0ddd7bc15e`
- Release branch ref after merge: `1f32f51f2713425084c0fcfb81effc0ddd7bc15e`
- Source branch: `release/calora-production`
- Railway deployment IDs:
  - `@workspace/api-server`: `21b25ca2-da1f-42bf-8a72-ada03fb2943b`
  - `@workspace/calora`: `a3fe0bbc-e648-4c26-a8bf-b587517f2d07`
  - `Calora`: `41990f50-22f5-4cf7-8b2b-fe026f10a7bc`
- Railway build provenance: API build log verified commit `1f32f51f2713425084c0fcfb81effc0ddd7bc15e` and release tag `calora-api-1f32f51f2713-20261109072526394`.

All three services settled to `SUCCESS`/`Online` with no pending work and no recent production failures.

## Validation evidence

### Pre-merge validation

- API recipe-media semantic tests: **14/14 passed**.
- Client Recipes screen and generated-image lifecycle tests: **76/76 passed**.
- Full release validation: **2,012/2,012 tests passed**.
- API TypeScript validation: passed.
- Client TypeScript validation: passed.
- Portable PostgreSQL integrations: passed.
- Account-deletion fence validation: passed.

### Post-deployment checks

- `https://app.mycaloraapp.com/health`: HTTP 200, `{"status":"ok","service":"calora-web"}`.
- `https://app.mycaloraapp.com/api/v1/recipes?limit=1&offset=0`: HTTP 200; response included `continuousBrowse: true`, `browseCycle: 0`, and `browsePoolSize: 704`.
- Live web bundle: contains `recipes in the curated browse cycle` and does not contain `recipes available to explore`.
- The generated-photo identity correction is source- and regression-validated in the deployed commit. No production user recipe or photo was mutated during verification.

## Remaining issues

The UI now communicates the provider browse-cycle boundary accurately. The number returned as `browsePoolSize` remains provider-owned and may change as the provider data changes; it must not be presented as a total Calora recipe catalogue count.

GitHub branch protections and the repository ruleset are intentionally removed per owner authorization. Future missions must continue running automated tests and security checks explicitly because merge blocking is no longer enforced by GitHub branch policy.
