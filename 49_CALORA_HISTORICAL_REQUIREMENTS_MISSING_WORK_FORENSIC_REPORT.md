# Calora Step 49 — Historical Requirements / Missing Work Forensic Report

**Execution date:** 2026-09-16  
**Mission:** Forensic audit only  
**Application source changed:** No  
**Build/deploy/push/database mutation:** None

## 1. Executive summary

This audit compared the historical owner requirements R1–R13 against the exact
canonical source tree, commit ancestry, historical branches, historical reports,
current tests, and current route/data-flow wiring.

The owner's impression is substantially correct. The current canonical
application preserves a large amount of the historical product work, but it does
not preserve everything that historical reports described as complete. The most
important confirmed gaps are:

1. The canonical onboarding screen still uses a plain `ScrollView`; the
   historical keyboard-aware input-visibility implementation is on a divergent
   release branch and is not in canonical `origin/main`.
2. The canonical agreement control has a functional boolean gate and durable
   consent storage, but lacks the historical accessibility semantics, explicit
   tap affordance, test identifier, and focused UX copy.
3. Plus recipe remounts intentionally refetch because the canonical policy uses
   `refetchOnMount: "always"`. Visual card retention reduces the symptom but does
   not meet the no-unnecessary-reload requirement.
4. Discover freshness is still substantively incomplete: the canonical route
   uses deterministic category/interleaved ordering with a one-hour pool cache
   and no rotation, seed, or recently-shown exclusion.
5. Coach is a hardened, dark-gated Fact Context pilot rather than a complete
   production Coach. The safety boundary is strong, but client-authored facts,
   guest/local isolation proof, retry/offline recovery, observability, and
   native/device coverage remain gaps.
6. Connected Health is implemented locally on iOS and Android, but imported
   workouts have no visible destination. Health data is not sent through the
   server diary path.
7. The historical complete user-flow forensic report is absent from canonical
   main even though much of its runtime map can be reconstructed from current
   code.

Other requirements are materially preserved: onboarding completion persistence,
capture approval to Home Today propagation, Plus pagination protections,
Progress-to-Insights navigation supersession, and the Health read-only
foundation. These should not be rewritten or restored from an old branch
without a dependency-ordered review.

## 2. Canonical SHA/tree audited

- Canonical ref: `origin/main`
- SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Tree: `1a598be866150d488bc21ccd598de3104c638b02`
- Canonical working-tree source was audited read-only.
- The local ordinary `main` branch is divergent and was not treated as the
  release source.

## 3. TestFlight Build 5 identity

The Step 48 report records the owner-tested release:

- Version: `1.0.0`
- iOS build: `5`
- Bundle: `com.etiendem.caloraapp`
- EAS build ID:
  `088c4dc8-0ed9-4293-b7b7-4925045cbbbe`
- Build source SHA:
  `7cce885c6b3d046a5a8fdb40d92343a87b73c290`

This audit does not change or rebuild that release.

## 4. Historical evidence sources inspected

The audit inspected:

- the exact canonical tree at `origin/main`;
- `git log --all`, all locally available branch and remote refs, and commit
  ancestry;
- the local and remote `release/calora-onboarding-and-plus` refs;
- prior numbered Calora reports in the workspace;
- historical reports stored on the divergent release branch;
- current mobile route, context, persistence, health, recipe, Coach, scan,
  planner, profile, and test files;
- current API route registration, recipe/Coach/capture/sync/diary routes, and
  associated tests;
- the Step 49 owner requirements attachment.

Historical report titles were treated as leads, not proof. Every conclusion
below is based on current source, current tests, or a specific historical
commit/ref.

## 5. Historical branches inspected

The primary historical refs were:

- `origin/release/calora-onboarding-and-plus`
  (`dbf5bd51ed71c816e0707933030f4306d0f7882d`);
- local `release/calora-onboarding-and-plus`
  (`8ae1f1d6383b286502bc208e0de4e9fb41cde40d`);
- related reconciliation, release, backup, and agent refs exposed by
  `git for-each-ref`.

The historical release branch is not an ancestor of canonical
`origin/main`. Its work was inspected with `git show` and `git ls-tree`; it was
not checked out over main, merged, cherry-picked, or restored.

## 6. Historical reports inspected

The following reports were present on the historical release branch but absent
from canonical `origin/main`:

- `16_CALORA_POST_INSTALL_DEFECT_REMEDIATION_REPORT.md`;
- `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md`;
- `18_CALORA_PLUS_RECIPE_FRESHNESS_FINAL_CLOSURE_REPORT.md`;
- `19_CALORA_FINAL_POST_INSTALL_GITHUB_SYNC_REPORT.md`.

The historical reports describe onboarding, Coach, pagination, nutrition,
freshness, camera acceptance, Health, and user-flow work as closed or ready.
The current source comparison shows that some of those claims remain valid in
equivalent reconciled code, while others describe changes that are not present
in canonical main.

## 7. Relevant historical commits

| Commit | Historical work | Ancestor of canonical main? |
|---|---|---|
| `e27a2e8` | Persist onboarding completion before navigation | Yes |
| `b8ed3cf` | Restore unfinished onboarding drafts | Yes |
| `cafea90` | Keyboard-aware onboarding and agreement UX/tests | No |
| `614cb39` | Premium recipe refresh policy | Yes |
| `8d61f13` | Protect Plus pagination during rapid scrolling | Yes |
| `c37b83d` | Post-install remediation and recipe freshness closure | No |
| `3e727aa` | RevenueCat premium recipe features/tests | No; equivalent areas exist through reconciliation |
| `b3b0236` | Harden bounded Coach Fact Context requests | Yes |
| `7b1ae63` | Reconcile durable capture acceptance | Yes |
| `94c7cdc` | Add Apple Health and Health Connect adapters | Yes |
| `088dc2a` | Insights/Progress implementation lineage | Yes |

An ancestor result means the commit is in canonical history; it does not by
itself prove that every historical behavior remains connected or complete.

## 8. R1 onboarding keyboard/input audit

**Classification: `PARTIALLY_IMPLEMENTED`**  
**Severity: P2**

Canonical `artifacts/calora/app/index.tsx` imports and renders a plain
React Native `ScrollView` around the onboarding fields. It sets
`keyboardShouldPersistTaps="handled"` but does not use a keyboard-aware scroll
container, `KeyboardAvoidingView`, keyboard bottom offset, extra keyboard
space, or a focused-field visibility strategy.

The historical divergent branch contains a concrete implementation using
`KeyboardAwareScrollViewCompat`, bottom inset plus offset, extra keyboard
space,
platform dismissal, and added bottom padding. Its focused test is
`artifacts/calora/lib/__tests__/onboardingScreen.test.ts`. That implementation
originated in `cafea908d22cd3506b9509effdb3560afef3e530`, which is not an
ancestor of canonical main.

The canonical device flow covers nutrition-goal editing after onboarding, not
keyboard visibility for onboarding inputs. Web QA evidence cannot prove native
iOS or Android keyboard behavior.

Remaining uncertainty is device-specific keyboard occlusion, safe-area
interaction, focus movement, VoiceOver/TalkBack announcements, and small-screen
behavior.

## 9. R2 onboarding persistence audit

**Classification: `PRESENT_AND_COMPLETE` at source level**  
**Severity: P2 validation gap; P1 only if the owner reproduces a relaunch loss**

`CaloraContext.tsx` persists `onboardingComplete`, `onboardingStep`, and the
draft. `completeOnboarding` rejects when there is no valid profile, stages the
complete snapshot, enqueues it, awaits the persistence manager flush, and only
then publishes React state. `app/index.tsx` awaits completion before leaving
onboarding. Hydration honors explicit completion and supports legacy profile
inference; unfinished drafts resume.

The relevant commits `e27a2e8` and `b8ed3cf` are ancestors of canonical main.
Existing integration coverage checks completed versus abandoned snapshots,
hydration boundaries, clear/reset behavior, and account-scoped persistence.

There is no direct canonical test that completes onboarding, awaits the flush,
simulates an immediate process restart, hydrates the same account, and verifies
the redirect. Fresh-install behavior, account switching, guest-to-auth
transition, and native process-kill behavior therefore remain device/runtime
validation items, not confirmed source defects.

## 10. R3 agreement UX audit

**Classification: `PARTIALLY_IMPLEMENTED`**  
**Severity: P2**

Canonical onboarding has a tappable consent card, durable consent in the
completion payload, and a disabled final action when consent is false. The
current control is a generic `Pressable` and does not provide the historical
accessibility role/state, explicit required label, test identifier, spoken
checked/unchecked state, or clear “tap to agree” affordance.

The divergent historical branch adds those semantics and targeted tests in the
same onboarding screen test that is absent from canonical main. The current
source-level boolean gate prevents bypass, but canonical UX/accessibility is
behind the historical implementation.

Consent persistence is wired through the durable completion snapshot, but no
canonical test proves an accepted consent survives immediate restart or that a
legacy/account transition cannot bypass the final gate.

## 11. R4 Coach completeness audit

**Classification: `PARTIALLY_IMPLEMENTED`**  
**Severity: P1 for factual-integrity/release boundaries; P2 for completeness UX**

The Coach UI exists at `artifacts/calora/app/coach.tsx` with consent, history,
clear confirmation, loading, terminal failure copy, bounded actions, and
navigation. The request lifecycle has explicit deadlines, account/hydration
epochs, nonce/context fencing, cancellation/unmount guards, and clear-data
invalidation.

The implementation is intentionally a dark-gated Fact Context path, not a
complete general Coach:

- the UI suggests hydration, patterns, and wellness context while the approved
  fact set is limited to bounded daily calorie/protein facts;
- the client adapter does not use an unsafe legacy fallback when Fact Context
  is unavailable;
- the server validates client-authored facts for internal consistency but does
  not independently recompute or cryptographically prove their provenance;
- a shared privileged database boundary lacks database-level tenant isolation;
- retryable network failures have generic recovery copy but no explicit retry
  button/backoff or offline queue;
- local history/guest auxiliary-key isolation across sign-out and account
  switching is not fully proven;
- privacy-safe latency/failure metrics and crash/telemetry monitoring are not
  present;
- no Coach native/device flow proves keyboard, background/resume, rendering,
  navigation actions, or iOS/Android behavior.

The route's fail-closed consent/rollout gates and bounded output validation are
strong and must be preserved. The historical Coach “complete” reports cannot
be treated as production approval; the historical Coach go/no-go report and
production audit both retain unresolved conditions.

## 12. R5 Plus recipe reload audit

**Classification: `PRESENT_BUT_BROKEN`**  
**Severity: P2**

The canonical Plus query uses an account-scoped key and preserves loaded cards
across pages/remount cache restoration. It also avoids visual collapse with
placeholder data and disables window-focus refetch.

However, `artifacts/calora/lib/premiumRecipeRefreshPolicy.ts` explicitly sets:

- `staleTime: 5 * 60_000`;
- `refetchOnMount: "always"`;
- `refetchOnWindowFocus: false`;
- `refetchOnReconnect: false`.

Therefore each submenu remount intentionally issues a request. The old visual
loading symptom is mitigated, but the requirement was to avoid unnecessary
reloads while preserving legitimate freshness. Current tests verify card
retention and retry behavior, not that reopening the submenu avoids an
unnecessary request.

## 13. R6 Plus recipe pagination audit

**Classification: `PRESENT_AND_COMPLETE` with a contract edge case**  
**Severity: P2 only if a provider violates its contract**

Canonical Plus pagination uses offset pages, account-scoped query keys,
`nextOffset`, a single-flight loading guard, deduplication, prefetch, and
retained cards. API limits are bounded. Provider adapters use provider
pagination when available and otherwise infer continuation only when a full
page is returned. `terminalReason` distinguishes truthful exhaustion from
continuation.

The rapid-scroll protection commit `8d61f13` and related provider tests are
ancestors of canonical main. The API compatibility tests require
`nextOffset` and `terminalReason`.

The UI still contains an edge-case weakness where a full terminal page can
cause one extra request because the client uses returned page length rather
than the response cursor in one path. That is not fake infinite scrolling and
does not justify restoring the historical branch. Discover also has a finite
TheMealDB pool; a finite terminal result is source exhaustion unless live
provider evidence shows otherwise.

## 14. R7 Discover/Plus freshness audit

**Classification: `PRESENT_BUT_BROKEN`**  
**Severity: P2**

The canonical Discover “For you” route builds a fixed category-interleaved,
ID-deduplicated order and caches the pool for approximately one hour. It does
not implement a rotation seed, randomization, recently-shown exclusion, or
session/day variation.

Plus forwards provider order after normalization. Refetching the first page on
mount does not create meaningful variety when the upstream provider returns the
same deterministic first page.

The historical closure commit `c37b83d` and the Plus freshness closure report
are not ancestors/present in canonical main. No current canonical test asserts
variety, rotation, or recently-shown tracking. This is a substantive product
defect, not merely a navigation cache problem.

The remediation must preserve account isolation and truthful provider
exhaustion. It must not use unbounded randomization or fabricate variety when
the authoritative source has no additional eligible recipes.

## 15. R8 recipe nutrition completeness audit

**Classification: `PARTIALLY_IMPLEMENTED`**  
**Severity: P2**

Canonical Discover recipe summaries begin with nullable nutrition fields.
Server-side warm-up and detail lookup can obtain estimates with memory/database
cache layers and bounded provider/AI calls. Empty ingredients, failures, and
missing upstream values remain unavailable; the source does not fabricate
nutrition.

The client displays calories and conditionally protein, but does not present a
consistent complete set of calories, protein, carbohydrates, and fat on every
card. Some detail rendering uses null-to-zero presentation, which can visually
imply zero rather than unavailable. The complete/partial/unavailable
distinctions are stronger in the historical branch than in the canonical card
surface.

Current API tests cover null preservation, provider normalization, cache
refresh, and estimated nutrition. The canonical fix should improve
pending/unavailable/partial presentation, not invent values.

## 16. R9 Progress history/memory icon audit

**Classification: `SUPERSEDED_BY_NEWER_IMPLEMENTATION`**  
**Severity: P3 visual validation only**

The current product uses the `insights.tsx` route as the visible Progress tab.
Its header includes a memory/history action labelled “Open what Calora
remembers” that routes to `/memory`, with shopping as a separate action.
Progress includes overview, trends, weight, wellness, and living-memory
destinations.

The older standalone Progress/navigation arrangement should not be restored
because the current Insights + Memory architecture is the newer implementation.
The historical request’s exact “slightly left/larger” pixel delta cannot be
proven from current source or tests, but that is not evidence that the old
screen is missing.

## 17. R10 Smart Scan → Home Today data-flow audit

**Classification: `PRESENT_AND_COMPLETE` at source level**  
**Severity: P1 release-critical flow; device validation remains required**

The current path is:

```text
Scan tab
→ camera/library/barcode/receipt/label/text/voice capture
→ analyze API
→ local review draft
→ editable candidate
→ explicit approval
→ FoodLog + Food Memory + nutrition snapshot + diary outbox
→ persistence flush
→ local context publication
→ Home Today totals
→ authenticated eventual sync
```

`captureReviewTransitions.ts` builds the accepted log with date, meal,
nutrition, provenance, `imageAssetKey`, and snapshot data. The acceptance
coordinator stages the complete snapshot and awaits persistence before
publishing visible state. Home derives Today from the same context logs and
device-local date, not a separate stale query cache. Diary sync is
account-scoped and retryable; server sync failure does not hide the local log.

Relevant hardening commits `7b1ae63` and image/provenance work are ancestors of
canonical main. Capture, acceptance, Home, diary, sync, and image metadata
tests exist.

Remaining uncertainty is physical camera permission/provider behavior, network
failure on a real phone, cross-device timing, near-midnight timezone behavior,
and actual TestFlight execution. Those are not current source evidence of the
historical propagation defect.

## 18. R11 connected Health data architecture/display audit

**Classification: `PRESENT_BUT_DISCONNECTED` for workouts; otherwise `PARTIALLY_IMPLEMENTED`**  
**Severity: P2**

The native architecture is present:

- iOS reads HealthKit steps, active energy, body mass, and workouts;
- Android reads Health Connect steps, active calories, exercise sessions, and
  weight;
- both adapters are read-only;
- provider/permission state and snapshots persist locally;
- sync runs on authorized hydration, foreground, and local-day changes;
- Apple read authorization is treated as indeterminate rather than inferred.

Visible destinations are:

- steps: Progress Signals when connected/fresh;
- active energy: Progress Signals and Home remaining-calorie calculation;
- weight: local Progress weight trend/history;
- workouts: no current rendered workout list/card was found;
- Profile: connection, permission, sync, and disconnect management.

Health snapshots are not sent through the server diary/API path. That is a
documented local architecture, not an accidental missing API. The concrete
product gap is that imported workouts are stored but not surfaced. Native
permissions, populated records, OS settings, and device-specific provider
behavior remain unverified.

## 19. R12 reliability/bug-minimization audit

**Classification: `PARTIALLY_IMPLEMENTED`**  
**Severity: P1**

Current strengths include:

- TypeScript typechecking and broad mobile/API tests;
- integration, contract, and security coverage;
- account-scoped persistence and sync;
- capture approval and deletion fences;
- bounded Coach requests and output validation;
- release attestation, build provenance, signing preflight, and build-number
  controls;
- global error boundary and many explicit retry/error states;
- account isolation predicates and RevenueCat entitlement checks.

High-risk remaining gaps include:

- no complete physical-device matrix for onboarding, Coach, Smart Scan,
  Health, RevenueCat purchase/restore, universal links, notifications, and
  background/resume;
- no privacy-safe production crash/telemetry pipeline or Coach outcome
  observability;
- offline handling and retry behavior is inconsistent across features;
- live provider inventory/cardinality is not proven by unit tests;
- native release validation is not equivalent to the repository test suite;
- shared privileged database access does not enforce database-level tenant RLS;
- release workflows must not be considered proof of native runtime behavior.

These findings are reliability and release-evidence gaps, not a reason to
remove the existing source-level safeguards.

## 20. R13 complete current user-flow forensic map

**Classification: `IMPLEMENTED_HISTORICALLY_BUT_MISSING_NOW` as a report artifact**  
**Severity: P2 documentation/reconciliation gap**

The historical `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md` is absent from
canonical main. Current runtime behavior can nevertheless be reconstructed:

- launch/session restoration and account-scoped hydration;
- resumable onboarding and agreement completion;
- Supabase authentication, verification, recovery, and PKCE;
- Home/Today, manual logging, Smart Scan, capture review/approval, Food
  Memory, Recipes/Discover/Plus, recipe details, Planner, Weekly Programs,
  shopping, Progress/Insights, Health, Coach, Diary/sync, Profile/settings,
  Premium/RevenueCat, referrals/deep links, notifications, logout, deletion,
  error/retry, and background/resume behavior.

The absence of the historical artifact matters because later remediation cannot
rely on an unavailable flow contract. The report should not be recovered by
blindly copying the old branch; it should be regenerated from current source
and current tests.

## 21. Requirement classification matrix

| ID | Requirement | Historical evidence | Current implementation | Classification | Severity | Test coverage | Recommended action |
|---|---|---|---|---|---|---|---|
| R1 | Onboarding keyboard/input visibility | `cafea90`, release onboarding test | Plain `ScrollView`; no native keyboard strategy | `PARTIALLY_IMPLEMENTED` | P2 | Partial; no canonical native onboarding flow | Reimplement keyboard-aware layout and native test |
| R2 | Completion persistence | `e27a2e8`, `b8ed3cf` | Durable, account-scoped flush before redirect | `PRESENT_AND_COMPLETE` | P2 validation gap | Partial/strong indirect | Add focused relaunch/account-transition test |
| R3 | Agreement UX | `cafea90` release UX/test | Boolean gate and persistence; weak semantics | `PARTIALLY_IMPLEMENTED` | P2 | Partial source only | Restore semantics/accessibility cleanly |
| R4 | Coach completeness | `b3b0236`, Fact Context reports | Safe bounded dark pilot, not full production Coach | `PARTIALLY_IMPLEMENTED` | P1/P2 | Strong API/unit; weak native/live | Keep dark; close provenance/retry/observability gaps |
| R5 | Plus unnecessary reload | `614cb39` policy lineage | `refetchOnMount: always` | `PRESENT_BUT_BROKEN` | P2 | Partial | Define remount freshness policy and request-count test |
| R6 | Plus pagination | `8d61f13` | Cursor/offset/dedup/terminal protections | `PRESENT_AND_COMPLETE` | P2 edge case | Strong API/unit; weak live/device | Align UI to authoritative cursor; validate provider |
| R7 | Discover/Plus freshness | `c37b83d`, report 18 | Deterministic order and long pool cache | `PRESENT_BUT_BROKEN` | P2 | Missing variety test | Controlled account/day/session rotation |
| R8 | Nutrition completeness | historical normalization/closure | Nullable/warm-up/estimate path; partial card UI | `PARTIALLY_IMPLEMENTED` | P2 | Partial API/unit | Show pending/unavailable; never fabricate |
| R9 | Progress memory icon | Insights lineage `088dc2a` | Progress/Insights + `/memory` action | `SUPERSEDED_BY_NEWER_IMPLEMENTATION` | P3 | Partial visual | Do not restore old navigation |
| R10 | Smart Scan → Home Today | `7b1ae63` and capture reports | Durable acceptance, shared context, outbox, Home totals | `PRESENT_AND_COMPLETE` | P1 validation | Strong source/unit; weak device | Execute physical end-to-end test |
| R11 | Connected Health display | `94c7cdc`, Health reports | Native read/snapshot/display; workouts not surfaced | `PRESENT_BUT_DISCONNECTED` | P2 | Strong pure logic; no native | Decide workout destination; test real providers |
| R12 | Bug minimization | release-gate and production audits | Broad automated safeguards; native/observability gaps | `PARTIALLY_IMPLEMENTED` | P1 | Strong unit/API; weak native/prod | Add device/release/observability gates |
| R13 | Complete flow forensic map | historical report 17 | Runtime map reconstructable; report absent | `IMPLEMENTED_HISTORICALLY_BUT_MISSING_NOW` | P2 | Documentation only | Regenerate canonical current-flow map |

## 22. Historical implementation → current implementation mapping

| Historical area | Current canonical equivalent |
|---|---|
| Onboarding completion-before-navigation | `CaloraContext.completeOnboarding`, persistence manager, `e27a2e8` |
| Unfinished onboarding drafts | Draft hydration/resume, `b8ed3cf` |
| Keyboard-aware onboarding | Not present in canonical; only divergent release implementation |
| Agreement accessibility UX | Basic Pressable gate remains; historical enhanced semantics absent |
| Plus refresh policy | Account-scoped query/cache policy present, but remount always refetches |
| Plus rapid-scroll pagination | Canonical `8d61f13` protections and cursor/terminal API |
| Recipe freshness closure | Not represented by `c37b83d` ancestry; deterministic current order remains |
| Capture acceptance | Durable acceptance coordinator, `7b1ae63` |
| Progress icon/navigation | Current Insights/Progress + Memory architecture, `088dc2a` lineage |
| Health providers | iOS/Android read-only adapters, `94c7cdc` lineage |
| Coach hardening | Bounded Fact Context and lifecycle fencing, `b3b0236` |
| Full forensic map | Historical report absent; current map must be regenerated |

## 23. Historical work missing from canonical main

Confirmed absent or incomplete:

- the historical keyboard-aware onboarding implementation and focused test;
- the enhanced agreement accessibility/UX implementation and focused test;
- the recipe freshness/rotation/recently-shown closure described by `c37b83d`;
- the historical complete user-flow forensic report;
- historical partial-nutrition card semantics where canonical rendering still
  has inconsistent field visibility/null presentation.

Absence of a commit from ancestry does not mean every line of its behavior is
absent; some areas were independently reconciled. The items above were
classified from direct source comparison, not SHA absence alone.

## 24. Historical work superseded by newer implementations

Do not restore:

- the old standalone Progress navigation solely to satisfy the old icon prompt;
- the old Plus implementation wholesale; canonical pagination and account
  scoping are newer/safer;
- broad legacy Coach free-text or unrestricted contextual insights; the current
  bounded, fail-closed Coach boundary is intentional;
- a server Health data pipeline without a new product decision; current Health
  is explicitly local/native and read-only;
- historical reports as if they were runtime code.

## 25. Current features that are partial/disconnected

- Onboarding native keyboard visibility and agreement accessibility.
- Plus remount request policy.
- Discover/Plus freshness variety.
- Discover nutrition completeness/pending/unavailable rendering.
- Coach production provenance, retries/offline recovery, observability, and
  native coverage.
- Health workouts stored but not visibly surfaced.
- Native/device/release evidence across major flows.
- The canonical current user-flow map as a maintained artifact.

## 26. Dead/orphaned implementation inventory

| Area | Status | Evidence/interpretation |
|---|---|---|
| `encrypted-recovery-preview.tsx` | Hidden/diagnostic | Route exists in stack but no normal navigation |
| `meal-image-preview.tsx` | Conditional/deep-only | Reached from image-specific flow, not a normal tab |
| Profile tab | Hidden but wired | `href: null`; reached from Home/headers intentionally |
| Invite route | External/deep-link only | Not expected in normal tab navigation |
| Coach Fact Context/consent routes | Backend/controlled | Not missing screens; intentionally gated API paths |
| Base Health adapter | Fallback implementation | Platform files selected by native bundler |
| Historical reports | Documentation artifacts | Not runtime features; absent from canonical |

No evidence supports restoring an obsolete Progress screen or old Plus tree.

## 27. Complete current user-facing feature inventory

| Product area | Current status | Notes |
|---|---|---|
| Onboarding | `VISIBLE_BUT_PARTIAL` | Resumable/durable; native keyboard and consent UX gaps |
| Auth | `VISIBLE_AND_WIRED` | Supabase sign-in/up, verification, recovery, PKCE |
| Home/Today | `VISIBLE_AND_WIRED` | Local-first totals, diary, wellness, navigation |
| Manual logging | `VISIBLE_AND_WIRED` | Local FoodLog/outbox paths |
| Smart Scan | `VISIBLE_AND_WIRED` | Camera/library/barcode/text/voice/receipt/label |
| Capture review/approval | `VISIBLE_AND_WIRED` | Explicit approval and durable snapshot |
| Food Memory | `VISIBLE_AND_WIRED` | Local accepted memories, forget/undo |
| Recipes/Discover | `VISIBLE_BUT_PARTIAL` | Pagination and nutrition source limitations |
| Plus | `VISIBLE_BUT_PARTIAL` | Entitlement/pagination wired; remount/freshness gaps |
| Planner | `VISIBLE_AND_WIRED` | Weekly planning, replacements, custom meals, fallback |
| Weekly Programs | `VISIBLE_AND_WIRED` | Current modal/state-machine implementation |
| Shopping | `VISIBLE_AND_WIRED` | Planner-derived local list |
| Progress/Wellness | `VISIBLE_AND_WIRED` | Current Insights equivalent; health/workout gaps |
| Health | `VISIBLE_BUT_PARTIAL` | Native read-only connection; workouts not surfaced |
| Coach | `VISIBLE_BUT_PARTIAL` | Safe dark-gated bounded pilot |
| Diary/sync | `BACKEND_ONLY` plus local surfaces | No standalone Diary tab; Home/Progress consume it |
| Profile/settings | `VISIBLE_AND_WIRED` | Hidden tab but reachable and functional |
| Premium/RevenueCat | `VISIBLE_AND_WIRED` with live-provider gap | Fail-closed entitlement/purchase paths |
| Referrals | `VISIBLE_AND_WIRED` | Profile/deep-link/API flows |
| Notifications/background | `VISIBLE_BUT_PARTIAL` | Local inbox/scheduling; native delivery unproven |
| Account deletion | `VISIBLE_AND_WIRED` | Recovery/deletion fence and provider cleanup paths |
| Deep links | `VISIBLE_BUT_PARTIAL` | Route and association support; device proof missing |

## 28. Smart Scan end-to-end data-flow map

```text
Scan entry
  → camera/library/barcode/receipt/label/text/voice adapter
  → analyze capture request
  → server capture session/review candidate
  → local editable review draft
  → explicit approve
  → FoodLog with nutritionSnapshot/provenance/imageAssetKey
  → Food Memory + living memory update
  → diary outbox
  → persistence flush
  → context publication
  → Home Today/date totals
  → authenticated account-scoped POST /v1/sync
```

The acceptance boundary is local-first and does not depend on server approval
success for immediate Home display. The remaining audit edge is physical
camera/provider/network/date behavior.

## 29. Health data end-to-end data-flow map

```text
iOS HealthKit / Android Health Connect
  → read-only native adapter
  → provider/permission result
  → current-local-day snapshot
  → encrypted local CaloraContext
  → Progress Signals / Home burned-energy calculation / local weight history
```

Metric destinations:

- steps → Progress Signals;
- active energy → Progress Signals and Home remaining calories;
- weight → local Progress weight trend/history;
- workouts → stored in the snapshot but no visible destination;
- connection/permission/sync → Profile Health modal.

No Health snapshot is sent to the server diary path. Read authorization,
provider availability, and populated records remain device-dependent.

## 30. Recipe/Planner/shopping/logging data-flow map

```text
Recipe/Discover/Plus
  → recipe detail
  → Planner meal/program pool
  → selected week/day planner state
  → local shopping-list derivation
  → optional log/acceptance
  → FoodLog/diary outbox
  → Home/Progress totals
```

Planner and Weekly Programs use local state with API generation/fallback
support. Shopping is locally derived and checkable. Recipe freshness and
nutrition completeness remain the weak edges. Provider terminal metadata must
remain authoritative; the client must not invent infinite pages or nutrition.

## 31. Premium entitlement data-flow map

```text
RevenueCat offering/purchase/restore
  → client entitlement state
  → premium route/query access
  → authenticated API entitlement verification
  → premium recipe provider/normalization
  → Plus recipe cards/detail/saved recipes
```

Unauthenticated access prompts sign-in; the API fails closed on missing or
invalid entitlement. Remaining proof gaps are live RevenueCat purchase/restore,
provider behavior, and native device coverage, not an authorization bypass
found in this audit.

## 32. Test coverage matrix

| Requirement | Unit | Integration | API/contract | Security | Native | Physical device |
|---|---|---|---|---|---|---|
| R1 | Partial | Missing focused screen test | N/A | Partial | Missing | Missing |
| R2 | Strong indirect | Partial | N/A | Partial/account scope | Partial | Missing |
| R3 | Partial | Missing consent-relaunch test | N/A | Partial | Missing accessibility | Missing |
| R4 | Strong bounded modules | Partial | Strong | Strong but provenance gap | Missing | Missing |
| R5 | Partial cache tests | Partial | Partial | N/A | Missing remount proof | Missing |
| R6 | Strong | Partial | Strong cursor/terminal | Partial | Partial rapid-scroll | Missing live provider |
| R7 | Missing variety assertion | Missing | Partial | Account scope not fully tested | Missing | Missing |
| R8 | Strong normalization | Partial warm-up | Strong null/provider tests | Partial AI cost/rate controls | Missing | Missing |
| R9 | Partial screen logic | Missing visual regression | N/A | N/A | Partial | Missing |
| R10 | Strong capture/Home units | Strong acceptance/sync | Strong capture/sync | Strong ownership | Partial | Missing |
| R11 | Strong pure health logic | Partial | No server health contract | Partial | Missing provider matrix | Missing |
| R12 | Strong broad suites | Partial | Strong release contracts | Strong areas | Partial | Missing |
| R13 | Documentation only | N/A | N/A | N/A | N/A | N/A |

`STRONG` in this table means meaningful source/test evidence, not proof of
native behavior on the owner's phone.

## 33. Physical-device coverage gaps

The following remain unproven without native execution:

- onboarding keyboard visibility and focus/safe-area behavior;
- agreement accessibility announcements and tap usability;
- immediate onboarding completion restart and account transitions;
- Smart Scan camera permissions, provider behavior, network failure, and
  near-midnight date behavior;
- HealthKit/Health Connect permissions, populated records, revocation, and
  workout visibility;
- RevenueCat purchase/restore and entitlement refresh;
- Coach keyboard, background/resume, retry/offline, rendering, and navigation;
- universal links/referrals;
- local notification delivery, tap routing, and background scheduling;
- native deletion/logout/session persistence;
- long Plus scroll against live provider inventory;
- crash behavior and production observability.

The owner’s successful Build 5 installation does not automatically close these
individual coverage gaps.

## 34. Confirmed P0 gaps

**None confirmed in this audit.**

No confirmed current finding demonstrated security compromise, irreversible
data loss, or a release-blocking production outage at P0 severity. Potential
tenant-isolation and Coach fact-provenance concerns are P1 and must remain
controlled; they are not downgraded because no exploit was run.

## 35. Confirmed P1 gaps

- Coach client-authored Fact Context is not independently recomputed/signed by
  the server.
- Shared privileged database access lacks database-level tenant isolation.
- Coach production/dark-state and native/live-provider evidence remain
  independently unverified.
- Reliability/release gates do not provide complete native/device,
  crash/observability, or live-provider assurance.
- Smart Scan is release-critical and still needs physical end-to-end
  validation, even though source propagation is coherent.

## 36. Confirmed P2 gaps

- Onboarding keyboard/input visibility in canonical source.
- Agreement accessibility/UX semantics and focused tests.
- Plus remount request policy.
- Discover/Plus freshness variety and recently-shown behavior.
- Discover nutrition completeness and unavailable/pending rendering.
- Health workouts have no visible destination.
- Historical complete flow map is absent from canonical main.
- Missing native/device validation for major flows.

## 37. P3/P4 gaps

- Exact historical Progress icon position/size is not preserved as a measurable
  contract.
- Some visual polish and accessibility regression coverage remain incomplete.
- Deep-only/diagnostic routes are not normal user navigation, by design.

## 38. Dependency-ordered remediation plan

No remediation was performed in Step 49. If Step 50 is authorized, use this
order:

1. **Freeze evidence and define contracts.** Preserve the canonical release
   evidence; regenerate the current flow map; do not merge the historical
   branch wholesale.
2. **Protect identity and sensitive data.** Resolve Coach fact provenance,
   database tenant-boundary controls, guest/account local-key isolation, and
   Coach production/dark-state ownership before enabling sensitive context.
3. **Repair onboarding foundations.** Implement keyboard-aware onboarding,
   agreement accessibility semantics, and focused hydration/relaunch/account
   transition tests.
4. **Validate the release-critical capture path.** Run native Smart Scan
   approval → Diary → Home Today tests across offline, retry, date, and
   account conditions.
5. **Repair recipe behavior.** Define remount freshness without unconditional
   reload, implement bounded freshness rotation, align UI pagination to
   authoritative cursors, and make unavailable nutrition explicit.
6. **Complete Planner/Health edges.** Decide whether workouts need a visible
   destination; then add provider/device tests and preserve local-only Health
   ownership unless a server feature is explicitly approved.
7. **Harden reliability evidence.** Add privacy-safe observability, native
   smoke coverage, notification/deep-link/purchase tests, and release gates
   that distinguish source tests from physical-device evidence.
8. **Re-run forensic mapping and release validation.** Only after remediation
   should a new build or submission be considered, under a separate explicit
   authorization.

## 39. Features that must NOT be restored because newer implementation supersedes them

- Old standalone Progress navigation.
- Old Plus recipe implementation or unscoped cache behavior.
- Broad legacy Coach free-text/context behavior.
- An invented server Health synchronization path.
- Historical reports copied as if they were current source.
- Any fake infinite scroll or fabricated nutrition fallback.

## 40. Remaining uncertainties

- Whether the owner’s physical Build 5 test observed any onboarding,
  agreement, recipe, Coach, or Health-specific behavior beyond the stated
  general app operation.
- Exact native keyboard behavior on the owner’s small-screen iOS/Android
  device.
- Live provider cardinality and ordering after account/day/session changes.
- Actual HealthKit/Health Connect records and workout data on the owner’s
  device.
- Live RevenueCat purchase/restore and entitlement transition behavior.
- Production Coach rollout/migration state and whether the dark path is
  intentionally enabled for any cohort.
- Whether the historical freshness algorithm can be safely reimplemented from
  its contract without recovering branch-specific assumptions.

## 41. Exact recommendation for Step 50

Do not merge or cherry-pick the historical release branch directly. Have the
owner review this report and explicitly authorize a controlled remediation
mission. If authorized, start with Coach fact provenance/database isolation and
onboarding native behavior, then validate Smart Scan → Home Today, repair
recipe freshness/reload/nutrition contracts, decide the Health workout
destination, and add the missing native/release observability gates.

No source fix, build, deployment, database change, migration, or Git push was
performed in Step 49.

## Final questions

**A. Is the owner's impression correct?**  
Yes. Substantial historical work is selectively preserved, but confirmed gaps
remain in onboarding, recipe reload/freshness, nutrition presentation, Coach
completeness, Health workout display, native coverage, and the forensic
documentation artifact.

**B. Which requirements are missing?**  
The canonical keyboard-aware onboarding implementation, enhanced agreement UX
semantics, freshness closure, workout destination, and the historical complete
flow-map artifact are missing or incomplete.

**C. Which requirements are disconnected?**  
Imported Health workouts are stored without a user-facing destination. Coach
Fact Context is intentionally dark-gated and not a complete general Coach.
Nutrition data is partially available while card presentation is incomplete.

**D. Which were implemented historically but disappeared?**  
The historical onboarding keyboard/consent enhancements, freshness closure
algorithm/report, and complete flow-map report are not represented in
canonical main as verified artifacts.

**E. Which old requirements were intentionally superseded?**  
The old Progress header/navigation arrangement was superseded by Insights +
Memory. Broad legacy Coach behavior was superseded by the bounded safety
boundary.

**F. Which apparent missing features are backend-only or hidden?**  
Coach consent/Fact Context routes, native Health adapters, local diary/sync,
conditional meal-image preview, diagnostic recovery preview, and external
invite routing are not ordinary standalone screens.

**G. Is there evidence that a historical branch contains useful work?**  
Yes. The divergent release branch contains concrete onboarding UX/tests,
freshness documentation/implementation evidence, and the full flow-map
report. It is not an ancestor of canonical main.

**H. Is it safe to recover that work directly?**  
No. The branch mixes documentation, source changes, release assumptions, and
later canonical reconciliations. Recover only behavior after a current-main
contract comparison and dependency review.

**I. What should be reimplemented cleanly?**  
Keyboard-aware onboarding, agreement accessibility, recipe freshness/reload
policy, explicit nutrition availability, Health workout presentation, and
privacy-safe observability should be reimplemented against current contracts.

**J. What dependency order should remediation follow?**  
Identity/data safety → onboarding hydration/keyboard/consent → native capture
and Home propagation → recipes/premium/freshness/nutrition → Planner/Health →
Coach enablement → native/release observability and full device validation.

## Final verdict

SUBSTANTIAL HISTORICAL WORK GAPS CONFIRMED — CONTROLLED REMEDIATION REQUIRED