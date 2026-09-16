# Calora Step 46 — iOS Build-Number Control Remediation Report

**Execution date:** 2026-09-16
**Scope:** Deterministic iOS build-number remediation only
**Build/submission scope:** No EAS build, iOS build, Android build, or TestFlight submission was authorized or performed

## 1. Executive summary

Step 45 proved that EAS production auto-increment was unsafe for this project:
the canonical source declared iOS build `1`, `appVersionSource` was `local`, and
production `autoIncrement` was `true`. EAS queued the canonical artifact as
build `2`, even though EAS history had already consumed build `4`.

Step 46 changed only release/version control:

- source iOS build number: `5`;
- production `autoIncrement`: `false`;
- new authenticated, fail-closed build-number preflight;
- focused tests for consumed floors, duplicates, active builds, missing values,
  and off-by-one behavior;
- production signing preflight now runs the number gate before any production
  EAS request.

The remediation was validated locally, proven against live EAS and App Store
Connect state, committed once, pushed fast-forward to canonical `main`, and
passed the exact-SHA Release validation check. No build or submission was
started.

## 2. Starting canonical SHA/tree

- Starting SHA: `5e39f25fdab600d2980899f4bd94a09700740796`
- Starting tree: `9b1bd8162f5bd79390932cdf9c2deae4b3989574`
- Starting `origin/main`: same SHA/tree
- Starting checkout: detached isolated Step 46 worktree
- Starting worktree: clean

The documentation-ahead local checkout was not reset, rebased, merged, or
rewritten.

## 3. Step 45 failed-build forensic identity

- EAS build ID: `46280687d-d685-417c-99cf-e967124cb47e`
- Status: `FINISHED`
- Platform: `IOS`
- Profile: `production`
- Distribution: `STORE`
- Source SHA: `5e39f25fdab600d2980899f4bd94a09700740796`
- Marketing version: `1.0.0`
- Incorrect build number: `2`
- Step 45 artifact: preserved
- Step 45 artifact: not submitted and not deleted

## 4. Current Apple build-number state

Authenticated read-only App Store Connect build history for app
`6800321660` reported:

- existing Apple build count: `1`;
- highest Apple build number: `2`;
- existing Apple build processing state: `VALID`;
- existing Apple build ID: `7d4e1c8c-7690-47f3-bd2e-c462b0d7c327`;
- no new Apple/TestFlight build was created during Step 46.

## 5. Current EAS build-number state

Authenticated paginated EAS iOS history reported:

- highest consumed EAS iOS build number: `4`;
- highest finished EAS production/store build for version `1.0.0`: `3`;
- build `4` was an errored record with app version `0.0.0`;
- no queued, new, in-progress, or pending-cancel iOS build was present during
  the post-push proof.

## 6. Authoritative consumed-number floor

The authoritative floor is the maximum of Apple and EAS consumed iOS numbers:

- Apple floor: `2`
- EAS floor: `4`
- authoritative consumed-number floor: `4`

## 7. Selected safe next number

**Selected safe next iOS build number: `5`**

The safety gate computes this as authoritative floor plus one and refuses any
configured source number that is not exactly `5`.

## 8. Root cause of Step 45 numbering failure

The causal chain was:

```text
source ios.buildNumber = 1
+ cli.appVersionSource = "local"
+ production autoIncrement = true
=> EAS increments the local source value to 2
=> queued artifact reports build 2
```

EAS did not reconcile the local source value with the previously consumed EAS
build `4`, so local auto-increment was not a safe global release-number
allocator.

## 9. Existing appVersionSource behavior

The project uses:

```json
{
  "cli": {
    "appVersionSource": "local"
  }
}
```

Step 46 keeps local version control because it is transparent and testable,
but no longer delegates the number increment to EAS.

## 10. Existing autoIncrement behavior

Before remediation:

```json
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  }
}
```

After remediation:

```json
{
  "build": {
    "production": {
      "autoIncrement": false
    }
  }
}
```

## 11. Chosen deterministic numbering strategy

Strategy A was selected:

- keep `appVersionSource: "local"`;
- set `expo.ios.buildNumber` to the proven safe next number;
- disable production `autoIncrement`;
- require a live pre-build proof against both Apple and EAS history;
- refuse concurrent active iOS EAS builds.

This avoids remote EAS version mutation and makes the number present in the
resolved Expo config before a future owner-authorized build.

## 12. Off-by-one analysis

The remediation does not combine an explicit source number with incrementing.
The resolved source number is `5` and `autoIncrement` is `false`, so the
predicted production number is exactly `5`, not `6`.

The focused tests also reject a configured `6` when the consumed floor is `4`;
the selected number must be exactly floor plus one.

## 13. Exact remediation

Changed:

- `artifacts/calora/app.json`: iOS `buildNumber` `1` → `5`;
- `artifacts/calora/eas.json`: production `autoIncrement` `true` → `false`;
- `artifacts/calora/package.json`: added the live number-proof script;
- `artifacts/calora/scripts/ios-build-number-preflight.js`: added the
  authenticated EAS/App Store Connect gate;
- `artifacts/calora/scripts/ios-build-number-preflight.test.js`: added focused
  version-control tests;
- `artifacts/calora/scripts/ios-signing-preflight.js`: production queue and
  Apple rehearsal paths now run the number gate before EAS.

No runtime application behavior was changed.

## 14. Changed paths

The one remediation commit changed exactly:

```text
M artifacts/calora/app.json
M artifacts/calora/eas.json
M artifacts/calora/package.json
A artifacts/calora/scripts/ios-build-number-preflight.js
A artifacts/calora/scripts/ios-build-number-preflight.test.js
M artifacts/calora/scripts/ios-signing-preflight.js
```

## 15. Build-number safety gate

`ios-build-number-preflight.js`:

- reads the local Expo/EAS version configuration;
- requires `appVersionSource: "local"`;
- requires `autoIncrement: false`;
- requires a positive integer source build number;
- paginates EAS iOS build history;
- reads authenticated App Store Connect build history;
- includes errored, canceled, and old-marketing-version EAS numbers in the
  consumed floor;
- rejects active iOS EAS records to avoid concurrent allocation;
- requires the configured source number to equal floor plus one;
- prints only sanitized proof values;
- never starts an EAS build.

`ios-signing-preflight.js` invokes this gate before the production queue path
and before the Apple rehearsal path.

## 16. Focused version-control tests

Focused release tests passed:

- consumed EAS numbers include errored and old-version records;
- build `2` cannot be selected again;
- `autoIncrement: true` fails the deterministic strategy;
- active iOS EAS builds fail closed;
- off-by-one selection fails closed;
- missing and malformed numbers are rejected;
- both supported EAS JSON response shapes parse correctly.

Combined focused signing/version suite: **20 passed, 0 failed**.

## 17. Full typecheck result

`pnpm run typecheck`: **passed**.

The workspace library build and typechecks for API server, Calora, FatSecret
gateway, mockup sandbox, and scripts all completed successfully.

## 18. Scripts tests

`pnpm --filter @workspace/scripts test`: **47 passed, 0 failed**.

## 19. Calora tests

`pnpm --filter @workspace/calora test`:

- Vitest: **82 files passed, 1,163 tests passed**;
- server security suite: **6 passed, 0 failed**.

## 20. Expo/EAS config validation

Frozen install passed:

```text
pnpm install --frozen-lockfile
```

Expo resolved:

- version: `1.0.0`;
- owner: `vvault07`;
- project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`;
- bundle identifier: `com.etiendem.caloraapp`;
- iOS build number: `5`;
- Android version code: `24`.

EAS production config resolved:

- distribution: `store`;
- credentials source: `remote`;
- auto-increment: `false`;
- iOS build number: `5`.

`git diff --check`: passed.

## 21. Signing-preflight result

Read-only live signing preflight passed:

```text
RELEASE PREFLIGHT PASSED
distribution certificate: ready
provisioning profile: ready
```

The reported certificate and provisioning profile expiration remains
`2027-07-21`. The command did not start a build.

The macOS Apple certificate rehearsal was not run because this Linux
environment cannot provide the required Apple native host.

## 22. Pre-push dry proof of next build number

Live proof before push:

```text
Marketing version: 1.0.0
Version-control source: local
autoIncrement: false
EAS consumed floor: 4
Apple consumed floor: 2
Authoritative consumed floor: 4
Selected next build number: 5
Predicted production iOS build number: 5
```

The predicted number equaled the selected safe number without launching EAS.

## 23. Scope/runtime audit

The remediation diff contains no changes to:

- Planner or Weekly Programs;
- Recipes or Coach;
- Smart Scan;
- authentication or PKCE;
- database, sync, or API contracts;
- RevenueCat;
- Apple Health behavior;
- UI/runtime application behavior;
- Android release configuration;
- unrelated native workflows.

The new script performs read-only external history queries and local
configuration validation only.

## 24. Database/API/Android confirmation

- API deployment: none
- Replit production publish: none
- Database mutation: none
- Schema change: none
- Migration: none
- Seed: none
- Android build: none
- Android submission: none
- Production user data mutation: none

## 25. Remediation commit SHA/tree

- Parent SHA: `5e39f25fdab600d2980899f4bd94a09700740796`
- Remediation commit: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Remediation tree: `1a598be866150d488bc21ccd598de3104c638b02`
- Commit subject: `Fix deterministic iOS build number control`

## 26. Push result

The remediation commit was pushed normally as a fast-forward:

```text
5e39f25..7cce885  HEAD -> main
```

No force push, rebase, reset, merge, or history rewrite was used.

## 27. New canonical GitHub SHA/tree

- New `origin/main` SHA:
  `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- New `origin/main` tree:
  `1a598be866150d488bc21ccd598de3104c638b02`
- Canonical release worktree after push: clean

## 28. Automatic Release validation run

- Workflow: `Release validation`
- Run ID: `35148539746`
- Head SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Run created: `2026-09-16T20:46:14Z`
- Run started: `2026-09-16T20:46:14Z`
- Run completed: `2026-09-16T20:46:48Z`
- Run status: `completed`
- Run conclusion: `success`

## 29. Required check result

- Check name: `Run release validation suite`
- Check-run ID: `104970661620`
- Head SHA:
  `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Started: `2026-09-16T20:46:17Z`
- Completed: `2026-09-16T20:46:47Z`
- Status: `completed`
- Conclusion: `success`

## 30. Post-push authoritative number requery

The post-push live gate queried current state again and reported:

- Apple floor: `2`;
- EAS floor: `4`;
- authoritative floor: `4`;
- no active iOS EAS build;
- configured source number: `5`;
- `autoIncrement`: `false`;
- selected next number: `5`;
- predicted production number: `5`.

## 31. Exact expected next iOS build number

**Expected next production iOS build number: `5`.**

This expectation is proven against the post-push canonical source and current
Apple/EAS state.

## 32. Confirmation that no EAS/iOS build was started

Step 46 started:

- no EAS build;
- no iOS build;
- no Android build;
- no EAS submission;
- no TestFlight upload;
- no App Store production submission.

The only EAS build referenced in this report is the preserved Step 45
forensic artifact.

## 33. Preserved Calora features

The remediation commit did not alter or remove:

- durable capture acceptance;
- Weekly Programs deterministic modal state machine;
- shared Planner Program pools and eligibility;
- bounded Coach lifecycle;
- Coach Fact Context restriction;
- diary `imageAssetKey` synchronization;
- capture compatibility/security;
- recipe `nextOffset`/`terminalReason`;
- Premium entitlement;
- PKCE/authentication;
- account isolation;
- deletion fences;
- sync ownership;
- generated API contracts;
- release attestation;
- Expo Router;
- Apple Health privacy configuration;
- production/TestFlight configuration.

## 34. Remaining uncertainties

- The macOS Apple certificate rehearsal remains unavailable in this Linux
  environment.
- The next owner-authorized build must be preceded by the live gate; build `5`
  remains the expected number only while no other iOS build is consumed.
- A future owner-authorized release must update the local number after build `5`
  is consumed; the fail-closed gate will reject stale source values.
- No physical-device or TestFlight behavior was tested in Step 46 because no
  build was authorized.

## 35. Exact recommendation for Step 47

Authorize a future iOS build only after running the live number gate against
the then-current Apple/EAS state. Do not bypass the production signing wrapper,
do not re-enable `autoIncrement` without a separately proven strategy, and use
the exact number printed by the gate. After a valid build is authorized,
submission must still be a separate explicit owner action.

## Final verdict

IOS BUILD NUMBER CONTROL VERIFIED — READY FOR OWNER BUILD AUTHORIZATION