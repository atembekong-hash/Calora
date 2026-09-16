# Calora Step 50 — Complete Historical Product Delta Forensic Audit

**Execution date:** 2026-09-16  
**Mission:** Forensic investigation only  
**Canonical baseline:** `origin/main` at `7cce885c6b3d046a5a8fdb40d92343a87b73c290`  
**Canonical tree:** `1a598be866150d488bc21ccd598de3104c638b02`  
**Application source changed:** No  
**Build/deploy/push/database/ref mutation:** None

## 1. Executive summary

Step 50 independently reconstructed Calora's historical product evolution rather
than treating the Step 49 requirements R1–R13 as the complete boundary. The
audit compared all locally available refs, historical commits, reports,
navigation trees, deleted files, tests, API contracts, data concepts, assets,
and the current canonical source tree.

The result is a broader but differentiated picture:

1. The core local-first product survived substantially: authentication,
   onboarding completion persistence, multi-modal logging, Smart Scan approval,
   Food Memory, Planner, programs, shopping, diary sync, referrals, account
   deletion, Premium enforcement, dark/light themes, spatial UI, and bounded
   motion are represented in canonical source.
2. Several preserved capabilities were materially changed. Profile and
   notifications are secondary/embedded surfaces, Progress is now Insights,
   Planner and Recipes were redesigned, and Health data is managed through
   Profile and Insights rather than a dedicated Fitness tab.
3. A concrete historical Fitness/More phase did not survive as a canonical
   route. A historical `fitness.tsx`, `more.tsx`, `lib/fitness.ts`, tests,
   screenshots, and the Fitness trust-forward component were removed in a
   rollback sequence. Health data foundations remain, but the dedicated
   workout/activity destination is lost.
4. Step 49 gaps remain confirmed: onboarding keyboard visibility and agreement
   semantics, recipe remount/freshness/nutrition presentation, bounded Coach
   completeness, and workout display.
5. API/data maturity is stronger than the visible product completeness suggests,
   but the OpenAPI document drifts from the current server for profile and
   direct diary editing. PostgreSQL tenant isolation remains application-level,
   not database-level.
6. Localization was not proven as an implemented product capability. Current
   date/copy behavior is predominantly English and partly `en-US`, so this is a
   product gap to design, not a historical implementation to blindly restore.
7. Historical visual work largely survived or was intentionally modernized:
   3D feature icons, depth surfaces, theme-aware shadows, imagery identity,
   reduced-motion behavior, and the five-tab shell are present. Exact historical
   pixel parity is not a product contract.

The audit identifies **38 meaningful historical product capabilities**:

- **18** preserved as equivalent at source level;
- **7** preserved but materially changed;
- **6** partially preserved;
- **1** present but hidden;
- **1** present but broken;
- **1** present but disconnected;
- **1** historically implemented but lost;
- **1** documented but implementation unproven;
- **1** superseded by a better current implementation;
- **2** obsolete or unsafe and should not be restored.

No P0 gap was confirmed. The strongest owner-visible deltas are the absent
Fitness/workout destination, static recipe freshness, incomplete nutrition
states, limited/dark-gated Coach behavior, unfinished onboarding keyboard and
agreement UX, hidden secondary surfaces, and unproven native capabilities.

## 2. Canonical SHA/tree

- Canonical ref: `origin/main`.
- SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`.
- Tree: `1a598be866150d488bc21ccd598de3104c638b02`.
- Canonical `origin/main` remained unchanged during this audit.
- The working checkout is a divergent documentation workspace and was not used
  as the product baseline.
- Current source comparisons refer to the exact canonical tree unless a
  historical ref is explicitly named.

## 3. Build 5 identity

The release under comparison is:

- Version: `1.0.0`
- iOS build: `5`
- Bundle identifier: `com.etiendem.caloraapp`
- EAS build ID: `088c4dc8-0ed9-4293-b7b7-4925045cbbbe`
- Build source SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`

The report `48_CALORA_IOS_BUILD_5_TESTFLIGHT_SUBMISSION_REPORT.md` records this
identity. This audit did not rebuild, alter, or submit Build 5.

## 4. Complete refs/branches inspected

The audit inspected read-only Git metadata and source through:

- `origin/main` and the canonical `origin/HEAD`;
- local `main`;
- `origin/release/calora-onboarding-and-plus` and local
  `release/calora-onboarding-and-plus`;
- `release/calora-build-ready`;
- `release/calora-native-storage`;
- `release/calora-onboarding-durable`;
- `release/calora-p1-clean`, `release/calora-p1-clean-v2`, and
  `release/calora-p1-clean-v3`;
- `backup-before-github-sync`;
- `backup/main-before-curated-reconciliation`;
- `backup/pre-expo-build-push`;
- `backup/pre-git-reconcile`;
- `backup/pre-water-widget-restore`;
- `reconciliation/calora-onboarding-plus-controlled`;
- `reconciliation/curated-calora-publish`;
- `reconciliation/final-clean-calora-publish`;
- `replit-agent`;
- `replit-pre-auth-sync-backup` and
  `replit-pre-auth-sync-backup-original`;
- safety refs, agent refs, and all available `subrepl-*` refs;
- tags `auth-production-verified-v1`, `auth-production-verified-v2`,
  `replit-pre-auth-sync-backup-v1`, and
  `replit-pre-auth-sync-backup-original-v1`.

The workspace exposed 464 refs at audit time, including 425 local heads,
remote refs, tags, backup refs, release refs, reconciliation refs, and
sub-repl refs. Approximately 2,593 commits were reachable from the available
ref set. These counts describe the inspected repository state; they are not
claims about remote history outside the checkout.

No ref was checked out, moved, merged, cherry-picked, or rewritten.

## 5. Complete historical report index

The report archaeology covered the numbered release reports, product/design
reports, intelligence reports, security/reliability reports, certification
reports, and historical reports carried only by divergent refs.

### Product and release reports

- `33_CALORA_CONTROLLED_RECONCILIATION_MAIN_INTEGRATION_REPORT.md`
- `34_CALORA_REMOTE_MAIN_DIVERGENCE_RECONCILIATION_REPORT.md`
- `35_CALORA_FINAL_MAIN_GITHUB_PUSH_REPORT.md`
- `36_CALORA_CANONICAL_MAIN_TESTFLIGHT_BUILD_REPORT.md`
- `37_CALORA_GITHUB_RELEASE_GATE_FAILURE_ROOT_CAUSE_REPORT.md`
- `38_CALORA_RELEASE_GATE_REMEDIATION_AND_VERIFICATION_REPORT.md`
- `39_CALORA_GITHUB_ACTIONS_CONTROLLER_FORENSIC_REPORT.md`
- `40_CALORA_RELEASE_GATE_PERMISSION_REMEDIATION_REPORT.md`
- `41_CALORA_RELEASE_GATE_CREDENTIAL_INTEGRATION_AND_VERIFICATION_REPORT.md`
- `42_CALORA_CANONICAL_IOS_TESTFLIGHT_RELEASE_REPORT.md`
- `43_CALORA_CLEAN_CANONICAL_RELEASE_CHECKOUT_AND_TESTFLIGHT_REPORT.md`
- `44_CALORA_CANONICAL_PREBUILD_BLOCKER_REMEDIATION_REPORT.md`
- `45_CALORA_CANONICAL_IOS_TESTFLIGHT_RELEASE_REPORT.md`
- `46_CALORA_IOS_BUILD_NUMBER_CONTROL_REMEDIATION_REPORT.md`
- `47_CALORA_CANONICAL_IOS_BUILD_5_REPORT.md`
- `48_CALORA_IOS_BUILD_5_TESTFLIGHT_SUBMISSION_REPORT.md`
- `49_CALORA_HISTORICAL_REQUIREMENTS_MISSING_WORK_FORENSIC_REPORT.md`
- `FINAL_CALORA_RELEASE_CANDIDATE_FREEZE_REPORT.md`
- `CALORA_MAIN_BRANCH_RECONCILIATION_AUDIT.md`
- `CALORA_PRODUCTION_API_DEPLOYMENT_FINAL_REPORT.md`
- `CALORA_PRODUCTION_API_REMEDIATION_PREFLIGHT_REPORT.md`
- `CALORA_TESTFLIGHT_OLD_RUNTIME_FORENSIC_REPORT.md`

### Divergent historical release reports

The historical release ref contained these reports that are absent from
canonical main:

- `16_CALORA_POST_INSTALL_DEFECT_REMEDIATION_REPORT.md`
- `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md`
- `18_CALORA_PLUS_RECIPE_FRESHNESS_FINAL_CLOSURE_REPORT.md`
- `19_CALORA_FINAL_POST_INSTALL_GITHUB_SYNC_REPORT.md`

They are evidence of intended work, not proof that the implementation survived.

### Product, design, and feature reports

- `CALORA_3D_UI_MOTION_REDESIGN_FINAL_REPORT.md`
- `ICON_3D_REDESIGN_REPORT.md`
- `docs/calora-feature-preservation-matrix.md`
- `docs/calora-spatial-ui-baseline.md`
- `docs/CALORAAPP_METADATA_LOCKIN_REPORT.md`
- `docs/CALORAAPP_PRODUCT_METADATA.md`
- recipe, Planner, image, and interaction certification reports;
- historical Coach and intelligence phase reports;
- payment, referral, whole-app, profile, and production-readiness
  certifications.

### Intelligence, security, and reliability reports

- `docs/CALORA_INTELLIGENCE_PHASE_0_AUDIT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_1_FOUNDATION_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_1_5_HARDENING_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_1_6_DATABASE_SECURITY_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_1_7_POSTGRES_TENANT_ISOLATION_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_1_8_LEAST_PRIVILEGE_RLS_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_1_8A_INFRASTRUCTURE_AND_PHASE_2A_FEASIBILITY_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_1_9_LOCAL_ISOLATION_TRANSIENT_INSIGHT_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_0_PROGRESS_DEVICE_VALIDATION_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_1_TODAY_INTELLIGENCE_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_2_POST_LOG_INTELLIGENCE_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_3_SHORT_TREND_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_4_NUTRITION_COVERAGE_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2A_5_MACRO_RECORD_COVERAGE_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2B_CONSOLIDATION_READINESS_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2B_REMEDIATION_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2B_REREVIEW_REPORT.md`
- `docs/CALORA_INTELLIGENCE_PHASE_2B_SECOND_REMEDIATION_REPORT.md`
- `docs/CALORA_INTELLIGENCE_SUPABASE_SECURITY_REPORT.md`
- `docs/CALORA_COACH_EXISTING_CONTEXT_FORENSIC_AUDIT.md`
- `docs/CALORA_COACH_FACT_CONTEXT_DARK_ARCHITECTURE_REPORT.md`
- `docs/CALORA_COACH_FACT_CONTEXT_FINAL_GO_NO_GO_REPORT.md`
- `docs/CALORA_COACH_FACT_CONTEXT_PRODUCTION_EVIDENCE_REPORT.md`
- `docs/CALORA_COACH_FACT_CONTEXT_PRODUCTION_MIGRATION_VERIFICATION_REPORT.md`
- `docs/calora-production-readiness-certification.md`
- `docs/CALORA_PRODUCTION_READINESS_MASTER_AUDIT_2026-09-03.md`

Report titles were treated as search leads. Claims were accepted only when
source, ancestry, tests, or current wiring supported them.

## 6. Historical commit eras/timeline

### Era 1 — Foundation, capture, recipes, and planning

Representative commits include `8c25afd` for text/label/voice/receipt
adapters, `b0ecf51` and `44c76d9` for recipes and Food Memory integration,
`1b69248` and `56ea0cb` for Planner/program pools, `67da943` for recipe-to-
shopping flow, `d969d21` for shopping day attribution, and `d64e295` for
Progress motion/memory work.

### Era 2 — Authentication, account, social, and monetization

Representative commits include `004a92f` for authentication foundation,
`9c83c3d` for universal-link auth callbacks, `5420697` for referral/deep-link
logic, `44eca28` for account deletion, `8af2bcf` for premium recipes,
`3e727aa` for RevenueCat premium recipe enforcement, and `3b31d3d` for
authenticated AI recipe generation and refresh.

### Era 3 — Planner, intelligence, Health, and security hardening

Representative commits include `26804ae` for program provenance/history,
`e9ce48a` for replacement undo, `5668451` and `6178534` for wellness and
weight-trend signals, `7e64411` for intelligence foundation, `f85fc8b` for
Today intelligence, `94c7cdc` for HealthKit/Health Connect adapters,
`048c33b` for diary tenant isolation, and `2486ae8` for Coach Fact Context
consent/integration.

### Era 4 — Recipe, image, nutrition, and Premium reconciliation

Representative commits include `7f210d0` for Premium recipe API/client work,
`02b7c67` for persisted AI nutrition estimates, `e151ecf` for background
nutrition warmup, `408737f` for explicit unavailable/retry nutrition,
`ec770ab` and `9b5ff77` for TheMealDB Premium V2, and `d752755` for premium
recipe image identity/audit.

### Era 5 — Fitness/More product phase and rollback

`0f5b79c` implemented a historical Fitness/activity experience, including
LES MILLS-attributed workout/activity UI. The later rollback sequence around
`0a56698` removed `app/(tabs)/fitness.tsx`, `app/(tabs)/more.tsx`,
`lib/fitness.ts`, `fitnessNavigation.test.ts`, related screenshots, and
associated navigation. The data-provider foundation was not removed from the
current product, but the dedicated destination and presentation were.

### Era 6 — Canonical release-control and safety maturity

Representative canonical commits include `7b1ae63` for durable capture
acceptance, `8965cc6` for diary image provenance, `b3b0236` for bounded Coach
requests, `5e39f25` for prebuild blockers, and `7cce885` for deterministic
build-number control.

This final era proves release and security maturity; it does not prove that
every earlier product surface remained visible.

## 7. Master historical feature catalog

The catalog below contains 38 meaningful capabilities extracted from historical
code, tests, routes, reports, deleted files, and current reconciliation evidence.
The IDs are audit identifiers, not application identifiers.

| HF ID | Historical capability | Primary evidence |
|---|---|---|
| HF-001 | Launch, session restoration, and account-scoped hydration | `004a92f`; `app/_layout.tsx`; current session providers |
| HF-002 | Durable onboarding completion and draft resumption | `e27a2e8`, `b8ed3cf`; `CaloraContext`; onboarding tests |
| HF-003 | Keyboard-aware onboarding and explicit agreement semantics | `cafea90`; divergent onboarding screen/test |
| HF-004 | Supabase authentication, verification, recovery, and PKCE | `004a92f`, `9c83c3d`; `app/auth/*` |
| HF-005 | Profile/settings/account surface | profile routes, profile tests, current `profile.tsx` |
| HF-006 | Universal links and deep-link auth/invite flow | `9c83c3d`, `5420697`; `universal-links.ts` |
| HF-007 | Referral qualification, activation, and rewards | `5420697`, `d8ecc37`, `68edd16`; referral API/client |
| HF-008 | Account deletion, recovery fence, and cleanup saga | `44eca28`, `a9a134b`; account route/tests |
| HF-009 | Home/Today dashboard and local totals | historical Home reports; current Home tab |
| HF-010 | Manual, voice, text, barcode, receipt, label, and camera logging | `8c25afd`, `6b5bfe`; Scan adapters |
| HF-011 | Smart Scan review, approval, local-first outbox, and sync | `7b1ae63`, `8965cc6`; capture/diary tests |
| HF-012 | Accepted Food Memory and Living Memory lifecycle | `44c76d9`, `b0ecf51`, `2423b6a` |
| HF-013 | Recipe browse, search, filtering, provenance, and detail | recipe missions; Recipes route |
| HF-014 | Create-your-own and authenticated AI recipe generation | `3b31d3d`; `recipeGeneration.ts` |
| HF-015 | Recipe nutrition estimation, caching, warmup, and unavailable states | `02b7c67`, `e151ecf`, `408737f` |
| HF-016 | Recipe, meal, planner, and restaurant imagery identity/fallbacks | `d752755`, `3d1bda4`; image modules |
| HF-017 | Recipe freshness, rotation, and recently-shown behavior | `c37b83d`; report 18 |
| HF-018 | Premium recipes, entitlement gates, and Premium catalogue | `8af2bcf`, `7f210d0`, `3e727aa` |
| HF-019 | Saved recipes, recipe actions, and Planner handoff | saved-recipe route and historical link tests |
| HF-020 | Weekly Planner, programs, provenance, and switching | `56ea0cb`, `26804ae`, `d31418d`, `e6c8d7c` |
| HF-021 | Meal replacement, undo, and countdown behavior | `e9ce48a`, `39526f3`, `c19645e` |
| HF-022 | Planner-derived, day-attributed shopping list | `67da943`, `d969d21`, `19f2116` |
| HF-023 | Progress, Insights, wellness, weight, and memory destinations | `d64e295`, `5668451`, `6178534`, `088dc2a` |
| HF-024 | Read-only HealthKit/Health Connect snapshots | `94c7cdc`, `c4b173b` |
| HF-025 | Dedicated Fitness/workout/activity destination | `0f5b79c`; deleted by `0a56698` |
| HF-026 | Contextual intelligence and local Today/post-log insights | `7e64411`, `f85fc8b`, `e5b1458` |
| HF-027 | Coach consent, bounded facts, evidence, and allowlisted actions | `2486ae8`, `b3b0236`, `fc68d7f` |
| HF-028 | Notifications, reminders, inbox, and account-safe reconciliation | notification modules and certification reports |
| HF-029 | 3D icons, spatial surfaces, depth hierarchy, and compact widgets | `ICON_3D_REDESIGN_REPORT.md`; spatial report |
| HF-030 | Motion, animation, haptics, and reduced-motion behavior | `d64e295`; `lib/motion.ts`; motion report |
| HF-031 | Accessibility semantics and native input affordances | `cafea90`; current labels/test IDs |
| HF-032 | Dark/light themes and theme-aware component treatment | spatial baseline; `constants/colors.ts`; `Surface.tsx` |
| HF-033 | Diary, sync, idempotency, and cross-device restore | `3ed3bd4`; sync/diary routes and tests |
| HF-034 | Production reliability, release gates, provenance, and observability controls | release reports 35–48; production readiness reports |
| HF-035 | Localization and language support | historical prompts/reports; no canonical i18n implementation proven |
| HF-036 | Older Progress/More navigation aggregation | `more.tsx`; current Insights/Plan/Profile replacement |
| HF-037 | Broad unrestricted contextual Coach/free-text intelligence | legacy Coach reports; current fail-closed boundary |
| HF-038 | Server-synchronized Health pipeline | historical possibilities; current local/native architecture |

### Master delta table

| HF ID | Product area | Historical capability | Historical evidence | Current equivalent | Classification | User-visible impact | Severity | Recovery strategy |
|---|---|---|---|---|---|---|---|---|
| HF-001 | Launch | Session restoration and account-scoped hydration | `004a92f`; root providers | Current session/hydration providers | `PRESERVED_EQUIVALENT` | NO | P2 validation gap | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` only for missing device tests |
| HF-002 | Onboarding | Completion persistence and draft resumption | `e27a2e8`, `b8ed3cf` | Durable Calora context and onboarding route | `PRESERVED_EQUIVALENT` | NO source loss | P2 validation gap | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-003 | Onboarding | Keyboard-aware fields and explicit agreement semantics | `cafea90`; divergent release branch | Plain ScrollView and generic agreement Pressable | `PARTIALLY_PRESERVED` | YES | P2 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-004 | Auth | Sign-up, verification, recovery, and PKCE | `004a92f`, `9c83c3d` | Supabase auth stack and callback | `PRESERVED_EQUIVALENT` | NO source loss | P1 validation gap | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-005 | Profile | Profile/settings/account surface | profile routes/tests | Hidden registered Profile route | `PRESENT_BUT_HIDDEN` | YES/POSSIBLY | P2/P3 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-006 | Deep links | Universal-link auth and invite flow | `9c83c3d`, `5420697` | Auth callback and invite route | `PRESERVED_EQUIVALENT` | POSSIBLY on device | P2 validation gap | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-007 | Referrals | Qualification, activation, and rewards | `5420697`, `d8ecc37`, `68edd16` | Server-owned referral API and cards | `PRESERVED_EQUIVALENT` | POSSIBLY on device | P2 validation gap | `DO_NOT_RESTORE` client qualification |
| HF-008 | Account | Deletion, recovery fence, cleanup saga | `44eca28`, `a9a134b` | Account route, locks, checkpoints, deletion fence | `PRESERVED_EQUIVALENT` | NO source loss | P1 | `DO_NOT_RESTORE` older deletion paths |
| HF-009 | Home | Today dashboard and daily totals | historical Home reports | Home tab and shared local context | `PRESERVED_BUT_CHANGED` | POSSIBLY | P1 validation gap | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-010 | Logging | Manual, voice, text, barcode, receipt, label, camera | `8c25afd`, `6b5bfe` | Scan modes and manual logging | `PRESERVED_EQUIVALENT` | NO source loss | P1 validation gap | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-011 | Smart Scan | Review, approval, outbox, sync | `7b1ae63`, `8965cc6` | Capture coordinator and diary sync | `PRESERVED_EQUIVALENT` | POSSIBLY on device | P1 | `DO_NOT_RESTORE` silent/unsafe approval |
| HF-012 | Memory | Accepted Food Memory and Living Memory | `44c76d9`, `b0ecf51`, `2423b6a` | `/memory`, food/living memory modules | `PRESERVED_EQUIVALENT` | NO | P2 | `DO_NOT_RESTORE` duplicate legacy stores |
| HF-013 | Recipes | Browse, search, filtering, provenance, detail | recipe missions and route lineage | Recipes route, sheets, provider metadata | `PRESERVED_BUT_CHANGED` | YES/POSSIBLY | P2 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-014 | Recipes | Create-your-own and authenticated AI generation | `3b31d3d` | Create/generation/photo paths with auth retry | `PRESERVED_BUT_CHANGED` | POSSIBLY | P2 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-015 | Nutrition | Estimation, warmup, caching, unavailable states | `02b7c67`, `e151ecf`, `408737f` | Nullable nutrition API and card/detail rendering | `PARTIALLY_PRESERVED` | YES | P2 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-016 | Images | Meal/recipe/restaurant identity and fallbacks | `d752755`, `3d1bda4` | Identity resolver, cache, PlannerMealImage | `PARTIALLY_PRESERVED` | POSSIBLY | P2/P3 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-017 | Freshness | Rotation, recently-shown exclusion, variety | `c37b83d`; report 18 | Deterministic interleaving and finite cache | `PRESENT_BUT_BROKEN` | YES | P2 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-018 | Premium | Premium recipes and entitlement gates | `8af2bcf`, `7f210d0`, `3e727aa` | RevenueCat/client/server Premium paths | `PRESERVED_BUT_CHANGED` | POSSIBLY | P2 validation gap | `DO_NOT_RESTORE` old gate logic |
| HF-019 | Recipes | Saved recipes and Planner handoff | saved route and historical link tests | Saved Recipes route and Planner actions | `PRESERVED_EQUIVALENT` | NO | P2 validation gap | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-020 | Planner | Weekly Planner, programs, provenance, switching | `56ea0cb`, `26804ae`, `d31418d`, `e6c8d7c` | Planner route/state machine | `PRESERVED_EQUIVALENT` | NO source loss | P2 | `DO_NOT_RESTORE` old Planner tree |
| HF-021 | Planner | Meal replacement, undo, countdown | `e9ce48a`, `39526f3`, `c19645e` | Shared Planner mutation path | `PRESERVED_EQUIVALENT` | NO | P2 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-022 | Shopping | Planner-derived, day-attributed list | `67da943`, `d969d21`, `19f2116` | ShoppingListSheet and Planner data | `PRESERVED_EQUIVALENT` | NO | P2 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-023 | Progress | Progress, Insights, wellness, weight, memory | `d64e295`, `5668451`, `6178534`, `088dc2a` | Visible Progress label backed by Insights | `PRESERVED_BUT_CHANGED` | POSSIBLY | P3 | `DO_NOT_RESTORE` old Progress screen |
| HF-024 | Health | HealthKit/Health Connect snapshots | `94c7cdc`, `c4b173b` | Read-only native services and local snapshots | `PARTIALLY_PRESERVED` | POSSIBLY | P2 | `MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE` for expansion |
| HF-025 | Health | Imported workout data visibly surfaced | historical Fitness and current stored snapshots | Workouts stored; no rendered destination | `PRESENT_BUT_DISCONNECTED` | YES | P2 | `MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE` |
| HF-026 | Fitness | Dedicated training/activity destination | `0f5b79c`; deleted by `0a56698` | No direct route; Profile/Insights fragments | `HISTORICALLY_IMPLEMENTED_BUT_LOST` | YES | P2 | `MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE` |
| HF-027 | Intelligence | Local Today/post-log contextual insights | `7e64411`, `f85fc8b`, `e5b1458` | Local intelligence modules and bounded facts | `PARTIALLY_PRESERVED` | YES/POSSIBLY | P1/P2 | `MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE` |
| HF-028 | Coach | Consent, bounded facts, evidence, allowlisted actions | `2486ae8`, `b3b0236`, `fc68d7f` | Fact Context consent/chat/action flow | `PRESERVED_EQUIVALENT` for safety boundary | POSSIBLY | P1 | `DO_NOT_RESTORE` unrestricted behavior |
| HF-029 | Notifications | Inbox, reminders, preferences, reconciliation | notification modules/reports | Profile/root notification services | `PRESERVED_BUT_CHANGED` | POSSIBLY/YES | P2 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-030 | Visual system | 3D icons, surfaces, depth, compact widgets | icon and spatial reports | `CaloraFeatureIcon`, `Surface`, tokens | `PRESERVED_EQUIVALENT` | NO confirmed loss | P3 | `DO_NOT_RESTORE` exact old geometry |
| HF-031 | Motion | Animation, haptics, reduced motion | `d64e295`; motion report | `lib/motion.ts`, Reanimated, haptics | `PRESERVED_EQUIVALENT` | POSSIBLY on device | P3 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-032 | Accessibility | Labels, roles, focus/input affordances | `cafea90`; current labels | Broad labels/test IDs but onboarding gaps | `PARTIALLY_PRESERVED` | YES | P2 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-033 | Themes | Dark/light theme treatment | spatial baseline; color tokens | Theme context, colors, Surface | `PRESERVED_EQUIVALENT` | POSSIBLY on device | P3 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-034 | Sync | Diary, idempotency, cross-device restore | `3ed3bd4` | Sync route, ledger, ownership predicates | `PRESERVED_EQUIVALENT` | POSSIBLY on device | P1 | `DO_NOT_RESTORE` weaker client ownership |
| HF-035 | Reliability | Release gates, provenance, observability controls | reports 35–48 | Release validation and safety controls | `PRESERVED_BUT_CHANGED` | LOW directly | P1 | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| HF-036 | Localization | Language catalog and localized formatting | historical prompts/reports | No proven i18n system; mixed formatting | `DOCUMENTED_BUT_IMPLEMENTATION_UNPROVEN` | YES for affected users | P2 | `MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE` |
| HF-037 | Navigation | Older Progress/More aggregation | historical `more.tsx` and tab layout | Visible Plan/Progress, hidden Profile | `SUPERSEDED_BY_BETTER_CURRENT_IMPLEMENTATION` | POSSIBLY | P3 | `DO_NOT_RESTORE` |
| HF-038 | Coach/Health | Unrestricted Coach and server Health expansion | legacy Coach reports and historical concepts | Fail-closed Coach and local Health boundary | `OBSOLETE_OR_UNSAFE_DO_NOT_RESTORE` | NO safe loss claim | P1 | `DO_NOT_RESTORE` |

## 8. Current canonical feature catalog

| Product area | Current canonical status | User-facing reachability |
|---|---|---|
| Launch/session | `VISIBLE_AND_WIRED` | Root launch and hydration |
| Onboarding | `VISIBLE_BUT_PARTIAL` | Root route; draft and completion persist |
| Authentication | `VISIBLE_AND_WIRED` | Auth stack and callback |
| Account creation/recovery | `VISIBLE_AND_WIRED` | Sign-up, verification, recovery |
| Home/Today | `VISIBLE_AND_WIRED` | Visible Home tab |
| Manual logging | `VISIBLE_AND_WIRED` | Home and Scan actions |
| Voice/text/barcode/receipt/label capture | `VISIBLE_AND_WIRED` | Scan modes |
| Smart Scan approval | `VISIBLE_AND_WIRED` | Review then explicit approval |
| Food Memory/Living Memory | `VISIBLE_AND_WIRED` | Memory route and accepted logs |
| Recipes/Discover | `VISIBLE_BUT_PARTIAL` | Visible Recipes tab |
| Search/filter/detail/create | `VISIBLE_AND_WIRED` | Recipes route and sheets |
| Plus/Premium | `VISIBLE_BUT_PARTIAL` | Profile membership and recipe gates |
| Saved recipes | `VISIBLE_AND_WIRED` | Secondary route from Recipes |
| Planner/programs | `VISIBLE_AND_WIRED` | Visible Plan tab |
| Shopping | `VISIBLE_AND_WIRED` | Planner-derived sheet |
| Progress/Insights | `VISIBLE_AND_WIRED` | Visible Progress label, Insights route |
| Health connection | `VISIBLE_BUT_PARTIAL` | Profile health management |
| Workout display | `MISSING` as a rendered destination | Health snapshots store workouts |
| Coach | `VISIBLE_BUT_PARTIAL` | Root route, gated Fact Context |
| Diary/sync | `BACKEND_ONLY` plus local surfaces | Home, Memory, sync paths |
| Profile/settings | `IMPLEMENTED_BUT_HIDDEN` from tab bar | Home/header/invite/Coach entry |
| RevenueCat/paywall | `VISIBLE_BUT_PARTIAL` | Profile Membership tab |
| Referrals | `VISIBLE_AND_WIRED` but secondary/deep-link assisted | Profile and invite |
| Notifications | `VISIBLE_BUT_PARTIAL` | Profile inbox/preferences and root handler |
| Dark/light mode | `VISIBLE_AND_WIRED` | Profile/theme and shared tokens |
| Accessibility | `VISIBLE_BUT_PARTIAL` | Labels and test IDs, onboarding gaps |
| Motion/3D icons | `VISIBLE_AND_WIRED` | Shared visual system |
| Localization | `MISSING` as a proven product system | English/partial device locale behavior |
| Encrypted recovery preview | `DEAD_OR_ORPHANED`/internal | Reached from recovery error path only |
| Meal image preview | `IMPLEMENTED_BUT_HIDDEN`/conditional | Deep flow only |

## 9. Historical route inventory

Historical route/navigation states varied by era. The most important route set
was the five-tab redesign before Fitness/More rollback:

- Root launch: `/`.
- Visible tabs: Home, Recipes, Scan, Fitness, More.
- Registered but hidden tabs: Insights, Planner, Profile.
- Root routes: Coach, Memory, Restaurants, Invite, auth stack, and not-found.
- Historical `FitnessScreen` provided connection/sync, steps, active energy,
  workouts, and official programs.
- Historical `MoreScreen` aggregated Plan, Progress, Profile/Settings, and
  Membership.

The historical route inventory is proven by `8ede33d`, `0f5b79c`, the
historical `app/(tabs)/_layout.tsx`, and deleted-file evidence around `0a56698`.

## 10. Current route inventory

Canonical current routes include:

- `/` launch/onboarding;
- `/(tabs)/index` Home;
- `/(tabs)/recipes` Recipes;
- `/(tabs)/scan` Smart Scan;
- `/(tabs)/insights` visible Progress label;
- `/(tabs)/planner` Plan;
- hidden registered `/profile`;
- root `/coach`, `/memory`, `/restaurants`, `/saved-recipes`;
- conditional `/meal-image-preview`;
- internal `/encrypted-recovery-preview`;
- `/invite/[code]`;
- `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`,
  `/auth/reset-password`, `/auth/verify-email`, `/auth/callback`;
- `+not-found`.

Profile is registered with `href: null` but is reachable through Home/header
actions, Coach actions, invite handling, and explicit profile pushes.
Invite and auth callback are intentionally deep-link-oriented rather than
ordinary tab destinations.

## 11. Route differential

| Historical route/surface | Current result | Classification |
|---|---|---|
| Fitness tab | No route; Health management moved to Profile and signals to Insights | `HISTORICALLY_IMPLEMENTED_BUT_LOST` for dedicated destination |
| More tab | Removed; Plan, Progress, Profile, and Membership are now separate/embedded | `SUPERSEDED_BY_BETTER_CURRENT_IMPLEMENTATION` |
| Progress route | Current `/insights` route is visible as Progress | `SUPERSEDED_BY_BETTER_CURRENT_IMPLEMENTATION` |
| Profile tab | Registered but hidden from the tab bar | `PRESENT_BUT_HIDDEN` |
| Membership/paywall route | Embedded in Profile Membership | `PRESERVED_BUT_CHANGED` |
| Notification route | No standalone route; Profile/root services expose it | `PRESERVED_BUT_CHANGED` |
| Coach | Root route with bounded consent and action navigation | `PRESERVED_BUT_CHANGED` |
| Memory | Root route from Insights/Profile | `PRESERVED_EQUIVALENT` |
| Restaurants | Root route from Home/Scan flows | `PRESERVED_EQUIVALENT` |
| Invite/auth callback | Deep-link-only by design | `PRESERVED_EQUIVALENT` |
| Encrypted recovery preview | Registered internal route; normal navigation absent | `PRESENT_BUT_HIDDEN` |
| Meal image preview | Conditional internal/deep flow | `PRESENT_BUT_HIDDEN` |

The missing Fitness route is a real user-visible destination delta, not proof
that all Health functionality disappeared.

## 12. Historical major component inventory

Meaningful historical components and screen-level structures include:

- `FitnessScreen` and `FitnessTrustForward`;
- `MoreScreen`;
- `HourlyBackground`;
- the 3D `CaloraFeatureIcon` system;
- historical Planner, recipe card, recipe detail, Scan, Coach, and onboarding
  surfaces;
- profile/premium/referral cards;
- recipe image identity and loading helpers;
- historical planner-to-recipe and original-recipe helpers;
- historical calorie-gauge helper;
- notification inbox/reminder modules;
- Coach context/governance panels;
- Food Memory and Living Memory data surfaces.

Generic primitives were not treated as product capabilities unless they
represented a meaningful user-facing contract.

## 13. Current major component inventory

Canonical current major components include:

- `AppChrome`, `SwipeableTabList`, `BottomSheet`, `Surface`,
  `KeyboardAwareScrollViewCompat`, `ScalePressable`;
- `CaloraFeatureIcon`, `PlannerPeek`, `PlannerMealImage`,
  `ShoppingListSheet`, `FoodLogThumbnail`, `LocalSaveNotice`;
- `ProfileYouSettings`, `AccountSection`, `ReferralCard`,
  `ReferralActivator`;
- `CoachFactContextConsentPanel` and root `coach.tsx`;
- `ErrorBoundary`, `ErrorFallback`, and encrypted recovery helpers;
- Home, Recipes, Scan, Insights, Planner, Profile, Memory, Restaurants,
  Saved Recipes, and auth screen implementations.

## 14. Component differential

| Historical component | Current equivalent | Result |
|---|---|---|
| `FitnessScreen` | Profile Health section plus Insights signals | Dedicated presentation lost |
| `MoreScreen` | Visible Plan/Progress plus hidden Profile/Membership | Aggregator superseded |
| `FitnessTrustForward` | Current Profile Health trust copy/modal | Component form lost; concept partially absorbed |
| `HourlyBackground` | `hourlyHeaderImages.ts` and `useHourlyHeaderImage` | Narrower per-surface replacement |
| 3D feature icons | `CaloraFeatureIcon.tsx` | Preserved |
| historical Planner/recipe cards | Current Planner/Recipes/Surface hierarchy | Preserved but redesigned |
| historical Coach orb/presentation | Current bounded Coach orb/consent/chat | Preserved but intentionally gated |
| planner recipe-link helper | Current Planner/recipe handoff | Older helper superseded |
| original recipe catalogue | Current provider/Premium/Create paths | Older catalogue superseded |
| calorie-gauge helper | Current gauge/progress presentation | Older helper superseded |

## 15. Deleted-feature archaeology

The deletion audit found these meaningful product deletions:

| Deleted item | Evidence | Classification |
|---|---|---|
| `app/(tabs)/fitness.tsx` | `0a56698`, 512-line deleted screen | `DELETED_WITH_FUNCTIONALITY_LOST` for dedicated workout destination |
| `app/(tabs)/more.tsx` | `0a56698` rollback | `DELETED_BUT_SUPERSEDED` |
| `lib/fitness.ts` | `0a56698` | `DELETED_BUT_SUPERSEDED` at data-provider UI layer |
| `fitnessNavigation.test.ts` | `0a56698` | Coverage deleted with route |
| `HourlyBackground.tsx` | added by `3023a9c`, deleted by `f44bef9` | `DELETED_BUT_SUPERSEDED` |
| `caloraOriginalRecipes.ts` and test | `a99e35b` | `DELETED_BUT_SUPERSEDED` |
| `calorieGaugeResize.ts` and test | `7cd4c20` | `DELETED_BUT_SUPERSEDED` |
| `plannerRecipeLink.ts` and test | `079f506` | `DELETED_BUT_SUPERSEDED` |
| `referralQualification.ts` and test | `f23bc4c` | `DELETED_BUT_SUPERSEDED` by server-owned qualification |
| historical Premium image/report artifacts | reconciliation refs | `DELETED_BUT_SUPERSEDED` or documentation-only |

No evidence supports restoring deleted files wholesale. The Fitness case is
the only confirmed meaningful user-facing capability whose dedicated
presentation was not replaced one-for-one.

## 16. Historical API inventory

Historical API capabilities include:

- authentication/session and callback support;
- recipe list/detail/generation/photo/nutrition;
- capture analysis and approval;
- Planner generation;
- legacy Coach and later Fact Context/consent;
- diary writes, first-log verification, and sync;
- account deletion/recovery;
- referrals/rewards;
- Premium recipes and entitlement enforcement;
- universal-link and invite support;
- historical profile route;
- Health-related concepts, mostly local/native rather than server diary data.

Historical API contracts were found in route files, OpenAPI, tests, and
commits including `3ed3bd4`, `3e727aa`, `5420697`, `9c83c3d`, `7b1ae63`,
and `8965cc6`.

## 17. Current API inventory

`artifacts/api-server/src/routes/index.ts` registers current families for:

- health/version;
- recipes, generated recipes, and recipe photos;
- capture analyze and approval;
- Planner generation;
- legacy Coach plus controlled Fact Context and consent;
- account deletion;
- referrals;
- diary and first-log;
- sync;
- Premium recipes;
- restaurant foods.

Current server contracts derive identity from authenticated tokens, enforce
account ownership in diary/sync/referral/account routes, and use idempotency,
advisory locks, mutation ledgers, stale/tombstone handling, and provider
entitlement checks in the appropriate paths.

## 18. API differential

Two concrete contract drift items were confirmed:

1. OpenAPI advertises `GET/POST/PUT/DELETE /v1/profile`, but the canonical
   server route index has no profile route. Current profile behavior is
   primarily local/mobile-oriented. This may be intentional, but the generated
   contract is not a truthful server inventory.
2. OpenAPI advertises direct diary `PUT`, while `diary.ts` implements GET,
   POST, and DELETE. Sync upsert is the effective edit path. The direct API
   contract is therefore incomplete or stale.

`compatibility-contract.test.ts` covers important mobile-used endpoint
families, including capture approval and recipe cursors, but it is not a
complete audit of profile, direct diary methods, legacy Coach, account
deletion, Health, universal links, and RevenueCat provider contracts.

These are contract-truthfulness and coverage gaps. Deprecated or insecure
historical endpoints must not be restored without a current product decision.

## 19. Historical data-model concepts

Historical data concepts include:

- authenticated account/profile identity;
- diary entries with client IDs and nutrition;
- capture sessions/candidates and approval state;
- image asset keys and provenance;
- Food Memory and accepted memories;
- saved meals/recipes;
- Planner meals, programs, replacement state, and provenance;
- shopping items and day attribution;
- weight/wellness/activity records;
- Health snapshots and workouts;
- subscriptions and entitlement state;
- referrals, redemptions, and qualification;
- sync mutation ledger;
- Coach consent, nonce/idempotency, cohort rollout, and fact context;
- recipe nutrition cache/rate limits;
- deletion and recovery state.

## 20. Current data-model concepts

Canonical schema and local state preserve most of those concepts:

- account/profile rows with ownership;
- diary ownership, foreign keys, client-id uniqueness, capture provenance,
  image metadata, nutrition, and allowlisted sync JSON;
- weight, saved meals/recipes/items;
- capture sessions/candidates;
- subscriptions;
- referral codes/redemptions/qualification;
- sync mutation ledger;
- Coach consent/idempotency/config/cohort state;
- recipe nutrition, rate limits, deletion, and recovery state.

Health snapshots intentionally remain in the native/local architecture rather
than entering the server diary pipeline. That is a documented architecture
boundary, not an accidental missing schema.

The important security limitation is that the shared privileged PostgreSQL
pool does not provide database-level tenant RLS. API predicates and tests
provide the current isolation boundary.

## 21. Historical test-contract archaeology

Historical tests exposed requirements that are not all retained in canonical:

- `cafea90` onboarding keyboard-aware and agreement accessibility tests;
- `c37b83d` freshness/rotation closure tests;
- historical Fitness navigation tests;
- profile route tests on the divergent release branch;
- capture persistence integration tests in historical reconciliation work;
- planner recipe-link, original-recipe, and calorie-gauge tests that were later
  removed with replaced helpers.

Historical tests were treated as contracts to compare, not as permission to
restore their implementation.

## 22. Current test coverage

Current source-level coverage is broad, including roughly 1,964 test/it
declarations by source count across mobile and API suites. It includes:

- auth/session and account storage;
- onboarding persistence and hydration;
- capture, approval, Food Memory, Home, diary, and sync;
- Planner, programs, replacement, shopping, and image identity;
- recipe providers, nutrition, rate limits, Premium access, and refresh policy;
- Coach context, consent, rate limits, output validation, and tenant predicates;
- RevenueCat, referrals, universal links, account deletion, recovery, and
  notifications;
- Health pure logic and provider adapters.

Coverage remains partial for:

- native keyboard/VoiceOver/TalkBack onboarding;
- physical camera/barcode/microphone providers;
- HealthKit/Health Connect permissions and populated records;
- live purchase/restore/cancellation;
- deep-link install/open/force-quit behavior;
- notification scheduling and tap routing;
- background/resume and process-kill persistence;
- production crash and Coach outcome observability;
- live provider cardinality and freshness;
- complete API/OpenAPI compatibility.

## 23. Onboarding delta

Completion persistence and draft resumption are preserved through durable,
account-scoped state and a flush-before-navigation boundary. The canonical
screen, however, uses a plain `ScrollView`; the historical divergent branch
contains keyboard-aware behavior, bottom offset, extra keyboard space,
platform dismissal, and focused tests.

The agreement control gates completion and persists consent but lacks the
historical explicit accessibility role/state, required label, test identifier,
spoken checked state, and strong tap affordance.

Classification: **partially preserved**.  
User-visible impact: **YES**, especially on small native screens and with
VoiceOver/TalkBack.  
Severity: **P2**.  
Recovery: **SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT**.

## 24. Home/Today delta

Home remains the primary Today surface. It contains diary entries, daily
nutrition totals, wellness slots, planner peek, quick logging, Scan entry,
Coach entry, Health prompts, images, and animated macro/water treatments.

The historical compact action and editorial visual work survived as a redesign.
The Home data path uses shared local context rather than a stale independent
query cache. No confirmed product capability loss was found.

Classification: **preserved but changed**.  
User-visible impact: **POSSIBLY**, due to visual differences rather than
missing core behavior.  
Severity: **P3** for exact visual parity; **P1** only for unverified native
Smart Scan-to-Today execution.

## 25. Logging delta

Manual, text, voice, barcode, receipt, label, and camera paths are represented.
Accepted entries retain date, meal, nutrition, provenance, image metadata, and
snapshot information. Local logs survive server sync failure and later retry.

The current design preserves explicit review and approval rather than silently
turning an analysis candidate into a diary entry.

Classification: **preserved equivalent at source level**.  
User-visible impact: **NO** for source behavior; **POSSIBLY** for native
permissions/provider failures.  
Recovery: no historical branch recovery indicated.

## 26. Smart Scan/capture delta

The current path is:

```text
Scan tab
→ camera/library/barcode/receipt/label/text/voice mode
→ analysis API
→ local review draft
→ editable candidate
→ explicit approval
→ FoodLog + Food Memory + nutrition snapshot + diary outbox
→ persistence flush
→ Home Today totals
→ authenticated eventual sync
```

This is preserved and strengthened by `7b1ae63` and `8965cc6`. The remaining
delta is evidence, not a proven source defect: physical camera permissions,
real provider behavior, offline/background recovery, cross-device timing, and
near-midnight date boundaries remain unverified.

Classification: **preserved equivalent at source level**.  
Severity: **P1 validation gap**.

## 27. Food Memory delta

Accepted memories, legacy diary compatibility, corrections, forget/undo,
repeat structures, provenance, and living-memory normalization are present.
The visible Memory route is a newer placement than the earliest Planner/Recipes
integration.

Classification: **preserved equivalent**.  
User-visible impact: **NO confirmed loss**.  
Recovery: **DO NOT RESTORE** older duplicated memory stores.

## 28. Recipes delta

Recipes retain browse, search, filters, source/provenance treatment, detail,
saved actions, create/generate flows, image paths, Premium catalogue, and
Planner handoffs. The current product is not missing the recipe domain.

It is materially incomplete in three areas:

- repeated deterministic ordering/freshness;
- intentional remount refetch behavior in Plus;
- inconsistent nutrition presentation when data is pending, partial, or
  unavailable.

Classification: **preserved but changed**, with linked broken/partial
sub-capabilities.  
User-visible impact: **YES**.  
Severity: **P2**.

## 29. Discover delta

Discover interleaves categories, deduplicates IDs, and caches a finite pool for
approximately one hour. It does not provide a meaningful rotation seed,
recently-shown exclusion, session/day variety, or equivalent freshness logic.

The closure work in `c37b83d` and report 18 is not in canonical ancestry.
Refetching a deterministic provider page does not solve the product problem.

Classification: **present but broken**.  
User-visible impact: **YES**.  
Severity: **P2**.  
Recovery: **SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT** while preserving
truthful source exhaustion and account isolation.

## 30. Plus/Premium delta

Premium entitlement checks, offering/purchase/restore paths, server entitlement
authority, Premium recipe access, saved recipes, and bounded pagination are
present. The historical `3e727aa` lineage being outside one canonical ancestry
does not mean RevenueCat functionality is lost; equivalent reconciled behavior
exists.

The Plus-specific delta is:

- `refetchOnMount: "always"` causes a request on submenu remount;
- loaded cards are visually retained, masking rather than eliminating the
  request;
- freshness remains weak when the provider returns the same order;
- live purchase/restore/cancellation behavior is not physically proven.

Classification: **preserved but changed**, with a **present but broken** reload
policy.  
Severity: **P2**.

## 31. Planner delta

Planner preserves Today/Week/Shopping workspaces, program generation and
fallback, viewed-week context, meal insertion/edit/move/copy/replace, undo,
logging, image identity, and shared local mutation paths. Program provenance and
switching are explicit.

Classification: **preserved equivalent at source level**.  
User-visible impact: **NO confirmed historical loss**.  
Native/generated-live evidence remains partial.

## 32. Weekly Programs delta

Weekly Programs and program modal state transitions remain in the current
Planner architecture. Eligibility, provenance, switching, fallback, and
program-shaped versus starter-week behavior are represented.

Classification: **preserved equivalent**, with native/live generation evidence
still partial. Historical program code should not be restored over the current
state machine.

## 33. Shopping delta

The shopping list remains Planner-derived, locally checked, day-attributed, and
available from the Planner workspace. Historical recipe-to-shopping continuity
is represented through current Planner and Shopping components.

Classification: **preserved equivalent**.  
No historical product gap requiring recovery was found.

## 34. Progress/Insights delta

The older Progress/navigation arrangement was superseded. The current visible
tab is labeled Progress but backed by `insights.tsx`, with trends, weight,
wellness, signals, memory, and goal-related presentation. The header memory
action routes to `/memory`.

Classification: **superseded by better current implementation**.  
User-visible impact: **POSSIBLY** for users expecting the old layout, but not a
missing capability.  
Recovery: **DO NOT RESTORE** the old Progress tree or icon placement solely from
the historical prompt.

## 35. Health delta

Current Health architecture is read-only and local/native:

| Metric | Source | Ingestion | Storage | Current destination |
|---|---|---|---|---|
| Steps | HealthKit / Health Connect | Native adapter | Local health snapshot | Insights/Progress signals |
| Active energy | HealthKit / Health Connect | Native adapter | Local health snapshot | Insights and Home remaining-calorie calculation |
| Weight | HealthKit / Health Connect | Native adapter | Local weight trend/state | Progress/weight history |
| Workouts | HealthKit / Health Connect | Native adapter | Local health snapshot | No rendered workout destination |
| Permissions/status | Native providers | Connection service | Local connection state | Profile Health section |

The dedicated historical Fitness destination is absent, and workouts are
stored without a visible user-facing list/card. Health snapshots are not sent
through the server diary path by design.

Classification: **partially preserved** and **present but disconnected** for
workout presentation.  
Severity: **P2**.  
Recovery: **MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE** after a product decision.

## 36. Coach/intelligence delta

The current Coach contains consent, chat history, clear/new-chat controls,
loading, terminal failure copy, bounded evidence, allowlisted navigation, and
request lifecycle fencing. The Fact Context path is intentionally dark-gated
and fail-closed.

It is not equivalent to the broad historical Coach/intelligence ambition:

- approved facts are currently narrower than broad hydration/pattern/wellness
  copy suggests;
- client-authored facts are validated for internal consistency but not
  independently recomputed or cryptographically proven;
- retry/backoff/offline queue behavior is incomplete;
- local history and guest/account auxiliary-key isolation need more proof;
- production latency/failure/Coach outcome observability is absent;
- native/device chat behavior is unproven.

Classification: **partially preserved**, while the restricted safety boundary
itself is preserved equivalent.  
Severity: **P1 for factual-integrity and release boundaries; P2 for completeness**.

## 37. Diary/sync delta

Diary and sync preserve local-first writes, authenticated ownership, client ID
idempotency, mutation ledgers, advisory locking, stale/tombstone handling,
retry, capture provenance, image metadata, and account-scoped restoration.

Potential contract gaps are direct diary `PUT` drift in OpenAPI and incomplete
physical process-kill/offline/date-boundary/cross-account evidence. These are
not proof that the core diary capability is missing.

Classification: **preserved equivalent at source level**, with contract and
native validation gaps.

## 38. Profile/settings delta

Profile is broad but hidden from the main tab bar. It contains membership,
account settings, profile targets/photo, appearance/theme, health connection,
reminders, notification inbox/preferences, export/delete/logout, and referrals.

The historical server profile route is absent, while current profile behavior is
local/mobile-oriented. The surface is reachable but not obvious from primary
navigation.

Classification: **present but hidden**, with API contract drift.  
User-visible impact: **YES/POSSIBLY** for users expecting a top-level Profile or
historical More destination.  
Severity: **P2/P3**.

## 39. RevenueCat/paywall delta

RevenueCat initialization, identity synchronization, offerings, purchase,
restore, entitlement reads, Premium route enforcement, promotional referral
grants, and deletion checks are present. The paywall is embedded in Profile
Membership rather than a standalone route.

No source-level capability loss was proven. Live store purchase, restore,
cancel, entitlement refresh, provider outage, and account-erasure provider
permission remain unverified.

Classification: **preserved but changed**.  
User-visible impact: **POSSIBLY** due to embedded placement and live-store
evidence gaps.

## 40. Referrals/deep-links delta

Invite codes, pending-code persistence, auth-aware activation, server-owned
qualification, atomic reward claim behavior, universal-link files, Android
filters, OG/fallback responses, and referral cards are present.

The historical client qualification helper was deleted in favor of server-owned
qualification. That is an intentional safety improvement.

Classification: **preserved equivalent**, with physical install/open/force-quit
evidence missing.

## 41. Localization delta

No shipped canonical localization catalog, locale selector, or complete
internationalization system was proven. Several current date strings use
`Intl.DateTimeFormat('en-US')`; other formatters use device locale only for
some numeric values.

Classification: **documented but implementation unproven**.  
User-visible impact: **YES** for non-English or non-US-date users.  
Severity: **P2**.  
Recovery: **MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE**, not restore a report claim.

## 42. Notifications/background delta

Notification preferences, hydration/meal/goal reminders, local inbox,
reconciliation, account-safe lifecycle, and root notification handling are
present. There is no standalone notification route.

Native scheduling, delivery, tap routing, background execution, and account
transition behavior lack complete physical-device evidence.

Classification: **preserved but changed**.  
User-visible impact: **POSSIBLY/YES** when native delivery is expected.  
Severity: **P2 validation gap**.

## 43. Accessibility delta

Current source includes labels, roles, selected/disabled states, test IDs,
text scaling, reduced-motion handling, and a prominent Scan tab. The historical
onboarding agreement semantics and keyboard-aware behavior are not preserved in
canonical.

Classification: **partially preserved**.  
User-visible impact: **YES** for onboarding keyboard and assistive technology
users.  
Severity: **P2**.

## 44. Dark/light mode delta

Light and dark palettes, theme-aware Surface/depth shadows, icon color
selection, Profile theme controls, and dark Coach/Memory/Scan presentation are
present. Reduced-motion behavior is integrated into the motion system.

Classification: **preserved equivalent at source level**.  
Exact native appearance and accessibility contrast still need device evidence.

## 45. 3D/icon/motion/animation delta

The historical visual system substantially survived:

- dimensional `CaloraFeatureIcon` treatment;
- semantic Surface/depth tiers;
- compact action rails;
- editorial header imagery;
- tab-focus springs;
- screen-entry and state-reactive animation;
- scan viewfinder pulse;
- macro/water/progress motion;
- Coach/Profile/Planner/Recipe entrance motion;
- system reduced-motion handling;
- scoped haptics.

The current system is intentionally bounded and not exact pixel parity with
every historical screenshot. The historical request for decorative animation
was constrained by later Planner and accessibility decisions.

Classification: **preserved equivalent**, with changed visual implementation.

## 46. Image/meal-image delta

Current source contains deterministic planner meal assets, food assets,
category fallbacks, editorial headers, image identity resolution, memory/disk
cache, transitions, error/fallback state, mismatch diagnostics, and provider
provenance.

The system does not guarantee a unique photograph for every meal. Finite
fallbacks, finite header pools, and remote provider failures can repeat imagery.
That is a partial content-quality gap, not evidence that image infrastructure
was lost.

Classification: **partially preserved**.  
Severity: **P2/P3**, depending on whether uniqueness is a product requirement.

## 47. Navigation delta

The current five-tab shell is Home, Recipes, Scan, Progress, Plan, with Scan
prominent in the center. This matches the newer product direction. Fitness and
More were removed; Profile, Membership, notifications, and referrals became
secondary or embedded destinations.

Classification:

- five-tab shell: **preserved equivalent**;
- old More aggregation: **superseded by better current implementation**;
- Fitness destination: **historically implemented but lost**;
- Profile/secondary surfaces: **present but hidden**.

## 48. Reliability delta

Canonical source has broad automated coverage, typechecking, account-scoped
state, explicit error boundaries, retry/error states, sync idempotency,
deletion recovery, bounded AI requests, provider rate limits, release
attestation, build provenance, signing preflight, and build-number controls.

Remaining reliability gaps:

- native physical-device matrix;
- live provider/store tests;
- inconsistent offline/retry behavior;
- no privacy-safe production crash/Coach outcome pipeline;
- incomplete API/OpenAPI contract coverage;
- no proof of background/resume and process-kill behavior;
- no database-level tenant RLS.

Classification: **preserved but changed** toward release/security maturity.
Those controls must not be counted as proof of product completeness.

## 49. Security/account-isolation delta

Current API identity is bearer-token-derived rather than request-body-derived.
Diary, sync, referrals, deletion, Coach, and Premium paths use account
predicates and provider authority. Referral activation is atomic and
server-owned. Account deletion is a staged saga with locks, checkpoints,
recovery, and deletion fencing.

The shared privileged PostgreSQL pool cannot enforce database-level tenant RLS.
This is a meaningful boundary limitation, but no exploit was proven in the
audit.

Classification: **preserved equivalent at application level**, with a **P1
security/reliability limitation** requiring controlled future review.

## 50. Dead/orphaned functionality

The following are implemented but not ordinary primary navigation:

- `encrypted-recovery-preview.tsx`: internal/diagnostic route reached from
  onboarding recovery handling;
- `meal-image-preview.tsx`: conditional image/detail flow;
- Profile: registered but hidden from the tab bar;
- invite: deep-link-only;
- auth callback: associated-link/deep-link-only;
- Coach Fact Context consent routes: controlled backend paths;
- base Health adapter: platform fallback selected by bundling;
- diary/sync routes: backend/local surfaces without a standalone Diary tab.

These are not automatically missing features. Reachability and product intent
must be distinguished from dead code.

## 51. Historically implemented functionality lost

The confirmed historically implemented and materially lost product capability is
the dedicated Fitness/workout/activity destination:

- historical `fitness.tsx` rendered training/Health/activity concepts;
- `lib/fitness.ts` and its navigation test were deleted;
- associated screenshots and More aggregation were removed;
- current Health retains ingestion/storage for workouts but does not render a
  workout destination.

The historical `FitnessTrustForward` component is also absent as a component,
although some trust explanation was absorbed into current Profile Health UI.

This is not a recommendation to restore the old branch. It requires a current
Health product decision and a new destination contract.

## 52. Intentionally superseded functionality

The following historical structures were intentionally superseded:

- old standalone Progress navigation by Insights + Memory;
- More aggregation by visible Plan/Progress and embedded Profile/Membership;
- old original recipe catalogue by provider/Premium/Create architecture;
- old planner recipe-link helper by current route handoff;
- client referral qualification by server-owned qualification;
- HourlyBackground by narrower per-surface hourly header image hooks;
- old calorie-gauge helper by current progress presentation.

These should not be restored solely because their old files or reports exist.

## 53. Obsolete/unsafe functionality not to restore

Do not restore:

- unrestricted legacy Coach/free-text contextual intelligence;
- broad client-authored contextual facts without independent provenance;
- an invented server Health/diary pipeline when current architecture is local and
  native read-only;
- old Plus trees or fake infinite scrolling;
- fabricated nutrition values or null-to-zero claims that imply certainty;
- whole historical release branches or reports as runtime code;
- client-owned referral qualification or rewards.

The current fail-closed Coach, account predicates, provider authority,
truthful exhaustion, and local Health boundary are safety constraints.

## 54. Current backend-only/hidden functionality

Backend-only or secondary capabilities include:

- diary/sync and first-log verification;
- Coach consent/context/response routes;
- account deletion/recovery fencing;
- referral qualification/reward claims;
- Premium entitlement verification;
- Health native snapshots and permission state;
- notification reconciliation and scheduling state;
- Profile membership/settings/health/notifications;
- invite/auth callback routes;
- encrypted recovery export/preview;
- meal-image preview.

Their hidden or indirect route does not prove that their underlying capability
is absent.

## 55. User-visible missing functionality

The strongest user-visible gaps are:

1. Dedicated Fitness/workout/activity destination.
2. Discover freshness and meaningful rotation.
3. Plus remount request behavior.
4. Consistent nutrition pending/partial/unavailable presentation.
5. Full onboarding keyboard visibility and agreement accessibility semantics.
6. Complete contextual Coach behavior and recovery UX.
7. Clear workout display after Health connection.
8. Localization and non-US date/copy behavior.
9. Obvious primary access to Profile/settings/membership/Health management.
10. Native proof for camera, Health, notifications, deep links, background,
    and live billing.

## 56. WHY BUILD 5 FEELS INCOMPLETE

Build 5 can feel substantially incomplete even though its source contains a
large amount of implementation because product completeness and release
hardening are different dimensions.

The most likely user-visible explanation is the combined effect of:

- a historical Fitness/More experience disappearing from the primary navigation;
- Health workouts being imported but not shown in a dedicated destination;
- Discover repeatedly presenting familiar deterministic recipe results;
- Plus reopening with a request despite retained cards;
- nutrition cards not consistently explaining pending/unavailable values;
- Coach presenting as a constrained dark pilot instead of broad contextual
  intelligence;
- onboarding fields and consent behavior feeling unfinished on native devices;
- Profile, membership, notifications, and Health controls being secondary;
- localization not being a complete product system;
- native-only behavior being source-wired but not physically proven.

The owner's perception is therefore consistent with repository evidence. It is
not explained by a single missing commit, and it is not contradicted by the
presence of release-control and security work.

## 57. Severity matrix

| Gap | Severity | Evidence |
|---|---|---|
| Smart Scan/camera/Home native validation | P1 | Source is wired; physical provider/device proof absent |
| Coach provenance, tenant boundary, and release observability | P1 | Fact Context reports; tenant isolation report |
| Fitness/workout destination | P2 | `0a56698` deletion; current workouts have no visible destination |
| Onboarding keyboard/agreement semantics | P2 | `cafea90` absent from canonical |
| Discover freshness/rotation | P2 | `c37b83d` and report 18 absent |
| Plus remount request policy | P2 | `refetchOnMount: "always"` |
| Nutrition pending/unavailable UI | P2 | Step 49 source audit |
| Localization | P2 | no proven i18n catalog; hardcoded English/US formatting |
| Notifications/Health/deep-link/purchase device evidence | P2 | production readiness reports |
| Image uniqueness/fallback repetition | P2/P3 | finite fallback/provider behavior |
| Exact visual/pixel parity | P3 | historical screenshots/reports |
| Documentation-only flow-map loss | P3 | report 17 absent from canonical |

No P0 security/data-loss gap was confirmed.

## 58. User-visibility matrix

| Capability/delta | Visibility |
|---|---|
| Fitness/workout destination | HIGH |
| Discover freshness | HIGH |
| Plus reload/nutrition states | HIGH |
| Onboarding keyboard/consent | HIGH |
| Coach completeness | HIGH when opened; gated for many users |
| Profile/Membership/Health hidden placement | MEDIUM/HIGH |
| Localization | HIGH for non-English/non-US users |
| Notification delivery | MEDIUM/HIGH, device-dependent |
| Health permissions/workouts | MEDIUM/HIGH, device-dependent |
| Smart Scan native behavior | HIGH, device-dependent |
| 3D icons and spatial surfaces | HIGH and largely preserved |
| Exact historical imagery/motion parity | MEDIUM |
| API profile/diary contract drift | LOW directly, HIGH for clients/tools |
| Database RLS limitation | LOW directly, P1 operational risk |

## 59. Recovery-safety matrix

| Capability | Recovery strategy |
|---|---|
| Onboarding keyboard/agreement semantics | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| Discover freshness | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| Plus remount policy | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| Nutrition unavailable/pending states | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| Fitness/workout destination | `MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE` |
| Historical Fitness visual screen | `SAFE_TO_PORT_SELECTIVELY_AFTER_REVIEW` only |
| Coach general intelligence | `MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE` |
| Coach safety boundary | `DO_NOT_RESTORE` older unrestricted behavior |
| Server Health pipeline | `DO_NOT_RESTORE` without new product/security decision |
| Old Progress/More tree | `DO_NOT_RESTORE` |
| Original recipe catalogue/helper files | `DO_NOT_RESTORE` wholesale |
| Localization | `MUST_REDESIGN_FOR_CURRENT_ARCHITECTURE` |
| Native/device validation | `SAFE_TO_REIMPLEMENT_FROM_CURRENT_CONTRACT` |
| Historical reports | `DO_NOT_RESTORE` as runtime behavior |

## 60. Dependency graph

The safe dependency order is:

```text
Canonical identity and current-flow contract
  → account/session/hydration and tenant-boundary proof
  → Coach fact provenance and rollout boundary
  → onboarding keyboard/accessibility and completion validation
  → Smart Scan physical capture/review/approval/Home validation
  → diary/sync/date/timezone and offline validation
  → recipe API contract truthfulness and provider exhaustion
  → Discover freshness and Plus remount policy
  → nutrition pending/unavailable/partial presentation
  → Health workout destination/product decision
  → notifications/deep-links/purchases/background native validation
  → localization and accessibility completion
  → final release evidence and rollback readiness
```

Do not begin by merging the historical release branch. The current identity,
storage, account, and safety contracts must remain the dependency roots.

## 61. Proposed remediation phases

This is a forensic recommendation for a future authorized step, not an
implementation plan being executed now.

### Phase A — Reconcile contracts and evidence

Regenerate the current flow map, decide which historical capabilities are
product requirements, reconcile OpenAPI with actual routes, and preserve the
canonical Build 5 source identity.

### Phase B — Protect identity and safety boundaries

Resolve tenant-isolation strategy, Coach fact provenance, rollout gates,
account-scoped local history, and deletion/provider boundaries before expanding
contextual behavior.

### Phase C — Restore high-visibility core UX

Reimplement onboarding keyboard/accessibility behavior, agreement semantics,
Smart Scan native validation, and Home/Today edge-case validation from the
current contract.

### Phase D — Repair recipe completeness

Define bounded Discover rotation, fix Plus remount freshness policy, align the
client with authoritative cursors, and present nutrition as pending,
unavailable, partial, or verified without fabrication.

### Phase E — Decide and redesign Health/Fitness

Choose the current destination and contract for workouts, activity, and trust
copy. Port only useful evidence from historical Fitness after that decision.
Do not restore the old screen wholesale.

### Phase F — Complete secondary native product surfaces

Validate notifications, deep links, RevenueCat purchase/restore, background
resume, Profile/Membership reachability, localization, and accessibility on
physical devices.

### Phase G — Final release evidence

Run the authorized native matrix, provider contract tests, production
observability checks, release attestation, and rollback/readiness review.

## 62. Remaining uncertainties

- Physical iOS/Android keyboard occlusion, VoiceOver/TalkBack, and safe-area
  behavior remain unverified.
- Smart Scan camera, microphone, barcode, receipt, provider, offline, and
  timezone behavior remain unverified on real devices.
- HealthKit/Health Connect permission results and populated records remain
  provider/device dependent.
- Workout storage is confirmed, but historical ownership and intended current
  destination require product confirmation.
- Live RevenueCat purchase, restore, cancellation, entitlement refresh, and
  provider outage behavior remain unverified.
- Universal-link install/open/force-quit and auth callback behavior remain
  unverified on physical devices.
- Native notification scheduling, delivery, tap routing, and account switching
  remain unverified.
- Production Coach latency, failures, outcomes, and privacy-safe observability
  are not proven.
- OpenAPI profile/diary drift may be intentional, but no explicit current
  contract decision was found.
- Exact historical visual parity cannot be inferred from screenshots alone.
- The available refs may not include every remote object ever created outside
  the local repository.
- Localization may have been intended but was not proven as a shipped
  implementation.

## 63. Exact recommendation for Step 51

Step 51 should **not** begin with a branch merge, cherry-pick, or broad code
recovery. It should begin only after owner review and explicit authorization,
using the dependency order in section 60.

The recommended first authorized work is a controlled contract/reconciliation
phase that:

1. accepts or rejects the Fitness/workout destination as a current requirement;
2. confirms Coach Fact Context boundaries and provenance requirements;
3. confirms the current local Health architecture;
4. defines the exact onboarding, recipe freshness, Plus reload, and nutrition
   contracts;
5. reconciles OpenAPI profile/diary drift;
6. regenerates the current user-flow map;
7. selects device validation gates before UI recovery.

Only after those decisions should targeted reimplementation begin. Historical
code may be ported selectively after review, but the release branch must not be
merged wholesale.

### Final questions

**A. How many meaningful historical product capabilities were identified?**  
Thirty-eight audit capabilities, HF-001 through HF-038.

**B. How many are fully preserved/equivalent?**  
Eighteen are preserved as equivalent at source level.

**C. How many were superseded by newer implementations?**  
One catalog capability is classified directly as superseded: the older
Progress/More navigation aggregation. Several individual helpers and
components are also superseded as documented in sections 15 and 52.

**D. How many are partially preserved?**  
Six are classified `PARTIALLY_PRESERVED`, including onboarding UX, nutrition,
imagery uniqueness, Health metrics, contextual intelligence, and
accessibility.

**E. How many are present but disconnected/hidden/broken?**  
Four catalog capabilities fall into these direct classes: one hidden, one
broken, one disconnected, and one additional hidden/secondary surface within
the route/component differential. The most important are Profile reachability,
recipe freshness, Health workouts, and internal/secondary routes.

**F. How many were historically implemented but lost?**  
One catalog capability: the dedicated Fitness/workout/activity destination.

**G. How many are documented but implementation cannot be proven?**  
One catalog capability: localization/language support. Several native behaviors
are also unverified, but their source implementations exist.

**H. Which missing capabilities best explain the owner's perception?**  
The removed Fitness/workout destination, static recipe freshness, Plus reloads,
ambiguous nutrition states, limited Coach, unfinished onboarding keyboard and
consent UX, hidden secondary surfaces, absent localization, and unproven
native behavior.

**I. Is there an entire historical development phase that failed to reach
canonical main?**  
Yes. The Fitness/More route and workout-presentation phase did not survive as a
canonical destination. Its Health data foundations were partly absorbed, but
the dedicated product experience was removed.

**J. Are there useful implementations outside canonical ancestry beyond the
known onboarding/freshness work?**  
Yes. The historical Fitness/More experience, Fitness trust-forward component,
profile route/test lineage, and some historical UI/test helpers are useful
evidence. They are not safe for wholesale recovery.

**K. Which historical code should never be restored?**  
Unrestricted Coach/context, fake infinite pagination, fabricated nutrition,
client-owned referral qualification, obsolete Progress/More trees, and an
invented server Health pipeline.

**L. Can remediation be divided into controlled phases?**  
Yes. The dependency graph in section 60 and phases in section 61 provide a
controlled sequence.

**M. What exact phases and dependency order are recommended?**  
Contract/evidence reconciliation → identity/tenant/Coach safety → onboarding
and native Smart Scan validation → recipe freshness/reload/nutrition →
Health/Fitness product decision → notifications/deep links/billing/localization
device coverage → final release validation.

### Final verdict

**MAJOR HISTORICAL PRODUCT DELTA CONFIRMED — MULTI-PHASE RECOVERY REQUIRED**

This verdict describes the historical product delta and recovery scope. It is
not authorization to implement Step 51.
