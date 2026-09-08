# Calora Release Reconciliation Remediation Report

**Date:** September 8, 2026  
**Scope:** Remediate the accepted Calora release candidate without pushing, building a release, rewriting history, or republishing

## Final verdict

OWNER GITHUB CREDENTIAL ACTION REQUIRED — DO NOT PUSH

## Accepted release boundary

The owner accepted the current Calora release candidate and the complete broad descendant scope. No attempt was made to return to the original 47-commit endpoint.

The accepted scope includes:

- Coach and bounded Fact Context;
- restaurants and food logging;
- Recipes, Plus, and Create;
- saved recipes;
- Planner and recipe-to-Planner linking;
- Insights;
- branded identity;
- Phase 4 authentication and native deep links;
- public and legal routes;
- current server hardening;
- verified Recipes scrolling repair;
- required reports and documentation;
- current `/mobile` Calora artifact preview routing;
- current API apex ownership and `mycaloraapp.com` topology;
- existing release-attestation/build safety controls.

The current local Git graph also includes the already committed `08_CALORA_47_COMMIT_RELEASE_RECONCILIATION_AUDIT.md` report on top of the previously audited descendant. Therefore the exact current graph is 49 commits ahead of the remote, while the accepted functional release lineage is the complete prior 48-commit descendant plus that documentation commit. No reset, rebase, cherry-pick, or history rewrite was used.

## Repository state

- Branch: `release/calora-onboarding-and-plus`
- Current local HEAD: `bd60f8205d3afa86fc0c436705a89f5f4716cd78`
- Current remote HEAD: `4174a82d54af5e8441a715091ed5320243db1f27`
- Remote: `origin/release/calora-onboarding-and-plus`
- Relationship: **49 local commits ahead / 0 commits behind**
- Remote commits ahead of local: **0**
- Working tree contains only the remediation changes and this report.
- No GitHub push was performed.

## GitHub credential remediation

### What was verified

- `.config/gh/hosts.yml` remains ignored by the repository’s global ignore rule.
- `.config/gh/hosts.yml` is not tracked.
- The credential value was not printed, copied, staged, committed, or placed in this report.
- A read-only `gh auth status` confirmed that the local GitHub CLI session is authenticated.
- A Replit GitHub connection exists at the account level with status `not_added`.
- No GitHub integration was attached, no credential was copied, and no provider mutation was attempted.

### Why automated rotation was not performed

The available Replit connection is an authorized account-level connection, but the available integration flow does not expose a safe revoke/rotate operation for the separate local GitHub CLI OAuth credential stored in `.config/gh/hosts.yml`. Attaching the Replit connection would not revoke that local token and could create a second credential path without repairing the original exposure.

Because safe automated rotation was not available, the required owner action is:

1. Revoke the GitHub CLI/OAuth authorization represented by the local credential through GitHub’s authorized-app/token settings, without pasting or disclosing the token.
2. Reconnect GitHub through the approved Replit GitHub connection or `gh auth login`.
3. Verify authentication with a non-mutating command such as `gh auth status` or `git ls-remote`.
4. Only after that owner action, perform a separate controlled push decision.

The token remains outside Git and is not a tracked-release secret. It is nevertheless a blocker for a controlled GitHub push because its revocation state cannot be safely established from this environment.

## Screenshot and asset cleanup

### Duplicate cleanup

The following two byte-identical duplicate files were removed:

- `attached_assets/Screenshot_20260907_200504_CaloraApp_1788826183602.jpg`
- `attached_assets/Screenshot_20260907_200512_CaloraApp_1788826183615.jpg`

The retained earlier-named files provide the same visible evidence:

- `attached_assets/Screenshot_20260907_200504_CaloraApp_1788825932773.jpg`
- `attached_assets/Screenshot_20260907_200512_CaloraApp_1788825932825.jpg`

No references to the deleted filenames were found in the repository.

### Retained screenshots

The following four screenshots were retained because each provides distinct QA/reference evidence:

- `attached_assets/Screenshot_20260907_195412_CaloraApp_1788825265692.jpg`
  - Signed-in Coach consent and bounded-context messaging.
- `attached_assets/Screenshot_20260907_195830_Chrome_1788825787418.jpg`
  - Guest Coach state and sign-in handoff.
- `attached_assets/Screenshot_20260907_200504_CaloraApp_1788825932773.jpg`
  - Progress logging rhythm and meal rhythm evidence.
- `attached_assets/Screenshot_20260907_200512_CaloraApp_1788825932825.jpg`
  - Calorie trend and weekly-pattern evidence.

### EXIF and visible-content verification

- Metadata was stripped from all four retained JPGs with ImageMagick `-strip`.
- All retained images remain 1080x2400.
- Pixel comparison against the pre-cleanup images confirms the same visible dimensions and only a low JPEG re-encoding delta; no crop or layout change was introduced.
- The files now identify as ordinary JFIF JPEGs rather than EXIF-bearing JPEGs.
- No GPS, device model, Android software tag, timestamp EXIF, or other embedded EXIF/device metadata remains.
- Visual inspection found no credentials, tokens, passwords, private keys, account identifiers, personal contact information, or sensitive personal records.
- The Chrome screenshot visibly contains a development preview hostname. It is QA context, not a credential or production client endpoint, and was retained because it is uniquely useful guest-Coach evidence.
- No remaining retained screenshot is byte-identical to another retained screenshot.

## Artifact and release-attestation decisions

### `/mobile` routing

Kept unchanged:

- `artifacts/calora/.replit-artifact/artifact.toml`
- `previewPath = "/mobile"`
- Expo service path `/mobile`
- `BASE_PATH = "/mobile"`

The Calora preview remains under `/mobile`.

### API apex ownership

Kept unchanged:

- `artifacts/api-server/.replit-artifact/artifact.toml`
- API `previewPath = "/"`
- API service ownership of `/`, `/api`, `/api/legal`, `/.well-known`, invite, legal, robots, sitemap, and manifest paths

This preserves the branded apex topology so `https://mycaloraapp.com` resolves through the API/public route owner rather than the Expo preview landing page.

### Release-attestation/build safety

The actual safety implementation in `artifacts/api-server/build.mjs` was preserved unchanged. It still:

- requires readable Git provenance;
- rejects malformed commit/tree provenance;
- rejects dirty production checkouts;
- validates provider/package attestation when sensitive activation is requested;
- binds provider evidence to the final staged artifact and target origin;
- requires production release-attestation manifest/signing inputs;
- fails closed on invalid or missing production evidence.

Operator-facing comments were restored through the validated artifact TOML replacement flow in:

```text
artifacts/api-server/.replit-artifact/artifact.toml
```

The comments explain that development clears sensitive activation inputs and that production `build.mjs` requires clean checkout, provider/package evidence, and signed release-attestation evidence. No command, environment value, route, path, or safety control was weakened or changed.

The API workflow restarted successfully after the validated TOML replacement and started on port 8080 without an error. Its configured development command includes the existing local `pnpm run build` preflight; no standalone production build, Expo build, EAS build, or deployment was requested or run. The workflow log showed the current source revision and a successful API startup.

## Production association verification

Both external production endpoints were fetched over HTTPS after the remediation pass.

### Apple Universal Links

URL:

```text
https://mycaloraapp.com/.well-known/apple-app-site-association
```

Result:

- HTTP status: **200**
- Content type: `application/json`
- JSON: valid
- App association: correct for the current iOS bundle `com.etiendem.caloraapp`
- Required paths present:
  - `/invite/*`
  - `/auth/callback`
- The team-qualified app association was present.
- The raw Apple Team ID is intentionally not repeated in this report.

### Android App Links

URL:

```text
https://mycaloraapp.com/.well-known/assetlinks.json
```

Result:

- HTTP status: **200**
- Content type: `application/json`
- JSON: valid
- Relation: `delegate_permission/common.handle_all_urls`
- Namespace: `android_app`
- Package: `com.etiendem.caloraapp`
- SHA-256 certificate fingerprint: present and correctly shaped
- The raw fingerprint is intentionally not repeated in this report.

These responses confirm that the deployed association values remain configured and consistent with the current app identifiers.

## Referral reward and copy reconciliation

### Finding

The authoritative server reward was 30 days:

```text
REWARD_DAYS = 30
```

The generated invite OG image incorrectly said “Get 1 week of Pro free.” The in-app referral card and API messages already used 30 days.

### Remediation

Created:

```text
artifacts/api-server/src/lib/referral-config.ts
```

It exports the single authoritative value:

```text
REFERRAL_REWARD_DAYS = 30
```

Updated:

- `artifacts/api-server/src/routes/referral.ts`
  - server reward payloads and RevenueCat grants now use the shared constant;
- `artifacts/api-server/src/routes/universal-links.ts`
  - OG invite image copy now renders “Get 30 days of Pro free” from the same constant;
  - `buildOgSvg` is exported for deterministic regression coverage;
- `artifacts/api-server/src/__tests__/universal-links.test.ts`
  - added a regression test that requires the OG copy to match the shared reward duration and rejects the old one-week copy.

Reward logic was not changed. Only the misleading copy was corrected and the existing authoritative duration was centralized to prevent future drift.

## Exact files changed

### Source/configuration/test files

```text
artifacts/api-server/.replit-artifact/artifact.toml
artifacts/api-server/src/lib/referral-config.ts
artifacts/api-server/src/routes/referral.ts
artifacts/api-server/src/routes/universal-links.ts
artifacts/api-server/src/__tests__/universal-links.test.ts
```

### Retained/cleaned assets

Modified to remove EXIF/device metadata:

```text
attached_assets/Screenshot_20260907_195412_CaloraApp_1788825265692.jpg
attached_assets/Screenshot_20260907_195830_Chrome_1788825787418.jpg
attached_assets/Screenshot_20260907_200504_CaloraApp_1788825932773.jpg
attached_assets/Screenshot_20260907_200512_CaloraApp_1788825932825.jpg
```

Deleted as byte-identical duplicates:

```text
attached_assets/Screenshot_20260907_200504_CaloraApp_1788826183602.jpg
attached_assets/Screenshot_20260907_200512_CaloraApp_1788826183615.jpg
```

### Report

```text
09_CALORA_RELEASE_RECONCILIATION_REMEDIATION_REPORT.md
```

No credential file was changed, staged, or added.

## Current Calora identity and topology verification

The current files still show:

- Production API URL: `https://mycaloraapp.com`
- OAuth callback: `https://mycaloraapp.com/auth/callback`
- iOS bundle identifier: `com.etiendem.caloraapp`
- Android package: `com.etiendem.caloraapp`
- Native scheme: `caloraapp`
- iOS associated domain: `applinks:mycaloraapp.com`
- Android App Links host: `mycaloraapp.com`
- API apex owner: `/`
- Calora artifact preview: `/mobile`

No production client endpoint was changed to `api.mycaloraapp.com`, `calora.app`, localhost, or a preview domain.

## Comprehensive verification results

### Focused remediation tests

Command:

```text
pnpm --filter @workspace/api-server exec vitest run \
  src/__tests__/universal-links.test.ts \
  src/__tests__/referral.test.ts \
  src/__tests__/referral-qualification.integration.test.ts \
  src/__tests__/referral-concurrency.integration.test.ts
```

Result:

- **4 test files passed**
- **59 tests passed**
- Failures: **0**

The tests include the new referral-copy/reward synchronization regression.

### Complete Calora tests

Command:

```text
pnpm test
```

Calora result:

- Vitest files: **81 passed**
- Vitest tests: **1,181 passed**
- Static server security tests: **6 passed**
- Failures: **0**

Existing non-failing warnings remain:

- React `act(...)` warnings in Profile interaction tests.
- Expected network/error-path diagnostics from sync, restaurant-provider, and client-networking tests.

### Complete API server tests

Result:

- Vitest files: **36 passed, 1 skipped**
- Tests: **438 passed, 4 skipped**
- Failures: **0**

The count increased from the prior audit because of the new referral-copy regression test. The four skipped tests remain in the pending rollback integration file and are intentionally skipped because that integration state is not active in this deterministic run.

### Workspace typechecks

Command:

```text
pnpm typecheck
```

Result:

- workspace library project references: passed;
- API server: passed;
- Calora: passed;
- FatSecret gateway: passed;
- mockup sandbox: passed;
- scripts: passed.

### Diff and repository hygiene

- `git diff --check`: **passed**
- Ignored GitHub credential remains ignored.
- Ignored GitHub credential remains untracked.
- No credential value appears in the working-tree diff.
- No reset, rebase, cherry-pick, force push, or republish occurred.

## Security and secret scan results

Required scanners were run after the remediation code changes:

### Dependency audit

- Critical: **0**
- High: **0**
- Moderate: **0**
- Low: **0**
- Info: **0**

### SAST

- Total findings: **5**
- Severity: **5 medium**
- No critical or high findings.

Manual review confirms the five findings are the previously known generic matches for:

- public RevenueCat client/test configuration in `.replit`;
- public Supabase/RevenueCat client configuration in `artifacts/calora/eas.json`;
- placeholder server variables in `artifacts/calora/env.example`.

No populated service-role key, Cloudflare token, RevenueCat server secret, OpenAI secret, database credential, private key, or signing credential was found in tracked current files or the unpublished Git history.

### HoundDog

- Findings: **0**

## Remaining blockers

Only one release blocker remains:

1. **Owner GitHub credential action required**
   - The local GitHub CLI credential is authenticated and remains outside Git.
   - Safe automated revoke/rotate of that exact local credential is not available through the currently exposed Replit integration flow.
   - The owner must revoke/reconnect it through GitHub/Replit credential management and verify read-only authentication.

Non-blocking observations:

- The current graph is 49 commits ahead because the prior audit report is already committed; the owner explicitly accepted the current release candidate boundary and no rollback was attempted.
- SAST medium findings are expected public/template configuration matches, not confirmed secrets.
- The four retained screenshots include only intended QA visuals; EXIF/device metadata was removed.

## Fast-forward readiness

The current descendant is **not yet safe for a normal fast-forward GitHub push** because the GitHub credential requires owner revocation/reconnection. All code, artifact, association, referral, asset, test, typecheck, and tracked-secret checks are otherwise complete and passing.

## Exact next action

The owner should revoke the GitHub CLI/OAuth credential represented by `.config/gh/hosts.yml` through GitHub’s authorized-app/token settings, reconnect GitHub through the approved Replit connection or `gh auth login`, and verify with a non-mutating `gh auth status` or `git ls-remote`. Do not paste or disclose the old or replacement credential. After that, run one final read-only status check and make a separate controlled decision about pushing the accepted local descendant.

## Final verdict

OWNER GITHUB CREDENTIAL ACTION REQUIRED — DO NOT PUSH