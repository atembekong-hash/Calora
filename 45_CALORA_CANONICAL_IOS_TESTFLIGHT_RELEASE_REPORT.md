# Calora Step 45 — Canonical iOS TestFlight Release Report

**Execution date:** 2026-09-16 (America/New_York)  
**Scope:** One owner-authorized iOS production EAS build only  
**Report status:** Complete; TestFlight submission intentionally not performed

## 1. Executive summary

All pre-build gates passed on a fresh detached checkout of the owner-authorized
canonical source. The required GitHub release check passed, local validation and
signing preflight passed, the deployed API was compatible with the canonical
mobile contracts, and no equivalent canonical build was running or already
available.

Exactly one iOS production EAS build was then queued and finished successfully.
The finished build is attributable to the canonical SHA, but EAS auto-incremented
the local `ios.buildNumber` from `1` to `2`. Authoritative discovery had already
shown that EAS had consumed build number `4`, so the selected valid next number
was `5`. Build `2` is therefore not eligible for TestFlight submission. No
submission was attempted, no second build was started, and no production data or
source branch was changed.

## 2. Canonical SHA and tree

| Item | Required | Verified |
|---|---|---|
| Git SHA | `5e39f25fdab600d2980899f4bd94a09700740796` | Yes |
| Git tree | `9b1bd8162f5bd79390932cdf9c2deae4b3989574` | Yes |
| `origin/main` SHA after final check | Same canonical SHA | Yes |
| `origin/main` tree after final check | Same canonical tree | Yes |

## 3. Isolated release checkout identity

- Checkout: `/home/runner/workspace/.step45-release-canonical`
- State: detached HEAD
- HEAD: `5e39f25fdab600d2980899f4bd94a09700740796`
- Tree: `9b1bd8162f5bd79390932cdf9c2deae4b3989574`
- Final tracked working tree: clean
- The documentation-ahead local `main` was not reset, merged, rebased, pushed,
  or otherwise rewritten. Its observed HEAD remained separate from the release
  checkout.

## 4. Exact release-gate evidence

- GitHub workflow: `Release validation`
- Run ID: `35138191565`
- Required check: `Run release validation suite`
- Head SHA: canonical SHA above
- Status: `completed`
- Conclusion: `success`
- Check completed: `2026-09-16T19:03:32Z`

## 5. Expo identity

- Owner: `vvault07`
- Project slug: `calora`
- Expo project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`
- Marketing version: `1.0.0`
- Expo-resolved iOS bundle: `com.etiendem.caloraapp`

## 6. Apple and App Store identity

- App Store Connect App ID: `6800321660`
- Apple Team ID: `B5344GJRMT`
- Bundle identifier: `com.etiendem.caloraapp`
- Production iOS distribution: `store`
- App Store Connect API credential names were present by metadata only.

## 7. EAS production configuration

The canonical `eas.json` contained:

- production profile present;
- `autoIncrement: true`;
- `credentialsSource: "remote"`;
- iOS distribution `store`;
- production submit profile present;
- App Store Connect App ID `6800321660`;
- Apple Team ID `B5344GJRMT`;
- bundle identifier `com.etiendem.caloraapp`;
- `appVersionSource: "local"`.

## 8. Credential availability

The following names were present. Secret values, private keys, tokens, and
authorization headers were never printed or written to this report:

- `EXPO_TOKEN`
- `EXPO_ASC_KEY_ID`
- `EXPO_ASC_ISSUER_ID`
- `EXPO_ASC_API_KEY_P8`
- `APPLE_APP_STORE_ID`
- `APPLE_TEAM_ID`

## 9. Authoritative highest existing iOS build number

- App Store Connect authenticated read-only `/v1/builds` query for app
  `6800321660`: one existing build record.
- Existing Apple build number: `2`
- Apple processing state: `VALID`
- Apple build ID: `7d4e1c8c-7690-47f3-bd2e-c462b0d7c327`
- Apple uploaded time: `2026-09-15T04:30:57-07:00`
- EAS history: 16 iOS records returned.
- Highest EAS numeric build number: `4`.
- The EAS build using number `4` was an errored production/store record with
  app version `0.0.0`; it still consumes the EAS-side number for safe
  auto-increment planning.
- Highest finished EAS production/store record on marketing version `1.0.0`
  was build `3`.

## 10. Selected next build number

**Selected valid next number: `5`**

This number was selected because it is greater than the highest relevant
App Store Connect number (`2`) and the highest consumed EAS number (`4`).

## 11. Build-number evidence and mismatch

The canonical source initially declared local iOS build number `1`. The
production wrapper invoked EAS with auto-increment enabled. EAS changed the
isolated checkout's generated local `app.json` value from `1` to `2` and the
queued build record reported `2`; it did not select the authoritative next
number `5`.

The generated local change was restored after the build to return the isolated
checkout to the exact canonical source. It was never committed or pushed.

## 12. Duplicate-build investigation

Before the new build:

- EAS search by canonical Git SHA returned no build.
- EAS `IN_PROGRESS`, `IN_QUEUE`, and `NEW` iOS searches returned no build.
- GitHub activity for the canonical SHA contained no TestFlight-upload build
  workflow and no equivalent iOS build workflow.
- The only canonical-SHA workflows observed were release validation,
  account-deletion validation, association monitoring, and the two unrelated
  native workflows.

**Finding before launch:** `NO EQUIVALENT BUILD FOUND`.

## 13. Production API compatibility result

Read-only checks were performed against both the configured production API
origin (`https://calorie-coach-pie35449.replit.app`) and the verified current
deployment origin (`https://mycaloraapp.com`). Both resolved to the same
attested API release:

- API health: HTTP `200`, `{ "status": "ok" }`
- API attestation endpoint: HTTP `200`
- deployed API commit: `dd4d130b03e6f05e52b9a275d58760849aa58590`
- deployed API tree: `ffec94339941e4270da869606de9d2627c7a7a98`
- deployed API release ID: `calora-api-dd4d130b03e6-20260916120901599`
- public recipe read: HTTP `200`; response included `recipes`, `nextOffset`,
  `terminalReason`, `source`, and `warmupPending`
- unauthenticated diary read: HTTP `401`, sign-in required
- invalid capture approval probe: HTTP `400`, `Invalid capture session`

Static and local test evidence covered capture approval, `nextOffset`,
`terminalReason`, authenticated session boundaries, diary sync
`imageAssetKey`, and generated API contracts. The canonical mobile source does
not call the legacy `/v1/profile` path that is present in the OpenAPI
description but not mounted by the current server; this documentation drift
did not establish a critical incompatibility for the shipped mobile request
paths.

**Result:** No critical production API incompatibility was proven.

## 14. Pre-build validation results

From the fresh canonical checkout:

- `pnpm install --frozen-lockfile`: passed
- `pnpm run typecheck`: passed
- `pnpm --filter @workspace/scripts test`: passed, 47 tests
- `pnpm --filter @workspace/calora test`: passed, 82 files / 1,163 tests;
  server security tests also passed, 6 tests
- `pnpm --filter @workspace/api-server build`: passed with canonical source
  attestation
- `pnpm --filter @workspace/api-server test`: passed, 36 files / 429 tests;
  4 tests skipped by design
- release-specific native/auth/signing/encrypted-recovery unit gates:
  passed, 41 tests
- Expo config validation from `artifacts/calora`: passed
- EAS production config assertions: passed
- Apple Health privacy configuration assertions: passed
- generated API compatibility assertions: passed
- `git diff --check`: passed
- No tracked source change was present before the build.

The repository-wide Prettier check was not treated as a release gate. It
reported pre-existing formatting differences across 783 files and no formatter
was run.

## 15. Live signing-preflight result

The read-only live EAS signing preflight passed:

```text
RELEASE PREFLIGHT PASSED
distribution certificate: ready
provisioning profile: ready
```

Sanitized credential readiness:

- distribution certificate expiration: `2027-07-21`
- provisioning profile expiration: `2027-07-21`
- certificate status: ready
- provisioning profile status: active

The macOS Apple certificate rehearsal was not run because this Linux release
environment cannot provide the required Apple native host.

## 16. Native workflow failure classification

Two workflows failed immediately on the canonical SHA:

| Workflow | Run ID | Result |
|---|---:|---|
| `native-encrypted-recovery.yml` | `35138188472` | failed before job creation |
| `native-auth-preflight.yml` | `35138189878` | failed before job creation |

Both runs had `status: completed`, `conclusion: failure`, identical
creation/update timestamps, no `run_started_at`, and zero GitHub jobs. Their
workflow definitions require a self-hosted `calora-native` runner and, for the
auth workflow, required dispatch inputs. No application, signing, or native
test step executed and no release-critical defect was proven.

**Classification:** workflow/controller/runner configuration failure, not a
proven native release-safety defect.

## 17. Final pre-build source freeze

Immediately before the EAS request:

- HEAD: `5e39f25fdab600d2980899f4bd94a09700740796`
- tree: `9b1bd8162f5bd79390932cdf9c2deae4b3989574`
- `HEAD == origin/main`: yes
- `HEAD` tree equals `origin/main` tree: yes
- tracked working tree: clean

## 18. Exact EAS build mechanism

Exactly one build request was made using the existing Calora production wrapper
from `artifacts/calora`:

```text
pnpm run build:ios:production
```

The wrapper ran the live signing preflight and then invoked the authenticated
EAS CLI with:

```text
eas build --platform ios --profile production --non-interactive --freeze-credentials --no-wait
```

The first attempted command from the monorepo root was rejected locally because
the root has no such script; it did not invoke EAS and did not create a build.

## 19. EAS build ID

`46280687d-d685-417c-99cf-e967124cb47e`

## 20. Build provenance

The finished EAS record matched:

- project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`
- platform: `IOS`
- profile: `production`
- distribution: `STORE`
- Git SHA: `5e39f25fdab600d2980899f4bd94a09700740796`
- marketing version: `1.0.0`
- bundle: `com.etiendem.caloraapp`

The source SHA provenance is clear. The release identity is not acceptable
because the build number is `2` rather than the selected authoritative `5`.

## 21. Marketing version and build number

- Marketing version: `1.0.0`
- EAS build number: `2`
- Required selected next number: `5`
- Build-number gate: failed after EAS assigned the number

## 22. Build status and timestamps

- EAS status: `FINISHED`
- Created: `2026-09-16T20:09:11.965Z`
- Completed: `2026-09-16T20:17:23.309Z`
- EAS list output did not expose a separate started timestamp.
- Build failure object: none

## 23. Artifact metadata

- Artifact produced: iOS `.ipa`
- Artifact URL recorded by EAS:
  `https://expo.dev/artifacts/eas/5TuH99T_GPuVHeWlKkt5fX6Lb8gOUm_q2a9M9Ws9wpE.ipa`
- Artifact was not submitted to Apple because its build number was invalid for
  this release.

## 24. Exact submission mechanism

No submission mechanism was run. In particular, neither
`eas submit --latest` nor an explicit-build submission was invoked.

## 25. EAS submission ID

**None.**

The available EAS CLI did not expose a `submission:list` command, and the
submission command was never called. No submission ID was created.

## 26. Submission status and timestamps

**Not submitted.** There are no submission timestamps or terminal submission
status to report.

## 27. Apple and TestFlight state

The new EAS artifact was not uploaded to App Store Connect. Apple state
therefore remains unchanged:

- existing Apple build: `2`
- Apple processing state: `VALID`
- existing Apple build ID:
  `7d4e1c8c-7690-47f3-bd2e-c462b0d7c327`
- new EAS build `46280687d...`: not present in Apple/TestFlight

This is not `UPLOADED`, `PROCESSING`, `READY TO TEST`, or `TESTING`.

## 28. Internal tester/group state

No new build reached TestFlight, so no assignment to the existing
`Calora Internal Testers` group occurred. No external or public testing was
created.

## 29. Weekly Programs fix provenance

The canonical source contains the deterministic Program modal state machine:

- `artifacts/calora/lib/programModalState.ts`
- `artifacts/calora/lib/__tests__/programModalState.test.ts`
- `artifacts/calora/app/(tabs)/planner.tsx`

The planner uses explicit selector/detail/close/apply transitions and opens
program detail through `selectProgram(...)`. This proves source/build
provenance only. No physical-device result is claimed.

## 30. Preserved Calora features

The canonical source and completed validation suites preserve the requested
release features and boundaries:

- durable capture acceptance;
- deterministic Weekly Programs modal transitions;
- shared Planner Program pools and eligibility;
- bounded Coach lifecycle;
- Coach Fact Context restriction;
- diary `imageAssetKey` synchronization;
- capture compatibility and security;
- recipe `nextOffset` and `terminalReason`;
- Premium entitlement;
- PKCE/authentication and session retry behavior;
- account isolation and deletion fences;
- sync ownership;
- generated API contracts;
- release attestation;
- Expo Router;
- production EAS configuration;
- Apple Health privacy configuration;
- TestFlight submit configuration.

## 31. Android confirmation

- Android build: none
- Android submission: none
- Android workflow was not launched by Step 45.

## 32. Database, migration, and schema confirmation

- Database mutation: none
- Schema change: none
- Migration: none
- Seed: none
- Production user data was not created, changed, or deleted.

## 33. API deployment confirmation

- API deployment: none
- Replit production publish: none
- Production API was queried read-only only.

## 34. Final GitHub source verification

After the build:

- `origin/main` SHA remained
  `5e39f25fdab600d2980899f4bd94a09700740796`
- `origin/main` tree remained
  `9b1bd8162f5bd79390932cdf9c2deae4b3989574`
- detached release checkout was restored to a clean tracked state
- no commit, merge, rebase, reset, force push, or documentation merge was
  performed

## 35. Owner physical iOS test plan

This plan is retained for a future valid TestFlight build. It must not be
treated as completed by Step 45:

1. Install/update Calora from TestFlight and confirm the new build number.
2. Open `Calora → Plan → gear → Weekly Programs`, tap a program, and confirm
   detail opens immediately.
3. Close/back and confirm normal return with no stuck overlay or frozen touch
   state.
4. Tap a second program and confirm detail opens immediately again.
5. Tap Apply and confirm the program applies and the modal closes.
6. Repeat selector → detail → back → selector → another detail at least twice.
7. Smoke-test Home, Recipes, Smart Scan, Coach, Diary/Profile, and
   auth/session persistence.

No owner/device result is claimed in this report.

## 36. Remaining uncertainties

- The EAS build service selected build `2` from the local source value despite
  prior EAS records through `4`; the service did not honor the pre-discovered
  safe next number automatically.
- The Apple macOS certificate rehearsal was not run on this Linux environment.
- Apple has no record of the new artifact because submission was correctly
  withheld.
- The current production API is an older attested ancestor release than the
  canonical mobile SHA, but all required mobile contract probes and local
  contract tests passed.
- No physical-device validation was possible or claimed.

## 37. Exact recommendation for Step 46

Do not retry the paid build under this authorization. Before requesting another
release authorization, correct the release-number control so the next EAS
production build is explicitly assigned build `5` or uses a verified remote
auto-increment source that returns a number greater than every consumed EAS and
App Store Connect number. Then rerun the full pre-build gate and duplicate check
from the same canonical source; only after a new owner authorization should a
new paid build or TestFlight submission be considered.

## Final verdict

IOS BUILD PROVENANCE FAILED — NO TESTFLIGHT SUBMISSION