# Calora Final Verified GitHub Sync Report

**Date:** September 8, 2026  
**Purpose:** Pre-native-build GitHub synchronization for the verified Calora release state  
**Push/build actions:** No push was attempted. No commit, history rewrite, force push, Expo/EAS build, republish, DNS, Cloudflare, Supabase, RevenueCat, Apple, Google, authentication, deep-link, or production-infrastructure change was made during this audit.

## Final verdict

GITHUB SYNC BLOCKED — DO NOT BUILD

## Executive summary

The requested GitHub sync cannot safely proceed from the current branch without pushing 47 unpublished local commits. The branch is not remote-diverged, but the unpublished range is not limited to the two verified release boundaries.

The range contains:

- the verified Phase 4 branded-domain/auth/deep-link work;
- the verified Recipes scrolling repair;
- both requested verification reports;
- unrelated Coach, restaurant, insights, saved-recipes, planner/recipe-linking, metadata, artifact configuration, deployment-checkpoint, screenshot, and other historical changes.

Several unrelated implementation changes are already entangled in the unpublished commit history. Separating only the requested release boundaries would require history rewriting, selective cherry-picking, or branch replacement. Those actions are prohibited by the synchronization instructions. Therefore no push was attempted.

## Step 1 — Pre-push forensics

### Repository identity

- Current branch: `release/calora-onboarding-and-plus`
- Remote: `https://github.com/atembekong-hash/Calora.git`
- Upstream: `origin/release/calora-onboarding-and-plus`
- Remote fetch performed before the push decision: **yes**

### SHA and graph state

- Pre-push local HEAD: `9d02f9c81eb235c80e63c2820131c2815fc55546`
- Pre-push remote HEAD: `4174a82d54af5e8441a715091ed5320243db1f27`
- Merge-base: `4174a82d54af5e8441a715091ed5320243db1f27`
- Local commits ahead of remote: **47**
- Remote commits ahead of local: **0**
- Graph relationship: local is a strict descendant of the remote; there is no remote divergence.

### Working tree before this report

Before creating this report:

- staged files: none;
- unstaged files: none;
- untracked files: none;
- working tree: clean.

The previous `06_CALORA_RECIPES_SCROLL_PRE_GITHUB_VERIFICATION_REPORT.md` was already present in local HEAD as commit `9d02f9c`.

After creating this report, the only expected working-tree change is this new documentation file:

```text
?? 07_CALORA_FINAL_VERIFIED_GITHUB_SYNC_REPORT.md
```

No source or configuration file is dirty.

## Step 2 — Unpublished commit inventory

The following is the complete oldest-to-newest inventory of the 47 commits not present on the fetched remote branch:

| # | Commit | Subject | Classification |
|---:|---|---|---|
| 1 | `9b069b3` | Add mission 03 push report documentation | C — documentation, but not one of the two required reports |
| 2 | `e35188a` | Refactor restaurant components and update food memory tests | D — unrelated restaurant implementation |
| 3 | `0ba0ef5` | Update coach component logic in calora app | D — unrelated Coach implementation |
| 4 | `1c1fdc7` | Update coach component in calora artifacts | D — unrelated Coach implementation |
| 5 | `1e34dd3` | Refactor coach logic into separate guestCoach module and add tests | D — unrelated Coach implementation and tests |
| 6 | `aea8ea6` | Update coach component and add reference screenshot | D — Coach implementation plus unrelated asset |
| 7 | `52ca6be` | Update coach component and add reference screenshot | D — Coach implementation plus unrelated asset |
| 8 | `4947967` | Add CaloraApp screenshots to attached assets | D — unrelated screenshot assets |
| 9 | `af116c7` | Add CaloraApp screenshots to attached assets | D — unrelated screenshot assets |
| 10 | `1fa9b29` | Update insights dashboard layout and logic | D — unrelated Insights implementation |
| 11 | `da16da5` | Update saved recipes component logic | D — unrelated saved-recipes implementation |
| 12 | `21170cf` | Refactor saved recipes component logic | D — unrelated saved-recipes implementation |
| 13 | `3536d9c` | Add Telegram screenshot asset | D — unrelated asset |
| 14 | `47148f1` | Implement logic and UI for linking recipes to the planner | D — unrelated planner/recipe-linking feature |
| 15 | `16d342d` | Refactor planner and recipes screens and add test coverage | D — unrelated prior planner/Recipes feature work |
| 16 | `df3a383` | Add screenshot asset | D — unrelated asset |
| 17 | `5c2d538` | Update recipe screen and planner integration logic | D — unrelated prior recipe/planner implementation |
| 18 | `a99e35b` | Restored to `df3a383...` | D — historical restore commit entangled with prior feature work |
| 19 | `e741ff3` | Add screenshots to attached assets | D — unrelated assets |
| 20 | `bf364fe` | Restored to `16d342d...` | D — historical restore commit entangled with prior feature work |
| 21 | `923561b` | Update recipes screen and add corresponding tests | D — prior Recipes implementation, not the verified scroll repair |
| 22 | `079f506` | Restored to `21170cf...` | D — historical restore commit entangled with prior feature work |
| 23 | `5a35f5e` | Update recipe rate limiting logic and adjust associated UI and documentation | D — unrelated rate-limit/API and UI work |
| 24 | `be00904` | Add Calora brand identity inventory audit metadata | C — documentation/metadata, outside the two requested reports |
| 25 | `5911158` | Create Calora identity inventory report document | C — documentation |
| 26 | `b691f8c` | Add final metadata specification document | C — documentation |
| 27 | `e03d66c` | Launch Calora branded metadata and domain identity | A — verified branded identity/runtime configuration boundary |
| 28 | `6b406be` | Update Calora identity inventory report data | C — documentation |
| 29 | `dfe4344` | Add Calora Cloudflare domain foundation report | C — documentation, outside the requested Phase 4 sync boundary |
| 30 | `c9e6ee2` | Document the Calora Replit production restore process | C — documentation plus memory/support context |
| 31 | `2a8053c` | Published your App | D — deployment checkpoint not part of the requested release boundary |
| 32 | `dcf5108` | Update api server artifact configuration | D — artifact/deployment configuration outside the requested repair |
| 33 | `8d53648` | Published your App | D — deployment checkpoint not part of the requested release boundary |
| 34 | `fb936df` | Update Calora production restore report | C — documentation |
| 35 | `b896d82` | Add Calora branded domain connection report and associated asset data | C — documentation/reference assets |
| 36 | `f0b3260` | Published your App | D — deployment checkpoint not part of the requested release boundary |
| 37 | `ef22550` | Update artifact configurations for api-server and calora | D — artifact/deployment configuration outside the requested repair |
| 38 | `e8511bd` | Published your App | D — deployment checkpoint not part of the requested release boundary |
| 39 | `e371112` | Update Calora branded domain report and document apex artifact routing | C — documentation and memory update |
| 40 | `bb9873b` | Update Calora branded domain connection report | C — documentation |
| 41 | `142dc1f` | Add branded domain authentication deep link configuration file | C — pasted reference/configuration input; not the runtime implementation |
| 42 | `9c83c3d` | Implement universal links authentication deeplink support and add migration report | A — verified Phase 4 runtime/API/EAS implementation |
| 43 | `f6bb73f` | Published your App | D — deployment checkpoint not part of the requested release boundary |
| 44 | `523df17` | Published your App | D — deployment checkpoint not part of the requested release boundary |
| 45 | `c7dd8ae` | Update Calora Phase 4 auth deeplink migration report | C — required Phase 4 report |
| 46 | `b12f757` | Update recipes screen and swipeable tab list functionality with tests | B — verified Recipes scrolling repair |
| 47 | `9d02f9c` | Add Calora recipes scroll pre-verification report | C — required Recipes verification report |

The aggregate unpublished range changes **87 paths**, with approximately **6,578 insertions and 342 deletions**. This confirms that the local range is substantially broader than `b12f757` and the two requested reports.

## Step 3 — File and release classification

### A. Verified Phase 4

The local state contains the previously verified branded-domain/native identity implementation through:

- `e03d66c`
  - canonical branded identity and runtime URL/configuration changes;
  - native identity and branded-domain source changes.
- `9c83c3d`
  - universal-link/auth callback implementation;
  - API universal-link route behavior;
  - Phase 4 API tests;
  - production EAS API URL update.

The critical Phase 4 files exist in local HEAD and were rechecked:

- `artifacts/calora/app.json`
- `artifacts/calora/eas.json`
- `artifacts/calora/lib/auth.ts`
- `artifacts/calora/lib/api-config.ts`
- `artifacts/calora/lib/referral.ts`
- `artifacts/api-server/src/routes/universal-links.ts`
- `artifacts/api-server/src/lib/cors-policy.ts`

### B. Verified Recipes scrolling repair

The verified repair is exactly commit `b12f7579e6dfed8da7afb0472b3d88c6a94adc3`:

- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/components/SwipeableTabList.tsx`
- `artifacts/calora/lib/__tests__/recipesScreen.test.ts`

It is an ancestor of local HEAD:

```text
git merge-base --is-ancestor b12f7579e6dfed8da7afb0472b3d88c6a94adc3 HEAD
=> true
```

### C. Verification/report files

The two required reports are present in local HEAD:

- `05_CALORA_PHASE4_AUTH_DEEPLINK_NATIVE_MIGRATION_REPORT.md`
- `06_CALORA_RECIPES_SCROLL_PRE_GITHUB_VERIFICATION_REPORT.md`

Their local history is:

- Phase 4 report: added/updated through `9c83c3d` and `c7dd8ae`;
- Recipes report: added by `9d02f9c`.

The current `07_CALORA_FINAL_VERIFIED_GITHUB_SYNC_REPORT.md` is being left as a working-tree documentation file because the sync is blocked. It is not in the remote and cannot be safely committed to the remote branch as part of this blocked operation.

### D. Unrelated/unexpected

Category D is present and entangled in the unpublished range. It includes:

- Coach and guest-Coach implementation changes;
- restaurant and food-memory implementation changes;
- Insights implementation changes;
- saved-recipes implementation changes;
- planner/recipe-linking changes;
- earlier Recipes implementation changes unrelated to the verified scroll repair;
- recipe rate-limit/API/UI changes;
- artifact/deployment configuration changes;
- multiple “Published your App” checkpoint commits;
- screenshot/reference assets outside the requested release boundary;
- restore commits whose history cannot be safely separated without rewriting.

Because category D is interleaved with categories A, B, and C in the same 47-commit descendant range, it cannot be excluded by a normal fast-forward push. Cherry-picking only selected commits or rewriting the branch would violate the no-history-rewrite/no-automatic-reconciliation constraints.

## Phase 4 inclusion proof

The local synchronized candidate contains the Phase 4 implementation and report files listed above. The exact local commits containing the primary runtime/configuration work are `e03d66c` and `9c83c3d`; the Phase 4 report update is `c7dd8ae`.

This is local inclusion only. The remote branch remains at `4174a82d54af5e8441a715091ed5320243db1f27` and does not contain these unpublished commits.

## Recipes commit inclusion proof

The verified scrolling repair commit is present locally:

```text
b12f7579e6dfed8da7afb0472b3d88c6a94adc3
```

It is an ancestor of local HEAD but is not present on the remote branch.

## Report-file inclusion proof

Local HEAD contains:

- `05_CALORA_PHASE4_AUTH_DEEPLINK_NATIVE_MIGRATION_REPORT.md`
- `06_CALORA_RECIPES_SCROLL_PRE_GITHUB_VERIFICATION_REPORT.md`

The required final synchronization report is currently the only untracked file:

- `07_CALORA_FINAL_VERIFIED_GITHUB_SYNC_REPORT.md`

No report was pushed because the release range is blocked by category D commits.

## Minimum final verification

No source or configuration changes were made after the Recipes verification. The following checks were rerun or rechecked before this sync decision:

- `git diff --check`: passed.
- Production `EXPO_PUBLIC_API_URL`: `https://mycaloraapp.com`.
- Auth callback: `https://mycaloraapp.com/auth/callback`.
- Android package: `com.etiendem.caloraapp`.
- iOS bundle ID: `com.etiendem.caloraapp`.
- Expo scheme: `caloraapp`.
- iOS associated domain: `applinks:mycaloraapp.com`.
- Android App Links: `mycaloraapp.com` for `/invite` and `/auth/callback`, both with `autoVerify: true`.
- No `api.mycaloraapp.com` in the checked production app/configuration source.
- No `calora.app` in the checked production app/configuration source.
- No client-facing localhost/preview URL in the checked production app/configuration source.

Previously completed deterministic verification remains valid because no source files changed after it:

- Calora suite: **81 test files passed, 1,181 tests passed**.
- Recipes regression suite: **10 tests passed**.
- Shared pager suite: **17 tests passed**.
- Calora TypeScript typecheck: **passed**.
- API server TypeScript typecheck: **passed**.
- API route/security suites: **3 files, 56 tests passed**.
- Calora static asset security suite: **6 tests passed**.

## Secret scan

A high-risk marker scan of the unpublished non-report diff found no private-key blocks, AWS secret assignments, client-secret assignments, or literal password assignments. No secret/credential file was introduced by the two verified release boundaries.

Environment variable names and existing public client configuration references were not treated as secret values. No credential values are reproduced in this report.

## Push result

**Not attempted.**

Reason: the fetched remote is not divergent, but local HEAD is 47 commits ahead and the range contains category D changes that cannot be safely excluded without prohibited history manipulation. A successful push of the current branch would publish unrelated and unverified changes.

No force push, force-with-lease, reset, branch replacement, automatic conflict resolution, or remote deletion was performed.

## Final synchronization state

- Final local HEAD: `9d02f9c81eb235c80e63c2820131c2815fc55546`
- Final remote HEAD: `4174a82d54af5e8441a715091ed5320243db1f27`
- SHA equality: **false**
- Final ahead/behind: **47 ahead / 0 behind**
- Final working tree after this report: only `07_CALORA_FINAL_VERIFIED_GITHUB_SYNC_REPORT.md` is untracked; no source/configuration files are modified.

There is no authorized build commit. The owner must not trigger the native build from this blocked state.

## Blockers

1. The local branch contains 47 unpublished commits, not only `b12f757`.
2. The unpublished range includes category D implementation, artifact/configuration, deployment-checkpoint, and asset changes.
3. Category D is entangled with the requested Phase 4, Recipes, and report commits.
4. Excluding category D would require cherry-picking/rewrite/branch replacement, which is prohibited for this operation.
5. Remote SHA equality cannot be achieved without first resolving the release-history boundary.

## Final verdict

GITHUB SYNC BLOCKED — DO NOT BUILD