# Calora Step 48 — iOS Build 5 TestFlight Submission Report

**Execution date:** 2026-09-16
**Scope:** One deterministic TestFlight submission of the existing EAS iOS build 5
**Release scope:** Internal TestFlight only; no App Store production release

## 1. Executive summary

Step 48 submitted exactly the authorized existing EAS build
`088c4dc8-0ed9-4293-b7b7-4925045cbbbe`. No build was started, rebuilt, retried,
or replaced.

EAS completed the submission successfully. App Store Connect accepted the IPA,
reported it as `VALID`, and assigned build 5 to the existing internal-only
`Calora Internal Testers` group. No external group, public link, App Store
release, API deployment, database mutation, or source change occurred.

The build is ready for owner physical-device testing.

## 2. Canonical GitHub SHA/tree

- Canonical `origin/main` SHA:
  `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Canonical `origin/main` tree:
  `1a598be866150d488bc21ccd598de3104c638b02`
- Post-submission read-only verification: passed

## 3. Authorized EAS build ID

- Authorized EAS build ID:
  `088c4dc8-0ed9-4293-b7b7-4925045cbbbe`
- No other EAS build was selected or submitted.

## 4. EAS build identity verification

The exact EAS build was re-queried before submission and matched:

- Status: `FINISHED`
- Platform: `IOS`
- Profile: `production`
- Distribution: `STORE`
- Git SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Marketing version: `1.0.0`
- Build number: `5`
- Bundle identifier: `com.etiendem.caloraapp`
- Expo project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`

## 5. IPA identity verification

The artifact belonging to the authorized EAS build was inspected read-only:

- Archive retrieval: HTTP `200`
- ZIP integrity: passed
- `CFBundleIdentifier`: `com.etiendem.caloraapp`
- `CFBundleShortVersionString`: `1.0.0`
- `CFBundleVersion`: `5`

The IPA was not modified, re-signed, or repackaged.

## 6. App Store Connect pre-submission state

Before submission, the authenticated App Store Connect build history for app
`6800321660` reported:

- Build 5 present: `no`
- Existing build count: `1`
- Existing build: `2`
- Existing build processing state: `VALID`

The duplicate-submission check passed.

## 7. Credential availability

Required credential metadata was present without printing credential contents:

- `EXPO_ASC_KEY_ID`: present
- `EXPO_ASC_ISSUER_ID`: present
- `EXPO_ASC_API_KEY_P8`: present
- `APPLE_APP_STORE_ID`: present
- `APPLE_TEAM_ID`: present
- Expo authentication: present

No private key, API key contents, token, authorization header, or credential
material was written to the report.

## 8. Deterministic submission mechanism

EAS CLI 24.6.0 confirmed explicit build-ID support. The exact command used was:

```text
eas submit \
  --platform ios \
  --id 088c4dc8-0ed9-4293-b7b7-4925045cbbbe \
  --profile production \
  --non-interactive \
  --wait
```

`--latest` was not used. No group-creation or external-testing setup flag was
used.

## 9. Final pre-submission freeze

Immediately before submission:

- HEAD:
  `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- TREE:
  `1a598be866150d488bc21ccd598de3104c638b02`
- `origin/main` SHA:
  `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- `origin/main` tree:
  `1a598be866150d488bc21ccd598de3104c638b02`
- Working tree: clean
- Exact EAS build: `FINISHED`
- IPA identity: passed
- App Store Connect build 5 pre-existing: `no`
- Internal group: `Calora Internal Testers`

## 10. EAS submission ID

- EAS submission ID:
  `986552f4-309f-40b1-90c9-5b10cf807437`

## 11. Submission provenance

The submission record was tied to:

- EAS build ID:
  `088c4dc8-0ed9-4293-b7b7-4925045cbbbe`
- Expo project ID:
  `1f202325-5b9a-4260-978f-abbd3252b9ee`
- App Store Connect App ID: `6800321660`
- Bundle identifier: `com.etiendem.caloraapp`
- Marketing version: `1.0.0`
- Build number: `5`

## 12. Submission status

- EAS submission status: `FINISHED`
- EAS error: none
- Apple upload confirmation: successful
- Automatic retry: none

## 13. Submission timestamps

- Submission created: `2026-09-16T21:33:09.803Z`
- Submission completed: `2026-09-16T21:35:55.031Z`
- EAS build 5 completion: `2026-09-16T21:18:01.423Z`

## 14. Apple receipt verification

After EAS submission completed, authenticated App Store Connect history reported
the submitted build:

- App ID: `6800321660`
- Apple build ID:
  `13b0ef6e-bbbc-4fcd-b68a-7fa55c2a0b8a`
- Apple build number: `5`
- Processing state: `VALID`
- Uploaded date: `2026-09-16T14:34:23-07:00`
- Expiration date: `2026-12-15T13:34:23-08:00`

## 15. Apple build ID

`13b0ef6e-bbbc-4fcd-b68a-7fa55c2a0b8a`

## 16. Apple processing state

The Apple processing state is `VALID`. App Store Connect has accepted the
binary for TestFlight use.

## 17. Exact TestFlight classification

**READY TO TEST**

Build 5 is valid and assigned to the existing internal testing group.

## 18. Internal testing group state

The existing group was inspected read-only:

- Group name: `Calora Internal Testers`
- Group ID:
  `b0c476be-693f-4b70-af2b-a9c869a7713e`
- Internal group: `true`
- Build count: `2`
- Build 5 assigned to group: `true`
- Public link enabled: not enabled
- No external group was created

Assignment was verified through the supported App Store Connect group-build
listing. No group mutation was performed.

## 19. Weekly Programs source provenance

The submitted build source is the canonical Step 46 remediation commit and
contains the Weekly Programs deterministic modal state machine.

Owner test path after installing from TestFlight:

```text
Calora → Plan → gear → Weekly Programs → tap program
```

Expected behavior:

- program detail opens immediately;
- back/close returns normally;
- no stuck overlay remains;
- another program can be opened;
- Apply applies the program and closes the modal.

No physical-device success is claimed in this report.

## 20. GitHub post-submission verification

After submission, read-only Git verification passed:

- `origin/main` remained
  `7cce885c6b3d046a5a8fdb40d92343a87b73c290`;
- `origin/main` tree remained
  `1a598be866150d488bc21ccd598de3104c638b02`;
- isolated release checkout HEAD and tree remained exact;
- isolated release checkout remained clean;
- no commit, push, reset, rebase, force push, or history rewrite occurred.

## 21. Confirmation no new build occurred

Step 48 started:

- no EAS build;
- no iOS rebuild;
- no Android build;
- no automatic retry.

Only the existing EAS build ID authorized in Step 48 was submitted.

## 22. Android/API/database boundaries

- Android build: none
- Android submission: none
- API deployment: none
- Replit production publish: none
- Database mutation: none
- Schema change: none
- Migration: none
- Seed: none
- Production user-data mutation: none

## 23. Confirmation no App Store production release occurred

- App Store production submission: none
- App Review submission: none
- Production rollout: none
- External TestFlight testing: none
- Public TestFlight link: none

The submission is internal TestFlight only.

## 24. Owner physical-device test plan

After the owner installs or updates from TestFlight:

1. Confirm TestFlight shows version `1.0.0`, build `5`.
2. Open `Plan → gear → Weekly Programs`.
3. Tap one Weekly Program and confirm detail opens immediately.
4. Back or close and confirm normal return with no stuck overlay.
5. Tap another program and confirm detail opens immediately.
6. Tap Apply and confirm the program applies and the modal closes.
7. Repeat selector → detail → back → another program at least twice.
8. Smoke test Home, Recipes, Smart Scan, Coach, Diary/Profile, and
   auth/session persistence.

These physical-device results must be supplied by the owner; they were not
fabricated or inferred from server-side processing.

## 25. Remaining uncertainties

- Physical-device installation and behavior remain owner testing steps.
- The Linux execution environment could not perform the macOS Apple certificate
  rehearsal or a physical-device callback test.
- App Store Connect processing is currently valid, but device installation and
  runtime behavior still require owner verification.
- No App Store production release or external testing configuration has been
  performed.

## 26. Exact recommendation for Step 49

Install the internal TestFlight build shown as version `1.0.0`, build `5`, and
perform the Weekly Programs selector/detail/back/apply test plan plus the listed
smoke tests. Record actual device results, including any authentication or
navigation issue. Do not infer physical-device behavior from this server-side
submission evidence.

## Final verdict

TESTFLIGHT BUILD 5 VERIFIED — OWNER DEVICE TESTING REQUIRED