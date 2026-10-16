# Calora source-level forensic audit — Authentication and onboarding

- **Surface:** Authentication and onboarding
- **Repository:** `/home/ubuntu/calora-recipe-infinite-fix`
- **Audit mode:** Read-only source and existing-test review; no build, native run, mutation, or production-data access.
- **Scope:** Sign-in, sign-up, password recovery/reset, email verification, OAuth/deep-link callback, onboarding, profile handoff, controls, keyboard/safe-area behavior, route gating, loading/error states, and accessibility.
- **Prior-report constraint:** No local artifact named or explicitly identifying Reports 214 or 220 was found during repository search. Findings below are therefore limited to directly observed current source behavior and are not presented as newly discovered versions of any prior report issue.

## Executive summary

The surface is generally structured and has unusually good state-aware routing: Supabase callback handling is centralized, recovery is distinguished from ordinary sign-in, onboarding uses a keyboard-aware compatibility wrapper, and most primary controls expose labels/roles and loading states. Existing tests cover the high-risk navigation contracts and several onboarding accessibility contracts.

The main source-level concerns are **inconsistent safe-area ownership across auth screens**, **incomplete accessibility semantics on several selectable controls**, **back navigation that is not consistently guarded**, and **a callback timeout that schedules a second delayed navigation without cancellation/ownership checks**. These are concrete code risks; visual clipping and keyboard behavior on actual devices remain runtime verification items.

## Audited source and routes

### Authentication routes

- `artifacts/calora/app/auth/_layout.tsx` — auth stack; sign-in, sign-up, forgot-password, reset-password, verify-email, callback.
- `artifacts/calora/app/auth/sign-in.tsx` — Google and email sign-in, forgot-password and sign-up routes.
- `artifacts/calora/app/auth/sign-up.tsx` — email registration, age confirmation, terms/privacy links, verification handoff.
- `artifacts/calora/app/auth/forgot-password.tsx` — reset-email form/success state/resend route.
- `artifacts/calora/app/auth/reset-password.tsx` — recovery session guard, password update, expired-link state.
- `artifacts/calora/app/auth/verify-email.tsx` — confirmation instructions, resend, back-to-sign-in.
- `artifacts/calora/app/auth/callback.tsx` — URL/parameter reconstruction, callback processing, timeout and safe error routing.
- `artifacts/calora/components/AppChrome.tsx` — `AppHeader`, safe-area top inset and guarded fallback back behavior.
- `artifacts/calora/context/AuthContext.tsx` — session restore, auth events, recovery intent, sign-in/sign-up/reset operations.
- `artifacts/calora/lib/auth.ts` and `artifacts/calora/lib/auth-callback-routing.ts` — provider callback and safe error routing.
- `artifacts/calora/lib/postAuthNavigation.ts` — duplicate-transition suppression and auth-stack pruning.

### Onboarding and handoff routes

- `artifacts/calora/app/index.tsx` — seven-step onboarding, local draft persistence, account restore/sign-in handoff, completion gate.
- `artifacts/calora/app/_layout.tsx` — root auth/application gate and post-auth coordinator.
- `artifacts/calora/app/(tabs)/profile.tsx` — profile resume/review onboarding actions and account surface.
- `artifacts/calora/components/auth/AccountSection.tsx` — account/sign-out/deletion actions.

## Confirmed source findings

### C1 — Auth screen safe-area handling is inconsistent

`sign-in.tsx` and `sign-up.tsx` use a full-screen `KeyboardAvoidingView` and `ScrollView`, but their scroll content styles only set horizontal padding (`styles.scroll: { paddingHorizontal: 24 }` in each file); they do not consume `useSafeAreaInsets()` for top or bottom padding. In contrast, forgot-password and reset-password explicitly call `useSafeAreaInsets()` and add `paddingBottom: insets.bottom + 32`, while `AppHeader` owns only the top inset. This is a source-confirmed inconsistency, not proof of clipping on every device. On an iPhone with a home indicator, the final sign-in/sign-up controls can end at the scroll viewport edge; keyboard-open and short-height layouts are especially exposed.

**Repair:** give every auth form the same explicit inset policy: top handled by `AppHeader` where present, bottom `insets.bottom + a design margin` in all scroll content containers; for headerless sign-in/sign-up, also account for `insets.top` (or use a shared auth shell). Add a shared `AuthFormLayout` rather than duplicating platform branches.

### C2 — Selectable sign-up/onboarding controls do not all expose selected state

The sign-up age control is correctly a checkbox with `accessibilityState={{ checked: ageConfirmed }}`. The onboarding consent card is also correctly exposed as a checkbox. However, onboarding activity options (`index.tsx` around lines 486–492) and diet chips (around lines 501–502) are bare `Pressable`s with visual selected styling but no `accessibilityRole`, `accessibilityLabel`, or `accessibilityState={{ selected: ... }}`. This is confirmed from source: a screen-reader user cannot reliably learn which activity/diet is selected or that the controls are selectable.

**Repair:** assign radio-button semantics for single-choice activity and diet groups (or buttons with explicit selected state if the platform component model requires it), stable labels/hints, and group context. Add tests that query each option and assert selected/unselected state.

### C3 — Several back/footer controls rely on implicit or unsafe stack history

Sign-up’s footer uses `router.back()` for “Sign in” (`sign-up.tsx` lines 255–260). Sign-in’s header/back action likewise relies on the shared header’s `router.back()` when history exists. Verify-email uses an explicit `router.replace('/auth/sign-in')`, and reset-password supplies a fallback when `router.canGoBack()` is false. The inconsistent policy means a sign-up route entered directly from a deep link or stale stack can return to an unrelated route rather than sign-in. This is a confirmed navigation contract inconsistency; the exact bad destination requires runtime route-history setup.

**Repair:** use explicit `router.replace('/auth/sign-in')` for terminal auth handoffs, and define a single auth back policy (back only for user-entered nested forms; replace to sign-in otherwise). Add tests for direct-entry/no-history, sign-up-from-invite, and Android system back.

### C4 — Callback timeout can race callback processing and schedule unowned navigation

`auth/callback.tsx` starts a 10-second timeout that marks the callback processed and schedules a delayed replace to sign-in. The processing effect separately schedules delayed navigation for provider errors and exceptions. The timeout is only cleared on component unmount, and the delayed `setTimeout` callbacks themselves are not tracked or cancelled. This is confirmed source behavior. A late URL delivery, component remount, or callback result arriving near the timeout can produce stale navigation after the user has already reached another auth state. The existing `processed` ref prevents duplicate processing in one mount but does not cancel already scheduled delayed transitions.

**Repair:** keep a ref/set of all navigation timers, clear them on unmount and before any terminal transition, and make the terminal transition idempotent through the same coordinator used by root post-auth navigation. Add tests for URL arrival at 9–11 seconds and unmount-before-delay.

### C5 — Error text is not consistently marked as an accessibility alert

Onboarding’s personal-details validation error is explicitly `accessibilityRole="alert"`, but sign-in, sign-up, forgot-password, and reset-password error boxes render ordinary `Text` inside a `View` without alert/live-region semantics. This is confirmed from source. Screen-reader users may not be notified when authentication fails or when an invalid reset email/password is rejected.

**Repair:** mark dynamic error containers/text as `accessibilityRole="alert"` (or platform-equivalent live-region behavior), preserve focus/announcement after submit, and test failed submit flows with accessibility queries.

### C6 — Loading buttons are visually disabled but not uniformly announced as busy

Sign-in, sign-up, resend, and reset controls use `disabled` and replace content with `ActivityIndicator`; onboarding finish uses disabled state for missing consent. However, the auth submit buttons do not consistently expose `accessibilityState={{ busy: loading, disabled: ... }}`. The visual state is confirmed; whether a given screen reader announces the spinner is platform-dependent.

**Repair:** expose disabled/busy state on every async action and provide a stable status announcement (“Signing in”, “Sending reset email”, etc.). Keep the current duplicate-submit guards in handlers.

## Responsive and functional risks requiring runtime verification

1. **Keyboard occlusion on compact devices:** sign-in/sign-up have `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` and a scroll view, but no explicit Android adjustment strategy. Verify Android resize/pan behavior, focus on password fields, and submit-button reachability at 320dp width and short-height devices.
2. **Onboarding bottom action reachability:** `index.tsx` uses `KeyboardAwareScrollViewCompat`, `content` with `flexGrow: 1`, and `bottomActions` with `marginTop: 'auto'`/`paddingTop: 40`. This is likely intentional, but verify that keyboard-aware scrolling can reveal the focused number fields and that the action row does not jump or become covered on iOS/Android.
3. **Onboarding two-column fields:** `halfField: { width: '48%' }` plus a 10px flex-wrap gap should be tested at narrow widths, large font scaling, and RTL. It may wrap acceptably at default typography but is not guaranteed under accessibility text scaling.
4. **Fixed-height onboarding hero:** `photoHero.height = 224` and large title/body typography should be checked at 320dp width, Dynamic Type/accessibility font sizes, and landscape. Text may become visually dense even though the containing page scrolls.
5. **Long localized/error messages:** error boxes generally use `flex: 1`, but no localization/long-string test is present. Verify wrapping and button displacement for long provider errors and translated strings.
6. **Back behavior during loading:** auth handlers disable inputs/buttons but do not clearly disable the shared header back action. Verify whether users can leave during an in-flight sign-in/reset and whether late promises update an unmounted screen.
7. **Deep-link callback UI:** callback uses a centered `View` with padding 24 and no safe-area inset. Verify status text on notched devices, timeout behavior, cold-start Android intent reconstruction, and cancellation.
8. **Profile handoff timing:** root navigation intentionally waits for `applicationReady` before routing to `/(tabs)`; verify cold start after email/OAuth sign-in, incomplete onboarding draft restore, and direct tab URL entry. Source tests cover the coordinator but not the full device route transition.
9. **Email verification link handoff:** verify-email tells users to open the link on their phone; runtime-test same-device universal/app links, browser return, expired link, resend failure, and whether an already-authenticated session is routed correctly.

## Existing test coverage reviewed

- `lib/__tests__/AuthContext.test.tsx` — auth provider/session behavior.
- `lib/__tests__/auth_logic.test.ts` — sign-in/sign-up/reset logic contracts.
- `lib/__tests__/authCallbackRouting.test.ts` — safe callback error categories/routes.
- `lib/__tests__/postAuthNavigation.test.ts` — pending/recovery/ordinary destination resolution and duplicate transition suppression.
- `lib/__tests__/onboardingScreen.test.ts` — keyboard-aware wrapper, safe-area spacing, stable text-field targets, agreement gating, persistence boundary, reduced-motion behavior, sign-in handoff, hydration reset, and tab URL gating.
- `lib/__tests__/profileScreen.test.tsx` — resume/review onboarding paths and profile interactions.
- `lib/__tests__/accountSection.test.tsx` — account deletion timeout and sign-out failure behavior.
- `lib/__tests__/authCallbackRouting.test.ts` and `lib/__tests__/real_auth_simulation.test.ts` — callback/recovery simulation coverage.

**Coverage gaps:** no direct rendered tests were found for sign-in/sign-up/forgot/reset/verify screen layouts; no accessibility assertions for activity/diet selected state or auth error announcements; no timer/unmount race test for callback; no device-level keyboard/safe-area matrix; no direct system-back/deep-link stack-history tests.

## Recommended repair/test plan

1. Introduce a shared auth shell/form layout with explicit top/bottom safe-area policy and consistent `KeyboardAvoidingView` behavior on iOS and Android.
2. Normalize auth navigation: terminal links use explicit `replace`; shared `AppHeader` receives a route-specific fallback; test direct route entry and system back.
3. Add semantic selection state to onboarding activity/diet controls and rendered accessibility tests for all choices.
4. Add alert/live-region semantics and busy announcements to async auth errors/actions; test screen-reader-visible state transitions.
5. Refactor callback delayed navigation into cancellable, idempotent coordinator-owned timers; test timeout, late URL, unmount, cancellation, and duplicate delivery.
6. Run a runtime matrix only after source repairs: iOS/Android, 320dp/375dp/414dp widths, short height, keyboard open, 100–200% font scale, notch/home indicator, cold start, deep link, expired recovery, resend failure, and offline/server error.
7. Verify profile handoff from sign-in, sign-up confirmation, OAuth callback, recovery completion, incomplete onboarding draft, and direct tab URL; confirm no stale auth route remains reachable after terminal transitions.

## Verification acceptance criteria

- Every auth form’s final actionable control remains above the home indicator and is scroll-reachable with the keyboard open.
- Back/continue controls have deterministic destinations for normal, direct-entry, cold-start, and deep-link histories.
- Screen readers announce selected onboarding options, validation errors, and async busy/completed states.
- Recovery links route only to password update; ordinary auth routes never bypass onboarding/application readiness.
- Callback timeout and delayed error navigation cannot fire after unmount, cancellation, or a newer terminal transition.
- Profile resume/review and completed onboarding handoff preserve the signed-in account and do not expose stale auth screens.
