# Calora Step 44 Canonical Prebuild Blocker Remediation Report

Date: 2026-09-16  
Scope: Minimum canonical prebuild blocker remediation and release-gate
verification only. No iOS build, Android build, EAS build, EAS submission, or
TestFlight submission was performed.

## 1. Executive summary

Step 44 repaired the two concrete blockers identified by Step 43, beginning
from the exact approved `origin/main` source:

```text
Starting SHA:  292d105638bc0316be08cf3763fc46239e05dd42
Starting TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
```

The authorized remediation was limited to:

1. removing the invalid web-only `userSelect: 'none'` property from React
   Native `View` styles in `SwipeableTabList`;
2. normalizing iOS provisioning-profile status with trim and uppercase before
   comparing to `ACTIVE`, while failing closed for missing and unknown values;
3. adding focused signing-status regression coverage.

All local validation passed. The resulting functional commit was pushed as a
normal fast-forward to canonical `main`:

```text
Commit: 5e39f25fdab600d2980899f4bd94a09700740796
TREE:   9b1bd8162f5bd79390932cdf9c2deae4b3989574
Parent: 292d105638bc0316be08cf3763fc46239e05dd42
```

The exact automatic Release validation check for the new SHA completed
successfully. Step 44 is complete and stops before any native release action.

## 2. Starting origin/main SHA/tree

The read-only Step 44 freeze confirmed:

```text
origin/main SHA:  292d105638bc0316be08cf3763fc46239e05dd42
origin/main TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
```

Remote `main` had not advanced unexpectedly before remediation.

## 3. Existing local documentation divergence

The existing local `main` was not used as the remediation source. It contained
documentation/checkpoint-only commits not present on remote `main`. These were
not merged, reset, rebased, amended, dropped, or pushed as part of Step 44.

Local-only commits at final verification:

```text
8a679da Add Calora release report and prebuild blocker documentation
fc9c6e3 Add report for Calora canonical release and testflight
f8c05bc Add CALORA step 43 release documentation
f7ebbdf Document Calora iOS TestFlight release 42
c5057cc Add CALORA release gate credential integration report and supporting documentation
```

The original local branch remains a separate documentation/checkpoint branch.
The functional remediation was created and pushed only from the isolated
canonical remediation branch.

## 4. Isolated remediation workspace identity

The remediation workspace was created directly from the verified canonical
commit:

```text
Path:   /home/runner/workspace/.step44-remediation
Branch: calora-step44-remediation-workspace
HEAD:   292d105638bc0316be08cf3763fc46239e05dd42
TREE:   fc1334da98c36d2db38bc6a1a04daeca34af6860
Status: clean before edits
```

No local documentation commit was imported.

## 5. Reproduction of SwipeableTabList TypeScript errors

The canonical source reproduced the Step 43 errors:

```text
artifacts/calora/components/SwipeableTabList.tsx:138:22
TS2769: { userSelect: "none" } is not assignable to ViewStyle.

artifacts/calora/components/SwipeableTabList.tsx:295:24
TS2322: { userSelect: "none" } is not assignable to the expected style type.
```

## 6. Root cause of SwipeableTabList errors

`userSelect` is a React Native Web CSS property, but the component passes the
style through React Native `View` and `Animated.View` style props typed as
`StyleProp<ViewStyle>`. The canonical React Native style type does not include
that web-only property.

## 7. Exact SwipeableTabList remediation

The invalid `StyleSheet.create` entry was removed:

```diff
-import StyleSheet
-styles.gestureSurface with userSelect: 'none'
```

The two surfaces now use only their caller-provided typed styles and the
existing animated style:

```diff
-style={[style, styles.gestureSurface]}
+style={style}

-style={[style, styles.gestureSurface, animatedStyle]}
+style={[style, animatedStyle]}
```

No PanResponder callbacks, gesture thresholds, responder capture behavior,
touch handling, tab callbacks, layout styles, accessibility props, or
navigation logic were changed. The nonessential web text-selection hint was
removed rather than represented with an invalid native style or an `any`
escape hatch.

## 8. Swipe regression validation

The existing focused workspace swipe suite passed:

```text
File:  artifacts/calora/lib/__tests__/workspaceSwipe.test.ts
Tests: 16 passed
```

The suite covers deliberate horizontal gestures, tab target selection,
velocity gestures, rejection of vertical/ambiguous gestures, edge behavior,
and nested gesture exclusion. No brittle snapshot test was added.

## 9. Signing-preflight implementation location

The signing status check is implemented in:

```text
artifacts/calora/scripts/ios-signing-preflight.js
```

The relevant function is:

```text
evaluateCredentialReadiness(credentials, now)
```

Focused tests are in:

```text
artifacts/calora/scripts/ios-signing-preflight.test.js
```

## 10. Signing status root cause

The previous implementation rejected any status not exactly equal to uppercase
`ACTIVE`. EAS returned the semantically equivalent lowercase value `active`,
which caused a false-negative preflight result.

The previous implementation also did not fail closed when the status field was
missing.

## 11. Exact status-normalization remediation

The new implementation:

```js
const normalizedProfileStatus =
  typeof provisioningProfile.status === 'string'
    ? provisioningProfile.status.trim().toUpperCase()
    : null;

if (normalizedProfileStatus !== 'ACTIVE') {
  // fail closed
}
```

Only a string that normalizes to `ACTIVE` is accepted. Missing, null, empty,
unknown, revoked, expired, inactive, invalid, and disabled values remain
rejected.

## 12. ACTIVE/active/Active test results

All passed:

```text
ACTIVE:        accepted
active:        accepted
Active:        accepted
"  active  ":  accepted
```

## 13. Revoked/expired/inactive/unknown failure tests

All passed as rejected:

```text
REVOKED:   rejected
EXPIRED:   rejected
INACTIVE:  rejected
INVALID:   rejected
DISABLED:  rejected
UNKNOWN:   rejected
null:      rejected
```

Focused signing test result:

```text
13 passed
0 failed
```

## 14. Secret-safety verification

No credential value was requested, printed, echoed, committed, or written to a
generated file or report.

Only sanitized metadata was used:

```text
Required secret names: present by metadata/name only
Signing result: active record recognized after normalization
Certificate expiration: 2027-07-21
Provisioning profile expiration: 2027-07-21
```

No Expo token, ASC key, private key, Apple credential, GitHub credential, or
authorization header appears in the remediation diff or report.

## 15. Focused test results

```text
Signing preflight unit tests: 13 passed
Workspace swipe tests:        16 passed
```

## 16. Full typecheck result

```text
Command: pnpm run typecheck
Result:  passed
```

The full workspace typecheck completed for the workspace libraries, API server,
Calora mobile app, FatSecret gateway, mockup sandbox, and scripts.

The two original `SwipeableTabList` errors no longer occur.

## 17. Scripts test result

```text
Command: pnpm --filter @workspace/scripts test
Result:  47 passed, 0 failed, 0 skipped
```

## 18. Calora test result

```text
Command: pnpm --filter @workspace/calora test
Vitest:  82 files passed, 1,163 tests passed
Server:  6 passed, 0 failed
```

Existing diagnostic stderr from tests was non-fatal and did not cause a test
failure.

## 19. Native signing/auth test result

```text
Signing preflight tests:      13 passed
Native auth preflight tests:   5 passed
```

The live read-only signing preflight also passed after the normalization:

```text
Result: RELEASE PREFLIGHT PASSED
Distribution certificate: ready
Provisioning profile:      ready
No build started
```

## 20. Expo/EAS config validation

Canonical configuration assertions passed:

```text
Expo owner:                 vvault07
Expo project ID:            1f202325-5b9a-4260-978f-abbd3252b9ee
iOS bundle identifier:      com.etiendem.caloraapp
Marketing version:          1.0.0
Production profile:         present
Production autoIncrement:   enabled
iOS distribution:           store
Credentials source:         remote
App Store Connect ID:       6800321660
Apple Team ID:              B5344GJRMT
Submit bundle identifier:   com.etiendem.caloraapp
```

No Expo or EAS identity/configuration file was changed.

## 21. Apple Health validation

The canonical configuration assertions passed:

```text
HealthKit plugin:                    present
Health share usage description:      present
Apple Health privacy configuration:  unchanged
```

## 22. git diff --check

```text
Result: passed
```

## 23. Read-only live signing-preflight result

The live EAS credential-record check was run from the remediation source after
the status normalization:

```text
Result:                 RELEASE PREFLIGHT PASSED
Bundle:                 com.etiendem.caloraapp
Distribution:           App Store
Certificate expires:    2027-07-21
Profile expires:        2027-07-21
Build started:          no
```

This validates the EAS record only. No Apple macOS rehearsal, iOS build, or
TestFlight submission was performed.

## 24. Final changed paths

The functional remediation commit changed exactly:

```text
artifacts/calora/components/SwipeableTabList.tsx
artifacts/calora/scripts/ios-signing-preflight.js
artifacts/calora/scripts/ios-signing-preflight.test.js
```

## 25. Runtime-scope audit

The final diff was audited against the prior canonical SHA. No changes were
made to:

```text
Planner business logic
Recipes
Coach
Smart Scan
Authentication
Database
API server
Sync contracts
RevenueCat/Premium
Expo identity
EAS identity
Apple Health configuration
```

No `any`, `@ts-ignore`, or `@ts-expect-error` escape hatch was introduced.

## 26. Database/API confirmation

```text
Database mutation:          none
Schema change:              none
Migration:                  none
Seed operation:             none
API deployment:             none
Replit production publish:  none
```

## 27. iOS/Android/TestFlight confirmation

```text
iOS build:                  none
EAS build:                  none
Android build:              none
TestFlight submission:      none
App Store submission:       none
```

Step 44 stopped at remediation and release-gate verification as required.

## 28. Remediation commit SHA/tree

```text
Commit SHA:  5e39f25fdab600d2980899f4bd94a09700740796
Tree SHA:    9b1bd8162f5bd79390932cdf9c2deae4b3989574
Parent SHA:  292d105638bc0316be08cf3763fc46239e05dd42
Subject:     Fix canonical iOS prebuild validation blockers
```

The parent is exactly the approved prior canonical SHA.

## 29. Pre-push origin verification

Immediately before push:

```text
origin/main SHA:  292d105638bc0316be08cf3763fc46239e05dd42
origin/main TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
Remediation HEAD: 292d105638bc0316be08cf3763fc46239e05dd42
Parent relation:  direct canonical child
Working tree:     clean
```

## 30. Push result

```text
Operation: normal git push origin HEAD:main
Result:    completed
Update:    292d105..5e39f25 main -> main
Force:     not used
Rebase:    not used
Reset:     not used
Merge:     not used
```

The existing documentation-ahead local `main` branch was not pushed.

## 31. New canonical GitHub SHA/tree

Final read-only fetch confirmed:

```text
origin/main SHA:  5e39f25fdab600d2980899f4bd94a09700740796
origin/main TREE: 9b1bd8162f5bd79390932cdf9c2deae4b3989574
```

The new tree contains only the three authorized remediation paths relative to
the prior canonical tree.

## 32. Automatic Release validation run ID

The normal push automatically created:

```text
Workflow:   Release validation
Run ID:     35138191565
Run number: 4
Attempt:    1
Event:      push
Branch:     main
Head SHA:   5e39f25fdab600d2980899f4bd94a09700740796
Status:     completed
Conclusion: success
Created:    2026-09-16T19:03:06Z
Completed:  2026-09-16T19:03:32Z
```

## 33. Required check-run identity

```text
Check-run ID:  104935764217
Check name:    Run release validation suite
Head SHA:      5e39f25fdab600d2980899f4bd94a09700740796
Status:        completed
Conclusion:    success
Started:       2026-09-16T19:03:10Z
Completed:     2026-09-16T19:03:32Z
Job ID:        104935764217
```

The check-run head SHA exactly matches the new canonical `main` SHA.

## 34. Required check conclusion

```text
Run release validation suite: completed / success
```

The exact required check passed on the new remediation SHA. No manual workflow
dispatch or rerun was used.

## 35. Post-push canonical verification

The canonical remote now points to:

```text
SHA:   5e39f25fdab600d2980899f4bd94a09700740796
TREE:  9b1bd8162f5bd79390932cdf9c2deae4b3989574
```

The detached remediation worktree has the same SHA/tree and is clean.

The original local `main` remains separate and was not rewritten. It contains
documentation/checkpoint commits and is currently divergent from the new
canonical remote; it is not the release source.

## 36. Original two-blocker closure proof

Blocker 1:

```text
Before:  SwipeableTabList TS2769/TS2322
After:   full pnpm run typecheck passed
```

Blocker 2:

```text
Before:  lowercase active rejected as not ACTIVE
After:   active/Active/whitespace-active accepted after normalization
         revoked/expired/inactive/unknown/missing remain rejected
         live read-only signing preflight passed
```

## 37. Preserved Calora reconciliation features

The remediation source preserves:

- durable capture acceptance;
- Weekly Programs deterministic modal transition/state machine;
- shared Planner Program pools and eligibility;
- bounded Coach lifecycle;
- Coach Fact Context restriction;
- diary `imageAssetKey` synchronization;
- capture compatibility and security;
- recipe `nextOffset`;
- recipe `terminalReason`;
- Premium entitlement;
- PKCE/authentication;
- account isolation;
- deletion fences;
- sync ownership;
- API contracts;
- release attestation;
- Expo Router;
- production EAS configuration;
- Apple Health privacy configuration;
- TestFlight configuration.

## 38. Remaining uncertainties

Step 44 does not determine an iOS build number and does not authorize a native
build. The next release step must re-run authoritative build-number and
duplicate-build checks before any paid build.

Two unrelated native workflows also appeared on the same push and failed
immediately:

```text
native-encrypted-recovery.yml
native-auth-preflight.yml
```

They are not the required Step 44 Release validation check, were not manually
rerun, and were not modified. Their failures should be investigated separately
before relying on those workflows for native evidence.

## 39. Exact recommendation for Step 45

Step 45 should begin with explicit owner authorization for the iOS/TestFlight
release. It must use the exact new canonical source:

```text
5e39f25fdab600d2980899f4bd94a09700740796
```

Before any build, Step 45 must:

1. verify this exact canonical SHA/tree and successful Release validation;
2. determine the authoritative next iOS build number;
3. check for an equivalent existing or running iOS build;
4. verify production API compatibility read only;
5. use the supported iOS production/TestFlight publishing flow;
6. never build Android, deploy the API, publish Replit production, modify the
   database, or submit an App Store production release.

## Final verdict

CANONICAL PREBUILD BLOCKERS REMEDIATED — READY FOR OWNER IOS BUILD AUTHORIZATION