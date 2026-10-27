# Calora UX 04 — Validation and regressions

## Completed validation

| Validation                                               | Result | Evidence                                                                                                                                   |
| -------------------------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Calora TypeScript                                        |   PASS | `pnpm exec tsc -p tsconfig.json --noEmit` completed successfully after all redesign changes.                                               |
| Fasting/dashboard/clear-data focused regression          |   PASS | 6 test files, 217 tests passed using Vitest single-worker execution.                                                                       |
| Navigation/Progress/profile/health/RevenueCat regression |   PASS | 12 test files, 81 tests passed using Vitest single-worker execution.                                                                       |
| New-source formatting                                    |   PASS | Prettier check passed for all newly created screens, libraries, and tests.                                                                 |
| Diff whitespace                                          |   PASS | `git diff --check` passed during final source review.                                                                                      |
| Fasting timestamp behavior                               |   PASS | Unit coverage validates timestamp-derived elapsed/remaining values, completion history, malformed state normalization, and history bounds. |
| Dashboard personalization behavior                       |   PASS | Unit coverage validates normalization, calorie-widget protection, optional visibility toggle, and deterministic reorder behavior.          |
| Clear-data export gap                                    |   PASS | Existing exhaustive reset contract was extended to confirm fasting and dashboard preferences are cleared from the export bridge.           |
| Progress data integrity                                  |   PASS | Existing Overview/Trends/weekly graph regressions passed; no chart or Weight data source was replaced.                                     |
| Existing tab behavior                                    |   PASS | Updated tab contract regression validates the exact approved five-tab visible order and hidden retained Progress route.                    |
| RevenueCat state                                         |   PASS | Existing billing and identity tests passed.                                                                                                |
| Health boundaries                                        |   PASS | Existing Health connection, daily burned status, and weekly history tests passed.                                                          |

## Commands executed

```bash
cd artifacts/calora
pnpm exec tsc -p tsconfig.json --noEmit
pnpm exec vitest run --maxWorkers=1 \
  lib/__tests__/fasting.test.ts \
  lib/__tests__/dashboardPreferences.test.ts \
  lib/__tests__/planner.test.ts \
  lib/__tests__/recipesScreen.test.ts \
  lib/__tests__/clearAllData.integration.test.ts \
  lib/__tests__/exportPayloadProfilePhoto.test.ts
pnpm exec vitest run --maxWorkers=1 \
  lib/__tests__/tabsLayout.test.ts \
  lib/__tests__/progressScreen.test.ts \
  lib/__tests__/progressTrends.test.ts \
  lib/__tests__/progressWeeklyGraphs.test.ts \
  lib/__tests__/profileTargets.test.ts \
  lib/__tests__/profileSync.test.ts \
  lib/__tests__/postAuthNavigation.test.ts \
  lib/__tests__/healthConnection.test.ts \
  lib/__tests__/healthDayAndBurnedStatus.test.ts \
  lib/__tests__/healthWeekHistory.test.ts \
  lib/__tests__/revenuecatBilling.test.ts \
  lib/__tests__/revenuecatIdentity.test.ts
```

## Environment-limited checks

- The JSDOM Learning-screen test worker could not start in this sandbox because the installed Vitest / Undici 8 worker throws `Cannot read properties of undefined (reading 'bind')` while loading Undici. The failure occurs before the test module executes in both fork and thread pools. This is an environment worker startup issue, not an assertion failure; the Learning module typechecks and its regression source is included for normal CI execution.
- No physical Android or iOS device was available in this mission. No physical-device, screen-reader, real Health Connect/HealthKit, native notification, or gesture test is claimed.
- No Expo/EAS build, store submission, backend deployment, or production data operation was performed.

## Regression conclusion

The tested TypeScript, state, route, data-reset, Progress, profile, health, and billing contracts pass. Device-specific animation, accessibility-service, and gesture behavior remains for protected CI/device validation before any native release authorization.
