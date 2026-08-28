# Calora 3D Feature Icon Redesign Report

## Scope

Added a shared compact 3D icon system for Calora’s major feature and action entrances. The system uses the existing Calora color tokens passed from each screen, layered SVG geometry, soft depth offsets, and highlight gradients so the icons stay recognizable in both light and dark themes.

The redesign intentionally does **not** replace ordinary navigation, settings, arrows, close buttons, search controls, status icons, or other utility icons.

## Icons changed

- **Food logging** — dimensional bowl/plate used for Home food actions and food capture mode.
- **Camera scan** — dimensional camera used for Home photo logging, Scan permission, and the Scan shutter.
- **Barcode scan** — dimensional barcode/scanner used in Home capture controls, Scan mode selection, and the scan hint.
- **Voice log** — soft dimensional microphone used in Home capture controls and Scan’s alternate logging controls.
- **Restaurant** — miniature storefront used for Home Restaurants, the Restaurants intro card, and the Scan Restaurants action.
- **Recipes** — dimensional cookbook used in the Home recipe badge and Recipes screen badge.
- **Shopping list** — dimensional grocery bag used in the Planner shopping workspace header.
- **Calora Coach** — dimensional intelligence orb/spark used in Home, Scan’s Coach shortcut, Coach consent/brief/history surfaces.
- **Today wellness surfaces** — dimensional rhythm, water, mood, progress, and calendar variants used for Daily Rhythm, hydration, mood, Today’s Insight, and the dynamic daily action.
- **Today quick logging** — Photo log, Search foods, and Restaurants are now icon-only 3D controls in one horizontal row beneath the calorie card instead of four widget cards.
  - Photo log goes directly to the Scan screen, Search foods opens the verified-food search flow, and Restaurants opens the restaurant search screen. Manual entry remains available from the Add Food flow.

## Files modified

- `artifacts/calora/components/CaloraFeatureIcon.tsx`
  - New shared SVG-based feature icon component and icon-name type.
- `artifacts/calora/app/(tabs)/index.tsx`
  - Home quick actions, food capture controls, recipe badge, Coach entrance, and Today-tab rhythm, water, meals, mood, insight, dynamic action, saved-meal, and capture-state icons.
- `artifacts/calora/app/(tabs)/scan.tsx`
  - Camera permission, capture controls, barcode/food modes, voice controls, restaurant action, and Coach shortcut.
- `artifacts/calora/app/restaurants.tsx`
  - Restaurant search intro icon.
- `artifacts/calora/app/(tabs)/recipes.tsx`
  - Recipes feature badge.
- `artifacts/calora/app/(tabs)/planner.tsx`
  - Shopping workspace icon.
- `artifacts/calora/app/coach.tsx`
  - Coach consent, weekly-read, and assistant-history icons.

## Validation performed

- Calora TypeScript check passed:
  - `pnpm --filter @workspace/calora run typecheck`
- `git diff --check` passed.
- Expo workflow remained running and rebundled without runtime errors.
- Browser/runtime logs were inspected after the changes; only existing development warnings were present.
- Light-theme mobile-web previews were checked for:
  - Home
  - Scan
  - Restaurants
  - Coach
- Compact icon legibility and contrast were checked in the rendered mobile layouts.
- Dark-theme contrast was reviewed against the existing Calora dark color tokens; the icon component receives theme colors rather than hardcoded light-only fills.
- Full-height Today-tab mobile preview was checked across the primary Today sections and the fixed bottom navigation.
- Today quick-log preview was checked at mobile width to confirm the four controls stay on one horizontal line beneath the calorie card.

## Remaining issues

- The current Expo preview is web-based, so native camera and microphone permission flows cannot be fully exercised there.
- A dedicated signed Android build is outside this icon-only change and remains a separate release task.