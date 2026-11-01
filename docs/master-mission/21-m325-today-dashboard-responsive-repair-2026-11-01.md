# Mission 325 — Today Dashboard Reconstruction and Responsive UI Repair

Date: 2026-11-01

## Scope

This mission repairs the post-PR #322 Today dashboard presentation without changing authentication, diary data, synchronization, subscriptions, or native build configuration. The work restores the approved compact welcome-photo surface and makes the wellness layout width-aware: 320/360/390px use a readable single column, while wider layouts can use adjacent two-column cards.

## Changes

- Restored the governed local Calora food-photo welcome surface and dark scrim in the Today header.
- Preserved the dashboard customization icon and reserved header space so narrow greetings do not collide with it.
- Added a width-aware wellness breakpoint at 400px.
- Added full-width narrow-screen wellness cells and retained 48%-width cells for the two-column layout.
- Kept Steps, Macro balance, Fasting, and Mood behavior and navigation unchanged.
- Prevented an expired fasting state from presenting a misleading active “View” action.
- Updated only the related source contracts and image-governance test expectation.

## Verification

- TypeScript: PASS (`pnpm --filter @workspace/calora run typecheck`).
- Focused Today, dashboard, visual-integrity, and image-boundary tests: PASS — 4 files, 44 tests.
- Image governance: PASS — 13 tests; inventory validator status `ok` with 14 direct renderers and no static external image URLs.
- Full client suite: PASS — 186 test files, 1,943 tests; web/server security-contract checks also passed (29/29).
- Rendered mock-data screenshots captured and inspected at exact widths 320px, 360px, 390px, and 430px:
  - `/home/ubuntu/calora-qa/screenshots/mission325/320/today-final.png`
  - `/home/ubuntu/calora-qa/screenshots/mission325/360/today-final.png`
  - `/home/ubuntu/calora-qa/screenshots/mission325/390/today-final.png`
  - `/home/ubuntu/calora-qa/screenshots/mission325/430/today-final.png`

## Visual verdict

PASS for the isolated mock-data web preview. At 320/360/390px the wellness cards are single-column and readable; at 430px Steps and Macro balance form an adjacent two-column row. No horizontal overflow, clipped header text, or overlapping cards were observed in the inspected screenshots. The screenshots are mock-data visual evidence only; authenticated backend integration was not exercised in this mission.

## Delivery boundary

No native build, APK/EAS action, Railway deployment, production configuration change, or production data mutation was performed. The source is ready for protected PR review only.
