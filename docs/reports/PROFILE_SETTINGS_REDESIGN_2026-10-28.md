# Calora Profile and Settings redesign

## Scope

This change introduces a compact Settings hub and a dedicated Notifications experience while preserving the existing Profile route as the authoritative detail surface for account, membership, privacy, health, goals, reminders, saved meals, and legal actions.

The More-tab settings control now opens `/settings`. The More-tab identity card remains a direct `/profile` entry point. The legacy profile surface is intentionally retained rather than duplicated so existing data controls and destructive flows continue to use their tested implementations.

## Implemented

- Added `app/settings.tsx` with a compact hero, theme controls for System/Light/Dark, personalization links, notification access, health/privacy/account links, saved meals, saved signals, and support/legal access.
- Added `app/notifications.tsx` with persisted master notification control, hydration, meal, and daily-goal category toggles, quiet-hours toggle, platform-aware copy, and a link to the existing detailed reminder controls.
- Reworked More navigation so Settings and Profile are distinct destinations.
- Kept existing Profile, membership, export, local deletion, sign-out, health, saved-meal, and legal behavior reachable through existing deep links.
- No external image URLs, new data stores, backend changes, or native build configuration changes were introduced.

## Validation

- Calora TypeScript: passed (`pnpm exec tsc -p artifacts/calora/tsconfig.json --noEmit`).
- Workspace typecheck: passed (`pnpm run typecheck`).
- Prettier check: passed for all changed source and test files.
- Whitespace and route/control source-contract audit: passed.
- Non-production web export: completed successfully with inert public preview variables; the export was not deployed.
- Focused rendered Vitest files were attempted with both fork and thread pools. They were blocked before test collection by the sandbox Node 22 / `undici@8.12.2` worker-startup error (`decompress.js` attempting `.bind` on undefined), matching the known repository limitation. No assertion failure was observed.

## Safety boundary

No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build/release was triggered. No production data, credentials, Railway configuration, or backend deployment was changed in this implementation step.
