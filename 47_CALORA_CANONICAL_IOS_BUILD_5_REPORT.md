# Calora Step 47 — Canonical iOS Build 5 Report

**Execution date:** 2026-09-16
**Scope:** One owner-authorized canonical iOS production EAS build only
**Submission scope:** No TestFlight, App Store, or other submission was authorized or performed

## 1. Executive summary

Step 47 executed exactly one iOS production EAS build from the canonical
Step 46 remediation commit. All release gates passed before queueing. The build
finished successfully as iOS build `5`, with marketing version `1.0.0`,
production/store distribution, and the exact canonical Git SHA.

The IPA was downloaded to temporary storage, passed archive integrity checks,
and contained the expected bundle identifier, marketing version, and build
number.

The build was not submitted to TestFlight. It remains available for a separate,
explicit Step 48 owner authorization.

## 2. Canonical SHA/tree

- Canonical `origin/main` SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Canonical `origin/main` tree: `1a598be866150d488bc21ccd598de3104c638b02`
- Post-build remote verification: passed

## 3. Isolated release checkout

- Path: `/home/runner/step47-release`
- Checkout mode: detached exact-SHA worktree
- HEAD: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- HEAD tree: `1a598be866150d488bc21ccd598de3104c638b02`
- Tracked working tree: clean before and after the build
- Documentation-divergent ordinary local `main`: not used or rewritten

## 4. Exact release-gate verification

- Workflow: `Release validation`
- Run ID: `35148539746`
- Head SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Run status: `completed`
- Run conclusion: `success`
- Required check: `Run release validation suite`
- Check-run ID: `104970661620`
- Check status: `completed`
- Check conclusion: `success`

## 5. Expo/Apple identity

- Expo owner: `vvault07`
- Expo project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`
- App Store Connect App ID: `6800321660`
- Apple Team: `B5344GJRMT`
- Bundle identifier: `com.etiendem.caloraapp`
- Marketing version: `1.0.0`

## 6. Version configuration

Resolved canonical configuration:

- `appVersionSource`: `local`
- source `expo.ios.buildNumber`: `5`
- production `autoIncrement`: `false`
- production distribution: `store`
- production credentials source: `remote`
- Android version code: `24` (not built)

No configuration was modified during Step 47.

## 7. Live pre-build Apple floor

The authenticated App Store Connect build-history query reported:

- Apple consumed floor: `2`
- Existing Apple build count: `1`
- Existing Apple build: `2`
- Existing Apple processing state: `VALID`
- Existing Apple build ID: `7d4e1c8c-7690-47f3-bd2e-c462b0d7c327`

## 8. Live pre-build EAS floor

The authenticated paginated EAS iOS history query reported:

- EAS consumed floor: `4`
- No active iOS EAS build before queueing
- No canonical build for SHA `7cce885c6b3d046a5a8fdb40d92343a87b73c290`

## 9. Authoritative floor

- Apple floor: `2`
- EAS floor: `4`
- Authoritative consumed floor: `4`

## 10. Selected/predicted number

- Configured source number: `5`
- Selected next number: `5`
- Predicted production number: `5`
- Safety relation: `5 == 4 + 1`

The live gate passed immediately before queueing.

## 11. Active-build check

The final pre-queue EAS history query found:

- Active iOS EAS builds: `0`
- Conflicting queued or in-progress iOS build: none

## 12. Duplicate canonical-build check

The pre-queue paginated EAS history query found:

- Equivalent canonical builds for SHA `7cce885c6b3d046a5a8fdb40d92343a87b73c290`: `0`
- A new build request was therefore authorized and issued once

## 13. Production API compatibility

Read-only production probes passed:

- `/api/healthz`: HTTP `200`, `{"status":"ok"}`
- `/api/version`: HTTP `200`, schema `calora.release-attestation.v1`
- Public recipes probe with `limit=1&offset=0`: HTTP `200`
  - `nextOffset`: `1`
  - `terminalReason`: `null`
  - `source`: `TheMealDB`
- Premium recipes without authentication: HTTP `401`, sign-in required
- Diary without authentication: HTTP `401`, sign-in required
- Referral without authentication: HTTP `401`, sign-in required
- Capture analyze with an empty body: HTTP `400`, validation required
- Sync without authentication: HTTP `401`, sign-in required
- Capture approval with an invalid session: HTTP `400`, invalid session

The current production API reported a different API release SHA than the mobile
source, but the health, version, authentication boundaries, capture approval,
recipe pagination, and contract probes passed. No API deployment was performed.

## 14. Full prebuild validation

Passed from the exact isolated canonical source:

- `pnpm install --frozen-lockfile`
- `pnpm run typecheck`
- `pnpm --filter @workspace/scripts test`: 47 passed, 0 failed
- `pnpm --filter @workspace/calora test`: 82 files, 1,163 tests passed;
  server security suite: 6 passed
- API server build from the canonical source: passed
- `pnpm --filter @workspace/api-server test`: 36 files passed, 429 tests
  passed, 4 skipped
- Expo resolved configuration validation: passed
- EAS production configuration validation: passed
- `git diff --check`: passed

Native/auth unit coverage passed within the Calora test suite. The separate
device-level native-auth preflight was not runnable before this first build
because no installable native binary or explicitly selected simulator/device
target was available. It was not used to authorize a second build or any
source change.

## 15. Signing-preflight result

Read-only signing preflight passed:

- App Store distribution certificate: ready
- Provisioning profile: ready
- Certificate expiration: `2027-07-21`
- Provisioning profile expiration: `2027-07-21`
- Apple native macOS rehearsal: unavailable in this Linux environment
- No build was started by the standalone signing preflight

## 16. Build-number-preflight result

The production wrapper ran the live number gate immediately before EAS:

```text
BUILD NUMBER PREFLIGHT PASSED
Marketing version: 1.0.0
Version-control source: local
autoIncrement: false
EAS consumed floor: 4
Apple consumed floor: 2
Authoritative consumed floor: 4
Selected next build number: 5
Predicted production iOS build number: 5
```

## 17. Final prebuild source freeze

Immediately before queueing:

- HEAD: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- TREE: `1a598be866150d488bc21ccd598de3104c638b02`
- `origin/main` SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- `origin/main` tree: `1a598be866150d488bc21ccd598de3104c638b02`
- Working tree: clean
- Live build-number gate: passed
- Duplicate canonical-build check: zero matches

## 18. Exact build command

The authorized production wrapper was run from `artifacts/calora`:

```text
pnpm run build:ios:production
```

The wrapper executed:

```text
node scripts/ios-signing-preflight.js --queue-build
```

The authenticated EAS CLI accepted exactly one `ios` / `production` /
`STORE` build request. No automatic retry was used.

## 19. EAS build ID

- EAS build ID: `088c4dc8-0ed9-4293-b7b7-4925045cbbbe`
- Created: `2026-09-16T21:10:26.643Z`
- Completed: `2026-09-16T21:18:01.423Z`

## 20. Queued build number

The queued EAS record reported build number **`5`**.

## 21. Build source SHA

The queued and finished EAS record reported:

`7cce885c6b3d046a5a8fdb40d92343a87b73c290`

## 22. Build provenance

Verified EAS provenance:

- Git SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Marketing version: `1.0.0`
- Build number: `5`
- Bundle identifier: `com.etiendem.caloraapp`
- Expo project ID: `1f202325-5b9a-4260-978f-abbd3252b9ee`
- Profile: `production`
- Distribution: `STORE`

## 23. Build terminal status

- Terminal status: `FINISHED`
- Failure or cancellation: none
- Retry count: `0`

## 24. Version/build number

The finished EAS record and embedded IPA metadata both reported:

- Marketing version: `1.0.0`
- iOS build number: `5`

## 25. Artifact metadata

The finished EAS record reported all expected artifact references:

- IPA/application archive: available
- Xcode build logs: available
- EAS build record: available

The IPA was downloaded to temporary storage and verified:

- HTTP retrieval: `200`
- Archive size: `45,721,110` bytes
- ZIP integrity: passed
- `CFBundleIdentifier`: `com.etiendem.caloraapp`
- `CFBundleShortVersionString`: `1.0.0`
- `CFBundleVersion`: `5`

Signed artifact URLs are intentionally not copied into this report.

## 26. Apple post-build state

The authenticated read-only App Store Connect query after build completion
reported:

- Apple build count: `1`
- Highest Apple build number: `2`
- Existing build processing state: `VALID`
- Build `5` present in App Store Connect: `no`

This confirms that EAS build completion did not become a TestFlight upload.

## 27. Explicit confirmation of NO TestFlight submission

Step 47 performed:

- exactly one iOS production EAS build;
- no `eas submit`;
- no TestFlight upload;
- no App Store submission.

The successful IPA is waiting for separate owner authorization.

## 28. GitHub post-build source verification

Post-build read-only verification passed:

- `origin/main` SHA remained `7cce885c6b3d046a5a8fdb40d92343a87b73c290`;
- `origin/main` tree remained `1a598be866150d488bc21ccd598de3104c638b02`;
- isolated checkout HEAD and tree remained exact;
- isolated checkout working tree remained clean;
- no source commit, push, rebase, reset, force push, or history rewrite occurred.

## 29. Android/API/database boundaries

- Android build: none
- Android submission: none
- API deployment: none
- Replit production publish: none
- Database mutation: none
- Schema change: none
- Migration: none
- Seed: none
- Production user-data mutation: none

## 30. Preserved Calora features

The canonical build source preserves:

- durable capture acceptance;
- Weekly Programs deterministic modal state machine;
- shared Planner Program pools and eligibility;
- bounded Coach lifecycle;
- Coach Fact Context restriction;
- diary `imageAssetKey` synchronization;
- capture compatibility and security;
- recipe `nextOffset` and `terminalReason`;
- Premium entitlement;
- PKCE and authentication;
- account isolation;
- deletion fences;
- sync ownership;
- generated API contracts;
- release attestation;
- Expo Router;
- Apple Health privacy configuration;
- production/TestFlight configuration.

## 31. Remaining uncertainties

- TestFlight installation, processing, and review behavior were not tested
  because submission was explicitly prohibited.
- The macOS Apple certificate rehearsal was unavailable in the Linux execution
  environment.
- Device-level native-auth callback behavior remains untested because no
  installable native binary or selected simulator/device target was available
  before this build.
- The current production API release identity differs from the canonical mobile
  SHA; read-only compatibility probes passed, but this report does not claim
  that the API was deployed from the mobile commit.

## 32. Exact recommendation for Step 48

Authorize TestFlight submission separately only after reviewing the finished
EAS build and IPA metadata. Use the exact build ID
`088c4dc8-0ed9-4293-b7b7-4925045cbbbe`. Do not rebuild, retry, or submit any
other build without a new explicit owner authorization.

## Final verdict

IOS BUILD 5 VERIFIED — READY FOR OWNER TESTFLIGHT SUBMISSION AUTHORIZATION