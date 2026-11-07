# Calora More Tab — Controlled Visual Refinement Report

**Date:** 2026-11-07  
**Scope:** More tab only; no backend, database, authentication, subscription, Today, Recipes, Scan, Plan, Progress, or Insights implementation changes.

## 1. Before/after implementation map

| Area | Before | After |
|---|---|---|
| Header | Existing More title, subtitle, Settings action | Preserved; compact header remains theme-aware and accessible |
| Fasting | Live card and timer already present | Preserved live timer, ring, status, remaining-time calculation, and `/fasting` navigation; tightened layout and added restrained CSS-only food/wave decoration that does not intercept touches |
| Progress | Existing feature card | Preserved `/ (tabs)/insights` destination and live meal/weight summary; retained orange treatment |
| Learning | Existing feature card | Preserved `/learning` destination and purple treatment |
| Quick access | Existing set/order did not match the approved nine-shortcut contract | Added the required row-major default order: Insights, Saved recipes, Coach, Customize dashboard, Goals, Health sync, Hydration, My steps, My progress |
| Insights destination | Not consistently distinct from Progress/Living Memory | Insights now opens `/progress-insights`, the dedicated Live Insights experience |
| Saved recipes | Not distinct in the More-tab shortcut set | Uses `/saved-recipes`, separate from Saved meals |
| Bottom rows | Missing as a distinct section | Added full-width Living Memory, Saved meals, and Reminders rows with right chevrons and existing destinations |
| Scrolling | Existing page content could obscure lower content behind the fixed tab bar | Added safe bottom inset and verified the scrolled state exposes all three bottom rows |
| Themes | Existing light/dark support | Preserved existing theme tokens and validated both themes |

## 2. Changed files

- `artifacts/calora/app/(tabs)/more.tsx`
- `artifacts/calora/lib/__tests__/moreScreen.test.tsx`

No native build configuration, Android/iOS source, backend, database, authentication, billing, or unrelated screen was changed.

## 3. Functional verification

Focused More-tab tests cover:

1. Fasting, Progress, Learning, and Settings destinations.
2. All nine required shortcuts and their exact routes.
3. Separate Saved recipes and Saved meals destinations.
4. Three bottom-row destinations: Living Memory, Saved meals, Reminders.
5. Active fasting elapsed/remaining-time state.
6. Configured pre-start fasting state.
7. Most-recent weigh-in selection and unit rendering.
8. Local-day meal fallback behavior.
9. Responsive three-column grid and safe bottom inset contracts.

## 4. Automated validation

- TypeScript: **PASS**
- Focused More-tab suite: **7 passed**
- Full Calora client suite: **193 test files passed; 2,011 tests passed**
- Server/release checks: **29 passed; 0 failed**
- `git diff --check`: **PASS**

## 5. Genuine rendered visual evidence

Screenshots were captured from the local Expo web runtime using deterministic isolated mock data, not generated concept art. Evidence includes 360px, 390px, and 430px mobile widths in both themes, with top and scrolled states.

### Light mode

- [Light 360 top](/home/ubuntu/calora-more-evidence/more-top-light-360.png)
- [Light 390 top](/home/ubuntu/calora-more-evidence/more-top-light-390.png)
- [Light 430 top](/home/ubuntu/calora-more-evidence/more-top-light-430.png)
- [Light 390 scrolled bottom rows](/home/ubuntu/calora-more-evidence/more-bottom-light-390.png)

### Dark mode

- [Dark 360 top](/home/ubuntu/calora-more-evidence/more-top-dark-360.png)
- [Dark 390 top](/home/ubuntu/calora-more-evidence/more-top-dark-390.png)
- [Dark 430 top](/home/ubuntu/calora-more-evidence/more-top-dark-430.png)
- [Dark 390 scrolled bottom rows](/home/ubuntu/calora-more-evidence/more-bottom-dark-390.png)

Visual review found no clipped shortcut labels, no overlapping arrows, no header clipping, and all three bottom rows remained accessible above the fixed tab bar.

## 6. Native verification boundary

Native Android/iOS screenshots were not captured in this pass. The project operating rule explicitly prohibits triggering Android/iOS/EAS/APK/AAB/IPA builds without a fresh instruction naming the exact build or submission. The implementation is React Native/Expo shared UI and the web runtime evidence plus automated contracts are green, but this report does not claim native-device visual verification.

## 7. Verdict

**Scoped web release: PASS.** The More tab now matches the requested information hierarchy, route architecture, shortcut order, bottom-row structure, theme behavior, and mobile spacing while preserving existing live behavior. Native visual verification remains an explicit follow-up only if the owner authorizes a named native build or device-preview workflow.
