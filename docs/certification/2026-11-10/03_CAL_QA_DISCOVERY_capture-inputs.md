# CAL-QA Discovery — capture-inputs

**Report ID:** CAL-QA-DISCOVERY-capture-inputs-2026-11-10
**Inspection date:** 2026-11-10
**Repository:** `/tmp/calora-m417-main`
**Inspected SHA:** `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`
**Framework:** `/home/ubuntu/upload/CALORA_AUTONOMOUS_MISSION_FRAMEWORK_V3.txt`
**Working tree:** clean at inspection time
**Execution constraint:** read-only inspection only; no tests, builds, native runs, provider calls, deployments, or data mutation were performed.

## Executive summary

The `capture-inputs` cluster is implemented broadly and has substantial source-level and mocked/disposable-test coverage. The current Scan screen supports Auto, Barcode, Food, Label, Library/photo, Receipt, typed text, and Voice entry. The client contains explicit camera/microphone permission handling, bounded deadlines, app-lifecycle cancellation, retry paths, duplicate barcode locking, account-bound authenticated requests, review-before-save behavior, and local-first acceptance. The API validates capture input, requires authentication, applies a persistent fail-closed rate limit, performs exact barcode identity checks and provider fallback, bounds AI/provider calls, persists review sessions atomically when possible, and exposes an owner-scoped approval route.

The cluster is **not fully certified** at this SHA. The mandatory genuine native evidence is missing: no current signed Android/iOS artifact was executed, no Galaxy S20 capture session was performed, no iOS camera/microphone run was performed, and no current authenticated production/provider capture response was independently verified. Historical physical reports are either for the wrong device (Galaxy S21/S21 Ultra, while the framework mandates Samsung Galaxy S20), use older source/build SHAs, or explicitly document that the repaired Auto path still requires a fresh authorized native build. The appropriate overall classification is **PARTIAL** rather than VERIFIED. No current-source defect was proven during this read-only discovery; historical defects are recorded as repaired at source level but remain runtime-unconfirmed.

## Mission classifications

| Mission | Scope in this cluster | Classification | Basis |
|---|---|---|---|
| **CAL-QA-07** | Smart Scan camera, capture, AI recognition, correction, review, save, dashboard sync | **PARTIAL** | Current source and focused contracts cover the journey, including review and recovery, but genuine camera capture, image upload/AI response, permission/interruption behavior, and native Android/iOS persistence/sync are unexecuted at the inspected SHA. |
| **CAL-QA-08** | Barcode permission, detection, lookup, verification, serving adjustment, logging | **PARTIAL** | Exact barcode matching, provider fallback, unknown-product safe state, duplicate protection, serving correction, and API contracts are covered. Historical physical Barcode evidence exists, but it is Galaxy S21 Ultra and predates the inspected SHA; current Galaxy S20 and current-build evidence is absent. |
| **CAL-QA-09** | Voice microphone permission, recording, transcription, correction, save | **PARTIAL** | Source implements mobile microphone permission, bounded recording, transcription, editable transcript, typed fallback, and cleanup; static/unit contracts cover these branches. No real microphone, interruption, provider transcription, iOS/Android, or persistence run is evidenced at this SHA. |
| **CAL-QA-18** | Capture controls and interactions discoverable within the Scan journey | **PARTIAL** | Accessibility labels and source contracts exist for capture, retry, mode selection, serving controls, include/remove, approve/discard, text, voice, receipt, and library actions. Native touch, keyboard, rapid-tap, back, screen-reader, large-font, and reduced-motion execution is missing. |
| **CAL-QA-20** | Capture review persistence, approval, sync, conflict/recovery | **PARTIAL** | Client acceptance coordinator, approval retry, local durability, API approval, capture-backed diary validation, and tenant-boundary tests exist. Current authenticated cross-device/offline/reinstall and production database/provider evidence is not present. |
| **CAL-QA-21** | Capture API/provider reliability, retries, rate limits, deployment provenance | **PARTIAL** | Offline API tests cover authentication, validation, provider failures/timeouts, rate limiting, persistence rollback, and safe responses. Current Railway serving SHA, live provider configuration/response, live latency/cost, and production recovery evidence are not established for this SHA. |

No `capture-inputs` literal identifier exists in the repository. The cluster was mapped to the capture/Scan implementation and the three framework missions CAL-QA-07 through CAL-QA-09, with the directly dependent interaction, persistence, and API/provider missions listed above.

## Flow map inspected

### Native/client entry points

Primary implementation is `artifacts/calora/app/(tabs)/scan.tsx`.

- Camera and microphone permissions: imports `useCameraPermissions` and `useMicrophonePermissions` (lines 1–5); camera denied/blocked UI exposes **Allow camera access** or **Open Settings** (lines 70–77 and 848–867).
- Camera lifecycle: `CameraView` uses `onCameraReady`, `onMountError`, a remount key, barcode settings, and a bounded preview timeout (lines 330–342 and 873–897).
- Modes: Auto, Barcode, Food, and Label are rendered as selectable controls (lines 899–901); the screen also exposes Library, Restaurants, Type it, Voice, and Receipt controls (lines 902–919).
- Barcode callback: `onBarcodeScanned` claims a synchronous sequence lock and sends Auto detections through the direct barcode contract without a second shutter (`scan.tsx:585–597`). This is the current implementation, not the older historical path.
- Manual photo: `takePhoto` sets a native-operation guard, waits for `takePictureAsync` before changing `hasScanned`, prepares the image, and submits it (`scan.tsx:599–665`). The inline comment documents the Android CameraX race boundary (`scan.tsx:625–630`).
- Library/photo: `choosePhoto` preserves the user-owned source URI, prepares an app-owned cache file, and sends the selected image (`scan.tsx:667–715`).
- Voice: recording is bounded to 12 seconds, converted to base64, sent as `m4a` on native, and falls back to editable text on failure or transcript completion (`scan.tsx:455–509`, `511–568`).
- Interruption/recovery: genuine background transitions cancel work while an owned Android picker handoff is preserved; active resume remounts the camera (`scan.tsx:315–328`). Capture failures expose retry/sign-in/recovery controls (`scan.tsx:776–792`, `897–898`).
- Review boundary: analysis creates a Food Memory draft; approval requires an included component and valid serving; review can be edited, approved, saved as a meal, or discarded (`scan.tsx:362–374`, `728–773`, `926–934`).

### Authenticated client transport

`artifacts/calora/lib/captureRequest.ts:9–109` binds every protected request to the active Supabase identity, checks the identity before sending, refreshes once after a 401, and rejects a changed account or missing session. This is supplemented by `artifacts/calora/lib/__tests__/captureRequest.test.ts`:

- current session token plus one 401 refresh;
- no request after active-account change;
- no request without an active account/session.

### API/provider path

Primary implementation is `artifacts/api-server/src/routes/capture.ts`.

- Authentication precedes rate limiting/provider work (`capture.ts:27–46`, `740–803`).
- A persistent per-user 30-request/hour limiter fails closed on limiter-store failure (`capture.ts:27–46`, `764–798`).
- Image signatures, declared MIME type, base64 shape, and 9 MiB size are checked (`capture.ts:202–216`). Audio is bounded by `MAX_AUDIO_BYTES` (`capture.ts:142–146`; route handling later in the same file).
- Barcode matching permits only exact digits or the lossless 12-digit UPC-A / leading-zero 13-digit EAN relationship (`capture.ts:224–242`). Open Food Facts, FatSecret, and USDA paths retain exact provider identity checks (`capture.ts:304–460`).
- Auto/barcode/food/receipt/nutrition-label/text/voice branches select bounded provider operations and return explicit unavailable/unknown/failure states rather than fabricating a product (`capture.ts:801–1069`).
- Successful candidates are persisted as a server-issued review session through a verified database identity and atomic session/candidate write (`capture.ts:64–133`).
- Approval is owner-scoped and idempotent (`capture.ts:667–740`).

### Review and persistence

`artifacts/calora/lib/captureReviewTransitions.ts:91–175` builds an immutable nutrition snapshot on approval, maps provenance (`verified_barcode`, provider/label, photo estimate), and rejects approval when no component is included. Related client modules and tests cover acceptance serialization, account-scoped approval acknowledgement, cleanup, deadlines, and concurrent acceptance.

## Automated/source evidence found

The repository contains the following focused suites; they were inspected but not executed during this read-only certification:

- `artifacts/calora/lib/__tests__/scanScreen.test.ts`: camera/image/analysis deadlines, preview recovery, picker lifecycle, manual-photo-vs-barcode race, Auto contract, serving validation, Barcode photo fallback, authentication recovery, stale endpoint behavior, and Voice permission/duplicate-recording behavior.
- `artifacts/calora/lib/__tests__/captureReview.test.ts`: provenance mapping, review acceptance/rejection, nutrition snapshots, serving and component edits, no silent diary insertion, accessibility-label invariants, Voice contract, Barcode deep-link, CameraView race ordering, library recovery, and durable acceptance.
- `artifacts/calora/lib/__tests__/captureRequest.test.ts`: identity-bound token retrieval and 401 refresh behavior.
- `artifacts/calora/lib/__tests__/captureFlow.test.ts`: stale completion suppression, cancellation, error classification, and app-state interruption policy.
- `artifacts/calora/lib/__tests__/captureDeadline.test.ts`: timeout, timely result, and late-result suppression.
- `artifacts/calora/lib/__tests__/captureArtifactCleanup.test.ts`: deletion limited to app-owned capture/cache artifacts.
- `artifacts/calora/lib/__tests__/captureAcceptanceCoordinator.test.ts` and `captureAcceptancePersistence.test.ts`: concurrent acceptance serialization and immediate-remount durability.
- `artifacts/calora/lib/__tests__/captureApprovalSync.test.ts`: account-scoped approval acknowledgement and transient retry.
- `artifacts/calora/lib/__tests__/foodMemory.test.ts`: barcode serving scaling, capture metadata, provenance, image retention, draft conversion, and review-question behavior.
- `artifacts/api-server/src/__tests__/capture.test.ts`: HTTP-level authentication, rate limiting, image/audio/input validation, provider branches, barcode identity/fallback, failure responses, persistence behavior, and approval compatibility.
- `artifacts/api-server/src/__tests__/capture.persistence.integration.test.ts`: disposable PostgreSQL rollback test. It is gated by `isDatabaseIntegrationTestEnabled()` and is skipped without the database integration environment; the file itself explicitly requires `DATABASE_URL` when strict rollback verification is requested.
- `artifacts/api-server/src/__tests__/sync.integration.test.ts` and `tenant-isolation.integration.test.ts`: capture-backed approval/sync and foreign capture-session rejection under integration fixtures.

Historical reports record broad passing counts, including `227_CALORA_AUTO_BARCODE_CAPTURE_REMEDIATION_AND_RELEASE_REPORT.md` (focused Scan/review contracts 87 passed; full client 1,760 tests) and `12-m318-auto-scan-camera-stability-2026-11-01.md` (focused Scan/flow/request 31, API capture 62, full client 1,938). These are historical claims, not newly executed evidence for SHA `7a56ffb7…`, and are not promoted to current native certification.

## Historical evidence reconciliation

1. `227_CALORA_AUTO_BARCODE_CAPTURE_REMEDIATION_AND_RELEASE_REPORT.md:7–18, 42–81` documents the Auto barcode source repair and explicitly marks fresh physical Auto testing **BLOCKED** because the installed APK contained an older JavaScript bundle. It requires a fresh explicitly authorized Android build/install.
2. `218_CALORA_ANDROID_CAPTURE_RACE_REMEDIATION_REPORT.md:7–16, 54–85` documents a real CameraView/CameraX race on a Galaxy S21 Ultra and marks post-fix device retest blocked pending a new authorized native artifact. This is useful root-cause evidence, not current proof for the mandated S20.
3. `226_CALORA_GALAXY_BARCODE_PHYSICAL_RETEST_AND_PROVIDER_COVERAGE_REPORT.md:7–18, 19–50` records a real Galaxy S21 Ultra Barcode detection and safe “Barcode not found” result, with historical production requests. It is on the wrong device relative to the framework’s explicit “Samsung Galaxy S20 only” rule, and its source/production provenance is older than the inspected SHA.
4. `docs/certification/2026-11-07/18_S20_AUTOSCAN_PHYSICAL_VERIFICATION_PROCEDURE.md:1–46` is a procedure, not execution evidence. It requires an installed APK containing the remediation commit, exact S20 identity, screenshots, redacted logs, and ready/error/retry states.
5. `docs/qa/CALORA_ANDROID_QA_COVERAGE_MATRIX_V2.md:15, 24–29` explicitly marks Scan inputs **BLOCKED** until a physical camera session and identifies the S20 as the primary device; the S21 is not to be assumed.
6. `docs/master-mission/02-platform-evidence.md:1–5` states that no signed Android/iOS binary, emulator, simulator, or physical device was available for the relevant mission and that camera, microphone, barcode/photo picker, and native execution remain blocked/not tested.
7. `docs/certification/2026-11-08/54_MISSION_428_CALORA_FINAL_AUTONOMOUS_LAUNCH_COMPLETION.md:49–57` reconciles capture/barcode/label/voice as source/unit PASS with native proof blocked. This remains consistent with the current discovery.

The historical source reports also conflict in places with the current implementation (for example, older Auto descriptions mention a second native photo capture, while current `scan.tsx:585–597` uses direct barcode lookup). Per the framework, older reports cannot override current source or establish current-build evidence.

## Missing evidence and release gates

The following evidence is required before upgrading the cluster to VERIFIED:

- A current signed Android artifact whose bundle/source identity is traceable to `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8` or a later reviewed descendant, with explicit authorization for the native build/install.
- Samsung Galaxy S20 execution, not S21/S21 Ultra: cold entry, camera permission allow/deny/settings recovery, ready preview, Auto barcode, dedicated Barcode, Food photo, Label, Library, rapid mode change, background/resume, bounded timeout, Retry, and no duplicate submissions. Capture screenshots, redacted logcat, device model, app version, build ID, and exact source provenance.
- Current iOS internal/TestFlight execution for camera, photo library, microphone, permission denial, interruption/resume, review, and retry, with exact build/source identity. No iOS native claim is supported by this sandbox.
- Real provider evidence: authenticated capture request and response for a verified barcode, an unknown barcode, food photo/label analysis, and voice transcription, including provider/source labels and timeout/error behavior. Historical health or public endpoint checks do not prove these flows.
- Current Railway serving SHA and environment/provider configuration provenance for the API handling the capture request. Historical Railway attestations in reports 226/227 are stale relative to the inspected SHA.
- Disposable PostgreSQL integration execution for capture persistence/rollback if required by the release gate, plus current production schema/role/RLS evidence for capture sessions, candidates, approval, and diary sync. Do not use customer data.
- Authenticated acceptance/sync evidence across restart, retry, offline/reconnect, and a second synthetic device/session. Source/unit evidence is not a substitute for this.
- Native accessibility and interaction evidence for camera/microphone permission sheets, keyboard/text editing, large fonts, screen reader, rapid taps, back navigation, and reduced motion.

No new native build, provider call, database operation, deployment, or production mutation was attempted because the assigned task was read-only and the framework explicitly restricts additional native/build/provider actions without separate authorization.

## Final verdict

**Overall capture-inputs cluster: PARTIAL.**

The current SHA has a coherent, security-conscious implementation and extensive source-level regression coverage. The previously documented Auto routing and Android shutter-order defects appear repaired in source and are covered by static/unit contracts. Nevertheless, the required genuine user-success evidence is incomplete: current Galaxy S20 native execution, iOS execution, microphone/camera permission behavior, live AI/barcode/transcription provider results, current serving provenance, and production-grade persistence/sync are not demonstrated. Keep CAL-QA-07, CAL-QA-08, CAL-QA-09, and directly dependent capture gates at **PARTIAL/BLOCKED pending the evidence above**; do not report the cluster as VERIFIED or production-certified.
