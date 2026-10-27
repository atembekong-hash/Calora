# Calora UX 05 — Final delivery and open items

## Delivery summary

This branch implements the approved unified Calora experience redesign:

1. Visible five-tab navigation: **Today, Recipes, Scan, Plan, More**.
2. Existing Progress preserved as a hidden tab route and reachable from Today and More.
3. New More hub with real persisted fasting state, genuine available Progress context, Learning, Quick Access, Settings, and existing-account links.
4. New timestamp-based Fasting experience with conventional schedules, clear safety wording, direct reminder route, history, and persistent state.
5. New local Learning experience with original structured lessons, search, categories, details, and relevant app links.
6. Existing Saved Meal state surfaced through a focused new destination and logical More/Settings links.
7. User-controlled Today dashboard visibility, order, density preferences, and recommended-layout reset, backed by existing encrypted/account-scoped persistence.
8. Existing Settings `You | Membership | Account`, Progress Overview/Trends/Weight, Scan, Recipes, Plan, authentication, privacy, Health, RevenueCat, and account-deletion workflows preserved.

## Security and data handling

The work contains no credentials, tokens, signing material, private image locator, generated image, user export, customer record, or production secret. It adds no new remote storage, service role, database, deployment, or billing mutation.

The changes are additive and backward-compatible. Existing snapshots without fasting/dashboard preference keys hydrate safely. Local-data deletion and its export-gap bridge clear both additions.

## Native-release boundary

This implementation does **not** authorize or trigger any Android, iOS, Expo/EAS, APK, AAB, IPA, TestFlight, App Store, Google Play, Railway, or production deployment process.

## Open items for protected CI / later owner authorization

1. Run the complete protected repository workflow, including the JSDOM Learning test under its supported CI Node runtime.
2. Inspect the More, Fasting, Learning, Today customization, Progress swipe, settings pager, light theme, dark theme, Android Back, and screen-reader flows on physical devices or a suitable emulator.
3. Verify real local notification behavior under device permissions; no reminder schedules were sent during this work.
4. Authorize a native build only through a separate explicit instruction naming the exact build or submission, if it becomes needed.

## Delivery verdict

**IMPLEMENTATION_READY_FOR_PROTECTED_PR** — source integration, TypeScript, focused state/route/data regressions, formatting of new code, and existing Progress/profile/health/RevenueCat regressions pass. The remaining limitation is sandbox JSDOM worker initialization and unavailable physical-device validation, neither of which has been represented as passing.
