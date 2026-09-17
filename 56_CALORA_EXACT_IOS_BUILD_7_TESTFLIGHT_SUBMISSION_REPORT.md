# Calora — Step 56 Exact iOS Build 7 TestFlight Submission Report

**Date:** 2026-09-17  
**Scope:** Exact verified Step 55B iOS build submission to internal TestFlight  
**Public App Store release:** none  
**External TestFlight distribution:** none  
**Final verdict:** **TESTFLIGHT BUILD 7 VERIFIED — OWNER DEVICE TESTING REQUIRED**

## 1. Executive summary

The exact Step 55B Calora iOS release candidate was submitted to Apple
TestFlight using its immutable EAS Build ID. No new EAS build was created.

The exact submission completed successfully:

- **EAS Build ID:** `45900e2d-298f-4ece-9041-0e42513266e4`
- **EAS Submission ID:** `cb7882d0-0728-4849-9d54-dbe566b8a478`
- **EAS submission status:** `FINISHED`
- **Apple build ID:** `3cdb2aec-5e3f-4616-a2f3-a64172a454e1`
- **Apple processing state:** `VALID`
- **Apple beta state:** `IN_BETA_TESTING`
- **Internal group:** `Calora Internal Testers`
- **Build 7 group association:** already present

The uploaded IPA remains the Step 55B artifact:

- Marketing version: `1.0.0`
- Build number: `7`
- Bundle ID: `com.etiendem.caloraapp`
- IPA SHA-256:
  `bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13`

The build is ready for owner physical-device testing. Physical-device testing
was not performed by this step.

## 2. Owner authorization

The attached Step 56 runbook explicitly authorized submission of only:

```text
45900e2d-298f-4ece-9041-0e42513266e4
```

No other build was authorized or submitted.

## 3. Authorized EAS Build ID

```text
45900e2d-298f-4ece-9041-0e42513266e4
```

## 4. Quarantined build 6 confirmation

The prior provenance-failed build remains permanently excluded:

- **EAS Build ID:** `fffc4d8a-5e1b-48f0-98c9-e2949136cf04`
- **Build number:** `6`
- **Disposition:** not submitted to TestFlight

Its IPA was not used.

## 5. Canonical Git SHA/tree

The exact build was previously verified from the canonical Step 55B commit:

- **Canonical Git SHA:** `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- **Canonical Git tree:** `f4c820017b82c48052571eb432806b3185aabcfb`

For Step 56, a fresh read-only standalone clone at that exact SHA was used to
verify the immutable candidate before submission:

```text
root:       /tmp/calora-step56-submit
HEAD:       dec8f0d6a9531cb5a2eb73c01706dc75354e743c
tree:       f4c820017b82c48052571eb432806b3185aabcfb
origin/main: dec8f0d6a9531cb5a2eb73c01706dc75354e743c
status:     clean
```

Dependencies were installed with the frozen lockfile into this temporary
clone only. Product source remained unchanged.

## 6. Exact EAS build re-verification

The exact EAS Build ID was queried directly, not selected through latest-build
behavior:

- Status: `FINISHED`
- Platform: `IOS`
- Profile: `production`
- Distribution: `STORE`
- Project: `@vvault07/calora`
- Marketing version: `1.0.0`
- Build number: `7`
- EAS Git SHA:
  `dec8f0d6a9531cb5a2eb73c01706dc75354e743c`
- EAS Git subject: `Prepare iOS build 7 provenance-controlled candidate`

## 7. IPA SHA-256 re-verification

The artifact URL belonging to the exact EAS Build ID was downloaded again and
verified:

- **Artifact size:** `45,721,840` bytes
- **Archive integrity:** passed
- **IPA SHA-256:**
  `bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13`

The observed hash exactly matches the Step 55B report and the Step 56
authorization.

## 8. Info.plist re-verification

The root `Payload/CaloraApp.app/Info.plist` values are:

| Key | Expected | Observed | Result |
|---|---|---|---|
| `CFBundleIdentifier` | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | PASS |
| `CFBundleShortVersionString` | `1.0.0` | `1.0.0` | PASS |
| `CFBundleVersion` | `7` | `7` | PASS |

## 9. App Store Connect target verification

The configured production submission profile and Apple API target match:

- **App Store Connect app ID:** `6800321660`
- **Apple team ID:** `B5344GJRMT`
- **App Store Connect app name:** `caloraapp`
- **Bundle identifier:** `com.etiendem.caloraapp`
- **App Store Connect SKU:** `caloraapp-ios-001`

The runbook names the target as `Calora / caloraapp`; Apple’s API returns the
exact app record name `caloraapp` for app ID `6800321660`.

## 10. Existing-submission check

Before submission, EAS submission history was queried directly. No successful
or in-progress submission referenced Build ID
`45900e2d-298f-4ece-9041-0e42513266e4`.

The initial local command attempts stopped before EAS acceptance because the
temporary clone was first invoked from the wrong directory and then lacked
installed dependencies. Neither attempt created a Submission ID. After the
correct project directory and frozen dependencies were in place, exactly one
submission was accepted.

## 11. Exact submission command/action

The accepted submission used the exact build ID and the existing production
profile:

```text
cd /tmp/calora-step56-submit/artifacts/calora
pnpm dlx eas-cli@24.7.0 submit \
  --platform ios \
  --id 45900e2d-298f-4ece-9041-0e42513266e4 \
  --profile production \
  --non-interactive \
  --no-wait
```

`--latest` was not used. No local IPA path, guessed artifact, or alternate
build was used.

## 12. Exact EAS Submission ID

```text
cb7882d0-0728-4849-9d54-dbe566b8a478
```

## 13. Submission status

- **Status:** `FINISHED`
- **Platform:** iOS
- **App Store Connect app ID:** `6800321660`
- **Created:** `2026-09-17T11:09:14.466Z`
- **Completed:** `2026-09-17T11:13:22.438Z`
- **Error:** none

## 14. Submitted EAS Build ID

```text
45900e2d-298f-4ece-9041-0e42513266e4
```

The EAS submission record points to the authorized Build ID exactly.

## 15. Apple App Store Connect receipt

Apple returned the following build resource for the submitted artifact:

- **Apple build ID:** `3cdb2aec-5e3f-4616-a2f3-a64172a454e1`
- **Apple build version:** `7`
- **Uploaded:** `2026-09-17T04:11:18-07:00`
- **Expiration:** `2026-12-16T03:11:18-08:00`
- **Expired:** `false`
- **Processing state:** `VALID`
- **Build audience:** `APP_STORE_ELIGIBLE`

## 16. Apple build ID

```text
3cdb2aec-5e3f-4616-a2f3-a64172a454e1
```

## 17. Apple version/build identity

The Apple build resource exposes its uploaded build version as `7`. The
submitted EAS build and exact IPA independently verify:

- Marketing version: `1.0.0`
- Build number: `7`
- Bundle ID: `com.etiendem.caloraapp`

The App Store Connect build endpoint does not expose the IPA marketing version
as a build attribute. The existing App Store Version resource currently
returns version string `1.0` with state `PREPARE_FOR_SUBMISSION`; this is
separate App Store metadata and did not replace or mutate the submitted
binary. The exact binary’s `CFBundleShortVersionString` remains verified as
`1.0.0`.

## 18. Apple processing state

The exact Apple build record reports:

```text
processingState = VALID
```

Its beta detail reports:

```text
internalBuildState = IN_BETA_TESTING
externalBuildState = READY_FOR_BETA_SUBMISSION
```

This is a valid internal TestFlight state. No processing failure occurred.

## 19. TestFlight readiness state

**TESTFLIGHT DISTRIBUTION VERIFIED — OWNER DEVICE TESTING REQUIRED**

The build is internally distributed and eligible for owner testing. This does
not claim physical-device verification.

## 20. Internal group verification

The existing Apple beta group was found:

- **Group ID:** `b0c476be-693f-4b70-af2b-a9c869a7713e`
- **Name:** `Calora Internal Testers`
- **Internal group:** `true`
- **Has access to all builds:** `true`
- **Public link enabled:** not enabled
- **Tester count:** `1` (count only; no tester identity exposed)

## 21. Build 7 internal-group assignment

Build 7 was already associated with `Calora Internal Testers`. The group’s
build list contained Apple build ID
`3cdb2aec-5e3f-4616-a2f3-a64172a454e1`, with processing state `VALID`.

No duplicate assignment was made.

## 22. Confirmation build 6 not distributed

Quarantined EAS Build ID
`fffc4d8a-5e1b-48f0-98c9-e2949136cf04` remains unsubmitted and was not
assigned or distributed.

## 23. Confirmation no external testing

No external tester group was created or enabled. No public TestFlight link,
external invitation, Beta App Review submission, or external distribution was
performed.

## 24. Confirmation no public App Store submission/release

No public App Store release, App Review submission, pricing change, territory
change, metadata change, screenshot change, privacy declaration change, age
rating change, or phased release was performed.

## 25. Confirmation no new EAS build

No EAS build was created in Step 56. Only the existing authorized Build ID
`45900e2d-298f-4ece-9041-0e42513266e4` was submitted.

## 26. Confirmation no Android build

No Android build was created.

## 27. Confirmation no source mutation

No product source, `app.json`, build number, commit, or push was changed in
Step 56. The temporary standalone clone remained at the exact authorized
commit and clean tracked status. The required Step 56 report is documentation,
not product source.

## 28. Confirmation no API/database/deployment

No API deployment, Replit publish, database mutation, migration, schema
change, seed change, or production-data modification was performed.

## 29. Physical-device verification status

Not performed by this step. TestFlight distribution success is not physical-
device verification.

The release state is:

```text
TESTFLIGHT DISTRIBUTION VERIFIED — OWNER DEVICE TESTING REQUIRED
```

## 30. Complete owner device checklist

The owner should complete the following after installing Build 7:

- [ ] TestFlight shows Calora `1.0.0 (7)`
- [ ] Build 7 installs successfully
- [ ] App launches cleanly
- [ ] Existing user/session behavior works
- [ ] Fresh-install onboarding works
- [ ] Keyboard does not obscure onboarding inputs
- [ ] Onboarding agreement/consent is clear and usable
- [ ] Onboarding does not repeat incorrectly after completion
- [ ] Home Today loads correctly
- [ ] Smart Scan camera opens
- [ ] Smart Scan capture/review/approval works
- [ ] Approved Smart Scan entry appears in Food Memory
- [ ] Approved entry appears in Home Today
- [ ] Diary/outbox/sync behavior works
- [ ] App close/reopen preserves expected state
- [ ] Offline/reconnect behavior does not duplicate or lose approved entries
- [ ] Date rollover does not place entries on the wrong day
- [ ] Plan tab opens
- [ ] Weekly Programs gear opens selector
- [ ] Program selector to detail works on iOS
- [ ] Detail back/close works
- [ ] Apply program works
- [ ] Recipes opens correctly
- [ ] Plus opens correctly
- [ ] Reopening Plus does not unnecessarily reload fresh data
- [ ] Discover/Plus recipes rotate appropriately
- [ ] No duplicate stable recipe IDs appear unexpectedly
- [ ] Real nutrition zero displays as zero
- [ ] Unknown nutrition does not display as zero
- [ ] Partial/unavailable nutrition is represented truthfully
- [ ] Coach opens safely
- [ ] Coach consent/gating behaves correctly
- [ ] Health permission flow works where applicable
- [ ] Health data appears in the intended current destination
- [ ] Premium/RevenueCat entitlement behavior works
- [ ] Sign in/sign out works
- [ ] Account switching does not leak another account’s data
- [ ] Deep links/auth callbacks work
- [ ] Referral flow works where applicable
- [ ] Background/resume works
- [ ] Process termination/relaunch works
- [ ] No obvious crash, freeze, blank screen, or stale old-app experience occurs

Fitness remains intentionally excluded.

## 31. Remaining verification

Remaining work is owner physical-device verification only:

- Install the internally available Build 7 from TestFlight
- Complete the checklist above
- Record any device-specific failures
- Do not submit a different build or create a replacement build as part of
  this step

## 32. Exact recommendation after device testing

Use the existing internal TestFlight Build 7 for owner testing:

```text
EAS Build ID:       45900e2d-298f-4ece-9041-0e42513266e4
EAS Submission ID:  cb7882d0-0728-4849-9d54-dbe566b8a478
Apple Build ID:     3cdb2aec-5e3f-4616-a2f3-a64172a454e1
```

Do not create another build, submit another build, enable external testing,
or release to the public App Store. Wait for the owner’s physical-device
results.

## Mandatory submission identity table

| Identity | Authorized/Expected | Observed | Result |
|---|---|---|---|
| EAS Build ID | `45900e2d-298f-4ece-9041-0e42513266e4` | exact match | PASS |
| Canonical Git SHA | `dec8f0d6a9531cb5a2eb73c01706dc75354e743c` | exact match | PASS |
| EAS-recorded Git SHA | canonical SHA | exact match | PASS |
| IPA SHA-256 | `bc634c5e1b8dce89a757f79977eb0c64b00d7a09e47745f2c1e472f103a1ae13` | exact match | PASS |
| Bundle ID | `com.etiendem.caloraapp` | exact match | PASS |
| Marketing version | `1.0.0` | EAS/IPA exact match | PASS |
| Build number | `7` | exact match | PASS |
| EAS Submission ID | one exact submission | `cb7882d0-0728-4849-9d54-dbe566b8a478` | PASS |
| App Store Connect app ID | `6800321660` | exact match | PASS |
| Apple team ID | `B5344GJRMT` | configured exact match | PASS |
| Apple build ID | one received build | `3cdb2aec-5e3f-4616-a2f3-a64172a454e1` | PASS |
| Apple processing state | `VALID` | `VALID` | PASS |
| TestFlight state | internal eligible | `IN_BETA_TESTING` | PASS |
| Internal tester group | `Calora Internal Testers` | already associated | PASS |

## Final questions

**A. Was only exact EAS Build ID `45900e2d-298f-4ece-9041-0e42513266e4`
submitted?**  
Yes.

**B. Was `--latest` avoided?**  
Yes.

**C. Was quarantined build 6 kept unsubmitted?**  
Yes.

**D. What exact EAS Submission ID was used?**  
`cb7882d0-0728-4849-9d54-dbe566b8a478`.

**E. Did EAS submission finish successfully?**  
Yes, status `FINISHED`.

**F. Did Apple receive version 1.0.0 build 7?**  
Apple received the exact build-7 binary and marked it valid for internal
testing. The IPA independently verifies marketing version `1.0.0`; Apple’s
build resource exposes the uploaded build version as `7`.

**G. What Apple build ID was assigned?**  
`3cdb2aec-5e3f-4616-a2f3-a64172a454e1`.

**H. Did Apple processing complete successfully?**  
Yes: `processingState=VALID`.

**I. Is build 7 READY TO TEST or equivalent?**  
Yes. Apple reports `internalBuildState=IN_BETA_TESTING` and
`buildAudienceType=APP_STORE_ELIGIBLE`.

**J. Is build 7 assigned to Calora Internal Testers?**  
Yes. The group’s build list already contains the Apple build ID.

**K. Was external testing avoided?**  
Yes.

**L. Was public App Store submission/release avoided?**  
Yes.

**M. Was any new EAS build created?**  
No.

**N. Was Android untouched?**  
Yes.

**O. Was canonical source left unchanged?**  
Yes.

**P. Were API/database/deployment operations avoided?**  
Yes.

**Q. Is build 7 now ready for owner physical-device testing?**  
Yes.

## Final verdict

**TESTFLIGHT BUILD 7 VERIFIED — OWNER DEVICE TESTING REQUIRED**

Stop after Step 56. Do not create another build, submit another build, start
Android release, enable external testing, release to the public App Store, or
deploy. Wait for owner physical-device testing.