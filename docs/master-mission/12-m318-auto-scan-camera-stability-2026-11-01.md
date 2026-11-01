# Mission 318 — Android Auto Scan Forensic Investigation and Camera Stability Repair

**Date:** 2026-11-01
**Last verified production API/web release before this repair:** `343e2dc3ac5689bf65d70288f6ecd6db4da438db`
**Repository:** `atembekong-hash/Calora`

## 1. Evidence inventory

The supplied Android screenshots provide the following physical-device evidence:

1. Auto mode is selected and the camera preview is active while an Emergen-C sachet barcode is visible.
2. Auto mode displays: “Analysis could not finish. Retry, retake the photo, or use another way to log your meal.”
3. Dedicated Barcode results can produce a 9.4 g serving with approximately 35 kcal and 8 g carbohydrates.
4. A separate barcode result can safely display `100 g (reference quantity)` with approximately 372 kcal and 85 g carbohydrates.
5. The serving-size repair is therefore visibly preserved in the Android review UI, while Auto mode remains the failing entry path.

The accompanying mission notes describe CameraX activity and monitor-contention warnings, but a separate raw Android runtime log file was not present in `/home/ubuntu/upload` during this investigation. No unprovided log lines are claimed as evidence.

## 2. Baseline configuration

Source inspection confirmed:

| Item | Evidence |
|---|---|
| Android package | `com.etiendem.caloraapp` |
| App version | `1.0.1` |
| Android version code | `26` |
| Expo | `54.0.37` |
| React Native | `0.81.5` |
| `expo-camera` | `17.0.10` |
| Reanimated | `4.1.7` |
| Camera plugin | `expo-camera` with explicit camera and microphone permission text |
| Camera component | `CameraView` in `artifacts/calora/app/(tabs)/scan.tsx` |
| Production API release | `343e2dc3ac5689bf65d70288f6ecd6db4da438db` |

The installed Android build source revision was not independently recoverable from the screenshots alone. The source repair in this report is based on the current protected repository checkout and must be included in a new native build before physical retesting.

## 3. Auto versus Barcode pipeline comparison

### Dedicated Barcode mode before repair

A barcode callback claims a synchronous lock, sets the scan state, and submits the barcode to the capture API. The API receives `mode: "barcode"`, performs the exact provider lookup, persists a review session, and returns the review sheet.

### Auto mode before repair

Auto also detected the barcode, but then called:

```ts
void takePhoto(barcode, sequence);
```

That path opened the native shutter, changed capture state, prepared a photo, and submitted a combined Auto request containing both the detected barcode and image. This was not necessary for a readable barcode and created an additional CameraX capture-session transition while the preview was active. The screenshot’s Auto failure and reported visual instability are consistent with this extra native transition and the less direct request path.

The backend already supports the correct behavior: when Auto receives a barcode, it uses the same barcode lookup branch as explicit Barcode mode. The client was failing to use that stable direct path.

## 4. Implemented repair

The Auto barcode callback now:

1. Claims the synchronous barcode lock before any asynchronous work.
2. Sets the scan state to prevent duplicate callbacks.
3. Sends the detected value through explicit API `mode: "barcode"`.
4. Does not call the native photo shutter.
5. Leaves the normal shutter available for food-photo capture when no barcode is detected.
6. Preserves the existing sequence, account binding, cancellation, timeout, review, and fallback behavior.

Dedicated Barcode mode remains unchanged. Auto food capture remains available through the capture button and continues to use the existing reviewed photo-estimate path.

No backend, database, production configuration, serving-size logic, or provider behavior was changed.

## 5. Regression coverage

Updated source-contract tests to assert the new direct Auto route rather than the obsolete photo-plus-barcode route.

Executed evidence:

- Focused Scan, flow, and request tests: **31 passed**.
- API capture suite: **62 passed**.
- Calora TypeScript check: **passed with zero errors**.
- Full Calora client validation: **186 test files, 1,938 tests passed**.
- Web/server/security/configuration checks: **29 passed**.
- Existing serving-size and capture tests remain green.

The first full-suite run reported two failures because two static tests still expected the old source text. Those tests were corrected to encode the repaired contract, and the complete suite then passed without runtime failures.

## 6. Root-cause status

### Confirmed

- Auto mode previously performed an unnecessary native photo capture after a barcode was detected.
- Dedicated Barcode mode used the direct lookup path.
- The backend already had a barcode lookup branch for both Auto and Barcode.
- The repair removes the extra Auto shutter transition and routes directly to the working lookup.
- Barcode duplicate protection and request identity/cancellation guards remain in place.

### Strongly supported but not physically re-measured here

- The extra shutter/capture-session transition was the most likely source of the Auto-only failure and preview instability because the dedicated Barcode path succeeded while Auto alone invoked `takePictureAsync`.
- Removing that transition should reduce CameraX session churn and prevent Auto from entering the generic analysis failure path for a readable supported barcode.

### Not verified in this environment

- A new Android APK containing this repair was not built.
- The Samsung device was not connected for post-repair execution.
- No raw Android log was available for timestamp correlation.
- Preview frame rate, camera initialization count, and physical shaking were not measured after the repair.

## 7. Serving-size protection

The supplied screenshots confirm that the PR #314 serving behavior must remain unchanged:

- Reliable packet metadata: `9.4 g`, approximately `35 kcal`, `8 g` carbohydrates.
- Missing serving metadata: `100 g (reference quantity)`, approximately `372 kcal`, `85 g` carbohydrates.

The repair does not merge these records, hardcode either product, or alter their nutrition calculations.

## 8. Delivery readiness

The source repair is ready for protected GitHub delivery. It must proceed through a feature branch, required CI, and protected pull request. No Railway deployment is authorized by this mission text, and no deployment or native build was initiated.

After merge, a separately authorized Android build is required for physical acceptance. The physical acceptance procedure is:

1. Build from the merged repair commit.
2. Preserve the existing Calora installation and data; prefer a separate internal test installation where signing/package configuration allows.
3. Open Scan in Auto mode and point at the Emergen-C barcode.
4. Confirm Auto reaches the review sheet without a second shutter tap.
5. Confirm the 9.4 g / approximately 35 kcal result where metadata is available.
6. Confirm the 100 g reference fallback for the other barcode record.
7. Repeat in dedicated Barcode mode.
8. Test Food, Label, Library, rapid mode switching, leaving/reopening Scan, and recovery after a failed lookup.
9. Capture Calora-filtered Android logs and a short screen recording for camera stability.

## Final verdict

**PARTIAL PASS WITH EXPLICIT LIMITATIONS**

The Auto routing defect is repaired at source level, the direct barcode contract is covered, all focused and full offline validation passes, and the PR #314 serving-size integrity behavior is preserved. Physical Samsung validation, post-repair camera-stability measurement, and a new native artifact remain pending because this mission did not authorize an Android build and the device/log evidence was not available for execution in this environment.
