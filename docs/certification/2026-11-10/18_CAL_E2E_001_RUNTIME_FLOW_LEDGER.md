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


## Extended recipe-feed execution added 2026-11-10

| Flow ID | Journey | Screen/navigation | Interaction | State/persistence | Outcome |
|---|---|---|---|---|---|
| CAL-E2E-WEB-016 | Discover extended pagination | Re-entered deployed Recipes → Discover and scrolled the actual recipe feed through multiple long-scroll positions | Advanced the feed through repeated scroll loads and inspected the rendered DOM after each expansion | 213 recipe-card open controls were rendered; 212 unique titles. The sole duplicate was the already-saved `Salmon quinoa bowl`, rendered once in the saved shelf and once in Explore; no duplicate pagination item was observed. | **PASS for public Discover pagination/dedup evidence** |
| CAL-E2E-WEB-017 | Discover catalogue boundary | Same extended Discover session | Read the live catalogue metadata after pagination | Runtime displayed `704 recipes in the curated browse cycle`; the scoped count remained stable while the feed expanded. | **PASS for corrected count semantics** |
| CAL-E2E-WEB-018 | Plus authenticated boundary | Opened the live Plus tab from Recipes and inspected the resulting protected state | Attempted the available sign-in affordance without entering credentials or bypassing guards | Runtime exposed `Plus sources require sign-in`; no authorized authenticated test account/session was available in the isolated browser, so premium recipe loading and persistence were not executed. | **BLOCKED at required authentication boundary; not a Plus defect** |

The extended run did not mutate production data, invoke generation, submit billing, access customer records, start a build, or deploy. The remaining Plus E2E requirement is one owner-authorized authenticated test session (or a non-production test environment) followed by verification of premium loading, save, detail, and recovery behavior.


## Authenticated recipe execution added 2026-11-10

| Flow ID | Journey | Screen/navigation | Interaction | State/persistence | Outcome |
|---|---|---|---|---|---|
| CAL-E2E-WEB-019 | Authenticated session recovery | Submitted the owner-provided test account through the deployed sign-in route; the app returned to Today with account-backed nutrition, saved-item counts, and sync status visible. | Sign-in form submission completed successfully. | Account context was restored; Today showed saved meals and the signed-in recipe surface. | **PASS for authenticated web session establishment** |
| CAL-E2E-WEB-020 | Authenticated Plus tab | Opened Recipes and activated the Plus tab in the authenticated session. | Plus tab became the active recipe section and rendered the authenticated recipe surface with saved-account controls and recipe cards. | The live UI exposed `Plus recipes` and account-backed saved state; it did not expose a reliable Plus-only provenance marker or separate entitlement label in the rendered payload. | **PARTIAL: authenticated Plus surface rendered; premium-source differentiation remains unverified** |

The authenticated check used only the owner-provided test account in the isolated browser. No recipe generation, billing change, production customer-record query, native build, or deployment was performed. The password was not written to the repository or included in the ledger.


### Authenticated Plus visual evidence

- Rendered screenshot captured from the authenticated deployed session: `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_11-33-30_1138.webp`.
- Earlier authenticated Recipes/Plus capture: `/home/ubuntu/screenshots/app_mycaloraapp_2026-11-10_11-28-47_8274.webp`.

## Corrective Plus/Create recheck added 2026-11-10

The prior authenticated Plus classification was rechecked from a fresh live runtime before attempting any premium or AI-provider operation. The browser now exposes `@calora/account-state-v3:guest`, no auth cookie/session, and the Plus screen renders the intended fail-closed boundary: `Plus sources require sign-in` with `Sign in to access Plus recipes`. A second submission of the owner-provided test account through the deployed sign-in controls did not establish a session or return an error state. This supersedes the prior partial Plus classification for the current runtime and prevents claiming premium-source evidence from the earlier card rendering.

| Flow ID | Journey | Screen/navigation | Interaction | State/persistence | Outcome |
|---|---|---|---|---|---|
| CAL-E2E-WEB-021 | Plus session/entitlement recheck | Opened Recipes → Plus and inspected the live guard | Activated Plus and attempted the existing sign-in recovery path | No live auth session was established; no premium request was issued | **BLOCKED at authentication boundary; no Plus defect established** |
| CAL-E2E-WEB-022 | Plus provider contract rehearsal | Ran the disposable API premium-provider suite | No production provider call | 33/33 tests passed, including anonymous denial, entitlement denial, fail-closed provider outage, pagination, deduplication, nutrition integrity, rate limits, and safe retries | **PASS for source/disposable contract; runtime entitlement evidence unavailable** |
| CAL-E2E-WEB-023 | Create generation contract rehearsal | Ran the disposable AI recipe-generation suite with a non-production sentinel | No production AI generation invoked | 25/25 tests passed, including signed-in requirement, bounded guest concepts, quota ordering, structured output, nutrition, private photo lifecycle, and provider failure recovery | **PASS for source/disposable contract; live generation blocked by missing approved test provider** |
| CAL-E2E-WEB-024 | Plus/Create client contract regression | Ran client recipe, access, pagination, catalogue-state, and saved-premium tests | No live data mutation | 69/69 tests passed | **PASS for client contract; not a substitute for authenticated runtime evidence** |

The current runtime blockers are specific: (1) a valid authenticated test session is not available in the browser, (2) the Plus server contract additionally requires an active RevenueCat entitlement, and (3) Create full-recipe generation requires a signed-in account and an approved non-production/cost-controlled AI provider. No production billing, customer record, provider generation, build, or deployment was performed during this recheck.
