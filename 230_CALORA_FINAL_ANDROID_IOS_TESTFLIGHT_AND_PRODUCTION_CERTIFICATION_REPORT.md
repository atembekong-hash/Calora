# 230 — Calora Final Android, iOS/TestFlight, and Production Certification Status

**Report date:** 2026-10-17 UTC
**Authoritative source:** `main` at `9ea8b6c2c60b5348d0b01a9c6b0f5863ee78b69d`
**Source tree:** `c0e2bdaa5a8063a5a9280b356b7ed3f9afb4960b`
**Scope:** final remediation release, production deployment, Android internal QA release, iOS/TestFlight release, and evidence-based certification status.

> **Verdict:** The cloud release, Android internal APK build, and iOS/TestFlight submission are **verified successful** for the exact merged source. The updated Android APK was installed in place on the Galaxy S21 Ultra without clearing app data, but the phone disconnected from ADB before post-install functional checks could be collected. Therefore, Android physical certification on the new binary remains **PARTIALLY VERIFIED**, not PASS. TestFlight upload is **verified**, while direct App Store Connect processing/tester visibility remains **BLOCKED** by an unauthenticated App Store Connect browser session.

## 1. Release summary

| Surface | Evidence-backed result | Status |
|---|---|---|
| Protected source merge | PR [#192](https://github.com/atembekong-hash/Calora/pull/192) squash-merged to `9ea8b6c`; required PR checks passed | PASS |
| Main release validation | GitHub run [38983041547](https://github.com/atembekong-hash/Calora/actions/runs/38983041547) passed, including same-SHA release-gate attestation | PASS |
| Railway production | API, web, and app services online; no pending work or recent failures | PASS |
| Public health | `https://mycaloraapp.com/health` and `https://mycaloraapp.com/api/healthz` returned `{"status":"ok"}` | PASS |
| Deployed API attestation | `/api/version` reported exact commit `9ea8b6c`, expected source tree, and release ID | PASS |
| Android QA build | GitHub run [38983576011](https://github.com/atembekong-hash/Calora/actions/runs/38983576011) and EAS build `f7c53e86-c4cf-45d2-9efb-50e4cd0f15c5` finished successfully | PASS |
| Android in-place installation | `adb install -r` returned `Success`; no uninstall or app-data reset was used | PASS |
| Android post-install functional testing | ADB disconnected after install, before screenshot/UI/feature checks | BLOCKED |
| iOS production build | EAS build `03ac8538-cca9-440f-833e-53ebd214e15b`, iOS `1.0.1 (17)`, finished from exact source | PASS |
| TestFlight submission | EAS submission `ab426550-d706-4970-bb9c-de67b66385db`; GitHub run [38983577756](https://github.com/atembekong-hash/Calora/actions/runs/38983577756) passed | PASS |
| Direct App Store Connect processing/tester visibility | Connected browser redirected to `authResult=FAILED`; no authenticated App Store Connect record view was available | BLOCKED |
| iOS physical-device/simulator testing | No eligible iOS device or simulator is connected | NOT TESTED |

## 2. Final remediation included in this release

PR #192 resolves the confirmed interaction and release issues identified during final certification:

| Area | Root cause | Implemented correction | Verification |
|---|---|---|---|
| Today hydration | A storage hydration failure could remain as a neutral loading state without a user recovery action | Added an accessible modal recovery layer, busy state, explanatory error, and `Retry loading Today` action bound to `retryHydration` | Client source contract plus complete client suite |
| Password recovery | Back navigation depended on history and did not reliably reach sign-in; async feedback lacked explicit busy/error semantics | Uses deterministic `router.replace('/auth/sign-in')`, visible alert semantics, and disabled/busy controls | Client source contract plus complete client suite |
| Profile target writes | Sequential taps could submit overlapping profile/nutrition updates | Added an in-flight ref lock, visible saving state, disabled controls, and an accessible storage-retry error | Client source contract, typecheck, complete client suite |
| Restaurants provider outage | Provider unavailability did not expose a direct retry from the status state | Added `Retry restaurant provider`, preserving current search context and preventing repeated taps while fetching | Focused and complete client suites |
| Coach clear history | Clear-history could race a pending assistant response | Transactionally locks the account conversation; pending replies now return an actionable HTTP 409 instead of deleting active state | Focused Coach API route test and complete offline API suite |
| iOS release gate | Build number 16 was consumed; Expo validator was still pinned to 16 | Advanced iOS build number to 17 and synchronized the validator and its fixture | Native profile tests, iOS build-number tests, protected release validation |

### Automated validation

| Check | Result |
|---|---:|
| Calora client suite | **161 files / 1,776 tests passed** |
| API offline suite | **41 files / 508 tests passed** |
| Client TypeScript | PASS |
| API TypeScript | PASS |
| EAS profile validation | PASS |
| iOS build-number preflight unit suite | **7 tests passed** |
| `git diff --check` before merge | PASS |
| Protected PR required checks | PASS; PR-only attestation skip was expected |
| Main release validation | PASS, including release-gate attestation |

Pre-existing React `act(...)` warnings in `profileScreen.test.tsx` and expected deadline-test network-error diagnostics remained non-failing test noise; no test failed.

## 3. Production attestation

Railway reported all three production services online and no pending deployment work:

- `@workspace/api-server`
- `Calora`
- `@workspace/calora`

The public `/api/version` response attested:

```text
gitCommit:  9ea8b6c2c60b5348d0b01a9c6b0f5863ee78b69d
sourceTree: c0e2bdaa5a8063a5a9280b356b7ed3f9afb4960b
releaseId:  calora-api-9ea8b6c2c60b-20261016234526449
```

Android App Links and iOS Universal Links were also retrieved from production. The Android association included the QA APK’s signing certificate fingerprint; the iOS association listed `B5344GJRMT.com.etiendem.caloraapp` for `/invite/*` and `/auth/callback`.

## 4. Android QA artifact and safe installation evidence

| Property | Verified value |
|---|---|
| EAS Android build ID | `f7c53e86-c4cf-45d2-9efb-50e4cd0f15c5` |
| GitHub build workflow | [38983576011](https://github.com/atembekong-hash/Calora/actions/runs/38983576011) |
| Source commit | `9ea8b6c2c60b5348d0b01a9c6b0f5863ee78b69d` |
| Profile/distribution | `production-apk` / internal |
| Package | `com.etiendem.caloraapp` |
| Version | `1.0.1`, versionCode `26` |
| Downloaded APK byte SHA-256 | `202038d2c1fefab9435a4a940decda3ec99932c89ad0d5a3a86ed340c07dce8b` |
| APK signer certificate SHA-256 | `2b052d0ddde4ed02d78814587e0e6195292c4497ba6d48313ec2444c2eb74a23` |
| Installer action | `adb install -r` only |
| Installer result | `Success` |
| Device model | Samsung Galaxy S21 Ultra (`SM-G998U1`) |

### Provenance clarification

The workflow field named `applicationArchiveUrlSha256` is a SHA-256 of the EAS archive **URL**, not a byte digest of the downloaded APK. It must not be represented as an APK-content checksum. This report separately records the actual downloaded byte SHA-256 and the APK signature verification. The successfully accepted `adb install -r` provides an additional Android platform check that the replacement package was signing-compatible; no uninstall, data clear, or permission reset was performed.

## 5. iOS and TestFlight evidence

| Property | Verified value |
|---|---|
| EAS iOS build ID | `03ac8538-cca9-440f-833e-53ebd214e15b` |
| App Store Connect app ID | `6800321660` |
| Bundle ID | `com.etiendem.caloraapp` |
| Version/build | `1.0.1 (17)` |
| Source compatibility | Exact: `9ea8b6c2c60b5348d0b01a9c6b0f5863ee78b69d` |
| TestFlight submission ID | `ab426550-d706-4970-bb9c-de67b66385db` |
| Release workflow | [38983577756](https://github.com/atembekong-hash/Calora/actions/runs/38983577756) |
| Build and submission evidence attestation | PASS |

The workflow created the production iOS build, retrieved its immutable EAS record, submitted that exact verified build to TestFlight, generated both provenance documents, and passed the separate evidence-attestation job.

**Not yet independently observable:** Apple’s post-upload processing state, compliance prompts, and internal-tester availability. The connected My Browser route reached App Store Connect but was unauthenticated (`authResult=FAILED`), so this report correctly classifies those Apple-console-only states as **BLOCKED**, not pass.

## 6. Physical-device certification boundaries

Prior Galaxy Scan reports contain useful historical evidence, but they apply to earlier installed binaries and are **not** proof that the final `9ea8b6c` APK passes on-device. After the exact final APK was installed, the Galaxy disconnected from ADB before the following non-destructive checks could run:

| Pending on final APK | Current status |
|---|---|
| Launch and first-paint screenshot | BLOCKED — ADB disconnected |
| Today recovery control visual behavior | BLOCKED — requires induced local hydration failure or controlled fixture |
| Navigation and bottom-tab geometry | BLOCKED — requires connected device interaction |
| Auto/Barcode/Library/Voice Scan | BLOCKED — requires connected camera/microphone/device interaction |
| Plan swipes and Program feedback | BLOCKED — requires connected device interaction |
| Progress Trends measured seven-day viewport | BLOCKED — requires connected device interaction |
| Recipes Discover/Plus/Create behavior | BLOCKED — requires connected device interaction and Plus/Create fixture access |
| Coach saved-chat switching and pending-clear conflict | PARTIAL — API regression passed; final APK UI check blocked |
| Health Connect and motion live steps | BLOCKED — requires connected device and granted data access |
| TalkBack/accessibility traversal | BLOCKED — requires connected device interaction |

### Exact resume point

The Galaxy is already updated in place. When it reconnects, no reinstall is needed. Resume by confirming `adb devices`, launching `com.etiendem.caloraapp`, capturing the post-install UI hierarchy/screenshot, then exercising only non-destructive flows from the table above.

## 7. Remaining external dependencies

1. **Galaxy S21 Ultra reconnection:** connect the existing USB data cable, unlock the device, accept the USB-debugging prompt if presented, and leave Calora open. This is the only required action for the final Android post-install evidence.
2. **App Store Connect session:** sign in to the authorized App Store Connect account in the connected browser if direct processing/tester-availability confirmation is required. The submission itself is already attested by the successful protected workflow.
3. **Dedicated QA entitlements/provider fixtures:** still required for truthful real-user Plus/Create/Restaurant persistence certification. Mock/source tests are not being represented as provider certification.
4. **iOS device or simulator:** required for actual iOS UX, permission, and app-launch certification.

## 8. Final readiness verdicts

| Platform | Readiness verdict | Reason |
|---|---|---|
| Web/API production | **RELEASED / ATTESTED** | Protected validation, Railway deployment, health, version, and associated-domain evidence all match exact merged source. |
| Android release artifact | **BUILT / INSTALLED / PARTIALLY CERTIFIED** | Exact signed QA APK was built and installed in place with preserved data, but physical post-install functional evidence is blocked by disconnection. |
| iOS/TestFlight | **BUILT / SUBMITTED / PROCESSING STATUS UNVERIFIED** | Exact build 17 and TestFlight submission are attested; Apple-console processing/tester availability and iOS device testing remain unavailable. |

No public App Store review or Google Play submission was attempted.
