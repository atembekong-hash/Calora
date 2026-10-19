# 238. Calora Discover Continuous Browse & Recipe Image Lifecycle Forensic Report

**Status at report creation:** IMPLEMENTED, VALIDATED IN CONTROLLED TESTS, PENDING PROTECTED PR / DEPLOYMENT / FRESH ANDROID VERIFICATION

**Scope:** Recipes → Discover continuous browsing, Discover image integrity, and Recipes → Create generated-photo lifecycle.
**Out of scope:** No Android/iOS/EAS/APK/AAB/IPA/TestFlight/App Store/Google Play build, installation, account-data mutation, provider configuration change, or database migration was performed in this repair mission.

## 1. Executive verdict

Three independent defects produced the reported behavior. They were not a single image-loader issue.

1. **Discover stopped despite the upstream browse source being circular.** The server could return the finite TheMealDB pool again, but the client page ledger deliberately terminated when it saw already-known recipe IDs. It could not distinguish a stale/refetched page from a server-authorized new browse cycle. The mounted feed was also a fully materialized `ScrollView` grid rather than a virtualized endless catalogue.
2. **Some Calora-original Discover cards had no image.** Those records intentionally do not carry an arbitrary remote photo URL. The card only considered the nullable `image` field and failed to resolve the verified, bundled planner image associated with the canonical Calora recipe identity. The correct safe result was consequently `Photo unavailable`, even though a verified local image asset existed.
3. **Completed Create photos appeared to generate forever.** The server correctly withheld an unreviewed AI image from its ordinary publication locator. However, the client treated the durable `stored + needs_review` state as if it were still generating and had no owner-scoped preview capability. It also reissued/cleared signed-image state through reconciliation and did not keep signed locators out of device persistence. This created an indefinite spinner or flicker instead of a reviewable result.

The repair makes unfiltered Discover continuously browse using **explicit server-owned cycle metadata**, not a client-side duplication loop; resolves Calora-original recipes to verified bundled images only; and introduces a non-publishing, authenticated review-preview path for completed generated photos. Unknown or invalid images remain unavailable rather than being replaced with a visually plausible but wrong dish.

## 2. Evidence and root-cause reconstruction

### 2.1 Discover was finite by client policy, not by the current upstream page cursor alone

The pre-release production baseline was sampled read-only at `GET /api/v1/recipes?limit=18&offset=0` and `offset=18`. Both returned 18 recipes and advancing offsets (`18`, then `36`). The deployed response had no `continuousBrowse`, `browseCycle`, or `browsePoolSize` contract fields. That establishes that the intended cycle semantics were not yet deployed at report time; it does not substitute for testing the pending source repair.

The server implementation has a finite `For you` provider pool. Its `circularBrowsePage` helper selects from the pool modulo its length. The earlier ledger reconciled all pages by stable recipe ID and correctly rejected repeated content in order to prevent accidental refetch duplicates. Once the server source wrapped, that same safety rule converted a valid browsing cycle into a terminal state. The old feed then showed only a bounded set of materialized cards.

The actual fixes are located at:

- `artifacts/api-server/src/routes/recipes.ts`: unfiltered `For you` responses now declare `continuousBrowse`, a server-derived `browseCycle`, and `browsePoolSize`; category/search results explicitly remain finite. Decimal page limits are floored before page and cursor calculation.
- `artifacts/calora/lib/discoverCatalogueState.ts`: feed keys are now `cycle:<cycle>:<stable-id>` only for server-declared continuous pages. The cycle is computed per card from `offset + item index` and the server pool cardinality, including pages that cross the pool boundary. Refetches at the same offset still replace the prior page; overlaps inside a cycle still reconcile; invalid/non-advancing cursors still terminate safely.
- `artifacts/calora/app/(tabs)/recipes.tsx`: Discover uses a two-column virtual `FlatList`, its standard `onEndReached` continuation, existing metric prefetching, and the shared cursor-claim guard. It retains the original header, saved rail, category selection, card geometry, and error/retry behavior while no longer accumulating an entire growing catalogue in one `ScrollView` tree.

This is not a cosmetic endless-card loop. A server declaration is required to allow a repeated provider recipe into the next intentional browse cycle. Search and category pages cannot acquire that privilege.

### 2.2 Missing Discover images were a canonical-asset resolution gap

`calora_catalog` cards were safely refusing to display an unrelated generic photo when their remote `image` property was absent. That matches Calora's image-integrity policy, but it omitted the trustworthy source available for this particular first-party catalogue: the bundled planner image that is mapped from the canonical recipe identity.

`artifacts/calora/lib/discoverRecipeImage.ts` now applies the following strict resolution order:

1. A `calora_catalog` record resolves only through the canonical bundled planner image identity.
2. Any other record uses only a normalized, trusted food-image URL.
3. If neither proves an image matches the dish, the card shows `Photo unavailable`.

The repair deliberately does **not** invent an image for TheMealDB records that genuinely lack a safe thumbnail. It fixes the known missing image class without weakening the rule that a wrong food photo is worse than no photo.

### 2.3 Create generation had a terminal `stored` state with no display path

The media service stores generated bytes privately, then requires semantic review before it can issue the ordinary accepted-image locator. That separation is correct. The problem was the missing bridge between storage completion and the human review UI:

- normal media-list reconciliation returns `stored + needs_review` without an ordinary image URL;
- the card classified this durable state as a creation-in-progress visual state;
- scheduled reconciliation could repeatedly revisit the state without an explicit preview result;
- rotating signed URLs were vulnerable to replacing a valid rendered image during normal reconciliation; and
- short-lived signed URLs could be retained in local snapshot persistence, making later behavior stale or unstable.

The repair adds an authenticated endpoint, `GET /v1/recipes/media/{mediaId}/review-preview`, in `artifacts/api-server/src/routes/recipes.ts`. It verifies the caller, finds only that caller's media, sets `Cache-Control: private, no-store`, and invokes `reviewPreviewLocatorForRecipeMedia`. The helper in `artifacts/api-server/src/lib/recipe-media-generation.ts` issues a temporary owner-scoped locator only if the media is `stored + needs_review`; it does not change the status to `url_ready`, publish the image, or accept the image.

On the client:

- `generatedRecipeImageLifecycle.ts` requests a review preview once, coalesces in-flight work by account/media identity, retains a fresh in-memory preview through ordinary reconciliation, and turns a preview failure into an explicit retryable preview state rather than a permanent spinner.
- `recipes.tsx` renders the preview as **“AI-generated · needs review.”** Opening the card exposes the existing **Looks right** and **Regenerate** choices. Only acceptance requests the ordinary published locator.
- `generatedRecipeImagePersistence.ts` and `CaloraContext.tsx` strip accepted and preview signed URL capabilities from hydration, autosave, and exported state while retaining stable media identity/status. A later signed-in session reissues a fresh owner-scoped locator rather than reusing one saved to disk.
- Generated image render caching is memory-only. Trusted public/first-party image paths retain normal memory-disk caching. This removes stale signed-URL persistence without degrading ordinary Discover image caching.
- Retry regeneration rotates the private image UUID/object key in `recipe-media.ts`, preventing a newly generated image from being confused with old bytes or an old signed locator. Unsupported/early review transitions are rejected; retry is quota-protected at the route boundary.

## 3. Before/after behavior traces

### 3.1 Discover `For you` cycle

**Before:** request page 0 → ledger stores unique provider IDs → source wraps after its finite pool → request contains prior IDs → ledger considers it an accidental duplicate page → `nextOffset = null` / terminal UI → finite feed.

**After:** server labels only unfiltered `For you` response with `continuousBrowse=true`, `browseCycle`, and `browsePoolSize` → ledger derives a per-card cycle key from absolute provider position → same source IDs are unique within cycle zero, then intentionally rendered once in cycle one → FlatList asks for the next claimed cursor exactly once even under repeated end/layout events. A same-offset refetch continues to replace/reconcile, not append.

### 3.2 Create photo completion

**Before:** owner media reaches `stored + needs_review` → ordinary list contains no published URL → card continues with creation-like UI/no usable preview → scheduled lifecycle revisits the state → user sees endless generation or unstable display.

**After:** durable stored review media is discovered → exactly one owner-scoped, no-store preview request is made → preview is held only in memory and labeled for review → user accepts to obtain an ordinary accepted locator, or rejects/regenerates → a preview/render failure is an explicit retry state, never an endless loader.

## 4. Regression coverage and results

All results below were executed from the isolated repair worktree using inert test environment values where needed. These are controlled source/API tests, not proof of physical Android behavior.

1. **Focused client reliability matrix: 89 tests passed across 6 files.** It covers same-offset refetch reconciliation, overlapping provider IDs, stale generations, 100 cursor claims under event storms, explicit cycles, a page crossing one cycle boundary, 100 deliberate server-declared wraps, thumbnail promotion, strict canonical image resolution, review preview terminal behavior, signed-capability persistence exclusion, reopen behavior, and screen contracts.
2. **Focused API media and Discover routes: 55 tests passed across 2 files.** It covers the cycle fields, cross-boundary page contents, finite categories, decimal limit normalization, owner-scoped review preview, strict review transitions, retry quota behavior, and new retry object identity.
3. **Full mobile regression: 164 test files and 1,813 tests passed.** Existing test-console warnings were test-fixture React `act(...)`/web-prop warnings and deliberate network error-path diagnostics; none was a test failure.
4. **Non-database API matrix: 41 test files and 513 tests passed.** It was rerun with a non-empty inert OpenAI integration configuration and inert database address. The first shell wrapper had an exit-status reporting defect after the test runner printed green results; the final direct captured command completed successfully and confirmed the 41/513 outcome.
5. **Type/configuration checks passed:** `pnpm typecheck:libs`; `pnpm --filter @workspace/calora exec tsc --noEmit`; `pnpm --filter @workspace/api-server run typecheck`; `node scripts/ci/validate-image-governance.mjs artifacts/calora/assets/image-surface-manifest.json`; `node --test scripts/ci/validate-image-governance.test.mjs`; `pnpm --filter @workspace/scripts test` (88 passing release-contract tests); and `git diff --check`.
6. **Complete API suite limitation:** the full suite attempts real PostgreSQL disposable-schema and integration tests. In this sandbox, the deliberately inert `127.0.0.1:1` database is unavailable, producing expected `ECONNREFUSED` failures in database-backed suites; it is not a defect attributed to this change. The full command recorded 39 passing files, 12 failing database/configuration suites, and 2 skipped suites. No production database was contacted or modified to bypass this limitation.

## 5. Safety and compatibility decisions

1. The new Browse fields are additive in the OpenAPI `RecipeList` response. A pre-update client ignores them; a repaired client treats missing fields conservatively as finite behavior.
2. Only unfiltered `For you` has continuous browse metadata. Search, ingredients, and category queries remain terminal and cannot pretend repeated result rows are new content.
3. The review-preview endpoint is authenticated, owner-scoped, no-store, non-publishing, and non-enumerating on absence. It cannot grant another account access to media or accept an image automatically.
4. Review requests now permit only `accepted` or `rejected` after a completed stored media item. The server remains authoritative for transitions.
5. No recipe image is fabricated. Invalid/untrusted remote image URLs and records lacking a canonical asset remain `Photo unavailable`.
6. No native build was initiated by this task. The mobile source will require the next explicitly authorized Android build or a separately verified compatible update path before physical-device verification is possible.

## 6. Deployment and verification status

At this report's creation the repair is local to an isolated branch and has **not** been committed, pushed, opened as a pull request, merged, deployed, or delivered in a native build. The current read-only production response did not yet contain the new continuous-browse fields, which is expected pre-deployment.

The next authorized engineering sequence is: final branch audit → commit only the listed source/contracts/tests/report → protected pull request → required GitHub checks → protected squash merge → Railway rollout/health/version attestation → live read-only Discover contract verification. Physical Android verification remains explicitly pending a fresh user-authorized corrected build or a separately proven compatible OTA delivery. It will test 100+ Discover continuation attempts, image integrity for Calora-original and remote cards, Create completion/review/accept/regenerate, retained pagination behavior, background/foreground recovery, and error paths.

## 7. Final per-issue status

| Requirement | Code status | Controlled validation | Production / Android status |
|---|---|---|---|
| Unfiltered Discover continues beyond a finite provider pool | Implemented | Pass: cycle, cross-boundary, and 100-cycle contracts | Pending protected merge/deploy and device test |
| Discover does not duplicate accidental refetches/overlaps | Implemented | Pass: refetch/overlap/cursor-storm contracts | Pending live/device test |
| Calora-original Discover recipes use verified images | Implemented | Pass: strict canonical resolver tests | Pending live/device visual inspection |
| Unknown/unsafe recipe image never becomes a wrong photo | Preserved | Pass: resolver and existing image policy suites | Pending live/device inspection |
| Create image no longer spins forever after durable completion | Implemented | Pass: preview, no-loop, persistence, reopen, and route tests | Pending authenticated live/device Create flow |
| Create image can be accepted or regenerated only after review | Implemented | Pass: route/client transition tests | Pending authenticated live/device flow |

**Conclusion:** The reported source-level failure classes are repaired and deterministically regression-protected. This report does not claim they are physically verified until the protected deployment and a newly corrected Android application are actually exercised.
