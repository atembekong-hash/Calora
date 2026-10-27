# Calora UX 01 — Architecture and discovery

## Scope

This implementation uses the approved reference imagery as visual direction rather than literal data or medical claims. The mission keeps Calora's existing React Native / Expo Router application structure, encrypted local persistence, account-scoped state, authentication guards, health integration, RevenueCat integration, and current recipe/Plan/Scan workflows.

## Existing systems reused

| Area        | Existing system retained                                                 | Redesign use                                                                                                                  |
| ----------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Navigation  | Expo Router tabs plus protected root stack                               | Maintains route identities, hides Progress from the tab bar, exposes it through More and contextual actions.                  |
| Today       | Existing calorie, diary, hydration, activity, health, and recipe widgets | Adds user-controlled widget visibility and a real persisted fasting summary without duplicating health or diary calculations. |
| Progress    | Existing `insights` Overview, Trends, and Weight implementation          | Remains intact and reachable from Today and More. No data, charts, filters, logging, or Health Connect paths were removed.    |
| Settings    | Existing Profile `You`, `Membership`, and `Account` pager                | Keeps all existing controls; adds logical routes to Dashboard customization and Saved Meals.                                  |
| Persistence | `CaloraContext` encrypted account-scoped snapshot and migration pipeline | Adds normalized fasting and dashboard-preference fields additively. Older saved snapshots receive safe defaults.              |
| Reminders   | Existing local notification preferences and settings controls            | Fasting links to the existing Settings reminder area rather than introducing another scheduling store.                        |
| Billing     | Existing RevenueCat entitlement/pricing helpers                          | No nominal price is treated as an entitlement; existing authoritative billing state remains the source of truth.              |

## Architectural decisions

1. **Five visible tabs:** `Today → Recipes → Scan → Plan → More`. The established `insights` and `profile` routes remain registered but are hidden from the tab bar, preserving deep-link and navigation compatibility.
2. **More is a focused hub, not a second dashboard.** It presents persisted fasting state, an honest Progress preview from existing logs/weights, Learning, logical shortcuts, and the Settings entrypoint.
3. **Fasting is timestamp-based.** Its state stores an ISO start timestamp, selected plan, planned duration, and finite history. Elapsed/remaining durations are calculated from the current clock and therefore survive restarts without decorative or fictional health-stage claims.
4. **Dashboard preference state is additive.** It persists eligible widget visibility, order, and compact/expanded density. Calorie visibility is protected as an essential widget; malformed legacy values normalize safely.
5. **No duplicated user data.** Saved Meals remains backed by the existing Saved Meal store and logging action. New routes are UI entrypoints, not separate databases or stores.
6. **Fasting safety language is restrained.** The UI offers conventional 12:12, 14:10, 16:8, and bounded custom schedules; it does not imply fat-burning, autophagy, medical suitability, or superiority of more restrictive schedules.

## Data integrity and migration

The snapshot schema remains backward compatible: missing `fasting` and `dashboardPreferences` values hydrate to normalized defaults. `clearAllData` clears both new fields, and the asynchronous export-gap snapshot includes their cleared values, so a mid-reset export cannot retain an active fast or layout preference.

## Deliberately out of scope

No native build, production deployment, database migration, health permission change, notification dispatch, account change, or store release was performed. Physical-device gesture and accessibility-assistive-technology testing requires a separately available device environment.
