# Mission 202 — Calora Auto Scan Complete Forensic Investigation and Remediation Report

**Repository:** `atembekong-hash/Calora`  
**Branch:** `fix/recipe-infinite-scroll`  
**Remediation commit:** `ab6e61d63ad22fa84bed262cc516c154c9d6f8f3`  
**Date:** 2026-10-13  
**Native-build policy:** No Android, iOS, EAS, APK, AAB, IPA, TestFlight, Play Store, or App Store build was triggered.

## 1. Executive summary

The Auto failure was traced to the native Scan screen’s live barcode callback, not to the working food-vision API, image preparation, authentication, or the backend Auto image fallback.

In Auto mode, any barcode callback immediately submitted a barcode-only request and marked the capture as consumed. If the detected value was absent, partial, or not found by Open Food Facts/USDA, the user received an unavailable/error path and the captured food image was never sent to the food-recognition pipeline. Auto therefore diverged from Food mode before image analysis.

The remediation makes Auto barcode detection a non-terminal hint. Auto now retains the detected value and submits the captured image through the existing Auto endpoint. The backend already has the correct fallback: a matched barcode returns the barcode result; an unmatched barcode plus image falls through to the existing managed food-vision path. Explicit Barcode mode remains unchanged.

## 2. Complete Scan architecture

### Client

`artifacts/calora/app/(tabs)/scan.tsx` owns:

- Camera permission and camera readiness.
- `CameraView` preview and barcode callbacks.
- Camera capture and photo-library selection.
- Image preparation through `prepareCaptureImage`.
- Operation identity, cancellation, timeout, and stale-response protection.
- Authenticated requests through `requestAuthenticatedCaptureAnalysis`.
- Review draft creation and approval before diary persistence.
- Explicit Auto, Barcode, Food, and Label mode selection.

### Request and backend

- `artifacts/calora/lib/captureRequest.ts` obtains a fresh Supabase bearer token and verifies the active account identity.
- `POST /v1/capture/analyze` is implemented in `artifacts/api-server/src/routes/capture.ts`.
- Food photos use `analyzeFoodPhoto` and the managed vision model.
- Nutrition labels use `analyzeNutritionLabel` and the managed vision model.
- Barcode requests use Open Food Facts with USDA fallback.
- Auto requests with an image use barcode lookup first when a barcode hint exists, then the existing food-photo fallback when no provider match is found.
- Results are normalized, persisted as capture-session candidates where possible, and presented for review. Diary insertion remains a separate explicit approval/sync action.

## 3. Auto execution flow

The failing path was:

1. User opens Scan; Auto is the default mode.
2. Camera starts and enables barcode callbacks for Auto.
3. A live barcode callback fires before the user captures the meal.
4. The old client immediately called `submitAnalysis({ mode: 'auto', barcode })`.
5. `hasScanned` became true and the capture was treated as in flight/consumed.
6. If provider lookup did not match, the response was unavailable or was surfaced through the generic recovery path.
7. The user’s food photo was not submitted through the image path.

The corrected flow is:

1. Auto opens normally.
2. A barcode callback stores the detected value only as `autoBarcodeHintRef`.
3. The callback does not submit, consume the scan, or block manual capture.
4. The user captures or selects the image.
5. Auto sends the image, plus the optional barcode hint, to the existing endpoint.
6. A verified barcode match returns the barcode review result.
7. An unmatched/false barcode falls through to the existing food-photo vision analysis.
8. The existing review and explicit diary-approval flow is preserved.

## 4. Comparison against working modes

| Concern | Food | Barcode | Label | Auto before fix | Auto after fix |
|---|---|---|---|---|---|
| Manual image capture | Yes | Not required | Yes | Yes | Yes |
| Live barcode callback | Disabled | Terminal | Disabled | Terminal | Hint only |
| Image preparation | Shared | N/A for callback | Shared | Shared | Shared |
| Authenticated API | Shared | Shared | Shared | Shared | Shared |
| Food vision route | Direct | No | No | Only if callback did not consume flow | Preserved fallback |
| Provider barcode lookup | No | Direct | No | Could terminate before image | Preferred when a hint exists |
| Review before diary | Shared | Shared | Shared | Shared | Shared |

The earliest incorrect divergence was the Auto-only terminal barcode callback in the client.

## 5. Confirmed root cause

**Root cause:** Auto treated live barcode detection as a completed analysis instead of retaining it as an optional hint for the subsequent image capture.

This was confirmed by tracing:

- `onBarcodeScanned` in `scan.tsx`.
- The old unconditional `submitAnalysis({ mode, barcode })` call.
- `setHasScanned(true)` in the same callback.
- The backend branch in `capture.ts` that returns an unavailable barcode response when no image remains.
- The existing backend regression proving that an unmatched barcode plus a valid image correctly falls back to managed vision.

No evidence showed that image preprocessing, authentication, the food endpoint, or the managed vision route was the earliest failure for the Auto food path.

## 6. Supporting runtime and code evidence

- Existing backend test: Auto with a matched barcode and image takes the barcode path.
- Existing backend test: Auto with an unmatched barcode and image calls managed vision and returns `mode: food`, `status: review`.
- Existing backend test: barcode-only Auto with no provider match returns a recoverable unavailable result.
- Production health at investigation time:
  - `https://mycaloraapp.com/health` — HTTP 200, `{"status":"ok"}`
  - `https://mycaloraapp.com/api/healthz` — HTTP 200, `{"status":"ok"}`
- The live API was serving release `e14cc8950a4adc6745daef9cbb1a7068ed043837` before this client-only change. No API source change was required.

No private images, credentials, tokens, or personal data were exposed in the investigation.

## 7. Git regression findings

The relevant historical change was commit `d9d30c4` / PR #117, which restored Auto camera paths and added the backend unmatched-barcode fallback. That change correctly made the backend tolerant of Auto barcode-plus-image requests, but the client continued to submit live Auto barcode callbacks as terminal requests. The remaining client-side race/priority defect was not covered by the prior screen contract.

## 8. Fixes implemented

### Client

Modified `artifacts/calora/app/(tabs)/scan.tsx`:

- Added `autoBarcodeHintRef`.
- Auto barcode callbacks now store a hint and return without submitting.
- Camera and library Auto submissions include the hint only when available.
- Mode-reset logic clears the hint.
- Explicit Barcode mode continues to submit barcode callbacks immediately.
- Food and Label modes remain unchanged.

### Regression coverage

Modified `artifacts/calora/lib/__tests__/scanScreen.test.ts`:

- Asserts that Auto barcode detections are retained as hints.
- Asserts that the hint is included when the captured image is submitted.

The existing API regression already verifies the critical unmatched-barcode-to-food-vision fallback.

## 9. Automated test results

Passed after the fix:

- API capture suite: **57/57 tests passed**.
- Calora Scan and capture regressions: **82/82 tests passed**.
- Calora TypeScript typecheck: **passed**.
- `git diff --check`: **passed**.

The previous full repository validation also established the broader Calora test baseline; the focused tests above directly exercise this remediation.

## 10. Integration and production results

This remediation changes only mobile client source and tests. It does not modify the API server or Railway runtime, so no backend deployment was needed for the source fix.

Production health was rechecked before remediation delivery and remained healthy. The client change requires a future authorized native build before it can be physically installed on a device.

## 11. Android verification

**Not performed.** No Android build or physical-device run was triggered, in accordance with the project rule. The automated tests model the native callback and request contract but cannot prove camera behavior on a signed Android binary.

## 12. iOS verification

**Not performed.** No iOS build, EAS build, or TestFlight submission was triggered. Real-device verification requires a separately authorized native build.

## 13. Regression results

The remediation preserves:

- Explicit Barcode mode and provider lookup.
- Explicit Food mode and managed vision analysis.
- Explicit Label mode and nutrition-label extraction.
- Library image selection and image preparation.
- Authenticated request identity guards.
- Capture timeouts, cancellation, retry, and stale-response protection.
- Review-before-diary behavior.
- Existing API fallback behavior for unmatched Auto barcodes.

## 14. Delivery references

- Remediation commit: `ab6e61d63ad22fa84bed262cc516c154c9d6f8f3`
- Prior protected Voice regression merge: `56f2af6b3640a5f93ec928362eec78251f921a42`
- No native build was triggered.

## 15. Remaining blockers

1. A signed Android build and physical Android test are still required to confirm the corrected camera callback behavior on the owner’s device.
2. A signed iOS build and physical iOS test are still required for iOS camera callback confirmation.
3. The automated environment cannot certify camera optics, permissions, lifecycle interruptions, or provider behavior with a real user image.

## 16. Final certification verdict

**Engineering remediation: PASS for the confirmed Auto food failure mechanism.** Auto no longer allows a false or unmatched live barcode callback to consume the food-photo capture; the captured image is preserved and reaches the existing food-vision fallback.

**Automated verification: PASS.** Focused API, Scan regression, and typecheck validation all passed.

**Production backend health: PASS.** Existing API and health endpoints were healthy; no backend deployment was necessary for this client-only correction.

**Physical-device certification: NOT YET CERTIFIED.** Android and iOS camera behavior remain pending a separately authorized native build and real-device test. No claim of physical-device verification is made.
