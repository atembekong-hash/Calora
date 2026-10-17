# 231 — Calora Post-Install Android and iOS Certification Report

**Report date:** 2026-10-17 UTC
**Android device:** Samsung Galaxy S21 Ultra (`SM-G998U1`)
**Installed package:** `com.etiendem.caloraapp` `1.0.1` / versionCode `26`
**Installed source release:** `9ea8b6c2c60b5348d0b01a9c6b0f5863ee78b69d` (`c0e2bdaa5a8063a5a9280b356b7ed3f9afb4960b`)
**Current protected `main`:** `0855373c054bd61cd381f3b59b7af21414c09866` — differs from the native source only by Report 230.
**Scope:** post-install, non-destructive Galaxy physical-device verification; TestFlight submission provenance; and current production attestation.

> **Overall verdict:** The final Android QA APK is installed and has meaningful physical-device coverage. Core navigation, Today entry controls, Plan paging, Progress date ranges and viewport, Scan entry routes, Discover rendering, Plus sign-in recovery, and Coach keyboard behavior were exercised on the installed binary. The Auto camera can capture and fail closed on non-food input after a non-destructive restart, but one earlier route-resume attempt remained at **“Starting camera…”**; this is an intermittent lifecycle concern, so Auto is **PARTIAL**, not fully certified. Barcode lookup with a real packaged UPC/EAN, real Voice transcription, authenticated Plus/Create/Coach flows, Health Connect, TalkBack traversal, and iOS device testing remain unproven. The exact iOS build and TestFlight submission are cryptographically attested, but Apple-console processing and tester availability remain **BLOCKED** by an unauthenticated App Store Connect session.

## 1. Evidence rules

This report keeps four evidence classes separate:

- **Physical device:** a live, ADB-authorized Samsung Galaxy S21 Ultra running the installed APK. Screenshots, UI hierarchies, and a Plan gesture recording are retained locally under `C:\Users\DynaBook\Desktop\CaloraCertification\.work\android-final-certification-231\`.
- **Automated/source:** retained CI and test evidence from protected PR #192 and main release validation. This is not substituted for physical proof.
- **Production:** current Railway status and public health/version responses.
- **Provider/console:** GitHub-attested immutable EAS/TestFlight provenance. Apple’s own post-upload processing screen was not observable without App Store Connect authentication.

No app data was cleared, no permissions were reset, no meal was added to a diary, no conversation was sent, and no new build or deployment was started during the device certification work.

## 2. Release, installation, and production identity

| Evidence | Result | Status |
|---|---|---|
| Galaxy ADB authorization | Device was detected and authorized as serial `R5CRB2FDNGK`; `adb shell` commands succeeded | PASS |
| In-place app identity | `com.etiendem.caloraapp`, version `1.0.1`, versionCode `26`; final package evidence records update time `2026-10-16 23:15:15` | PASS |
| Data-preserving installation | Prior final-release evidence records `adb install -r` success; no uninstall, data clear, or permission reset | PASS |
| Android artifact source | GitHub run [38983576011](https://github.com/atembekong-hash/Calora/actions/runs/38983576011) completed successfully for `9ea8b6c` | PASS |
| Protected source release | PR [#192](https://github.com/atembekong-hash/Calora/pull/192) was validated and squash-merged to `9ea8b6c` | PASS |
| Current protected main | `0855373` adds only `230_CALORA_FINAL_ANDROID_IOS_TESTFLIGHT_AND_PRODUCTION_CERTIFICATION_REPORT.md`; no application-source path changed after the native source commit | PASS |
| Railway production | `Calora`, `@workspace/api-server`, and `@workspace/calora` are Online with one running replica each, zero issues, zero recent failures, and no pending work | PASS |
| Public production | `mycaloraapp.com/health` and `/api/healthz` returned `{"status":"ok"}`; `app.mycaloraapp.com/health` returned `{"status":"ok","service":"calora-web"}` | PASS |
| API release attestation | `/api/version` reports current documentation-only main `0855373`, tree `f70e74c58cf859db51531a3d67207a57c1291bd2`, and release ID `calora-api-0855373c054b-20261017024657667` | PASS |

The application code in the installed final APK corresponds to `9ea8b6c`; the current production commit contains only Report 230 after that source release. This distinction is material and is not being hidden by the documentation-only follow-up commit.

## 3. Android physical-device matrix

| Surface / original requirement | Actual final-build exercise | Verdict | Evidence and boundary |
|---|---|---|---|
| Today launch | Explicit launch of the installed activity rendered Today on Galaxy | PASS | `04-launch.png` |
| Today date navigation | Today calendar was opened and date controls were rendered | PASS | `05-today-calendar-open.png`; no diary write was made |
| Today meal entry | Visible Add lunch control opened the meal-entry selection sheet and was closed without logging | PASS | `07-today-add-lunch-open.png` |
| Today hydration recovery | The error/retry path was not induced because that would require a controlled local-storage failure fixture | NOT TESTED | Source and automated evidence exist, but this is not a physical error-state PASS |
| Core tab navigation | Recipes, Progress, and Plan opened via live accessible native tab targets | PASS | `09-recipes-tab.png`, `10-progress-tab.png`, `11-plan-tab.png` and paired control captures |
| Raised Scan touch target | Scan was reopened through its accessibility-derived raised tab target after the native tab-bar geometry repair | PASS | `37-scan-touch-retest.png`; the target responded |
| Plan horizontal paging | Slow/partial/forward/return gestures were recorded. Captured states retained Planner content; no blank or remount-like state was captured | PASS for observed behavior | `12-plan-pager-gestures.mp4` and day-strip evidence. This does not claim a frame-rate measurement beyond the recorded inspection. |
| Progress Trends default viewport | Trends was opened and inspected across initial, mid, and lower content. The repaired seven-day view was rendered without the previously reproduced final-bar clipping | PASS | `21-progress-trends-initial.png`, `23-progress-trends-mid.png`, `24-progress-trends-lower.png` |
| Progress calendar range | Actual range picker opened; 30-day range was applied, then the original seven-day range was restored | PASS | `26-progress-range-picker-open.png`, `27-progress-30day-applied.png`, `30-progress-7day-restored-verified.png` |
| Progress large-font / keyboard | No font-scale or keyboard-layout variant was configured | NOT TESTED | Requires an explicit device accessibility configuration pass |
| Scan Auto startup | One attempt entered a persistent “Starting camera…” state after route/resume activity; no crash was observed. A non-destructive app restart restored an enabled live camera | PARTIAL / DEFECT | `58-auto-stall-after-wait.png`, `64-scan-after-nondestructive-restart.png`. This is a lifecycle concern, not a full Auto PASS. |
| Scan Auto capture safety | On the recovered camera, capture of a controlled non-food/black frame opened Photo Review with “No identifiable food or drink visible.” No diary approval action appeared or was invoked | PASS for capture and fail-closed rejection | `65-auto-controlled-frame-result.png`, controls file, and CameraManager logs. The review drawer was closed afterward. |
| Scan Auto food recognition | No real food was intentionally supplied to the camera during the final pass | NOT TESTED | A non-food safety result is not food-recognition proof |
| Scan Auto barcode handoff | No physical UPC/EAN was available in this final session | BLOCKED | Requires a packaged product barcode placed in the live rear-camera frame |
| Scan Barcode mode activation | Barcode mode was selected and its live camera state rendered | PASS | `38-scan-barcode-live.png` |
| Scan Barcode provider match | No real packaged UPC/EAN was scanned on this final APK | BLOCKED | Existing source/API regression and prior physical evidence are not reclassified as final-build provider certification |
| Scan Library route | Library picker opened; a controlled neutral selection/handoff was exercised and closed without a diary write | PASS for picker, handoff, and safe exit | `40-library-picker-open.png`, `41-library-neutral-result.png` |
| Scan Library real food analysis | No real food image was selected during this safe final pass | NOT TESTED | Requires a controlled food image and review without diary approval |
| Voice route readiness | Voice route opened with the recording control available | PASS | `44-voice-route-ready.png` |
| Voice silent handling | Capture was stopped without spoken content and presented safe handling rather than a crash or implicit diary write | PASS | `45-voice-silent-result.png` |
| Voice transcription | No spoken meal was provided to the microphone | NOT TESTED | Requires an actual spoken test utterance and provider response |
| Recipes Discover | Discover rendered, a recipe detail opened, and continued native scrolling was exercised | PASS for observed rendering/continuation | `46-recipes-discover.png`, `47-discover-recipe-detail.png`, `49-discover-card-viewport-scroll.png` |
| Recipe image identity | This session did not validate diverse recipe images against food identity | NOT TESTED | Image integrity needs its own controlled visual dataset; no image was accepted merely because it rendered |
| Recipes Plus | Plus screen opened; the unauthenticated state presented and the sign-in recovery route was exercised | PASS for unauthenticated recovery | `50-plus-initial.png`, `52-plus-signin-recovery.png` |
| Plus entitlement and continuous feed | No authenticated Plus QA identity/entitlement was available | BLOCKED | Must not bypass RevenueCat entitlement or use a real customer account without approval |
| Recipes Create | No authenticated Create fixture was available | BLOCKED | Needs isolated QA identity/provider fixture |
| Coach shell | Coach opened and its accessible initial controls rendered | PASS | `53-coach-initial.png` |
| Coach keyboard | Composer keyboard opened without obscuring the reachable composer in the captured layout | PASS | `54-coach-keyboard-open.png` |
| Coach factual response / copy / delete | No message was sent and no saved authenticated conversation was available | BLOCKED | Requires a QA account and controlled conversation fixture |
| Profile/settings persistence | No authenticated profile fixture was used | BLOCKED | Requires a QA identity and non-production test data plan |
| Restaurants | Provider-persistence journey was not run | BLOCKED | Requires authenticated QA fixture/provider availability |
| Health Connect / real-time steps | No Health Connect permission or movement session was used | BLOCKED | Requires explicit permission, user activity, and non-destructive health-data review |
| TalkBack traversal | Accessibility labels were inspected through UI hierarchy on tested screens; TalkBack itself was not enabled | PARTIAL | Meaningful labels were observed for core controls, but screen-reader traversal/announcements need a dedicated manual pass |

## 4. Reproducible defect / risk record

### AC-231-01 — Intermittent Auto camera preview initialization

**Classification:** PARTIAL; physical lifecycle defect/risk pending further reproduction.
**Observation:** During the final certification, an Auto Scan entry remained at “Starting camera…” after waiting. Later, after a non-destructive Calora restart, the same final APK reached live camera state, exposed an enabled capture button, and completed the controlled fail-closed capture workflow.

**What is proven:** The app can recover to a working camera without reinstallation, data deletion, or permission reset; CameraManager logs showed the rear camera transitioning to `OPEN` and `ACTIVE`; controlled capture reaches review safely.

**What is not proven:** That Auto preview starts reliably after every route/resume sequence. The one captured stall prevents a blanket PASS.

**Safe next verification:** With the same installed APK and no data reset, repeat fresh Scan-tab entries and background/foreground returns while observing whether “Starting camera…” clears promptly. If it repeats, collect timestamped logcat around the route transition and repair only the confirmed lifecycle path. Do not treat a source-only CameraX fix as device proof.

## 5. iOS/TestFlight certification

### Verified submission provenance

GitHub workflow [38983577756](https://github.com/atembekong-hash/Calora/actions/runs/38983577756) completed successfully. Its downloaded release-evidence artifacts were independently verified with `gh attestation verify` against `atembekong-hash/Calora` and the GitHub Actions OIDC policy.

| Property | Verified value |
|---|---|
| EAS build ID | `03ac8538-cca9-440f-833e-53ebd214e15b` |
| EAS submission ID | `ab426550-d706-4970-bb9c-de67b66385db` |
| App Store Connect app ID | `6800321660` |
| Bundle ID | `com.etiendem.caloraapp` |
| Version/build | `1.0.1 (17)` |
| Source compatibility | Exact `9ea8b6c2c60b5348d0b01a9c6b0f5863ee78b69d` |
| Distribution | Store |
| EAS build status | `FINISHED` |
| GitHub provenance verification | PASS for both build and submission documents |
| Workflow evidence attestation | PASS; GitHub Actions OIDC, repository, and workflow policies matched |

### Apple-console boundary

Both available browser routes reached App Store Connect only as an unauthenticated session (`authResult=FAILED`). There is no enabled App Store Connect connector in the session. Therefore, the following are **BLOCKED**, not inferred from upload success:

- Apple processing completion;
- export-compliance or other Apple prompts;
- internal/external tester visibility; and
- actual iOS launch, permission, gesture, camera, microphone, and layout behavior.

This is not a build failure. The immutable submission is verified; Apple-console-only post-upload state remains unavailable for independent observation.

## 6. Automated and protected-release evidence carried forward

The exact native source release was validated before merge and before the authorized native workflows:

| Check | Result |
|---|---:|
| Calora client regression | 161 files / 1,776 tests passed |
| API offline regression | 41 files / 508 tests passed |
| Client and API TypeScript | PASS |
| Native profile validation | PASS |
| iOS build-number preflight unit suite | 7 tests passed |
| Protected PR #192 required checks | PASS |
| Main release validation (run 38983041547) | PASS |
| Android internal signed build (run 38983576011) | PASS |
| TestFlight upload (run 38983577756) | PASS |

These checks validate code and release provenance. They do not replace the physical verdicts in Section 3.

## 7. Remaining certification backlog

1. **Auto camera lifecycle:** reproduce or clear AC-231-01 through repeated safe route/resume checks on the currently installed APK. If reproduced, retain logcat and repair the specific lifecycle path.
2. **Actual Barcode:** present a known packaged UPC/EAN to the final APK’s Barcode mode, then separately test the same item through Auto mode. Verify the provider review name/nutrition against the package and do not approve it into the diary.
3. **Actual Voice:** record a short harmless spoken meal description and verify transcription/review without diary approval.
4. **Library food image:** select a controlled real food photo, validate the review content, and cancel before adding it.
5. **Authenticated QA:** use a dedicated, isolated account with an authorized temporary Plus entitlement to test Plus feed, Create generation/image persistence, Restaurants persistence, Coach send/copy/single-delete/saved-chat switching, Profile persistence, and Planner Program application feedback. Do not use or alter a real customer’s data.
6. **Health/accessibility:** perform granted Health Connect real-time steps verification and a TalkBack traversal pass, including large-font and keyboard variants.
7. **iOS:** sign into the authorized App Store Connect account to inspect build `1.0.1 (17)` processing/tester visibility, then test on an eligible iPhone or simulator. The authenticated console check must precede any processing PASS claim.

## 8. Final certification status

| Area | Current status |
|---|---|
| Protected source, CI, Android artifact, and installation | PASS |
| Web/API production deployment and public attestation | PASS |
| Android foundational navigation, Today entry, Plan, Progress, Scan routing, Discover, unauthenticated Plus recovery, Coach keyboard | PASS within the bounded observed behaviors |
| Android Auto camera | PARTIAL — capture/rejection works after restart; one startup stall remains unresolved |
| Android Barcode, real food Auto/Library, and real Voice transcription | BLOCKED / NOT TESTED pending real controlled inputs |
| Authenticated Plus/Create/Restaurants/Coach/Profile workflows | BLOCKED pending dedicated QA fixture/entitlement |
| Accessibility / Health Connect | PARTIAL / BLOCKED pending explicit device setup and manual traversal |
| TestFlight upload provenance | PASS |
| Apple processing/tester visibility and iOS runtime | BLOCKED pending authenticated App Store Connect and iOS test hardware/simulator |

No additional Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build/release was triggered during this post-install certification pass.
