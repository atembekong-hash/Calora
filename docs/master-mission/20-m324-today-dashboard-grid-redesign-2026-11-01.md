# Mission 324 — Today dashboard grid redesign

## Scope

Implemented the approved Today-tab restructuring from protected `main` without starting a native build or changing production data:

- Removed the visible “Customize Today” text widget.
- Added a compact sliders icon at the top-left of the calorie-ring header; it routes to `/dashboard-layout`.
- Removed the visible “Building your picture”/living-rhythm widget from Today rendering while preserving legacy preference compatibility.
- Arranged Steps and Macro balance in an adjacent two-column grid.
- Arranged Fasting and How are you doing (Mood) in an adjacent two-column grid immediately afterward.
- Reduced the Recipes for You card height by approximately 10% and added horizontally paged recipe cards with provider image URLs, calorie/preparation metadata, and saved-recipe bookmarking.
- Preserved the diary log, quick logging actions, water behavior, contextual insight, and account-scoped state.
- Kept Customize Dashboard routed through the existing screen with its existing back button; updated copy and removed the retired rhythm control from the visible customization list.
- Migrated persisted dashboard preferences so the retired rhythm ID is filtered from active visible/order state rather than causing data loss or a type error.
- Registered the new Today recipe renderer in the existing image-governance manifest and updated its inventory contract; runtime provider imagery remains dynamic and no static external URL was added.

## Changed files

- `artifacts/calora/app/(tabs)/index.tsx`
- `artifacts/calora/app/dashboard-layout.tsx`
- `artifacts/calora/lib/dashboardPreferences.ts`
- Focused source-contract tests for Today/dashboard image boundaries.

## Verification

- Calora TypeScript: PASS (`pnpm --filter @workspace/calora run typecheck`).
- Focused Today/dashboard/recipe suite: PASS — 7 files, 100 tests.
- Full Calora client suite: PASS — 186 test files, 1,943 tests.
- Repository-level release/security checks: PASS — 29 Node tests.
- Image governance: PASS — 13/13 checks, 163 bundled assets, 0 static external image URLs, and 13 registered direct renderers.
- `git diff --check`: PASS.
- No APK, AAB, EAS, native build, store submission, database mutation, or Railway deployment was initiated during this mission.

## Remaining validation

Visual phone acceptance remains recommended after the protected merge because the requested changes materially alter the Today layout and image presentation. This source-only mission does not claim physical-device verification.
