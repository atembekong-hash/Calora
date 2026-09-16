# Calora Step 43 Clean Canonical Release Checkout and TestFlight Report

Date: 2026-09-16  
Scope: Clean isolated release checkout, read-only release preflight, and stop
before any native build because canonical prebuild validation failed.

## 1. Executive summary

Step 43 successfully created a separate detached release worktree directly from
the owner-approved canonical GitHub source:

```text
SHA:  292d105638bc0316be08cf3763fc46239e05dd42
TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
```

The isolated checkout remained clean and exactly equal to `origin/main`.
GitHub independently reconfirmed that the exact required check, `Run release
validation suite`, completed successfully for that SHA.

The canonical source did not pass the mandatory isolated prebuild validation:

1. `pnpm run typecheck` failed with two TypeScript errors in
   `artifacts/calora/components/SwipeableTabList.tsx`. Both reject the
   `gestureSurface` style containing `userSelect: "none"` as incompatible with
   the React Native `View` style type.
2. The read-only iOS signing preflight exited non-zero after EAS returned the
   provisioning-profile status as lowercase `active`. The canonical script
   accepts only exact uppercase `ACTIVE`, so this is a status-normalization
   defect in the preflight and is not evidence that the profile is revoked.

Step 43 prohibits modifying canonical source and requires stopping when
prebuild validation fails. Therefore no EAS build, iOS build, TestFlight
submission, build-number reservation, source mutation, API deployment,
database operation, Android build, or Replit production publish occurred.

## 2. Original checkout frozen identity

At the beginning of Step 43, before the isolated worktree was created:

```text
Branch:            main
HEAD SHA:          f7ebbdfd52c8f44d1dc42b8e16f6cb4dfa7f45f5
TREE SHA:          bc993075a31f21a06e0f7006b57a4a7e3c954490
origin/main SHA:   292d105638bc0316be08cf3763fc46239e05dd42
origin/main TREE:  fc1334da98c36d2db38bc6a1a04daeca34af6860
Ahead/behind:      2 / 0
Tracked state:     clean
```

The starting state differed from the stale Step 43 expected value because the
Step 42 report and owner attachments had already been preserved in an
automatic local documentation commit. No application/runtime source differed
from the approved canonical source.

## 3. Remote canonical SHA/tree

Read-only fetches before and after isolated validation confirmed:

```text
origin/main SHA:  292d105638bc0316be08cf3763fc46239e05dd42
origin/main TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
```

Remote canonical `main` did not advance.

## 4. Isolated release checkout method

A separate Git worktree was created with detached HEAD directly at the
approved commit:

```text
git worktree add --detach <isolated-path> 292d105638bc0316be08cf3763fc46239e05dd42
```

No branch, merge, cherry-pick, reset, rebase, amend, force operation, or source
commit was created.

## 5. Isolated checkout path

```text
/tmp/calora-step43-release
```

All release validation commands ran from this isolated checkout.

## 6. Exact isolated SHA/tree

```text
HEAD SHA:  292d105638bc0316be08cf3763fc46239e05dd42
TREE SHA:  fc1334da98c36d2db38bc6a1a04daeca34af6860
origin/main SHA equality:  passed
origin/main TREE equality: passed
```

## 7. Clean/detached status

```text
Branch:               detached HEAD
Tracked working tree: clean
Untracked files:      none
```

Dependency installation and validation did not mutate tracked source.

## 8. Exact GitHub release-gate evidence

The installed GitHub integration read the exact run and check-run records:

```text
Workflow:       Release validation
Run ID:         35123941578
Run number:     3
Run attempt:    1
Event:          push
Branch:         main
Head SHA:       292d105638bc0316be08cf3763fc46239e05dd42
Status:         completed
Conclusion:     success
Created:        2026-09-16T16:45:43Z
Updated:        2026-09-16T16:46:12Z

Required check: Run release validation suite
Check-run ID:   104888252044
Head SHA:       292d105638bc0316be08cf3763fc46239e05dd42
Status:         completed
Conclusion:     success
Started:        2026-09-16T16:45:46Z
Completed:      2026-09-16T16:46:11Z
```

The required-check SHA exactly equals the isolated release checkout SHA.

## 9. Expo identity

Canonical source configuration confirms:

```text
Expo owner:      vvault07
Expo project:    Calora
Expo project ID: 1f202325-5b9a-4260-978f-abbd3252b9ee
```

Identity assertions passed.

## 10. Apple identity

Canonical source configuration confirms:

```text
iOS bundle identifier:    com.etiendem.caloraapp
App Store Connect App ID: 6800321660
Apple Team ID:            B5344GJRMT
```

Identity assertions passed.

## 11. EAS production configuration

The isolated canonical source retains:

```text
Marketing version:          1.0.0
Source ios.buildNumber:     1
CLI appVersionSource:       local
Production profile:         present
Production autoIncrement:   true
Credentials source:         remote
iOS distribution:           store
Production submit profile:  present
Submit bundle identifier:   com.etiendem.caloraapp
```

Expo Router, project identity, Apple Health configuration, the pnpm/xmldom
remediation, and archive/image-size remediation were not changed.

## 12. Credential existence verification

The following required workspace secrets exist by name only:

```text
EXPO_TOKEN:          present
EXPO_ASC_KEY_ID:     present
EXPO_ASC_ISSUER_ID:  present
EXPO_ASC_API_KEY_P8: present
APPLE_APP_STORE_ID:  present
APPLE_TEAM_ID:       present
```

No value, private key, token, authorization header, or credential material was
printed or written to this report.

The read-only EAS signing request authenticated successfully and returned an
assigned certificate/profile record. Its profile status was `active`; the
canonical preflight rejected only the lowercase representation because it
compares against uppercase `ACTIVE`.

## 13. Highest authoritative iOS build number

```text
Not determined.
```

Canonical prebuild validation failed before an eligible build could be
initiated. No build-number reservation or mutation was performed.

The owner-provided historical reference remains version `1.0.0`, build `2`.
This report does not assume that build `3` is available.

## 14. Selected next build number

```text
No build number selected.
```

## 15. Build-number evidence

```text
No authoritative next-number evidence was accepted or acted upon.
No build number was consumed.
```

The next attempt must re-query EAS/App Store Connect state after the canonical
validation blockers are fixed and the replacement source passes the exact
release gate.

## 16. Duplicate-build investigation

```text
No new build was started.
No equivalent Step 43 build was adopted.
```

The source failed prebuild validation, so initiating or adopting a production
build would not satisfy Step 43.

## 17. Production API compatibility result

```text
Not reached after mandatory prebuild failure.
API deployment or mutation: none.
```

Step 43 stopped rather than using an API deployment to alter release
compatibility.

## 18. Isolated prebuild validation results

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed |
| `pnpm run typecheck` | **Failed** |
| `pnpm --filter @workspace/scripts test` | Passed: 47/47 |
| Expo identity assertions | Passed |
| EAS production profile assertions | Passed |
| Bundle identifier assertion | Passed |
| Expo project ID assertion | Passed |
| App Store ID assertion | Passed |
| Apple Team assertion | Passed |
| `git diff --check` | Passed |
| Read-only EAS signing preflight | **Failed due lowercase `active` handling** |
| HEAD unchanged after validation | Passed |
| TREE unchanged after validation | Passed |
| Tracked worktree clean after validation | Passed |

Exact TypeScript failures:

```text
artifacts/calora/components/SwipeableTabList.tsx:138:22
TS2769: gestureSurface { userSelect: "none" } is not assignable to ViewStyle.

artifacts/calora/components/SwipeableTabList.tsx:295:24
TS2322: gestureSurface { userSelect: "none" } is not assignable to the style type.
```

Sanitized signing-preflight finding:

```text
Failure class: EAS_RECORD
Returned profile status: active
Canonical accepted comparison: exact ACTIVE
Result: non-zero validation exit
```

The EAS response spelling means the preflight failure does not prove that the
profile is inactive. The canonical script needs a case-insensitive normalized
comparison before it can be used as a reliable release gate.

## 19. Final prebuild SHA/tree

At the mandatory stop:

```text
Release HEAD:       292d105638bc0316be08cf3763fc46239e05dd42
Release TREE:       fc1334da98c36d2db38bc6a1a04daeca34af6860
origin/main HEAD:   292d105638bc0316be08cf3763fc46239e05dd42
origin/main TREE:   fc1334da98c36d2db38bc6a1a04daeca34af6860
Release tree state: clean
```

## 20. EAS build command/mechanism

```text
No EAS build command or publishing mechanism was invoked.
```

The existing GitHub workflow was inspected read only but was not dispatched.
No paid build was consumed.

## 21. EAS build ID

```text
No Step 43 EAS build exists.
```

## 22. Build provenance

```text
No build provenance exists because no build was started.
```

## 23. Version/build number

```text
Source marketing version: 1.0.0
Source build number:       1
Step 43 selected number:   none
Step 43 consumed number:   none
```

## 24. Build timestamps/status

```text
No Step 43 build timestamps or status exist.
```

## 25. Artifact metadata

```text
No Step 43 IPA/build artifact exists.
```

## 26. Submission mechanism

```text
No submission mechanism was invoked.
```

## 27. EAS submission ID

```text
No Step 43 submission exists.
```

## 28. Submission status

```text
No Step 43 submission status exists.
```

## 29. Apple/TestFlight processing state

```text
No new Step 43 binary was uploaded.
State: UNKNOWN / not applicable to a new build.
```

No claim is made that a build is uploaded, processing, ready to test, testing,
invalid, or rejected.

## 30. Internal testing state

```text
Calora Internal Testers: unchanged
New build assignment:     none
External/public group:    none created
```

## 31. Weekly Programs fix provenance

The exact isolated source is the approved Step 41 release-gated source. Step 43
did not modify the reconciled deterministic Weekly Programs modal state
machine.

This is source provenance only. No physical-device result is claimed.

## 32. Preserved Calora features

No application source changed. The isolated source preserves:

- durable capture acceptance;
- Weekly Programs deterministic modal transition;
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

## 33. Original local checkout post-release verification

No manual checkout, reset, rebase, amend, commit, merge, force operation, or
push was performed against the original branch.

The platform automatically preserved the newly attached Step 43 owner
instruction as a documentation-only local commit after Mission 1:

```text
Initial Step 43 HEAD: f7ebbdfd52c8f44d1dc42b8e16f6cb4dfa7f45f5
Later local HEAD:     f8c05bcf3bb9931be494b3934b0d454ae7b203b3
Later local TREE:     64272d2a0944b907ae3a1231335fe211f604172b
Later ahead/behind:   3 / 0
Commit content:       Step 43 owner instruction attachment only
```

This automatic local documentation checkpoint did not alter the detached
release worktree, `origin/main`, application source, or release source
identity. The local documentation commits were not pushed.

Creation of this required Step 43 report may likewise be preserved by the
platform after verification. It is not part of the isolated release source.

## 34. origin/main post-release verification

Final read-only fetch:

```text
origin/main SHA:  292d105638bc0316be08cf3763fc46239e05dd42
origin/main TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
```

No push occurred.

## 35. Database/API/Android boundary confirmation

```text
Database mutation:             none
Schema change:                 none
Migration:                     none
Seed operation:                none
API deployment:                none
Replit production publish:     none
Android build:                 none
Android submission:            none
Android version change:        none
App Store production release:  none
```

## 36. Owner physical iOS test plan

No valid Step 43 TestFlight build exists, so device testing cannot begin.
After a later authorized build reaches TestFlight, the owner must perform:

1. **Build identity:** Install/update Calora from TestFlight and confirm the
   displayed build number matches the new release build.
2. **Weekly Programs:** Open Calora → Plan → gear → Weekly Programs and tap any
   program. Program detail should open immediately.
3. **Back/close:** Close or go back from detail. Return to the selector
   normally, with no stuck overlay or frozen taps.
4. **Second program:** Tap another program. Detail should open immediately
   again.
5. **Apply:** Tap Apply. The program should apply and the modal should close
   normally.
6. **Repeat:** Repeat selector → detail → back → selector → another detail at
   least twice. There should be no intermittent unresponsive touch.
7. **Core smoke test:** Verify Home, Recipes, Smart Scan, Coach,
   Diary/Profile, and auth/session persistence.

No device result is fabricated in this report.

## 37. Remaining uncertainties

1. The authoritative highest used App Store/TestFlight build number was not
   selected or consumed because prebuild validation failed.
2. The EAS provisioning-profile response reported `active`, but the canonical
   preflight script rejected lowercase status. Credential readiness must be
   reconfirmed after normalizing this comparison.
3. The two canonical `SwipeableTabList.tsx` style type errors must be corrected
   without changing runtime behavior.
4. Production API compatibility and duplicate-build checks must be repeated
   from the next exact release-gated source before a paid build.

## 38. Exact recommendation for Step 44

Step 44 should authorize only the minimum release-blocker remediation:

1. make the `gestureSurface` no-selection style type-safe without changing
   swipe behavior;
2. normalize EAS provisioning-profile status case before comparing it with
   `ACTIVE`, with tests for uppercase and lowercase active values;
3. run the full workspace typecheck, scripts tests, signing preflight, config
   assertions, and `git diff --check`;
4. commit and push only those minimal validated changes through the normal
   canonical `main` process;
5. require `Run release validation suite` to succeed on the exact new SHA;
6. obtain fresh owner authorization for one iOS production/TestFlight build
   from that new canonical SHA.

Do not build from `292d105…`, because its required canonical prebuild
validation does not pass. Do not repair this by bypassing typecheck or by
loosening the signing gate without preserving revoked/expired-profile failure.

## Final verdict

TESTFLIGHT RELEASE BLOCKED — PREBUILD VALIDATION FAILED