# Calora 47-Commit Release Candidate Reconciliation Audit

**Date:** September 8, 2026  
**Scope:** Read-only audit of the complete local descendant state before any GitHub sync or native build  
**Actions prohibited and not performed:** push, build, Expo/EAS, reset, rebase, cherry-pick, history rewrite, republish, DNS, Cloudflare, Supabase, RevenueCat, Apple, Google, authentication, deep-link, and production-infrastructure changes

## Final verdict

RECONCILIATION REQUIRED — DO NOT PUSH

## Executive summary

The supplied context described a 47-commit local descendant. The actual current repository after refreshing the remote is **48 commits ahead**, because the previous sync report itself was committed as `11bc56c`. That extra commit is documentation-only, but it means the current release candidate is not literally the stated 47-commit state.

The underlying final filesystem is substantially coherent and the comprehensive deterministic checks pass:

- Calora: **81 test files passed, 1,181 tests passed**
- API server: **36 test files passed, 1 skipped; 437 tests passed, 4 skipped**
- Calora, API server, FatSecret gateway, mockup sandbox, scripts, and workspace library typechecks: **passed**
- Dependency audit: **0 vulnerabilities**
- HoundDog privacy/security scan: **0 findings**
- SAST: **5 medium generic hard-coded-secret pattern findings**, all attributable to public client configuration or intentional example/template values after manual review
- `git diff --check`: **passed**

The final code has legitimate current Calora work across Coach, Recipes/Plus, saved recipes, restaurants/food logging, Planner, recipe-to-Planner linking, Insights, branded identity, auth/deep links, public pages, and server hardening. Restore commits were proven tree-neutral against their stated targets, and all six `Published your App` commits are empty deployment markers.

The candidate is not yet approved for a normal fast-forward push because:

1. The actual current candidate is 48 unpublished commits, not the requested 47.
2. The range contains a broad historical release delta, so the owner must explicitly accept the full feature/documentation/asset scope rather than treating it as only Phase 4 plus the Recipes fix.
3. The ignored workspace file `.config/gh/hosts.yml` contains a live-looking GitHub OAuth credential. It is not tracked and is absent from Git history, but it must be revoked/rotated before any GitHub operation.
4. Six newly added screenshots include device/software EXIF metadata and duplicate image pairs; they appear intentional QA references but need explicit publication/privacy acceptance.
5. Artifact routing and release-attestation configuration are coherent with the current source, but their deployment implications should be explicitly reconciled before publishing the large historical range.

No release push or build is authorized by this audit.

## Repository state audited

- Branch: `release/calora-onboarding-and-plus`
- Local HEAD: `11bc56c3519263cabd7fc4bc395ee7e245ea4153`
- Remote: `https://github.com/atembekong-hash/Calora.git`
- Upstream: `origin/release/calora-onboarding-and-plus`
- Remote HEAD: `4174a82d54af5e8441a715091ed5320243db1f27`
- Merge-base: `4174a82d54af5e8441a715091ed5320243db1f27`
- Ahead/behind: **480**, meaning **48 ahead / 0 behind**
- Remote divergence: none
- Working tree before this report: clean
- Current unpublished commit count: **48**

The original 47-commit candidate ends at `9d02f9c`. Current HEAD adds:

```text
11bc56c Add final Calora GitHub sync report
```

This changes documentation only and does not alter runtime code, configuration, assets, or tests.

## Complete unpublished commit inventory

The following table covers all 48 commits in the actual current local descendant. “Survives” describes the effective final filesystem at current HEAD, not whether the exact intermediate tree remains.

| # | Commit | Purpose and changed area | Effective current-HEAD result | Classification |
|---:|---|---|---|---|
| 1 | `9b069b3` | Mission 03 GitHub sync report | Documentation remains; no runtime effect | Documentation/asset only |
| 2 | `e35188a` | Restaurant screen, food thumbnail, food-memory tests | Restaurant/food functionality remains in current source and tests | Legitimate current release state |
| 3 | `0ba0ef5` | Coach screen implementation update | Coach changes survive in final Coach path | Legitimate current release state |
| 4 | `1c1fdc7` | Follow-up Coach implementation update | Superseded in details by later Coach refactor, but final Coach feature remains | Legitimate current release state |
| 5 | `1e34dd3` | Guest Coach extraction and tests | `guestCoach.ts` and its tests survive; safety boundary remains explicit | Legitimate current release state |
| 6 | `aea8ea6` | Coach UI plus reference screenshot | Coach UI survives; screenshot is reference material | Legitimate current release state; asset portion documentation/asset only |
| 7 | `52ca6be` | Coach UI plus browser screenshot | Coach UI survives; screenshot is reference material | Legitimate current release state; asset portion documentation/asset only |
| 8 | `4947967` | Calora screenshot assets | Assets survive and are QA/reference material | Documentation/asset only |
| 9 | `af116c7` | Additional Calora screenshot assets | Assets survive and are QA/reference material | Documentation/asset only |
| 10 | `1fa9b29` | Insights dashboard layout and logic | Insights changes survive in current screen | Legitimate current release state |
| 11 | `da16da5` | Saved recipes logic | Saved-recipes behavior survives | Legitimate current release state |
| 12 | `21170cf` | Saved recipes refactor | Refactored saved-recipes behavior survives | Legitimate current release state |
| 13 | `3536d9c` | Telegram screenshot | Deleted by later restore sequence; no final asset effect | Superseded/neutralized |
| 14 | `47148f1` | Recipe-to-Planner linking | Linking implementation and tests survive | Legitimate current release state |
| 15 | `16d342d` | Planner/Recipes refactor and tests | Current Planner/Recipes structure derives from this line | Legitimate current release state |
| 16 | `df3a383` | Chrome screenshot | Deleted by later restore sequence | Superseded/neutralized |
| 17 | `5c2d538` | Recipe screen and Planner integration | Final current files retain the resulting feature work where not later restored | Legitimate current release state |
| 18 | `a99e35b` | Restore to `df3a383` | Commit tree is identical to its stated target; no unique surviving change | Superseded/neutralized |
| 19 | `e741ff3` | Three screenshot assets | Those assets were later deleted by `bf364fe` | Superseded/neutralized |
| 20 | `bf364fe` | Restore to `16d342d` | Commit tree is identical to its stated target; removes the preceding screenshot-only delta | Superseded/neutralized |
| 21 | `923561b` | Additional Recipes screen/tests update | Resulting Recipes behavior remains in final source, later refined by the scroll repair | Legitimate current release state |
| 22 | `079f506` | Restore to `21170cf` | Commit tree is identical to its stated target; neutralizes preceding transient Planner/asset changes | Superseded/neutralized |
| 23 | `5a35f5e` | Recipe rate limiting, UI, and documentation | Current API rate limits and associated tests survive | Legitimate current release state |
| 24 | `be00904` | Brand identity inventory audit metadata | Report/reference material only | Documentation/asset only |
| 25 | `5911158` | Identity inventory report | Report only | Documentation/asset only |
| 26 | `b691f8c` | Official metadata specification | Report/specification only | Documentation/asset only |
| 27 | `e03d66c` | Branded identity and native/runtime configuration | Current branded identity, native IDs, API origin, auth/referral URLs, and public routing derive from this state | Legitimate current release state |
| 28 | `6b406be` | Metadata report revision | Report only | Documentation/asset only |
| 29 | `dfe4344` | Cloudflare domain foundation report | Report only; no current DNS mutation | Documentation/asset only |
| 30 | `c9e6ee2` | Replit production restore report and memory | Documentation/memory; no unique runtime hazard found | Documentation/asset only |
| 31 | `2a8053c` | Published your App | Empty commit; no changed paths | Documentation/asset only |
| 32 | `dcf5108` | API artifact configuration revision | Superseded by the later API artifact configuration | Superseded/neutralized |
| 33 | `8d53648` | Published your App | Empty commit; no changed paths | Documentation/asset only |
| 34 | `fb936df` | Production restore report revision | Report only | Documentation/asset only |
| 35 | `b896d82` | Branded-domain report and source reference asset | Report/reference only | Documentation/asset only |
| 36 | `f0b3260` | Published your App | Empty commit; no changed paths | Documentation/asset only |
| 37 | `ef22550` | API/mobile artifact configuration | Current artifact routing derives from this later configuration | Legitimate current release state; requires deployment acceptance |
| 38 | `e8511bd` | Published your App | Empty commit; no changed paths | Documentation/asset only |
| 39 | `e371112` | Branded-domain report and apex artifact-routing memory | Documentation/memory; records the intended API ownership of `/` | Documentation/asset only |
| 40 | `bb9873b` | Branded-domain connection report revision | Report only | Documentation/asset only |
| 41 | `142dc1f` | Pasted Phase 4 request/config reference | Reference text only | Documentation/asset only |
| 42 | `9c83c3d` | Universal Links/auth callback implementation, API route tests, EAS API origin | Runtime Phase 4 implementation survives and is covered | Legitimate current release state |
| 43 | `f6bb73f` | Published your App | Empty commit; no changed paths | Documentation/asset only |
| 44 | `523df17` | Published your App | Empty commit; no changed paths | Documentation/asset only |
| 45 | `c7dd8ae` | Phase 4 migration report revision | Required Phase 4 report | Documentation/asset only |
| 46 | `b12f757` | Recipes shared pager/vertical scroll repair and regression test | Verified fix survives exactly in current HEAD | Legitimate current release state |
| 47 | `9d02f9c` | Recipes scroll verification report | Required Recipes report | Documentation/asset only |
| 48 | `11bc56c` | Final GitHub sync report | Documentation-only extra commit after the stated 47-commit snapshot | Documentation/asset only |

No commit was classified `SUSPICIOUS — REQUIRES EXCLUSION` based solely on its age or historical ordering. The items requiring reconciliation are the current release scope, deployment/artifact behavior, asset publication, and external ignored credential—not hidden surviving implementation from the restore commits.

No commit was classified `UNKNOWN — REQUIRES INVESTIGATION` after the focused history and final-tree checks; the artifact and asset concerns are documented as explicit unresolved risks rather than silently accepted.

## Restore/revert chain analysis

Three commits explicitly restore to prior commits:

### `a99e35b` — restore to `df3a383`

- Stated target: `df3a383a4459c139082b9a4986c7e462c066ba37`
- The restore tree is identical to the target tree.
- No unique source/test implementation from the temporary recipe/planner sequence survives because of this commit itself.

### `bf364fe` — restore to `16d342d`

- Stated target: `16d342d22c70f6af6836303e7262c59e396f79d9`
- The restore tree is identical to the target tree.
- It removes the screenshot-only additions introduced between the target and restore.

### `079f506` — restore to `21170cf`

- Stated target: `21170cf08ba7ba3a4c1d72395768e6bb41485fee`
- The restore tree is identical to the target tree.
- It neutralizes the transient Planner/recipe-linking and screenshot additions immediately before it.

The final current state is therefore the later descendant after these restores, not an accidental union of every intermediate experiment. Current Recipes/Planner/linking code and tests were then updated again by later commits and remain coherent in the final tree.

## Current-HEAD feature inventory and coherence audit

### Authentication, authorization, and Supabase

- Supabase is the client session source; the server resolves identity from the Bearer token through Supabase Auth rather than trusting request-body identity.
- The API client validates an HTTPS origin and performs one forced token refresh/retry on a 401.
- Account-deletion tombstones fail closed during normal identity verification.
- Protected diary, capture, Planner, referral, account, restaurant, premium, and Coach Fact Context routes use server-side authorization.
- Supabase service-role access remains server-side by variable contract; no service-role key was found in tracked current files.
- The current model is coherent with the local-first client and server sync architecture.

### Production API routing and public/legal routes

- Production client origin is `https://mycaloraapp.com`; the server mounts API routes under `/api`.
- The API artifact intentionally owns `/` so the branded apex does not incorrectly serve the Expo landing page.
- `/api/legal` compatibility routes coexist with the root public/legal and `.well-known` paths.
- CORS allows the branded origin and rejects unrelated browser origins.
- Public recipes and guest concepts are deliberately rate-limited rather than treated as authenticated data.
- Public metadata, robots, sitemap, manifest, and legal routes are present.

### Coach

- The current active path is consented, eligible, rollout-controlled Fact Context.
- The legacy Coach response route is deliberately terminal 404.
- Client and server Fact Context tests pass.
- Risk: any stale external client expecting the legacy route would fail; current Calora source uses the active bounded path.

### Recipes, Plus, and saved recipes

- Discover, Plus, and Create remain under the verified bounded scrolling repair.
- Premium recipes are entitlement-gated server-side and represented by RevenueCat client state.
- Saved recipes are local-first and coherent with the current architecture; they are not presented as cross-device server sync.
- Recipe rate limiting and generation paths are covered by the API suite.
- Recipe-to-Planner linking remains in the final tree with tests.

### Restaurants and food logging

- Restaurant lookup and food logging use the current server/API boundary.
- Food-memory and representative image semantics remain distinct from verified nutrition provenance.
- Restaurant/food tests pass.

### Planner

- Planner generation, editing, replacement, day paging, and recipe linking remain in the final tree.
- Existing planner tests and API planner tests pass.
- The shared pager restore audit found no final-state loss of the intended horizontal day pager.

### Insights, Dashboard, Profile, and onboarding

- Insights remains local-derived and includes the existing nested gesture protections.
- Dashboard and wellness state remain inside the shared Calora context/local-first state model.
- Profile owns membership/billing/account deletion and preserves safe-area content padding.
- Onboarding and review/resumption state remain in the final tree.
- Profile interaction warnings observed during tests are existing React `act(...)` warnings; they did not fail the suite.

### Subscriptions and RevenueCat

- Client RevenueCat public API values are present where the app bundle requires them.
- Server RevenueCat secret access remains environment-based and was not found as a literal secret.
- RevenueCat entitlement, promo/referral, deletion, and account-state tests are included in the API test suite.

### Account deletion

- The final state includes deletion fencing, recovery/checkpoint state, advisory locking, transactional cleanup, RevenueCat erasure handling, and Auth deletion sequencing.
- Account deletion and recovery-related tests pass.

### Deep links, referrals, iOS Universal Links, and Android App Links

- OAuth callback remains branded and uses PKCE/duplicate-callback arbitration.
- Referral links preserve `caloraapp://invite/<code>` and the branded `/invite/<code>` path.
- iOS configuration contains `applinks:mycaloraapp.com`.
- Android filters use `mycaloraapp.com` with automatic verification for invite and auth callback paths.
- Dynamic AASA and Assetlinks responses intentionally require deployment values for `APPLE_TEAM_ID` and `ANDROID_SHA256_FINGERPRINT`; source tests correctly return 503 when these are absent. The production deployment must continue supplying these secrets.

### Image and asset references

- Current source image references remain local/allowlisted through the existing image metadata and trusted asset paths.
- Added screenshots are reference/QA assets, not runtime app dependencies.
- Duplicate screenshot pairs add repository weight without changing runtime behavior.

### Environment/configuration handling

- The client development script intentionally uses Replit development variables; production EAS uses the branded origin.
- Example environment files contain placeholders and server-only variable names, not populated credentials.
- Production artifact services bind through the configured service ports and preserve the current API/mobile artifact split.

## Deployment checkpoint commits

The six commits named `Published your App` were inspected:

- `2a8053c`
- `8d53648`
- `f0b3260`
- `e8511bd`
- `f6bb73f`
- `523df17`

Each is an empty commit with no changed paths and no source/configuration payload. They are harmless deployment markers in Git history, not hidden deployment metadata or runtime changes. They do not by themselves prove that a future GitHub push is deployable, and no deployment was triggered by this audit.

## Artifact/configuration analysis

### API artifact

Current `artifacts/api-server/.replit-artifact/artifact.toml`:

- owns `/` and the API/public paths;
- retains `/api`, `/api/legal`, `.well-known`, public/legal, robots, sitemap, and manifest paths;
- runs development with sensitive activation variables explicitly unset;
- builds with `pnpm --filter @workspace/api-server run build`;
- starts the compiled server directly in production.

The earlier `dcf5108` artifact state was superseded by `ef22550`. The current root ownership is compatible with the branded-apex routing decision recorded in project memory and the Phase 4 public topology.

The artifact file no longer carries explanatory comments about the release-sensitive build activation variables, but the actual release-attestation/build logic remains in `artifacts/api-server/build.mjs`. The current development command still unsets the activation variables. This is a documentation/process regression risk, not evidence that the guard was removed.

### Calora artifact

Current `artifacts/calora/.replit-artifact/artifact.toml`:

- uses `/mobile` as its preview/base path;
- maps the Expo service to `/mobile`;
- sets `BASE_PATH=/mobile`.

This is compatible with the three-artifact routing model, but it requires the owner to accept `/mobile` as the current preview path before any release workflow that relies on preview routing.

## Attached-asset audit

The release delta adds six JPG screenshots and four reference TXT files in addition to reports and metadata documents.

Findings:

- The six JPGs are intentional Calora QA/reference screenshots based on names and content context.
- Two screenshot pairs are byte-identical duplicates, increasing repository size without runtime benefit.
- The added JPGs are approximately **1.81 MiB** total.
- Their EXIF contains Android software/device metadata (`Android AP3A...`); no GPS fields, tokens, passwords, or credential-bearing UI was identified.
- The four added reference TXT files are project request/evidence material. Their secret-looking matches are variable names and documentation language, not populated credentials.
- Existing attached assets include many historical pasted task/report references. They are not runtime inputs; they should be treated as documentation with normal privacy review.
- The release delta increases tracked repository size by approximately **1.96 MiB**, from about **36.78 MiB / 1,072 files** to **38.74 MiB / 1,095 files**.

These assets are not a security blocker based on the available evidence, but the duplicate files, device metadata, and broad historical reference material require explicit owner acceptance before public GitHub publication.

## Remote-to-local release delta

Current local HEAD would add **48 commits**, **88 changed paths**, approximately **6,856 insertions**, and **342 deletions** relative to the fetched remote branch.

Grouped by feature/release area, GitHub would gain:

1. **Coach and controlled intelligence**
   - Coach UI updates;
   - guest Coach extraction/tests;
   - current bounded Fact Context route/client behavior and consent/rollout coverage.

2. **Recipes and food**
   - restaurant/food-memory changes;
   - saved recipes;
   - Discover/Plus/Create changes;
   - recipe generation/rate limiting;
   - verified Recipes scrolling repair;
   - recipe image/provenance and recipe-to-Planner integration.

3. **Planner**
   - Planner/recipe linking;
   - Planner day/paging/refinement and associated tests.

4. **Insights/Profile/onboarding**
   - Insights layout/logic;
   - profile/auth/onboarding-related branded state already in the descendant.

5. **Branded identity, auth, and native links**
   - canonical `mycaloraapp.com` identity;
   - Supabase PKCE callback handling;
   - iOS associated domain and Android App Links configuration;
   - callback fallback and universal-link server tests;
   - referral/invite branded routing.

6. **API/public/deployment topology**
   - API/public route configuration;
   - CORS/public pages/universal-link routes;
   - artifact routing for API apex ownership and mobile `/mobile` preview.

7. **Reports, metadata, memory, and reference assets**
   - metadata, domain, restore, Phase 4, Recipes, and GitHub sync reports;
   - project memory notes;
   - QA/reference screenshots and pasted source material.

The release delta is therefore a broad Calora project release, not a narrow post-Phase-4 patch.

## Comprehensive current-HEAD verification

### Complete workspace test

Command:

```text
pnpm test
```

Result:

#### Calora

- Vitest test files: **81 passed**
- Vitest tests: **1,181 passed**
- Calora static server security tests: **6 passed**
- Failures: **0**

Warnings/non-failures:

- Existing React `act(...)` warnings from Profile interaction tests.
- Expected network/error-path diagnostics from diary sync, restaurant food fallback, and API client tests.
- These warnings did not fail the suite.

#### API server

- Vitest files: **36 passed, 1 skipped**
- Tests: **437 passed, 4 skipped**
- Failures: **0**
- The skipped file is the pending rollback integration suite; all four tests were skipped because the required integration state is not active in this deterministic run.

### Typechecks and workspace checks

Command:

```text
pnpm typecheck
```

Result:

- workspace library project references: passed;
- `artifacts/api-server`: passed;
- `artifacts/calora`: passed;
- `artifacts/fatsecret-gateway`: passed;
- `artifacts/mockup-sandbox`: passed;
- `scripts`: passed.

No TypeScript failures were reported.

### Requested feature test coverage

The complete suites include and pass coverage for:

- authentication and deep-link logic;
- Recipes, Plus, recipe generation, image presentation, and recipe instructions;
- shared swipe/pager contracts;
- Coach, guest Coach, Fact Context, consent, rollout, and send adapters;
- restaurant food/image/review paths;
- Planner, Planner acknowledgement, replacement, integrity, and recipe linking;
- saved/premium recipes;
- Profile and onboarding-related interactions;
- RevenueCat and premium entitlement behavior;
- account deletion/fence/state/recovery behavior;
- CORS, Supabase Auth, public pages, universal links, rate limits, and server security.

The repository contains focused test files for each of these areas, and the full test commands above passed.

### Security scanners

Required scanners were run in parallel:

- Dependency audit: **0 info, 0 low, 0 moderate, 0 high, 0 critical vulnerabilities**
- SAST: **5 medium generic secret-pattern findings**
- HoundDog: **0 findings**

Manual review of all five SAST findings:

- `.replit` contains RevenueCat public/test client keys and app/project identifiers.
- `artifacts/calora/eas.json` contains public Supabase/RevenueCat client configuration expected to be bundle-visible.
- `artifacts/calora/env.example` contains empty/placeholder server variables and explicit comments that server secrets must never enter the Expo bundle.

No populated Supabase service-role key, Cloudflare API token, RevenueCat server secret, OpenAI secret, database credential, private key, signing credential, or keystore was found in tracked current files or the unpublished Git diff.

### Git hygiene

- `git diff --check`: passed.
- No source/configuration changes were made during this audit.
- No build, deploy, republish, or GitHub push was performed.

## Security and secret-history forensics

### Tracked current tree and unpublished Git history

The full unpublished range and current tracked tree were searched for:

- private-key blocks;
- GitHub token shapes;
- OpenAI-style keys;
- Supabase service-role key values;
- Cloudflare token values;
- RevenueCat server secret values;
- database credentials;
- OAuth client-secret values;
- signing/keystore files;
- populated `.env` secret files.

Results:

- No real credential value was identified in the tracked unpublished history.
- No private key or keystore was found.
- No populated service-role, Cloudflare, RevenueCat server, or OpenAI credential was found.
- Secret-looking matches in reports are variable names or instructions, not values.
- `artifacts/calora/env.example` and `artifacts/fatsecret-gateway/.env.example` are templates.
- Public Supabase anon and RevenueCat client keys are intentionally public client configuration, not server secrets.

### Ignored workspace credential

The workspace contains an ignored `.config/gh/hosts.yml` with a live-looking GitHub OAuth credential. It is:

- not tracked by Git;
- absent from `git log`;
- absent from the unpublished diff;
- excluded from any proposed GitHub push.

Its value was not printed or copied into this report. It should be revoked/rotated through the GitHub credential-management path before any future GitHub operation. This is an operational security risk, but not a secret exposure in the 48-commit Git release range.

## Production configuration verification

Current HEAD was checked for the required Phase 4 values:

- Production `EXPO_PUBLIC_API_URL`: `https://mycaloraapp.com`
- Auth callback: `https://mycaloraapp.com/auth/callback`
- Android package: `com.etiendem.caloraapp`
- iOS bundle ID: `com.etiendem.caloraapp`
- Expo scheme: `caloraapp`
- iOS associated domain: `applinks:mycaloraapp.com`
- Android App Links: `mycaloraapp.com` for `/invite` and `/auth/callback`, both with `autoVerify: true`

Unintended production host checks:

- `api.mycaloraapp.com`: not found in the checked client/production configuration
- `calora.app`: not found in the checked client/production configuration
- client-facing localhost/preview URL: none in production EAS/app configuration
- legitimate development-only Replit/localhost references remain in development scripts, test fixtures, and server-side tooling
- the API server’s object-storage sidecar loopback reference is server-internal and not client-facing

One deployment dependency remains explicit: dynamic AASA and Assetlinks responses require `APPLE_TEAM_ID` and `ANDROID_SHA256_FINGERPRINT` at runtime. The current source intentionally returns 503 when those are absent. Previously verified production association evidence depended on those deployment values; they must remain configured.

## Unresolved risks and reconciliation items

1. **Actual range mismatch:** current HEAD is 48 commits ahead, not the requested 47, because `11bc56c` was added afterward.
2. **Broad release scope:** the descendant contains legitimate but wide-ranging Coach, restaurant, Insights, Planner, saved-recipes, metadata, artifact, and reference-asset work. Owner acceptance is needed before treating it as one GitHub release.
3. **Ignored GitHub OAuth credential:** revoke/rotate before any future GitHub sync. It is not in Git history.
4. **AASA/Assetlinks deployment values:** confirm production secrets remain present before a future native build or public association check.
5. **Asset publication/privacy:** six screenshots include Android software/device EXIF and duplicate pairs; remove or accept them in a separate owner decision.
6. **Artifact release documentation:** current build attestation remains implemented in `build.mjs`, but explanatory release-control comments were removed from `artifact.toml`; restore/document that control separately if operator clarity is required.
7. **Canonical metadata environment:** public-page canonical/sitemap output uses the branded production origin by default; nonproduction deployments should not accidentally be treated as production metadata.
8. **Referral copy check:** the Coach explorer identified a possible marketing-copy mismatch between the invite image promise and the server’s configured reward duration. This should be confirmed before external release, although tests and reward logic are internally consistent.

## Release decision

The final source is internally coherent enough for continued engineering work and deterministic testing. The restore sequences leave no unwanted intermediate implementation in current HEAD, and the deployment checkpoint commits are empty.

However, a full fast-forward of the current descendant is not yet approved as the next GitHub release state because the actual candidate has an extra report commit beyond the stated 47-commit boundary and contains broad asset/artifact/deployment scope requiring owner reconciliation. The ignored GitHub credential also requires operational cleanup before any GitHub operation.

### Exact recommended next action

Do not push or build. First:

1. Explicitly reconcile whether current HEAD `11bc56c` (48 commits ahead, including `07_CALORA_FINAL_VERIFIED_GITHUB_SYNC_REPORT.md`) is the intended release candidate rather than the original 47-commit endpoint `9d02f9c`.
2. Revoke/rotate the ignored GitHub OAuth credential without placing its value in Git or chat.
3. Obtain owner acceptance for the six screenshot assets/EXIF, duplicate reference files, `/mobile` artifact preview path, API apex ownership, and release-attestation documentation.
4. Reconfirm `APPLE_TEAM_ID` and `ANDROID_SHA256_FINGERPRINT` in the deployment environment.
5. Re-run this audit after those decisions; only then consider a normal non-force fast-forward push.

## Final verdict

RECONCILIATION REQUIRED — DO NOT PUSH