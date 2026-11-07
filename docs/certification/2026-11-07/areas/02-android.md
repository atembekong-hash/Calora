# Android certification readiness audit

**Mission:** Calora Autonomous Production Certification Mission  
**Domain:** Android certification readiness  
**Repository:** `/home/ubuntu/calora-coach-live-main`  
**Protected-main baseline inspected:** `9e7790cffb0cbf8062d1fa198be6e71b76ff5161` (`main`, 2026-11-07)  
**Audit mode:** read-only; no build, install, deployment, database, credential, infrastructure, or physical-device operation performed.

## Executive result

Android is **not ready for a full US commercial launch certification** from the evidence available in this sandbox. The source/configuration and QA harness are substantially prepared, and the owner-supplied Samsung Galaxy S20 Level-1 collection/smoke evidence is useful within its narrow scope. It does not establish feature certification for the current candidate. The protected-main QA matrix explicitly leaves feature, camera, Health Connect, lifecycle/recovery, visual, and release-candidate certification pending. Historical final-APK evidence also records an intermittent Auto camera startup stall, unverified Barcode/provider coverage, no TalkBack traversal, and no Health Connect session. Those historical results are not silently promoted to PASS for current main.

**Requirement counts assessed:** PASS 4, FAIL 2, BLOCKED 3, NOT RUN 3. (12 bounded requirements; NOT APPLICABLE: 0.)

## Status matrix

| ID | Requirement assessed | Status | Current evidence and boundary |
|---|---|---|---|
| AND-01 | Android package identity, versioning, min SDK, Expo authority, and EAS profile are internally coherent | **PASS** | `artifacts/calora/app.json` defines package `com.etiendem.caloraapp`, version `1.0.1`, `versionCode: 28`, portrait orientation, `newArchEnabled: true`, and `minSdkVersion: 26` through `expo-build-properties`. `artifacts/calora/eas.json` requires a commit, pins Node/pnpm and Android build image, and provides APK/AAB profiles. `artifacts/calora/scripts/expo-config-authority.test.cjs` asserts one authoritative Expo root and package identity. This is source/config evidence, not a built-binary proof. |
| AND-02 | Android permissions and Health Connect privacy-rationale configuration are correctly declared | **PASS** | `app.json` declares `ACTIVITY_RECOGNITION`, `HIGH_SAMPLING_RATE_SENSORS`, and Health Connect read permissions for steps, active calories, exercise, and weight; camera/microphone rationale is configured through `expo-camera`. `plugins/withHealthConnectPrivacyPolicy.cjs` creates a fixed exported rationale activity and protected permission-usage alias that opens only `https://mycaloraapp.com/privacy`. `scripts/health-connect-privacy-policy.test.cjs` prebuild-introspects a disposable copy and asserts the generated manifest, activity, alias, permissions, fixed URL, and idempotence. No native build was run in this audit. |
| AND-03 | Native modules and Android health/camera implementation have source-level contracts | **PASS** | Current code uses `react-native-health-connect`, `expo-sensors`/foreground step tracking, and `expo-camera` `CameraView`. `lib/health/healthService.android.ts` validates Health Connect aggregate/step evidence, distinguishes missing data from measured zero, supports settings recovery, and rejects invalid bridge data. `lib/__tests__/healthConnection.test.ts`, `healthDayAndBurnedStatus.test.ts`, and `liveStepTrackingLifecycle.integration.test.tsx` cover authorization, missing/partial grants, local-day behavior, foreground lifecycle, background disposal, denial recovery, and stale callbacks. These are unit/source contracts, not hardware proof. |
| AND-04 | Device-test tooling is safe, reproducible, and preserves evidence vocabulary | **PASS** | Current protected main contains `tools/windows/Invoke-CaloraQa.ps1`, `tools/windows/Test-Invoke-CaloraQa.ps1`, `tools/windows/README.md`, and the Android QA matrix/register. The wrapper has explicit QuickSmoke/FeatureRegression/FullCertification levels, exact serial targeting, explicit `-RunMaestro`, and distinct PASS/FAIL/BLOCKED/NOT RUN outcomes; source assertions prohibit destructive ADB operations and build/submit commands. Existing Maestro flows are under `artifacts/calora/tests/device/` and package scripts in `artifacts/calora/package.json` expose nutrition-goals, meal-images, plus-recipes, and encrypted-recovery flows. Harness readiness does not equal executed feature certification. |
| AND-05 | Samsung S20 evidence proves only the bounded Level-1 physical baseline/smoke scope | **PASS** | `docs/qa/CALORA_PHYSICAL_ANDROID_QA_LAB_REPORT_V2.md`, `docs/qa/CALORA_PHYSICAL_ANDROID_QA_LAB_REPORT.md`, and `docs/qa/CALORA_ANDROID_QA_COVERAGE_MATRIX_V2.md` record owner evidence at `C:\CaloraEvidence\20261107T144127Z` for Samsung Galaxy S20 `SM-G981U`: discovery, install inspection, screenshot, redacted log capture, crash/ANR scan, performance snapshot, and smoke launch. The repository cannot independently access that Windows directory, ADB, or the device. The evidence is not a full feature or release-candidate certification. |
| AND-06 | Current protected-main full Android feature certification (navigation, Today, Plan, Progress, Recipes, Coach, Settings, persistence) | **NOT RUN** | The current matrix marks these surfaces “Prepared; physical feature run required.” `docs/qa/CALORA_ANDROID_QA_COVERAGE_MATRIX_V2.md` explicitly says the S20 collection/smoke scope is separate from feature, visual, and reliability certification. `docs/qa/CALORA_PHYSICAL_ANDROID_QA_LAB_REPORT_V2.md` marks Level 3 full certification NOT RUN. No build or device action was permitted here. |
| AND-07 | Camera/scanning readiness on the current Android candidate, including permission, Auto, Barcode, camera lifecycle, recovery, and real packaged item | **FAIL** | Source contracts exist in `app/(tabs)/scan.tsx`, `lib/__tests__/scanScreen.test.ts`, and `lib/__tests__/captureReview.test.ts`: permission fallback/settings route, CameraView readiness/error handling, barcode lock, capture deadline, provider-safe review, and no silent diary insertion. However, the latest physical Android report (`231_CALORA_POST_INSTALL_ANDROID_AND_IOS_CERTIFICATION_REPORT.md`) records an Auto route stuck at “Starting camera…” after route/resume, recovered only after app restart; it therefore classifies Auto as PARTIAL/DEFECT. The same report says final-build Barcode/provider match and real food recognition were not tested. Historical reports 218 and 227 also state source fixes required a fresh authorized APK. A known on-device lifecycle defect/risk plus absent current-candidate barcode proof prevents PASS. |
| AND-08 | Android Health Connect integration and live steps/active-calorie behavior on a physical release candidate | **BLOCKED** | Source supports partial grants, settings recovery, truthful unavailable versus measured zero, local-midnight freshness, and foreground-only refresh (`lib/health/healthService.android.ts`, `tests/device/health-burned-authorization-validation.md`). The physical validation specification explicitly requires a signed candidate, disposable Android device, Health Connect, explicit authorization, provider states, revoke/resume/relaunch, and sanitized evidence. The latest physical report says Health Connect/real-time steps were not run. Current matrix status is BLOCKED until an approved provider session. No Android device or build was available/operated in this audit. |
| AND-09 | Android accessibility/TalkBack, large-font, keyboard, and theme/safe-area certification | **BLOCKED** | Source has extensive `accessibilityLabel`, `accessibilityRole`, `accessibilityState`, live-region, font-scale, keyboard, and light/dark theme paths across `app/(tabs)/scan.tsx`, `profile.tsx`, `insights.tsx`, `planner.tsx`, and related tests. `tests/device/nutrition-goals.yaml` defines Android TalkBack assertions, but its README states audio output still requires manual screen-reader sign-off. Report 231 records TalkBack traversal as PARTIAL (hierarchy labels observed, TalkBack itself not enabled), and large-font/keyboard variant as NOT TESTED. No physical accessibility configuration was run. |
| AND-10 | Android lifecycle/recovery stability (tab switching, background/foreground, camera recovery, crash/ANR/duplicate-request behavior) | **FAIL** | Source tests cover foreground step lifecycle and scan interruption/deadline behavior, and the Windows toolkit safely collects redacted logs/crash markers. Nevertheless, historical Android reports 236/237 document prior process-fatal/native lifecycle and Fabric pager failures whose physical retest required a new authorized build; report 231 still records the Auto startup stall. Current matrix/register leaves background/foreground recovery NOT RUN and lists open QA-ANDROID-008/009/010. The source/test suite cannot erase the observed physical lifecycle defect or substitute for current-binary crash/ANR evidence. |
| AND-11 | Current signed Android release-candidate build/install and post-install validation from exact protected main | **NOT RUN** | `artifacts/calora/eas.json` defines signed production/internal profiles and requires commits, but no build was triggered by this audit. Current QA docs mark native release-candidate certification NOT RUN. Historical report 230 verified an older `9ea8b6c` APK build/install but explicitly said post-install checks were blocked by ADB disconnection; report 231 tested that older final APK, not current `9e7790cf`. A historical APK cannot certify this baseline. |
| AND-12 | S20 evidence boundary and secondary-device coverage are sufficient for commercial launch | **NOT RUN** | S20 Level-1 collection/smoke is PASS only for that narrow scope. The current matrix says feature/visual/reliability certification remains separate; S21 is not assumed, is blocked until connected/authorized, and no S21 smoke was run in the current lab evidence. The reliability register leaves full feature certification open and camera/network interruption checks blocked. Therefore the commercial-launch evidence package is not complete. |

## Important source and test evidence

- `/home/ubuntu/calora-coach-live-main/artifacts/calora/app.json`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/eas.json`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/package.json`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/plugins/withHealthConnectPrivacyPolicy.cjs`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/scripts/expo-config-authority.test.cjs`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/scripts/health-connect-privacy-policy.test.cjs`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/lib/health/healthService.android.ts`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/lib/__tests__/healthConnection.test.ts`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/lib/__tests__/healthDayAndBurnedStatus.test.ts`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/lib/__tests__/liveStepTrackingLifecycle.integration.test.tsx`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/app/(tabs)/scan.tsx`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/lib/__tests__/scanScreen.test.ts`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/lib/__tests__/captureReview.test.ts`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/tests/device/README.md`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/tests/device/health-burned-authorization-validation.md`
- `/home/ubuntu/calora-coach-live-main/artifacts/calora/tests/device/nutrition-goals.yaml`
- `/home/ubuntu/calora-coach-live-main/.github/workflows/calora-android-internal-build.yml`
- `/home/ubuntu/calora-coach-live-main/tools/windows/Invoke-CaloraQa.ps1`
- `/home/ubuntu/calora-coach-live-main/tools/windows/Test-Invoke-CaloraQa.ps1`
- `/home/ubuntu/calora-coach-live-main/docs/qa/CALORA_ANDROID_QA_COVERAGE_MATRIX_V2.md`
- `/home/ubuntu/calora-coach-live-main/docs/qa/CALORA_ANDROID_QA_RELIABILITY_AND_DEFECT_REGISTER_V2.md`
- `/home/ubuntu/calora-coach-live-main/docs/qa/CALORA_PHYSICAL_ANDROID_QA_LAB_REPORT_V2.md`
- `/home/ubuntu/calora-coach-live-main/231_CALORA_POST_INSTALL_ANDROID_AND_IOS_CERTIFICATION_REPORT.md`
- `/home/ubuntu/calora-coach-live-main/230_CALORA_FINAL_ANDROID_IOS_TESTFLIGHT_AND_PRODUCTION_CERTIFICATION_REPORT.md`
- `/home/ubuntu/calora-coach-live-main/218_CALORA_ANDROID_CAPTURE_RACE_REMEDIATION_REPORT.md`
- `/home/ubuntu/calora-coach-live-main/227_CALORA_AUTO_BARCODE_CAPTURE_REMEDIATION_AND_RELEASE_REPORT.md`
- `/home/ubuntu/calora-coach-live-main/236_CALORA_ANDROID_ALL_TAB_CRASH_NATIVE_LIFECYCLE_REPAIR_REPORT.md`
- `/home/ubuntu/calora-coach-live-main/237_CALORA_ANDROID_TAB_CRASH_FABRIC_PAGER_REF_ROOT_CAUSE_REPORT.md`

## Read-only commands/evidence assumptions

- Baseline verification: `git rev-parse HEAD` → `9e7790cffb0cbf8062d1fa198be6e71b76ff5161`; `git branch --show-current` → `main`.
- Current source/config inspection used `sed`, `find`, `grep`, and `git log/show`; no test/build command was run by this audit.
- The repository’s documented native commands require an external Windows/macOS host and exact device selection, e.g. `adb devices`, `CALORA_ANDROID_DEVICE=<exact serial> pnpm test:device:<flow>`, and the Windows wrapper’s `Invoke-CaloraQa.ps1 -Level ... -Serial ...`.
- The sandbox has no authorized Android device/ADB session and no current signed APK/AAB artifact. Historical owner evidence remains owner-side and was not independently re-run.

## Critical blockers to launch certification

1. Obtain explicit authorization for a signed Android build from protected main `9e7790cf`, install it on an approved disposable device, and record exact package/version/source provenance.
2. Re-run physical Auto/Barcode/Library/camera permission and route-resume checks; investigate the observed “Starting camera…” stall before claiming camera PASS.
3. Execute the Health Connect matrix with explicit grants/denials, settings recovery, no-record/measured-zero/positive-energy states, midnight, relaunch, background/foreground, and revoke flows.
4. Enable TalkBack and run the Android accessibility flow, including error announcement, row summaries, large font, keyboard, contrast/theme, and safe-area inspection.
5. Run repeated navigation/background/foreground/network-recovery/crash-ANR checks on the exact candidate. Do not treat S20 smoke collection or source tests as full certification.
6. Complete at least the documented S20 Level-2/Level-3 feature sessions; discover and separately target S21 if it remains in the launch device matrix.

**Conclusion:** Android configuration and QA infrastructure are credible and source-level contracts are extensive, but current commercial-launch readiness is **not certified**. The principal gaps are physical candidate-binary proof, the unresolved Auto camera lifecycle defect, Health Connect authorization/data evidence, TalkBack/manual accessibility evidence, and complete lifecycle/recovery/reliability execution.