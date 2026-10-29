# Calora Profile, Settings, and Notifications Implementation

## Scope

This change establishes three distinct canonical product areas:

- `/profile` describes the person: identity, personal information, goals and wellness, membership, and account access.
- `/settings` controls the product: appearance, text size, units, health behavior, privacy/data, and support.
- `/notifications` controls communication: device permission status, the master delivery switch, reminders, progress updates, quiet hours, and the in-app notification inbox.

The existing hidden tab route `/(tabs)/profile` remains available for legacy `tab` and `open` query deep links. The canonical Profile route detects those legacy intents and redirects them to the existing implementation instead of silently dropping behavior.

## Implementation

- Added shared `SectionHeader`, `SettingRow`, and `PermissionBanner` primitives.
- Added canonical `app/profile.tsx`, `app/settings.tsx`, and `app/notifications.tsx` routes.
- Updated the More dashboard shortcuts so Settings and Notifications are no longer hidden behind the combined Profile screen.
- Kept notification scheduling behind the existing serialized reconciliation boundary and preserved the existing preference model.
- Kept local data export guarded by a stable concurrency mutex and kept local reset wired to the authenticated sign-out flow.

## Validation

- TypeScript: **PASS** (`pnpm typecheck`).
- New route-ownership tests: **PASS** (3/3).
- Existing full Profile render suite: **BLOCKED before collection** by the sandbox's Node/Undici worker startup error in `undici/lib/interceptor/decompress.js`; no application assertion ran.
- Full `pnpm test:ci`: **BLOCKED by the same environment-level Undici worker error**; no native build or deployment was triggered.

No production deployment, Railway change, Expo/EAS build, Android build, iOS build, or app-store submission was performed.
