# Report 218 — Calora Android Capture-Race Remediation

**Date:** 2026-10-16 00:28 UTC  
**Scope:** Physical Samsung Galaxy S21 Ultra Auto/Barcode capture failure from Report 217  
**Native-build policy:** No Android/iOS/EAS/APK/AAB/IPA/TestFlight build was triggered.

## Executive result

The physical-device failure was reproduced and narrowed to a **native CameraView lifecycle race**, not an API/provider failure:

- The installed app displayed `Analysis could not finish...` after a correctly targeted Auto capture.
- No `/api/v1/capture/analyze` request was emitted during the capture window.
- Railway recorded only the app's background recipe-media requests; there was no capture-analysis request.
- Calora's process log showed CameraX capture-session detach/reopen activity immediately around the shutter action.
- The installed artifact is `com.etiendem.caloraapp`, `versionName=1.0.1`, `versionCode=26`, updated `2026-10-13 21:09:32`, so the device is not running a newly rebuilt artifact containing this remediation.

## Root cause

`takePhoto()` set `hasScanned=true` before awaiting `cameraRef.current.takePictureAsync(...)`. That state change removes `CameraView`'s `onBarcodeScanned` callback through the rendered prop expression. On Android, the prop transition can reconfigure CameraX while the native shutter is being issued. The physical trace showed the corresponding detach/reopen sequence and no subsequent photo/API dispatch.

The existing `manualPhotoCaptureRef` already prevents barcode callbacks from racing a deliberate shutter, so changing the rendered `hasScanned` state before the shutter was unnecessary and unsafe.

## Source remediation

Changed `artifacts/calora/app/(tabs)/scan.tsx` so that:

1. `manualPhotoCaptureRef.current = true` continues to suppress barcode callbacks before the shutter.
2. `takePictureAsync()` runs before any `hasScanned` state transition.
3. `setHasScanned(true)` occurs only after a valid native photo URI is returned.
4. The source comment records why this ordering is required for Android CameraX.

Added a regression assertion in `artifacts/calora/lib/__tests__/captureReview.test.ts` that fails if `setHasScanned(true)` is moved back into the pre-shutter section.

## Evidence

### Physical device

- Device: connected Samsung Galaxy S21 Ultra through `DESKTOP-0UR9SG3`.
- Package: `com.etiendem.caloraapp`.
- Auto capture was targeted from the accessibility node `Capture food photo` at bounds `[419,1618][610,1809]`.
- Post-capture accessibility state returned to the Scan surface with the generic analysis failure and no review draft.
- Calora process PID `10419` showed CameraX `ImageCapture`/`Preview` use-case detach, camera close/reopen, and repeated camera-session configuration around the shutter.
- No Calora `ReactNativeJS` network-dispatch line appeared for the operation.

### Railway correlation

For `2026-10-16T00:23:50Z` through `00:24:45Z`, the API service logged repeated:

- `GET /api/v1/recipes/media → 304`
- `POST /api/v1/recipes/photo-url → 404`

It logged **no** `POST /api/v1/capture/analyze` request. This rules out a production API rejection, OpenAI timeout, authentication response, or provider error for this attempt: the request never left the device.

## Automated validation

- Focused Scan/capture tests: **PASS — 91/91 tests** across 2 files.
- Full Calora UI regression suite: **PASS — 1,737/1,737 tests across 156 files**.
- API capture/auth contract tests with isolated non-production placeholders: **PASS — 59/59 tests**.
- Calora TypeScript check: **PASS**.
- `git diff --check`: **PASS**.

Existing non-blocking React `act(...)` warnings in Profile tests remain unchanged and are unrelated to this fix.

## Device retest status

**BLOCKED pending a new authorized native build/install.** The installed APK is an older artifact and cannot contain a source-only fix. Per the standing Calora release rule, no native build was triggered. The correct next owner instruction must explicitly name the exact Android build/install to authorize it, after which the following must be retested on the physical device:

1. Auto → Capture food photo → successful review response and `/capture/analyze` request.
2. Barcode → deliberate photo fallback → successful review response.
3. Auto with a visible barcode hint → image fallback remains available.
4. Library food photo → successful analysis and review.
5. Retry after a failed capture.

## Delivery status

This report and the source/test remediation are being delivered through the protected GitHub workflow. No mobile build or release workflow is being triggered by this change.

## Final verdict

- **Root cause:** confirmed Android CameraView prop-reconfiguration race.
- **Source fix:** implemented and regression-tested.
- **API/provider defect:** not implicated in the reproduced operation.
- **Production web/API behavior:** unchanged by this native-only source fix.
- **Physical-device confirmation of the fix:** blocked solely by the no-native-build policy and the installed APK being older than the remediation.
