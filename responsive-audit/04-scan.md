# Scan and capture workflows — source-level forensic audit

**Surface:** Scan UI: Auto, Barcode, Library, Voice, Restaurant, camera overlays, permission/error/retry states, picker controls and scrolling
**Repository:** `/home/ubuntu/calora-recipe-infinite-fix`
**Audit boundary:** Source and existing tests only. No build, native execution, production mutation, or unrelated surface testing was performed.

## Scope and source inventory

Audited the Scan tab implementation and its direct layout dependencies:

- `artifacts/calora/app/(tabs)/scan.tsx` — all Scan state, handlers, camera/picker/voice flows, overlays, review modal, accessibility labels, scrolling and styles.
- `artifacts/calora/app/(tabs)/_layout.tsx` — Scan tab route, custom tab button, tab-bar geometry and labels.
- `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx` — web/native keyboard-scroll branch used by Scan.
- `artifacts/calora/components/BottomSheet.tsx` — safe-area/max-height/scroll-owner contract used by the review modal.
- `artifacts/calora/lib/captureFlow.ts` — operation IDs, cancellation, interruption, error classification and retry semantics.
- Existing tests: `artifacts/calora/lib/__tests__/scanScreen.test.ts`, `rootAccessGate.test.ts`, and relevant Scan assertions in `captureReview.test.ts`.
- Reports 214 and 220 were consulted only for prior coverage/limitations. Report 214 explicitly says native Auto, Barcode, Library, Voice, camera background/resume and iOS flows were blocked by the browser/Linux boundary; those are not treated as newly discovered defects. Report 220 concerns Plan/Today and Progress viewport remediation and contains no Scan defect to re-report.

## Executive summary

The source has unusually strong defensive handling around duplicate barcode callbacks, stale async completions, picker-induced Android background transitions, capture deadlines, private temporary artifacts, review-before-log, and accessibility labels. The major source-confirmed Scan defect is the **route-driven Voice launch path**: when Scan is opened with `capture=voice`, the effect waits for `microphonePermission.granted` but does not request microphone permission, so an initially undetermined permission never transitions into recording automatically. Manual tapping Voice does request permission correctly. This is a functional defect in the Add Food/route entry contract, not a runtime-only risk.

Other findings below are deliberately separated into confirmed defects versus risks requiring native/runtime validation.

## Confirmed source defects

### S-01 — route-driven Voice launch can dead-end before requesting microphone permission (medium functional severity)

**Evidence:** `scan.tsx:514-522`:

```ts
const routeRequested = params.capture === 'voice' && !voiceLaunchRequested.current;
const permissionRequested = voicePendingAfterCameraPermission.current && microphonePermission?.granted;
if ((!routeRequested && !permissionRequested) || voiceRecording || captureBusy) return;
if (Platform.OS !== 'web' && !microphonePermission?.granted) return;
...
void startVoiceCapture();
```

The route effect explicitly returns while the permission is not granted. Unlike the manual `onVoicePress` path (`scan.tsx:490-512`), it never calls `requestMicrophonePermission()`. `voicePendingAfterCameraPermission` is declared and read but is never set to `true` in the audited file. Therefore a route such as `capture=voice` with the normal initial `useMicrophonePermissions()` state (`granted: false` or unresolved) does not auto-request permission and does not start recording. The user lands on Scan without the promised auto-start behavior and must discover/tap Voice manually; on a route that is intended to launch Voice this is a broken handoff.

**Repair recommendation:** Make the route effect invoke a single idempotent voice-start coordinator that requests microphone permission when needed, records the pending intent while the permission prompt is in flight, starts only after a granted result, and falls back to the editable transcript/text entry with an actionable message on denial. Keep the existing `voiceLaunchRequested`/in-flight guard so rerenders cannot create multiple recordings. Add a focused test that mocks initial `granted:false`, verifies `requestMicrophonePermission()` is called for `capture=voice`, then verifies recording begins after a granted result; add denial and web cases.

## Responsive risks requiring runtime verification

These are source-observable risks, not claimed confirmed defects without device/font/viewport execution:

1. **Small-width/large-font mode picker risk.** `scan.tsx:860-862` renders four equal `flex: 1` buttons in one row, with icons and labels. At narrow phones, landscape split view, or large accessibility text, labels may compress or wrap unevenly. Verify Auto/Barcode/Food/Label at minimum supported widths and Dynamic Type/font scaling; consider horizontal scrolling or a two-row layout if clipping occurs.
2. **Small-width capture-action risk.** `scan.tsx:863-867` uses fixed widths (92, 68, 110) plus an 18 px gap on each side. The three controls consume about 306 px before container margins. Verify on the narrowest supported device and with large text; the Restaurant label/icon must not clip or collide with the shutter.
3. **Camera overlay text risk.** `scan.tsx:845-853` centers a non-flexing `scanHint` row containing icon plus text. Long localized strings, large fonts, or narrow camera frames may overflow or obscure the viewfinder. Verify all mode hints, receipt hint, RTL/localized strings, and large font settings.
4. **Camera frame fixed-height risk.** `styles.cameraFrame` is a fixed 390 px high (`scan.tsx:911`), while the page is in a keyboard-aware vertical scroll. Verify short-height devices, landscape, split-screen and Dynamic Type: the fixed preview plus actions must remain reachable without the tab bar covering controls.
5. **Review modal height/content risk.** The review modal uses `BottomSheetFrame` and an inner `KeyboardAwareScrollViewCompat` (`scan.tsx:887-895`, `BottomSheet.tsx:36-83`). This is structurally correct (flex-shrink/min-height/max-height and safe-area padding), but verify many candidate components, keyboard-open serving edits, large fonts, and the home indicator. Confirm the inner scroll remains the sole active scroll owner and the Approve/Discard actions are reachable.
6. **Keyboard avoidance risk for text entry.** Scan supplies `bottomOffset={insets.bottom + 80}` and persistent `paddingBottom={insets.bottom + 104}` (`scan.tsx:796-803`), and the review sheet supplies `bottomOffset={80}`. Verify native iOS/Android keyboard behavior, especially when the text field is near the bottom and when the modal is already height-constrained. Web uses the plain ScrollView branch by design (`KeyboardAwareScrollViewCompat.tsx:21-31`), so its behavior should be checked separately.
7. **Tab-bar overlap risk.** The tab navigator uses an absolute tab bar (`_layout.tsx:40-47`), while Scan compensates with `paddingBottom={insets.bottom + 104}`. Verify Android gesture/navigation bars, iOS safe areas, web’s 84 px bar, and the raised custom Scan tab (`_layout.tsx:144-150`) at all relevant heights.
8. **Pressable visual-state/accessibility risk.** Most controls have labels and disabled behavior, but the mode buttons and meal picker use `accessibilityLabel` without an explicit selected/radio state (`scan.tsx:860-862`, `891-892`). Verify screen-reader announcement of the active mode and meal, pressed/disabled feedback, and focus order. This is a runtime accessibility risk rather than a proven visual defect.
9. **Permission-state transition risk.** The initial `!permission` branch shows only an ActivityIndicator (`scan.tsx:776-778`). Verify a slow or permanently unresolved permission hook does not leave users indefinitely without an alternative path, and verify the camera preview remounts correctly after returning from Settings (`AppState` sets `cameraReady(false)` at `scan.tsx:312-321`).
10. **Native picker return/background risk.** The source deliberately exempts an active picker from interruption (`scan.tsx:312-321`, `634-647`) and tests this contract. Verify cancellation, Android picker Activity recreation, iOS picker return, and app backgrounding immediately after selection; ensure a genuine background still cancels the operation and does not leave the UI busy.

## Functional risks requiring runtime or integration verification

1. **Camera mount error recovery is settings-oriented, not restart-oriented.** `onMountError` sets `cameraIssue` and the rendered card offers Settings (`scan.tsx:835-859`), but there is no explicit remount/retry Camera button. Verify whether transient native camera initialization failures can recover by returning to foreground or changing mode; if not, add a Retry/remount action distinct from permission Settings.
2. **Voice recording timeout and stop race.** Voice forcibly stops after 12 seconds (`scan.tsx:447-455`) and the Voice button also calls `stopAndUnloadAsync` (`scan.tsx:524-529`). Verify exactly-once resolver behavior, no duplicate transcript submission, and correct UI text during the timeout/stop boundary.
3. **Voice denial fallback is present only for a user-initiated start.** `startVoiceCapture` handles denial by opening editable text (`scan.tsx:497-502`), but the route-driven path currently never reaches it for an initially ungranted permission (S-01). Verify the repaired route path preserves this fallback.
4. **Barcode matching versus photo fallback needs native/API verification.** Barcode mode submits `{mode, barcode}` immediately, while a deliberate photo is sent as Auto with an optional barcode hint (`scan.tsx:548-564`, `614-623`). Existing source tests cover the contract, but verify duplicate native callbacks, unmatched UPC/EAN, rapid mode changes, and server unavailable responses do not create duplicate drafts.
5. **Auto barcode hint lifetime needs runtime verification.** The hint is cleared before manual capture (`scan.tsx:566-572`) and reset on mode changes, but verify a barcode detected immediately before a Library selection cannot be incorrectly attached to a later selection after picker return.
6. **Library ownership/cleanup needs device verification.** The selected user URI is intentionally not deleted while prepared cache output is tracked (`scan.tsx:655-666`), and owned artifacts are cleaned in `finally`. Verify cancellation, preparation timeout, navigation away, and OS process interruption do not delete user library assets or leave private cache files.
7. **Restaurant route handoff needs runtime verification.** The button routes to `/restaurants` with `date` (`scan.tsx:866`), but this audit did not audit the Restaurants surface. Verify the route opens correctly, preserves date context, and returns without losing an in-progress Scan state; any Restaurants defects are out of scope here.
8. **Review empty/unavailable candidate behavior needs integration verification.** The modal distinguishes `analysis.status === 'unavailable'`; review approval is guarded when all components are excluded (`scan.tsx:891-892`, `696-711`). Verify unavailable results, empty candidate arrays, a failed save, and rejection do not leave stale `analysis`, draft IDs, or busy state after reopen.
9. **Background interruption recovery needs native verification.** The reducer and operation IDs are sound (`captureFlow.ts:41-83`), but confirm interrupted camera, preparation, upload, and voice flows show the expected message and that Retry uses the same safe private input without stale operation results winning.

## Accessibility and interaction audit

- Camera permission has a labeled request/settings action and polite live-region copy (`scan.tsx:66-73`). Camera and analysis errors use assertive live regions (`scan.tsx:857-859`).
- Camera, Library, Restaurant, Voice, Receipt, Type it, text submit, retry, sign-in, result close, meal picker, portion controls, serving input, include/remove, approve and discard controls have explicit labels in source.
- `KeyboardAwareScrollViewCompat` uses `keyboardShouldPersistTaps="handled"`, iOS interactive dismissal and Android on-drag dismissal (`scan.tsx:796-800`), with a separate scroll owner inside the review sheet.
- Confirm with VoiceOver/TalkBack that dynamic status messages, the active mode/meal, disabled states, and the modal’s focus trap/order are announced as expected. The source does not set `accessibilityState={{ selected: ... }}` on mode or meal controls, so this is a concrete test target.

## Existing test coverage

- `scanScreen.test.ts` covers capture/preparation/analysis deadlines, picker background exemption, manual-photo suppression of Auto barcode callbacks, Auto/Barcode fallback contracts, Restaurant button width, authentication recovery, account-bound requests, and stale endpoint no-retry behavior.
- `rootAccessGate.test.ts:90-102` covers synchronous barcode locking before async analysis and disabling duplicate callbacks.
- `captureReview.test.ts:631-688` covers portion labels, serving labels, include/remove and approve/discard labels, real Voice audio/m4a behavior, route Voice source contracts, route Barcode setup, video callback suppression, and native shutter error handling.
- `captureFlow.ts` has source-level reducer/error-classification contracts, but no device-level camera, microphone, picker, keyboard, safe-area, screen-reader, or visual viewport execution is represented in the inspected tests.
- Report 214 records Scan web labels as PASS but explicitly marks Auto, Barcode, Library, Voice, and camera background/resume as native-hardware blocked. This audit preserves that boundary.

## Recommended repairs (priority order)

1. **Fix S-01:** centralize route/manual Voice startup; request microphone permission for `capture=voice` when not already granted, guard the request/recording transition, and preserve denial-to-editable-text fallback.
2. Add a regression test for route Voice with initial ungranted permission, granted result, denial result, repeated rerender, and web behavior.
3. Add a Camera mount-error Retry/remount action if native testing confirms a transient `onMountError` cannot recover through foreground/mode changes; do not replace the Settings action for permanently blocked permission.
4. Add explicit `accessibilityState={{ selected: mode === item }}` to mode buttons and equivalent selected state to meal buttons; verify platform screen-reader behavior.
5. Make narrow-width behavior explicit after runtime testing: allow mode-picker horizontal scrolling/wrapping and/or make hint text flex/shrink with bounded alignment; ensure the three capture actions remain usable at the minimum viewport.
6. Add native integration coverage for picker cancellation/background, app interruption, permission denial/settings return, keyboard-open review editing, voice timeout, duplicate barcodes, and cache cleanup.

## Verification plan

1. Static regression: add the route-Voice permission test and run only the existing Scan/capture test files; do not run a native build.
2. Android device: cold launch `capture=voice` with microphone permission undetermined, deny, allow, stop at <12 seconds, allow the 12-second timeout, and verify editable fallback/transcript behavior.
3. Android/iOS camera matrix: permission allow/deny/permanent deny, Settings return, camera mount error, Auto barcode hint then shutter, Barcode duplicate callback, unmatched barcode photo fallback, Food/Label modes, and foreground/background interruption.
4. Library matrix: select valid image, cancel picker, unsupported/large image, preparation timeout, network failure, retry, navigation away, and verify original library URI is never deleted.
5. Responsive matrix: smallest supported phone, landscape/split-screen, web, Dynamic Type/accessibility font sizes, RTL/localized long strings; inspect mode picker, camera hint, capture action row, status/error banners, tab-bar clearance and scrolling.
6. Review modal matrix: one and many candidates, excluded-all guard, serving TextInput with keyboard, meal selection, approve failure/retry, discard/close, home-indicator safe area, and TalkBack/VoiceOver focus/announcement order.
7. Restaurant handoff smoke check only: tap Restaurants from Scan and verify route/date handoff and return behavior; do not audit or modify the Restaurants surface.

## Verdict

**Source quality:** strong defensive implementation with good async and accessibility fundamentals. **Confirmed new defect:** one route-driven Voice permission/startup defect (S-01). **No confirmed new responsive overflow defect** can be established from source alone; the fixed-width rows, overlay text, safe-area compensation and nested review scroll are prioritized native runtime risks. Report path: `/home/ubuntu/calora-recipe-infinite-fix/responsive-audit/04-scan.md`.
