# CALORA — Step 54 Final Target-Window Recovery Verification & Release-Candidate Preflight

**Execution date:** 2026-09-17  
**Scope:** Read-only forensic and regression verification  
**Product source changed:** No  
**Functional commit created:** No  
**Build/deploy/database mutation:** None  
**Permitted repository artifact:** This report only

## 1. Executive summary

Canonical `origin/main` was re-fetched and remains the required Step 54
baseline:

- SHA: `f9148dc2070debf7ce944b229caa83b6d8f906f6`
- tree: `4a10536808297bd85933be65941d0df9136f336b`

The canonical source was inspected from an exact temporary export of that SHA.
The local checkout is a divergent historical checkout and was not used for
canonical product conclusions. The temporary export was used only for
dependency installation, typechecking, tests, and source inspection. No
application source was changed.

The five direct Step 51 recovery areas have the following result:

1. Keyboard-aware onboarding: present in canonical source and covered by
   focused source-contract tests; native geometry still requires a device.
2. Agreement semantics: present in canonical source and covered by focused
   source-contract tests; native accessibility announcements still require a
   device.
3. Plus remount behavior: the actual cache policy now treats fresh cache as
   current, revalidates stale cache, disables hidden polling, and preserves
   account/entitlement fencing. The exact provider-request-count behavior is
   source-supported but not directly integration-tested.
4. Discover/Plus freshness: bounded, session-only, account/surface/query/category
   scoped history, stable-ID deduplication, deterministic finite-pool behavior,
   and authoritative pagination are present and tested.
5. Nutrition truthfulness: the main provider recipe/detail/planner path has
   truthful state handling, but the audit found remaining zero coercions in
   AI-estimate parsing and user-created/planner numeric input paths. These can
   turn missing macro input into visible zero values. This is a remaining
   source-level defect and means the direct recovery set is not fully complete.

No P0 or P1 regression was found. The remaining nutrition defects are
classified P2 because they are bounded data-integrity/presentation defects in
explicit estimate or user-entry paths, not an entitlement bypass, account leak,
persistence loss, infinite request loop, or Smart Scan approval regression.

The current supported automated validation passed:

- canonical typecheck;
- Calora tests: 85 files, 1,171 tests;
- Calora server static-security tests: 6/6;
- API server tests: 36 files, 429 passed, 4 skipped;
- scripts tests: 47/47;
- Expo configuration validation;
- release validation evidence for the exact canonical SHA;
- `git diff --check`.

The result is not release-candidate authorization. The source-level nutrition
finding must be reviewed and remediated before the five-target recovery can be
called complete. Physical-device and live-provider verification also remain
required after a future owner-authorized build.

## 2. Canonical SHA/tree

| Item | Required | Observed | Result |
|---|---|---|---|
| `origin/main` SHA | `f9148dc2070debf7ce944b229caa83b6d8f906f6` | `f9148dc2070debf7ce944b229caa83b6d8f906f6` | MATCH |
| `origin/main` tree | `4a10536808297bd85933be65941d0df9136f336b` | `4a10536808297bd85933be65941d0df9136f336b` | MATCH |
| Required Step 53 check | Run release validation suite | Run `35183858934`, check `105081597982` | completed / success |
| Canonical source used for inspection | exact canonical tree | temporary export of required SHA | MATCH |

The canonical mismatch blocker did not apply.

## 3. Evidence reviewed

Primary reports and evidence:

- `49_CALORA_HISTORICAL_REQUIREMENTS_MISSING_WORK_FORENSIC_REPORT.md`
- `50_CALORA_COMPLETE_HISTORICAL_PRODUCT_DELTA_FORENSIC_AUDIT.md`
- `51_CALORA_TARGETED_DEVELOPMENT_WINDOW_MISSING_WORK_FORENSIC_REPORT.md`
- `52_CALORA_CONTROLLED_ONBOARDING_GAP_REMEDIATION_REPORT.md`
- `53_CALORA_CONTROLLED_RECIPE_DISCOVER_PLUS_GAP_REMEDIATION_REPORT.md`
- `53A_CALORA_RECIPE_REMEDIATION_CANONICALIZATION_REPORT.md`
- current canonical source and tests in `artifacts/calora`, `artifacts/api-server`,
  `lib`, and `scripts`;
- current OpenAPI specification, generated Zod schemas, and generated React
  client;
- canonical validation output from the required temporary export;
- beginning and ending Git integrity observations.

Relevant current source areas included onboarding, persistence and hydration,
recipe freshness and nutrition, Plus access, capture review and acceptance,
Food Memory, diary sync, Home, Coach Fact Context, Health adapters, account
storage, referrals, account deletion, and API route registration.

Historical branches and commits were inspected as evidence only. None were
merged, cherry-picked, restored, checked out over canonical main, reset to, or
rebased onto.

## 4. Historical exclusions

Fitness was intentionally rolled back and remains excluded. This audit does not
count any of the following as missing Step 52/53 work and does not recommend
restoring them:

- historical Fitness tab or `FitnessScreen`;
- More/Fitness shell;
- `fitness.ts`;
- Fitness navigation tests;
- LES MILLS presentation;
- the Fitness rollback itself;
- old Progress navigation;
- obsolete More shell;
- unrestricted/free-form legacy Coach;
- weaker historical security;
- client-owned referral qualification;
- deprecated API implementations;
- obsolete recipe helper architecture.

The historical reports 16–19 are not treated as required runtime source. Their
absence from the current tree is documented as unavailable historical evidence,
not as a runtime failure.

## 5. Step 52 verification

Step 52 uses the current onboarding and persistence architecture rather than a
wholesale historical branch restoration.

Verified source behavior:

- onboarding renders `KeyboardAwareScrollViewCompat`;
- native uses `KeyboardAwareScrollView` and web uses the compatibility
  `ScrollView` path;
- safe-area top/bottom spacing is retained;
- `bottomOffset={insets.bottom + 72}` is applied;
- `keyboardShouldPersistTaps="handled"` is applied;
- iOS uses interactive dismissal and Android uses on-drag dismissal;
- stable field IDs exist for name, age, height, current weight, and goal weight;
- agreement state is represented by an affirmative boolean;
- the final action is disabled until agreement is accepted;
- `completeOnboarding(profile, consent)` is awaited before leaving onboarding;
- unfinished drafts and step position are hydrated separately from completed
  onboarding;
- the explicit persistence boundary flushes before React completion state is
  published.

The source and focused tests support the recovery. Native keyboard geometry,
screen-size behavior, and VoiceOver/TalkBack behavior remain device-only
questions.

## 6. Onboarding keyboard verification

**Classification:** `SOURCE_VERIFIED`, `TEST_VERIFIED`,
`DEVICE_VERIFICATION_REQUIRED`

Source evidence:

- `artifacts/calora/app/index.tsx` uses
  `KeyboardAwareScrollViewCompat`;
- `artifacts/calora/components/KeyboardAwareScrollViewCompat.tsx` selects the
  native keyboard-aware implementation outside web;
- `bottomOffset` includes the safe-area inset plus explicit clearance;
- content bottom padding includes the safe-area inset;
- keyboard taps remain usable while the keyboard is open;
- dismissal mode is platform-specific;
- five text fields have stable test IDs.

Focused test evidence:

- `artifacts/calora/lib/__tests__/onboardingScreen.test.ts` checks the wrapper,
  safe-area spacing, bottom offset, tap persistence, platform dismissal, and
  all five stable IDs.

Static evidence cannot prove that the focused lowest field remains visible on
every iOS and Android keyboard, that scrolling feels correct on small screens,
or that the native keyboard controller behaves correctly in a release binary.

## 7. Agreement/consent verification

**Classification:** `SOURCE_VERIFIED`, `TEST_VERIFIED`,
`DEVICE_VERIFICATION_REQUIRED`

Verified:

- first-run state initializes unchecked because `consent` starts from
  `isReviewMode`, which is false for first-run onboarding;
- acceptance is an explicit tap that toggles the boolean;
- the control is a visible `Pressable` card;
- `accessibilityRole="checkbox"` is present;
- `accessibilityState={{ checked: consent }}` is present;
- the accessibility label identifies the agreement as required;
- the accessibility hint explains both unchecked and checked actions;
- `testID="onboarding-consent"` is present;
- the final CTA has a disabled state while consent is false;
- consent is included in the durable completion snapshot;
- there is no source-level consent bypass.

The focused onboarding test checks each of those contracts and also checks
that completion remains on the explicit persistence boundary. Physical
VoiceOver/TalkBack announcements and visual tap affordance still require
device verification.

## 8. Step 53 verification

Step 53 source was traced rather than accepted solely from its report.

Verified current behavior:

- Plus list and detail query keys include the active account scope;
- fresh cache remains available on remount;
- stale cache is eligible for revalidation;
- window-focus and reconnect refetch are disabled;
- no refresh interval or hidden polling was found in the Plus refresh policy;
- query hooks are evaluated before the Plus early-return branches, preserving
  hook order;
- 401/403 transitions clear or deny account-specific premium state;
- entitlement state remains server-authoritative;
- loaded cards remain mounted during pagination and retry;
- pages are merged by stable recipe ID;
- Discover uses server `nextOffset` rather than page length to decide
  continuation;
- terminal provider state remains explicit.

The five direct recovery areas are recorded in the matrix below.

## 9. Plus remount verification

**Classification:** `SOURCE_VERIFIED`, `RECOVERED_SOURCE_ONLY`

`artifacts/calora/lib/premiumRecipeRefreshPolicy.ts` currently specifies:

- `staleTime: 5 * 60_000`;
- `refetchOnMount: true`;
- `refetchOnWindowFocus: false`;
- `refetchOnReconnect: false`;
- `retry: false`;
- no `refetchInterval`.

With the current query policy, a fresh cache is not unnecessarily provider
reloaded merely because the section remounted; a stale cache may revalidate.
The account-scoped query keys and entitlement checks prevent a fresh cache from
becoming an entitlement bypass.

Tests:

- `premiumRecipeRefreshPolicy.test.ts` checks the refresh policy and absence of
  polling;
- `premiumRecipeAccess.test.ts` checks current authorization, stale cache
  denial, and same-account revalidation visibility;
- `premiumRecipeQueryKeys.test.ts` checks account separation and entitlement
  loss removal;
- `recipesScreen.test.ts` checks retained cards, retry, pagination guards, and
  remount scroll behavior.

No direct request-spy integration test proves the exact number of provider
requests across a mount/unmount/remount sequence. That is why this row is not
classified as fully test verified.

## 10. Freshness implementation verification

`artifacts/calora/lib/recipeFreshness.ts` contains the expected bounded design:

- stable identity: trimmed `recipe.id`;
- recent-history limit: `36`;
- TTL: `24 hours`;
- active-session limit: `8` scopes;
- session-only in-memory storage;
- LRU-like scope retention when the active-scope limit is reached;
- expiry pruning before ordering, remembering, and snapshots;
- stable-ID deduplication for initial and appended pages;
- separate scope strings built from account, surface, search, and category;
- Discover and Plus use separate surface scopes;
- deterministic rotation of already-seen finite pools;
- no recipe fabrication or ID rewriting.

The relevant current screen uses:

`getRecipeFreshnessSession(account + surface + search + category)`
→ `beginVisit()`
→ `order(loadedRecipes, visit)`
→ `remember(shownRecipes)`.

Small or exhausted pools return the available unique provider records in a
deterministic order. They do not cause unbounded calls or fabricate additional
recipes. Provider exhaustion remains represented by `nextOffset: null` and
`terminalReason` where returned by the API.

## 11. Bounded-history verification

**Result:** source verified and unit-test verified.

`RecipeFreshnessSession` bounds each scope to 36 recent IDs, expires entries at
24 hours, and limits the global in-memory scope map to eight active scopes.
`clearRecipeFreshnessSessions()` can clear all session state. No freshness
history is written to durable storage.

`recipeFreshness.test.ts` verifies:

- stable-ID deduplication independent of image URL;
- page merge deduplication;
- finite-pool deterministic rotation;
- bounded recent history behavior;
- expiry behavior.

The account is part of the caller-provided scope. The source is account-safe,
but there is no standalone unit test that creates two account scopes and proves
their histories cannot affect each other. The query-key tests do prove account
separation for Plus cache data.

## 12. Nutrition-state verification

The main remote recipe/detail path now distinguishes:

- `available`;
- `loading`;
- `unavailable`;
- `error`.

Source evidence:

- `isFiniteNutritionValue` rejects `undefined`, `null`, `NaN`, and infinities;
- `formatRecipeNutrition` renders unknown values as `—`;
- finite provider zero remains `0`;
- partial nutrition is identified by `hasCompleteNutrition`;
- detail cards show loading, unavailable, error, and partial notices;
- planner insertion refuses incomplete nutrition;
- diary scaling preserves nulls instead of converting unknown macros to zero;
- provider failures return unavailable/pending state rather than fabricated
  values.

Focused tests:

- `recipeNutrition.test.ts` checks finite zero, unknown display, loading,
  error, and incomplete nutrition;
- recipe model tests preserve nutrition provenance;
- API recipe tests cover null preservation, normalization, warm-up, pending,
  and error behavior;
- planner tests cover incomplete-input handling.

Remaining source-level defects found during this audit:

1. In `artifacts/api-server/src/routes/recipes.ts`, `estimateNutrition`
   parses missing AI macro fields with `Number(value) || 0`. If an AI response
   contains positive calories but omits a macro, that missing macro becomes a
   visible zero instead of unavailable.
2. In `artifacts/calora/app/(tabs)/recipes.tsx`, `CreateRecipeModal` maps blank
   user-created protein, carbohydrate, or fat fields through
   `Number(value) || 0`. The recipe is then labeled user-entered, but the
   source does not distinguish intentional zero from omitted input.
3. In `artifacts/calora/app/(tabs)/planner.tsx`, the planner edit/custom-entry
   path uses `?? 0` after parsing nutrition fields. Blank macro input can
   therefore become a zero-valued planner record.

These paths are not silently converting an authoritative measured provider zero;
they are converting missing estimate/user input. They still violate the
required “unknown is not zero” contract and must not be described as fully
recovered.

## 13. Pagination preservation

Pagination remains source and test verified:

- Discover and Plus maintain explicit offsets;
- server `nextOffset` controls continuation;
- `terminalReason` remains available in the API contract;
- single-flight loading guards prevent rapid-scroll request fan-out;
- stable-ID merge prevents duplicate cards;
- retained page data remains visible during append loading;
- retry is explicit after errors;
- finite provider pools terminate truthfully.

The current compatibility contract test checks `nextOffset` and
`terminalReason` in OpenAPI, generated Zod, and mobile consumption. API recipe
tests cover provider pagination and terminal behavior.

## 14. Premium/RevenueCat preservation

Premium access remains server/provider authoritative:

- the Plus catalogue is account-scoped;
- a populated cache is not access proof after a new entitlement check;
- stale or not-yet-revalidated access is hidden;
- 401/403 removes or denies account-specific premium data;
- saved premium recipes are account-aware;
- RevenueCat entitlement checks use current provider entitlement records;
- restore/purchase wiring remains in the existing RevenueCat integration;
- no client-only premium grant or cache bypass was introduced.

Source/unit tests cover access state, query keys, entitlement loss, saved recipe
separation, RevenueCat handling, and account-scoped behavior. Purchase,
restore, expiration, and provider outage behavior still require live-provider
and physical-device verification.

## 15. Account isolation

Current account isolation evidence includes:

- account-scoped local persistence keys;
- guest and authenticated scopes separated;
- prior account state not hydrated into a new account;
- account switch resets in-memory sync bookkeeping;
- diary sync keys and mutation ledgers scoped by account;
- Plus query and detail keys scoped by account;
- Coach request epochs capture account identity and hydration generation;
- Coach consent is account-scoped and cleared on account changes;
- server routes use authenticated account identity and account predicates;
- account deletion has a server-side ownership/deletion fence;
- server sync uses account-owned mutation and tombstone records.

`accountStorage.test.ts`, auth/sign-out tests, diary sync tests, Coach lifecycle
tests, API tenant-isolation tests, sync tests, and account-deletion tests passed.

The API still uses a shared privileged database pool and therefore does not
provide database-level tenant isolation. Current application predicates and
tests are the active boundary; this is a known architecture constraint, not a
new Step 52/53 regression.

## 16. Smart Scan → Home trace

The current canonical path is:

```text
capture
→ analysis
→ review/edit
→ explicit approval
→ Food Memory/local diary
→ nutrition snapshot/provenance
→ durable diary outbox
→ persistence flush
→ Home Today
→ authenticated retryable sync
```

Source trace:

1. `scan.tsx` captures photo, library, barcode, receipt, label, text, or voice
   input and calls the authenticated capture analysis path.
2. Analysis becomes a local Food Memory draft with review status.
3. The review state machine supports edits, rejection, partial consumption,
   provenance, confidence, assumptions, and review questions.
4. Only explicit approval calls the acceptance path.
5. `captureReviewTransitions.ts` creates the accepted `FoodLog` and accepted
   Food Memory record with linked IDs and a nutrition snapshot.
6. The acceptance coordinator stages the complete state and waits for the
   persistence flush.
7. The local context publishes the accepted log and queues a diary outbox
   mutation.
8. Home derives Today from the same account-scoped local logs.
9. `diarySync.ts` retries authenticated outbox synchronization, handles
   idempotency/conflicts, and preserves the local log when remote sync fails.

Tests:

- `captureReview.test.ts` verifies review, explicit approval, rejection without
  diary insertion, nutrition, provenance, image metadata, and Food Memory links;
- `captureAcceptanceCoordinator.test.ts` verifies durable acceptance ordering;
- `captureAcceptancePersistence.test.ts` verifies immediate remount after
  flush;
- `foodMemory.test.ts` verifies accepted memory behavior;
- `diarySync.test.ts` verifies idempotency, account scope, retry, conflict,
  deletion, and permanent rejection;
- Home tests verify Today and local action behavior.

Offline, camera permission, real provider analysis, process-kill timing,
cross-device timing, and near-midnight behavior remain
`DEVICE_VERIFICATION_REQUIRED`.

## 17. Coach safety verification

The bounded Coach Fact Context boundary remains intact:

- server rollout is default-deny;
- current consent is required and purpose/version scoped;
- facts are drawn from an allowlist;
- raw user-entered names, IDs, timezone, and broad metadata are not exported;
- request context has short expiry;
- request/history bounds remain enforced;
- account, hydration generation, consent, and nonce fencing reject stale
  responses;
- clear-data and account changes invalidate pending work;
- malformed, timed-out, denied, or unavailable responses fail closed;
- allowed navigation destinations are allowlisted;
- the legacy unrestricted Coach path is not restored.

Tests:

- `coachFactContext.test.ts`;
- Coach consent and activation coordinator tests;
- Coach request lifecycle and send adapter isolation tests;
- server Coach, consent, rollout, and pending-rollback tests.

Remaining runtime questions include native keyboard/rendering, offline retry UX,
provider latency, and live rollout/consent state. These are not missing
permission to restore unrestricted Coach.

## 18. Health verification

Current canonical Health behavior is read-only and local/native:

- iOS reads HealthKit steps, active energy, body mass, and workouts;
- Android reads Health Connect steps, active calories, weight, and exercise
  sessions;
- local-day ranges are used consistently;
- active energy uses explicit kcal units;
- measured zero is distinct from missing data;
- HealthKit read authorization is not inferred from request completion;
- permission, partial access, denied, unavailable, syncing, and error states
  remain distinct;
- connection and snapshots persist locally;
- hydration, foreground, and local-day transitions can trigger sync;
- weight and energy feed current Progress/Home surfaces;
- imported workouts may remain stored without a current visible workout
  destination.

Workout snapshots without a visible destination are explicitly not a Step 54
blocker. Fitness remains excluded and no workout UI was added.

Tests:

- `healthConnection.test.ts`;
- `healthDayAndBurnedStatus.test.ts`;
- Health adapter and state tests in the canonical Calora suite.

Native permissions, populated HealthKit/Health Connect records, OS settings,
denied permission behavior, and release-binary provider behavior require
physical-device verification.

## 19. Preserved historical capabilities

The current implementation preserves the important target-window behaviors
listed by the owner. The detailed matrix appears in Section 20.

Notable preservation decisions:

- onboarding completion and draft resumption remain in the current persistence
  architecture;
- Smart Scan approval remains explicit and durable;
- Food Memory coexists with legacy diary logs and preserves nutrition snapshots;
- Home Today reads local approved logs;
- recipe pagination uses newer cursor/terminal behavior;
- premium entitlement remains authoritative;
- Coach remains restricted rather than reverting to legacy free-form behavior;
- Health remains local/native and read-only;
- Progress/Insights and Memory remain the newer architecture;
- referrals and account deletion remain server-authoritative;
- account-scoped sync remains the active cross-device boundary.

## 20. Lost-test-contract reconciliation

| Historical lost contract | Current classification | Current evidence |
|---|---|---|
| Keyboard-aware focused-field visibility | `RECOVERED_EQUIVALENT_TEST` | `onboardingScreen.test.ts` checks wrapper, offset, safe-area padding, dismissal, and tap behavior |
| Agreement checkbox role/state/tap copy | `RECOVERED_EQUIVALENT_TEST` | focused onboarding test checks role, checked state, label, hint, test ID, and CTA gate |
| Durable onboarding completion boundary | `RECOVERED_BY_STRONGER_TEST` | source test checks awaited completion; persistence/integration tests cover hydration and clear boundaries |
| Plus fresh-cache remount behavior | `RECOVERED_SOURCE_ONLY` | policy and query-key tests exist; no direct provider request-count integration test |
| Plus account/entitlement cache separation | `RECOVERED_BY_STRONGER_TEST` | account-scoped query-key and access-state tests |
| Discover recently-shown bounded history | `RECOVERED_EQUIVALENT_TEST` | freshness tests cover stable IDs, finite-pool order, limit behavior, and TTL |
| Discover account/scope separation | `STILL_MISSING_TEST` | source scope includes account/surface/query/category; no two-account freshness-session test |
| Stable-ID deduplication | `RECOVERED_EQUIVALENT_TEST` | freshness unit tests and screen source assertions |
| Provider exhaustion and terminal pagination | `RECOVERED_BY_STRONGER_TEST` | API/provider compatibility tests and `nextOffset`/`terminalReason` contract tests |
| Nutrition available/loading/unavailable/error | `RECOVERED_EQUIVALENT_TEST` | `recipeNutrition.test.ts` plus API and screen source evidence |
| Unknown-not-zero | `STILL_MISSING_TEST` | helper tests protect null display, but source audit found AI/user/planner zero coercions |
| Partial nutrition | `RECOVERED_SOURCE_ONLY` | complete-nutrition helper and notice exist; no full rendered-card test proves every partial state |
| Capture acceptance persistence | `RECOVERED_BY_STRONGER_TEST` | current coordinator, review, outbox, and immediate-remount tests |
| Bounded Coach Fact Context | `RECOVERED_BY_STRONGER_TEST` | allowlist, consent, TTL, and lifecycle-fencing tests |
| Guest/account Coach isolation | `RECOVERED_EQUIVALENT_TEST` | account storage, consent cache, and adapter isolation tests; device proof remains outstanding |
| Historical Living Memory header filename | `OBSOLETE_TEST` | current Memory/Insights architecture supersedes the old exact header contract |

Historical filenames do not need to return. The classification concerns the
behavioral contract, not filename restoration.

## 21. Current test-contract matrix

| Contract | Current evidence | Classification |
|---|---|---|
| Onboarding keyboard-aware container | source plus focused test | `RECOVERED_BY_STRONGER_TEST` |
| Onboarding agreement semantics | source plus focused test | `RECOVERED_BY_STRONGER_TEST` |
| Plus remount request behavior | refresh policy and source; no request spy | `RECOVERED_SOURCE_ONLY` |
| Freshness boundedness | `recipeFreshness.test.ts` | `RECOVERED_EQUIVALENT_TEST` |
| Freshness account/scope isolation | account included in source scope; no direct freshness isolation test | `STILL_MISSING_TEST` |
| Stable-ID deduplication | freshness and screen tests | `RECOVERED_EQUIVALENT_TEST` |
| Provider exhaustion | API recipe/provider tests and terminal contract tests | `RECOVERED_BY_STRONGER_TEST` |
| Nutrition available state | pure nutrition state test | `RECOVERED_EQUIVALENT_TEST` |
| Nutrition loading state | pure nutrition state test and screen source | `RECOVERED_EQUIVALENT_TEST` |
| Nutrition unavailable state | pure nutrition state test and screen source | `RECOVERED_EQUIVALENT_TEST` |
| Nutrition error state | pure nutrition state test and screen source | `RECOVERED_EQUIVALENT_TEST` |
| Unknown is not zero | source/helper coverage is incomplete; zero coercions remain | `STILL_MISSING_TEST` |
| Partial nutrition | helper and source notice; no rendered-card integration test | `RECOVERED_SOURCE_ONLY` |

## 22. Full current user-flow map

| Flow | Classification | Current evidence and remaining boundary |
|---|---|---|
| Fresh install | `SOURCE_VERIFIED` | empty account scope, hydration, starter display state; native install still required |
| Onboarding | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | keyboard, draft, consent, CTA, completion boundary |
| Sign in | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | Supabase/PKCE routes and auth tests; live auth provider remains |
| Signed-out/guest behavior | `SOURCE_VERIFIED`, `TEST_VERIFIED` | guest scope and local-first use; provider-backed actions may require sign-in |
| Home | `SOURCE_VERIFIED`, `TEST_VERIFIED` | Today/local logs, planner peek, health action, scan navigation |
| Manual food logging | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | local log/outbox path; native modal and keyboard remain |
| Smart Scan | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | capture/review/approval source and tests; camera/provider live behavior remains |
| Food Memory | `SOURCE_VERIFIED`, `TEST_VERIFIED` | accepted memories, links, forget/undo, immutable snapshots |
| Diary | `SOURCE_VERIFIED`, `TEST_VERIFIED` | local diary and outbox; cross-device live sync remains |
| Discover | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | freshness/pagination source and tests; provider pool/cardinality remains |
| Plus | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | entitlement/cache/pagination; purchase and provider behavior remain |
| Recipe detail | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | stateful nutrition and diary/planner actions |
| Saved recipe | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | local/premium separation; live entitlement remains |
| Recipe → Planner | `SOURCE_VERIFIED`, `TEST_VERIFIED` | explicit nutrition guard and slot replacement |
| Planner | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | local week context, edits, custom insertion, acknowledgments |
| Weekly Programs | `SOURCE_VERIFIED`, `TEST_VERIFIED` | current modal/state-machine implementation |
| Shopping list | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | planner/recipe-derived local list and modal behavior |
| Insights/Progress | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | current Insights architecture, Memory, wellness and Health signals |
| Coach | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | bounded Fact Context and fencing; native/live rollout remain |
| Profile | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | local profile/settings and Health controls; stale generated profile API is separately reported |
| Health | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | adapter/state contracts; real OS permissions/data remain |
| Premium/paywall | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | RevenueCat wiring and access gates |
| RevenueCat restore | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | restore code/tests; App Store/RevenueCat behavior remains |
| Referrals/deep links | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | universal links, referral authority, and concurrency tests |
| Logout | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | account scope clear/sign-out and notification lifecycle |
| Account switching | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | persistence, diary, Coach, Plus scopes; native session timing remains |
| Account deletion | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `LIVE_PROVIDER_VERIFICATION_REQUIRED` | server deletion fence and RevenueCat/Supabase paths; live provider erasure remains |
| Relaunch/hydration | `SOURCE_VERIFIED`, `TEST_VERIFIED`, `DEVICE_VERIFICATION_REQUIRED` | hydration guard, retry, persistence; force-kill/relaunch remains |

No current flow was classified `BROKEN` or `MISSING` solely from the source/test
audit. The nutrition source defects and stale API documentation are recorded
as findings rather than silently omitted.

## 23. OpenAPI/client/server contract drift audit

The current contract layers are not fully synchronized.

### Confirmed stale profile/weight contract

`lib/api-spec/openapi.yaml` documents:

- `GET /v1/profile`;
- `PUT /v1/profile`;
- `GET /v1/weights`;
- `POST /v1/weights`.

`lib/api-client-react/src/generated/api.ts` contains generated operations for
those paths. The current API route registration has no profile route file and no
weight route file, and `artifacts/api-server/src/routes/index.ts` registers no
routes for those paths. The current mobile product uses local Calora context for
profile and weight state rather than these generated operations.

**Classification:** stale documented/generated contract  
**Severity:** P2 contract drift; P1 only if a released client is confirmed to
call the absent endpoints  
**Step 54 action:** none; this audit is verification-only

### Diary and sync

The current server registers `/v1/diary` and `/v1/sync`. OpenAPI, generated
schemas/client, mobile `diarySync.ts`, and server routes agree on the active
sync path. Current local-first diary behavior intentionally uses `/v1/sync`
for outbox reconciliation; the direct diary routes remain part of the server
contract.

### Capture, recipe, planner, Coach, referral, and premium

The compatibility contract test confirms the released mobile source consumes
current routes for capture analysis/approval, open and premium recipes,
restaurant foods, planner generation, Fact Context, sync, and referral paths.
OpenAPI/generated Zod fields include recipe `nextOffset` and `terminalReason`.

No current source/test evidence shows a drift in those audited active paths.

## 24. Full test results

Validation was run against the exact canonical temporary export after
`pnpm install --frozen-lockfile`:

| Validation | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/scripts test` | PASS — 47/47 |
| `pnpm --filter @workspace/calora test` | PASS — 85 files, 1,171 tests |
| Calora server static-security tests | PASS — 6/6 |
| API server test suite | PASS — 36 files, 429 passed, 4 skipped |
| Expo config validation | PASS — `CaloraApp`, `calora`, version `1.0.0`, iOS/Android/web |
| `git diff --check` | PASS |
| Required Step 53 release validation evidence | PASS — run `35183858934`, check `105081597982` |

No failing test was skipped, deleted, weakened, or changed to force green.
The initial API/scripts setup failures in the temporary export were caused by
missing temporary Git metadata and missing temporary API build output; after
those validation prerequisites were supplied in `/tmp`, the source validation
passed. No workspace source or generated product artifact was changed.

## 25. Typecheck

`pnpm run typecheck` passed against the canonical export.

This included the workspace library declarations and the Calora/API/scripts
TypeScript projects. No type errors were suppressed or repaired during Step 54.

## 26. Security tests

Passed security-relevant validation includes:

- Calora server static asset security: 6/6;
- API CORS and origin policy tests;
- API auth/session tests;
- API tenant-isolation predicate tests;
- account-deletion fence tests;
- capture approval and server-issued session validation;
- diary/sync account ownership and tombstone tests;
- Coach consent, rollout, allowlist, bounded output, and lifecycle tests;
- referral concurrency and server-authoritative qualification tests;
- RevenueCat entitlement and erasure handling tests.

The shared privileged database pool's lack of database-level tenant RLS remains
an architectural constraint already documented by prior audits. It is not a
new Step 54 regression.

## 27. Expo/config verification

Canonical Expo configuration validation passed and resolved:

- application name: `CaloraApp`;
- slug: `calora`;
- version: `1.0.0`;
- iOS configuration;
- Android configuration;
- web configuration.

No iOS or Android build was started. No native binary, TestFlight submission,
App Store submission, deployment, or publish operation was performed.

## 28. `git diff --check`

Result: **PASS**.

The canonical commit tree also passed `git diff-tree --check`. No whitespace
error was introduced by the verification work.

## 29. Beginning/end Git integrity

### Beginning

- `origin/main` SHA: `f9148dc2070debf7ce944b229caa83b6d8f906f6`
- `origin/main` tree: `4a10536808297bd85933be65941d0df9136f336b`
- workspace tracked status: clean
- only pre-existing untracked item: the owner-provided Step 54 attachment
- tracked application-source worktree diff: `NONE`
- cached application-source diff: `NONE`

### End

- `origin/main` SHA: `f9148dc2070debf7ce944b229caa83b6d8f906f6`
- `origin/main` tree: `4a10536808297bd85933be65941d0df9136f336b`
- workspace tracked status: unchanged
- application-source worktree diff: `NONE`
- cached application-source diff: `NONE`
- `git diff --check`: PASS

The only new repository artifact from this task is
`54_CALORA_FINAL_TARGET_WINDOW_RECOVERY_VERIFICATION_REPORT.md`.

## 30. Confirmation application source unchanged

Confirmed:

- no application source file was edited;
- no API source file was edited;
- no schema, migration, seed, or database object was changed;
- no functional commit was created;
- no product source was pushed;
- no historical branch was merged or restored;
- temporary dependencies, Git metadata, and API build output remained under
  `/tmp/calora-step54-canonical`.

## 31. Remaining source-level defects

### P2-S54-01 — AI estimate missing macros become zero

`artifacts/api-server/src/routes/recipes.ts` uses `Number(parsed.field) || 0`
for AI nutrition fields. A response with valid positive calories but a missing
macro can be persisted and shown with that macro as zero. The source should
preserve unknown fields as unavailable rather than treating omission as a
measured zero.

### P2-S54-02 — User-created recipe blank macros become zero

`CreateRecipeModal` in `artifacts/calora/app/(tabs)/recipes.tsx` requires
calories but allows blank protein/carbohydrate/fat fields and maps them to
zero. Because the recipe is explicitly user-created, this is not an
authoritative provider claim, but it still collapses omitted input into a
visible zero and can enter the diary/review path.

### P2-S54-03 — Planner blank macro input becomes zero

The custom/edit planner path in
`artifacts/calora/app/(tabs)/planner.tsx` uses `?? 0` for parsed macro values.
Blank or otherwise unavailable macro input can therefore be stored as a
zero-valued planner record.

### P2-S54-04 — OpenAPI/generated profile and weight operations are stale

The OpenAPI/generated client contract exposes profile and weight operations
that have no matching current server route registration. Current mobile source
uses local-first profile/weight state, so this was not observed as an active
runtime failure in the current tests. It remains a contract maintenance defect.

## 32. Remaining device-only questions

The following cannot be proven by source or unit tests:

- iOS and Android keyboard geometry for every onboarding field;
- safe-area clearance on small screens;
- keyboard-open Back/Continue behavior;
- VoiceOver and TalkBack announcement of consent role/state/hint;
- onboarding completion after force-close and immediate relaunch;
- native camera and photo-library permissions;
- Smart Scan analysis/review/approval on a real phone;
- offline capture and resume after backgrounding;
- process-kill recovery of local draft/outbox state;
- Home Today update timing after native capture approval;
- Plus leave/return card retention and request count in a binary;
- Discover visual freshness and terminal UI state;
- recipe detail partial nutrition layout;
- planner and shopping modal behavior;
- RevenueCat purchase/restore/expiration UI;
- Supabase auth callback and deep-link behavior;
- notification scheduling, inbox, and date rollover;
- Coach keyboard, background/resume, timeout, retry, and account switch;
- iOS HealthKit and Android Health Connect permissions and real records;
- weight, active energy, steps, and denied-permission display;
- logout/account-switch timing across native lifecycle events.

These are `DEVICE_VERIFICATION_REQUIRED`, not claims of failure.

## 33. Remaining live-provider questions

The following require controlled live-provider verification:

- Supabase sign-in, verification, recovery, PKCE callback, and account switch;
- TheMealDB inventory, category cardinality, stable identity, and terminal
  exhaustion;
- any premium recipe provider inventory, pagination, and nutrition response;
- OpenAI recipe and nutrition estimate response completeness and timeout paths;
- RevenueCat entitlement, purchase, restore, expiration, and customer erasure;
- capture analysis provider responses and server-issued capture-session approval;
- API deployment identity and production runtime route set;
- server diary/sync behavior across two authenticated devices;
- server account deletion and provider-side erasure;
- universal-link and app-link association behavior.

No live-provider result is inferred from mocked/unit tests.

## 34. P0/P1/P2 findings

### P0

**None found.**

No catastrophic data-loss, authentication bypass, entitlement bypass, cross-
account leak, or release-integrity failure was found.

### P1

**None found in this verification.**

The automated release validation, typecheck, API suite, security suite, and
current account-scoping tests passed. Smart Scan persistence, onboarding
completion ordering, Coach fencing, and Premium authorization remained
source/test protected.

### P2

- P2-S54-01: AI estimate missing macro coercion;
- P2-S54-02: blank user-created macro coercion;
- P2-S54-03: blank planner macro coercion;
- P2-S54-04: stale OpenAPI/generated profile and weight operations;
- physical-device evidence gaps listed in Section 32;
- live-provider evidence gaps listed in Section 33;
- direct Plus remount request-count test gap;
- direct two-account freshness-session isolation test gap;
- rendered partial-nutrition UI integration-test gap.

The first three P2 findings are why R-05 is only partially recovered.

## 35. Physical-device master checklist

Run on both iOS and Android after an owner-authorized future build. Mark each
item PASS/FAIL with device model, OS version, build identity, date, and evidence.

### Onboarding

- Fresh install starts at onboarding.
- Focus the first, middle, and lowest text fields.
- Open the keyboard for each relevant field.
- Lowest field remains visible above the keyboard.
- Scroll while the keyboard is open.
- Continue works with the keyboard open.
- Back/forward preserves entered values.
- Agreement begins unchecked on first run.
- Agreement card is visibly tappable.
- Agreement checked state is visible and announced.
- Final CTA remains disabled before agreement.
- Final CTA enables after agreement.
- Finish onboarding.
- Force-close immediately after completion.
- Reopen and verify onboarding does not restart.
- Test an iOS small-screen profile comparable to iPhone XR.
- Test an Android small-screen profile with the software keyboard visible.

### Discover

- Initial provider recipes load.
- Leave and return to Discover.
- Freshness changes between visits when eligible provider records exist.
- No duplicate stable recipe IDs appear.
- Pagination loads one page at a time.
- Terminal provider state is visible and does not loop.
- Nutrition available state is clear.
- Nutrition loading state is clear.
- Nutrition unavailable state is clear.
- Nutrition error and retry state is clear.

### Plus

- Premium account receives Plus access.
- Leave and return to Plus.
- Existing fresh cards remain without unnecessary reload.
- Stale data revalidates.
- Pagination remains bounded.
- Entitlement loss hides protected data.
- Restore updates access correctly.
- Signed-out or denied account cannot view protected cached data.

### Smart Scan

- Camera permission.
- Camera capture.
- Analysis response.
- Review screen.
- Edit candidate values.
- Reject does not create a diary entry.
- Approve creates the intended entry.
- Approved meal appears in Food Memory.
- Approved meal appears in Home Today.
- Offline behavior.
- Resume after backgrounding.
- Process kill and relaunch.

### Coach

- Consent required before use.
- Only allowed facts appear.
- Missing facts are described safely.
- Provider failure is safe.
- Timeout is safe.
- Retry behavior is clear.
- Account switch cannot show prior history or response.
- Background/resume does not accept stale response.

### Health

- Permission request and partial permission.
- Steps.
- Active energy.
- Weight.
- Denied permission.
- Unavailable provider.
- Sync error and retry.
- Relaunch and local snapshot behavior.
- iOS HealthKit and Android Health Connect separately.

### Premium

- Purchase.
- Restore.
- Expiration/cancellation.
- Account switch.
- Provider outage.

### System

- Universal/deep links.
- Auth callback.
- Notifications and in-app inbox.
- Background/resume.
- Force quit.
- Local date rollover and timezone boundary.

## 36. Release-candidate readiness

Canonical main is **not authorized** for the next controlled release-candidate
build from this Step 54 audit.

The block is not caused by a P0/P1 regression or by the device-only questions.
It is caused by the remaining source-level nutrition truthfulness findings:
R-05 is not fully recovered because missing AI/user/planner macro values can
still become visible zero values. The stale generated profile/weight contract
should also be reconciled before relying on that contract for a future release.

No build was started. No iOS or Android build, TestFlight submission, App Store
submission, deployment, Replit publish, database mutation, migration, schema
change, or seed change was performed.

## 37. Exact recommendation for Step 55

Do not start Step 55. Owner review should first authorize a narrowly scoped
follow-up that:

1. preserves unknown nutrition as unavailable across AI estimate parsing,
   user-created recipe inputs, and planner custom/edit inputs;
2. adds regression tests for unknown-not-zero and complete/partial nutrition
   through recipe → diary/planner paths;
3. reconciles or explicitly retires the stale OpenAPI/generated profile and
   weight operations;
4. adds the missing direct Plus request-count and two-account freshness
   isolation tests;
5. then repeats the physical-device and live-provider checklists.

No remediation was implemented in Step 54.

## Mandatory recovery matrix

| Recovery ID | Step 51 gap | Step implemented | Current source evidence | Current test evidence | Status | Device verification required? |
|---|---|---|---|---|---|---|
| R-01 | Keyboard-aware onboarding | Yes | `KeyboardAwareScrollViewCompat`, safe-area padding, bottom offset, platform dismissal, stable IDs | focused onboarding source-contract tests | `RECOVERED_AND_VERIFIED` | Yes |
| R-02 | Agreement semantics | Yes | unchecked first run, affirmative tap, checkbox role/state/label/hint, stable ID, gated CTA, durable consent | focused agreement and completion-boundary tests | `RECOVERED_AND_VERIFIED` | Yes |
| R-03 | Plus remount behavior | Yes | fresh cache retained, stale revalidation, account keys, 401/403 removal, no polling | policy/access/query-key/screen tests; no direct request-count test | `RECOVERED_SOURCE_ONLY` | Yes |
| R-04 | Discover/Plus freshness and rotation | Yes | 36 IDs, 24-hour TTL, 8 scopes, session-only, scoped histories, stable-ID dedupe, deterministic exhaustion | freshness, pagination, compatibility, and screen tests | `RECOVERED_AND_VERIFIED` | Yes |
| R-05 | Truthful/complete nutrition states | Partial | main state helper/detail/planner guard is truthful, but AI/user/planner blank values still coerce to zero | state tests pass; unknown-not-zero path remains uncovered | `PARTIALLY_RECOVERED` | Yes |

## Mandatory historical-preservation matrix

| Capability | Classification | Evidence / boundary |
|---|---|---|
| Onboarding persistence | `PRESERVED_BY_NEWER_IMPLEMENTATION` | explicit flush before completion state/navigation |
| Onboarding drafts | `PRESERVED_EQUIVALENT` | account-scoped draft and step hydration |
| Smart Scan approval | `PRESERVED_EQUIVALENT` | explicit review acceptance state machine |
| Food Memory | `PRESERVED_BY_NEWER_IMPLEMENTATION` | accepted memory ledger plus legacy diary compatibility |
| Diary outbox | `PRESERVED_BY_NEWER_IMPLEMENTATION` | durable outbox, retry, conflict and tombstone behavior |
| Home Today propagation | `PRESERVED_EQUIVALENT` | Home derives from accepted local logs |
| Recipe pagination | `PRESERVED_BY_NEWER_IMPLEMENTATION` | `nextOffset`, terminal reason, dedupe, single-flight |
| Provider exhaustion | `PRESERVED_BY_NEWER_IMPLEMENTATION` | finite pools and terminal API responses |
| Premium entitlement | `PRESERVED_BY_NEWER_IMPLEMENTATION` | server/provider-authoritative access |
| Coach safety | `PRESERVED_BY_NEWER_IMPLEMENTATION` | bounded, consented, default-deny Fact Context |
| Health steps | `PRESERVED_BY_NEWER_IMPLEMENTATION` | local/native adapter snapshots |
| Health energy | `PRESERVED_BY_NEWER_IMPLEMENTATION` | explicit kcal and measured-zero handling |
| Health weight | `PRESERVED_BY_NEWER_IMPLEMENTATION` | local weight snapshots and trend surface |
| Profile | `PRESERVED_BUT_CHANGED` | local-first profile architecture; stale generated API contract remains |
| Referrals | `PRESERVED_BY_NEWER_IMPLEMENTATION` | server-authoritative qualification and concurrency handling |
| Account deletion | `PRESERVED_BY_NEWER_IMPLEMENTATION` | deletion fence, provider erasure, recovery state |
| Account-scoped sync | `PRESERVED_BY_NEWER_IMPLEMENTATION` | account-keyed local state and server predicates |

## Final questions

**A. Are all five direct Step 51 recovery targets now present in canonical
main?**  
No. R-01 through R-04 are present. R-05 is only partially recovered because
three source paths still coerce unknown macro input to zero.

**B. Did Steps 52/53 accidentally regress any newer canonical behavior?**  
No regression was found in onboarding persistence, Smart Scan approval,
account isolation, Coach safety, Health state handling, pagination, or
Premium entitlement. The remaining nutrition coercions are incomplete
truthfulness recovery, not evidence of a Step 52/53 regression in those other
systems.

**C. Is Plus unnecessary remount reload fixed in actual source?**  
Yes, at source-policy level. Fresh cache is current within the configured
stale window; stale cache revalidates; hidden polling is disabled. A direct
request-count integration test is still missing.

**D. Is Discover/Plus freshness bounded and account-safe?**  
Yes at source level. History is session-only, capped at 36 IDs per scope,
expires after 24 hours, and caps active scopes at eight. Account, surface,
query, and category are included in the caller scope. A dedicated two-account
freshness-session test is still missing.

**E. Can unknown nutrition still be silently converted to zero anywhere in the
relevant recipe → diary/planner path?**  
Yes. The main remote recipe state path preserves unknowns, but AI estimate
parsing, blank user-created recipe macro fields, and planner blank macro fields
still contain zero coercions.

**F. Did Step 52 preserve durable onboarding completion?**  
Yes at source and automated-test level. Completion is enqueued and flushed
before completion state is published/navigation proceeds. Immediate native
process-kill verification remains required.

**G. Does Smart Scan still propagate approved meals to Home Today?**  
Yes at source and test level. Explicit approval creates the local log, Food
Memory, nutrition snapshot, and outbox entry; Home reads the same local
account-scoped log state.

**H. Is bounded Coach safety intact?**  
Yes. Default-deny rollout, consent, allowlisted facts, short-lived bounded
context, account/hydration fencing, and fail-closed behavior remain intact.

**I. Was Fitness kept excluded?**  
Yes. Fitness was not restored, modified, or counted as missing recovery work.

**J. Are there any P0 findings?**  
No.

**K. Are there any P1 findings?**  
No P1 finding was established by this source/test audit.

**L. What remaining items require physical-device verification?**  
Onboarding keyboard geometry and accessibility announcements; Smart Scan camera,
offline, resume, process-kill, and Home propagation; Discover/Plus visual
freshness and remount behavior; Planner/Coach/RevenueCat/native auth;
HealthKit/Health Connect permissions and records; notifications, deep links,
background/resume, force quit, account switching, and date rollover.

**M. What remaining items require live-provider verification?**  
Supabase auth and callbacks; TheMealDB and premium recipe inventory and
exhaustion; OpenAI estimate completeness and timeout behavior; RevenueCat
purchase/restore/expiration/erasure; capture analysis and approval; deployed
API route identity; cross-device diary/sync; account deletion/provider
erasure; universal-link association.

**N. Is canonical main ready for a controlled release-candidate build?**  
No. The source-level nutrition truthfulness finding must be remediated and
retested first. A future owner-authorized build must then complete the device
and live-provider checklists.

## Final verdict

TARGET WINDOW RECOVERY INCOMPLETE — REMEDIATION REQUIRED