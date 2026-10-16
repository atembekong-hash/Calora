# Audit 11 — Restaurants and restaurant search

**Surface:** Restaurants and restaurant search (search, results, detail/review sheet)

**Scope boundary:** Source and existing tests only. No build, native run, production mutation, or runtime visual test was performed. Reports **214** and **220** were used only as prior-state context; their already-documented authentication/native viewport limitations are not re-filed as new defects.

## Executive summary

The surface is structurally coherent: `/restaurants` is a registered Expo Router route, both Today and Scan provide labeled entry points, search and detail each have a single intended scroll owner, the detail sheet has a safe-area-aware height cap, and logging is fail-closed until a successful nutrition-complete detail response is available. Restaurant imagery is intentionally a bundled category illustration with explicit representative/no-verified-photo disclosure rather than an unverified provider photo.

Two source defects are confirmed:

1. **Search and provider-status error cards have no retry action**, although the API explicitly returns transient 429/503 states and the query opts out of React Query retries. A user must edit the query or leave/re-enter the surface to recover.
2. **The detail sheet renders two separate handle bars**: `BottomSheetFrame` owns an accessible handle and `restaurants.tsx` adds its own `sheetHandle`. This is a duplicated visual affordance and creates an accessibility/gesture ambiguity.

There are also responsive/functional risks requiring runtime validation, especially long localized/provider strings, large text, narrow widths, keyboard/detail-sheet interaction, and whether the apparent detail fallback is sufficiently clear while the detail request is failing.

## Audited components and source paths

- `artifacts/calora/app/restaurants.tsx` — search debounce, authenticated query gating, result cards, detail sheet, serving/meal controls, retry/log actions, safe-area and keyboard props.
- `artifacts/calora/components/BottomSheet.tsx` — modal frame, 96% max-height, safe-area bottom padding, backdrop dismissal, pan-down handle.
- `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx` — native `KeyboardAwareScrollView` branch and web `ScrollView` branch.
- `artifacts/calora/components/RestaurantCategoryIllustration.tsx` — deterministic bundled illustration and disclosure/accessibility labels.
- `artifacts/calora/app/_layout.tsx` — `/restaurants` stack registration (line 384).
- `artifacts/calora/app/(tabs)/index.tsx` — Today Restaurants entry and date handoff.
- `artifacts/calora/app/(tabs)/scan.tsx` — Scan Restaurants entry and date handoff.
- `artifacts/api-server/src/routes/restaurantFoods.ts` — auth/rate limit, 400 validation, provider error/restricted states, list/detail routes.
- `lib/api-client-react/src/generated/api.ts` — generated list/detail query hooks and sourceId detail parameter.
- `artifacts/calora/lib/restaurantFoodReview.ts` — review-state gate.
- `artifacts/calora/lib/restaurantFoodImageSelection.ts`, `restaurantFoodImages.ts` — image category/asset policy.
- `artifacts/calora/lib/__tests__/restaurantFoodScreen.test.ts`, `restaurantFoodImages.test.ts`, `restaurantFoodReview.test.ts` — existing focused coverage.
- `artifacts/calora/server/serve-web.test.cjs` — direct `/restaurants` web-route rewrite coverage.

## Source flow inventory

### Navigation and handlers

- Today `openRestaurants` pushes `{ pathname: '/restaurants', params: { date: selectedDate } }`.
- Scan's `Search restaurant foods` Pressable pushes `/restaurants` with `entryDate` and is disabled during capture work.
- Screen back uses `router.back()` if possible, otherwise replaces `/(tabs)`.
- Unauthenticated users receive a labeled `Sign in` action to `/auth/sign-in`.
- A result Pressable sets `selectedFood`; selecting a new result opens the same detail sheet.
- Sheet close is available through close button, backdrop, Android modal request close, and the shared pan-down gesture.
- `Review for <meal>` creates a review draft and replaces into `/(tabs)/scan` with `date` and `draftId`; it is disabled unless `restaurantFoodReviewState` is `ready`.

### Search controls and query behavior

- `query` is debounced 350 ms into trimmed `searchQuery`.
- Search is enabled only for an authenticated session and at least two characters.
- The request is limited to 20 items, offset 0, and has `retry: false`.
- Popular-chain Pressables set both query states immediately.
- Clear resets both states.
- `returnKeyType="search"` is present, but there is no `onSubmitEditing`; the return key does not provide a distinct immediate-submit path.

### Results/detail and scrolling

- The main surface uses `KeyboardAwareScrollViewCompat` with `keyboardShouldPersistTaps="handled"`, iOS interactive dismissal / Android on-drag, and bottom offset `insets.bottom + 72`.
- Results are mapped inside that ScrollView rather than a FlatList; there is no pagination/infinite-load affordance and the request is explicitly offset 0.
- Popular chips and serving chips use horizontal ScrollViews without indicators.
- Detail is a `BottomSheet` containing a second keyboard-aware vertical ScrollView. `BottomSheetFrame` owns the modal max-height and safe-area bottom padding.
- The detail request is enabled only while authenticated and a result is selected, has 5-minute stale time, and also uses `retry: false`.

### States

- Auth restoring: spinner.
- Signed out: sign-in card.
- Search fetching: spinner plus “Searching…”.
- Search error: explanatory card only.
- Provider status/restricted/error response: explanatory card only.
- Query under two characters: instructional empty state.
- Zero foods: no-results empty state.
- Detail fetching: spinner, while the selected result remains rendered.
- Detail error: provider note plus a `Retry serving details` Pressable; log/review remains disabled.
- Missing required nutrition: unavailable provider note; log/review remains disabled.

### Images and fail-closed policy

`RestaurantCategoryIllustration` never renders an exact dish photo. It renders a deterministic local gradient/icon category visual and exposes “Representative category illustration — no verified menu photo.” in both visible text and accessibility labels. The review draft records `imageSource: 'restaurant_representative'`, asset identity, and the representative-image assumption. This is a positive fail-closed implementation, not a new defect.

## Confirmed findings

### R-01 — Search/provider errors are unrecoverable in-place (confirmed source defect)

**Evidence:** `artifacts/calora/app/restaurants.tsx:72-75` sets `retry: false`. The `searchResult.isError` branch at lines 255-259 renders only “Search could not connect” and connection guidance; it contains no Pressable/button. The `statusMessage` branch at lines 260-264 likewise contains no retry control. The API route explicitly emits transient access errors (429/503) in `artifacts/api-server/src/routes/restaurantFoods.ts:21-49, 89-94` and provider statuses such as temporarily unavailable/busy in lines 51-86 and 103-107.

**Impact:** A transient network/provider/rate-limit failure leaves the surface stuck in an error state. There is no direct `refetch()` path, and because automatic retries are disabled, editing the same query is the only accidental recovery route. This is a functional and action-affordance defect, not merely a runtime risk.

**Repair:** Add a labeled, minimum-44pt retry Pressable in both the query error and provider status error/restricted states, calling `searchResult.refetch()`. Preserve the current query and show a fetching state while retrying; distinguish restricted/not-enabled from transient failure if retry is not useful. Consider using a stable query key and explicit error status mapping.

**Regression tests:** Assert the search error and provider-status branches render a retry control and that it calls `refetch`; cover 429/503 and restricted responses separately.

### R-02 — Duplicate detail-sheet handle bars (confirmed source defect)

**Evidence:** `BottomSheetFrame` in `artifacts/calora/components/BottomSheet.tsx:85-94` always renders a handle touch target, with accessibility label “Sheet handle” when no pan callback is passed (Restaurants passes one, so it becomes “Swipe down or activate to close sheet”). `restaurants.tsx:306-307` then renders a second `<View style={styles.sheetHandle} />`. The second view is purely visual and is not the shared interactive handle.

**Impact:** The detail sheet shows two stacked handle affordances, wasting vertical space and presenting an ambiguous close gesture. The custom bar is not an accessibility action, while the shared bar is the actual dismiss control.

**Repair:** Remove the local `sheetHandle` view/style from `restaurants.tsx`, or add an explicit shared-frame option if a surface genuinely needs custom handle styling. Keep one accessible handle with one dismissal behavior.

**Regression tests:** A focused source/render test should assert only one handle is present in the restaurant sheet and that the shared close label remains available.

## Responsive risks requiring runtime testing

- **Long names/brands/localization:** Result cards have a compact horizontal row (`resultCard` plus 74px compact illustration, flexible copy, calorie block, chevron). Long provider brand/name/serving strings may compress copy excessively or crowd the calorie/chevron columns. `detailTitle` has no `numberOfLines`/ellipsis. Test narrow phones, long names, and large accessibility text.
- **Disclosure density:** The compact result illustration includes an 8px disclosure text below the 74px canvas inside each result card. On small heights and large font settings this can make cards unexpectedly tall and affect scanability. Verify legibility and card alignment.
- **Horizontal chip reachability:** Popular and serving chip ScrollViews hide indicators and have only right padding. Verify the final chip can be fully reached with touch/keyboard/accessibility navigation and that nested horizontal scrolling does not steal vertical gestures.
- **Detail-sheet keyboard behavior:** The detail sheet uses a second keyboard-aware scroll owner even though it has no TextInput today. Verify sheet height, pan-down gesture, backdrop dismissal, Android back, and focus transitions if future serving/search controls are added.
- **Bottom/tab-bar clearance:** The main content uses `insets.bottom + 28` and keyboard `bottomOffset={insets.bottom + 72}`; the sheet uses the shared frame's `max(insets.bottom + 16, 32)` padding. Verify with devices having a home indicator and with the tab bar visible/hidden across route transitions.
- **Large text / font scaling:** Most labels use fixed sizes and several controls use `minWidth: '46%'`/flex growth. Verify meal chips, provider note, buttons, and the search row at large accessibility sizes; no dedicated restaurant viewport test exists.
- **Web/native branch parity:** The compatibility component chooses native `KeyboardAwareScrollView` except on web. Verify content height and keyboard dismissal on both branches; Reports 214/220 explicitly left native keyboard and native scrolling unexecuted, so this remains a risk rather than a claimed defect here.

## Functional risks requiring runtime or integration testing

- **Return-key search affordance:** `returnKeyType="search"` has no `onSubmitEditing`; test whether users expect immediate search and whether the 350ms debounce is adequate under slow typing/network conditions. Add submit behavior if the affordance is intended.
- **Stale result data during detail failure:** `detail = matchingDetail ?? selectedFood` means a failed detail request still displays list-level nutrition in the detail sheet, while the note says serving details are unavailable and logging is blocked. The fail-closed log gate is correct, but verify that the UI clearly labels the displayed values as provisional/list data and does not imply detail success.
- **Selection race:** `matchingDetail` checks `sourceId`, which protects against a prior detail response being applied to a newly selected item. Runtime test rapid result changes and close/reopen while requests are in flight.
- **No pagination:** The API exposes `nextOffset`, but the screen always requests offset 0 and renders up to 20 items. Confirm that the intended product behavior is a capped first page; otherwise this is a functional completeness risk.
- **Session transition:** `canSearch` depends on `session`, but a session expiry during a request can produce an error card rather than returning to the sign-in state. Test sign-out/session expiry while search and detail requests are active.
- **Provider error semantics:** The list route may return an HTTP-success body with `status: error/restricted`, while detail provider failures are HTTP 502/503. Verify all response shapes map to the intended copy and retry affordance.
- **Review route handoff:** Verify `date` survives Today/Scan entry, selected meal and serving survive the review/approval flow, and closing the sheet before navigation does not leave stale selection state.

## Existing test coverage and gaps

**Covered:**

- `restaurantFoodScreen.test.ts` checks illustration usage in results/details and representative image metadata propagation.
- `restaurantFoodImages.test.ts` covers deterministic category classification, brand-name misclassification resistance, stable asset keys, disclosure text, and unknown asset behavior.
- `restaurantFoodReview.test.ts` covers detail-required review gating, required-macro blocking, and representative image assumptions in the draft.
- `serve-web.test.cjs` checks direct `/restaurants` SPA route rewrite.
- Source-visible tests and API contracts cover route/security behavior, but Report 214 records authenticated populated restaurant search/detail as blocked in live certification.

**Not covered:**

- Rendering or interaction of search input, debounce, clear, popular chips, result Pressables, close/backdrop/pan actions, serving/meal selection, or review button.
- Search `isError`/provider `statusMessage` UI and retry behavior (the missing retry is therefore unguarded).
- Detail retry interaction and stale fallback presentation.
- Safe-area/tab-bar spacing, narrow widths, large text, nested horizontal/vertical scroll behavior, keyboard avoidance, modal height, or native/web branch parity.
- Accessibility state (`selected`, disabled announcements), hit-target dimensions, duplicate handles, and screen-reader traversal.
- Pagination/`nextOffset`, session expiry, rapid selection races, and route date handoff.

## Recommended repair and verification plan

1. Add one reusable search retry action for transient query/provider failures; retain the entered query and expose busy/disabled state during refetch.
2. Remove the duplicate local detail handle and rely on the shared accessible `BottomSheetFrame` handle.
3. Add component-level tests for error branches, retry callback, provider restricted/error copy, detail retry, and one-handle rendering.
4. Add interaction tests for debounce/clear/popular chips, result selection, serving/meal state, close/backdrop/back, and review disabled-until-ready behavior.
5. Add responsive/native matrix checks at narrow width, landscape, large font scale, iOS home-indicator and Android navigation-bar devices; verify all content remains inside the sheet and final horizontal chips are reachable.
6. Test offline, 429, 503, provider restricted, 404 detail, slow detail, rapid reselection, and session expiry. Confirm no logging occurs unless detail is successful and nutrition-complete.
7. Test accessibility with VoiceOver/TalkBack: one sheet-handle announcement, meaningful result/image labels, selected-state announcements for serving/meal chips, clear/retry actions, and disabled review explanation.
8. If immediate keyboard submit is a product requirement, wire `onSubmitEditing` to commit the trimmed query and add a test; otherwise remove/adjust the search return-key affordance.

## Prior-report reconciliation

Report 214 stated that authenticated populated restaurant search/detail and native keyboard/scroll behavior were blocked, and Report 220 concerned Plan/Today and Progress viewport remediation. Those statements are treated as prior coverage boundaries, not new restaurant defects. This audit reports only the source-confirmed restaurant issues above and labels native/responsive observations as risks pending runtime validation.
