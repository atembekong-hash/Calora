# Calora Controlled Reconciliation Main Integration Report

Date: 2026-09-16
Scope: Step 33, local `main` integration only

## 1. Executive summary

The six validated reconciliation units from Step 32 were integrated into the
local canonical `main` by selective cherry-pick. The historical source branch
was not merged. The integration produced no conflicts and preserved the
validated runtime tree.

All complete non-deploying validation passed after integration. The only native
check that remains blocked is the actual signed-binary/device preflight because
no native binaries or booted device targets are present. The static native
configuration and all native preflight unit tests passed.

Local `main` is intentionally not synchronized to GitHub. The refreshed
`origin/main` contains two remote-only commits with runtime and release/native
changes that were not part of the Step 32 authorization; they were not merged,
overwritten, or pushed.

## 2. Pre-integration local main SHA/tree

| Field | Value |
|---|---|
| Ref | `main` |
| SHA | `08f35a532cd766f9fd3e93f874dd83066461b4e4` |
| Tree | `61c3b08ed8cd6034143f3476c6717969ce3d9048` |

This exactly matched the Step 32 frozen base.

## 3. `origin/main` identity

After refreshing the remote ref:

| Field | Value |
|---|---|
| Ref | `origin/main` |
| SHA | `d5b15e93a930dc3cd83dfd0751907b6501d1b272` |
| Tree | `7208584091da3492fccb8e118209f7fcb5d93951` |
| Relationship before integration | local `main` ahead 45, behind 2 |

Remote-only commits were:

- `3f34a13d4744feb5dc095856d5f1a262ea78b020` — `Update EAS configuration for Calora artifacts`
- `d5b15e93a930dc3cd83dfd0751907b6501d1b272` — `Add Apple Health update usage description`

Their diff includes runtime, generated-contract, workflow, EAS, and native
configuration changes outside the Step 32 validated set. They were deliberately
left out of this local-only integration. No `origin/main` ref was modified.

## 4. Reconciliation branch identity

| Field | Value |
|---|---|
| Branch | `reconcile/calora-onboarding-plus-controlled` |
| SHA | `a0a8339f9162e848c0ed98e323beee46d9747755` |
| Tree | `23caa8260ec8d090a5f29fad9453206da104633e` |
| Functional tip | `774f289ed6d39cbec8b19f4a2e7a01cabb5d46f9` |
| Source branch | `release/calora-onboarding-and-plus` |
| Source SHA | `8ae1f1d6383b286502bc208e0de4e9fb41cde40d` |

All six authorized functional commits remained reachable in the expected
dependency order. The two commits after the functional tip were classified as
report/evidence only:

- `9e31cd39ba578b3e90d8136f27c8707d1b80c37c` — Step 32 report
- `a0a8339f9162e848c0ed98e323beee46d9747755` — Step 32 report identity closure

## 5. Advancement analysis since Step 32

Local `main` had no commits after the Step 32 frozen base. Therefore no
main-side runtime conflict classification was required.

`origin/main` had advanced independently, as described in Section 3. Because
the authorization was specifically for local `main`, those remote-only runtime
and native changes were not silently combined with the validated reconciliation.

## 6. Integration method used

The six authorized functional units were selectively cherry-picked in their
validated order:

1. capture acceptance;
2. Weekly Programs modal transition;
3. planner Program pools and eligibility;
4. Coach request lifecycle;
5. diary image provenance sync;
6. capture compatibility assertion.

This was not a whole-branch merge. No conflict occurred and no conflict
resolution was required.

## 7. Exact commits integrated

| Authorized Step 32 commit | Resulting local `main` commit | Subject |
|---|---|---|
| `d5edd547c42ee7e5990bafdea7320bcf40eebf9` | `7b1ae6352fb2924099a3becf04306ceae91b4f52` | Reconcile durable capture acceptance |
| `d9fb18310fc366e78b721e30fc9c771fdad0a5b3` | `e6c8d7cd8d629252734da599cd16e5f7183f93a1` | Fix weekly program modal transition |
| `37ac5ab351255f67ad3d5960ed7d62bd87f0d66e` | `d31418d7fa10226195782720768f2650788f5264` | Reconcile shared planner program rules |
| `6ae455e51aea96c6305703943c671c72c4d9eb9e` | `b3b023694266f66397ae2c9b9099f820afa13e1c` | Harden bounded Coach fact requests |
| `b1d354bf7003cba6ca861812dba1fcc6ee692750` | `8965cc6b8366743096e31bfd0a350930603b4915` | Preserve diary image provenance across sync |
| `774f289ed6d39cbec8b19f4a2e7a01cabb5d46f9` | `5733add9a39d6fe5cdaabafd143bd3ce7010add3` | Align capture compatibility assertion |

## 8. Conflict resolutions

No Git conflicts occurred. No file was resolved by choosing “ours” or “theirs,”
and no validated runtime behavior was manually altered during integration.

## 9. Capture invariant verification

The integrated main preserves:

- `POST /api/v1/capture/:sessionId/approve`;
- UUID validation;
- bearer authentication;
- account ownership predicates;
- idempotent repeat approval;
- deletion-fence behavior;
- existing 401/409/503 semantics.

The client acceptance coordinator remains the durable local transaction
boundary. Approval remains a best-effort accelerator; the diary sync/outbox
path remains the retry path.

API capture tests and mobile capture acceptance/persistence tests passed.

## 10. Planner reconciliation verification

Local main contains the shared typed Program pool and eligibility modules in
`@workspace/api-zod`, with server and mobile consumers using the same rules.

Current main behavior remains intact:

- authentication;
- rate limiting;
- provider behavior;
- response compatibility;
- stable four-role fallback;
- recipe and planner compatibility.

Planner API and mobile planner tests passed.

## 11. iOS Weekly Programs static/test verification

The integrated source uses the deterministic modal-state transition rather than
presenting Program detail as a second nested native modal over the selector.
The selector → detail → close/back and Apply transitions are covered by
regression tests.

Result: **STATIC/TEST VERIFIED — DEVICE VERIFICATION PENDING**.

No physical iOS device, TestFlight build, or native binary was created for this
step.

## 12. Coach policy/lifecycle verification

Coach Fact Context remains restricted to:

- `daily.calorie_status`;
- `daily.protein_status`.

The integrated lifecycle behavior covers timeout, caller cancellation,
malformed responses, safe error classification, and stale-request protection.
Consent, authorization, deletion revalidation, and generated contract
alignment remain protected. The source broad fact allowlist was not integrated.

Full API Coach tests and focused mobile Coach lifecycle tests passed.

## 13. Diary/image-sync verification

Diary sync preserves `imageAssetKey` in bounded sync metadata, includes it in
the mutation signature, and restores it from server records. The
`restaurant_representative` provenance label remains valid for bundled imagery
without a remote URL.

Existing HTTPS URL validation, ownership, deletion, retry, and outbox behavior
remain unchanged. Full diary/sync and image metadata tests passed.

## 14. Recipes/Premium compatibility verification

No source recipe or Premium implementation was substituted. Existing:

- `nextOffset`;
- `terminalReason`;
- authentication;
- entitlement enforcement;
- rate limiting;
- provider failure semantics

remain covered by the API compatibility and recipe suites.

## 15. Auth/security/account verification

No source auth or callback configuration was merged. Existing PKCE, session
restoration, account isolation, persistence boundaries, deletion fences, and
sync ownership remain in local main.

API account, Supabase-auth, tenant-isolation, deletion-fence, referral, and
sync tests passed. No database tenant-isolation model was changed.

## 16. Release/native configuration verification

No `.github/workflows`, `app.json`, `eas.json`, native association, or release
workflow file changed as part of the six integrated commits.

Static Expo configuration passed for:

- Calora app identity and version;
- iOS bundle identifier and associated domain;
- Android package and callback host;
- Expo Router origin;
- EAS project identity.

Native preflight unit tests passed. The actual native-auth preflight returned
the expected safe blocked result because no signed iOS/Android binary or
booted device target was supplied. No build was created to change that result.

## 17. Database/migration verification

- No migration file changed.
- No migration was run.
- No duplicate migration was added.
- No schema change was introduced.
- `drizzle-kit push` was not run.
- No development or production database was mutated.
- The image provenance field continues to use the existing sync metadata
  boundary.

## 18. Full test results

| Validation | Result |
|---|---|
| `pnpm --filter @workspace/api-server test` | Passed: 36 files, 429 tests; 4 rollback tests explicitly skipped |
| `pnpm --filter @workspace/calora test` | Passed: 82 files, 1,163 tests; server security tests passed: 6 |
| `pnpm --filter @workspace/scripts test` | Passed: 47 tests |
| Native auth/signing unit tests | Passed: 17 tests |
| Expo config validation | Passed |
| Full workspace typecheck | Passed |
| `git diff --check` | Passed |

Expected warning/error output came from deliberate failure-rehearsal tests and
did not represent failed assertions.

## 19. Typecheck results

`pnpm run typecheck` passed for:

- workspace libraries;
- API server;
- Calora;
- FatSecret gateway;
- mockup sandbox;
- scripts.

## 20. Generated-contract verification

The full API suite passed the compatibility contract test, including:

- capture approval OpenAPI/generated-client/mobile alignment;
- recipe pagination fields;
- Coach Fact Context contract use;
- current server route inventory.

The planner package metadata change only adds the two new shared source
subpath exports required by the validated planner implementation. No lockfile
changed and no generated contract drift was detected.

## 21. Final changed-file manifest

The intentional runtime/test/package paths changed from the pre-integration
local `main` checkpoint are:

```text
artifacts/api-server/src/__tests__/compatibility-contract.test.ts
artifacts/api-server/src/routes/planner.ts
artifacts/api-server/src/routes/sync.ts
artifacts/api-server/vitest.config.ts
artifacts/calora/app/(tabs)/planner.tsx
artifacts/calora/app/(tabs)/recipes.tsx
artifacts/calora/app/(tabs)/scan.tsx
artifacts/calora/app/coach.tsx
artifacts/calora/context/CaloraContext.tsx
artifacts/calora/data/planner.ts
artifacts/calora/lib/__tests__/captureAcceptanceCoordinator.test.ts
artifacts/calora/lib/__tests__/captureAcceptancePersistence.test.ts
artifacts/calora/lib/__tests__/coachFactContextClient.test.ts
artifacts/calora/lib/__tests__/diarySync.test.ts
artifacts/calora/lib/__tests__/plannerProgramEligibility.test.ts
artifacts/calora/lib/__tests__/programModalState.test.ts
artifacts/calora/lib/captureAcceptanceCoordinator.ts
artifacts/calora/lib/diarySync.ts
artifacts/calora/lib/foodImageMetadata.ts
artifacts/calora/lib/intelligence/coachFactContextClient.ts
artifacts/calora/lib/intelligence/coachFactRequestLifecycle.ts
artifacts/calora/lib/intelligence/useCoachSendAdapter.ts
artifacts/calora/lib/programModalState.ts
lib/api-zod/package.json
lib/api-zod/src/planner-program-eligibility.ts
lib/api-zod/src/planner-program-pools.ts
```

No `.github/workflows`, Expo/EAS config, migration, lockfile, or production
configuration path changed.

## 22. Tree-equivalence analysis

The integrated local main runtime tree is equivalent to the validated Step 32
reconciliation runtime tree. Comparing local `main` to the isolated branch
shows only these branch-only evidence files:

```text
32_CALORA_TARGETED_BRANCH_RECONCILIATION_REMEDIATION_REPORT.md
attached_assets/Pasted-CALORA-CONTROLLED-TARGETED-BRANCH-RECONCILIATION-REMEDI_1789568360179.txt
```

Those files are report/authorization evidence, not runtime, test, package, or
configuration differences. The Step 33 attachment remains preserved in a local
stash entry and is not part of `main`.

## 23. Pre-integration rollback identity

```text
branch: main
sha:    08f35a532cd766f9fd3e93f874dd83066461b4e4
tree:   61c3b08ed8cd6034143f3476c6717969ce3d9048
```

This checkpoint remains reachable in normal Git history and was not reset,
rewritten, or deleted.

## 24. Post-integration main SHA/tree

```text
branch: main
sha:    5733add9a39d6fe5cdaabafd143bd3ce7010add3
tree:   de05a933d61dbff05082349db98c129ebdeb3a3f
```

## 25. Working-tree cleanliness

The local `main` working tree is clean. Git reports only the intentional
branch relationship to `origin/main`:

```text
main...origin/main [ahead 51, behind 2]
```

No file changes are present in the working tree.

## 26. Confirmation that nothing was pushed/deployed/built

The following actions did not occur:

- no GitHub push;
- no source-branch merge;
- no production deployment;
- no GitHub production workflow trigger;
- no EAS build;
- no Android APK/AAB build;
- no iOS IPA/archive build;
- no TestFlight submission;
- no App Store submission;
- no database mutation;
- no migration or `drizzle-kit push`.

## 27. Remaining uncertainties

1. `origin/main` has two remote-only runtime/native commits that were not
   integrated. The local branch must not be pushed until the owner separately
   authorizes how those changes should be reconciled.
2. Weekly Programs has static and test verification only. Physical iOS device
   verification remains pending a separately authorized native build.
3. The native-auth preflight remains blocked until signed binaries and exact
   device targets are supplied; creating those binaries was explicitly
   prohibited in this step.
4. External redirect allowlists, DNS, association caches, and production
   provider state were not inferred from repository files.

## 28. Exact recommendation for the next owner-authorized step

First review the local `main` candidate and the two-commit `origin/main`
divergence. Authorize a separate remote reconciliation decision before any
push. If that review is accepted, a later authorization may perform a signed
native build and device verification for Weekly Programs and native auth
callbacks; do not push or build as part of this step.

## Final verdict

LOCAL MAIN INTEGRATION VERIFIED — READY FOR OWNER PUSH REVIEW