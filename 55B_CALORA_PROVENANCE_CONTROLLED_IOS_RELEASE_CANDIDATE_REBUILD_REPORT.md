# Calora — Step 55B Provenance-Controlled iOS Release-Candidate Rebuild Report

**Date:** 2026-09-17  
**Product:** CaloraApp / `@vvault07/calora`  
**Scope:** One replacement iOS production/store release-candidate build  
**TestFlight submission:** none  
**Final verdict:** **IOS RELEASE CANDIDATE VERIFIED — READY FOR STEP 56 TESTFLIGHT AUTHORIZATION**

## 1. Executive summary

Step 55B created exactly one replacement iOS production/store build from a
fresh standalone Git clone with durable Git metadata.

The build source chain is complete and has no SHA mismatch:

- **Starting canonical SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Build-number commit:** `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- **Build-number commit tree:** `f4c820017b82c48052571eb432806b3185aabcfb`
- **Release gate:** check-run `105160714606`, completed successfully
- **Standalone build root:** `/tmp/calora-step55b-build`
- **EAS Build ID:** `45900e2d-298f-4ece-9041-0e42513266e4`
- **EAS-recorded Git SHA:** `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- **IPA SHA-256:** `bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13`

The build finished successfully with iOS build number `7`, marketing version
`1.0.0`, bundle identifier `com.etiendem.caloraapp`, production profile, and
STORE distribution.

The prior failed Step 55 build remains quarantined and unsubmitted. The new
build was also left unsubmitted. No Android build, API deployment, database
operation, schema/migration/seed change, or product functionality change was
performed.

## 2. Starting canonical SHA/tree

Before the authorized build-number-only change:

- **SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Tree:** `0b4185eac78f8b42097fce0334691487df740e53`
- **Subject:** `Prepare iOS build 6 release candidate`

Step 55B fetched `origin` and confirmed that canonical `origin/main` still
matched this exact expected starting state.

## 3. Failed build 6 quarantine

The prior failed build remains unchanged and quarantined:

- **EAS Build ID:** `fffc4d8a-5e1b-48f0-98c9-e2949136cf04`
- **Build number:** `6`
- **Disposition:** **DO NOT SUBMIT TO TESTFLIGHT**

It was not deleted, reused, or submitted.

## 4. Initial Apple floor

Fresh App Store Connect history before the build-number change:

```text
Apple consumed floor = 5
```

## 5. Initial EAS floor

Fresh EAS iOS history before the build-number change:

```text
EAS consumed floor = 6
```

The Step 55 finished build `6` remains part of the EAS consumed history even
though it is quarantined from TestFlight.

## 6. Initial LIVE_FLOOR

```text
INITIAL_LIVE_FLOOR = max(Apple 5, EAS 6)
                    = 6
```

## 7. Selected NEXT_SAFE_BUILD

```text
INITIAL_NEXT_SAFE_BUILD = INITIAL_LIVE_FLOOR + 1
                         = 7
```

The configured canonical build number was `6`, so the authorized narrow change
was to `7`.

## 8. Build-number-only diff

The only functional changed path was:

```text
artifacts/calora/app.json
```

The only intended content change was:

```diff
- "buildNumber": "6",
+ "buildNumber": "7",
```

`git diff --stat` reported one file changed, one insertion, and one deletion.
`git diff --check` passed.

The following values were preserved:

- Marketing version: `1.0.0`
- `cli.appVersionSource`: `local`
- `build.production.autoIncrement`: `false`
- Bundle identifier: `com.etiendem.caloraapp`
- Expo owner: `vvault07`
- Expo project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`
- All other configuration

## 9. Build-number commit SHA/tree/parent

The canonical commit created for the replacement candidate is:

- **Parent SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Commit SHA:** `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- **Commit tree:** `f4c820017b82c48052571eb432806b3185aabcfb`
- **Subject:** `Prepare iOS build 7 provenance-controlled candidate`
- **Changed path:** `artifacts/calora/app.json`
- **Old build number:** `6`
- **New build number:** `7`

## 10. Push result

The remote `main` ref was verified at the expected parent immediately before
the update:

```text
5f69c31e4816abcfa5fff69389e4699fd4f1428f
```

The standalone clone's raw Git HTTPS push was attempted but could not
authenticate in this environment. The already-configured authenticated GitHub
integration then performed the equivalent Git object/ref operation:

- Created the blob for the one changed file
- Created tree `f4c820017b82c48052571eb432806b3185aabcfb`
- Created commit `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- Updated `refs/heads/main` with `force: false`
- Required parent remained the old canonical SHA

The resulting remote update was a fast-forward with no force push, force-with-
lease, merge, rebase, or history rewrite.

## 11. New canonical SHA/tree

After the update and fetch:

- **`origin/main` SHA:** `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- **`origin/main` tree:** `f4c820017b82c48052571eb432806b3185aabcfb`
- **Subject:** `Prepare iOS build 7 provenance-controlled candidate`

## 12. Exact-SHA release validation

The exact new canonical SHA received the required release gate:

- **Check:** `Run release validation suite`
- **Check-run:** `105160714606`
- **Head SHA:** `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- **Status:** `completed`
- **Conclusion:** `success`

## 13. Standalone clone path

The fresh post-push build clone was:

```text
/tmp/calora-step55b-build
```

## 14. Standalone Git root

Inside the build clone:

```text
/tmp/calora-step55b-build
```

The build preparation and EAS invocation were run from this standalone clone,
not `/home/runner/workspace`.

## 15. Standalone .git durability

The clone contains its own durable `.git` directory. It is not a linked-
worktree pointer and does not depend on:

```text
/home/runner/workspace/.git/worktrees
```

Safe outer-repository inspection and `git worktree prune --dry-run` were run
while the clone remained present. The clone's identity and clean status were
unchanged afterward.

## 16. Standalone HEAD/tree/origin-main

Immediately before the build:

- **Git root:** `/tmp/calora-step55b-build`
- **HEAD:** `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- **Tree:** `f4c820017b82c48052571eb432806b3185aabcfb`
- **`origin/main`:** `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- **Subject:** `Prepare iOS build 7 provenance-controlled candidate`
- **Working tree:** clean, with only ignored local test artifacts generated

## 17. Outer-worktree isolation verification

While the standalone clone remained present, the following safe operations
were performed in the outer repository:

```text
git worktree list --porcelain
git worktree prune --dry-run
```

The outer repository reported stale historical linked-worktree metadata, but
the standalone build clone remained rooted at `/tmp/calora-step55b-build` with
the same HEAD, tree, `origin/main`, and clean status.

## 18. Prebuild validation

All required build preparation ran from the standalone clone:

- `pnpm install --frozen-lockfile`: passed
- `pnpm run typecheck`: passed
- `pnpm --filter @workspace/calora test`: passed
- `pnpm --filter @workspace/api-server test`: passed after generating the
  required ignored local API `dist` artifact
- `pnpm --filter @workspace/scripts test`: passed
- Calora static-security tests: passed
- Expo public config validation: passed
- `git diff --check`: passed
- Read-only iOS signing preflight: passed
- Production environment preflight: passed
- Final strict iOS build-number preflight: passed
- Final fail-closed provenance assertion: passed

No tracked source drift was present after validation.

## 19. Test totals

- **Workspace and artifact typechecks:** passed
- **Calora Vitest:** 87 test files passed; 1,185 tests passed
- **Calora static security:** 6 tests passed
- **API Vitest:** 36 test files passed; 438 tests passed; 4 intentional skips
- **Scripts Node tests:** 47 tests passed

The initial API test run correctly stopped at the existing rolling-restart
precondition because ignored `artifacts/api-server/dist` was absent. The
standalone clone then generated that ignored local bundle and reran the full
API suite successfully. The generated output did not alter Git status.

## 20. Final Apple floor immediately before build

The final read-only floor query immediately before the EAS invocation reported:

```text
FINAL Apple consumed floor = 5
```

## 21. Final EAS floor immediately before build

The final read-only floor query immediately before the EAS invocation reported:

```text
FINAL EAS consumed floor = 6
```

## 22. FINAL_LIVE_FLOOR

```text
FINAL_LIVE_FLOOR = max(Apple 5, EAS 6)
                  = 6
```

## 23. FINAL_NEXT_SAFE_BUILD

```text
FINAL_NEXT_SAFE_BUILD = FINAL_LIVE_FLOOR + 1
                       = 7
```

The configured `app.json` build number was `7` and matched this final
selection. The strict repository preflight passed.

## 24. Provenance assertion

The final fail-closed assertion passed immediately before the build. It
verified all of the following:

- Git top-level directory equals `/tmp/calora-step55b-build`
- HEAD equals `origin/main`
- HEAD equals the exact new canonical SHA
- HEAD tree equals the exact new canonical tree
- Working tree is clean except ignored local validation artifacts
- `app.json` iOS build number equals `7`
- Expo owner equals `vvault07`
- Expo project ID equals `1f202325-5b9a-4260-978f-abbd3252b9ee`
- Bundle identifier equals `com.etiendem.caloraapp`
- Marketing version equals `1.0.0`
- Production `autoIncrement` equals `false`
- `appVersionSource` equals `local`
- Production environment equals `production`

## 25. Signing preflight

The existing repository-supported read-only signing preflight passed:

- EAS distribution certificate: ready
- Certificate expiry: `2027-07-21`
- Provisioning profile: active and valid
- Provisioning profile expiry: `2027-07-21`
- EAS project: `@vvault07/calora`
- Bundle identifier: `com.etiendem.caloraapp`

This validates the EAS signing record. The macOS-only Apple certificate
rehearsal was not run on the Linux host.

## 26. Production environment preflight

The final standalone-clone production checks passed:

- Production API target: `https://calorie-coach-pie35449.replit.app`
- Supabase public configuration: present
- RevenueCat iOS public configuration: present
- Expo environment: `production`
- Localhost values: none
- `127.0.0.1` values: none
- Replit development preview URL: none
- Mock provider flag: none
- Unintended development flag: none

Secret values were not printed.

## 27. Exact EAS build command/action

Exactly one build command was run:

```text
EAS_CLI_COMMAND=/tmp/calora-eas-wrapper \
pnpm --filter @workspace/calora run build:ios:production
```

The transient wrapper used `eas-cli@24.7.0`. The repository signing
preflight passed, then EAS accepted one iOS production/store build request.
No second build command was run.

## 28. Exact EAS Build ID

```text
45900e2d-298f-4ece-9041-0e42513266e4
```

## 29. EAS build status

The exact EAS record reports:

- **Status:** `FINISHED`
- **Platform:** iOS
- **Profile:** `production`
- **Distribution:** `STORE`
- **Project:** `@vvault07/calora`
- **Marketing version:** `1.0.0`
- **Build number:** `7`
- **Created:** `2026-09-17T10:24:43.163Z`
- **Completed:** `2026-09-17T10:31:46.982Z`

## 30. EAS-recorded Git SHA

```text
dec8f0d6a9531cb5a2eb73c01706dc75354e743c
```

## 31. EAS-recorded Git subject

```text
Prepare iOS build 7 provenance-controlled candidate
```

## 32. Git provenance match result

**PASS.**

The EAS-recorded Git SHA exactly equals the canonical `origin/main` SHA built
from the fresh standalone clone:

```text
EAS SHA       = dec8f0d6a9531cb5a2eb73c01706dc75354e743c
canonical SHA = dec8f0d6a9531cb5a2eb73c01706dc75354e743c
```

This is the provenance condition that failed in Step 55 and was repaired in
Step 55A/55B.

## 33. Marketing version

| Source | Expected | Observed | Result |
|---|---|---|---|
| Canonical `app.json` | `1.0.0` | `1.0.0` | PASS |
| EAS build | `1.0.0` | `1.0.0` | PASS |
| IPA `CFBundleShortVersionString` | `1.0.0` | `1.0.0` | PASS |

## 34. Build number

| Source | Expected | Observed | Result |
|---|---:|---:|---|
| Final safe build | `7` | `7` | PASS |
| Canonical `app.json` | `7` | `7` | PASS |
| EAS build | `7` | `7` | PASS |
| IPA `CFBundleVersion` | `7` | `7` | PASS |

## 35. Bundle identifier

| Source | Expected | Observed | Result |
|---|---|---|---|
| Expo config | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |
| EAS build | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |
| IPA `CFBundleIdentifier` | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |

## 36. IPA artifact size

- **Artifact URL:** `https://expo.dev/artifacts/eas/euBS5dVs4x6c5XcMyPD4ib1RyjIEYvWAP1xx-H76m2c.ipa`
- **Size:** `45,721,840` bytes

The archive downloaded successfully and extracted successfully.

## 37. IPA SHA-256

```text
bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13
```

## 38. Info.plist verification

The root app plist at `Payload/CaloraApp.app/Info.plist` was parsed from the
IPA:

| Key | Expected | Observed | Result |
|---|---|---|---|
| `CFBundleIdentifier` | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |
| `CFBundleShortVersionString` | `1.0.0` | `1.0.0` | PASS |
| `CFBundleVersion` | `7` | `7` | PASS |

## 39. Immutable provenance chain

The verified chain is:

```text
canonical Git SHA
  dec8f0d6a9531cb5a2eb73c01706dc75354e743c
→ canonical Git tree
  f4c820017b82c48052571eb432806b3185aabcfb
→ exact release-validation success
  check-run 105160714606
→ deterministic build number
  7
→ standalone Git root
  /tmp/calora-step55b-build
→ provenance assertion
  PASS
→ exact EAS Build ID
  45900e2d-298f-4ece-9041-0e42513266e4
→ EAS-recorded matching Git SHA
  dec8f0d6a9531cb5a2eb73c01706dc75354e743c
→ exact IPA SHA-256
  bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13
→ verified Info.plist
  com.etiendem.caloraapp / 1.0.0 / 7
```

There is no SHA mismatch in this chain.

## 40. Recovery-target preservation

The replacement commit has the original canonical candidate as its direct
parent and changes only `artifacts/calora/app.json`. Therefore the following
recovered targets remain preserved in the built source lineage:

- R-01 onboarding keyboard
- R-02 agreement semantics
- R-03 Plus remount
- R-04 Discover/Plus freshness
- R-05 nutrition truthfulness
- Weekly Programs modal-state fix
- Smart Scan approval
- Food Memory
- Home Today
- Diary outbox/sync
- Bounded Coach safety
- Health
- Premium/RevenueCat
- Account isolation

## 41. Smart Scan/Home preservation

The build-number-only commit changed no Smart Scan or Home source. Both remain
present in the canonical source lineage and were covered by the passing
validation suites.

## 42. Coach safety preservation

The build-number-only commit changed no Coach source. The bounded Coach safety
implementation remains in the built source lineage, and the Coach-related
validation suites passed.

## 43. Premium/account isolation preservation

The build-number-only commit changed no Premium, RevenueCat, account, API,
database, or schema source. Premium behavior and account isolation remain in
the built source lineage.

## 44. Fitness exclusion

Fitness remained excluded. No Fitness product work was added.

## 45. Failed build 6 quarantine confirmation

EAS Build ID `fffc4d8a-5e1b-48f0-98c9-e2949136cf04` remains unsubmitted and
must not be confused with the verified replacement build. It was not deleted
or reused.

## 46. Confirmation no TestFlight submission

No `eas submit`, `eas build:submit`, App Store upload, or TestFlight
submission was run. The new build is ready only for owner authorization under
Step 56.

## 47. Confirmation no Android build

No Android build was created.

## 48. Confirmation no API/database/deployment

No API/backend deployment, Replit publish, database mutation, migration,
schema change, or seed change was performed.

The API bundle generated in the standalone clone was ignored local validation
output only and was not deployed.

## 49. Remaining physical-device verification

Not performed in Step 55B:

- macOS-native Apple certificate rehearsal
- physical iPhone installation and launch
- physical-device Health verification
- physical-device camera verification
- physical-device notification verification
- physical-device native-auth verification
- TestFlight processing and installation

These are Step 56/owner-authorized distribution activities. They were not
performed here.

## 50. Exact recommendation for Step 56

The exact replacement build below is ready for owner authorization to proceed
to Step 56 TestFlight handling:

```text
EAS Build ID:
45900e2d-298f-4ece-9041-0e42513266e4
```

Before any submission, the owner must review this report and explicitly
authorize the separate Step 56 TestFlight action. Do not submit the prior
failed build `fffc4d8a-5e1b-48f0-98c9-e2949136cf04`.

## Mandatory provenance table

| Identity | Expected | Observed | Result |
|---|---|---|---|
| Canonical Git SHA | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | PASS |
| Canonical Git tree | `f4c820017b82c48052571eb432806b3185aabcfb` | `f4c820017b82c48052571eb432806b3185aabcfb` | PASS |
| Standalone Git root | `/tmp/calora-step55b-build` | `/tmp/calora-step55b-build` | PASS |
| Standalone HEAD | new canonical SHA | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | PASS |
| Standalone `origin/main` | new canonical SHA | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | PASS |
| Working-tree cleanliness | clean except ignored artifacts | clean | PASS |
| Build number | `7` | `7` | PASS |
| Expo owner | `vvault07` | `vvault07` | PASS |
| Expo project ID | `1f202325-5b9a-4260-978f-abbd3252b9ee` | `1f202325-5b9a-4260-978f-abbd3252b9ee` | PASS |
| Bundle ID | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |
| Marketing version | `1.0.0` | `1.0.0` | PASS |
| EAS profile | `production` | `production` | PASS |
| EAS distribution | `STORE` | `STORE` | PASS |
| EAS Build ID | one exact replacement build | `45900e2d-298f-4ece-9041-0e42513266e4` | PASS |
| EAS-recorded Git SHA | canonical new SHA | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | PASS |
| EAS-recorded Git subject | build-7 provenance commit | `Prepare iOS build 7 provenance-controlled candidate` | PASS |
| IPA `CFBundleIdentifier` | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |
| IPA `CFBundleShortVersionString` | `1.0.0` | `1.0.0` | PASS |
| IPA `CFBundleVersion` | `7` | `7` | PASS |
| IPA SHA-256 | exact downloaded artifact | `bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13` | PASS |

## Mandatory build-number table

| Source | Initial value | Final pre-build value | Evidence |
|---|---:|---:|---|
| Apple App Store Connect | `5` | `5` | Initial and final independent App Store Connect history queries |
| EAS production iOS history | `6` | `6` | Initial and final independent EAS iOS history queries |
| Canonical `app.json` | `6` | `7` | Build-number-only commit `dec8f0d` |

```text
INITIAL_LIVE_FLOOR = 6
INITIAL_NEXT_SAFE_BUILD = 7
FINAL_LIVE_FLOOR = 6
FINAL_NEXT_SAFE_BUILD = 7
```

## Final questions

**A. What fresh build number was selected?**  
`7`.

**B. Was it above both live Apple and EAS floors?**  
Yes. Apple was `5`, EAS was `6`, and build `7` was selected.

**C. What exact canonical Git SHA was built?**  
`dec8f0d6a9531cb5a2eb73c01706dc75354e743c`.

**D. What exact Git tree was built?**  
`f4c820017b82c48052571eb432806b3185aabcfb`.

**E. Did the exact-SHA release gate pass?**  
Yes. Check-run `105160714606` completed successfully for the exact SHA.

**F. Was the build created from a standalone clone with durable `.git`
metadata?**  
Yes: `/tmp/calora-step55b-build`.

**G. Did the provenance assertion pass immediately before build?**  
Yes.

**H. What exact EAS Build ID was created?**  
`45900e2d-298f-4ece-9041-0e42513266e4`.

**I. What Git SHA did EAS record?**  
`dec8f0d6a9531cb5a2eb73c01706dc75354e743c`.

**J. Does the EAS-recorded SHA exactly equal the canonical build SHA?**  
Yes.

**K. Did the EAS build finish successfully?**  
Yes. Status `FINISHED`.

**L. Does the IPA bundle ID match Calora?**  
Yes: `com.etiendem.caloraapp`.

**M. Does the IPA marketing version equal `1.0.0`?**  
Yes.

**N. Does the IPA build number equal `FINAL_NEXT_SAFE_BUILD`?**  
Yes: both are `7`.

**O. Was IPA SHA-256 recorded?**  
Yes:
`bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13`.

**P. Were all five recovered targets preserved?**  
Yes. The commit changed only the build number.

**Q. Was Smart Scan/Home preserved?**  
Yes.

**R. Was bounded Coach preserved?**  
Yes.

**S. Was Premium/account isolation preserved?**  
Yes.

**T. Was Fitness excluded?**  
Yes.

**U. Does failed build 6 remain unsubmitted?**  
Yes.

**V. Was the new build left unsubmitted?**  
Yes.

**W. Was Android untouched?**  
Yes. No Android build was created.

**X. Were API/database/deployment operations avoided?**  
Yes.

**Y. Is this exact EAS Build ID ready for owner authorization for Step 56
TestFlight submission?**  
Yes, pending explicit owner authorization. This step did not submit it.

## Final verdict

**IOS RELEASE CANDIDATE VERIFIED — READY FOR STEP 56 TESTFLIGHT AUTHORIZATION**

Stop after Step 55B. Do not submit to TestFlight, do not build Android, and do
not deploy. Wait for owner review and explicit Step 56 authorization.