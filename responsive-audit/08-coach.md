# Calora Coach — source-level forensic audit

**Surface:** Calora Coach (`/coach`)
**Audit boundary:** source and existing tests only; no build, native run, production data, or external mutation.
**Prior reports consulted:** Report 214 (2026-10-14) and Report 220. Report 214 explicitly marks Coach account history/delete/copy as blocked in live validation and records guest entry/new-chat/menu/input/suggestions as passing; this audit does not re-label those blocked runtime journeys as newly verified. Report 220 concerns Plan/Today and Progress viewport remediation and contains no Coach defect.

## Scope and route map

- Root stack registers `coach` as a headerless standalone route in `artifacts/calora/app/_layout.tsx:375-383`.
- Home and Scan enter it with `router.push('/coach')` (`artifacts/calora/app/(tabs)/index.tsx:1791-1792`, `artifacts/calora/app/(tabs)/scan.tsx:787-788`). The Coach screen's `AppHeader back` uses `router.back()` when possible and falls back to `router.replace('/(tabs)')` (`artifacts/calora/components/AppChrome.tsx:29-42`).
- Coach uses server-owned V2 APIs for current conversation, settings, list/open/new/clear/delete, send, and report. Guest state is intentionally ephemeral; signed-in state loads account history and personalization settings.

## Audited components

- Coach route/navigation and back behavior
- Header new-chat and main-menu controls
- Account saved-chat list, reopen, single deletion, clear-history, and new-chat confirmation flows
- Guest versus signed-in empty states
- Composer, send behavior, keyboard avoidance, safe-area and tab-bar spacing
- Transcript `ScrollView`/`KeyboardAwareScrollViewCompat` layout and auto-scroll
- Assistant copy/report actions and accessibility labels
- Loading, request-in-flight, empty, notice/error, and API failure states
- Confirmation, settings, and report modals
- Existing Coach source-contract tests and API chat endpoint behavior

## Confirmed source findings

### C1 — Opening a saved chat leaves the old transcript visible while the new chat is loading or fails
**Evidence:** `openSavedChat` sets `isManagingChat`/`isLoadingHistory` but does not clear `turns` before awaiting `openCoachV2Conversation` (`artifacts/calora/app/coach.tsx:310-333`). The transcript renders existing `turns` independently of `isLoadingHistory` (`:477-579`), so a user can see the previously active conversation under “Loading your conversation…”. On failure, the catch sets a notice but leaves the previous transcript in place. This is a confirmed state-integrity defect, not merely a visual risk: content from chat A remains presented after the user selected chat B.

**Repair:** clear or replace the transcript with a dedicated loading/skeleton state immediately on selection, retain the previous transcript only if explicitly labeled as stale, and clear it on failure (or provide a clearly scoped “could not open; previous chat retained” message). Add a test that selects an archived chat, asserts old turns are not rendered during loading, and asserts failure cannot be mistaken for the requested chat.

### C2 — Coach has no streaming implementation or intermediate streaming state
**Evidence:** the client calls one promise-returning `sendCoachV2Message` and appends the assistant turn only after it resolves (`artifacts/calora/app/coach.tsx:159-225`). The server endpoint is JSON request/response (`artifacts/api-server/src/routes/coachV2.ts:322-428`), calls the provider to completion, persists a completed turn, then returns JSON; there is no SSE/fetch stream or chunk state. The only in-flight UI is a generic `isSending` “Coach is thinking…” card (`coach.tsx:581-596`). This is confirmed as an absence relative to the requested streaming-state audit; runtime testing cannot prove streaming because the source/API do not implement it.

**Repair:** either document and test this as intentionally non-streaming, or introduce an explicit streaming contract (SSE/fetch reader), partial assistant content, cancellation, completion, timeout, and error states. Do not label a request-level spinner as streaming.

### C3 — Several interactive targets are below the usual 44×44 native target
**Evidence:** assistant Copy/Report controls use padding 6 and a 13px icon/10px label (`coach.tsx:520-573`, styles `:1259-1269`), likely producing a target materially below 44px high. Saved-chat delete is explicitly `42×42` (`:1400-1406`). Menu close is `34×34` (`:1363-1369`), and header icons rely on `hitSlop` rather than a visually/layout-sized target (`:368-383`). Confirm buttons are 42px minimum height (`:1456-1463`); report-reason buttons have padding but no min height (`:1270-1275`). This is confirmed from source dimensions for the 42/34 controls and a strong source-level touch-target defect for compact response actions; hitSlop improves acquisition but does not make the visible control or adjacent spacing robust at accessibility settings.

**Repair:** give every action a minimum 44×44 layout box (including copy/report, delete, close, header actions, and report reasons), preserve icon/text alignment, and test adjacent controls for accidental activation.

## Responsive and functional risks requiring runtime verification

1. **Keyboard double-handling risk:** Coach wraps the page in React Native `KeyboardAvoidingView behavior="height"` (`coach.tsx:359-362`) while the transcript is `KeyboardAwareScrollViewCompat`, which uses `KeyboardAwareScrollView` on native and a plain `ScrollView` on web (`components/KeyboardAwareScrollViewCompat.tsx:11-41`). The composer is a non-absolute dock with bottom safe-area padding (`coach.tsx:640-648`). This may be correct, but native iOS/Android must verify no double resize, jump, obscured last message, or excessive blank space. Web uses the height KAV branch but a plain ScrollView, so verify viewport resize behavior separately.
2. **Tab-bar overlap boundary:** Coach is a root stack route, not a tab screen, and therefore does not inherit the tab bar directly. Its transcript bottom padding is `insets.bottom + 24` and composer adds `insets.bottom + 8` (`coach.tsx:387-395`, `640-648`). Verify on devices with gesture/home insets and on web; do not assume Report 220's viewport conclusions apply here.
3. **Auto-scroll behavior:** a `requestAnimationFrame` calls `scrollToEnd` whenever `turns.length` or `isSending` changes (`coach.tsx:152-157`). Verify that a user reading older content is not forcibly pulled to the bottom when sending/loading changes, and that the keyboard does not race the scroll.
4. **Long text/layout:** assistant bubbles have `maxWidth: "92%"`, and menu sheet is `width: "86%", maxWidth: 390` (`coach.tsx:1251-1256`, `1344-1353`). Verify long localized strings, large font scale, narrow web widths, and long saved-chat previews; the preview has one-line truncation, but buttons and modal copy need runtime inspection.
5. **Modal accessibility/focus:** modals set `accessibilityViewIsModal` on ordinary `View`s but do not declare dialog roles, accessible titles, or initial focus (`coach.tsx:695-715`, `1009-1024`, `1125-1139`). Verify VoiceOver/TalkBack focus trapping, escape/back dismissal, announcement of titles, and focus return. This is a risk because React Native platform behavior varies.
6. **Loading/error semantics:** initial history load catches the combined conversation/settings/list request and shows a notice while the empty welcome/suggestions can still render after loading ends (`coach.tsx:130-149`, `404-475`). Verify users understand that history failed rather than assuming the account has no history. Send failures append the user turn before the request and leave it in the transcript (`:197-221`); verify whether retry/duplicate semantics are acceptable.
7. **Concurrent action boundaries:** controls disable based on `isManagingChat`/`isSending`, but settings update and report submission have separate flags. Verify rapid menu close/open, report submission followed by navigation, and account sign-out/account-switch transitions do not display stale data.
8. **Copy success contract:** `copyCoachResponseText` sanitizes rendered assistant text and calls `setStringAsync`, while the screen always treats resolution as success (`lib/coachClipboard.ts:12-22`, `coach.tsx:523-530`). Verify platform clipboard permission/return-value behavior; the helper ignores a resolved `false` boolean, so a platform that returns false without rejecting could produce a false “copied” notice.

## Existing test coverage

- `artifacts/calora/lib/__tests__/coachV2Screen.test.ts` is a source-contract suite. It covers API selection, local-date forwarding, diary reconciliation, guest/account separation, personalization and clear-history copy, formatting boundaries, account switching reset, archive/new-chat flow, list/reopen, single deletion, copy/report wiring, menu affordance, and keyboard-resized layout (`:15-158`).
- `artifacts/calora/lib/__tests__/coachClipboard.test.ts` covers the clipboard helper separately.
- `coachV2Screen.test.ts` does **not** render the screen and does not exercise actual navigation, modal focus, touch dimensions, safe areas, ScrollView behavior, loading transitions, API failures, keyboard behavior, streaming, or accessibility tree.
- The API endpoint is a single JSON response path (`coachV2.ts:322-428`); no streaming test exists or is applicable to the current contract.
- Report 214 records broad UI suite success and Coach guest entry/new-chat/menu/input/suggestions pass, but explicitly marks signed-in history/delete/copy as blocked. That is prior evidence, not replacement for the missing runtime journeys.

## Recommended repair priority

1. **P0/P1:** fix stale transcript on saved-chat open/error (C1) and add a rendered transition test.
2. **P1:** decide/document streaming versus non-streaming product behavior; if streaming is required, add a transport and explicit partial/cancel/error states.
3. **P1:** normalize all compact actions to 44×44 minimum targets and add accessibility-size/adjacency assertions.
4. **P1:** add real component/integration tests with mocked API for initial-load error, open-chat loading/error, new-chat archive, single delete isolation, copy false/reject, send failure, and account switch.
5. **P1:** run authorized native iOS/Android keyboard and screen-reader verification, including small screens, large font scale, gesture insets, and both dark/light themes.
6. **P2:** improve modal dialog semantics/focus management and clarify the history-load failure state.

## Verification plan

- Static: retain source-contract checks but add assertions for immediate loading-state transcript replacement, target minimums, and explicit streaming/non-streaming decision.
- Component: mock Coach APIs and test guest and signed-in flows, including list/open/delete/new/clear, confirmation cancellation, API 409/429/503, clipboard rejection/false, and stale-data isolation.
- Native: on Android and iOS, open Coach from Home and Scan, exercise back fallback, type with keyboard open, send long text, inspect last-message visibility and composer movement, rotate/resize if supported, and test gesture-safe areas.
- Accessibility: VoiceOver/TalkBack traversal for header, menu, saved-chat rows, delete, confirmation/report modals, copy/report, composer and send; verify labels are unique enough to identify the selected saved chat.
- Responsive: narrow phone, web narrow viewport, large text/accessibility font scale, long localized strings, empty/history-error/long transcript states; verify no horizontal overflow and no tab/home-indicator overlap.
- Streaming decision: if non-streaming is intentional, rename/document the state as request loading and test timeout/error; if streaming is required, test first chunk, multiple chunks, cancellation, provider failure, and completion persistence.

## Conclusion

Coach has a coherent route and account/guest separation, and the existing source-contract tests cover many intended handlers. The two clearest newly actionable source findings are **stale transcript presentation while opening a saved chat** and **no actual streaming state despite a streaming-focused audit requirement**. Compact controls also fail or approach common native touch-target guidance. Keyboard, safe-area, modal-focus, long-content, and clipboard-return behavior remain runtime risks because the repository's Coach test is source inspection rather than rendered/native interaction testing.
