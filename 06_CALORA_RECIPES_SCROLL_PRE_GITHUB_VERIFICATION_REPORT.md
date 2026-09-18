# Calora Recipes Scroll Pre-GitHub Verification Report

**Date:** September 8, 2026  
**Scope:** Independent verification of the post-Phase-4 Recipes scrolling repair  
**Release/build actions:** None. No GitHub push, Expo/EAS build, republish, DNS, Cloudflare, Supabase, RevenueCat, authentication, deep-link, or production-infrastructure changes were made during this verification.

## Executive summary

The Recipes scrolling repair is present in commit `b12f757` (`Update recipes screen and swipeable tab list functionality with tests`). The repository working tree was clean before this report was created, so the repair is already committed locally but has not been pushed by this verification.

The repair is minimal:

- `RecipesScreen` now gives the Discover/Create vertical `ScrollView` an explicit bounded flex layout.
- The shared `SwipeableSectionPager` now allows its children content and gesture surface to shrink within the available vertical viewport.
- The existing horizontal gesture arbitration and horizontal pager animation were not changed.
- One regression test was added to lock the Recipes scroll-owner contract.

All deterministic checks passed:

- Complete Calora suite: **81 test files passed, 1,181 tests passed**
- Recipes regression suite: **10 tests passed**
- Shared swipe/pager suite: **17 tests passed**
- Calora TypeScript typecheck: **passed**
- API server TypeScript typecheck: **passed**
- API route/security suites: **3 files passed, 56 tests passed**
- Calora static asset security suite: **6 tests passed**
- `git diff --check`: **passed**

## Root cause

The Recipes screen already had a section pager, but the pager's children-mode content wrapper did not participate in the available vertical flex layout. The Discover/Create vertical scroll owner consequently sat inside an unbounded section-pager wrapper. On React Native Web and constrained native layouts, this can prevent the vertical `ScrollView` from receiving a usable viewport height, making long content appear not to scroll or making the scroll owner compete with the surrounding layout.

The Plus catalogue already owned an explicit vertical `ScrollView` with `flex: 1`; the shared pager still needed a bounded gesture/content surface so all three submenu states behaved consistently.

## Exact files changed by the Recipes repair

The exact repair commit changed only these three files:

1. `artifacts/calora/app/(tabs)/recipes.tsx`
2. `artifacts/calora/components/SwipeableTabList.tsx`
3. `artifacts/calora/lib/__tests__/recipesScreen.test.ts`

No unrelated source, configuration, dependency, environment, or infrastructure file was included in the repair commit.

### `artifacts/calora/app/(tabs)/recipes.tsx`

Exact layout change:

```tsx
<ScrollView
  ref={recipesScrollRef}
  style={styles.recipeScroll}
  ...
>
```

Exact style added:

```tsx
recipeScroll: { flex: 1, minHeight: 0 },
```

This is the vertical scroll owner used by the Discover and Create states. Its existing content padding remains intact:

```tsx
paddingBottom: insets.bottom + 104
```

That preserves the existing safe-area and bottom-tab clearance.

The Plus state continues to use its own existing vertical scroll owner:

```tsx
<ScrollView
  testID="plus-recipe-scroll"
  style={{ flex: 1 }}
  ...
>
```

### `artifacts/calora/components/SwipeableTabList.tsx`

Children-mode pager content changed from:

```tsx
<Animated.View style={animatedStyle}>{children}</Animated.View>
```

to:

```tsx
<Animated.View style={[styles.pagerContent, animatedStyle]}>{children}</Animated.View>
```

The shared gesture surface now has:

```tsx
minHeight: 0
```

The new children content wrapper has:

```tsx
pagerContent: {
  flex: 1,
  minHeight: 0,
},
```

The horizontal pager track, animated translation, pan responder, gesture intent checks, gesture exclusion context, item rendering, and page-change behavior were not changed.

### `artifacts/calora/lib/__tests__/recipesScreen.test.ts`

One regression test was added:

```text
keeps every recipe submenu inside a bounded vertical scroll viewport
```

It verifies that the Recipes screen contains both:

- `style={styles.recipeScroll}`
- `recipeScroll: { flex: 1, minHeight: 0 }`

## Recipes verification

### Discover

Verified by source inspection and the Recipes regression suite:

- Discover uses the shared `SwipeableSectionPager`.
- The active Discover content is owned by the Recipes vertical `ScrollView`.
- The scroll owner now has `flex: 1` and `minHeight: 0`.
- The pager's children content wrapper also has `flex: 1` and `minHeight: 0`.
- Existing `onScroll` and `onMomentumScrollEnd` handlers remain attached.
- Existing scroll-position restoration remains in place when switching sections.
- The existing content padding includes `insets.bottom + 104`, so bottom navigation does not make the final content unreachable.
- Short Discover content can remain within the bounded viewport.
- Long Discover content remains reachable through the vertical `ScrollView`.
- Existing horizontal category/card controls remain separate from the vertical owner.

### Plus

Verified by source inspection:

- Plus remains a separate submenu state inside the same section pager.
- Its vertical owner is `testID="plus-recipe-scroll"` with the existing `style={{ flex: 1 }}`.
- Its existing bottom padding remains `insets.bottom + 104`.
- Its pagination/load-more scroll metrics remain attached to the same vertical owner.
- Existing horizontal saved-recipe cards are wrapped in `SwipeGestureExclusion`.
- Loading, restricted, unavailable, empty, saved, and loaded catalogue states remain in the existing Plus rendering path; the repair did not move or remove any of those branches.
- The shared pager's new children wrapper now gives this already-flexed Plus owner a bounded parent surface.

### Create

Verified by source inspection:

- Create remains the third item in the shared Recipes section pager.
- Create content is rendered inside the same bounded Recipes vertical `ScrollView` used by Discover.
- The Create form's multiline inputs therefore remain reachable through the vertical owner.
- Create mode selection and generated-result content were not changed.
- Existing keyboard-aware scrolling remains used for modal/sheet forms.
- Existing content padding preserves bottom-tab and safe-area clearance.
- Short Create states continue to render inside the full-height viewport; long form/result content remains reachable through the outer vertical owner.

## Layout, gesture, keyboard, and safe-area analysis

The repair satisfies the requested layout contracts:

- **Vertical scrolling:** Discover/Create have an explicit flex-bounded scroll owner; Plus retains its explicit flex-bounded scroll owner.
- **Short content:** `flex: 1` fills the available section viewport without forcing a minimum content height larger than the viewport because `minHeight: 0` is explicit.
- **Long content:** The vertical `ScrollView` content container remains unconstrained by a fixed height and retains its bottom padding.
- **Nested gestures:** The shared pager only claims workspace-horizontal swipe intent. Existing `SwipeGestureExclusion` continues to let nested horizontal controls opt out of pager arbitration.
- **Horizontal submenu paging:** The pager track/render-item path, translation calculations, animation settling, and item-width calculations are unchanged. The new `pagerContent` style applies only to the children path.
- **Keyboard/input areas:** The repair does not alter keyboard-aware sheets, input handlers, or form state. Create content remains under the Recipes vertical owner, while sheet forms retain their existing keyboard-aware scroll owners.
- **Bottom navigation:** Discover, Plus, and the existing Recipes vertical scroll owners retain `insets.bottom + 104` bottom padding.
- **Safe area:** No inset calculation was changed.
- **Loading/error/empty states:** No state branches were moved, removed, or made dependent on the new layout style.
- **Platform behavior:** The change uses standard React Native flex/min-height styles and contains no platform conditionals. No Android-only or iOS-only layout path was introduced.

## Shared-component consumers and regression analysis

The modified shared component is `SwipeableSectionPager` in `artifacts/calora/components/SwipeableTabList.tsx`. Current consumers are:

1. `artifacts/calora/app/(tabs)/recipes.tsx`
   - Uses the children path.
   - Receives the intended bounded content wrapper and the Recipes-specific bounded vertical scroll owner.

2. `artifacts/calora/app/(tabs)/insights.tsx`
   - Uses the children path inside its existing outer `Animated.ScrollView`.
   - Existing hidden-section behavior remains `display: 'none'`.
   - Existing chart and nested horizontal controls remain protected by `SwipeGestureExclusion`.
   - No shared pager gesture logic or outer scroll owner was changed.

3. `artifacts/calora/app/(tabs)/profile.tsx`
   - Uses the children path inside its existing outer `ScrollView`.
   - Existing profile section visibility, content padding, and modal/sheet scroll owners remain unchanged.

4. `artifacts/calora/app/(tabs)/planner.tsx`
   - Uses the `renderItem` horizontal day-pager path.
   - The new `pagerContent` style is not used by this path; it continues to use the existing `pagerTrack`.
   - The shared gesture surface's `minHeight: 0` is the only new common style affecting this path, and it does not alter its horizontal track, page width, or touch arbitration.

Additional `SwipeableTabList` usages continue to use the tab-strip component, whose layout styles were not changed.

Regression review found no change that would create:

- blank screens;
- collapsed pager sections;
- excessive height;
- new nested-scroll ownership;
- clipped content;
- changed horizontal page translation;
- changed touch termination behavior;
- a new rendering loop.

The existing shared swipe tests cover horizontal intent, exclusion, and planner pager contracts. There is no separate component-render snapshot suite for `SwipeableSectionPager`; the shared source contract and consumer tests were used instead.

## Deterministic verification

### Complete Calora suite

Command:

```text
pnpm --filter @workspace/calora test
```

Result:

- Vitest: **81 test files passed**
- Vitest: **1,181 tests passed**
- Calora static server security suite: **6 tests passed**
- Failures: **0**

The suite emitted existing React `act(...)` warnings from profile interaction tests and expected network diagnostic output from the API-client test. Neither caused a failure and neither is related to the Recipes repair.

### Recipes regression tests

Command:

```text
pnpm --filter @workspace/calora exec vitest run lib/__tests__/recipesScreen.test.ts
```

Result:

- **1 file passed**
- **10 tests passed**

### Shared pager/layout tests

Command:

```text
pnpm --filter @workspace/calora exec vitest run lib/__tests__/workspaceSwipe.test.ts
```

Result:

- **1 file passed**
- **17 tests passed**

The complete focused combined run was also successful:

- **2 files passed**
- **27 tests passed**

### Typechecks

Commands:

```text
pnpm --filter @workspace/calora run typecheck
pnpm --filter @workspace/api-server run typecheck
```

Result:

- Calora TypeScript typecheck: **passed**
- API server TypeScript typecheck: **passed**

### Relevant server/API security checks

Command:

```text
pnpm --filter @workspace/api-server exec vitest run \
  src/__tests__/universal-links.test.ts \
  src/__tests__/cors-policy.test.ts \
  src/__tests__/public-pages.test.ts
```

Result:

- **3 test files passed**
- **56 tests passed**
- Failures: **0**

These server checks were rerun as a boundary check; the Recipes repair did not modify API server files.

## Phase 4 critical configuration re-verification

Current source configuration remains consistent with the previously verified Phase 4 boundary:

- Production `EXPO_PUBLIC_API_URL`: `https://mycaloraapp.com`
- Auth callback: `https://mycaloraapp.com/auth/callback`
- Android package: `com.etiendem.caloraapp`
- iOS bundle identifier: `com.etiendem.caloraapp`
- Expo scheme: `caloraapp`
- iOS associated domain: `applinks:mycaloraapp.com`
- Android App Links:
  - `https://mycaloraapp.com/invite`
  - `https://mycaloraapp.com/auth/callback`
  - both retain `autoVerify: true`
- No production `api.mycaloraapp.com` reference found in the checked production source/configuration.
- No production `calora.app` reference found in the checked production source/configuration.
- No production localhost or preview URL was found in the checked app/configuration/source paths.
- No secrets or credentials were introduced by the Recipes repair.

The only localhost-style reference found during the broad source scan is the existing internal object-storage sidecar address `http://127.0.0.1:1106/object-storage/signed-object-url` in the API server's server-side route. It is not a mobile production API URL or a client/deep-link configuration value and was not changed by this repair. The `replit.dev` occurrence is an existing explanatory comment in universal-link host handling, not a production endpoint.

## Complete working-tree classification

### A. Previously verified Phase 4 changes

The previously verified Phase 4 implementation and configuration are already part of repository history. The critical files rechecked for regression include:

- `artifacts/calora/eas.json`
- `artifacts/calora/app.json`
- `artifacts/calora/lib/auth.ts`
- `artifacts/calora/lib/api-config.ts`
- `artifacts/calora/lib/referral.ts`
- `artifacts/api-server/src/routes/universal-links.ts`
- `artifacts/api-server/src/lib/cors-policy.ts`

No Phase 4 implementation file is newly modified by the Recipes repair.

### B. Recipes scrolling fix

The repair is already present in local `HEAD` commit `b12f757` and consists only of:

- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/components/SwipeableTabList.tsx`
- `artifacts/calora/lib/__tests__/recipesScreen.test.ts`

### C. Reports

The post-Phase-4 report history includes:

- `05_CALORA_PHASE4_AUTH_DEEPLINK_NATIVE_MIGRATION_REPORT.md`

This verification creates:

- `06_CALORA_RECIPES_SCROLL_PRE_GITHUB_VERIFICATION_REPORT.md`

The Phase 4 reference text under `attached_assets/` is an existing non-runtime project input and was not modified by this verification.

### D. Unrelated or unexpected changes

None found.

Before this report was created, `git status --short --untracked-files=all` was empty. The Recipes repair commit contains no unrelated files. No dependency, workflow, environment, infrastructure, or production configuration changes were made during this verification.

After this report is created, the only expected working-tree addition is this report file itself.

## Blockers

No blocker was found for a controlled GitHub sync of the verified local state.

Native build, Expo/EAS, and real-device validation were intentionally not run because they were explicitly prohibited for this task. This report therefore does not claim a new signed-build or device-level validation; the Phase 4 native-link verification remains the previously completed verification boundary.

## GitHub-sync readiness

The local state is ready for a controlled GitHub sync, subject to the owner/operator performing that sync separately:

- the Recipes repair is minimal and isolated;
- all requested deterministic checks passed;
- the shared pager consumers were audited;
- Phase 4 critical configuration remains unchanged and valid;
- no unrelated working-tree changes were found;
- no push was performed.

## Final verdict

RECIPES FIX VERIFIED — READY FOR CONTROLLED GITHUB SYNC