# Calora TestFlight “Old Runtime” Forensic Report

**Investigation date:** 2026-09-15  
**Repository:** `atembekong-hash/Calora`  
**Canonical source:** `origin/main` at `d5b15e93a930dc3cd83dfd0751907b6501d1b272`  
**Affected installed artifact:** Calora iOS TestFlight `1.0.0 (2)`  
**Scope:** GitHub Actions → EAS source/build → IPA → TestFlight submission → runtime API provenance

## Final classification

**ROOT CAUSE HIGH-CONFIDENCE**

The installed iOS binary is not an older mobile source build. It is an EAS
production build from the current canonical `origin/main` SHA, and its embedded
JavaScript contains the current Calora screens and feature code.

The high-confidence cause of the perceived age difference is the runtime
environment split: the production API origin baked into the iOS build is
serving a separately published API release from September 9, while the
development/Android path uses the current development API origin. The current
mobile bundle can therefore be installed correctly while receiving older
planner, recipe, capture, sync, and related backend behavior/data on iOS.

The exact screen-by-screen device symptom is not independently reproduced here:
there is no device console export, screenshot comparison, or App Store Connect
API response captured in this workspace. That limits the conclusion to
**high-confidence**, rather than proving which individual API response produced
each visual difference.

## Constraints honored

This investigation did not:

- merge `replit-agent`;
- merge any historical, release, backup, or `subrepl-*` branch;
- modify application code, configuration, dependencies, or workflows;
- push any branch;
- trigger GitHub Actions;
- trigger an EAS build;
- submit another TestFlight build;
- submit any new App Store build.

The IPA was downloaded read-only from the already recorded EAS artifact URL and
inspected under `/tmp`. No downloaded binary or temporary log was added to the
repository.

## Executive findings

1. GitHub Actions run `34962805533` / run 11 ran from `main` at
   `d5b15e93a930dc3cd83dfd0751907b6501d1b272`.
2. That run created EAS build
   `5a691265-87a1-423a-9549-82efe832f898`.
3. EAS records the exact same Git SHA on that build.
4. The EAS build produced iOS app version `1.0.0`, build `2`, bundle identifier
   `com.etiendem.caloraapp`.
5. The downloaded IPA has SHA-256:

   ```text
   ab9da07d665ab4442d0bd624923baac6896ae1e8190ddaef2843f9568b44a6ef
   ```

6. The IPA’s `main.jsbundle` contains current-main markers from Home, Smart
   Scan, Planner editing/programs, Progress, AI Recipe Creator, Coach fact
   context, Food Memory, notifications, and Apple Health.
7. EAS submission
   `74e62bee-cae5-4b6c-b1de-72a14f3ed46b` explicitly references submitted build
   `5a691265-87a1-423a-9549-82efe832f898`. `eas submit --latest` did not select
   an older different EAS build.
8. The production API origin used by the IPA reports server release
   `22cbe8a68905654f769e2ac5f5beab65f894cadf`, built on September 9, with source
   tree `3a6f9b93cb7590d57d5f456fca1b993a0a61091a`.
9. The canonical repository tree at the mobile build SHA is
   `7208584091da3492fccb8e118209f7fcb5d93951`; it is not the production API
   tree reported above.
10. The development API origin currently reports a September 15 release and
    the Calora development script points to that development origin rather than
    the production origin. This explains why an Android/development runtime can
    appear newer than the correctly built TestFlight binary.

## 1. Exact GitHub SHA → EAS build chain

### 1.1 GitHub Actions

Public GitHub Actions metadata identifies:

| Field | Value |
|---|---|
| Workflow run | `34962805533` |
| Run number | `11` |
| Branch | `main` |
| Head SHA | `d5b15e93a930dc3cd83dfd0751907b6501d1b272` |
| Conclusion | `success` |
| Created | `2026-09-15T11:21:01Z` |
| Completed | `2026-09-15T11:32:33Z` |

The workflow checked out the repository and runs its commands with
`artifacts/calora` as the working directory. Its release sequence is:

```text
checkout main
install from the Calora app directory
link Expo project 1f202325-5b9a-4260-978f-abbd3252b9ee
eas build --platform ios --profile production --wait
eas submit --platform ios --latest
```

The workflow configuration on the canonical source uses the Calora Expo
project directory, not the repository root. This rules out the previously
documented root-level Expo Router entry-point failure for this successful run.

### 1.2 EAS build

| Field | Value |
|---|---|
| EAS build ID | `5a691265-87a1-423a-9549-82efe832f898` |
| Status | `FINISHED` |
| Platform | iOS |
| Profile | `production` |
| Distribution | `STORE` |
| Git SHA | `d5b15e93a930dc3cd83dfd0751907b6501d1b272` |
| Expo project ID | `1f202325-5b9a-4260-978f-abbd3252b9ee` |
| Owner/app | `vvault07` / `Calora` |
| SDK | `54.0.0` |
| App version | `1.0.0` |
| iOS build | `2` |
| Bundle identifier | `com.etiendem.caloraapp` |
| Created | `2026-09-15T11:22:06.683Z` |
| Completed | `2026-09-15T11:29:35.287Z` |

The stable EAS artifact URL recorded by EAS is:

```text
https://expo.dev/artifacts/eas/tWXcGGyJK07-TriRCO4g2R-_yUmonBSLhAdQ-daPFrs.ipa
```

### 1.3 EAS submission

| Field | Value |
|---|---|
| EAS submission ID | `74e62bee-cae5-4b6c-b1de-72a14f3ed46b` |
| Status | `FINISHED` |
| Created | `2026-09-15T11:29:45.834Z` |
| Completed | `2026-09-15T11:32:28.332Z` |
| Submitted EAS build | `5a691265-87a1-423a-9549-82efe832f898` |
| App Store Connect app ID | `6800321660` |
| Bundle identifier | `com.etiendem.caloraapp` |

The submission record embeds the complete EAS build object and repeats its
Git SHA, app version, build number, artifact URL, Expo project, and
distribution. This is direct evidence that the successful TestFlight
submission used the current-SHA EAS build rather than a stale “latest” build
from a previous source snapshot.

## 2. EAS build-worker and Metro evidence

The decompressed EAS build log contains these build-worker values:

```text
EAS_BUILD_PROFILE=production
EAS_BUILD_GIT_COMMIT_HASH=d5b15e93a930dc3cd83dfd0751907b6501d1b272
EAS_BUILD_PROJECT_ID=1f202325-5b9a-4260-978f-abbd3252b9ee
EAS_BUILD_WORKINGDIR=/Users/expo/workingdir/build
```

The log also records:

```text
/Users/expo/workingdir/build/artifacts/calora/package.json
Writing bundle output to: .../main.jsbundle
Executing CaloraApp » Bundle React Native code and images
Archive Succeeded
/Users/expo/workingdir/build/artifacts/calora/ios/build/CaloraApp.ipa
```

The production build log reports:

```text
EAS_USE_CACHE=0
EAS_GRADLE_CACHE=0
EAS_USE_NPM_CACHE=0
```

Therefore the evidence does not support an old EAS/Metro cache selecting a
previous mobile source bundle. The archive was built from the Calora project
path, Metro wrote a fresh iOS JavaScript bundle, and Xcode successfully
packaged that bundle into the submitted IPA.

## 3. IPA identity and embedded runtime

The inspected IPA contains:

```text
Payload/CaloraApp.app/Info.plist
Payload/CaloraApp.app/EXConstants.bundle/app.config
Payload/CaloraApp.app/main.jsbundle
```

Selected values from the signed app:

| IPA field | Value |
|---|---|
| `CFBundleIdentifier` | `com.etiendem.caloraapp` |
| `CFBundleShortVersionString` | `1.0.0` |
| `CFBundleVersion` | `2` |
| Minimum iOS | `15.1` |
| Expo SDK | `54.0.0` |
| Expo project ID in embedded config | `1f202325-5b9a-4260-978f-abbd3252b9ee` |
| Embedded iOS build number | `2` |
| Embedded bundle identifier | `com.etiendem.caloraapp` |

The embedded config has no evidence of a separately supplied OTA update URL.
The inspected app therefore contains and starts from its embedded
`main.jsbundle`; this is not an indication that an old EAS Update bundle
replaced the current source at launch.

### 3.1 Current-main source markers present in `main.jsbundle`

The following current-main strings were checked against the extracted IPA
bundle. Each listed marker was found in the bundle:

| Current source area | Embedded bundle markers |
|---|---|
| Home | `Choose a day`; `Review your ring and diary by date.`; `JUST LOGGED` |
| Smart Scan | `Scan food`; `Barcodes and photos, reviewed before logging.`; `Review before it counts`; `Approve and add to diary` |
| Planner | `YOUR WEEK IS READY`; `Review or edit meals.`; `YOUR PROGRAM` |
| Progress | `WEEKLY SIGNAL`; `THE BIGGER PICTURE`; `Patterns, not pressure`; `Context for the numbers, not a score.` |
| Recipes | `AI Recipe Creator`; `Food photo unavailable`; `FITS YOUR GOAL` |
| Coach | `Nutrition, in context`; `See my weekly read`; `Ask about meals, hydration, patterns, or what to do next.` |
| Profile/Health | `Hydration reminders`; `Apple Health` |
| Food Memory | `Food Memory`; `Review before it counts` |

These are not merely native framework strings. They are distinctive product
copy from the current Calora route files and establish that the current
mobile feature tree was bundled into the IPA.

## 4. Alternate-source, platform, and feature-gate audit

### 4.1 Expo entry and archive boundaries

The canonical Calora package still declares:

```json
"main": "expo-router/entry"
```

The EAS log shows the worker reading
`/Users/expo/workingdir/build/artifacts/calora/package.json` and bundling
`expo-router/entry`. The archive path includes the monorepo’s
`artifacts/calora` tree. No root-level fallback `App.*` entry was used in this
successful build.

The canonical Metro configuration watches the workspace root and resolves
modules from both the Calora and workspace `node_modules` directories. The
root `.easignore` keeps the required workspace/vendor files while excluding
installed dependencies and caches. Nothing in the inspected IPA or EAS log
indicates that an older source directory was substituted.

### 4.2 iOS-specific source

The only platform-specific implementation files found in the Calora
application source are:

```text
lib/health/healthService.ios.ts
lib/health/healthService.android.ts
lib/health/healthService.web.ts
```

The tab layout is shared across platforms. iOS-specific behavior in the tab
bar is limited to transparent/blurred tab-bar presentation and SF Symbol
icons. The iOS health adapter is the expected native implementation. There is
no older iOS screen tree, `.ios.tsx` screen override, or alternate iOS router
entry that could account for a whole-app older UI.

### 4.3 Static feature flags

The current source uses deterministic, compiled intelligence flags. The
current bundle includes the feature implementation and the source flags have
these relevant states:

```text
intelligence.insights.today = true
intelligence.insights.progress = true
intelligence.coach.fact_context = true
intelligence.insights.progress_weight_trend = false
intelligence.insights.progress_nutrition_coverage = false
intelligence.insights.progress_macro_record_coverage = false
intelligence.evidence.display = false
intelligence.observability = false
intelligence.feedback = false
intelligence.proactive = false
```

These gates explain intentionally dark subfeatures, but they do not select an
older navigation or screen implementation. The core current tabs and feature
markers are present in the IPA.

### 4.4 Local state

The app restores account-scoped encrypted local state, including onboarding
completion, profile, diary data, planner state, saved recipes, notification
preferences, Coach history, and Food Memory. A previously used TestFlight
installation can therefore open with older local data, completed onboarding,
or a different account scope.

That can change the content and initial state shown after launch. It cannot
remove the current route code from the IPA, and the local-state path does not
explain the independently verified production API mismatch below.

## 5. Production API provenance

The production API origin configured by the EAS `production` profile is:

```text
https://calorie-coach-pie35449.replit.app
```

A read-only request to its public version endpoint returned:

```json
{
  "schemaVersion": "calora.release-attestation.v1",
  "gitCommit": "22cbe8a68905654f769e2ac5f5beab65f894cadf",
  "sourceTree": "3a6f9b93cb7590d57d5f456fca1b993a0a61091a",
  "sourceDigest": "a736ac84ca77646f1c682149c5cc3e506c37ed5617a618f06c85c7b5db07f836",
  "buildTimestamp": "2026-09-09T02:02:43.693Z",
  "releaseId": "calora-api-22cbe8a68905-20260909020243693"
}
```

The same origin returned `{"status":"ok"}` from `/api/healthz`, so this is a
healthy but old release, not a generic outage.

The reported production server commit has root tree
`3a6f9b93cb7590d57d5f456fca1b993a0a61091a`. The canonical mobile-build commit
has root tree `7208584091da3492fccb8e118209f7fcb5d93951`. They are different
source trees.

The source-tree comparison shows substantial differences in API paths used by
current Calora surfaces:

| API area | Difference between production API tree and canonical main |
|---|---:|
| `routes/capture.ts` | 82 deleted lines |
| `routes/planner.ts` | 502 changed/added lines |
| `routes/premiumRecipes.ts` | 29 changed lines |
| `routes/recipes.ts` | 57 changed lines |
| `routes/restaurantFoods.ts` | 5 changed lines |
| `routes/sync.ts` | 17 changed lines |
| Combined selected route diff | 467 insertions, 225 deletions |

The current mobile bundle directly consumes these areas through Smart Scan,
Planner, Recipes, Restaurants, premium recipe access, and diary sync. A
healthy API at the older source tree can therefore make the current iOS
bundle behave and populate itself like an older Calora release.

### 5.1 Development/Android comparison

The Calora development script sets:

```text
EXPO_PUBLIC_API_URL=https://$REPLIT_DEV_DOMAIN
```

The current development API origin reports a September 15 release:

```json
{
  "schemaVersion": "calora.release-attestation.v1",
  "gitCommit": "a6aacfe3c739662a2e75f0990ec0b7af1e78c35a",
  "sourceTree": "c44c2095f510ccd35765efbfb0ca780803483594",
  "buildTimestamp": "2026-09-15T22:50:13.792Z",
  "releaseId": "calora-api-a6aacfe3c739-20260915225013792"
}
```

This is direct evidence of two different API runtimes:

```text
TestFlight production mobile runtime → calorie-coach-pie35449.replit.app → 2026-09-09 API
Development/Android path             → $REPLIT_DEV_DOMAIN             → 2026-09-15 API
```

That environment split is the most likely reason the same current mobile
source appears newer in the Android/development experience than in TestFlight.

## 6. Hypotheses ruled out

### Wrong EAS build selected by `--latest`

**Ruled out.** The finished submission’s `submittedBuild.id` is exactly
`5a691265-87a1-423a-9549-82efe832f898`, the build whose Git SHA is the
canonical current `origin/main` SHA.

### GitHub Actions built a historical branch

**Ruled out for this submission.** Public run metadata says branch `main`,
head SHA `d5b15e9…`; EAS records the same full SHA.

### Root-level Expo Router/Metro entry was used

**Ruled out for this successful build.** The worker read the Calora package
manifest, used the Calora app path, wrote `main.jsbundle`, and archived the
application successfully.

### A stale EAS/Metro cache supplied the JavaScript

**Not supported.** The build log records the cache-disabled production
settings, a fresh bundle-write step, and current-main feature strings in the
downloaded IPA.

### A separate old iOS screen implementation was selected

**Not supported.** No old `.ios.tsx` or `.ios.ts` screen override exists.
Platform-specific source is limited to health adapters and small native UI
presentation differences.

### An OTA update replaced the current bundle with an old one

**Not supported by the IPA inspection.** The app contains the current bundle
and no separately supplied update URL was found in the embedded config.

## 7. Remaining evidence limits

The following were not available as independent evidence in this read-only
investigation:

- an App Store Connect API response identifying the processed build;
- a physical-device console export from the installed TestFlight app;
- a screenshot or screen recording paired with account, local-state, and API
  response details;
- authenticated comparisons of the exact planner/recipe/capture responses
  received by the iOS and Android sessions.

The EAS submission record does identify the App Store Connect app, bundle
identifier, app version/build, artifact, and exact submitted EAS build. The
remaining limits prevent attributing every visible old-looking card to one
specific endpoint or persisted state, but they do not weaken the binary
provenance chain.

## Conclusion

The TestFlight `1.0.0 (2)` binary is the current canonical mobile application
source:

```text
origin/main d5b15e9
  → GitHub Actions run 34962805533 / 11
  → EAS build 5a691265-87a1-423a-9549-82efe832f898
  → IPA SHA-256 ab9da07d...
  → EAS submission 74e62bee-cae5-4b6c-b1de-72a14f3ed46b
  → App Store Connect app 6800321660
  → TestFlight 1.0.0 (2)
```

The old-runtime symptom is therefore not caused by an old Git branch, an old
EAS build, `--latest` selecting the wrong artifact, a root Metro entry, or an
old iOS source tree.

The strongest supported cause is the stale production API release behind the
TestFlight configuration. The iOS app is current, but it is talking to a
healthy API built from an older source tree than the current development
runtime. No fix, rebuild, deployment, branch operation, or TestFlight action
was performed as part of this report.