# Calora Step 42 Canonical iOS TestFlight Release Report

Date: 2026-09-16  
Scope: Read-only release preflight only. No iOS build or TestFlight submission
was started because the required canonical build-source integrity gate failed.

## 1. Executive summary

Step 42 authorizes one controlled iOS production build and TestFlight
submission only from the exact Step 41 canonical GitHub source:

```text
SHA:  292d105638bc0316be08cf3763fc46239e05dd42
TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
```

The remote canonical `origin/main` still matches that approved identity.
However, local `main` is one commit ahead with an unpushed documentation and
attachment commit. Step 42 requires `local == origin/main`, ahead `0`, behind
`0`, and a clean tracked working tree immediately before any build. The owner
also forbids reset, rebase, or history rewriting.

Because the local source is not the exact canonical source, the build-source
integrity preflight failed. No EAS build, iOS build, App Store submission,
TestFlight submission, version change, source commit, source push, API
deployment, database operation, or Android action was taken.

## 2. Starting canonical SHA/tree

The approved Step 41 canonical source is:

```text
SHA:  292d105638bc0316be08cf3763fc46239e05dd42
TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
```

The initial Step 42 remote fetch confirmed:

```text
origin/main SHA:  292d105638bc0316be08cf3763fc46239e05dd42
origin/main TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
```

Remote canonical `main` did not advance.

## 3. Local/origin synchronization

At the Step 42 freeze:

```text
local main SHA:   c5057cc1d50e2dccea6d019c8b03196e1a1feb1c
local main TREE:  9272c9d1069235924a6374e00bc9249ef464e09a
origin/main SHA:  292d105638bc0316be08cf3763fc46239e05dd42
origin/main TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
ahead/behind:     1 / 0
```

The local-only commit is:

```text
c5057cc Add CALORA release gate credential integration report and supporting documentation
```

Its paths are documentation/attached material only:

```text
41_CALORA_RELEASE_GATE_CREDENTIAL_INTEGRATION_AND_VERIFICATION_REPORT.md
attached_assets/Pasted-CALORA-STEP-41-RELEASE-GATE-CREDENTIAL-INTEGRATION-AND-_1789577009319.txt
```

It contains no Calora application, EAS, native, API, database, or version
change. Nevertheless, it changes the local Git source identity and means local
`main` does not equal the approved canonical remote commit.

## 4. Exact release-gate evidence

The approved canonical source has the exact verified Step 41 gate evidence:

```text
Workflow:      Release validation
Workflow ID:   359784386
Run ID:        35123941578
Run number:    3
Event:         push
Branch:        main
Head SHA:      292d105638bc0316be08cf3763fc46239e05dd42
Check:         Run release validation suite
Check status:  completed
Conclusion:    success
```

No later source commit has an approved Release validation result. Step 42 does
not permit substituting local tests or an older successful check for the exact
build-source gate.

## 5. Expo project identity

The Calora source configuration under `artifacts/calora` identifies:

```text
Expo owner:      vvault07
Expo project:    Calora
Expo project ID: 1f202325-5b9a-4260-978f-abbd3252b9ee
```

The artifact directory and project identity match the authorized Step 42
target. No identity mismatch was observed.

## 6. Apple/App Store identity

The Calora production configuration identifies:

```text
iOS bundle identifier: com.etiendem.caloraapp
App Store Connect App ID: 6800321660
Apple Team ID:          B5344GJRMT
```

These values match the owner-authorized Step 42 identity. No Apple identity
change was made.

## 7. Production EAS configuration verification

The existing Calora EAS configuration was read only. It retains:

```text
CLI app version source: local
Production profile:     present
iOS distribution:       store
Credentials source:      remote
Production submit:       present
Submit ascAppId:         6800321660
Submit Apple Team ID:     B5344GJRMT
Submit bundle identifier: com.etiendem.caloraapp
```

The existing production profile retains automatic increment behavior. No EAS
configuration was rewritten. The configured local marketing version is `1.0.0`
and the source `ios.buildNumber` is `1`; neither was changed.

## 8. Credential existence verification

Existing workspace secret metadata confirms the following required release
credentials are present by name only:

```text
EXPO_TOKEN:           present
EXPO_ASC_KEY_ID:      present
EXPO_ASC_ISSUER_ID:   present
EXPO_ASC_API_KEY_P8:  present
APPLE_APP_STORE_ID:   present
APPLE_TEAM_ID:        present
```

No credential value or private key content was read, printed, logged, copied,
or included in this report.

## 9. Previous TestFlight build state

The owner-provided historical reference is:

```text
Marketing version: 1.0.0
Build number:      2
```

No live App Store Connect or EAS build-state query was initiated after the
canonical source preflight failed.

## 10. Authoritative highest iOS build number

```text
Not determined.
```

The build-source integrity gate failed before release operations. Querying
remote build history or choosing a version number would not make an
unauthorized local source suitable for a production build.

## 11. Selected next build number and evidence

```text
No build number selected.
No version/build-number change made.
```

The next valid iOS build number must be determined from authoritative EAS/App
Store Connect state only after a separately authorized source-integrity path is
available.

## 12. Versioning strategy

The existing EAS configuration uses local app version source and has
production auto-increment enabled. Step 42 directs use of existing safe remote
version management where applicable and prohibits an unnecessary source commit.

Because the exact build source is not available in this checkout, no version
strategy was executed and no source version mutation was considered safe.

## 13. Any source version-change diff

```text
No source version change.
No diff.
```

## 14. Any version-change commit SHA/tree

```text
No version-change commit created.
No version-change tree created.
```

## 15. Release-gate result for version commit if applicable

```text
Not applicable. No version commit exists.
```

## 16. Exact final build-source SHA/tree

```text
No build source was authorized.
```

The only owner-approved candidate remains the remote Step 41 source:

```text
292d105638bc0316be08cf3763fc46239e05dd42
fc1334da98c36d2db38bc6a1a04daeca34af6860
```

The local checkout is not that identity and was not used for a build.

## 17. Pre-build validation results

The required pre-build source-integrity criteria were evaluated:

| Requirement | Result |
| --- | --- |
| Branch is `main` | Passed |
| `origin/main` matches Step 41 canonical SHA/tree | Passed |
| Local `main` equals `origin/main` | Failed |
| Ahead equals 0 | Failed; ahead 1 |
| Behind equals 0 | Passed |
| Tracked working tree clean before any report generation | No unrelated tracked edit; local branch remains divergent |
| Exact canonical required check success | Passed for `292d105…` only |

Because local/source equality and ahead-zero requirements failed, broader
pre-build validation and native release actions were not run.

## 18. Duplicate-build check

```text
Not performed.
```

No iOS production build was authorized from the divergent local checkout, so
there was no risk of starting a duplicate paid build.

## 19. Production API compatibility check

```text
Not performed.
```

The task stopped at source-integrity preflight before a build was eligible.
No API deployment or API mutation was performed.

## 20. EAS build command/mechanism

```text
No EAS build command or build mechanism was invoked.
```

## 21. EAS build ID

```text
No Step 42 EAS build exists.
```

## 22. Build provenance

```text
No build provenance exists because no build was started.
```

## 23. Build status/timestamps

```text
No Step 42 build status or timestamps exist.
```

## 24. Marketing version/build number

```text
No Step 42 build number selected or consumed.
No Step 42 marketing version change.
```

The existing source declares marketing version `1.0.0`; this was read only.

## 25. Bundle identifier

```text
com.etiendem.caloraapp
```

Read only; unchanged.

## 26. Build artifact metadata

```text
No Step 42 build artifact exists.
```

## 27. Submission mechanism

```text
No TestFlight submission mechanism was invoked.
```

## 28. EAS submission ID

```text
No Step 42 submission exists.
```

## 29. Submission status/timestamps

```text
No Step 42 submission status or timestamps exist.
```

## 30. App Store Connect/TestFlight observed state

```text
No new Step 42 App Store Connect/TestFlight state exists.
```

No claim is made about uploaded, processing, ready-to-test, testing, or
rejected state because no build or submission was created.

## 31. Internal tester/group state if observable

```text
No testing group was created, modified, or assigned.
```

No distribution action was taken for `Calora Internal Testers` or any other
internal or external group.

## 32. Weekly Programs fix source provenance

The approved canonical Step 41 source is the same release-gated source whose
full workspace typecheck and scripts suite passed. No application source was
modified in Step 42.

No physical-device claim is made. The required Plan → gear → Weekly Programs
device test remains an owner test after a valid TestFlight build is available.

## 33. Preserved reconciliation features

No Calora application changes occurred. The blocked preflight preserved:

- durable capture acceptance;
- Weekly Programs deterministic modal transition/state machine;
- shared Planner Program pools and eligibility;
- bounded Coach request lifecycle;
- Coach Fact Context restriction;
- diary `imageAssetKey` synchronization;
- capture compatibility/security;
- recipe `nextOffset` and `terminalReason`;
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

## 34. Database/migration confirmation

```text
Database mutation: none
Schema change:      none
Migration:          none
Seed operation:     none
```

## 35. Android confirmation

```text
Android build:          none
Android submission:     none
Android version change: none
```

## 36. API deployment confirmation

```text
API deployment:             none
Replit production publish:  none
```

## 37. Final Git synchronization

At the source-integrity stop:

```text
local main SHA:   c5057cc1d50e2dccea6d019c8b03196e1a1feb1c
origin/main SHA:  292d105638bc0316be08cf3763fc46239e05dd42
local TREE:       9272c9d1069235924a6374e00bc9249ef464e09a
origin TREE:      fc1334da98c36d2db38bc6a1a04daeca34af6860
ahead/behind:     1 / 0
```

The only local-ahead commit is documentation/attached content, but it is still
a different source identity. No force push, normal push, reset, rebase, or
history rewrite was used.

## 38. Owner physical iOS test plan

No TestFlight build was created, so physical-device testing cannot begin yet.
When a separately authorized canonical build reaches TestFlight, the owner
should run this plan:

1. **Build identity** — install/update Calora from TestFlight and confirm the
   displayed build number is the new release build number.
2. **Weekly Programs primary fix** — open Calora → Plan → gear → Weekly
   Programs and tap a program. Program detail should open immediately.
3. **Modal back/close** — close or go back from program detail. The selector
   should return without a stuck overlay or frozen touch state.
4. **Second program** — select another Weekly Program. Detail should open
   normally again.
5. **Apply** — tap Apply. The program should apply and the modal should close
   normally.
6. **Intermittent touch check** — repeat selector → detail → back → selector →
   detail at least twice. No unresponsive tap behavior should occur.
7. **Core smoke test** — check Home, Recipes, Smart Scan, Coach,
   Diary/Profile, and auth/session persistence.

Owner device results must be recorded later and are not fabricated here.

## 39. Remaining uncertainties

The approved remote canonical source and its Release validation check are
verified. The blocker is local source synchronization:

```text
origin/main: approved exact source
local main:  one documentation/attachment commit ahead
```

The owner must choose a safe, explicitly authorized way to obtain a clean
canonical build checkout without reset or history rewrite, or authorize a new
canonical source and its corresponding release-gate verification. Until then,
the authoritative next iOS build number and duplicate-build state remain
intentionally unqueried.

## 40. Exact recommendation for Step 43

Before any native build or TestFlight operation, obtain explicit owner
authorization for one of these source-integrity paths:

1. prepare a separate clean checkout of exact `origin/main`
   `292d105638bc0316be08cf3763fc46239e05dd42` for release operations, without
   altering this local branch; or
2. push the documentation commit only if the owner deliberately accepts a new
   canonical SHA, then wait for `Run release validation suite` to succeed on
   that new SHA before release preflight resumes.

Step 43 must verify the exact selected source, determine the authoritative
next build number, check for an equivalent build, and use the supported
iOS/TestFlight publishing flow. It must not reuse or guess a build number and
must not build Android, deploy the API, publish through Replit, modify the
database, or submit an App Store production release.

## Final verdict

TESTFLIGHT RELEASE BLOCKED — PREBUILD VALIDATION FAILED