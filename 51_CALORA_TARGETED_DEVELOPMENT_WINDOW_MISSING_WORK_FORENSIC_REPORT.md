# Calora Step 51 — Targeted Development-Window Missing Work Forensic Report

**Execution date:** 2026-09-16  
**Mission:** Forensic audit only  
**Canonical baseline:** `origin/main` at `7cce885c6b3d046a5a8fdb40d92343a87b73c290`  
**Canonical tree:** `1a598be866150d488bc21ccd598de3104c638b02`  
**Application source changed:** No  
**Build/deploy/push/database/ref mutation:** None

## 1. Executive summary

Step 51 narrowed the Step 50 archaeology to the development sequence around
the post-install prompt and reports 16–19. The intentional Fitness/More
rollback was excluded from missing-work conclusions, as explicitly required by
the owner.

The defensible targeted window begins with the adjacent Coach and product
polish work on 2026-09-07 and ends with the last product Coach Fact Context
integration on 2026-09-09, before the repository moved into a materially
different release-control/native-build mission.

The core post-install remediation sequence was:

```text
pre-prompt Coach/product work
  → report 15 release/reconciliation boundary
  → 53eddce: reports 16/17 and broad remediation
  → 972eafe: report 18 and recipe freshness closure
  → c37b83d: zero-tree-delta release marker
  → 22cbe8a: report 19 synchronization evidence
  → adjacent profile/onboarding/recipe/Premium/Coach product work
  → release-control/native-build mission
```

The historical commits themselves are not ancestors of canonical `origin/main`.
However, canonical main preserves much of the behavior through newer or
independently reconciled implementations.

### Genuine target-window gaps

1. **Onboarding keyboard/focus visibility and agreement accessibility semantics**
   from `cafea90` are not present in canonical main.
2. **Plus remount behavior and recipe freshness/rotation** from the report 18
   closure are not fully represented in canonical main.
3. **Nutrition pending/partial/unavailable presentation** remains incomplete
   on canonical recipe cards/details even though server nutrition infrastructure
   survived.
4. **Health metrics are partially visible, but imported workouts have no
   rendered destination.** This is a current disconnected edge, not permission
   to restore the excluded Fitness shell.
5. Several historical focused tests and module boundaries were lost or
   replaced. This is mainly a test-contract and architecture-drift issue, not
   proof of missing product behavior.

### Preserved by newer canonical work

- onboarding completion persistence and draft resumption;
- Plus pagination, cursor truth, deduplication, and entitlement boundaries;
- Smart Scan review/approval, Food Memory, diary outbox, and Home propagation;
- bounded Coach consent, facts, lifecycle fencing, and fail-closed rollout;
- Health steps/energy/weight display foundation;
- profile, Premium, referrals, and account-scoped sync capabilities.

The correct recovery posture is selective reimplementation and device
verification, not branch recovery. The targeted window contains **limited
unrecovered work**, not the broad Fitness/More delta identified in Step 50.

## 2. Canonical baseline

- Ref: `origin/main`
- SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Tree: `1a598be866150d488bc21ccd598de3104c638b02`
- TestFlight version/build: `1.0.0 (5)`
- EAS build ID: `088c4dc8-0ed9-4293-b7b7-4925045cbbbe`

The canonical ref and tree remained unchanged during this audit. No application
source, refs, database, build configuration, or release artifact was mutated.

## 3. Known historical anchors

The primary anchors are:

| Anchor | Evidence | Meaning |
|---|---|---|
| `cafea90` | `Update onboarding screen logic and tests` | Later adjacent onboarding keyboard/agreement work |
| `c37b83d` | `Finalize post-install remediation and recipe freshness` | Zero-tree-delta closure marker for the recipe/post-install sequence |
| Report 16 | `16_CALORA_POST_INSTALL_DEFECT_REMEDIATION_REPORT.md` | Broad post-install remediation claim |
| Report 17 | `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md` | Complete flow documentation claim |
| Report 18 | `18_CALORA_PLUS_RECIPE_FRESHNESS_FINAL_CLOSURE_REPORT.md` | Plus freshness/pagination closure claim |
| Report 19 | `19_CALORA_FINAL_POST_INSTALL_GITHUB_SYNC_REPORT.md` | Synchronization and release evidence |
| `release/calora-onboarding-and-plus` | Local and remote divergent refs | Historical implementation/report lineage |

The anchors identify the window; they are not by themselves proof that the
claimed behavior survived in canonical main.

## 4. Method used to determine development window

The window was determined from commit ancestry and mission transitions rather
than an arbitrary number of commits:

1. Locate the parent/child chain containing reports 16–19.
2. Inspect the meaningful product commits immediately before report 16.
3. Inspect product commits immediately after report 19.
4. Continue while changed files and subjects remained part of the owner-request,
   remediation, product-hardening, or immediate Coach/recipe/onboarding sequence.
5. Stop when the repository moved into release-gate, native-auth, EAS,
   signing, GitHub-controller, or other release-control work.
6. Compare each meaningful change against exact canonical source and ancestry.
7. Exclude Fitness/More, old Progress, unsafe Coach, old referral/security
   logic, deprecated APIs, and intentional rollback work from recovery claims.

The audit used `git show`, `git log --ancestry-path`, `git merge-base`,
`git branch --contains`, `git ls-tree`, `git diff-tree`, report contents,
current source, and current tests. No ref was checked out or changed.

## 5. Exact start boundary

### Selected start boundary

The targeted window starts at:

`0ba0ef5d1ca1ce79b9262298ec091ab5928e3cd1`

- Date: 2026-09-07 23:24:14 UTC
- Subject: `Update coach component logic in calora app`
- Parent: `e35188ab08728e6a55313ff11e93f418d97ffb2e`
- Product area: Coach guest/lifecycle behavior

This is the earliest adjacent product commit that remains clearly connected to
the remembered “sanitize and complete Coach” work. Its direct children
`1c1fdc7`, `1e34dd3`, `aea8ea6`, and `52ca6be` continue the same Coach
refactor/test/visual sequence.

Earlier ancient recipe, auth, Fitness, and visual history was not included as
target-window product work merely because it was reachable from the branch.

### Immediate pre-boundary context

`e35188a` changed restaurant and Food Memory components and tests immediately
before the Coach sequence. It is recorded as adjacent context, not as a direct
remembered-prompt remediation commit.

## 6. Exact end boundary

### Selected end boundary

The targeted window ends at:

`2486ae3d9246a884dd162a5f2bca74af1037942a`

- Date: 2026-09-09 13:40:37 UTC
- Subject: `Implement coach fact context consent and integration logic`
- Parent: `3db586c61de000908b6afe18b8635fbf01f76a2b`
- Product area: bounded Coach Fact Context consent/integration

This is the last clearly product-facing Coach remediation commit in the
adjacent sequence.

### Why the window stops here

The next meaningful line moved into mandatory CI/release gates, provider
sentinels, native-auth synchronization, EAS archive/signing, and release
controller work. Those commits may affect release confidence but are not
additional owner-prompt product recovery candidates.

The narrower report-16–19 core ends earlier at `22cbe8a68905654f...`, while
the expanded targeted window includes the immediate adjacent product work
through `2486ae3`.

## 7. Branch topology

Relevant topology:

```text
e35188a
  → 0ba0ef5 → 1c1fdc7 → 1e34dd3 → aea8ea6 → 52ca6be
  → adjacent UI/recipe/planner/auth work
  → d986dd6 (report 15 boundary)
  → 53eddce (reports 16/17 + broad remediation)
  → 972eafe (report 18 + recipe closure)
  → c37b83d (zero-tree-delta marker)
  → 22cbe8a (report 19)
  → 342aa05 (published-app marker)
  → e7d6bba (profile)
  → cafea90 (onboarding)
  → 399200a → cd71c4e → fb94a57 (recipe list/route)
  → 3e727aa (Premium/RevenueCat)
  → 3db586c → 2486ae3 (Coach Fact Context)
  → release-control/native-build mission
```

The historical release line and `origin/main` share an earlier merge base but
the targeted product commits are not ancestors of canonical main. The current
canonical branch instead contains later reconciliation and release work.

### Relevant commit topology table

| Commit | Parent | Date | Subject | Relevant refs | Canonical ancestor? |
|---|---|---|---|---|---|
| `0ba0ef5` | `e35188a` | Sep 7 23:24Z | Update Coach component logic | release/agent refs | No |
| `1c1fdc7` | `0ba0ef5` | Sep 7 23:31Z | Update Coach component | release/agent refs | No |
| `1e34dd3` | `1c1fdc7` | Sep 7 23:34Z | Refactor Coach into guest module/tests | release/agent refs | No |
| `52ca6be` | `aea8ea6` | Sep 8 00:05Z | Update Coach component/screenshot | release/agent refs | No |
| `d986dd6` | `3fcedf9` | Sep 8 23:31Z | Add final release reconciliation report | release/agent refs | No |
| `53eddce` | `d986dd6` | Sep 9 00:29Z | Expand API tests and post-install remediation | release/agent refs | No |
| `972eafe` | `53eddce` | Sep 9 00:58Z | Update post-install report and recipe freshness | release/agent refs | No |
| `c37b83d` | `972eafe` | Sep 9 01:06Z | Finalize remediation/freshness | release/agent refs | No |
| `22cbe8a` | `c37b83d` | Sep 9 01:08Z | Add final post-install sync report | release/agent refs | No |
| `e7d6bba` | `342aa05` | Sep 9 12:38Z | Profile management/API specification | release/agent refs | No |
| `cafea90` | `e7d6bba` | Sep 9 12:40Z | Onboarding logic/tests | release/agent refs | No |
| `399200a` | `cafea90` | Sep 9 12:41Z | Recipes/swipeable list | release/agent refs | No |
| `3e727aa` | `fb94a57` | Sep 9 12:59Z | RevenueCat Premium recipe features | release/agent refs | No |
| `3db586c` | adjacent Coach parent | Sep 9 13:28Z | Coach consent flow/tests | release/agent refs | No |
| `2486ae3` | `3db586c` | Sep 9 13:40Z | Coach consent/integration | release/agent refs | No |

## 8. Chronological commit timeline

### Pre-prompt Coach and product context

- `0ba0ef5`, `1c1fdc7`: Coach component behavior and presentation changes.
- `1e34dd3`: extracted `guestCoach.ts` and added tests.
- `aea8ea6`, `52ca6be`: Coach presentation refinements and screenshots.
- `1fa9b29`: Insights dashboard changes.
- `da16da5`, `21170cf`: saved recipe component changes.
- `47148f1`, `16d342d`, `5c2d538`: recipe/Planner linking and refactor/test work.
- `923561b`, `b12f757`: recipe screen and swipeable-list changes.
- `9c83c3d`, `5420697`: universal-link/referral/auth-adjacent work.

### Immediate release/reconciliation context

- `9d02f9c`: recipe-scroll pre-verification report.
- `11bc56c`: final GitHub sync report.
- `61a48c2`, `d8ecc37`, `df44068`, `6f8c779`: P1 release/remediation and
  referral-copy context.
- `d1818d7`, `87a1f81`, `3fcedf9`, `d986dd6`: closure and release-tree reports.

### Core remembered-prompt remediation

- `53eddce`: broad API/mobile remediation, reports 16/17, capture and sync
  strengthening, Coach/recipe changes, and tests.
- `972eafe`: report 18 and recipe freshness/pagination/nutrition closure.
- `c37b83d`: zero-tree-delta marker; no new product files.
- `22cbe8a`: report 19 and sync/release evidence.

### Immediate post-report product work

- `e7d6bba`: profile management and API specification.
- `cafea90`: onboarding keyboard-aware and agreement UX/tests.
- `399200a`, `cd71c4e`, `fb94a57`: recipe list/route/swipe tests and behavior.
- `3e727aa`: RevenueCat Premium recipe enforcement/tests.
- `3db586c`, `2486ae3`: Coach Fact Context consent, facts, API, client, and
  generated contract integration.

### Mission transition

After `2486ae3`, the repository moved into CI/release-gate, EAS/native-auth,
signing, and GitHub-controller work. Those commits are not counted as target
window product recovery.

## 9. Reports in the targeted window

| Report | Trigger/context | Corresponding commits | Canonical equivalent |
|---|---|---|---|
| `15_CALORA_FINAL_P1_RELEASE_TREE_RECONCILIATION_REPORT.md` | Pre-window release/reconciliation boundary | `d986dd6` | Release documentation only |
| `16_CALORA_POST_INSTALL_DEFECT_REMEDIATION_REPORT.md` | Owner post-install defects | `53eddce`, updated `972eafe` | Some behavior preserved/replaced |
| `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md` | Full flow forensic request | `53eddce`, updated `972eafe` | Runtime map reconstructable; artifact absent |
| `18_CALORA_PLUS_RECIPE_FRESHNESS_FINAL_CLOSURE_REPORT.md` | Plus freshness/pagination closure | `972eafe` | Core pagination preserved; freshness not complete |
| `19_CALORA_FINAL_POST_INSTALL_GITHUB_SYNC_REPORT.md` | Sync/release evidence | `22cbe8a` | Documentation/sync evidence only |
| `docs/CALORA_WHOLE_APP_BUG_MINIMIZATION_VERIFICATION_REPORT_2026-09-09.md` | Whole-app bug-minimization verification | `acead67` | Coverage/release evidence; no new product source |

Reports 16–19 exist on the divergent historical line and are absent from the
canonical report tree. Their claims were compared with actual files and tests.

## 10. Files changed in the targeted window

The meaningful product-file differential, excluding release metadata and
intentional Fitness/More rollback, is:

### Added

- `artifacts/api-server/src/routes/profile.ts`
- `artifacts/api-server/src/__tests__/profile.test.ts`
- `artifacts/calora/lib/captureAcceptanceCoordinator.ts`
- `artifacts/calora/lib/premiumCatalogueState.ts`
- `artifacts/calora/lib/profileSync.ts`
- `artifacts/calora/components/CoachFactContextConsentPanel.tsx`
- `artifacts/calora/lib/intelligence/coachFactContext.ts`
- `artifacts/calora/lib/intelligence/facts.ts`
- `artifacts/calora/lib/intelligence/coachFactContextClient.ts`
- generated Coach Fact Context API/type files

### Modified

- API capture, Coach Fact Context, Premium recipes, recipes, sync, RevenueCat,
  and route registration;
- API capture, Coach, Premium, recipe, RevenueCat, sync, and contract tests;
- mobile `index.tsx`, `coach.tsx`, Insights, Planner, Recipes, Scan, context,
  and SwipeableTabList;
- mobile capture, Coach, living-memory, Premium catalogue, recipe model, and
  profile-sync tests;
- OpenAPI and generated API client/schema/type files;
- reports and agent metadata.

### Renamed

No product rename was found in the selected window.

### Deleted

No target-window product deletion was established. Historical Fitness/More
deletions belong to intentional rollback history and are explicitly excluded.
Older helper deletions such as original recipes, calorie-gauge, and planner
link helpers were supersession history, not target-window missing work.

## 11. Tests changed in the targeted window

Meaningful added or materially changed tests include:

- API `capture.test.ts`;
- API `coachFactContext.test.ts`;
- API `premiumRecipes.test.ts`;
- API `recipes.test.ts`;
- API `sync.test.ts` and `sync.integration.test.ts`;
- API `revenuecat.test.ts`;
- API `profile.test.ts`;
- mobile `captureAcceptanceCoordinator.test.ts`;
- mobile `captureAcceptancePersistence.test.ts`;
- mobile `captureReview.test.ts`;
- mobile `coachFactContextClient.test.ts`;
- mobile `coachFactCoordinator473.test.ts`;
- mobile `livingMemoryHeader.test.ts`;
- mobile `onboardingScreen.test.ts`;
- mobile `premiumCatalogueState.test.tsx`;
- mobile `premiumRecipeQueryKeys.test.ts`;
- mobile `recipeModel.test.ts`;
- mobile `recipesScreen.test.ts`;
- later `profileSync.test.ts`, `guestCoach.test.ts`,
  `intelligenceHardening.test.ts`, and Coach Fact Context tests.

The historical tests reveal precise contracts, but a filename disappearing does
not automatically mean the behavior disappeared. Canonical tests often cover
the same behavior under newer names and architecture.

## 12. Lost test contracts

The following historical test contracts are absent by exact filename from
canonical main or have materially changed:

| Historical contract | Current status |
|---|---|
| `onboardingScreen.test.ts` keyboard offset/focus placement | No equivalent native focused-field contract |
| `onboardingScreen.test.ts` checkbox role/state/tap copy | No equivalent canonical focused agreement test |
| `premiumCatalogueState.test.tsx` same-day/account restore | Covered partially by query-key/cache tests |
| `premiumCatalogueState.test.tsx` atomic page-0 replacement | API/cache behavior covered, exact client contract not proven |
| `captureAcceptancePersistence.test.ts` | Replaced by diary/outbox/coordinator coverage |
| `coachFactContextClient.test.ts` | Replaced by Fact Context allowlist/activation tests |
| `coachFactCoordinator473.test.ts` | Lifecycle/fencing coverage exists under newer tests |
| `livingMemoryHeader.test.ts` | Living Memory behavior exists; exact header contract not proven |
| `guestCoach.test.ts` | Guest/consent safety concepts exist under newer Coach tests |
| `captureAcceptanceCoordinator.test.ts` | Newer capture review transition/coordinator coverage exists |

Classification: **TEST_CONTRACT_LOST** where the exact contract is absent, but
most are **PRESERVED_BY_NEWER_IMPLEMENTATION** at behavior level.

The genuinely important lost contracts are onboarding native behavior,
Plus-remount request count, Discover variety, and complete nutrition UI-state
rendering.

## 13. What happened immediately before the remembered prompt

Immediately before reports 16–19, the branch was closing a P1/release and
reconciliation sequence:

- app publication and P1 release identity;
- referral invite copy;
- closure verification;
- production/reconciliation reports;
- report 15 tree reconciliation;
- Coach guest/lifecycle work;
- recipe/Planner and auth/deep-link work;
- API and source test expansion.

The Coach sequence beginning at `0ba0ef5` is the clearest pre-prompt product
context. It moved from direct Coach component edits to a guest Coach module,
tests, and presentation evidence. It did not authorize restoring unrestricted
Coach behavior; it was an early step toward the later bounded Fact Context
control plane.

## 14. What the remembered prompt triggered

The prompt/remediation sequence most directly triggered or recorded:

1. broad post-install source/test remediation in `53eddce`;
2. capture approval, Food Memory, diary/sync, and Home propagation hardening;
3. API recipe/provider/cursor and entitlement strengthening;
4. report 16 and report 17;
5. Plus freshness/pagination/nutrition work and report 18 in `972eafe`;
6. report 19 synchronization evidence in `22cbe8a`;
7. later adjacent onboarding, profile, recipe, Premium, and bounded Coach work.

The direct report-16 implementation was broad. The later `cafea90` onboarding
commit is not part of the report-16–19 core but is part of the selected
prompt-adjacent window and is the strongest evidence that onboarding remediation
continued after the core report sequence.

## 15. Additional agent-discovered work during the sequence

Beyond the remembered list, the selected window contains:

- profile management and profile API contract work;
- profile synchronization and account-scoped settings;
- Premium/RevenueCat recipe enforcement;
- guest recipe generation and authenticated retry paths;
- recipe swipe/list and route behavior;
- Coach Fact Context consent, fact allowlists, generated contracts, and
  server/client integration;
- capture acceptance coordinator and persistence boundaries;
- diary sync conflict/idempotency tests;
- living-memory header and Food Memory tests;
- provider and API compatibility test expansion;
- referral invite copy and release evidence;
- whole-app bug-minimization documentation;
- screenshots and visual evidence for Coach, Planner, Recipes, and Insights.

Release-control work in the same date range is recorded but not treated as
product recovery: mandatory CI gates, provider sentinels, GitHub sync,
native-auth, EAS archive/signing, and release-controller reports.

## 16. What happened immediately after

After report 19:

- the app was published;
- profile management/API specification work landed;
- onboarding keyboard-aware and agreement UX/tests landed;
- recipe swipeable-list and route/test work landed;
- RevenueCat Premium recipe enforcement/tests landed;
- Coach Fact Context consent/integration work landed;
- then the repository moved into CI, native-auth, EAS, signing, and release
  control.

The immediate product work after report 19 is relevant because it contains
`cafea90`, the historical onboarding implementation that is absent from
canonical main. It is not evidence that the entire historical release branch
should be recovered.

## 17. Onboarding reconstruction

### Historical work

`e27a2e8` and `b8ed3cf` established completion persistence and draft resumption.
`cafea90` then added:

- `KeyboardAwareScrollViewCompat`;
- bottom inset plus keyboard offset;
- extra keyboard space;
- platform-specific keyboard dismissal;
- bottom padding;
- focused input visibility test coverage;
- agreement checkbox role/state;
- required and spoken labels;
- `testID="onboarding-consent"`;
- explicit “Tap to agree” affordance and checked/unchecked copy.

### Canonical state

Canonical preserves durable completion, draft hydration, account scoping,
flush-before-redirect, and disabled final action behavior. It uses a plain
ScrollView and generic consent Pressable without the historical native keyboard
or accessibility contract.

Classification:

- persistence/drafts: `PRESERVED_EQUIVALENT`;
- keyboard/agreement semantics: `PARTIALLY_PRESERVED`;
- focused test contract: `TEST_CONTRACT_LOST`.

User-visible impact: **YES**.  
Recovery relevance: **REIMPLEMENT_CLEANLY**, then **VERIFY_ON_DEVICE_FIRST**.

## 18. Coach reconstruction

### Historical work

The sequence moved from direct Coach edits (`0ba0ef5` through `52ca6be`) to
guest Coach extraction/tests, then to Fact Context consent and integration in
`3db586c` and `2486ae3`.

Meaningful changes included:

- consent panel and gating;
- server rollout/default-deny control;
- allowlisted fact keys and values;
- bounded history/request text;
- generated API contracts;
- client lifecycle/fencing;
- consent tests and hardening tests;
- timeout/failure handling.

### Canonical state

Canonical has the bounded Fact Context path, consent, default-deny rollout,
allowlisted facts, request fencing, account/hydration epochs, and navigation
actions. The restricted behavior is intentional safety work, not missing
permission to restore legacy Coach.

Remaining gaps:

- narrow approved fact coverage;
- explicit retry/backoff/offline recovery;
- client-authored fact provenance limitations;
- production Coach outcome/latency observability;
- native/device proof;
- complete local history/account-switching isolation proof.

Classification:

- safety boundary: `PRESERVED_EQUIVALENT`;
- broader Coach completeness: `PARTIALLY_PRESERVED`;
- unrestricted legacy behavior: `DO_NOT_RESTORE`.

## 19. Recipe/Discover/Plus reconstruction

### Historical work

The target sequence includes:

- Premium refresh policy from `614cb39`;
- rapid-scroll pagination hardening from `8d61f13`;
- recipe route/swipe/list work;
- Premium/RevenueCat entitlement changes;
- `972eafe` recipe freshness closure;
- provider exhaustion and cursor/terminal behavior;
- account/day-aware cache handling;
- stable rotation for unfiltered Plus;
- atomic page-0 replacement;
- unique append and deduplication;
- search/category provider-order preservation;
- remount state restoration;
- new-day refresh behavior;
- protected account/401/403 cache clearing.

### Canonical state

Canonical retains:

- Plus pagination and cursor contracts;
- deduplication and single-flight behavior;
- provider exhaustion metadata;
- entitlement/account boundaries;
- recipe browse/search/filter/detail/create paths;
- nutrition API/cache/warmup infrastructure.

Canonical does not fully retain:

- meaningful Discover/Plus freshness rotation;
- recently-shown exclusion;
- stable day/session variety;
- no-request-on-remount behavior;
- full nutrition state presentation.

Classification:

- pagination/entitlement: `PRESERVED_EQUIVALENT` or
  `PRESERVED_BY_NEWER_IMPLEMENTATION`;
- Plus remount: `PRESENT_BUT_BROKEN`;
- freshness: `PRESENT_BUT_BROKEN`;
- recipe domain overall: `PRESERVED_BUT_CHANGED`.

## 20. Nutrition reconstruction

Historical nutrition work included:

- persisted AI estimates (`02b7c67`);
- database/cache integration;
- background warmup and pending state (`e151ecf`);
- explicit unavailable/retry state (`408737f`);
- provider normalization and null preservation.

Canonical retains server-side nullable nutrition, provider normalization,
estimated values, cache/warmup paths, and bounded failure behavior.

The mobile presentation remains incomplete:

- cards do not consistently present calories, protein, carbohydrate, and fat;
- detail paths can render null values as zero-like output;
- pending, partial, unavailable, estimated, and verified states are not
  consistently differentiated on every surface.

Classification: `PARTIALLY_PRESERVED`.  
User-visible impact: **YES**.  
Recovery relevance: `REIMPLEMENT_CLEANLY`.  
Constraint: never fabricate nutrition.

## 21. Progress/Memory reconstruction

The remembered Progress header/history-memory request is not a target-window
missing feature. The older Progress arrangement was superseded by the current
Insights route and Memory destination.

The selected window contains Insights layout and saved-memory/recipe work, but
canonical current behavior provides the newer equivalent:

- visible Progress label backed by Insights;
- trends, weight, wellness, and signals;
- memory/history action routed to `/memory`.

Classification: `PRESERVED_BY_NEWER_IMPLEMENTATION` and `SUPERSEDED`.  
Recovery relevance: `NO_RECOVERY_NEEDED`.  
Do not restore the old Progress navigation or exact historical pixel placement.

## 22. Smart Scan → Home reconstruction

Report 16 described a flow involving capture approval, Food Memory, durable
outbox/retry, and Home propagation.

Canonical later work (`7b1ae63`, `8965cc6`) provides the stronger equivalent:

```text
capture
→ analysis
→ review/edit
→ explicit approval
→ Food Memory/local diary
→ nutrition snapshot/provenance
→ durable diary outbox
→ persistence flush
→ local Home Today totals
→ authenticated retryable sync
```

The current flow uses explicit approval rather than unsafe silent approval.
Account scoping, image provenance, and idempotency are stronger than the
historical contract.

Classification: `PRESERVED_BY_NEWER_IMPLEMENTATION`.  
Remaining work: device/offline/background/process-kill/date-boundary evidence.  
Recovery relevance: `VERIFY_ON_DEVICE_FIRST`, not branch recovery.

## 23. Health-display reconstruction

The target sequence included Health adapters and display work, including
`94c7cdc` and adjacent `5721854` health-sync/UI work.

Canonical currently provides:

| Metric | Current source/display |
|---|---|
| Steps | Native adapter, local snapshot, Insights/Progress signal |
| Active energy | Native adapter, local snapshot, Insights and Home calculation |
| Weight | Native adapter/local trend, Progress |
| Permissions/status | Profile Health management |
| Workouts | Stored in snapshots; no rendered destination/card |

Classification:

- steps/energy/weight foundation: `PRESERVED_BY_NEWER_IMPLEMENTATION`;
- imported workout visibility: `PRESENT_BUT_DISCONNECTED`.

This does not authorize restoring Fitness/More. Any workout presentation needs
a new current product decision and design. Health remaining local/native and
read-only is an architecture boundary, not missing server work.

## 24. Reliability/user-flow reconstruction

Report 17 documented a complete current flow map. Report 16 claimed broad test
and remediation coverage. The historical reports validate the divergent tree,
not canonical ancestry.

Canonical currently has:

- broad mobile/API tests;
- error boundaries and explicit failure states;
- local-first capture and sync idempotency;
- account-scoped hydration;
- Coach request fencing;
- provider/rate-limit controls;
- release attestation and build provenance.

Remaining evidence gaps:

- physical camera, Health, notifications, deep links, purchases, and
  background/resume;
- live provider cardinality;
- Coach outcome telemetry;
- process-kill/relaunch and date-boundary flows;
- OpenAPI/profile/diary contract drift.

Classification: `PRESERVED_BY_NEWER_IMPLEMENTATION` for source safeguards and
`VERIFY_ON_DEVICE_FIRST` for native/runtime claims. Report 17 itself is
`DOCUMENTATION_ONLY` and absent from canonical main.

## 25. OTHER product work discovered in the same window

Relevant non-Fitness product work includes:

- Profile management and profile/API specification (`e7d6bba`);
- profile sync and account settings;
- Premium/RevenueCat recipe enforcement (`3e727aa`);
- guest recipe generation and authenticated retry;
- recipe swipe/list and route behavior;
- referral invite copy;
- Coach Fact Context generated contracts and integration;
- capture acceptance coordinator and persistence tests;
- diary sync conflict/idempotency tests;
- Food Memory/living-memory tests;
- API/provider compatibility expansion;
- recipe/Planner handoff and saved recipe work;
- screenshots and visual evidence.

These are included as window context. Only the items with a current behavioral
delta appear in the target-window missing-work list.

### Mandatory targeted-window table

| TW ID | Historical work | Commit(s) | Relation to remembered prompt | Current canonical equivalent | Classification | User-visible? | Recovery relevance |
|---|---|---|---|---|---|---|---|
| TW-001 | Coach component and guest lifecycle refactor | `0ba0ef5`, `1c1fdc7`, `1e34dd3`, `aea8ea6`, `52ca6be` | `LIKELY_PRE_PROMPT_RELATED_WORK` | Bounded Coach/Fact Context architecture | `PRESERVED_BUT_CHANGED` | YES/POSSIBLY | `VERIFY_ON_DEVICE_FIRST` |
| TW-002 | Restaurant/Food Memory test and component cleanup | `e35188a` | `LIKELY_PRE_PROMPT_RELATED_WORK` | Current Food Memory and restaurant flows | `PRESERVED_BY_NEWER_IMPLEMENTATION` | POSSIBLY | `NO_RECOVERY_NEEDED` |
| TW-003 | Planner-to-recipe continuity and recipe screen refactor | `47148f1`, `16d342d`, `5c2d538`, `923561b` | `LIKELY_PRE_PROMPT_RELATED_WORK` | Current Planner/Recipes handoff and route | `PRESERVED_BY_NEWER_IMPLEMENTATION` | YES/POSSIBLY | `NO_RECOVERY_NEEDED` |
| TW-004 | Universal links, auth callback, and referral reconciliation | `9c83c3d`, `5420697` | `SAME_DEVELOPMENT_SEQUENCE` | Auth callback, invite, referral API/client | `PRESERVED_BY_NEWER_IMPLEMENTATION` | POSSIBLY | `VERIFY_ON_DEVICE_FIRST` |
| TW-005 | P1 release/reconciliation and referral-copy context | `d8ecc37`, `d1818d7`, `87a1f81`, `3fcedf9`, `d986dd6` | `SAME_DEVELOPMENT_SEQUENCE` | Release evidence and current referral copy | `DOCUMENTATION_ONLY` | NO | `NO_RECOVERY_NEEDED` |
| TW-006 | Broad post-install defect remediation | `53eddce` | `DIRECTLY_FROM_REMEMBERED_PROMPT` | Capture, recipes, sync, Coach, onboarding persistence, tests | `PRESERVED_BY_NEWER_IMPLEMENTATION` | YES | `NO_RECOVERY_NEEDED` for source recovery |
| TW-007 | Complete user-flow forensic map | `53eddce`, `972eafe` | `DIRECTLY_FROM_REMEMBERED_PROMPT` | Current flows reconstructable from source | `DOCUMENTATION_ONLY` | NO | `NO_RECOVERY_NEEDED` unless documentation is requested |
| TW-008 | Plus freshness, pagination, cache, and nutrition closure | `972eafe`, marker `c37b83d` | `DIRECTLY_FROM_REMEMBERED_PROMPT` | Cursor pagination and nutrition backend; freshness/UI incomplete | `PARTIALLY_PRESERVED` | YES | `REIMPLEMENT_CLEANLY` |
| TW-009 | Final post-install synchronization evidence | `22cbe8a` | `DIRECTLY_FROM_REMEMBERED_PROMPT` | Current canonical release evidence differs | `DOCUMENTATION_ONLY` | NO | `NO_RECOVERY_NEEDED` |
| TW-010 | Profile management and API specification | `e7d6bba` | `LIKELY_POST_PROMPT_RELATED_WORK` | Hidden Profile route and local settings | `PRESERVED_BUT_CHANGED` | YES/POSSIBLY | `VERIFY_ON_DEVICE_FIRST` |
| TW-011 | Keyboard-aware onboarding and agreement UX | `cafea90` | `LIKELY_POST_PROMPT_RELATED_WORK` | Durable onboarding, but no full keyboard/semantic equivalent | `PARTIALLY_PRESERVED` | YES | `REIMPLEMENT_CLEANLY` |
| TW-012 | Recipe swipe/list/route behavior and tests | `399200a`, `cd71c4e`, `fb94a57` | `LIKELY_POST_PROMPT_RELATED_WORK` | Current Recipes list, routes, pagination | `PRESERVED_BUT_CHANGED` | YES/POSSIBLY | `NO_RECOVERY_NEEDED` except freshness |
| TW-013 | Premium/RevenueCat recipe enforcement | `3e727aa` | `LIKELY_POST_PROMPT_RELATED_WORK` | Server entitlement and Premium client paths | `PRESERVED_BY_NEWER_IMPLEMENTATION` | YES/POSSIBLY | `VERIFY_ON_DEVICE_FIRST` |
| TW-014 | Coach Fact Context consent and integration | `3db586c`, `2486ae3` | `LIKELY_POST_PROMPT_RELATED_WORK` | Default-deny rollout, allowlisted facts, consent, fencing | `PRESERVED_EQUIVALENT` for safety | YES/POSSIBLY | `DO_NOT_RESTORE` unrestricted Coach |
| TW-015 | Health adapters and metric display | `94c7cdc`, `5721854` | `SAME_DEVELOPMENT_SEQUENCE` | Native read-only snapshots, Profile/Insights metrics | `PARTIALLY_PRESERVED` | YES/POSSIBLY | `VERIFY_ON_DEVICE_FIRST` |
| TW-016 | Capture approval, Food Memory, diary outbox, Home Today | `53eddce`, later `7b1ae63`, `8965cc6` | `DIRECTLY_FROM_REMEMBERED_PROMPT` | Stronger explicit approval and local-first sync | `PRESERVED_BY_NEWER_IMPLEMENTATION` | YES | `VERIFY_ON_DEVICE_FIRST` |
| TW-017 | Nutrition persistence, warmup, unavailable/retry behavior | `02b7c67`, `e151ecf`, `408737f` | `LIKELY_PRE_PROMPT_RELATED_WORK` | Nullable/cache/warmup API and partial UI | `PARTIALLY_PRESERVED` | YES | `REIMPLEMENT_CLEANLY` |
| TW-018 | Whole-app bug-minimization verification | `acead67` | `LIKELY_POST_PROMPT_RELATED_WORK` | Current tests, release gates, and readiness reports | `DOCUMENTATION_ONLY` | NO directly | `VERIFY_ON_DEVICE_FIRST` |

## 26. Current canonical equivalents

| Historical area | Current equivalent |
|---|---|
| Completion persistence | `CaloraContext.completeOnboarding`, persistence manager |
| Draft resumption | Onboarding hydration/draft state |
| Keyboard-aware onboarding | No full current equivalent |
| Agreement semantics | Current consent gate, incomplete accessibility semantics |
| Coach guest logic | Bounded Fact Context and consent lifecycle |
| Coach safety | Server rollout, allowlist, request fencing |
| Plus pagination | Cursor/offset/dedup/single-flight API and client |
| Recipe freshness | Deterministic category/interleaved finite pool; incomplete rotation |
| Nutrition backend | Nullable/cache/warmup/provider normalization |
| Nutrition UI states | Partial card/detail presentation |
| Smart Scan approval | Capture coordinator, review transitions, diary outbox |
| Health metrics | Native adapters, local snapshots, Insights/Profile |
| Profile management | Current hidden Profile route/settings |
| Premium | RevenueCat client and server entitlement authority |
| Complete flow map | Runtime behavior reconstructable; historical report absent |

## 27. Genuine missing implementations

The targeted window contains these genuine implementation gaps:

1. Historical keyboard-aware onboarding behavior.
2. Historical agreement accessibility/tap semantics.
3. Historical Plus/Discover freshness rotation and recently-shown behavior.
4. Historical no-unnecessary-remount request behavior.
5. Complete nutrition state presentation on recipe cards/details.
6. Visible destination for imported workouts, subject to a new product decision.

The first five are direct target-window recovery candidates. The workout
destination is a current disconnected Health edge and must not be confused with
restoring Fitness.

## 28. Partial implementations

| Area | Canonical state |
|---|---|
| Onboarding | Completion/drafts complete; keyboard/agreement semantics partial |
| Coach | Safety complete; fact coverage/retry/observability/device behavior partial |
| Recipes | Domain complete enough to browse; freshness/nutrition partial |
| Health | Steps/energy/weight visible; workout destination missing |
| Reliability | Source safeguards broad; native/live evidence partial |
| User-flow map | Runtime reconstructable; canonical documentation artifact absent |

## 29. Broken/disconnected implementations

### Present but broken

- Plus remount request policy refetches on every mount.
- Discover/Plus freshness remains deterministic and repetitive.

### Present but disconnected

- Health workout snapshots have no rendered destination.

### Not classified as broken

- Smart Scan local propagation is not considered broken in canonical source.
- Coach default-deny and fact restrictions are intentional safety controls.
- Finite provider exhaustion is not fake infinite-scroll failure.

## 30. Superseded implementations

The following are not recovery candidates:

- old Progress navigation and header arrangement;
- old Plus tree/cache implementation;
- guest/free-form unrestricted Coach;
- historical client-owned referral qualification;
- weaker account-isolation logic;
- historical report artifacts as runtime behavior;
- old recipe catalogue and helper modules replaced by current provider/Premium
  architecture.

## 31. Intentionally removed work

The targeted sequence includes older modules and helpers that were removed or
replaced by design:

- old recipe catalogue/helper;
- calorie-gauge helper;
- planner recipe-link helper;
- client referral qualification helper;
- older Coach guest module boundaries;
- report-only artifacts after synchronization.

These are classified `INTENTIONALLY_REMOVED` or
`PRESERVED_BY_NEWER_IMPLEMENTATION`, not missing work.

## 32. Explicit Fitness exclusion

Per the owner's correction, this report does **not** count the following as
missing work or recovery candidates:

- historical Fitness tab;
- historical FitnessScreen;
- historical More/Fitness shell;
- historical `fitness.ts`;
- historical Fitness navigation tests;
- LES MILLS presentation;
- the intentional Fitness/More rollback itself.

The Health section separately notes that workout snapshots are not visibly
surfaced. Any future workout UI must be a new current-product decision, not a
Fitness restoration.

## 33. User-visible differential

| Target-window item | User-visible classification | What a Build 5 user notices |
|---|---|---|
| Onboarding completion/draft | `USER_VISIBLE_AND_PRESERVED` | Completion does not require old branch |
| Keyboard/focus behavior | `USER_VISIBLE_AND_PARTIAL` | Keyboard can obscure active fields |
| Agreement semantics | `USER_VISIBLE_AND_PARTIAL` | Weaker tap/accessibility affordance |
| Coach safety boundary | `USER_VISIBLE_BUT_CHANGED` | Coach is more restricted/dark-gated |
| Coach retry/coverage | `USER_VISIBLE_AND_PARTIAL` | Limited recovery and context |
| Plus pagination | `USER_VISIBLE_AND_PRESERVED` | Cursor/dedup behavior exists |
| Plus remount reload | `USER_VISIBLE_AND_PARTIAL` | Reopening requests again |
| Recipe freshness | `USER_VISIBLE_AND_PARTIAL` | Repeated recipe order |
| Nutrition states | `USER_VISIBLE_AND_PARTIAL` | Inconsistent pending/unavailable fields |
| Smart Scan → Today | `USER_VISIBLE_AND_PRESERVED` | Current source flow is stronger |
| Health metrics | `USER_VISIBLE_AND_CHANGED` | Steps/energy/weight through Profile/Insights |
| Health workouts | `USER_VISIBLE_AND_MISSING` | No visible workout destination |
| Profile/Premium/referrals | `USER_VISIBLE_BUT_CHANGED` | Secondary/embedded access |
| User-flow map | `INTERNAL_ONLY` | Documentation absence only |
| Release-control work | `INTERNAL_ONLY` | Improves evidence, not product UI |

## 34. TARGET-WINDOW MISSING WORK LIST

This list contains only relevant target-window gaps and does not include
Fitness/More rollback, old Progress, unsafe Coach, or deprecated security logic.

### TW-001 — Keyboard-aware onboarding and focus visibility

- **Historical commit:** `cafea90`
- **Historical behavior:** keyboard-aware scroll container, bottom offset,
  extra space, dismissal, padding, focused-input tests.
- **Current behavior:** plain ScrollView; no focused-field visibility strategy.
- **Files:** historical/current `artifacts/calora/app/index.tsx`,
  `artifacts/calora/lib/__tests__/onboardingScreen.test.ts`.
- **Tests:** historical keyboard tests absent from canonical.
- **Why missing:** `cafea90` is not in canonical ancestry.
- **Treatment:** `REIMPLEMENT_CLEANLY`, then `VERIFY_ON_DEVICE_FIRST`.
- **Severity:** P2.

### TW-002 — Agreement accessibility and tap affordance

- **Historical commit:** `cafea90`
- **Historical behavior:** checkbox role/state, required label, test ID,
  checked/unchecked spoken copy, explicit tap-to-agree affordance.
- **Current behavior:** boolean Pressable gate and persistence, weaker semantics.
- **Files:** `app/index.tsx`, onboarding screen tests.
- **Why missing:** historical UX/test change remained on divergent line.
- **Treatment:** `REIMPLEMENT_CLEANLY`.
- **Severity:** P2.

### TW-003 — Plus remount request policy

- **Historical commits:** `614cb39`, `972eafe` lineage.
- **Historical behavior:** retained cards/order/cursor and no unnecessary reload
  while allowing legitimate day/account refresh.
- **Current behavior:** `refetchOnMount: "always"`; visual retention masks a
  request.
- **Files:** `premiumRecipeRefreshPolicy.ts`, Recipes route/tests.
- **Why missing:** closure behavior did not reach canonical ancestry.
- **Treatment:** `REIMPLEMENT_CLEANLY` with request-count tests.
- **Severity:** P2.

### TW-004 — Discover/Plus freshness and rotation

- **Historical commit:** effective closure in `972eafe`; marker `c37b83d`;
  report 18.
- **Historical behavior:** validated day/account seed, stable rotation,
  recently-shown avoidance, provider-order preservation, atomic replacement.
- **Current behavior:** deterministic finite pool/interleaving and provider order
  without meaningful freshness.
- **Files:** premium recipe API/client/catalogue and Recipes route.
- **Why missing:** report 18 implementation is not canonical ancestry.
- **Treatment:** `REIMPLEMENT_CLEANLY`, preserving exhaustion and isolation.
- **Severity:** P2.

### TW-005 — Complete nutrition presentation states

- **Historical commits:** `02b7c67`, `e151ecf`, `408737f`, `972eafe`.
- **Historical behavior:** pending, estimated, unavailable/retry, normalized
  nutrition states with truthful display.
- **Current behavior:** backend nullable/warmup infrastructure survives, but
  cards/detail do not consistently show all fields/states.
- **Files:** nutrition API/provider/client and recipe card/detail surfaces.
- **Why missing:** server work survived more completely than the UI contract.
- **Treatment:** `REIMPLEMENT_CLEANLY`; never fabricate.
- **Severity:** P2.

### TW-006 — Visible workout destination

- **Historical/current evidence:** `94c7cdc`, adjacent `5721854`, current Health
  snapshots.
- **Historical behavior:** Health display investigation included activity/workout
  concepts.
- **Current behavior:** workouts are stored but not rendered; steps/energy/weight
  are visible elsewhere.
- **Files:** Health adapters/types, Profile, Insights.
- **Why missing/disconnected:** no current destination is connected to workout
  snapshot output; Fitness restoration is explicitly excluded.
- **Treatment:** `VERIFY_ON_DEVICE_FIRST` plus a new product decision; not branch
  recovery.
- **Severity:** P2.

## 35. Recovery relevance matrix

| TW ID | Classification | Recovery relevance |
|---|---|---|
| TW-001 | `PARTIALLY_PRESERVED` | `REIMPLEMENT_CLEANLY`, then `VERIFY_ON_DEVICE_FIRST` |
| TW-002 | `PARTIALLY_PRESERVED` | `REIMPLEMENT_CLEANLY` |
| TW-003 | `PRESENT_BUT_BROKEN` | `REIMPLEMENT_CLEANLY` |
| TW-004 | `PRESENT_BUT_BROKEN` | `REIMPLEMENT_CLEANLY` |
| TW-005 | `PARTIALLY_PRESERVED` | `REIMPLEMENT_CLEANLY` |
| TW-006 | `PRESENT_BUT_DISCONNECTED` | `VERIFY_ON_DEVICE_FIRST`; new product decision |
| Smart Scan flow | `PRESERVED_BY_NEWER_IMPLEMENTATION` | `NO_RECOVERY_NEEDED` |
| Coach safety boundary | `PRESERVED_EQUIVALENT` | `DO_NOT_RESTORE` unsafe legacy |
| Coach broad completeness | `PARTIALLY_PRESERVED` | `VERIFY_ON_DEVICE_FIRST` and current-contract review |
| Pagination/entitlement | `PRESERVED_BY_NEWER_IMPLEMENTATION` | `NO_RECOVERY_NEEDED` |
| Progress/Memory navigation | `SUPERSEDED` | `NO_RECOVERY_NEEDED` |
| Reports 17/19 | `DOCUMENTATION_ONLY` | Regenerate only if owner authorizes documentation work |

## 36. Remaining device-verification questions

- Does the canonical onboarding keyboard obscure any active field on small iOS
  and Android screens?
- Do VoiceOver and TalkBack announce agreement state and required semantics?
- Does onboarding completion survive immediate process termination and relaunch?
- Does Smart Scan approval survive offline, background/resume, and date rollover?
- Do HealthKit and Health Connect permissions yield current-day steps, energy,
  weight, and workout snapshots on real devices?
- Where should workouts be shown in the current product, if at all?
- Does Plus reopening issue an unnecessary request on device navigation?
- Does recipe freshness vary correctly across account/day/session boundaries?
- Do nutrition cards communicate pending, partial, unavailable, estimated, and
  verified values without implying zero?
- Do RevenueCat purchase/restore/cancellation and entitlement refresh work in
  the release environment?
- Do notification scheduling, deep links, and auth callback behavior work
  across force-quit and background/resume?
- Does Coach failure/retry behavior remain safe and understandable on device?

## 37. WHAT WAS DONE AROUND THE OWNER'S REMEMBERED PROMPT?

### Immediately before

The repository was completing P1 release/reconciliation work while Coach,
Recipes, Planner, Food Memory, auth links, and API tests were being refined.
Coach work progressed from a direct component to a guest module and tests.

### Prompt/remediation trigger

The post-install prompt led to the broad `53eddce` remediation. That commit
added reports 16 and 17 while changing capture approval, Food Memory, sync,
recipe/provider contracts, Home/Insights/Planner/Recipes/Scan/Coach,
onboarding context, and tests.

### Additional work during the sequence

`972eafe` added report 18 and the recipe freshness closure. `c37b83d` marked
the closure without changing the tree. `22cbe8a` added report 19 and sync
evidence.

### Immediately afterward

Profile management, onboarding keyboard/agreement UX, recipe swipe/list/route
behavior, RevenueCat Premium recipe handling, and bounded Coach Fact Context
consent/integration landed. The repository then changed mission to release
control, native-auth, EAS, signing, and CI.

### Where commits went

The entire sequence remained on the divergent release/agent lineage. None of
the listed target commits is an ancestor of current `origin/main`. Canonical
main preserves key behavior through later implementations and reconciliations,
but not every historical module, test name, or UX detail.

### Pieces that did not reach canonical behaviorally

- keyboard-aware onboarding;
- agreement accessibility/tap semantics;
- recipe freshness/rotation closure;
- no-unnecessary-remount behavior;
- complete nutrition-state presentation.

### Pieces that did reach canonical behaviorally

- onboarding persistence/drafts;
- pagination and entitlement safety;
- Smart Scan approval and Home propagation through newer code;
- bounded Coach safety;
- most recipe, Premium, Profile, sync, and Health metric foundations.

## 38. Exact recommendation for Step 52

Step 52 should begin only after owner review and explicit authorization.

The recommended sequence is:

1. **Reconfirm current contracts and exclusions.** Keep Fitness/More, old
   Progress, unrestricted Coach, fake infinite scroll, fabricated nutrition,
   client-owned security logic, and deprecated APIs excluded.
2. **Reimplement onboarding UX cleanly.** Use current persistence and account
   contracts while adding keyboard/focus behavior and agreement semantics.
3. **Repair recipe behavior.** Define bounded day/account/session freshness,
   fix Plus remount policy, align with provider cursors/exhaustion, and make
   nutrition states explicit.
4. **Decide the Health workout destination.** Do not restore Fitness; decide
   whether and where workouts should be surfaced.
5. **Add focused regression/device gates.** Cover remount request counts,
   Discover variety, nutrition states, native onboarding, Smart Scan restart,
   Health permissions, and Coach failure/retry behavior.
6. **Regenerate missing documentation only if needed.** Reports 17/19 are
   documentation artifacts, not runtime code.

No historical branch should be merged or cherry-picked. The target-window
recovery is limited and should be reimplemented against the canonical
architecture.

### Final questions

**A. What exact development window surrounded the owner's remembered prompt?**  
The defensible expanded window is `0ba0ef5` on 2026-09-07 23:24 UTC through
`2486ae3` on 2026-09-09 13:40 UTC. The core report-16–19 remediation window is
`53eddce` through `22cbe8a`.

**B. How many meaningful product changes occurred in that window?**  
Eighteen meaningful change groups were identified, including pre-prompt Coach,
recipe/Planner/auth context, broad remediation, recipe closure, adjacent
profile/onboarding/recipe/Premium/Coach work, and the relevant Health/Smart
Scan/reliability changes. Six produce genuine target-window gap candidates.

**C. Which occurred immediately before the prompt?**  
Coach guest/lifecycle refactoring, Coach tests/presentation, recipe/Planner
continuity work, saved recipe/Insights changes, auth/deep-link/referral work,
and P1 release/reconciliation closure.

**D. Which were directly caused by the prompt?**  
The broad post-install remediation in `53eddce`, report 16/17, recipe/provider
and capture/sync/test hardening, and the report 18 freshness closure in
`972eafe` are the direct sequence.

**E. Which additional tasks did the agent perform during/after remediation?**  
Profile management/API specification, onboarding keyboard/agreement UX, recipe
swipe/list/route work, RevenueCat Premium enforcement, Coach Fact Context
consent/integration, capture persistence, provider tests, and whole-app
bug-minimization documentation.

**F. Which changes reached canonical main?**  
Equivalent onboarding persistence, pagination, entitlement safety, Smart
Scan/Home propagation, Coach safety, recipe infrastructure, Profile/Premium/
sync, and Health metric foundations reached canonical behavior through newer
implementations.

**G. Which changes did not?**  
The exact keyboard-aware onboarding UX/tests, enhanced agreement semantics,
recipe freshness closure, no-unnecessary-remount behavior, complete nutrition
state UI, and several exact historical test/module boundaries did not.

**H. Which missing changes are visible in Build 5?**  
Onboarding keyboard/agreement behavior, static recipe freshness, Plus remount
requests, ambiguous nutrition states, and the lack of a visible workout
destination. Some native gaps are only potentially visible until device-tested.

**I. Did Step 50 miss relevant prompt-adjacent work because its scope was too
broad?**  
Yes. Step 50 correctly identified the broad Fitness/More history but mixed it
with the narrower remediation sequence. It did not isolate the exact
post-install chronology and therefore overstated broad recovery scope.

**J. Are there lost tests proving additional intended behaviors?**  
Yes. Historical onboarding keyboard/agreement tests, Premium catalogue
same-day/account restore tests, capture persistence tests, Coach client/lifecycle
tests, and some living-memory/header tests are absent by exact filename.
Most behavior has newer coverage; onboarding, remount counts, freshness variety,
and complete nutrition UI states remain important gaps.

**K. Apart from the owner's remembered requirements, what other relevant work
from the same window is missing?**  
The most relevant additional missing pieces are exact Profile/API contract
truthfulness, selected historical test contracts, explicit nutrition UI state
coverage, and the visible workout output edge. The Profile UI and Health
metrics themselves are not missing.

**L. After excluding Fitness and intentionally rolled-back work, how much
genuine recovery remains?**  
Limited recovery remains: five direct UX/data-presentation gaps plus one
Health-workout disconnection requiring a new product decision, with native and
test verification around them. The core Smart Scan, Coach safety, persistence,
pagination, entitlement, and Health metric foundations do not require branch
recovery.

### Final verdict

**TARGETED DEVELOPMENT WINDOW CONTAINS LIMITED UNRECOVERED WORK**

This verdict is limited to the clarified development window and explicitly
excludes the intentional Fitness/More rollback. It is an audit conclusion, not
authorization to implement Step 52.
