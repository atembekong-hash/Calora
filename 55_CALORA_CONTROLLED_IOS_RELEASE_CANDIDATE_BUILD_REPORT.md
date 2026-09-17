# Calora — Step 55 Controlled iOS Release-Candidate Build Report

**Date:** 2026-09-17  
**Product:** CaloraApp / `@vvault07/calora`  
**Step:** 55 — controlled iOS release-candidate build  
**Final verdict:** **IOS RELEASE CANDIDATE PROVENANCE FAILED — DO NOT SUBMIT**

## 1. Executive summary

The controlled Step 55 gates passed through signing and production-environment
preflight, and exactly one EAS iOS production build was created. The live
Apple App Store Connect and EAS build-number floors were independently verified
as `5`, so the selected safe build number was `6`.

The intended build source was the narrow build-number commit
`5f69c31e4816abcfa5fff69389e4699fd4f1428f`, descended directly from the
canonical `origin/main` SHA `755b433240c262487a6d77472c4f7dafaba2615a`.
However, EAS recorded the created build as originating from
`b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f`, with the commit message
`Add CALORA step 55 controlled release candidate build notes`. That is not the
canonical candidate SHA and is not the pushed `origin/main` revision.

The resulting IPA has the expected bundle identity and build number, but the
source/binary chain is broken. The IPA is therefore **not a verified Calora
release candidate and must not be submitted to TestFlight**. No second build,
TestFlight submission, Android build, API deployment, database operation, or
product remediation was performed.

## 2. Starting canonical SHA/tree

Before the build-number change, `origin/main` was verified as:

- **SHA:** `755b433240c262487a6d77472c4f7dafaba2615a`
- **Tree:** `61e9a7146e7dce1dce859cfc48487d4da43019a0`

The prior exact-SHA release validation evidence was:

- **Workflow run:** `35187963067`
- **Required check-run:** `105094029376`
- **Check:** `Run release validation suite`
- **Conclusion:** `success`

## 3. Source-freeze verification

A detached clean worktree was created from the exact starting
`origin/main` SHA. Before the authorized change it resolved to the starting
SHA/tree above and had no tracked changes.

After the build-number change, the intended candidate resolved to:

- **Candidate SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Candidate tree:** `0b4185eac78f8b42097fce0334691487df740e53`
- **Parent:** `755b433240c262487a6d77472c4f7dafaba2615a`
- **Changed path:** `artifacts/calora/app.json` only

The candidate was pushed fast-forward to `origin/main`. Immediately after
push, `origin/main` resolved to the candidate SHA/tree above.

The build invocation exposed an environment provenance failure: the temporary
nested worktree's Git metadata was later pruned while the directory remained
present in the workspace. EAS therefore resolved the outer workspace repository
and recorded the outer local commit `b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f`
instead of the intended candidate SHA. This mismatch is why this run is
blocked.

## 4. Existing release-gate evidence

The new build-number commit received the exact required release check:

- **Check-run:** `105115209229`
- **Check:** `Run release validation suite`
- **Head SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Status:** `completed`
- **Conclusion:** `success`

The check completed before the EAS build request.

## 5. iOS application identity

- **App name:** `CaloraApp`
- **Expo slug:** `calora`
- **Expo owner:** `vvault07`
- **Expo project ID:** `1f202325-5b9a-4260-978f-abbd3252b9ee`
- **Bundle identifier:** `com.etiendem.caloraapp`
- **Marketing version:** `1.0.0`
- **Configured build number before change:** `5`
- **Configured build number for candidate:** `6`
- **Production EAS profile:** `production`
- **Production profile environment:** `production`
- **`cli.appVersionSource`:** `local`
- **`build.production.autoIncrement`:** `false`
- **Submission profile:** App Store Connect app ID `6800321660`, Apple team ID
  `B5344GJRMT`, bundle identifier `com.etiendem.caloraapp`

## 6. Apple build-number evidence

The repository preflight independently queried App Store Connect using the
configured App Store Connect app ID and the workspace's managed Apple API
credentials. The highest valid Apple-consumed iOS build number was:

- **Apple App Store Connect floor:** `5`

No secret values or private key material were printed or written to this
report.

## 7. EAS build-number evidence

The repository preflight independently queried EAS iOS build history. The
highest valid EAS-consumed iOS build number was:

- **EAS production iOS floor:** `5`

The preflight also found no active iOS EAS build before the controlled queue
operation.

## 8. LIVE_FLOOR calculation

```text
LIVE_FLOOR = max(Apple floor 5, EAS floor 5)
            = 5
```

## 9. NEXT_SAFE_BUILD

```text
NEXT_SAFE_BUILD = LIVE_FLOOR + 1
                 = 6
```

## 10. Build-number configuration before change

The canonical configuration before the change contained:

```text
expo.version              = 1.0.0
expo.ios.buildNumber      = 5
cli.appVersionSource      = local
build.production.autoIncrement = false
```

## 11. Build-number change

The current configured build number did not equal `NEXT_SAFE_BUILD`, so the
minimum authorized change was required:

- **Old value:** `5`
- **New value:** `6`
- **Changed file:** `artifacts/calora/app.json`
- **Product source changes:** none
- **Other configuration changes:** none

`appVersionSource: local` and `autoIncrement: false` were preserved.

## 12. Build-number commit SHA/tree/parent

- **Parent SHA:** `755b433240c262487a6d77472c4f7dafaba2615a`
- **Commit SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Commit tree:** `0b4185eac78f8b42097fce0334691487df740e53`
- **Commit subject:** `Prepare iOS build 6 release candidate`
- **Changed path:** `artifacts/calora/app.json`

## 13. Push result

The candidate was pushed normally and fast-forward only:

```text
755b433240c262487a6d77472c4f7dafaba2615a
  -> 5f69c31e4816abcfa5fff69389e4699fd4f1428f
origin/main
```

No force push, merge, rebase, or history rewrite was used.

## 14. Post-change canonical SHA/tree

After the push and before the EAS request:

- **`origin/main` SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **`origin/main` tree:** `0b4185eac78f8b42097fce0334691487df740e53`

The remote remained at this SHA after the EAS build completed.

## 15. Exact-SHA release-validation run/check

- **Head SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Check-run:** `105115209229`
- **Check:** `Run release validation suite`
- **Status:** `completed`
- **Conclusion:** `success`

## 16. Final BUILD_SOURCE_SHA/tree

The intended final build freeze was:

- **Intended `BUILD_SOURCE_SHA`:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Intended `BUILD_SOURCE_TREE`:** `0b4185eac78f8b42097fce0334691487df740e53`

EAS recorded a different source:

- **Observed EAS source SHA:** `b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f`
- **Observed outer-workspace tree:** `24d4eb57a3b27597fe449091293207ccd49b5ce6`
- **Observed EAS commit message:** `Add CALORA step 55 controlled release candidate build notes`

**Result:** failed. The observed EAS source does not equal the intended
canonical build source.

## 17. Working-tree cleanliness

The detached candidate worktree was clean during source validation and before
the queue command. The environment subsequently reported the temporary
worktree as `prunable` and removed its nested Git metadata while retaining its
files. This caused EAS to use the outer workspace's Git provenance. Because
the EAS record is authoritative for the build's source metadata, the final
binary cannot be accepted as a canonical-source build.

## 18. Prebuild validation

All prebuild validation completed before the queue request:

- `pnpm install --frozen-lockfile`: passed
- OpenAPI client code generation: passed with no tracked drift
- `pnpm run typecheck`: passed
- `pnpm --filter @workspace/calora test`: passed
- `pnpm --filter @workspace/api-server test`: passed after generating the
  required ignored local `dist` artifact for the rolling-restart test
- `pnpm --filter @workspace/scripts test`: passed
- Calora static-security tests: passed
- Expo config validation: passed
- `git diff --check`: passed

The final resolved Expo configuration reported the expected production
identity, build number `6`, and platform configuration.

## 19. Test totals

- **Calora Vitest:** 87 test files passed; 1,185 tests passed
- **Calora server security tests:** 6 passed
- **API Vitest:** 36 test files passed; 438 tests passed; 4 intentional skips
- **Scripts Node tests:** 47 tests passed
- **Workspace and artifact typechecks:** passed
- **Release validation check:** passed for the exact candidate SHA

Expected warning/error output from tests was test-fixture behavior; no test
assertion failed after the required ignored API `dist` artifact was generated.

## 20. Signing preflight

The existing repository-supported read-only iOS signing preflight passed:

- EAS App Store distribution certificate: valid
- Certificate expiry: `2027-07-21`
- Provisioning profile: active and valid
- Provisioning profile expiry: `2027-07-21`
- EAS project: `@vvault07/calora`
- Bundle identifier: `com.etiendem.caloraapp`

The host was Linux, so the macOS-only Apple certificate rehearsal was not run.
The preflight explicitly validates the EAS signing record; it does not prove
Apple-side state on a native macOS signing host.

## 21. Production-environment preflight

The resolved production profile passed the required safe checks:

- Production API endpoint present and points to the Calora production service
- Supabase URL and public configuration present
- RevenueCat iOS public configuration present
- Expo project identity matches
- `environment: production`
- No `localhost`
- No `127.0.0.1`
- No Replit development preview URL
- No mock provider mode
- No development-only flag detected

Only presence and safe target identity were recorded; secret values were not
printed.

## 22. EAS build command/action

The controlled repository queue command was run once:

```text
EAS_CLI_COMMAND=/tmp/calora-eas-wrapper \
pnpm --filter @workspace/calora run build:ios:production
```

The wrapper used a transient EAS CLI and did not change project dependencies.
The repository command performed the build-number and signing gates, then
invoked one non-interactive iOS production build with frozen credentials and
without waiting.

## 23. Exact EAS Build ID

```text
fffc4d8a-5e1b-48f0-98c9-e2949136cf04
```

## 24. EAS build status

- **Status:** `FINISHED`
- **Platform:** iOS
- **Profile:** `production`
- **Distribution:** `STORE`
- **Project:** `@vvault07/calora`
- **App version:** `1.0.0`
- **EAS app build version:** `6`

## 25. EAS source/provenance metadata

The exact EAS record reported:

- **Git commit hash:** `b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f`
- **Git commit message:** `Add CALORA step 55 controlled release candidate build notes`
- **Created:** `2026-09-17T07:35:35.323Z`
- **Completed:** `2026-09-17T07:42:36.335Z`

This does not match the intended candidate SHA
`5f69c31e4816abcfa5fff69389e4699fd4f1428f`. The mismatch is a hard stop under
the Step 55 runbook.

## 26. Marketing version

- **Expected:** `1.0.0`
- **EAS observed:** `1.0.0`
- **IPA observed:** `1.0.0`

## 27. iOS build number

- **Expected:** `6`
- **EAS observed:** `6`
- **IPA observed:** `6`

## 28. Bundle identifier

- **Expected:** `com.etiendem.caloraapp`
- **EAS observed:** `com.etiendem.caloraapp`
- **IPA observed:** `com.etiendem.caloraapp`

## 29. IPA artifact verification

The IPA was downloaded from the artifact belonging to the exact EAS Build ID
above, not from an ambiguous latest-build lookup. The archive was extracted
successfully with `unzip`, and the embedded `Info.plist` was parsed
successfully.

Artifact URL:

`https://expo.dev/artifacts/eas/2gX5IWrIrkyggJ9Y4fpynxLUF3zSJ4CKn4tRtX2vRJk.ipa`

## 30. IPA size

- **Size:** `45,723,670` bytes

## 31. IPA SHA-256

```text
ba53bc6a086f2d7b6a26e0681d7984e59ece5e6d2e6473def9eed5f1e40cb646
```

## 32. Info.plist verification

| Key | Expected | Observed | Result |
|---|---|---|---|
| `CFBundleIdentifier` | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |
| `CFBundleShortVersionString` | `1.0.0` | `1.0.0` | PASS |
| `CFBundleVersion` | `6` | `6` | PASS |

These binary identity checks pass, but they do not repair the failed Git
source provenance check.

## 33. Recovery-target preservation

The build-number commit changed only `artifacts/calora/app.json`; it did not
remove or alter product source. The canonical source lineage therefore
preserves all five recovered recovery targets:

- R-01 onboarding keyboard
- R-02 agreement semantics
- R-03 Plus remount
- R-04 Discover/Plus freshness
- R-05 nutrition truthfulness

The source and release-validation checks passed before the EAS request.

## 34. Smart Scan/Home preservation

The build-number-only commit preserved the canonical Smart Scan approval and
Home Today source. No product source path changed.

## 35. Coach safety preservation

The build-number-only commit preserved the bounded Coach safety implementation.
No Coach source path changed, and the prebuild test suites passed.

## 36. Premium/account isolation preservation

The build-number-only commit preserved Premium/RevenueCat behavior and account
isolation. No product source, API source, database, or schema path was changed
for Step 55.

## 37. Fitness exclusion

Fitness remained intentionally excluded. No Fitness product work was added.

## 38. Confirmation no Android build

No Android EAS build was created.

## 39. Confirmation no TestFlight submission

No `eas submit`, `eas build:submit`, App Store upload, or TestFlight workflow
submission was run.

## 40. Confirmation no API/database deployment

No API/backend deployment was run. No database, schema, migration, seed, or
production data operation was run. The local API bundle generated for a test
precondition was ignored local output only and was not deployed.

## 41. Remaining physical-device verification

Not performed in Step 55:

- macOS-native Apple certificate rehearsal
- installation and launch on a physical iPhone
- physical-device health, camera, notification, and native-auth verification

These cannot make the mismatched EAS source acceptable.

## 42. Remaining live-provider verification

Not performed in Step 55:

- TestFlight processing
- TestFlight installation
- owner-authorized App Store submission
- live-provider behavior after TestFlight distribution

The failed source provenance must be resolved before any such verification.

## 43. Exact recommendation for Step 56

Do **not** authorize or submit EAS Build ID
`fffc4d8a-5e1b-48f0-98c9-e2949136cf04` to TestFlight. It has the expected
binary identity, but EAS proves it was built from
`b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f`, not from the canonical candidate
SHA `5f69c31e4816abcfa5fff69389e4699fd4f1428f`.

Step 56 should remain closed. A future owner-authorized run must first use a
build checkout whose Git metadata cannot be pruned or resolve to an outer
workspace, then repeat the required source-freeze and provenance controls.
This report does not authorize a second build.

## Mandatory build identity table

| Identity | Expected | Observed | Result |
|---|---|---|---|
| Git SHA | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | `b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f` | **FAIL** |
| Git tree | `0b4185eac78f8b42097fce0334691487df740e53` | `24d4eb57a3b27597fe449091293207ccd49b5ce6` | **FAIL** |
| Expo owner | `vvault07` | `vvault07` | PASS |
| Expo project ID | `1f202325-5b9a-4260-978f-abbd3252b9ee` | `1f202325-5b9a-4260-978f-abbd3252b9ee` | PASS |
| Bundle ID | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |
| Marketing version | `1.0.0` | `1.0.0` | PASS |
| Build number | `6` | `6` | PASS |
| EAS profile | `production` | `production` | PASS |
| EAS Build ID | one exact controlled build | `fffc4d8a-5e1b-48f0-98c9-e2949136cf04` | PASS |
| IPA `CFBundleIdentifier` | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |
| IPA `CFBundleShortVersionString` | `1.0.0` | `1.0.0` | PASS |
| IPA `CFBundleVersion` | `6` | `6` | PASS |

## Mandatory build-number table

| Source | Highest consumed / configured value | Evidence |
|---|---:|---|
| Apple App Store Connect | `5` | Independent App Store Connect build-history query |
| EAS production iOS history | `5` | Independent EAS iOS build-history query |
| Canonical app configuration before change | `5` | `artifacts/calora/app.json` on starting canonical SHA |
| Candidate app configuration | `6` | Narrow build-number commit on `origin/main` |

```text
LIVE_FLOOR = 5
NEXT_SAFE_BUILD = 6
```

## Final questions

**A. Was the release candidate built from exact canonical main?**  
No. The intended candidate was canonical, but EAS recorded a different source
SHA.

**B. What exact Git SHA produced it?**  
EAS recorded `b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f`. The intended canonical
candidate SHA was `5f69c31e4816abcfa5fff69389e4699fd4f1428f`.

**C. What exact EAS Build ID was created?**  
`fffc4d8a-5e1b-48f0-98c9-e2949136cf04`.

**D. What build number was selected?**  
`6`.

**E. Was that build number proven above both Apple and EAS consumed floors?**  
Yes. Both floors were `5`, and `6` was selected.

**F. Did the exact-SHA release gate pass before build?**  
Yes. Check-run `105115209229` passed for SHA `5f69c31e`.

**G. Did all required tests pass before build?**  
Yes, after generating the required ignored local API `dist` test artifact.

**H. Did signing preflight pass?**  
Yes for the EAS signing record. The macOS-only Apple rehearsal was not run on
the Linux host.

**I. Did production-environment preflight pass?**  
Yes.

**J. Does the IPA bundle identifier match Calora?**  
Yes: `com.etiendem.caloraapp`.

**K. Does the IPA marketing version match `1.0.0`?**  
Yes.

**L. Does the IPA build number match `NEXT_SAFE_BUILD`?**  
Yes: `6`.

**M. Was the IPA SHA-256 recorded?**  
Yes:
`ba53bc6a086f2d7b6a26e0681d7984e59ece5e6d2e6473def9eed5f1e40cb646`.

**N. Were all five recovered Step 51 targets preserved?**  
Yes in the canonical source lineage; no product source changed. The produced
IPA is still not accepted because its EAS source provenance failed.

**O. Was Smart Scan/Home preserved?**  
Yes.

**P. Was bounded Coach safety preserved?**  
Yes.

**Q. Was Premium/account isolation preserved?**  
Yes.

**R. Was Fitness kept excluded?**  
Yes.

**S. Was Android left untouched?**  
Yes. No Android build was created.

**T. Was TestFlight submission avoided?**  
Yes.

**U. Were API/database/deployment operations avoided?**  
Yes.

**V. Is this exact EAS Build ID ready for owner authorization to submit to
TestFlight in Step 56?**  
No. Do not submit it.

## Final verdict

**IOS RELEASE CANDIDATE PROVENANCE FAILED — DO NOT SUBMIT**

Stop after Step 55. Do not start Step 56, do not submit to TestFlight, do not
build Android, and do not deploy.