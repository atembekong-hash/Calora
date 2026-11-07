# Area 03 — iOS certification readiness

**Audit mission:** Calora Autonomous Production Certification Mission  
**Domain:** iOS certification readiness  
**Audit date:** 2026-11-07  
**Repository:** `/home/ubuntu/calora-coach-live-main`  
**Protected-main baseline:** `9e7790cffb0cbf8062d1fa198be6e71b76ff5161`  
**Observed HEAD:** `9e7790cffb0cbf8062d1fa198be6e71b76ff5161` (merge commit `Merge pull request #392: complete Android QA lab v2 workflow`)  
**Working tree:** clean (`git status --short` produced no entries)

## Scope and verdict

This is a bounded, read-only source audit. It evaluates iOS configuration, bundle/signing requirements, entitlements, HealthKit, camera/microphone, notifications, StoreKit/RevenueCat, lifecycle, accessibility, and distribution readiness. Source evidence is separated from evidence that requires Apple signing services, a macOS native build, a real iOS device/simulator, or App Store Connect.

**Overall domain verdict: NOT READY FOR A FULL US COMMERCIAL LAUNCH based on current evidence.** The source configuration is substantially prepared, but Apple-side signing/distribution, current App Store Connect processing/release state, and all real-device permission/accessibility/purchase checks are unavailable. In addition, the current iOS signing evidence test contract is failing (31 passed, 6 failed) because the implementation emits an additional sanitized diagnostics line that the fixture expectations do not include.

## Status summary

| Status | Count | Meaning in this audit |
|---|---:|---|
| PASS | 7 | Source-level requirement is evidenced on protected main; this does not imply native/store/device certification. |
| FAIL | 1 | Current repository test contract is red, so the assessed requirement is not passing. |
| BLOCKED | 2 | Required external Apple/EAS evidence cannot be obtained in this read-only sandbox without credentials or service/device access. |
| NOT RUN | 2 | The check requires a native iOS runtime/device/simulator or store transaction and was not executed. |
| NOT APPLICABLE | 0 | No assessed item was excluded as N/A. |

## Requirements assessed

### 1. Bundle identity and static iOS configuration — PASS (source-level)

`artifacts/calora/app.json:16-27` declares `supportsTablet: false`, bundle identifier `com.etiendem.caloraapp`, version `1.0.1`, build number `17`, `ITSAppUsesNonExemptEncryption: false`, motion/HealthKit usage text, and associated domain `applinks:mycaloraapp.com`. The Expo owner/project identity is present at `app.json:117-121`.

This is a source PASS only. No generated Xcode project or compiled binary exists in the checkout (`artifacts/calora/ios` is absent), so the final embedded bundle identity was not independently inspected in this audit.

### 2. Deterministic version/build-number strategy — PASS (source-level)

`artifacts/calora/eas.json:3-6,45-62` requires EAS CLI >=16.17.4, `appVersionSource: local`, `requireCommit: true`, production `autoIncrement: false`, remote credentials, and iOS store distribution. `artifacts/calora/scripts/ios-build-number-preflight.js:26-69,259-305` rejects missing/malformed configuration, compares both EAS and App Store Connect consumed floors, rejects active concurrent iOS builds, and requires the configured build number to equal floor + 1. The current source value is build `17`.

The seven build-number unit tests pass when run with `node --test scripts/ios-build-number-preflight.test.js` as part of the bounded native-preflight run. The live EAS/ASC floor check was not run because it requires EAS and App Store Connect credentials; therefore this PASS does not prove that build 17 is currently unused.

### 3. Entitlements, universal links, and generated native plist — PASS (source/config contract; generated-artifact evidence unavailable)

Static associated-domain configuration is present at `app.json:25-27`, and the Expo HealthKit plugin is configured at `app.json:104-110`. The historical prebuild report documents that a generated project previously contained `com.apple.developer.associated-domains`, the bundle identifier, URL scheme, camera/microphone text, HealthKit share text, and `ITSAppUsesNonExemptEncryption`; however, that report applies to older commits and is not current-main proof. No committed `ios/` directory or generated `.entitlements`/`Info.plist` exists now.

The source contract is acceptable, but a current clean prebuild was deliberately not executed because the audit is read-only and must not create native artifacts.

### 4. HealthKit declaration and source behavior — PASS (source-level)

`app.json:22-23,104-110` declares HealthKit share/update usage strings and configures `@kingstinct/react-native-healthkit` with `background: false`. `artifacts/calora/lib/health/healthService.ios.ts:7-12,133-180` requests read access for steps, active energy, body mass, and workouts; handles unavailable/request-needed/error states; queries daily/hourly/trend data; and maps workouts and latest weight. The implementation explicitly rejects malformed/invalid HealthKit quantities and preserves gaps in daily metrics.

Relevant source tests include `lib/__tests__/healthConnection.test.ts`, `healthDayAndBurnedStatus.test.ts`, `healthWeekHistory.test.ts`, and `liveStepTrackingLifecycle.integration.test.tsx`. No iPhone/Apple Watch permission grant, HealthKit data fixture, or on-device sync was run; that evidence remains outside this source PASS.

### 5. Camera and microphone permission/configuration — PASS (source-level)

`app.json:95-100` configures `expo-camera` with explicit camera and microphone usage strings. `artifacts/calora/app/(tabs)/scan.tsx:3-4,436-490,854-863` uses `CameraView`, camera/microphone permission hooks, `expo-av` recording, and barcode scanning. The UI provides permission-denied alternatives (typed meal, voice, receipt/library) and accessibility labels at `scan.tsx:829-846,876-899`.

The implementation includes capture interruption handling on `AppState` changes (`scan.tsx:304-323`) and source-level capture tests (`lib/__tests__/captureFlow.test.ts`, `scanScreen.test.ts`, `captureReview.test.ts`). No iOS camera/microphone prompt, denial/retry, background interruption, barcode, photo, or voice recording was executed on hardware. Those runtime checks are NOT RUN below.

### 6. Notifications and account/lifecycle isolation — PASS (source-level)

`artifacts/calora/lib/notificationLifecycle.ts:13-99` serializes native operations process-wide, cancels Calora-tagged schedules before installing a desired plan, suppresses scheduling on web, and dismisses stale presented notifications across account-scope transitions. `artifacts/calora/app/_layout.tsx:72-81,101-188` configures foreground presentation, captures received/launch/presented notifications, filters by scope token, navigates by category, clears retained launch responses, and rehydrates listeners only after scope reconciliation.

Relevant tests include `lib/__tests__/notificationPreferences.test.ts`, `notificationReconciliation.test.ts`, and `notificationInbox.test.ts`. iOS authorization prompt, scheduled delivery, lock-screen presentation, tap routing, and account-switch behavior were not executed on a real iOS runtime.

### 7. StoreKit/RevenueCat source integration — PASS (source-level; live store not proven)

`artifacts/calora/eas.json:50-55` supplies production API URLs and platform-specific RevenueCat public keys. `artifacts/calora/lib/revenuecat.tsx:27-62` selects test/store-client versus iOS/Android keys and configures RevenueCat once. `revenuecat.tsx:64-186` synchronizes identity, gates customer-info reads and purchases on identity readiness, refreshes on app activation, listens for customer-info updates, and exposes purchase/restore operations. The root layout initializes RevenueCat at `app/_layout.tsx:64-70`.

Relevant tests are `lib/__tests__/revenuecatBilling.test.ts`, `revenuecatIdentity.test.ts`, and `revenuecatProvider.test.tsx`. No Apple StoreKit product fetch, sandbox purchase, restore, receipt state, introductory offer, subscription renewal, or RevenueCat production entitlement was executed. Those store-side checks remain BLOCKED/NOT RUN as specified below.

### 8. App lifecycle/background behavior — PASS (source-level)

The scan flow aborts active work on genuine background transitions while preserving an owned system-picker handoff (`scan.tsx:314-323`). RevenueCat refreshes customer info when the app returns active (`lib/revenuecat.tsx:128-135`). Notification handling reconciles presented notifications on active transitions (`app/_layout.tsx:175-188`). HealthKit is explicitly configured with background disabled (`app.json:105-108`), consistent with the stated live-steps-while-dashboard-open behavior rather than background delivery.

The source includes lifecycle coverage in `lib/__tests__/liveStepTrackingLifecycle.integration.test.tsx` and `captureFlow.test.ts`. iOS suspend/resume, interrupted native camera picker, notification delivery while locked/backgrounded, and memory-pressure behavior were not exercised on an iOS device.

### 9. Accessibility implementation — PASS (source-level)

The source contains extensive explicit accessibility labels/roles/states/live regions. Examples include scan permission and capture controls (`app/(tabs)/scan.tsx:829-846,876-899`), notification/accessibility bootstrap surfaces (`app/_layout.tsx:213-245,250-275`), and summary/tab/button semantics across Today, Insights, Planner, and Profile. The repository contains focused UI/source tests, including `scanScreen.test.ts`, `profileScreen.test.tsx`, `progressScreen.test.ts`, `progressNavigation.test.ts`, and `visualIntegrity.test.ts`.

This is not a VoiceOver certification. No connected iOS device/simulator was available for VoiceOver traversal, Dynamic Type, Reduce Motion, Switch Control, contrast, focus order, or rotor verification.

### 10. iOS signing credentials and Apple certificate rehearsal — BLOCKED

The source has a serious preflight design: `artifacts/calora/scripts/ios-signing-preflight.js:251-327` checks for an assigned distribution certificate, validity window, provisioning profile expiration, and ACTIVE status; `:329-347` classifies Apple rejection separately; `ios-signing-evidence.js:37-48,133-192` archives sanitized evidence and fails a successful preflight if required evidence cannot be stored. The unit tests cover missing/expired/inactive credentials and redaction.

Current Apple/EAS credential state was not available in this sandbox. The Apple rehearsal is explicitly macOS-only in the implementation, and no authenticated EAS token or Apple signing record was used. Therefore certificate/provisioning readiness is BLOCKED, not PASS. Historical reports cannot substitute for current credential evidence.

### 11. Current iOS signing evidence test contract — FAIL

The bounded command:

```text
cd /home/ubuntu/calora-coach-live-main/artifacts/calora
node --test scripts/ios-signing-preflight.test.js scripts/ios-signing-evidence.test.js scripts/ios-build-number-preflight.test.js
```

produced **37 tests: 31 passed, 6 failed**. All six failures are in the child-process fixture contract in `scripts/ios-signing-evidence.test.js:360-399`. The actual preflight now emits an additional sanitized line:

```text
[ios-signing] Monitor input diagnostics: EAS token present; warning window valid.
```

The fixture expected summary lines omit that line. One Apple-certificate-rejection fixture also exited with `1` instead of the fixture's expected `17`, because the current build-number safety gate intercepted the synthetic path. This is a repository test/fixture mismatch and must be repaired or consciously re-baselined before claiming the iOS signing evidence gate is green.

The 7 iOS build-number tests and 15 non-fixture signing-preflight/evidence tests passed in the same run; those passes do not erase the six failures.

### 12. Distribution/TestFlight/App Store readiness — BLOCKED

`eas.json:72-78` declares ASC app ID `6800321660`, Apple team ID `B5344GJRMT`, and the same bundle identifier. The current source is configured for a production iOS store build (`eas.json:45-62`). However, this audit found no current IPA/build artifact, no App Store Connect authenticated session, no current processing/tester-availability evidence, and no current signed-build attestation for protected-main `9e7790c…`.

The historical report `230_CALORA_FINAL_ANDROID_IOS_TESTFLIGHT_AND_PRODUCTION_CERTIFICATION_REPORT.md:22-25,94-109,139-147` states that an older commit (`9ea8b6c…`) reached TestFlight, while Apple processing/tester visibility and physical iOS testing were BLOCKED. It explicitly does not establish current-main readiness. The report therefore supports the blocker boundary, not a current PASS.

## Evidence limitations and exact blockers

1. **No current native iOS project or compiled artifact:** `artifacts/calora/ios` is absent; no IPA, `.app`, provisioning profile, certificate, or signing archive is present.
2. **No Apple/EAS credential proof:** live signing and build-number preflights require EAS/ASC credentials and service access. No credential material was requested, exposed, or mutated.
3. **No macOS Apple certificate rehearsal:** this sandbox is Linux; the code correctly classifies the Apple rehearsal as host-platform dependent.
4. **No iOS hardware/simulator:** permission prompts, HealthKit authorization/data, camera/microphone capture, notification delivery, lifecycle interruption, VoiceOver, Dynamic Type, and StoreKit sandbox transactions were not run.
5. **No authenticated App Store Connect state:** current processing, export compliance, tester visibility, and commercial availability are unverified.
6. **Six current test failures:** `ios-signing-evidence.test.js` fixture expectations are stale relative to current sanitized diagnostics and one synthetic fixture’s changed gate path.
7. **Historical evidence is non-authoritative for this audit:** the strongest historical iOS report is tied to older commits and explicitly labels Apple-console and physical-device checks blocked.

## Recommended release gate actions (not performed)

Before a full US commercial launch, run the iOS signing/build-number preflights with authenticated EAS and ASC service credentials, repair and rerun all six failing signing-evidence fixtures, produce a signed build from protected-main `9e7790c…`, verify embedded bundle/entitlements/plist in that exact artifact, confirm App Store Connect processing/export compliance/tester availability, and execute a connected iOS test matrix covering HealthKit, camera/microphone denial and recovery, notifications, StoreKit/RevenueCat sandbox purchase/restore, lifecycle interruptions, VoiceOver, and Dynamic Type. Until those artifacts exist, retain the BLOCKED/NOT RUN classifications above.

## Commands and paths

- `git -C /home/ubuntu/calora-coach-live-main rev-parse HEAD`
- `git -C /home/ubuntu/calora-coach-live-main status --short`
- `node --test scripts/ios-signing-preflight.test.js scripts/ios-signing-evidence.test.js scripts/ios-build-number-preflight.test.js` (run from `artifacts/calora`; 31 pass / 6 fail)
- `artifacts/calora/app.json`
- `artifacts/calora/eas.json`
- `artifacts/calora/lib/health/healthService.ios.ts`
- `artifacts/calora/lib/notificationLifecycle.ts`
- `artifacts/calora/lib/revenuecat.tsx`
- `artifacts/calora/app/_layout.tsx`
- `artifacts/calora/app/(tabs)/scan.tsx`
- `artifacts/calora/scripts/ios-signing-preflight.js`
- `artifacts/calora/scripts/ios-signing-evidence.js`
- `artifacts/calora/scripts/ios-build-number-preflight.js`
- `230_CALORA_FINAL_ANDROID_IOS_TESTFLIGHT_AND_PRODUCTION_CERTIFICATION_REPORT.md`
- `26_CALORA_IOS_PREBUILD_FAILURE_ROOT_CAUSE_AND_REMEDIATION_REPORT.md`
