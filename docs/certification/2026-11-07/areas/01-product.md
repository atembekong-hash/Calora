# Calora Autonomous Production Certification Mission
## Domain 01 — Product screens and interactions

**Audit status:** bounded, read-only source/test audit  
**Repository:** `/home/ubuntu/calora-coach-live-main`  
**Audited revision:** `9e7790cffb0cbf8062d1fa198be6e71b76ff5161` (`main`, matching the supplied protected-main baseline)  
**Environment:** Ubuntu sandbox; no production credentials, database, infrastructure, deployment, build, native device, or live account mutation used.

## Scope and method

I inventoried the Expo Router route tree, tab layout, screen source, reusable interactive components, focused Vitest tests, and historical forensic reports. Historical reports were treated as leads only; their PASS statements were not independently promoted to current PASS unless the current protected-main source contract supported them. A focused Vitest invocation was attempted but the sandbox’s workspace-directory guard rejected execution before Vitest started, so this audit records that run as **NOT RUN** rather than inferring a test PASS.

The current route tree is:

- Primary tabs: `Today` (`app/(tabs)/index.tsx`), `Recipes`, `Scan`, `Plan` (`planner`), and `More`.
- Hidden/non-tab tab routes: `app/(tabs)/insights.tsx` (registered with `href: null` and no tab bar), and `app/(tabs)/profile.tsx`.
- Secondary application routes: `saved-recipes`, `saved-meals`, `fasting`, `hydration`, `learning`, `learning/[lessonId]`, `dashboard-layout`, `coach`, `memory`, `progress-insights`, `restaurants`, `profile`, `settings`, `notifications`, and `meal-image-preview`.
- Auth/recovery/invite routes: `auth/sign-in`, `auth/sign-up`, `auth/verify-email`, `auth/forgot-password`, `auth/reset-password`, `auth/callback`, `invite/[code]`, and `encrypted-recovery-preview`; `+not-found` is the fallback.
- The root layout protects onboarding, the tab shell, and secondary application routes behind hydration/profile/account gates. A direct route is not evidence of access without those gates.

## Requirement results

The following 14 bounded requirements were assessed.

| ID | Requirement | Classification | Current evidence and limitation |
|---|---|---|---|
| P01 | Five-tab navigation has the intended order and visible labels | **PASS** | `app/(tabs)/_layout.tsx:76-151` defines Today → Recipes → Scan → Plan → More. The custom Scan button retains `tabBarShowLabel: true`, renders its own label, and has an explicit accessibility label. `lib/__tests__/tabsLayout.test.ts:8-34` asserts order and label-preservation contracts. |
| P02 | Root/tab/secondary route registration and access gates are coherent | **PASS** | `app/_layout.tsx:363-414` registers onboarding, tab shell, and all secondary routes under explicit `Stack.Protected` guards; auth/invite/recovery routes are separately registered. |
| P03 | More screen controls reach their declared destinations | **PASS** | `app/(tabs)/more.tsx:61-214` wires Fasting, Progress, Learning, Calora Pro, Settings, nine quick-access items, Living Memory, Saved meals, and Reminders. The More route contract is covered by `moreScreen.test.tsx`; historical scoped evidence reports seven focused More tests passed, but that historical count is not treated as a fresh run. |
| P04 | Dashboard customization controls have real state transitions | **PASS** | `app/dashboard-layout.tsx:97-246` implements visibility switches, up/down reorder, compact/expanded density, and left/right placement for responsive widgets; each has an accessibility label and calls `updateDashboardPreferences`. `dashboardLayout.test.ts` and `dashboardPreferences.test.ts` are the relevant focused contracts. |
| P05 | Progress/Insights surfaces expose their declared sections and navigation | **PASS** | More’s Progress card routes to `/(tabs)/insights`, while the Quick access `Insights` item routes to `/progress-insights`; the tab layout intentionally hides Insights from the bottom bar. Focused contracts exist in `progressNavigation.test.ts`, `progressScreen.test.ts`, `progressInsights.test.ts`, `progressTrends.test.ts`, and related graph/weight tests. Source includes date-range picker and chart controls. |
| P06 | Learning library and lesson navigation are wired | **PASS** | `app/learning.tsx` provides topic selection, search, saved-only filtering, lesson open/save/complete flows; `app/learning/[lessonId].tsx` provides back/replace, save, CTA, completion, and related-lesson navigation. `learningScreen.test.tsx`, `learning.test.ts`, content-depth, editorial-layout, and photography tests cover source contracts. |
| P07 | Living Memory controls are explicit and guarded | **PASS** | `app/memory.tsx:80-93,310-484` provides correct/edit, save-as-meal, forget, forget-all-stale, undo, correction save/cancel, and confirmation/cancel controls. `livingMemory.test.ts`, `livingMemoryHeader.test.ts`, `memorySections.test.ts`, and `memoryDateHelpers.test.ts` cover the underlying contracts. |
| P08 | Coach entry/menu/new-chat surface is reachable | **PASS (surface only)** | `app/coach.tsx` is registered and More routes to `/coach`; historical read-only web evidence observed the guest Coach entry, menu, input, suggestions, and Start a new Coach chat. Source/test contracts include `coachV2Screen.test.ts`, `guestCoach.test.ts`, clipboard/context/send-adapter tests. Signed-in persistence/delete/copy behavior is not promoted here (P12). |
| P09 | Onboarding, profile/settings, and appearance controls are represented | **PASS (source contract)** | `app/index.tsx` plus `onboardingScreen.test.ts` cover the onboarding flow; `app/settings.tsx` delegates to the profile surface, and `profileScreen.test.tsx` covers You/Membership/Account-oriented settings behavior, goals, appearance, health, reminders, and account UI contracts. Actual device keyboard/font/permission behavior is separately unverified. |
| P10 | Recipes, saved recipes/meals, Plan, and Scan destinations/controls are wired | **PASS (source/regression scope)** | Current routes and controls exist in `app/(tabs)/recipes.tsx`, `saved-recipes.tsx`, `saved-meals.tsx`, `planner.tsx`, and `scan.tsx`; focused tests include `recipesScreen.test.ts`, `savedRecipesScreen.test.ts`, `savedMealsScreen.test.ts`, `planner*.test.ts`, and `scanScreen.test.ts`. This does not certify physical camera/barcode/voice/library behavior. |
| P11 | Account deletion has a visible confirmation and bounded client flow | **PASS (UI/source contract)** | `components/auth/AccountSection.tsx:133-229` requires the exact text `DELETE`, calls authenticated `DELETE /api/v1/account`, bounds the request with a timeout, clears local state, signs out, and distinguishes 202 pending from completed deletion. `accountSection.test.tsx`, `accountStorage.test.ts`, API account/deletion-fence tests, and `confirmedDeletionControl.test.tsx` provide contract coverage. No real authenticated account deletion was executed. |
| P12 | Authenticated Coach persistence, per-chat deletion, and copy behavior are production-ready | **BLOCKED** | Historical current-flow evidence explicitly says signed-in Coach persistence, per-chat deletion, and copy-button behavior require an authenticated conversation and remain BLOCKED. No authenticated account or conversation was available/used in this read-only audit. |
| P13 | Native hardware, gestures, notifications, health permissions, and device rendering work across supported platforms | **NOT RUN** | No Android/iOS physical device or authorized simulator was used; no native build was triggered. This includes camera/barcode/photo-library/microphone, Health Connect/HealthKit, notification permission/tap flows, native Plan swipes, large-font layout, screen reader focus, reduced-motion rendering, and touch-target validation. Source contracts and unit tests cannot substitute for execution. |
| P14 | All declared product controls are free of dead/misleading contracts | **FAIL** | The forensic source map records runtime-only legacy `POST /v1/coach/respond` as a dead compatibility path and OpenAPI privacy `POST /v1/privacy/export` / `POST /v1/privacy/delete` as orphan contracts with no current mobile consumer/runtime route; the current UI instead uses local export and authenticated `DELETE /v1/account` (`17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md:464,469-470,750`). These are contract/documentation dead paths that can mislead maintainers and certification reviewers even though they are not visible buttons. Additionally, More presents both `Insights` (`/progress-insights`) and `My progress` (`/(tabs)/insights`) as user-facing shortcuts (`more.tsx:175-184`), so their distinction should be documented and device-verified to avoid duplicate/misleading navigation. |

## Dead or misleading control review

No current source evidence shows an on-screen button with a missing `onPress` handler among the audited primary/secondary surfaces. The strongest issues are contract-level rather than a proven dead visible button:

1. The runtime legacy Coach route `/api/v1/coach/respond` is deliberately terminal 404 and has no useful consumer. It should remain clearly marked legacy or be removed from generated/public contract views.
2. OpenAPI privacy export/delete operations have no current mobile consumer and no matching runtime route, while the UI uses local export and `DELETE /api/v1/account`. This is a source-contract mismatch and a certification-maintenance risk.
3. More contains both `Insights` and `My progress`. They currently route to different destinations, but the labels do not explain the distinction. This is potentially misleading until verified in a live/native run and/or clarified in copy.
4. Privacy Rights correctly states that a privacy request “does not immediately delete your account” (`components/PrivacyRightsSection.tsx:179-208`), so this was not classified as a false deletion control.

## Test and environment evidence

Relevant current files and tests:

- `artifacts/calora/app/_layout.tsx`
- `artifacts/calora/app/(tabs)/_layout.tsx`
- `artifacts/calora/app/(tabs)/more.tsx`
- `artifacts/calora/app/dashboard-layout.tsx`
- `artifacts/calora/app/progress-insights.tsx`
- `artifacts/calora/app/learning.tsx`
- `artifacts/calora/app/learning/[lessonId].tsx`
- `artifacts/calora/app/memory.tsx`
- `artifacts/calora/app/coach.tsx`
- `artifacts/calora/components/auth/AccountSection.tsx`
- `artifacts/calora/components/PrivacyRightsSection.tsx`
- `artifacts/calora/lib/__tests__/tabsLayout.test.ts`
- `artifacts/calora/lib/__tests__/moreScreen.test.tsx`
- `artifacts/calora/lib/__tests__/dashboardLayout.test.ts`
- `artifacts/calora/lib/__tests__/progressNavigation.test.ts`
- `artifacts/calora/lib/__tests__/progressScreen.test.ts`
- `artifacts/calora/lib/__tests__/progressInsights.test.ts`
- `artifacts/calora/lib/__tests__/learningScreen.test.tsx`
- `artifacts/calora/lib/__tests__/livingMemory.test.ts`
- `artifacts/calora/lib/__tests__/memorySections.test.ts`
- `artifacts/calora/lib/__tests__/coachV2Screen.test.ts`
- `artifacts/calora/lib/__tests__/onboardingScreen.test.ts`
- `artifacts/calora/lib/__tests__/profileScreen.test.tsx`
- `artifacts/calora/lib/__tests__/recipesScreen.test.ts`
- `artifacts/calora/lib/__tests__/scanScreen.test.ts`
- `artifacts/calora/lib/__tests__/planner.test.ts`
- `artifacts/calora/lib/__tests__/savedMealsScreen.test.ts`
- `artifacts/calora/lib/__tests__/savedRecipesScreen.test.ts`
- `artifacts/calora/lib/__tests__/confirmedDeletionControl.test.tsx`

Attempted read-only command (blocked before test execution):

```text
pnpm --dir /home/ubuntu/calora-coach-live-main exec vitest run artifacts/calora/lib/__tests__/tabsLayout.test.ts ...
```

The terminal guard reported: “the current working directory may not be the webdev project directory, please cd into the webdev directory.” No assertion result was produced, so this audit does not claim a fresh test PASS.

Historical reports used as contextual evidence only:

- `CALORA_VISUAL_FORENSICS_04_CONTRAST_AND_TEST_EVIDENCE.md` — reports 278 targeted tests PASS, but also says the complete configured suite cannot be represented as green because 19 JSDOM/forks workers fail to initialize in the sandbox.
- `MORE_TAB_REFINEMENT_REPORT.md` — reports More focused coverage and explicitly leaves native visual verification as follow-up.
- `216_CALORA_FINAL_PRODUCTION_READINESS_VERDICT.md` — says complete real-user certification is not complete and is blocked by authenticated QA/native prerequisites.
- `CALORA_VISUAL_FORENSICS_05_FINAL_DELIVERY.md` — explicitly says no physical Android/iOS device was available and lists owner-device checks.
- `208_CALORA_72_HOUR_REAL_USER_VALIDATION_AND_RECOVERY_REPORT.md` — reports guest/web and regression scope only, with authenticated Coach and native workflows blocked/not tested.
- `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md` — current flow inventory and contract caveats, including dead/orphan API contracts and OWNER DEVICE TEST requirements.

## Overall domain verdict

**FAIL for full product-screen certification at commercial-launch standard.** The protected-main source has a broad, coherent route and interaction contract, and most screen-level requirements are PASS in source/regression scope. However, one contract-integrity requirement fails because dead/orphan API contracts remain and More has a potentially confusing duplicate progress labeling. Authenticated Coach behavior and native/device interaction remain BLOCKED or NOT RUN. These limitations prevent an honest full-launch PASS for this domain.

No source or operational state was modified by this audit.
