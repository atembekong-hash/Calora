# 235 — Calora Recipes Discover / Plus Scroll Reliability Remediation Report

**Status at authoring:** IMPLEMENTED; protected PR validation and production deployment pending. This report does **not** claim that the repair is deployed, that an authenticated production Plus flow was executed, or that a physical device passed.

**Scope:** P0 forensic remediation for Recipes → Discover and Recipes → Plus catalogue continuation, duplicate content, retained-pane ownership, terminal behavior, access boundaries, and bounded recovery. No native build, device operation, provider configuration change, payment/entitlement change, or production-data mutation was made.

## 1. Executive verdict

The investigation established that the reported symptom family did not have one cause. The source contained three confirmed continuation defects and two reliability/access gaps:

1. **Discover duplicate refetch:** a successful non-zero page was blindly appended whenever query data changed. A refetch of the same page created duplicate cards with duplicate offset-qualified keys.
2. **Plus retained-pane ownership collision:** `PremiumCatalogue` was mounted in every retained Recipes section pane and each instance assigned the same imperative parent `premiumLoadMoreRef`. An offscreen Discover/Create sibling could overwrite the active Plus callback.
3. **Plus terminal duplication:** repeated terminal metric events incremented `catalogueCycle`, rendering another entire copy of the loaded grid. This was not provider pagination and could grow an unbounded materialized `ScrollView` grid.
4. **Plus account boundary incompleteness:** the list treated only HTTP 401 as an access boundary; loaded protected state could survive a 403. Existing account-boundary helpers were not wired through list and detail outcomes.
5. **Discover recovery gap:** Discover had no caller deadline / transient retry parity and its zero-row offline state did not expose a retry action.

The repair deliberately does **not** repeat source pages just to simulate infinite scrolling. It continues through genuine advancing, unique pages. At a finite or circular upstream boundary, it retains the unique catalogue and gives the person a truthful terminal message plus explicit refresh action. This is the only product-correct outcome under Calora’s requirement that duplicate/wrong content is worse than a cosmetic endless surface.

## 2. Chronology and source authority

| UTC time / lineage | Evidence | Relevance |
|---|---|---|
| 2026-10-12, `d0ca7fa` | Earlier Discover guards | Guarded basic continuation but did not establish page identity/reconciliation. |
| 2026-10-16, `1e7ef9a` | Sustained feed/image work | Symptom context; not proof that the current screen had idempotent page application. |
| 2026-10-19, `9681662` / PR #195 | Plus made free to every signed-in account | The policy is preserved. No entitlement was restored or added. |
| 2026-10-19, `3e6a5db` / PR #198 | Current production baseline: non-obscuring swipe indicators | Baseline at investigation start and pre-merge production attestation. |
| 2026-10-19, `343c44d` / PR #199 | This repair branch | New deterministic catalogue state, ownership, terminal, access-boundary, and recovery contracts. |

The pre-remediation forensic synthesis and its five evidence tracks were preserved outside the repository in the dedicated investigation workspace. They distinguish current-lineage evidence from older non-ancestor historical material.

## 3. Exact baseline reproductions

### 3.1 Discover same-page refetch

The baseline `appendDiscoverFeedPage` function was extracted from `origin/main` at `3e6a5db` and invoked with initial page `[alpha, beta]`, page two `[gamma, delta]`, and the same page-two response a second time. The reproduced sequence was:

```text
baseline IDs: [alpha, beta, gamma, delta, gamma, delta]
baseline feed keys: [alpha:0, beta:1, gamma:2, delta:3, gamma:2, delta:3]
```

The unique-card assertion failed exactly as expected. This directly proves the duplicate-card defect without requiring an unreliable native gesture reproduction.

### 3.2 Plus terminal and retained-pane source proof

The baseline source inspection asserted four facts and intentionally failed the no-duplicate requirement:

```json
{
  "terminalIncrementsCycle": true,
  "rendersEveryCycle": true,
  "inactiveWriterGuardPresent": false,
  "allPanesMountCatalogue": true
}
```

The evidence showed terminal events incrementing `catalogueCycle`, `continuousCatalogueEntries` cloning every grid row, and all retained panes mounting a `PremiumCatalogue` that wrote the shared callback. This is the causal source path for repeated cards and an intermittent inactive continuation owner. It is not a claim that a specific native effect-order trace was observed.

## 4. Architecture correction

### 4.1 Discover: generation-aware stable-ID page ledger

`artifacts/calora/lib/discoverCatalogueState.ts` now owns a small pure state contract:

- A changed query/category starts a new `generation` and clears the old page ledger.
- A page is identified by its normalized offset. Re-applying an offset replaces that page, never append-duplicates it.
- Render entries are deduplicated by stable provider recipe ID and use that ID as their React key.
- A late page carrying an obsolete generation or filter key is ignored.
- Overlap between adjacent source pages is reconciled, keeping the first ordered instance.
- A non-advancing cursor or entirely previously-shown circular page terminates continuation rather than requesting or rendering an artificial cycle.
- `nextDiscoverPaginationOffset` accepts only an active Discover pane, a finite non-negative cursor, and a non-fetching/non-loading state. This is the second idempotence fence around the existing metric gate.

`recipes.tsx` now passes every query response through the ledger and includes the generation in the React Query/prefetch key. At unique exhaustion it renders `discover-recipe-terminal` and an explicit `Refresh Discover recipes` action that creates a new user-requested generation. It never silently loops.

### 4.2 Plus: one active publication and pagination owner

`PremiumCatalogue` is rendered only by the Plus section body rather than every Recipes section pane. It receives an `active` boolean derived from `activeSection === 'premium'`:

- Only an active instance publishes `loadedRecipes` into parent suggestion state.
- Only an active instance assigns `premiumLoadMoreRef`; cleanup clears its ownership.
- `nextPremiumPaginationOffset` rejects inactive owners, non-Plus sections, missing/non-finite cursors, fetches, loading, and terminal state.
- The parent metric gate still requires `section === activeSection === 'premium'` before invoking the ref.

This removes the shared mutable callback race while preserving retained horizontal pane visibility during a gesture. An adjacent Plus pane can render normally; it cannot control parent continuation or overwrite visible content state until it becomes active.

### 4.3 Plus terminal behavior

`catalogueCycle`, `continuousCatalogueEntries`, and the `allowRepeatedCycle` helper path were removed. Normal pages continue to merge by stable ID. At `nextOffset === null`, the unique grid stays fixed and `plus-recipe-terminal` shows the provider’s terminal reason or the honest fallback “All available Plus recipes are shown.” Repeated `onLayout`, `onContentSizeChange`, drag-end, and momentum-end events cannot append cards or create requests while terminal.

### 4.4 Protected data boundary and request reliability

- Plus list and detail responses classify **both 401 and 403** as account-boundary failures.
- `clearPremiumAccountBoundary` now removes account-keyed Plus list/detail queries, clears saved/list/suggestion state, and closes a selected Plus detail. The saved-recipes screen also removes stale Plus saved IDs if its detail fetch is denied.
- 502/provider failures remain availability failures and are not misrepresented as a sign-in boundary.
- Discover now uses a 20-second caller deadline, one bounded transient retry, no retry for 4xx/429/non-transient error, and an actionable initial offline retry button.
- Plus placeholder data is not treated as an applied page and cannot prematurely release the in-flight latch.

No provider endpoint, provider selection, credentials, RevenueCat policy, rate limit, authentication mechanism, or database state changed.

## 5. Regression and controlled integration evidence

| Layer | Command / coverage | Actual result |
|---|---|---|
| Baseline source reproduction | Extracted `origin/main` append helper | Failed unique-card assertion: reproduced `[gamma, delta]` twice. |
| Baseline source reproduction | Terminal-cycle / retained-owner assertions | Failed no-duplicate assertion; all four hazardous conditions were `true`. |
| New deterministic state suite | `recipeCataloguePagination.test.ts` | 14 tests passed. Covers same-offset refetch, page overlap, stale generation, 100 advancing pages, 100-event cursor storms, circular/invalid cursors, Plus transitions, terminal storms, placeholders, 401/403, and bounded retry policy. |
| Focused mobile reliability suite | 5 test files | 69 tests passed. |
| Focused controlled API routes | `recipes.test.ts` + `premiumRecipes.test.ts` | 2 files / 60 tests passed using inert test-only environment values. |
| Full mobile suite | `pnpm --filter @workspace/calora test -- --reporter=dot` | 162 files / **1,799** tests passed, plus 28 Node security/build-config checks. |
| Full API offline suite | `pnpm --filter @workspace/api-server run test:offline` | 41 files / **506** tests passed with CI sentinel configuration only; no production DB/provider was contacted. |
| Type safety | Mobile and API `tsc --noEmit` | Passed. |
| Change hygiene | `git diff --check` | Passed. |

The full mobile suite emitted pre-existing test-environment warnings (React `act(...)`, DOM-only React Native props, and intentionally simulated request failures). They did not fail a test, did not mention the changed catalogue paths as failures, and are recorded separately from pass evidence.

### 5.1 One-hundred-attempt criterion

The new deterministic test drives 100 advancing Discover pages (200 stable recipe IDs) and, for every page, issues 100 simulated layout/scroll events. The request log contains exactly 100 distinct cursor claims (`0` through `198` by two), never a duplicate cursor. The Plus test drives 100 terminal events after a prior cursor claim and records no additional cursor. This is controlled state/gesture evidence, not provider or native-device evidence.

## 6. Production and deployment evidence available before merge

At **2026-10-19T10:25Z**, the deployed baseline was healthy and had no pending Railway work:

- Railway production services `@workspace/calora`, `@workspace/api-server`, and `Calora`: **Online**; zero current issues and zero recent failures reported.
- `https://mycaloraapp.com/health`: HTTP 200 `{ "status": "ok" }`.
- `https://mycaloraapp.com/api/healthz`: HTTP 200 `{ "status": "ok" }`.
- `https://mycaloraapp.com/api/version`: HTTP 200 and attested commit `3e6a5db58868f07c999f54837663049c1aadc8f7`.
- Anonymous `GET /api/v1/premium-recipes?limit=2&offset=0`: HTTP 401 `Sign in to access Plus recipes.` This confirms the sign-in boundary remains enforced, but does not test authenticated Plus.
- Anonymous Discover returned HTTP 200 with a real TheMealDB page, advancing `nextOffset: 2`.

This section attests only the prior production baseline. It is **not** deployment proof for commit `4648915`.

## 7. Verification classification

| Surface / requirement | Classification at authoring | Basis and limitation |
|---|---|---|
| Discover duplicate refetch, overlap, stale generation, cursor idempotence | IMPLEMENTED; controlled regression PASS | Deterministic pure-state and screen-source contracts; not mounted native UI. |
| Discover real public first page | PASS for baseline read-only response | HTTP 200 with genuine provider response; does not cover the unmerged code. |
| Discover finite/circular terminal presentation | IMPLEMENTED; controlled regression PASS | New state and source contract; must be observed post-deploy. |
| Plus retained-pane ownership and terminal copying | IMPLEMENTED; controlled regression PASS | Deterministic state/source evidence; no fresh native effect-order trace. |
| Plus free signed-in policy | PRESERVED in source/API suite | API mocks prove every signed-in account path; no production authenticated session used. |
| Plus anonymous rejection | PASS on baseline production | HTTP 401 verified safely. |
| Plus authenticated provider selection/content | BLOCKED / UNVERIFIED | No dedicated authorized isolated QA account/session or proven active production provider configuration. No authentication bypass attempted. |
| Android/iOS physical-device scrolling | BLOCKED / UNVERIFIED | Manus workstation/device bridge remains unavailable; no device command was issued. |
| Deployment and release attestation | PENDING | PR #199 checks, protected merge, Railway rollout, and post-rollout `/api/version` verification are required. |

## 8. Required protected completion sequence

1. Wait for every required PR #199 check to pass; do not bypass branch protection.
2. Squash-merge the PR only when GitHub reports mergeable and required checks green.
3. Confirm `main` contains the resulting merge commit.
4. Verify Railway client/API service health and no pending work.
5. Verify `/health`, `/api/healthz`, and `/api/version` identify the new merge commit.
6. Safely repeat real public Discover multi-page progression after rollout. Do not issue abusive 100-request production traffic; the controlled 100-page coverage is the appropriate stress proof.
7. Run authenticated Plus and physical-device tests only when an authorized isolated QA session/device bridge is genuinely available. Required flows: long genuine continuation, terminal, rapid metric events, Discover → Plus → Create → Plus, refresh/background-resume, saved rails, 401/403 reauthentication, and sign-in-only access.

## 9. Safety and non-actions

- **No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build/release was triggered.**
- No existing Android installation, user data, DB, Supabase data, production variable, provider credential, RevenueCat configuration, or payment control changed.
- No customer records were inspected.
- The repair preserves the user-confirmed policy: Plus is free for every authenticated Calora account and remains unavailable to anonymous callers.
- The image integrity policy is untouched: no food-image fallback or substitution behavior changed.

## 10. Final status at authoring

Commit `343c44d8506af6108c5de1878edf0e1b92b3c36d` is the validated implementation on branch `fix/recipe-catalogue-pagination-reliability`. Its protected pull request is [#199](https://github.com/atembekong-hash/Calora/pull/199). The correct status at this point is **IMPLEMENTED, VERIFICATION INCOMPLETE**, pending protected checks, merge, deployment attestation, an authorized authenticated Plus run, and native-device access.
