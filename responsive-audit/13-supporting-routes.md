# Audit 13 — Supporting routes and shared linked elements

**Surface:** Favorites/Saved Recipes, Diary/Today entry points, Search/Restaurants, notifications, legal and support routes, plus shared navigation escape/error routes.

**Repository reviewed:** `/home/ubuntu/calora-recipe-infinite-fix`

**Scope discipline:** This is a source-only audit. No build, native run, production-data access, or external mutation was performed. Report 214 and Report 220 were used only as baseline context. Report 220 already covers the Plan-to-Today diary-date repair and Progress Trends viewport repair; those are not repeated as new defects here.

## Executive summary

The repository does not expose standalone Expo Router routes named `/favorites`, `/diary`, or `/search`. The relevant user journeys are implemented as: `/saved-recipes` (Favorites), Today/Diary UI inside `app/(tabs)/index.tsx`, and `/restaurants` (restaurant/menu search). Notifications and legal/support are Profile-owned bottom sheets/external links in `app/(tabs)/profile.tsx`. The source has generally strong defensive states, safe-area bottom padding, keyboard-aware search/detail sheets, and accessibility labels.

One **confirmed source defect** was found: the restaurant detail sheet's final `Pressable` is labelled “Review restaurant item before logging” and is enabled when review data is ready, but the inspected handler does not complete the advertised review/logging flow: it calls `beginReview`; the source must be runtime-verified to determine whether that callback opens the downstream scan/review route or is a stale/no-op transition. Because the callback is wired, this is best treated as a **functional verification blocker**, not claimed as a proven no-op without runtime execution. The audit therefore records it under functional risk rather than a confirmed production defect.

A second, source-confirmed concern is that the not-found route schedules an automatic redirect after 300 ms while also rendering a “Go home” link. The fallback is present and tested, but a user can briefly see an escape route that is about to be replaced; native/web behavior and deep-link preservation require runtime verification.

## Audited components

- `artifacts/calora/app/saved-recipes.tsx` — saved/favorites shelf, source filters, recipe detail modal, sign-in and Explore escape routes.
- `artifacts/calora/app/(tabs)/index.tsx` — Today/Diary entry points and shared home diary state (reviewed only for this surface; Plan/Progress remediation excluded per Report 220).
- `artifacts/calora/app/restaurants.tsx` — restaurant/menu search, keyboard handling, result/detail sheets, serving/meal controls, retry and review action.
- `artifacts/calora/app/(tabs)/profile.tsx` — notifications inbox sheet, notification actions, legal/support links, Profile pager and modal accessibility.
- `artifacts/calora/app/+not-found.tsx` and `lib/notFoundRecovery.ts` — navigation escape/recovery route.
- `artifacts/calora/app/(tabs)/_layout.tsx` and shared `AppHeader`/`BottomSheet`/`SettingRowPressable` usage — tab-bar and route-level escape conventions.
- Relevant source tests: `savedRecipesScreen.test.ts`, `notificationInbox.test.ts`, `notificationPreferences.test.ts`, `notificationReconciliation.test.ts`, `notFoundRecovery.test.ts`, `tabsLayout.test.ts`, plus `recipesScreen.test.ts` and `homeScreen.test.ts` for linked behavior.

## Findings

### F-01 — Restaurant search review action needs runtime functional verification (functional risk; not confirmed as a defect)

**Source:** `artifacts/calora/app/restaurants.tsx:386-394`.

The final detail-sheet button is labelled `Review restaurant item before logging`, is disabled until `reviewState === 'ready'`, and calls `beginReview`. The surrounding copy says the item is not added until review and the prior state explicitly supports retry. The handler is present, so this is not an unhandled Pressable. However, the advertised action is a cross-route/review transition and source inspection alone cannot establish that the callback produces a visible downstream state, preserves the selected serving/meal, or returns to the diary after approval. Verify on iOS, Android, and web (where supported) with: search, open result, wait for detail, change serving and meal, tap review, approve, cancel/back, and confirm exactly one diary entry.

**Repair if runtime fails:** make the transition explicit and centralized (for example, route to the existing scan/review flow with immutable food/serving/meal parameters), disable while transitioning, and provide an error/retry state if navigation or review creation fails.

### F-02 — External legal/support links have no visible failure handler (confirmed source gap; runtime outcome still needs testing)

**Source:** `artifacts/calora/app/(tabs)/profile.tsx:about-section` (the About array includes Website, Privacy Policy, Legal Center, Terms of Use, and Help & Support); each URL row invokes `Linking.openURL(item.url!)` directly through `SettingRowPressable`.

The rows have labels and external-link icons, but no `try/catch`, disabled/loading state, or in-app error message around `Linking.openURL`. A malformed, unavailable, or blocked URL can therefore leave the user with no feedback or escape route. This is a confirmed source-level resilience gap, not proof that the current URLs are invalid. Test with airplane mode, no browser handler, and each URL on native; verify web behavior separately. Also verify that `URLS.privacy`, `URLS.terms`, `URLS.legalCenter`, and `URLS.support` resolve to the branded routes expected by Report 214.

**Repair:** centralize `openExternalUrl(url, label)` with `canOpenURL`/`try-catch`, show an Alert or inline retry action on failure, and preserve the Profile sheet/page. Add URL-contract tests for every link.

### F-03 — Not-found recovery can replace an escape route before user interaction (responsive/navigation risk; runtime verification required)

**Source:** `artifacts/calora/app/+not-found.tsx:17-27, 37-41`; `lib/notFoundRecovery.ts`.

The screen renders a `Go home` link, but schedules automatic recovery after 300 ms. On web it uses `window.location.replace('/')`; on native it calls router replacement. The behavior is covered by `notFoundRecovery.test.ts` for platform selection and fallback, but not by a real deep-link/navigation test. The redirect may discard a useful deep-link context or make the visible link effectively unreachable. Verify malformed web prefixes, native cold deep links, back-button behavior, and slow startup/auth hydration.

**Repair if reproduced:** defer replacement until root readiness is known, preserve an intentional user-visible fallback for at least one interaction frame, and ensure the escape target is the correct authenticated/guest landing route rather than always `/`.

### F-04 — Notifications sheet is bounded but has no explicit safe-area bottom inset (responsive risk; runtime verification required)

**Source:** `profile.tsx: notificationSheet`, `notificationList`, and notification action styles. The list is capped at `maxHeight: 430`; the action footer uses fixed padding and the BottomSheet owns dismissal. Notification rows have `minWidth: 0`, three-line body truncation, labels, unread state, mark-all-read, and clear-history handlers.

This is structurally good for narrow widths, but the notification sheet/action footer does not itself add `insets.bottom`. Whether `BottomSheet` applies an adequate bottom safe-area inset must be verified on iPhone home-indicator devices and Android gesture navigation. Verify long notification bodies, large text, an inbox with many rows, and the clear/mark-all actions at the lowest supported viewport. If clipped, add bottom inset to the sheet content/action footer rather than relying on the parent.

### F-05 — Saved Recipes route has good bottom clearance and empty/error states; large-text grid remains a runtime risk

**Source:** `saved-recipes.tsx:262` uses `paddingBottom: insets.bottom + 104`; filters are wrapping tab-like Pressables with `accessibilityState={{selected: active}}`; empty shelf, source-empty, reconnect, unavailable Plus, and sign-in states are present. Recipe cards use a two-column grid (`gridCard: width: '48.5%'`).

No confirmed clipping defect is visible in source. At large accessibility font sizes, source labels, card titles, source badges, and the two-column width should be runtime-tested for truncation/overlap. Confirm recipe-detail modal close, edit, image retry, save/unsave, and back behavior on small screens. Recommended test sizes: 320 dp width, largest supported text scale, dark/light themes, signed-out Plus restoration, and offline source failure.

### F-06 — Search route has strong keyboard handling but requires provider/error transition coverage

**Source:** `restaurants.tsx:191-205, 306-395`. `KeyboardAwareScrollViewCompat` uses `keyboardShouldPersistTaps="handled"`, platform-specific dismiss mode, `bottomOffset={insets.bottom + 72}`, and content bottom padding. Search has signed-out, loading, error, unavailable-provider, short-query, empty-result, result, detail-loading, detail-error/retry, serving and meal selection states.

No source defect is confirmed. Runtime coverage should verify keyboard does not cover the query/results or detail-sheet review action; horizontal chain/serving scrollers do not expand page width; returning from detail preserves query and scroll; and rapid query changes do not show stale results. Verify that the review action's downstream handler (F-01) is idempotent.

### F-07 — Diary/Todays surface has no independent route escape contract in this audit

The diary experience is embedded in Today (`app/(tabs)/index.tsx`) rather than a dedicated `/diary` route. Report 220 already documents and remediates the Plan-to-Today date-selection defect; it is intentionally excluded as a new finding. Source/runtime verification should still cover Today’s diary empty/loading/error states, edit/delete confirmation, add-food routes back to Today, tab-bar clearance, and account switching without stale diary flash. The existing diary sync and notification tests cover data helpers, not complete responsive route behavior.

## Confirmed source defects / gaps

1. **External legal/support links lack a visible failure path** (`profile.tsx` About rows call `Linking.openURL` directly). This is a confirmed resilience gap; URL validity and platform launch behavior remain runtime questions.
2. No standalone Favorites/Diary/Search route exists under those names; links must be tested against the actual `/saved-recipes`, Today, and `/restaurants` implementations to avoid route-contract drift. This is an architecture/coverage finding, not inherently a user-visible defect.

## Responsive and functional risks requiring runtime testing

- Restaurant detail review action transition and preservation of serving/meal parameters.
- Notification BottomSheet safe-area clearance at iOS home indicator/Android gesture navigation.
- Notification action reachability with large text and 430 px list cap.
- Saved Recipes two-column grid at 320 dp and largest text scale.
- Recipe detail modal back/close and image retry while offline.
- Search keyboard avoidance, horizontal chips, stale-query race, and detail-sheet scroll-to-action.
- Today/Diary tab-bar bottom clearance and no stale account data after sign-out/account switch.
- Not-found auto-replace behavior for native cold deep links and web reverse-proxy prefixes.
- External URL launch failure and return-to-app behavior for Website, Privacy, Legal Center, Terms, and Support.

## Existing test coverage observed

- `lib/__tests__/savedRecipesScreen.test.ts` and `savedRecipesPremiumReliability.test.ts` cover saved shelf/premium restoration logic but do not constitute native responsive visual coverage.
- `lib/__tests__/notificationInbox.test.ts` covers account scoping, idempotent receipt, mark-all-read, clear, storage failure, and malformed payload handling.
- `notificationPreferences.test.ts` and `notificationReconciliation.test.ts` cover scheduling/preferences/reconciliation logic.
- `lib/__tests__/notFoundRecovery.test.ts` covers web-vs-native recovery selection and router fallback.
- `lib/__tests__/tabsLayout.test.ts` covers tab labels/custom Scan button contract.
- `recipesScreen.test.ts`, `homeScreen.test.ts`, and diary sync tests cover linked data/logic, but not complete route-level responsive interaction.
- No test was found that asserts each legal/support URL is openable with a user-visible failure state, no native safe-area screenshot test was found for the notification sheet, and no test was found for the restaurant detail review transition as a complete user flow.

## Recommended repairs

1. Add a `openExternalUrl` helper with error handling, platform-specific launch checks, and a visible retry/Alert; unit-test all six About URL targets.
2. Add an end-to-end route test for Restaurants: query → result → detail → serving/meal → review → approve/cancel, including retry and duplicate-tap protection.
3. Verify `BottomSheet` safe-area behavior; if not guaranteed, apply `insets.bottom` to notification and other action footers.
4. Add responsive tests/snapshots for Saved Recipes at 320 dp and large text, specifically the two-column card grid and filter wrapping.
5. Add deep-link tests for `/saved-recipes`, `/restaurants`, Today, malformed routes, and authenticated/guest root recovery.
6. Add Today/Diary route-flow tests for loading/empty/error, edit/delete, add-food return, and account-scope reset; do not re-open Report 220’s already-remediated Plan date issue as a new defect.
7. If F-01 fails at runtime, make the review transition explicit, preserve all selected parameters, disable during navigation, and provide a retry/error affordance.

## Verification plan

1. Run focused unit tests for saved recipes, notification inbox/preferences/reconciliation, not-found recovery, tabs layout, and diary/home logic (without changing source).
2. On a 320 dp Android viewport and a small iPhone viewport, exercise Saved Recipes filters, empty/unavailable states, recipe detail close/back, and largest text size.
3. Exercise Restaurants with keyboard open, offline/error/provider-unavailable states, long result names, horizontal chips, detail retry, and complete review/logging flow.
4. Open Notifications with 0, 1, and many long notifications; test mark-all-read, per-item read, clear history, orientation/large text, iOS home indicator, and Android gesture navigation.
5. Open each legal/support row on native and web; test success, no-browser-handler/offline failure, return-to-app, and URL destination identity.
6. Test malformed/deep links and cold starts for web and native, including slow hydration/auth and back navigation.
7. Test Today/Diary add/edit/delete and account switch, while treating Report 220’s Plan-to-Today and Progress viewport changes as existing baseline rather than new defects.
