# Source-Level Forensic Audit 03 — Recipes Discover, Plus, Create, Saved Recipes

**Scope:** Exactly one user-facing surface: Recipes (Discover, Plus, Create) and saved recipes. This is a source-only audit; no build, native run, production mutation, or unrelated-surface testing was performed.

## Executive summary

The Recipes surface has strong source-level coverage for the previously repaired feed/pagination/image behaviors. Reports **214** and **220** were used as regression context only: Report 214 already records Discover and saved bundled-recipe restoration as passing, and records authenticated Plus/Create and native scrolling/keyboard verification as blocked; Report 220 concerns Plan/Today and Progress viewport remediation, not a new Recipes defect.

The audit confirmed several concrete source defects/risk-worthy contracts in the inspected implementation:

1. **Multiple interactive controls are below the usual 44–48 dp touch-target guidance** (save icon 32, section tabs 36, header saved action 36, AppHeader back 34, detail/stepper controls 34/32). This is a confirmed source-level responsive/accessibility defect, although physical miss rate needs runtime/device validation.
2. **The Discover saved carousel is hard-limited to six cards** (`slice(0, 6)`), so the surface does not expose the complete saved Discover collection even though the dedicated Saved Recipes route does. This is a confirmed functional/product defect if the carousel is intended as a saved-recipe entry point; it is not a pagination bug.
3. **The Recipes screen uses a nested vertical ScrollView inside a custom horizontal `SwipeableSectionPager`, plus nested horizontal category/saved rails.** Source guards exist (`nestedScrollEnabled`, `SwipeGestureExclusion`, `directionalLockEnabled`, bounded `recipeScroll`), but gesture arbitration and scroll-position retention remain runtime risks, especially on Android and small screens.
4. **Create’s keyboard behavior is covered for the personal-recipe edit form via `KeyboardAwareScrollViewCompat`, but the main CreateConcepts controls are rendered inside the section ScrollView and are not themselves wrapped in the keyboard-aware component.** Long prompt/ingredient input at large font sizes therefore needs runtime verification for obscured submit/actions.
5. **Several modal/sheet controls and cards have source accessibility labels, but many touch targets remain undersized and the detail sheet’s complete focus/keyboard behavior is not proven by existing tests.**

## Audited components

- Discover search, category rail, remote/local recipe grid, loading/offline/empty/retry states.
- Discover pagination/pre-fetch handlers and section-specific scroll metrics.
- Plus catalogue, search/filter pagination, cached/restored saved Plus details, retry/error states.
- Create concept modes, ingredient selection, prompt/numeric inputs, generation/loading/error/offline fallback, review and save flow.
- RecipeCard open/save actions, generated-image states, image error/retry/refresh and recycling keys.
- Saved Discover carousel and `/saved-recipes` grouped Discover/Plus/Create shelves, filters, restoration, empty/unavailable states.
- Recipe detail modal/sheets, suggestions, serving/planning/diary/shopping actions, personal recipe edit/delete.
- Section navigation routes, header action, safe-area and tab-bar bottom spacing.
- Pressable/Button usage, accessibility labels/roles/states, platform branches, nested ScrollView layout, modal dismissal, keyboard avoidance.
- Existing source/unit/device tests relevant to this surface.

## Confirmed source findings

### R1 — Touch targets are systematically undersized (confirmed)

**Evidence:**

- `artifacts/calora/app/(tabs)/recipes.tsx:2241-2243`: `headerSavedButton` is `36x36`.
- `artifacts/calora/app/(tabs)/recipes.tsx:2239-2240`: section tabs use `minHeight: 36`.
- `artifacts/calora/app/(tabs)/recipes.tsx:2291`: card save action is `32x32`.
- `artifacts/calora/app/(tabs)/recipes.tsx:2450-2451`: serving stepper buttons are `32x32`.
- `artifacts/calora/app/(tabs)/recipes.tsx:2345` (source style): detail close control is `34x34`.
- `artifacts/calora/components/AppChrome.tsx:60-66`: shared AppHeader back button is `34x34` and therefore affects `/saved-recipes`.

The controls have useful labels (`Open saved recipes`, save/remove recipe, section tab labels, etc.), but labels do not compensate for the physical target size. This is a source defect against common mobile accessibility guidance. `hitSlop` is present on the header saved action and a few links, but not consistently on card save, tabs, stepper, close, or AppHeader back.

**Repair:** use at least 44x44 (or a documented platform target) for the control hit area while keeping the icon visually compact; use `hitSlop` only as a supplemental measure. Add a focused static contract and native accessibility/device test for each action.

### R2 — Discover saved carousel truncates the saved collection (confirmed)

**Evidence:** `artifacts/calora/app/(tabs)/recipes.tsx:2079` renders `savedDiscoverRecipes.slice(0, 6)` in the horizontal saved rail. The route at `artifacts/calora/app/saved-recipes.tsx:326-341` renders the complete grouped collection, but the in-context Discover rail silently omits saved items after six.

**Repair:** either make the six-card rail explicitly a “recent six” affordance with a labeled “View all saved recipes” action, or remove the slice/use a deliberate window with a route to the complete shelf. Add a test with seven saved Discover IDs asserting the expected affordance and no silent omission.

### R3 — Saved source counts can report unavailable remote items while cards are absent (confirmed behavior needing UX repair)

`/saved-recipes` counts IDs from local storage (`savedRecipeIds`) at `artifacts/calora/app/saved-recipes.tsx:222-226`, while `savedRecipes` only includes successfully restored payloads (`:206-216`). When a Discover query fails or a Plus query requires authentication, the source count remains non-zero but `SourceSection` may show a loading/empty/error card (`:120-157`). The code does show reconnect/sign-in messaging, which is good, but the count and visible-card state can disagree and the active filter can show a generic empty state after a failed restoration.

**Repair:** distinguish `saved`, `restored`, and `unavailable` counts in the UI; keep the actionable retry/sign-in state visible for a source with IDs; test partial restoration with one success and one failure.

## Responsive risks requiring runtime testing

- **Nested gesture arbitration:** `renderRecipeSection` uses a vertical `ScrollView` (`recipes.tsx:2039-2073`) inside `SwipeableSectionPager` (`:2125-2137`), while Discover adds horizontal category and saved rails (`:2077-2079`). Android/iOS testing is needed for diagonal swipes, fast flings, and whether a horizontal rail accidentally changes section.
- **Pager scroll-position retention:** the pager retains adjacent panes (`renderWindow={1}`, `nativePaging`, `fillViewport`). Verify switching Discover → Plus → Create preserves each vertical offset and does not trigger duplicate page loads or clamp content on native.
- **Small viewport / large font:** grid cards are fixed at `224` high with `140` image height (`:58-60`, `:2027-ish` call sites); two-line titles and metadata may crowd or clip at large accessibility font scales. Verify 320–360 dp widths and large text.
- **Create keyboard avoidance:** `PersonalRecipeFormModal` uses `KeyboardAwareScrollViewCompat` (`recipes.tsx:1740-1756`), but CreateConcepts itself is within the normal section ScrollView. Verify prompt, ingredient, servings, and minutes fields plus Generate/choice actions remain reachable above the keyboard on iOS and Android.
- **Safe-area/tab-bar edge:** Recipes section ScrollViews use `paddingBottom: insets.bottom + 104` (`:2042`); Saved uses `insets.bottom + 104` (`saved-recipes.tsx:260-263`). Verify the fixed/custom tab bar does not cover the last card/action on devices with gesture insets, keyboard, or unusual tab-bar heights. The source has no shared measured tab-bar height contract.
- **Modal/sheet height and scrolling:** detail, planning, diary, shopping, and create flows use `BottomSheet`; runtime testing is needed for long ingredients/instructions, large font, keyboard open, rotation/window resize, and Android back handling.
- **Image stability:** `RecipeImage` uses `recyclingKey={`${recipe.id}:${recipeImageUrl}`}` and resets failures on identity changes (`recipes.tsx:150-172`), which is a good source safeguard. Verify rapid paging, recycled rows, expired generated-image URLs, account switching, and stale image flashes on native.
- **Touch overlap:** the save Pressable is overlaid on the card open Pressable (`:225-245`). Verify tapping the bookmark never opens detail and that the 32 dp overlay remains easy to hit.

## Functional risks requiring runtime/provider testing

- Authenticated Plus entitlement, provider paging, and image identity remain externally blocked in Report 214; the source has explicit 401/sign-in/retry states but no claim of live entitlement behavior is made here.
- Create authenticated generation → generated image lifecycle → save → reopen → refresh needs an authorized QA account; source tests cover request/error/fallback contracts but cannot prove provider latency or URL expiry behavior.
- Remote Discover pagination requires live/network failure testing despite source-level guards in `recipePagination.ts` and the screen’s `onLayout`, `onContentSizeChange`, `onScroll`, drag, and momentum handlers (`recipes.tsx:2046-2071`).
- Saved remote restoration ordering and mixed local/built-in/remote grouping should be exercised with partial failures and account transitions.
- Native accessibility focus order, VoiceOver/TalkBack announcements for nested tabs/rails/modal sheets, and dynamic type layout are not established by the source tests.

## Exact files inspected

- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/app/saved-recipes.tsx`
- `artifacts/calora/app/(tabs)/_layout.tsx`
- `artifacts/calora/components/AppChrome.tsx`
- `artifacts/calora/components/BottomSheet.tsx`
- `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx`
- `artifacts/calora/lib/recipePagination.ts`
- `artifacts/calora/lib/generatedRecipeImageLifecycle.ts`
- `artifacts/calora/lib/premiumRecipeReliability.ts`
- `artifacts/calora/lib/premiumSavedRecipes.ts`
- `artifacts/calora/lib/__tests__/recipesScreen.test.ts`
- `artifacts/calora/lib/__tests__/recipePagination.test.ts`
- `artifacts/calora/lib/__tests__/premiumSavedRecipes.test.ts`
- `artifacts/calora/lib/__tests__/savedRecipesPremiumReliability.test.ts`
- `artifacts/calora/lib/__tests__/generatedRecipeImageLifecycleScreens.test.ts`
- `artifacts/calora/tests/device/plus-recipes-rapid-scroll.yaml`
- `214_CALORA_FULL_APPLICATION_CERTIFICATION_REPORT.md`
- `220_CALORA_PLAN_TODAY_AND_PROGRESS_VIEWPORT_REMEDIATION_REPORT.md`

## Existing test coverage

- `recipesScreen.test.ts` statically verifies pager contracts, Discover/category/search labels, Create option trays and optional request handling, saved header route, nested saved rail, generated-image failure/recycling protection, Plus detail-image fallback, suggestions (two rows, up to 20 each), Plus pagination loading/error/retry, loading-vs-empty behavior, generated-image pending/failed states, personal recipe edit/delete, routed Discover/Plus failures, bounded recipe ScrollView, and AI nutrition widget integration.
- `recipePagination.test.ts` verifies prefetch threshold, active-section gating, duplicate/in-flight/exhausted cursor protection, and zero-height metric protection.
- `premiumSavedRecipes.test.ts` and `savedRecipesPremiumReliability.test.ts` cover saved Plus restoration/query-state logic.
- `generatedRecipeImageLifecycle*.test.ts` cover lifecycle and screen-level image-state contracts.
- `plus-recipes-rapid-scroll.yaml` covers authenticated native rapid scrolling, grid retention during pagination, conditional loading/error/retry nodes, and append behavior; it requires a signed-in Plus QA account.
- Report 214 records the broader UI suite passing (1,736/1,736 at report time), but explicitly marks authenticated Plus/Create and native scrolling/keyboard journeys partial/blocked. Report 220’s 1,747-test suite and viewport changes are unrelated to Recipes and were not reclassified as Recipes defects.

## Recommended repairs and verification plan

1. Increase all actionable hit areas to >=44 dp (card save, tabs, header/back, close, stepper, filter/category chips), retaining compact visuals; add static dimensions and TalkBack/VoiceOver tests.
2. Replace the silent `slice(0, 6)` with an explicit recent-six contract plus “View all saved recipes,” or render/paginate the full rail; add a seven-item regression test.
3. Add explicit unavailable/restored counts and source-level retry/sign-in actions when saved IDs exist but payloads are missing; test mixed success/failure restoration.
4. Add a keyboard-aware wrapper or verified keyboard inset behavior around the CreateConcepts input/action region, then test long prompt/ingredients at large text sizes on both platforms.
5. Exercise native gesture cases: horizontal rail swipes, diagonal swipes, rapid vertical pagination, section switching, and retained offsets; assert no duplicate pages and no parent pager hijack.
6. Run responsive matrices at 320/360/393/430 dp widths, large accessibility font scales, top/bottom safe-area variants, and keyboard-open states. Confirm final cards/actions clear the tab bar.
7. Run authorized Plus/Create QA flows only when an approved account/provider fixture exists: Plus 401/entitled paging, generated-photo expiry/retry, Create generate/save/reopen, account switch, and saved mixed-source restoration.
8. Verify detail sheets with long instructions/ingredients, VoiceOver/TalkBack focus order, Android back, iOS swipe dismissal, and tap separation between bookmark and card-open actions.

No application source was modified. No build or external mutation was run.
