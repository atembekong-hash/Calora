# CAL-E2E-001 Runtime Flow Ledger

**Date:** 2026-11-10
**Execution mode:** Sandbox browser against the deployed Calora web application
**Production mutation:** None
**Native build/release:** None

## Runtime evidence

The following flows were executed against `https://app.mycaloraapp.com/` in the isolated sandbox browser. These are genuine rendered runtime observations, not source-level substitutes.

| Flow ID | Journey | Result | Platform applicability | Evidence |
|---|---|---|---|---|
| CAL-E2E-WEB-001 | Application startup | PASS. The deployed app loaded the Today dashboard after the initial loading state. | Web; equivalent startup path applies to Android/iOS | Screenshot: `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_10-29-14_8033.webp` |
| CAL-E2E-WEB-002 | Today dashboard inspection | PASS. Date navigation, nutrition summary, Steps/Health state, Fasting entry, mood choices, hydration, Progress, recipe rail, offline local-log status, and bottom navigation were rendered. | Web; Android/iOS shared product flow | Same Today screenshot |
| CAL-E2E-WEB-003 | Recipes tab navigation | PASS. Discover rendered with categories, search, saved-recipes/saved-meals/shopping-list entry points, recipe cards, save actions, and recipe detail actions. | Web; Android/iOS | `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_10-29-22_6384.webp` |
| CAL-E2E-WEB-004 | Catalogue count semantics | PASS. Runtime displayed `704 recipes in the curated browse cycle`, confirming the corrected scoped-count wording rather than a misleading total-catalogue claim. | Web; Android/iOS contract | Recipes runtime extraction |
| CAL-E2E-WEB-005 | Create recipe guest flow | PASS for non-generating interactions. Create rendered without authentication, exposed ingredient/style/preferences controls, and selecting Eggs updated the selected-ingredients state to `Eggs`. The paid/provider-backed Generate action was not invoked. | Web; Android/iOS shared flow | `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_10-29-51_2857.webp` |
| CAL-E2E-WEB-006 | Protected-route guard | PASS. Direct navigation to `/fasting` redirected to the public Today shell rather than bypassing authentication/runtime guards. | Web; Android/iOS | Browser navigation result |
| CAL-E2E-WEB-007 | Fasting entry from Today | PASS. Opening Fasting through the Today dashboard rendered the 12:12 ready state, plan choices, custom-plan entry, local history, learning guide, meal-reminder state, and safety notice. | Web; Android/iOS | `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_10-30-09_9354.webp` |
| CAL-E2E-WEB-008 | Hydration entry from Today | PASS. Opening Hydration rendered the 0% goal state, unit switch, quick-add control, editable daily goal, daily/weekly/monthly tabs, seven-day history, and learning cards. | Web; Android/iOS shared flow | `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_10-39-28_2776.webp` |
| CAL-E2E-WEB-009 | Steps entry from Today | PASS for the unavailable-provider state. Opening Steps rendered the goal, Today/Week/Month views, empty movement metrics, Connect Health CTA, trend controls, hourly-detail empty state, and movement education. | Web; Android/iOS shared flow | `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_10-39-45_2724.webp` |
| CAL-E2E-WEB-010 | Progress/Insights entry from Today | PASS for the empty-data state. The route rendered Overview, Trends, and Weight tabs, daily summary, logging rhythm, nutrition/macro sections, movement and hydration sections, workout empty state, weekly patterns, nutrient balance, and trust explanations. | Web; Android/iOS shared flow | `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_10-47-22_3852.webp` |
| CAL-E2E-WEB-011 | More tab navigation | PASS. More rendered Fasting, Progress, Learning, Insights, Saved recipes, Coach, Customize dashboard, Goals, Health sync, Hydration, Steps, My progress, Calora Pro, Living Memory, Saved meals, and Reminders entry points. | Web; Android/iOS shared flow | `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_10-47-51_5774.webp` |

## Application route inventory

The current Expo/React-Native route surface includes:

- Startup and navigation: `/`, `/dashboard-layout`, `/(tabs)/index`, `/(tabs)/recipes`, `/(tabs)/planner`, `/(tabs)/more`, `/(tabs)/profile`, `/(tabs)/scan`, `/(tabs)/insights`, and `/(tabs)/_layout`.
- Authentication and recovery: `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/auth/callback`, and `/auth/_layout`.
- Health and daily tracking: `/steps`, `/hydration`, `/fasting`, `/progress-insights`, `/coach`, and `/notifications`.
- Recipes and food: `/saved-recipes`, `/saved-meals`, `/meal-image-preview`, `/restaurants`, `/learning`, `/learning/[lessonId]`, and `/invite/[code]`.
- Account and safety: `/profile`, `/settings`, `/memory`, `/encrypted-recovery-preview`, and the not-found route.

The source inventory also contains explicit offline, retry, persistence, permission, account-switch, deletion, health-connection, and authentication-recovery states in `CaloraContext`, `AuthContext`, capture flows, saved-state synchronization, and route-level screens. These require authenticated/runtime-specific evidence before being classified as end-to-end PASS.

## Dependency discovery

- Authorized Supabase connector: enabled; project `caloraapp` is `ACTIVE_HEALTHY` at ref `pzdulhkpwbrbrgskwwwe`. It is the production Calora project, not an isolated disposable test project. It was not queried for customer data or used for test mutation.
- Authorized GitHub connector: enabled.
- Authorized Railway connector: enabled.
- My Browser connector: enabled, but the runtime evidence above intentionally used the isolated sandbox browser and did not access the user's personal browser session.
- No authorized isolated `heliumdb` development cluster or separate Supabase test project was discovered in session configuration.
- Shell access to repository `.env`/secret values is intentionally restricted; no secret was printed or requested in chat.

## Remaining executable work

The real PostgreSQL batch now passes 45 tests after PR #452. The remaining three suites are still gated by external prerequisites rather than a local database defect:

1. Coach pending-rollback rehearsal: exact approved `heliumdb` development cluster and synthetic-rehearsal opt-in.
2. Real Supabase recipe-generation flow: authorized non-production Supabase URL/anon key/service-role key and test password.
3. Staged-RLS real-handler rehearsal: approved admin database URL and `CALORA_RLS_DATABASE_MODE=staged-rls`.

Native Android/iOS execution requires the already-built candidate artifacts, a connected Samsung Galaxy S20 for Android, and an authorized iOS/TestFlight device/session. No new build was started.

## Verdict

**CAL-E2E-001 remains BLOCKED for full certification.** New runtime evidence proves the public startup, Today, Recipes, corrected catalogue semantics, guest Create interaction, route guard, Fasting, Hydration, and Steps entry paths. Full certification still requires authenticated provider flows, the gated security/Coach rehearsals, and genuine Android/iOS runtime evidence.

## Complete user-journey execution added 2026-11-10

The following journeys were executed against the deployed web application in the isolated sandbox browser. No production account, customer record, billing state, backend mutation, deployment, or native build was used.

| Flow ID | Journey | Screen/navigation | Interaction | Visible state change | Persistence/recovery | Outcome |
|---|---|---|---|---|---|---|
| CAL-E2E-WEB-012 | Hydration quick-add | Verified Today → Hydration entry | Tapped Add 8 fl oz | Verified 0 → 8 fl oz, 0 → 1 cup, 13% goal | Navigated to Today and back; Today and Progress both showed 8 fl oz. | **PASS for local web journey**; server/account sync remains unverified. |
| CAL-E2E-WEB-013 | Mood check-in | Verified Today → Progress | Selected Good | Verified confirmation and Good selected | Progress showed Good in Daily check-ins and Today’s signals after navigation. | **PASS for local web journey**; authenticated cross-device sync remains unverified. |
| CAL-E2E-WEB-014 | Discover recipe save | Verified Recipes → Discover | Opened save options for Salmon quinoa bowl and selected Save recipe | Save control changed to Manage/Saved state | Opened Saved Recipes; shelf showed 1 saved item, Salmon quinoa bowl. | **PASS for local web journey**; account-backed cross-device sync remains unverified. |
| CAL-E2E-WEB-015 | Fasting plan selection and start attempt | Verified Today → Fasting; selected 16:8 | Plan selection rendered as 16:8; Start window was activated | Plan selection remained visible; start action did not transition to an active window in the guest runtime | No active-window persistence was demonstrated. | **PARTIAL / runtime guard boundary**; do not classify as a fasting defect without an authenticated session. |

### Evidence quality classification

- **Screen/navigation verified:** Hydration, Progress, Saved Recipes, and Fasting journeys above.
- **Interaction verified:** Hydration quick-add, Good mood selection, recipe save-options and recipe save, and 16:8 plan selection.
- **State change verified:** Hydration totals, mood selection/confirmation, recipe saved/manage state, and 16:8 selection.
- **Persistence verified:** Hydration and mood were reflected in dependent views after route transitions; the saved recipe was present in Saved Recipes. These are genuine local web-runtime persistence observations, not proof of account/cloud synchronization.
- **Restart/recovery verified:** Route reload/navigation recovery was verified for Today, Hydration, Progress, and Saved Recipes. A process restart, offline interruption, account switch, and authenticated recovery were not executed.
- **Complete end-to-end certification:** Not yet proven because authenticated backend persistence, cross-device reconciliation, provider-backed flows, and native Android/iOS execution remain unavailable in this session.
