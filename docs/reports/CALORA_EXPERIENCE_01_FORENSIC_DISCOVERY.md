# Calora Experience 01 — Forensic Discovery

## Scope and baseline

This report records the implementation baseline for the premium Fasting, Learning, Progress, and Profile/Settings mission. It was produced from the protected-main descendant used by the feature branch, not from static reference mockups.

The app already preserved the approved visible navigation order: **Today → Recipes → Scan → Plan → More**. Progress was intentionally retained as a reachable route from Today and More rather than restored as a sixth visible tab. Existing Settings already had the required **You**, **Membership**, and **Account** separation, including established RevenueCat, Health, export, local-data deletion, and account-deletion controls.

## Findings and root causes

| Area            | Confirmed state before this branch                                                                                                                                          | Root cause addressed                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Fasting         | A basic persisted timer existed, but plan selection, history, calendar, schedule context, and safety-oriented direct education were incomplete or undiscoverable.           | No dedicated durable feature model and insufficient screen hierarchy around the existing timer actions. |
| Learning        | The library was shallow and route-local; it lacked a scalable content model, lesson route, saved state, durable progress, journeys, and enough original editorial material. | Content, reader state, and canonical lesson routing were not modeled as a durable local subsystem.      |
| Progress        | Existing Overview, Trends, and Weight data were useful but the hierarchy did not consistently distinguish recorded weights, onboarding baseline, and source/recency.        | Presentation logic was coupled to raw entries rather than a safe, chronological Progress summary.       |
| More / Settings | Existing deep links and data controls were present, but the entry hierarchy did not foreground Fasting, Progress, and Learning while keeping Quick Access secondary.        | Navigation was distributed across older screens without a focused secondary hub.                        |
| Persistence     | Fasting, dashboard preferences, and Learning reader state required additive encrypted snapshot support, export visibility, migration, and clear-data guarantees.            | New state had to be integrated at all account-scoped persistence seams, not only screen state.          |

## Constraints preserved

- No native Android/iOS, Expo/EAS, store, Railway, database, production, payment, or external-spend action is part of this branch.
- Existing account, subscription, Health, export, privacy, local-delete, and account-delete behavior remains in the established Settings locations.
- New local state is backward-compatible and is cleared with account-scoped local data.
- The experience uses nonjudgmental, non-clinical language. It does not claim fat-burning, guaranteed weight loss, or medical outcomes.
