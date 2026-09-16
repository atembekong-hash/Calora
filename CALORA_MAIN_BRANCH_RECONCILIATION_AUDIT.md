# Calora Main-Branch Reconciliation Audit

**Audit date:** 2026-09-15  
**Repository:** `atembekong-hash/Calora`  
**Canonical comparison ref:** `origin/main`  
**Scope:** source and branch reconciliation only

## Executive verdict

**SAFE TO RECONCILE — NO APPLICATION MERGE IS REQUIRED.**

The current GitHub `main` already contains the complete Calora application
tree represented by the likely switched development branch and by the
documented Android APK candidate. The branches have divergent and duplicated
commit histories, but the relevant application source, API source, generated
clients, dependencies, Expo configuration, native configuration, and runtime
assets are already identical where it matters.

Do **not** merge the large `replit-agent` history or any `subrepl-*` branch.
Doing so would replay duplicated history and could reintroduce stale
configuration or documentation-only changes. The safe canonical action is to
keep the current GitHub `main` tree and build only from its verified SHA after
the owner authorizes a build.

The actual installed Android APK's binary provenance is **not determinable
from this repository**. The repository contains no APK, EAS build ID, APK URL,
APK hash, native build number, or signed-device evidence. The documented APK
candidate is nevertheless an ancestor of current `origin/main`, and the
likely switched development branch has the same application tree as `main`.
If the installed APK was built from either of those sources, no source
reconciliation is missing. If it was built from an unrecorded SHA, that SHA
must be supplied before making a binary-level claim.

## Constraints honored

This audit did not:

- merge any branch;
- push any branch;
- delete any branch;
- modify application code;
- trigger an Android or iOS build;
- trigger GitHub Actions;
- submit anything to TestFlight.

The only workspace artifact created by this audit is this report.

## 1. Current canonical identity

| Ref | SHA | Tree | Status |
|---|---|---|---|
| `origin/main` | `d5b15e93a930dc3cd83dfd0751907b6501d1b272` | `7208584091da3492fccb8e118209f7fcb5d93951` | Current GitHub canonical source |
| local `main` | `0e702fc` | local historical reconciliation line | Stale/divergent from GitHub `main` |
| current workspace `calora-eas-archive-fix` | `dccd4bf2ed768101fa52540a2dbf0f25a64ae3e0` | `6c7bbc3a19c5ae8614b8958e9abd155db73d4c4f` | Local task branch; not the canonical source |
| local `replit-agent` | `d5b72112bd542b666efce726775f971c2bacb71d` | same application tree as `origin/main` | Likely switched development ref; history differs |

`origin/main` was refreshed successfully with `git fetch origin --prune`.
A broad `git fetch --all --prune` also attempted to contact Replit-generated
`subrepl-*` remotes, but those SSH endpoints were unavailable in this
environment. Their local refs were still audited. No GitHub origin ref was
lost because of that limitation.

## 2. Android APK source determination

### 2.1 Documented APK candidate

`CALORA_PRODUCTION_READINESS_2026-08-27_COACH_CONSENT_ANDROID_APK.md` records:

- implementation source: `b60c12f47ea8cd75f9152c9e95c222af8cadf01b`;
- implementation tree: `aed8be75f58495dc055975efe6e29071548244f2`;
- immutable ref: `origin/calora-rc-2026-08-27-coach-consent-apk`;
- EAS profile: `production-apk`.

The same report explicitly says that no signed APK was triggered and that no
EAS build ID, signed APK URL, APK hash, native build number, or installed-device
result exists. Therefore this is the strongest recorded **source candidate**,
not proof of the installed binary's provenance.

### 2.2 Relationship to current `main`

The APK candidate is an ancestor of current `origin/main`:

| Comparison | Result |
|---|---:|
| APK-candidate commits absent from `main` | 0 |
| `main` commits after APK candidate | 385 |
| APK candidate is ancestor of `main` | Yes |
| Files changed from APK candidate tree to `main` | 390 |
| Files changed from `main` tree to APK candidate tree | Same 390 paths with reverse direction; no APK-only path |

The 390 changed paths are all later `main` changes. No application feature
exists on the documented APK branch that is missing from current `main`.

### 2.3 Likely switched development branch

The local `replit-agent` ref is the strongest candidate for the branch used
when Replit development was switched away from `main`:

- tip: `d5b72112bd542b666efce726775f971c2bacb71d`;
- merge base with `origin/main`: `23d5719c7ee9e712b6f30b09e55c3e0ac6edfd14`;
- commits only on `replit-agent`: 993;
- commits only on `origin/main`: 2;
- direct tree difference: exactly two documentation/metadata files.

The following application/configuration file hashes are identical on
`origin/main`, `replit-agent`, and the current task branch:

- `artifacts/calora/app.json`;
- `artifacts/calora/eas.json`;
- `artifacts/calora/package.json`;
- `pnpm-lock.yaml`;
- `artifacts/calora/app/(tabs)/recipes.tsx`;
- `artifacts/api-server/src/routes/recipes.ts`.

The only direct tree differences between `replit-agent` and `origin/main` are:

```text
.agents/agent_assets_metadata.toml
docs/calora-ios-eas-entry-point-forensic-report.md
```

Those are not application features. The 993-commit difference is therefore
history divergence/replay, not a missing current application tree.

### 2.4 Determination

**Recorded source candidate:** `b60c12f` / `origin/calora-rc-2026-08-27-coach-consent-apk`.  
**Likely switched development ref:** local `replit-agent` at `d5b7211`.  
**Exact installed APK source:** not determinable without the external build
identity.

The two likely source paths converge on the current `main` application tree,
so the observed age difference in the installed TestFlight binary cannot be
explained by a current Git source difference. It is most likely a binary
build-time/source-snapshot difference that was not recorded in the repository.

## 3. Branch inventory and divergence

Counts below use:

- **only-ref commits:** `git rev-list origin/main..ref`;
- **only-main commits:** `git rev-list ref..origin/main`;
- **changed files:** direct tree difference from `origin/main`.

### 3.1 GitHub origin refs

| Ref | Tip | Only ref | Only main | Merge base | Changed files | Classification |
|---|---:|---:|---:|---|---:|---|
| `origin/main` | `d5b15e9` | 0 | 0 | `d5b15e9` | 0 | Canonical |
| `origin/calora-rc-2026-08-27-coach-consent-apk` | `b60c12f` | 0 | 385 | `b60c12f` | 390 | APK candidate; ancestor |
| `origin/calora-rc-2026-08-27` | `0b95296` | 0 | 389 | `0b95296` | 402 | Older release candidate; ancestor |
| `origin/calora-production-2026-08-27-coach-consent` | `28d72c4` | 0 | 383 | `28d72c4` | 388 | Older production report/source; ancestor |
| `origin/agent/task-658-release-report` | `4049a9a` | 0 | 57 | `4049a9a` | 128 | Ancestor/report line |
| `origin/agent/calora-phase2-prebuild-github-sync` | `2006dca` | 137 | 11 | `b8ed3cf` | 291 | Divergent release/task line |
| `origin/agent/calora-phase2-prebuild-github-sync-report` | `0d22202` | 139 | 11 | `b8ed3cf` | 292 | Divergent report line |
| `origin/agent/calora-release-report-reconciliation` | `19e9241` | 134 | 11 | `b8ed3cf` | 281 | Divergent report line |
| `origin/agent/task-792-eas-archive-fix` | `9138938` | 141 | 11 | `b8ed3cf` | 292 | Divergent EAS remediation line |
| `origin/agent/task-792-eas-archive-size` | `b8b36cf` | 143 | 11 | `b8ed3cf` | 291 | Divergent EAS remediation line |
| `origin/agent/task-792-eas-gate-lessons` | `5204f2b` | 145 | 11 | `b8ed3cf` | 292 | Divergent EAS/report line |
| `origin/agent/task-792-ios-prebuild-remediation` | `7d7183b` | 139 | 11 | `b8ed3cf` | 292 | Divergent iOS remediation line |
| `origin/release/calora-onboarding-and-plus` | `dbf5bd5` | 146 | 11 | `b8ed3cf` | 292 | Divergent release line |
| `origin/replit-pre-auth-sync-backup` | `954a844` | 60 | 693 | `f9a3cad` | 761 | Older backup line |
| `origin/replit-pre-auth-sync-backup-original` | `1687a41` | 59 | 693 | `f9a3cad` | 758 | Older backup line |

The remote `origin` inventory contains 15 GitHub branches plus the symbolic
`origin/HEAD` ref. The only origin ref that is both a plausible APK source and
an ancestor of current `main` is the documented APK RC branch.

### 3.2 Local named refs

There are 406 local branch refs: 24 named branches and 382 `subrepl-*` task
refs. The relevant named refs are:

| Local ref | Tip | Only ref | Only main | Merge base | Changed files |
|---|---:|---:|---:|---|---:|
| `replit-agent` | `d5b7211` | 993 | 2 | `23d5719` | 2 |
| `calora-eas-archive-fix` | `dccd4bf` | 4 | 2 | `23d5719` | 2 |
| `calora-prebuild-remediation` | `8cd42c6` | 0 | 4 | `8cd42c6` | 4 |
| `main` | `0e702fc` | 12 | 29 | `4599c51` | 86 |
| `release/calora-onboarding-and-plus` | `8ae1f1d` | 148 | 11 | `b8ed3cf` | 301 |
| `release/calora-build-ready` | `1ff173d` | 2 | 15 | `afe4df9` | 18 |
| `release/calora-native-storage` | `7f58823` | 4 | 13 | `1f1276c` | 43 |
| `release/calora-onboarding-durable` | `9471e72` | 4 | 14 | `e27a2e8` | 46 |
| `release/calora-p1-clean-v3` | `4e61a60` | 9 | 18 | `8e25605` | 44 |
| `reconciliation/final-clean-calora-publish` | `588bc90` | 11 | 20 | `6de36d7` | 81 |
| `reconciliation/curated-calora-publish` | `20bcf22` | 3 | 20 | `6de36d7` | 90 |

The 382 `subrepl-*` refs are isolated task snapshots. They were enumerated
but are not treated as canonical development branches because their names do
not identify a release target, their remote endpoints were unavailable, and
their application changes are represented by the named/origin refs above.
No `subrepl-*` ref should be merged wholesale.

## 4. Exact feature and file comparison

### 4.1 `replit-agent` versus current `main`

There are no application differences:

| Area | Difference |
|---|---|
| Mobile screens and components | None |
| Mobile libraries and state | None |
| API server/routes | None |
| OpenAPI/generated clients | None |
| Database schema/migrations | None |
| `package.json` / lockfile/workspace | None |
| `app.json` / `eas.json` | None |
| Runtime images/assets | None |
| Tracked Android/iOS native projects | Neither tree tracks `android/` or `ios/` |
| Documentation/metadata | Two files only, listed above |

Therefore:

- user-facing features in `replit-agent` but missing from `main`: **none**;
- user-facing features in `main` but missing from `replit-agent`: **none**;
- database/API/configuration differences: **none**;
- dependency differences: **none**;
- asset/image differences: **none**;
- native Android/iOS configuration differences: **none**.

### 4.2 Documented APK candidate versus current `main`

The APK candidate is an ancestor, so the candidate has no unique source
changes to carry forward. Current `main` contains 385 later commits and 390
changed paths relative to the APK candidate:

| Category | Changed paths from APK candidate to main |
|---|---:|
| Calora mobile source/tests | 109 |
| API server source/tests | 43 |
| Shared API/OpenAPI/generated code | 14 |
| Database schema/migrations/support objects | 6 |
| Expo/package/build configuration | 11 |
| GitHub workflows | 6 |
| Runtime/assets and screenshots | 46 |
| Other documentation/release/security files | 143 |

Important user-facing or runtime additions after the APK candidate include:

- scanner UI and scanner functionality (`ab43987`, `afe4df9`);
- unfinished-onboarding draft resumption and completion persistence
  (`b8ed3cf`, `e27a2e8`);
- Premium TheMealDB V2 recipe integration (`ec770ab`, `a790f5f`);
- recipe, planner, profile, home, capture, meal-image, and nutrition
  refinements represented by the post-candidate mobile source changes;
- encrypted local wellness/storage protection (`8c05c2a`, `1f1276c`);
- authenticated/deletion-fence protection across recipe, planner, Coach,
  capture, and sync paths;
- native-auth/deep-link hardening and release preflight coverage;
- notification, wellness, HealthKit/Health Connect, diary, and export
  reliability changes.

These are **main additions**, not APK-only additions. The older APK candidate
is missing them relative to current source `main`.

### 4.3 API and database differences

Compared with `b60c12f`, current `main` changes 43 API paths and 14 shared
API/generated paths. The important groups are:

- account deletion fences and recovery state;
- capture-session/candidate atomicity and authenticated capture continuity;
- recipe, premium recipe, planner, Coach, and sync request protection;
- account-scoped recovery and logging behavior;
- TheMealDB V2 recipe routes and validation;
- native association and public-release verification;
- regenerated OpenAPI/API-client/Zod declarations.

Database changes are six paths:

```text
lib/db/migrations/0003_recovery_warning_suppression.sql
lib/db/migrations/0004_recovery_warning_summary.sql
lib/db/migrations/meta/_journal.json
lib/db/src/provision-support-objects.test.ts
lib/db/src/provision-support-objects.ts
lib/db/src/schema/index.ts
```

No database change exists on `replit-agent` relative to current `main`.

### 4.4 Dependency and configuration differences

`replit-agent` and `origin/main` have identical:

```text
artifacts/calora/package.json
artifacts/calora/app.json
artifacts/calora/eas.json
pnpm-lock.yaml
pnpm-workspace.yaml
```

Compared with the older APK candidate, current `main` includes the later
workspace/package/build corrections, including:

- pinned Node `20.19.4` and pnpm `10.26.1` in the EAS base profile;
- the `production-apk` profile with Android `buildType: "apk"`;
- production Android/iOS profiles and `submit.production` identity;
- local `vendor/image-size` override and archive inclusion;
- patched `@xmldom/xmldom` workspace overrides;
- `artifacts/calora` as the workflow working directory;
- Expo Router entry-point correction and current project identity.

### 4.5 Assets and images

Compared with the APK candidate, current `main` has 46 asset/screenshot
paths changed, including the Calora food/meal image catalogue and release
evidence screenshots. This is a main-side addition, not a missing APK-side
asset set.

`replit-agent` has no runtime asset/image difference from `main`. The only
direct difference is documentation/metadata.

### 4.6 Native Android/iOS configuration

Neither `origin/main` nor `replit-agent` tracks generated `android/` or
`ios/` directories. Expo CNG generates native projects from static config.

Current `main` preserves:

- Android package: `com.etiendem.caloraapp`;
- iOS bundle identifier: `com.etiendem.caloraapp`;
- Expo project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`;
- owner: `vvault07`;
- Android `versionCode`: `24`;
- iOS TestFlight identity: ASC app `6800321660`, Apple Team `B5344GJRMT`;
- HealthKit entitlement/config plugin;
- current Apple Health read and update purpose strings.

No native configuration needs to be copied from `replit-agent` or the APK
candidate into `main`.

## 5. iOS/TestFlight fixes confirmed on current `main`

All requested fixes are ancestors of `origin/main` and remain present.

| Fix | Preserved evidence |
|---|---|
| Expo/EAS project configuration | `6404f27` (`app.json`), `3f34a13` (`artifacts/calora/eas.json`) |
| pnpm/xmldom remediation | `8cd42c6`; workspace pins `@xmldom/xmldom` and Expo plist compatibility override |
| image-size/EAS archive remediation | `904d46f` vendor package, `5f5a450` `.easignore` archive inclusion |
| Correct working directory | `23d5719`; TestFlight workflow runs with `working-directory: artifacts/calora` |
| Expo Router entry-point correction | `6404f27`; root Expo config keeps the Router entry-point |
| `submit.production` | `3f34a13`; ASC app `6800321660`, Apple Team `B5344GJRMT`, bundle `com.etiendem.caloraapp` |
| Apple Health privacy strings | `d5b15e9` adds `NSHealthUpdateUsageDescription`; HealthKit plugin retains the accurate share-purpose string |
| GitHub TestFlight workflow | `b3da385` plus subsequent workflow corrections through `164bee8` |

The current workflow invokes iOS EAS build/submit only from the intended
Calora app root. No alternate development branch should replace these files.

## 6. Changes that must not be carried wholesale

The following are unsafe to merge as a branch-wide operation:

1. **993 commits from `replit-agent`:** the application tree is already equal
   to `main`; replaying the history adds no source value.
2. **`subrepl-*` snapshots:** these are isolated task refs with mixed feature,
   documentation, generated, and experimental changes.
3. **Older release/backup lines:** several contain stale dependency, native
   version, release, or configuration states despite useful historical
   features.
4. **Generated or evidence-only files:** screenshots, agent asset metadata,
   build reports, `.tsbuildinfo`, generated exports, and temporary forensic
   documents should not be treated as application deltas.
5. **Debug/release rehearsal code:** diagnostic logs, release-gate fixtures,
   signing rehearsals, and provider-control evidence must be reviewed
   individually rather than merged as product behavior.
6. **Secrets and environment state:** no secret values were found or carried
   by this audit; no environment files or credentials may be copied during
   reconciliation.

## 7. Expected conflicts if reconciliation is attempted

### Replaying `replit-agent`

Expected result: large history conflicts or duplicate commits with no
application-tree gain. This is not recommended.

### Merging the documented APK RC branch

Expected result: no useful application merge. It is an ancestor of current
`main`; the merge would be a no-op or an unnecessary history merge.

### Merging older release/backup branches

Expected conflicts include:

- `artifacts/calora/app.json` and `eas.json`;
- `artifacts/calora/package.json`, `pnpm-lock.yaml`, and
  `pnpm-workspace.yaml`;
- generated API/OpenAPI/Zod declarations;
- recipe/planner/Coach source;
- account-deletion and recovery support objects;
- GitHub workflows and release scripts;
- large image/screenshot and documentation sets.

Those conflicts are evidence that the branches are historical alternatives,
not that `main` is missing their current application source.

## 8. Safest reconciliation plan

### Phase A — source decision

1. Treat `origin/main` at
   `d5b15e93a930dc3cd83dfd0751907b6501d1b272` as the canonical source.
2. Do not merge `replit-agent`, the APK RC branch, or any `subrepl-*` ref.
3. If the installed APK owner can provide an EAS build ID or binary metadata,
   map it to an exact source SHA. Compare that SHA's tree to `origin/main`.
4. If the SHA maps to `b60c12f` or `replit-agent`, record that it is already
   represented by `main`. If it maps elsewhere, perform a new targeted audit
   of that exact SHA before any merge decision.

### Phase B — canonical branch protection

1. Keep GitHub `main` at the verified current SHA.
2. Preserve the existing EAS, pnpm, workflow, Router, submit, and HealthKit
   files exactly.
3. Do not force-push, reset, delete branches, or use a checkpoint rollback.
4. Retain historical refs for audit/recovery until the owner explicitly
   authorizes branch cleanup.

### Phase C — only if a previously unknown APK SHA differs

1. Fetch the exact SHA into a temporary detached checkout.
2. Compare its tree to `origin/main` by mobile source, API, database,
   dependencies, assets, and native config.
3. Selectively port only verified product changes.
4. Reapply and revalidate every iOS/TestFlight fix listed in section 5.
5. Run the full verification plan below.
6. Present a new reconciliation report for owner approval.
7. Only after explicit approval may a merge or push be considered.

## 9. Verification plan for future authorized builds

No build was run during this audit. Before a future authorized release:

1. Verify the checkout SHA equals the approved `origin/main` SHA.
2. Run `pnpm install --frozen-lockfile`.
3. Run repository typecheck.
4. Run Calora mobile and API test suites.
5. Run Expo config/prebuild validation from `artifacts/calora`.
6. Verify:
   - bundle/package identifiers;
   - Expo project ID;
   - Android version code;
   - `production-apk` profile;
   - `submit.production`;
   - `NSHealthShareUsageDescription`;
   - `NSHealthUpdateUsageDescription`;
   - HealthKit entitlement;
   - Router entry point;
   - pnpm/xmldom and vendored image-size resolutions.
7. For Android, trigger the approved `production-apk` build only after
   authorization. Record source SHA, EAS build ID, builder/toolchain, native
   version code, APK URL, and APK SHA-256. Install that exact APK and test
   authentication, onboarding, scanner, recipes, planner, Coach, Health
   Connect, notifications, RevenueCat, sync, and account deletion.
8. For iOS, use the existing `main`-based TestFlight workflow only after
   authorization. Record source SHA, EAS build ID, native build number, IPA
   identity, and TestFlight processing result.
9. Compare binary runtime/build metadata with the recorded source identity
   before concluding that the Android and iOS binaries represent the same
   application source.

## 10. Final conclusion

Current GitHub `main` is already the safest canonical source:

- it contains the documented Android APK candidate;
- it contains the complete application tree of the likely switched
  `replit-agent` branch;
- it contains all verified iOS/TestFlight fixes;
- no user-facing feature is present in either likely development source but
  missing from `main`;
- no database, API, dependency, asset, or native configuration delta needs to
  be merged from those branches.

**Final verdict: SAFE TO RECONCILE.**

The safe reconciliation is a no-op at the application level: keep current
GitHub `main` canonical and do not merge historical branch histories. The only
remaining evidence gap is the external Android APK's binary source identity,
which must be recorded for release provenance but does not currently justify a
source merge.