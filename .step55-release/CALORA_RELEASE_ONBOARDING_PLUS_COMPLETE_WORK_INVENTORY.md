# Calora `release/calora-onboarding-and-plus` Complete Work Inventory

**Status:** WORK INVENTORY READY FOR OWNER REVIEW  
**Scope:** Read-only reconstruction of the branch history and checked-in
implementation evidence. No recovery, merge, cherry-pick, porting, deployment,
build, EAS, TestFlight, database, or GitHub action was performed for this
inventory.

## Branch identity and history

```text
BRANCH:
release/calora-onboarding-and-plus

LOCAL TIP SHA:
8ae1f1d6383b286502bc208e0de4e9fb41cde40d

LOCAL TIP TREE SHA:
c67a04d0b4470a08b1e6799276184c32526844c2

LOCAL TIP DATE:
2026-09-15T00:45:57Z

LOCAL TIP SUBJECT:
Add diagnostic logs for iOS EAS build failure

ORIGIN TRACKING TIP:
dbf5bd51ed71c816e0707933030f4306d0f7882d

ORIGIN TRACKING TREE:
009066fca51f8b78fcf4ab19550a144108c7f679

ORIGIN TRACKING TIP DATE:
2026-09-10T17:45:57-04:00

ORIGIN TRACKING TIP SUBJECT:
Record EAS archive and signing gate lessons (#6)

MERGE BASE WITH CURRENT MAIN:
b8ed3cfa23f69c01ac7c04e2520d4ecf900da4fe

MERGE BASE SUBJECT:
Restore unfinished onboarding drafts

MERGE BASE DATE:
2026-09-07T00:34:56Z

CURRENT MAIN OBSERVED DURING INVENTORY:
e10d46d7edb98278bebaaf6bf0f47c772adabb5c

DEVELOPMENT PERIOD:
2026-07-28T04:50:11Z through 2026-09-15T00:45:57Z

TOTAL COMMITS ANALYZED:
1,102 commits reachable from the local branch tip.

BRANCH-UNIQUE COMMITS AFTER THE MERGE BASE:
148 release commits; current main has 50 commits unique after the same base.

TOTAL MEANINGFUL WORK ITEMS:
14
```

### Ref discrepancy

The local branch and its origin tracking ref are not at the same tip. The local
tip contains the origin tracking tip and has nine commits after their common
ancestor `7d7183b9b6d054469cb5a226b613b11fc8d39b4d`; the tracking ref also has
seven commits not present in the local tip according to the local ref graph.
The local branch tip was used as the primary inventory target because it is the
named local branch present in the workspace. The origin tip and its differing
tree are recorded above rather than silently conflated with the local branch.

The branch is not a clean, isolated linear experiment. It contains shared
history, merge commits, release/report commits, and earlier product work that
is also reachable from other refs. The merge base is the comparison point for
the 148 branch-unique commits; the complete reachable-history count is
included because the requested mission covers the branch's full development
history.

### Diff scale from merge base

The three-dot diff from the merge base to the local branch tip contains
approximately 301 changed paths, 30,794 additions, and 2,060 deletions. The
largest areas are:

| Area | Changed paths |
|---|---:|
| `artifacts/calora` | 105 |
| `artifacts/api-server` | 51 |
| `attached_assets` | 29 |
| `lib` | 28 |
| `.agents` | 23 |
| `docs` | 14 |
| `scripts` | 10 |

This scale includes implementation, generated contracts, tests, screenshots,
memory files, release evidence, and reports. It is not a product-only line
count.

## Chronology and transition boundary

The earliest reachable branch commit is `9ef0b8fb9600a76b2d34c109c237117d4345d07f`,
dated 2026-07-28, with a basic API health scaffold and mockup sandbox. Normal
product development is visible from late July through August 19 in onboarding,
authentication, persistence, Home, Plus, Recipes, Planner, Smart Scan,
wellness, diary, Food Memory, and Coach work.

The first unambiguous forensic/security transition begins on August 20 with
database security and tenant-isolation work:

- `257a14f` — database security foundation;
- `4cacbd9` — PostgreSQL tenant isolation;
- `7f09f05` — Coach context forensic audit.

The first explicit late audit boundary in the September branch-unique history
is the sequence `8038508` → `98e21bc` on September 7, where product/image
changes give way to a project-wide image audit and remediation reports. The
broader sustained release-verification phase begins with branding, production
reconciliation, and deep-link work on September 8 and continues through the
September 15 iOS EAS failure diagnostics.

This is a phase transition, not a clean cutoff. Product changes continue after
the August 20 security boundary and again on September 7–9. The work items
below preserve those overlaps instead of treating every later commit as a
report-only change.

---

## Work Item 01 — Initial Calora application foundation

**Date / period:** 2026-07-28 through early August  
**Category:** PRODUCT FEATURE / MOBILE INFRASTRUCTURE  
**Runtime impact:** YES

### Purpose

Establish the initial Calora workspace, API health surface, Expo application
shell, tab structure, shared context, and the first user-facing product
surfaces from which later feature work grew.

### What was actually implemented

The earliest reachable commit contains the initial API health scaffold and
mockup sandbox. Later foundation work established the Calora mobile artifact,
shared `CaloraContext`, tab routes, API contracts, and the initial Home,
Insights, Profile, Recipes, and Planner surfaces. Shared navigation, surface
tokens, press behavior, and early motion primitives were introduced and then
refined by later work items.

### User-facing effect

Users receive the initial Calora application shell and navigable product
surfaces rather than an API-only or empty mobile artifact.

### Technical effect

The mobile artifact, API artifact, shared workspace packages, generated
contracts, and screen-level state became the base on which onboarding,
recipes, planning, diary, capture, and Coach features were layered.

### Files / areas

- `artifacts/calora/app/`
- `artifacts/calora/context/CaloraContext.tsx`
- `artifacts/calora/components/`
- `artifacts/api-server/`
- `lib/api-spec/`
- `lib/api-client-react/`
- `lib/api-zod/`
- mockup-sandbox and Expo artifact configuration

### Representative commits

- `9ef0b8f` — Initial commit
- `68b47d7` — Update index page layout and functionality
- `6893373` — Implement swipeable tab navigation and associated testing logic
- `177ca64`, `6231864` — Add Calora header imagery
- `6231864` — Add visual/header assets used across the main tabs

### Tests and documentation separated

Workspace swipe tests, screen tests, visual memory notes, and screenshots
support this work but are evidence or verification rather than the
application foundation itself.

### Dependencies

This item is the base for Items 02–06 and their later September refinements.

---

## Work Item 02 — Onboarding, authentication, account, and persistence

**Date / period:** 2026-08-07 through 2026-08-20, with later refinements  
**Category:** PRODUCT FEATURE / BACKEND / MOBILE INFRASTRUCTURE  
**Runtime impact:** YES

### Purpose

Make onboarding resumable and connect sign-up, sign-in, verification, password
recovery, Google OAuth, native/browser callbacks, authenticated routing, local
state persistence, account clearing, and session restoration.

### What was actually implemented

The branch added authentication screens and context, Supabase session handling,
PKCE verifier persistence, native and browser callback paths, route gating,
hydration and migration guards, queued autosaves, and destructive-clear
coordination. Server-side account and Supabase-auth paths added account-scoped
API access and tests. Later work added profile reset behavior in Work Item 10.

### User-facing effect

- Sign-up, sign-in, email verification, password reset, and OAuth flows are
  present.
- Interrupted onboarding can resume.
- Authenticated sessions can be restored across launches.
- Cancelled or denied OAuth callbacks have explicit handling.
- Clearing account or local state does not silently leave stale profile or
  session data behind.

### Technical effect

Expo Router and `AuthContext` coordinate session state. PKCE and callback
handling support native and browser flows. `PersistenceManager` serializes
hydration, writes, retries, migrations, and clear operations. Server account
routes and Supabase-auth validation protect authenticated operations.

### Files / areas

- `artifacts/calora/app/auth/`
- `artifacts/calora/app/_layout.tsx`
- `artifacts/calora/app/index.tsx`
- `artifacts/calora/context/AuthContext.tsx`
- `artifacts/calora/lib/auth.ts`
- `artifacts/calora/lib/accountStorage.ts`
- `artifacts/calora/lib/persistenceManager.ts`
- `artifacts/api-server/src/routes/account.ts`
- `artifacts/api-server/src/lib/supabase-auth.ts`
- `artifacts/api-server/src/__tests__/account.test.ts`
- `artifacts/calora/app/invite/[code].tsx`

### Representative commits

- `004a92f` — Implement authentication flow and context setup
- `e5433fc`, `808caeb` — OAuth exit handling and Android PKCE persistence
- `86df3a3` — Implement native Supabase PKCE
- `020a834` — Extract `PersistenceManager` and add clear-data tests
- `e5d7138`, `165821f`, `d896eae`, `0734ca4`, `e289ea2`, `d3d6fda` —
  hydration, migration, read-in-flight, and clear-race hardening
- `500cb13` — Add account tests and update Supabase authentication logic

### Tests and documentation separated

- `clearAllData.integration.test.ts`
- `hydrationGuard.test.ts`
- `hydrationRetryIntegration.test.tsx`
- `profilePhotoFlash.test.ts`
- `supabase-auth.test.ts`
- `.agents/memory/onboarding-resumption.md`
- `.agents/memory/local-persistence-recovery.md`
- `.agents/memory/supabase-auth-boundary.md`
- `.agents/memory/encrypted-recovery-smoke-gate.md`

### Dependencies

Depends on Supabase configuration, Expo linking, native PKCE support,
AsyncStorage/document storage, generated API contracts, and Work Item 01.
Later profile and deep-link work depends on this item.

---

## Work Item 03 — Home, Plus, Recipes, Planner, and navigation foundation

**Date / period:** 2026-08-06 through 2026-08-20  
**Category:** PRODUCT FEATURE / UI/UX / BACKEND  
**Runtime impact:** YES

### Purpose

Turn the initial tab shell into usable Today/Home, Plus/Recipes, and Plan
workspaces with generated recipes, premium and restaurant content, shopping
flows, weekly planning, program switching, meal replacement, and swipe
navigation.

### What was actually implemented

The branch added and refined recipe and planner routes, recipe models,
planner data and contracts, program pools, program provenance, shopping and
replacement behavior, premium/RevenueCat flows, restaurant-food support,
planner image identity, and workspace swipe behavior. Planner generation has
bounded local/fallback behavior and explicit week/program state.

### User-facing effect

- Users can browse recipes and saved recipes.
- Users can generate and inspect weekly meal plans.
- Users can apply programs, replace meals, and access shopping-list flows.
- Plus/premium content is presented with entitlement-aware locked behavior.
- Tab and nested-list gestures are more usable.

### Technical effect

New server routes and typed contracts feed Home, Recipes, and Planner.
Planner state tracks week context, edits, program provenance, eligibility,
diversity, and fallback generation. Recipe and premium state tracks freshness,
pagination, image identity, and entitlement boundaries.

### Files / areas

- `artifacts/calora/app/(tabs)/index.tsx`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/app/(tabs)/planner.tsx`
- `artifacts/calora/app/saved-recipes.tsx`
- `artifacts/calora/data/planner.ts`
- `artifacts/calora/components/PlannerPeek.tsx`
- `artifacts/calora/components/ShoppingListSheet.tsx`
- `artifacts/calora/components/ProgramAppliedCelebration.tsx`
- `artifacts/calora/lib/recipeModel.ts`
- `artifacts/calora/lib/recipeGeneration.ts`
- `artifacts/api-server/src/routes/recipes.ts`
- `artifacts/api-server/src/routes/planner.ts`
- `artifacts/api-server/src/routes/premiumRecipes.ts`
- `artifacts/api-server/src/routes/restaurantFoods.ts`
- `lib/api-zod/src/planner-*.ts`
- `lib/api-spec/openapi.yaml`

### Representative commits

- `68b47d7` — Update index page layout and functionality
- `53cd7c4` — Implement recipe model and integrate it into UI and state
- `26804ae` — Preserve program provenance, generation fallback, and edits
- `8af2bcf` — Implement premium recipe functionality across API and client
- `aadd9b8` — Add recipes endpoint and contracts
- `f5e0f8b` — Add planner endpoint and contracts
- `0408244`, `0ef47d0`, `25c39e5`, `ef5aedd` — planner UI revisions
- `6893373` — Implement swipeable tab navigation

### Tests and documentation separated

Recipe model, planner, premium recipe, generation, restaurant-food, and
workspace-swipe tests are verification. Planner fallback, week-context,
program-provenance, recipe-provenance, and editing memory files are design or
operational documentation.

### Dependencies

Depends on Items 01–02, shared context, generated API contracts, RevenueCat
integration, Food Memory, image policy, and navigation/gesture infrastructure.

---

## Work Item 04 — Smart Scan, capture, barcode-like input, and Food Memory

**Date / period:** 2026-08-06 through 2026-08-19, with capture hardening later  
**Category:** PRODUCT FEATURE / BACKEND / SECURITY  
**Runtime impact:** YES

### Purpose

Make food capture reviewable, provenance-aware, persistable, and safe to
accept into diary state, including camera/image, text, label, voice, receipt,
and barcode-like input paths.

### What was actually implemented

The branch added the capture API and Scan UI, capture adapters, candidate
review state, explicit accept/reject/forget transitions, Food Memory, image
capture and synchronization, metadata normalization, and server persistence
paths. Later work added authenticated capture approval, rollback coverage,
owner-scoped transitions, and sync/outbox coordination.

### User-facing effect

- Users can capture food and review candidates before committing them.
- Accepted captures can enter diary and Food Memory state.
- Image-backed memories have explicit provenance and retention behavior.
- Failed persistence does not silently present a capture as accepted.

### Technical effect

Capture analysis and approval use typed API contracts. Review transitions
separate candidate, accepted, rejected, and forgotten states. Server approval
is authenticated, owner-scoped, idempotent for the owning account, and linked
to diary synchronization. Image metadata is bounded and normalized.

### Files / areas

- `artifacts/calora/app/(tabs)/scan.tsx`
- `artifacts/calora/app/meal-image-preview.tsx`
- `artifacts/calora/app/memory.tsx`
- `artifacts/calora/lib/captureAcceptanceCoordinator.ts`
- `artifacts/calora/lib/captureReviewTransitions.ts`
- `artifacts/calora/lib/foodMemory.ts`
- `artifacts/api-server/src/routes/capture.ts`
- `artifacts/api-server/src/routes/sync.ts`
- `artifacts/api-server/src/lib/image-metadata.ts`
- `lib/db/src/schema/index.ts`
- capture and Food Memory generated API contracts

### Representative commits

- `348c158` — Update API definitions and implement new tab layout
- `8c25afd` — Add text, label, voice, and receipt capture adapters
- `1be7dd9` — Update capture route logic and refactor Scan
- `2423b6a` — Implement image capture and sync for Calora memory
- `390bc92` — Add capture server test coverage
- `8881092` — Verify authenticated barcode captures preserve server IDs
- `d22970c` — Add capture rollback regression coverage
- `59a54e7` — Refactor image metadata and food synchronization

### Evidence limits

The history supports capture and barcode-like input testing, but no distinct
barcode subsystem can be established solely from commit subjects and paths.
Actual provider success was not audited by this inventory.

### Tests and documentation separated

Capture route, persistence, review-transition, Food Memory, and image metadata
tests are verification. Device YAML flows, screenshots, and capture-provider
memory files are evidence or guidance rather than runtime implementation.

### Dependencies

Depends on Items 02–03, camera/media/OpenAI integration, diary synchronization,
image policy, Food Memory, and generated capture contracts.

---

## Work Item 05 — Progress, wellness, diary, nutrition, and health adapters

**Date / period:** 2026-08-06 through 2026-08-20  
**Category:** PRODUCT FEATURE / BACKEND / MOBILE INFRASTRUCTURE  
**Runtime impact:** YES

### Purpose

Make Insights/Progress a persistent wellness surface and connect daily
check-ins, hydration, weight, activity, Health Connect/Apple Health, diary
entries, nutrition estimates, and goal progress.

### What was actually implemented

The branch added progress visualization and motion, hydration reminders,
optional weight/activity check-ins, mood persistence, health synchronization,
burned-calorie display, weigh-in/goal progress and celebration behavior, diary
contracts, and persisted AI nutrition estimates with startup warmup and stale
handling.

### User-facing effect

- Users see progress and nutrition trends without fabricated values for
  missing days.
- Hydration, mood, weight, activity, and health-sync states can be recorded.
- Nutrition estimates expose unavailable/retry states instead of silently
  inventing successful results.
- Diary and remote sync coexist with local state.

### Technical effect

Local wellness state and server diary synchronization are integrated with
native health adapters. Nutrition estimates are persisted, warmed, and
validated. Progress charts use segmented measured signals and explicit sparse
periods.

### Files / areas

- `artifacts/calora/app/(tabs)/insights.tsx`
- `artifacts/calora/app/(tabs)/index.tsx`
- `artifacts/calora/app/(tabs)/profile.tsx`
- `artifacts/calora/context/CaloraContext.tsx`
- `artifacts/calora/lib/weeklySignals.ts`
- `artifacts/calora/lib/diarySync.ts`
- `artifacts/api-server/src/routes/diary.ts`
- `artifacts/api-server/src/routes/sync.ts`
- native health adapters and generated diary/sync contracts

### Representative commits

- `a13ea0a`, `0ef71f0`, `85cfd14` — Insights and progress motion
- `be0a64b` — Hydration reminders
- `5668451` — Optional weight/activity check-ins and trend labels
- `5721854` — Health sync UI and burned-calorie integration
- `14f6992` — Mood picker persistence
- `6271de8`, `1f53f52`, `c28e338`, `d884bea` — weigh-in and goal progress
- `02b7c67`, `0668453`, `4087378`, `e151ecf` — nutrition estimate persistence,
  warmup, and stale handling

### Evidence limits

The evidence supports diary, nutrition, wellness, and health-adapter work. It
does not establish a separate standalone “nutrition tab.” Notification-specific
product behavior is also not established by the scoped history.

### Tests and documentation separated

Diary, sync, health, check-in, nutrition, hydration, weight, and progress tests
are verification. Daily wellness, progress motion, health adapter, and
nutrition-cache memory files document boundaries and decisions.

### Dependencies

Depends on Items 02–04, persistence hydration, diary API contracts, native
health permissions/adapters, recipe/provider nutrition sources, and shared
context.

---

## Work Item 06 — Coach, intelligence, visual system, and interaction foundations

**Date / period:** 2026-08-06 through 2026-08-20  
**Category:** PRODUCT FEATURE / UI/UX / SECURITY  
**Runtime impact:** YES

### Purpose

Add Coach chat and menu behavior, establish bounded living-state and evidence
foundations, and provide consistent visual, gesture, motion, and image
behavior across the app.

### What was actually implemented

The branch introduced Coach UI and guest behavior, a living state engine,
living memory, intelligence modules for facts/evidence/confidence/invalidation,
shared header imagery, swipeable workspace tabs, scale-press interactions,
surface tokens, image identity, image fallback, and animation patterns.

### User-facing effect

- Coach can present bounded context and local history/menu behavior.
- Home can surface next-step state derived from available information.
- Tabs, sheets, press feedback, charts, and image fallbacks behave more
  consistently.
- Sparse or missing evidence is distinguishable from a fabricated signal.

### Technical effect

The intelligence layer normalizes facts, evidence, confidence, invalidation,
and observability behind explicit boundaries. Shared interaction components
reduce gesture conflicts and screen-specific divergence.

### Files / areas

- `artifacts/calora/app/coach.tsx`
- `artifacts/calora/app/memory.tsx`
- `artifacts/calora/components/SwipeableTabList.tsx`
- `artifacts/calora/components/ScalePressable.tsx`
- `artifacts/calora/constants/`
- `artifacts/calora/lib/livingState.ts`
- `artifacts/calora/lib/intelligence/`
- `artifacts/calora/lib/coachContext.ts`
- `artifacts/calora/lib/mealImageIdentity.ts`
- `artifacts/calora/lib/recipeImagePresentation.ts`

### Representative commits

- `0641db1` — Implement Coach chat menu
- `5291c9a` — Add Home next-step behavior
- `622a774` — Implement living state engine
- `7441098`, `07a9b8c` — Living memory and memory screen
- `7e64411` — Implement intelligence foundation modules
- `177ca64`, `6231864` — Add Calora tab header imagery
- `6893373` — Implement swipeable tab navigation
- `08aafa35` — Update gesture arbitration and workspace swipe tests

### Tests and documentation separated

Coach, living-state, intelligence-foundation, image, swipe, and motion tests
are verification. Coach safety, animation, spatial contrast, and living-memory
files document constraints rather than adding runtime behavior.

### Dependencies

Depends on Items 01–05, shared context, Food Memory, persistence, image
metadata, and optional API Coach routes.

---

## Work Item 07 — Database security, account isolation, and contextual-insight controls

**Date / period:** 2026-08-20 through 2026-08-23  
**Category:** SECURITY / BACKEND / DATABASE / FORENSIC-AUDIT  
**Runtime impact:** MIXED

### Purpose

Harden database support objects, tenant isolation, account-scoped local state,
and transient contextual insight delivery before controlled Coach work.

### What was actually implemented

Database support-object and security foundations were added and tested.
Diary/API predicates were tightened for account isolation. Local health, media,
sync, query-cache, and insight state were made account-scoped. Contextual
insight delivery was kept transient and bounded.

### User-facing effect

The intended effect is reduced cross-account leakage risk and clearer handling
of missing or transient insight state. The reports themselves have no direct
user-facing effect.

### Technical effect

The branch includes database security support, tenant-isolation predicates,
local account-keyed state, and transient intelligence delivery. Production
claims in reports are repository evidence and are not independently proven by
this inventory.

### Files / areas

- `artifacts/api-server` diary and account-scoping paths
- `lib/db`
- `lib/db/migrations`
- `supabase/migrations`
- `artifacts/calora` account-scoped local state and intelligence modules

### Representative commits

- `257a14f`, `3ba988d` — Database security foundation/support objects
- `4cacbd9` — PostgreSQL tenant isolation
- `4549034`, `d4289ff` — Account-scoped local health/media/sync/query state
- `e2c0f75`, `e5b1458` — Transient Progress/contextual-insight delivery

### Tests and documentation separated

Tenant-isolation and database integration tests are implementation verification.
The `CALORA_INTELLIGENCE_PHASE_*` reports and Supabase security reports are
forensic/readiness documentation.

### Dependencies

Depends on authentication/account identity, database migrations/support
objects, API contracts, and local persistence. Later Coach governance depends
on these boundaries.

---

## Work Item 08 — Coach Fact Context consent, governance, and activation evidence

**Date / period:** 2026-08-21 through 2026-09-09  
**Category:** PRODUCT FEATURE / SECURITY / BACKEND / FORENSIC-AUDIT  
**Runtime impact:** YES for code and migrations; NO for reports

### Purpose

Add a consent-aware, bounded Coach Fact Context path and establish governance,
activation, rollback, pilot, and operator-control evidence around it.

### What was actually implemented

The branch added Coach Fact Context routes, client request lifecycle handling,
consent UI and persistence, generated fact keys/values/units/time windows,
missing-data structures, observation validation, and activation coordination.
Database migrations establish consent/context storage. The branch also records
activation rehearsals, rollback boundaries, pilot eligibility, and operator
control-plane reports.

### User-facing effect

Signed-in users can be shown an explicit consent step before personal facts are
used as Coach context. Missing or unavailable observations can be represented
without silently guessing.

### Technical effect

The API and generated contracts constrain fact keys, values, units, time
windows, directions, states, and entry counts. Client/server lifecycle logic
coordinates consent and bounded fact delivery. Activation evidence preserves a
deny-by-default boundary when the required release controls are not satisfied.

### Files / areas

- `artifacts/api-server/src/routes/coachFactContext.ts`
- `artifacts/api-server/src/__tests__/coachFactContext.test.ts`
- `artifacts/calora/components/CoachFactContextConsentPanel.tsx`
- `artifacts/calora/lib/intelligence/coachFactContext.ts`
- `artifacts/calora/lib/intelligence/coachFactContextClient.ts`
- `artifacts/calora/lib/intelligence/coachFactRequestLifecycle.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/`
- `lib/api-zod/src/generated/types/`
- `lib/db/migrations/0001_task_473_coach_fact_context.sql`
- `supabase/migrations/20260821143000_create_coach_fact_context_consents.sql`

### Representative commits

- `980edea` — Coach Fact Context API/client integration
- `bc73694`, `71d1d65` — Activation coordinator and context handling
- `2486ae3` — Implement Coach Fact Context integration
- `3db586c` — Implement consent flow and tests
- `2f9729b`, `3aec19b`, `0a21754`, `8077ed3`, `104cb6e`,
  `33d590a`, `4b5e1f8` — activation, rehearsal, rollback, and operator evidence

### Evidence limits

Source, migration, and test evidence is strong for the implementation.
Activation, pilot, and production-state claims in reports are self-authored
repository evidence and were not independently queried for this inventory.

### Tests and documentation separated

Consent, context, rollout, replay, and authorization tests are separate from
the implementation. Coach Fact Context architecture, production, migration,
rollback, and activation reports are governance/evidence artifacts.

### Dependencies

Depends on Items 02, 05, 06, and 07, generated contracts, account isolation,
the operator control plane, and release attestation.

---

## Work Item 09 — Image integrity, release attestation, account deletion, and reliability hardening

**Date / period:** 2026-08-24 through 2026-09-07  
**Category:** SECURITY / BACKEND / TESTING/VERIFICATION / FORENSIC-AUDIT  
**Runtime impact:** MIXED

### Purpose

Harden release provenance, account-deletion fencing, rollback behavior, image
metadata, food synchronization, recovery warnings, and provider-boundary
validation before the September release work.

### What was actually implemented

The branch added or refined release attestation and fail-closed validation,
bundled deletion-fence validation, rollback and injected-client protections,
recovery-warning behavior, trusted image metadata handling, food-log
synchronization, planner/image integrity evidence, and release redirect tests.

### User-facing effect

Users should see fewer silent synchronization failures, safer account-deletion
behavior, more reliable image presentation, and clearer handling of recovery
states. Release controls affect whether a build can be published rather than
ordinary screen behavior.

### Technical effect

The API build and release validation inspect provenance and module behavior.
Deletion-fence and rollback checks protect destructive operations. Image source
and metadata policy constrains accepted values. Recovery warnings remain
visible when cooldown storage is unavailable.

### Files / areas

- `artifacts/api-server/build.mjs`
- `artifacts/api-server/src/release-validation.ts`
- `artifacts/api-server/src/lib/account-deletion-*`
- `artifacts/api-server/src/lib/release-attestation.ts`
- `artifacts/api-server/src/lib/image-metadata.ts`
- `scripts/lib/public-release-attestation.mjs`
- `scripts/monitor-account-deletion-fence*.mjs`
- `artifacts/calora/lib/mealImageAudit.ts`
- `artifacts/calora/lib/validation/plannerIntegrityEvidence.ts`
- `lib/api-zod/src/image-source-policy.ts`

### Representative commits

- `93a1eca`, `2f22440`, `3cc472c`, `77ad026`, `17fcb0f` —
  release-attestation and fail-closed verification
- `5516b95` — Require bundled deletion-fence validation in CI
- `42d3436`, `879c869` — deletion-fence rollback and caller-owned client safety
- `3c47f53`, `5f8d3e0`, `398fcc2` — recovery warning and fence behavior
- `59a54e7` — image metadata, food logging, and synchronization
- `8038508`, `98e21bc`, `7d4a618` — image audit and remediation evidence

### Transition note

`8038508` and `98e21bc` are the first September branch-unique commits that
clearly turn product/image work into formal forensic audit and remediation
artifacts. The implementation changes in this item remain separate from the
reports.

### Tests and documentation separated

Regression tests, bundled release checks, and monitor scripts are executable
verification/control-plane code. Image audit reports, remediation reports,
security certification, and production log exports are evidence artifacts.

### Dependencies

Depends on Items 02, 04, 06, and 07, database support objects, release
attestation, and the API runtime.

---

## Work Item 10 — Late product fixes: planner, recipes, Coach, profile, and onboarding

**Date / period:** 2026-09-07 through 2026-09-09  
**Category:** PRODUCT FEATURE / BUG FIX / BACKEND / UI/UX  
**Runtime impact:** YES

### Purpose

Complete or correct product behavior discovered during post-install and
release-preparation work without treating those feature fixes as reports.

### What was actually implemented

The branch refined planner generation and image behavior, restaurant tracking,
Coach and guest Coach logic, saved recipes, recipe-to-planner linking,
swipeable recipe lists, profile synchronization, onboarding logic, premium
recipe routes, RevenueCat entitlement handling, recipe freshness, and Coach
Fact Context consent integration.

### User-facing effect

Users receive corrected onboarding/profile flows, improved recipe and planner
navigation, premium recipe access behavior, restaurant meal handling, and
explicit Coach consent behavior.

### Technical effect

OpenAPI, React client, and Zod contracts were regenerated for profile, recipe,
planner, and Coach surfaces. Server routes and mobile state were updated in
parallel, with tests for route validation, entitlement behavior, pagination,
freshness, and UI interactions.

### Files / areas

- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/app/(tabs)/planner.tsx`
- `artifacts/calora/app/(tabs)/profile.tsx`
- `artifacts/calora/app/onboarding/`
- `artifacts/calora/app/coach.tsx`
- `artifacts/calora/lib/profileSync.ts`
- `artifacts/calora/lib/guestCoach.ts`
- `artifacts/api-server/src/routes/profile.ts`
- `artifacts/api-server/src/routes/recipes.ts`
- `artifacts/api-server/src/routes/premiumRecipes.ts`
- `artifacts/api-server/src/lib/revenuecat.ts`
- `lib/api-spec/openapi.yaml`
- generated React and Zod contract trees

### Representative commits

- `9842290`, `399200a`, `cd71c4e`, `b12f757`, `923561b` — recipe UI/list
  behavior and tests
- `d752755`, `b0af59f`, `a924dce` — premium and recipe image presentation
- `ad30b82`, `9d74f2c`, `277b0e9`, `432a7f7`, `96f7280`, `56ea0cb`,
  `fd00f55`, `1b69248`, `46bbe25`, `4174a82` — planner implementation and
  refinement
- `d98d433`, `b243fb9`, `3484a83`, `5578f6c` — restaurant food/image work
- `e35188a`, `0ba0ef5`, `1c1fdc7`, `1e34dd3` — Coach and restaurant refinement
- `e7d6bba` — profile management and API specification
- `cafea90` — onboarding logic and tests
- `fb94a57`, `3e727aa`, `498ffe8`, `3db586c`, `2486ae3` — recipe,
  premium, and Coach backend/client work
- `c37b83d` — post-install remediation and recipe freshness

### Tests and documentation separated

Feature and route tests verify this item. Screenshots, scroll pre-verification,
Plus freshness, bug-minimization, and post-install reports are observational
or release evidence and are not the product implementation.

### Dependencies

Depends on Items 02–06 and 08–09, generated contracts, RevenueCat, planner
state, profile persistence, image policy, and API authentication.

---

## Work Item 11 — Brand identity, domains, referral configuration, and auth deep links

**Date / period:** 2026-09-08  
**Category:** PRODUCT CONFIGURATION / BACKEND / MOBILE INFRASTRUCTURE / RELEASE  
**Runtime impact:** MIXED

### Purpose

Align Calora identity, public production pages, branded domains, CORS,
referrals, universal links, and authentication callback handling.

### What was actually implemented

The branch updated brand metadata, public pages, production origins and CORS,
referral reward/copy configuration, universal-link association files, and
`/auth/callback` handling. Expo/EAS configuration and store metadata were
updated alongside domain and deep-link reports.

### User-facing effect

Users can encounter Calora-branded public pages and use invite/referral and
authentication links associated with the branded domain. Native/browser
callback behavior depends on the corresponding platform configuration.

### Technical effect

Public API routes, CORS policy, referral configuration, universal-link routes,
association files, app metadata, and EAS settings are kept aligned.

### Files / areas

- `artifacts/api-server/src/routes/public-pages.ts`
- `artifacts/api-server/src/routes/universal-links.ts`
- `artifacts/api-server/src/routes/referral.ts`
- `artifacts/api-server/src/lib/cors-policy.ts`
- `artifacts/api-server/src/lib/referral-config.ts`
- `artifacts/api-server/src/lib/brand.ts`
- `artifacts/calora/app.json`
- `artifacts/calora/eas.json`
- `docs/universal-links/`
- store metadata files

### Representative commits

- `be00904`, `5911158`, `b691f8c` — identity inventory and specification
- `e03d66c` — brand/domain-related implementation
- `dfe4344`, `c9e6ee2` — Cloudflare/Replit production routing evidence
- `9c83c3d`, `142dc1f`, `c7dd8ae` — authentication deep links
- `5420697`, `d8ecc37` — referral/universal-link remediation and invite copy

### Evidence limits

Source and configuration changes are present. External DNS, provider,
association-cache, and production-domain claims are not independently
verified by this read-only inventory.

### Tests and documentation separated

Universal-link tests are executable verification. Metadata, domain foundation,
production restore, branded-domain, and migration reports are documentation.

### Dependencies

Depends on Items 02, 08, and 10, API public routes, native association files,
Expo/EAS configuration, and external domain/provider state.

---

## Work Item 12 — Git/GitHub synchronization and release reconciliation

**Date / period:** 2026-09-08 through 2026-09-09  
**Category:** GIT/RELEASE / FORENSIC-AUDIT / DOCUMENTATION  
**Runtime impact:** NO for reports; MIXED for isolated remediation commits

### Purpose

Reconstruct and verify branch/tree identity, GitHub synchronization, installed
release state, asset metadata, production-state records, and post-install
remediation.

### What was actually implemented

Most commits in this item add reports, metadata, screenshots, production-state
records, and reconciliation evidence. A smaller number also update referral
copy, API tests, or release-state/configuration details; those implementation
changes are identified separately in the commit list.

### User-facing effect

Reports and metadata do not directly change the app. Any isolated referral,
configuration, or remediation code changes have the effects described in Items
09–11.

### Technical effect

The branch preserves local evidence about tree identity, release candidates,
post-install checks, blockers, asset state, and reconciliation outcomes.
Repository evidence alone does not prove that an external GitHub push, Replit
publish, or installed release succeeded.

### Files / areas

- numbered root `00_` through `19_` Calora reports
- `.agents/agent_assets_metadata.toml`
- `.agents/memory/`
- production-state and reconciliation documents
- attached screenshots and text prompts
- selected referral/API/configuration files

### Representative commits

- `11bc56c` — Final GitHub sync report
- `bd60f82` — 47-commit reconciliation audit
- `6366405` — GitHub credential reconnection documentation
- `dbd82b3`, `4f10151` — pre-push/push verification
- `7d8cc57` — installed-release deep verification
- `61a48c2`, `df44068`, `6f8c779` — P1 blocker and release identity work
- `d1818d7`, `3fcedf9`, `d986dd6` — closure/tree/final reconciliation
- `22cbe8a` — post-install sync report and assets
- `342aa05` — repository commit titled “Published your App”

### Evidence limits

“Published your App” commit messages prove only that repository commits were
created. They are not independent proof of external publication. GitHub,
Replit, EAS, and installed-build claims remain evidence recorded in the
repository unless corroborated by provider readback.

### Tests and documentation separated

This item is predominantly reports, metadata, assets, and verification
records. Any executable tests or runtime fixes belong to the relevant product
or hardening item rather than this documentation item.

### Dependencies

Depends on branch refs, Items 09–11, artifact metadata, release attestation,
and external GitHub/Replit/provider state.

---

## Work Item 13 — Mandatory CI release gate and branch-protection verification

**Date / period:** 2026-09-09  
**Category:** GIT/RELEASE / TESTING/VERIFICATION / SECURITY  
**Runtime impact:** MIXED; release-control impact rather than normal app UI

### Purpose

Make release validation mandatory, sanitize CI failure artifacts, provide
deterministic provider signals, and verify the intended GitHub branch-protection
controls.

### What was actually implemented

The branch added a mandatory CI release-gate workflow, validation scripts,
failure-artifact sanitization, deterministic provider sentinels, release
verification coverage, and branch-protection verification reports. A small
premium-route/test adjustment is mixed into the gate work.

### User-facing effect

No ordinary screen behavior is established by the workflow itself. The effect
is on whether changes can pass the repository's release process.

### Technical effect

Pull-request and release validation can block or permit changes based on API,
Expo, release-attestation, and provider checks. Failure output is sanitized
before being retained as CI evidence.

### Files / areas

- `.github/workflows/mandatory-ci-release-gate.yml`
- `scripts/ci/sanitize-failure-artifacts.mjs`
- `scripts/ci/validate-expo-config.mjs`
- release verification scripts and tests
- branch-protection verification reports

### Representative commits

- `899f4df` — Implement mandatory CI release gate
- `55e96a2` — Fix mandatory CI runner path context
- `8fb4dd0` — Provide deterministic CI provider sentinels
- `a09be0e` — Document Phase 1 GitHub CI verification
- `5d92697` — Record GitHub Actions CI context boundary
- `9d6a534`, `19e9241` — branch-protection verification reports
- `1b58ed3` — Merge release-report reconciliation work

### Evidence limits

The workflow, scripts, and tests prove intended repository behavior. Actual
remote GitHub check names, branch-protection settings, and provider execution
were not independently queried in this inventory.

### Tests and documentation separated

CI scripts and regression tests are executable release controls. Mandatory-gate
and branch-protection reports document observed or claimed external state.

### Dependencies

Depends on Items 09–12, GitHub Actions, release attestation, API/mobile
validation, and external branch-protection configuration.

---

## Work Item 14 — Native authentication, Expo/iOS prebuild, EAS signing, and TestFlight forensics

**Date / period:** 2026-09-09 through 2026-09-15  
**Category:** MOBILE INFRASTRUCTURE / GIT/RELEASE / FORENSIC-AUDIT  
**Runtime impact:** MIXED

### Purpose

Validate native authentication associations, iOS signing configuration, Expo
prebuild/archive readiness, protected release artifacts, EAS submission
configuration, and the later iOS build/submission failure.

### What was actually implemented

The branch added and refined native-auth and iOS-signing preflight scripts and
tests, association validation, Expo/EAS configuration, plist/archive
remediation, Apple capability configuration, protected signed-artifact
evidence, submit profiles, and failure diagnostics.

### User-facing effect

Native authentication links and installable iOS configuration may affect
future shipped binaries. Reports and failure diagnostics themselves have no
end-user runtime effect. The branch tip records an unresolved production EAS
build failure; it does not establish a successful TestFlight/App Store
submission.

### Technical effect

Preflight scripts validate native associations and signing/archive inputs.
`app.json`, `eas.json`, `.easignore`, and related workflows determine what
enters native builds and submissions. Protected artifact evidence records
release identity and blockers.

### Files / areas

- `artifacts/calora/scripts/native-auth-preflight.js`
- `artifacts/calora/scripts/native-auth-preflight.test.js`
- `artifacts/calora/scripts/ios-signing-preflight.js`
- `artifacts/calora/scripts/ios-signing-preflight.test.js`
- `artifacts/calora/app.json`
- `artifacts/calora/eas.json`
- `artifacts/calora/.gitignore`
- `.easignore`
- `.github/workflows/native-auth-preflight.yml`
- `docs/universal-links/`
- `docs/native-auth-preflight-release-evidence.json`
- `docs/CALORA_PROTECTED_RELEASE_SIGNED_ARTIFACTS.md`
- root reports `23_` through `30_`
- final attached EAS failure diagnostic text

### Representative commits

- `fe4f847` — Update native authentication preflight logic
- `2006dca` — Update iOS signing preflight logic
- `8297400` — Merge Phase 2 native-auth GitHub sync
- `7d7183b` — Document iOS prebuild failure and update dependencies
- `46a6097` — Merge Expo plist remediation and EAS archive fixes
- `ad640cc` — Enable Apple capabilities and complete signed iOS build
- `a324a62`, `8ae9cfe` — protected artifact and native preflight evidence
- `d9d0798` — TestFlight submission report
- `ccb0073` — iOS submission failure root cause
- `9297960` — EAS submit profile configuration
- `9894b95` — TestFlight submission result documentation
- `8ae1f1d` — Add diagnostic logs for iOS EAS build failure

### Evidence limits

Preflight source and tests are direct repository evidence. EAS/Apple signing,
archive, TestFlight, and App Store outcomes require provider records. The
branch's final diagnostic evidence supports a continuing failure investigation,
not a successful native release.

### Tests and documentation separated

Native preflight tests and configuration validation are executable checks.
Readiness, signing, protected-artifact, submission, root-cause, and result
reports are evidence/documentation. The final attached diagnostic prompt is
incident evidence, not application code.

### Dependencies

Depends on Items 02, 11, and 13, Expo configuration, native association
files, Apple capabilities/signing, EAS archive behavior, and external Apple
and EAS services.

---

## Cross-cutting area findings

### Notifications

**EVIDENCE INCOMPLETE.** The branch contains notification reconciliation,
hydration, and memory references, but this inventory did not establish a
distinct notification service, push route, notification inbox, or complete
notification-specific product implementation from the branch history alone.

### Barcode

**EVIDENCE INCOMPLETE.** Authenticated barcode-capture tests and barcode-like
capture paths are present, but a separate barcode subsystem cannot be claimed
without stronger path-level evidence than the commit history provided.

### Supabase

Supabase appears in authentication, persistence, profile/session behavior,
diary/sync integration, provider configuration, and security documentation.
No new authentication provider was established by the scoped branch history.

### Database and migrations

The branch contains database/security work and Coach Fact Context migrations.
For the September 7 merge-base-to-tip product diff, the API inventory found no
new relational planner or entitlement schema and no new SQL/Drizzle migration
for the later recipe/planner/profile/capture work. The Coach Fact Context
phase does contain explicit SQL/Supabase migration files listed in Work Item
08. These two observations must not be conflated.

### Dependencies

The branch includes product dependencies, generated contract exports, Expo/EAS
configuration, API validation scripts, and a scoped `@xmldom/xmldom` package
override. Dependency changes were not treated as product features unless they
changed runtime or release behavior.

## Evidence and interpretation rules

- This is a Git/tree/source inventory, not an execution audit.
- Commit subjects were cross-checked against changed paths and source evidence
  where the work item claims implementation.
- Reports, screenshots, memory files, and attached prompts are separated from
  product code wherever the commit mixed them.
- A commit titled “Published your App” is not treated as proof of external
  publication.
- Test files show intended or covered behavior; tests were not run for this
  inventory.
- Provider, GitHub, Replit, EAS, Apple, DNS, and production claims remain
  incomplete without independent provider readback.
- Several commits combine implementation, tests, metadata, and reports. The
  work-item separation is thematic and path-based, not a claim that every
  commit was atomically scoped.
- The inventory does not classify any item as KEEP, EXCLUDE, safe, unsafe, or
  recommended for recovery.

## Owner review index

Use the stable item numbers below for the later owner decision. The decision
column is intentionally blank.

| Item | Work / mission | Date | Category | Runtime impact | Dependencies | Owner decision |
|---:|---|---|---|---|---|---|
| 01 | Initial Calora application foundation | Jul 28–early Aug | Product/mobile foundation | YES | Base for 02–06 | [ ] |
| 02 | Onboarding, authentication, account, persistence | Aug 7–20 | Product/backend/mobile infrastructure | YES | 01, Supabase, Expo | [ ] |
| 03 | Home, Plus, Recipes, Planner, navigation | Aug 6–20 | Product/UI/backend | YES | 01–02, contracts, RevenueCat | [ ] |
| 04 | Smart Scan, capture, barcode-like input, Food Memory | Aug 6–19 | Product/backend/security | YES | 02–03, capture providers | [ ] |
| 05 | Progress, wellness, diary, nutrition, health | Aug 6–20 | Product/backend/mobile infrastructure | YES | 02–04, health adapters | [ ] |
| 06 | Coach, intelligence, visual system, interaction | Aug 6–20 | Product/UI/security | YES | 01–05 | [ ] |
| 07 | Database security and account isolation | Aug 20–23 | Security/backend/database/audit | MIXED | 02, persistence, DB | [ ] |
| 08 | Coach Fact Context consent/governance | Aug 21–Sep 9 | Product/security/backend/audit | YES/MIXED | 02, 05–07, contracts | [ ] |
| 09 | Image, release, deletion, reliability hardening | Aug 24–Sep 7 | Security/backend/verification | MIXED | 02, 04, 06–07 | [ ] |
| 10 | Late product fixes and feature integration | Sep 7–9 | Product/bug fix/backend/UI | YES | 02–06, 08–09 | [ ] |
| 11 | Brand, domain, referral, auth deep links | Sep 8 | Config/backend/mobile/release | MIXED | 02, 08, 10 | [ ] |
| 12 | Git/GitHub synchronization and reconciliation | Sep 8–9 | Git/release/audit/docs | NO/MIXED | 09–11, external refs | [ ] |
| 13 | Mandatory CI release gate | Sep 9 | Git/release/testing/security | MIXED | 09–12, GitHub Actions | [ ] |
| 14 | Native auth, Expo/iOS/EAS, TestFlight forensics | Sep 9–15 | Mobile infrastructure/release/audit | MIXED | 02, 11–13, Apple/EAS | [ ] |

## Final status

**WORK INVENTORY READY FOR OWNER REVIEW**
