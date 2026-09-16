# Calora Remote Main Divergence Reconciliation Report

Date: 2026-09-16
Scope: Step 34, local remote-main reconciliation only

## 1. Executive summary

The two remote-only `origin/main` commits were inspected independently and
found to represent functionality already present in local `main`:

- the production iOS EAS submit profile was already present byte-for-byte;
- the Apple Health update privacy-purpose string was already present
  byte-for-byte.

Neither remote commit required a new runtime or configuration change. Replaying
them as ordinary cherry-picks would duplicate equivalent changes. The safest
auditable method was therefore a clean non-fast-forward merge of
`origin/main` into local `main`. The merge changed ancestry only; its resulting
tree was content-neutral relative to the local candidate.

The Step 33 reconciliation work was preserved. The historical
`release/calora-onboarding-and-plus` branch was not merged or modified.

## 2. Step 33 starting identity

The Step 33 validated runtime candidate was:

```text
SHA:  5733add9a39d6fe5cdaabafd143bd3ce7010add3
TREE: de05a933d61dbff05082349db98c129ebdeb3a3f
```

This identity remains reachable in local history.

## 3. Refreshed local main identity

After refreshing `origin`, the local branch was:

```text
SHA:  9467afc53494406d3b4879aef5719186954386fb
TREE: 5b061e23185aad3fc39d7cee6189c038393680b6
```

The two commits after the Step 33 runtime tip were documentation-only:

1. `7fcb447a93fd32759f3a396ed79585cef7da4791`
   `33_CALORA_CONTROLLED_RECONCILIATION_MAIN_INTEGRATION_REPORT.md`
2. `9467afc53494406d3b4879aef5719186954386fb`
   the attached Step 33 authorization text

They were preserved. During this reconciliation, the newly attached Step 34
authorization was also automatically recorded as the docs-only commit
`da18841cb7f4f6caabbc875352877d75fc35e27d`; it was preserved as well.

## 4. Refreshed origin/main identity

After fetching `origin`:

```text
SHA:  d5b15e93a930dc3cd83dfd0751907b6501d1b272
TREE: 7208584091da3492fccb8e118209f7fcb5d93951
```

The remote identity remained exactly the one recorded in Step 33.

## 5. Remote divergence verification

The two remote-only commits were:

```text
3f34a13d4744feb5dc095856d5f1a262ea78b020
Update EAS configuration for Calora artifacts

d5b15e93a930dc3cd83dfd0751907b6501d1b272
Add Apple Health update usage description
```

Both commits were reachable from the refreshed `origin/main`. No additional
remote commits appeared after the Step 33 snapshot.

Before reconciliation, local `main` was ahead 53 and behind 2 relative to
`origin/main`. The recorded local-only commits were documentation-only and did
not change application behavior.

## 6. Commit 3f34a13 forensic analysis

Changed file:

```text
artifacts/calora/eas.json
```

The commit adds:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "6800321660",
      "appleTeamId": "B5344GJRMT",
      "bundleIdentifier": "com.etiendem.caloraapp"
    }
  }
}
```

Impact:

- Runtime: no runtime code impact.
- Native: identifies the production iOS submission target.
- Expo/EAS: adds the production submit profile.
- API: none.
- Security: no credential or secret was added.
- Build: changes submit metadata only; no build was run.

The exact same `eas.json` blob was already present in local `main`. Its local
history includes the equivalent implementation from commit
`5bfb08d35f4efda9e660602dd0a7f602ba746529`. Local `main` therefore contained
the equivalent setting before this Step 34 reconciliation.

Replay decision: do not cherry-pick as a content change. Preserve the local
equivalent implementation and reconcile ancestry through the final merge.

## 7. Commit d5b15e9 forensic analysis

Changed file:

```text
artifacts/calora/app.json
```

The commit adds this iOS `infoPlist` entry:

```json
"NSHealthUpdateUsageDescription": "Calora uses Health data to save your nutrition and activity information to Apple Health when you choose to enable Health integration."
```

Impact:

- Runtime: no JavaScript runtime code impact.
- Native: preserves the iOS HealthKit write-purpose description.
- Expo/EAS: affects generated iOS app metadata.
- API: none.
- Security: privacy disclosure only; no permission bypass.
- Build: changes native metadata only; no build was run.

The exact same `app.json` blob was already present in local `main`. Its local
history includes the equivalent implementation from commit
`eb01d1b` (`Update Calora application and package configurations`). Local
`main` therefore contained the equivalent setting before this Step 34
reconciliation.

Replay decision: do not cherry-pick as a content change. Preserve the local
equivalent implementation and reconcile ancestry through the final merge.

## 8. EAS configuration reconciliation

The final local EAS configuration preserves:

- the Calora project context;
- the Expo project identity;
- the Expo Router entry point;
- the production build profile;
- the production submit profile;
- the iOS bundle identifier `com.etiendem.caloraapp`;
- the Android package `com.etiendem.caloraapp`;
- the production App Store ID `6800321660`;
- the Apple team identifier `B5344GJRMT`;
- the pnpm/xmldom remediation;
- the image-size/archive remediation;
- the existing TestFlight workflow compatibility.

The final `artifacts/calora/eas.json` blob equals the `origin/main` blob. No
blind replacement of `eas.json`, `app.json`, package configuration, or workflow
configuration occurred.

## 9. Apple Health privacy reconciliation

The final iOS configuration preserves:

- `NSHealthUpdateUsageDescription` in the iOS `infoPlist`;
- the existing HealthKit share-purpose description;
- the existing HealthKit plugin configuration;
- the existing Android Health Connect configuration.

The exact iOS update-purpose string from remote is already present locally and
was not duplicated. The existing privacy-purpose strings were not removed or
replaced with unrelated app configuration.

## 10. Git reconciliation method used

The selected method was a content-neutral non-fast-forward merge:

```text
git merge --no-ff --no-commit origin/main
git commit --no-edit
```

The prospective merge tree matched the local tree before the merge. Git
reported a clean merge with no conflicts. The finalized merge commit was:

```text
1209536654d57ec35ae2ad00f1c975afb9cf6d0f
```

Its parents were:

```text
local/docs side: da18841cb7f4f6caabbc875352877d75fc35e27d
remote side:     d5b15e93a930dc3cd83dfd0751907b6501d1b272
```

This method was safer than replaying the two commits because both functional
patches were already present in local history. It records that the remote
history was reconciled without creating duplicate configuration changes.

## 11. Conflict resolutions

No conflicts occurred. No manual conflict resolution was required. No
automatic “ours” or “theirs” selection was used.

## 12. Step 33 functionality preservation

The Step 33 runtime candidate remains unchanged. Comparing the Step 33 runtime
tip with the reconciled tree shows no runtime, API, security, native, Expo, or
release changes. Only documentation/authorization files were added after that
tip.

Preserved behavior includes:

1. durable capture acceptance sequencing and persistence;
2. the deterministic Weekly Programs modal state machine;
3. shared Planner Program pools and typed eligibility;
4. bounded Coach request timeout/cancellation/malformed-response/stale-request
   handling;
5. Coach Fact Context restricted to:
   - `daily.calorie_status`;
   - `daily.protein_status`;
6. diary image provenance and `imageAssetKey` synchronization;
7. the capture compatibility assertion.

The following remain preserved:

- capture approval security;
- recipe `nextOffset`;
- recipe `terminalReason`;
- Premium entitlement enforcement;
- PKCE and authentication;
- account isolation;
- deletion fences;
- synchronization ownership;
- current API contracts;
- release validation;
- release attestation.

## 13. API/security invariant verification

The full API suite passed with the existing capture, recipe, Premium, Coach,
authentication, account-isolation, deletion-fence, synchronization, and
generated-contract coverage.

No API source file changed during the remote-main reconciliation. No security
boundary was weakened and no database tenant-isolation behavior changed.

## 14. Database/migration verification

- No migration file changed.
- No schema file changed.
- No migration executed.
- `drizzle-kit push` was not run.
- No development database was mutated.
- No production database was mutated.
- No remote commit required a database change.

## 15. Expo/EAS/native validation

Static Expo configuration validation passed for:

- Calora app name and version;
- iOS bundle identifier;
- Android package identity;
- Expo Router origin;
- Expo project ID;
- Apple Health update-purpose description.

Static EAS validation passed for:

- production build profile;
- production submit profile;
- App Store ID;
- Apple team ID;
- submit bundle identifier matching the app bundle identifier.

Native auth/signing unit tests passed. The actual native-auth preflight returned
the expected blocked result because no signed binaries or exact device targets
were supplied:

```text
result: blocked
failureClasses:
- binary_unavailable
- target_unavailable
```

No EAS build, Android build, iOS build, APK/AAB/IPA creation, or device test was
performed.

## 16. Apple Health validation

The final `app.json` contains the required iOS HealthKit update-purpose
description and retains the existing HealthKit share-purpose configuration.
The iOS bundle identifier remains `com.etiendem.caloraapp`.

The configuration was validated both by direct JSON assertions and by the Expo
config command. No physical iOS verification is claimed.

## 17. Full test results

| Validation | Result |
|---|---|
| `pnpm --filter @workspace/api-server test` | Passed: 36 files, 429 tests; 4 rollback tests explicitly skipped |
| `pnpm --filter @workspace/calora test` | Passed: 82 files, 1,163 tests; server security tests passed: 6 |
| `pnpm --filter @workspace/scripts test` | Passed: 47 tests |
| `pnpm --filter @workspace/api-server test:release-attestation` | Passed: 13 tests |
| Native auth/signing unit tests | Passed: 33 tests |
| Expo config validation | Passed |
| EAS/Apple Health static assertions | Passed |
| `git diff --check` | Passed after documentation cleanup |

Expected warning/error output came from deliberate failure-rehearsal tests and
the intentionally blocked no-binary/no-device native preflight. No assertion
failed.

## 18. Typecheck results

`pnpm run typecheck` passed for:

- workspace libraries;
- API server;
- Calora;
- FatSecret gateway;
- mockup sandbox;
- scripts.

## 19. Generated-contract verification

The full API suite passed the generated compatibility contract test. No
generated API contract changed during remote-main reconciliation.

The EAS and Apple Health commits changed only native/project configuration, not
API schemas, route behavior, or generated client output.

## 20. Final changed-file manifest

### Remote reconciliation paths

| Path | Originating remote commit | Winning implementation | Reason | Validation |
|---|---|---|---|---|
| `artifacts/calora/eas.json` | `3f34a13d` | Existing local/equivalent blob | Local `main` already contained the exact production submit profile; duplicate replay was unnecessary | EAS JSON assertions and Expo/static validation |
| `artifacts/calora/app.json` | `d5b15e9` | Existing local/equivalent blob | Local `main` already contained the exact Apple Health update-purpose string and existing share configuration | Apple Health assertions, Expo config validation, native unit tests |

The remote reconciliation added no new content to these paths. Their remote
history is now represented by the merge parent.

### Documentation-only paths preserved outside remote reconciliation

```text
33_CALORA_CONTROLLED_RECONCILIATION_MAIN_INTEGRATION_REPORT.md
attached_assets/Pasted-CALORA-CONTROLLED-RECONCILIATION-INTEGRATION-INTO-MAIN-_1789571974722.txt
attached_assets/Pasted-CALORA-STEP-34-REMOTE-MAIN-DIVERGENCE-RECONCILIATION-NU_1789572178047.txt
```

The Step 33 report also received a whitespace-only cleanup so the complete
history passes `git diff --check`.

## 21. Final main vs origin/main relationship

Immediately after the reconciliation merge:

- `origin/main` was an ancestor of local `main`;
- local `main` was ahead 54 commits;
- local `main` was behind 0 commits;
- the merge tree was content-neutral relative to the local pre-merge tree.

No push was performed. The final docs/report closure commit may increase the
ahead count, but it cannot reintroduce a behind count because `origin/main`
remains an ancestor.

## 22. Rollback identity

The Step 33 verified runtime rollback identity remains:

```text
SHA:  5733add9a39d6fe5cdaabafd143bd3ce7010add3
TREE: de05a933d61dbff05082349db98c129ebdeb3a3f
```

The exact pre-reconciliation local branch identity, including preserved
Step 33 documentation, was:

```text
SHA:  9467afc53494406d3b4879aef5719186954386fb
TREE: 5b061e23185aad3fc39d7cee6189c038393680b6
```

No reset or history rewrite was performed.

## 23. Final local main SHA/tree

The reconciled local-main candidate before this numbered report was committed:

```text
SHA:  1209536654d57ec35ae2ad00f1c975afb9cf6d0f
TREE: 6f893e9d320306add77a819b2237bd1b077180ba
```

The report and Step 33 whitespace cleanup are documentation-only closure
changes on top of that content-equivalent reconciliation candidate. The final
docs-inclusive SHA/tree is recorded in the delivery summary after this report
commit.

## 24. Working-tree cleanliness

Before committing this report, the only intended working-tree change was the
Step 33 report whitespace cleanup plus this report. The newly attached
authorization files were already preserved as documentation-only commits.

The final verification will require:

```text
git status --short --branch
```

to show no file changes.

## 25. Confirmation of no push/deployment/build/database mutation

The following actions did not occur:

- no GitHub push;
- no force-push;
- no branch push;
- no production deployment;
- no GitHub Actions trigger;
- no EAS trigger;
- no Android build;
- no iOS build;
- no APK/AAB/IPA creation;
- no TestFlight submission;
- no App Store submission;
- no migration;
- no `drizzle-kit push`;
- no development database mutation;
- no production database mutation.

## 26. Remaining uncertainties

1. Physical iOS and Android verification remains pending because signed
   binaries and exact device targets were not supplied. No native success is
   claimed.
2. External Apple/Google association caches, redirect allowlists, DNS, and
   provider state were not inferred from repository configuration.
3. A future fetch could reveal new `origin/main` commits; this report covers
   the exact refreshed identity recorded above.
4. The owner must separately authorize any GitHub push.

## 27. Exact recommendation for next owner-authorized step

Review the final local `main` candidate and its clean relationship to
`origin/main`. If accepted, authorize a separate GitHub push of the exact final
SHA recorded after this report is committed. Keep native device/TestFlight
verification as a later separately authorized step; do not build or submit as
part of Step 34.

## Final verdict

REMOTE MAIN RECONCILIATION VERIFIED — READY FOR OWNER PUSH AUTHORIZATION