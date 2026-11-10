# Calora Recipe Mission — Phase 1 Forensic Implementation Plan

**Mission:** CAL-RECIPES-001
**Planning date:** 2026-11-10
**Phase:** 1 — read-only forensic investigation and planning
**Repository evidence baseline:** current checkout at `ff02b43e` (the report baseline); verify the protected-main and production-release tips again immediately before implementation.
**Execution status:** Planning complete; implementation not authorized yet.

## 1. Scope and safety statement

This plan covers the full Recipe system and the five additional priorities in the approved directive: generated-photo identity and hashing, web/native catalogue semantics, removal of the unwanted nutrition card label, image-generation cost control, and remediation of the existing recipe forensic register. It also covers Discover/Plus browsing, details and servings, saving and synchronization, creation/media reliability, personalization and Coach context, visual/accessibility quality, security/reliability validation, and Android/iOS/web certification.

The investigation was read-only. No application code, database, branch, deployment, production configuration, credentials, provider account, native build, or store submission was changed. This report is an uncommitted planning artifact only.

## 2. Executive decision

The smallest reliable permanent change set is:

1. **Release-integrity gate:** eliminate source/compiled-artifact drift by rebuilding `artifacts/api-server/dist` through the approved pipeline and adding a CI parity check that rejects a stale recipe-media prompt/model/version in generated output.
2. **Canonical recipe identity and media job contract:** keep the v5 semantic identity excluding transient client IDs and signed URLs; add server-enforced idempotency-key and payload-fingerprint validation, durable generation intent, resumable transitions, and a unique owner/content-hash media invariant.
3. **One catalogue contract for both clients:** expose explicit `availableCount`, `filteredCount`, `loadedCount`, `nextCursor/hasMore`, and `browsePoolSize` semantics; render only the quantity being described. Preserve finite search/category termination and continuous unfiltered browsing as separate modes.
4. **Bounded browse and media economics:** keep provider images for browse/related recipes, generate only for user-created recipes that have a durable accepted workflow, cap initial related suggestions at 8–12 with on-demand continuation, and never generate images merely because a related card rendered.
5. **Account-scoped saved-state synchronization:** add versioned save/remove operations with an offline outbox, idempotent replay, deterministic reconciliation, account-bound cache keys, and explicit pending/already-saved/failed UI states.
6. **Canonical serving quantities:** store structured ingredient quantities where trustworthy, scale all downstream uses from one canonical serving contract, and leave unparseable text unchanged with a visible explanation rather than guessing.
7. **Focused UX corrections and evidence:** remove “Nutrition unavailable” from cards only, retain transparent detail/workflow nutrition states, add zero-result recovery, fix the six-item saved rail, and certify with disposable tenant tests plus genuine web/Android/iOS runtime evidence.

This is intentionally smaller than a broad rewrite. Full allergy-safe personalization, a new recommendation engine, and a shared global recipe-image catalogue are deferred unless later evidence shows they are required for the launch scope.

## 3. Verified current state and root causes

### 3.1 Generated recipe photos and semantic identity

**Evidence.** Current source defines `RECIPE_MEDIA_MODEL = "gpt-image-2.5-flare"`, model version `gpt-image-2.5-flare:low:1024:v1`, and prompt version `recipe-photo-semantic-v5-identity-stable-ingredient-fidelity` in `artifacts/api-server/src/lib/recipe-media.ts:4-7`. The generation path in `artifacts/api-server/src/lib/recipe-media-generation.ts` creates one 1024-square low-quality image, uploads it to owner-scoped private storage, transitions it to a review-only state, and issues a short-lived preview capability. The client lifecycle deliberately treats signed URLs as renewable locators rather than identity.

**Confirmed release-integrity defect.** The checked-in generated artifact `artifacts/api-server/dist/index.mjs` was found to contain the older v4 prompt marker while source uses v5. This proves source/artifact drift. It does not, by itself, prove that production is serving the stale artifact; deployment provenance and build-path evidence must establish that separately.

**Confirmed/partial behavioral defects.** The earlier forensic evidence found that the server photo route did not persist or validate the client idempotency key, durable offline generation intent was incomplete, restoration was capped at 200 rows without cursor metadata, post-upload transition failure could leave an orphan object, and there was no individual generated-recipe deletion path. Existing ownership, review gating, semantic hashing, and signed URL renewal contracts are strong but are not a complete interrupted-job protocol.

**Root cause.** Several independent seams were previously conflated: semantic identity, client-local recipe identity, expiring delivery URL, job attempt, storage object, and review state. Removing transient IDs from the semantic hash and signed URLs from lifecycle keys fixed the principal churn causes, but server idempotency and recovery still need a durable contract.

### 3.2 Web/native count discrepancy and endless browsing

**Evidence.** Native Discover is implemented in the shared Expo/React Native screen `artifacts/calora/app/(tabs)/recipes.tsx`; web and native therefore share core request logic. The current unfiltered label says “recipes in the curated browse cycle,” which is semantically safer than a total catalogue claim. API evidence exposed a provider pool size of 704 in one public snapshot; historical evidence recorded materially different loaded/unique counts. The reported web 3,664 versus native 28 values are not proven to be the same metric, account state, release, or snapshot.

**Root cause.** The product has multiple legitimate quantities—provider pool cardinality, bundled Calora originals, filtered result count, loaded cards, and continuous-browse cycle size—but previously used a single user-facing number. Native and web can also differ through pagination state, authentication, cached/local recipes, deployment version, and provider response timing. This is a contract/evidence failure first, and may include an implementation divergence that controlled equivalent-condition tests must isolate.

**Endless-scroll risk.** Source contains explicit pagination guards, freshness sessions, request locks, offset handling, and provider error states, but static evidence cannot certify long sessions, tab remounts, network interruptions, or browser/native gesture behavior. The mission should treat a stuck loading lock, duplicate page, stale cursor, or provider error rendered as empty as a reproducible runtime test target—not as already proven in production.

### 3.3 Nutrition card label

The phrase/equivalent state must be located across Discover, Plus, Saved Recipes, recommendation rails, and card components. The approved behavior is: remove the label from browse cards, do not fabricate nutrition, and preserve an explicit detail/workflow state when logging or meal planning requires missing nutrition. This is a narrow UI/content change, not a data suppression change.

### 3.4 Image-generation cost path

**Actual implementation.** Recipe photo generation uses OpenAI Images through `openai.images.generate` with model `gpt-image-2.5-flare`, `1024x1024`, `quality: "low"`, `n: 1`. It is invoked by the created-recipe media lifecycle, not by simply rendering provider-backed related recipe cards. Related suggestions are populated from provider/browse data and the detail screen loads only the additional provider pages needed to fill suggestion rows. Separate OpenAI chat-completion calls estimate nutrition on cache misses; those are not image-generation calls but remain a distinct provider-cost path.

**Existing controls.** The API has timeouts, L1/L2 nutrition caches, single-flight coalescing, concurrency and window budgets, and a bounded warm-up. Recipe media has owner-scoped storage, review gating, attempts, failure categories, and signed URL TTLs. Missing evidence includes provider billing, image-token usage, storage/CDN cost, real retry counts, and live related-card request traces.

**Official pricing evidence.** OpenAI’s current GPT Image 2.5 Flare model page states image input at $8 per million image tokens, cached image input at $2 per million, and image output at $30 per million tokens with Standard processing or $15 per million with Batch processing; it explicitly says the GPT Image 2 calculator does not estimate GPT Image 2.5 token consumption. Therefore an exact per-image price cannot be claimed from the repository or official page alone. The official image-generation guide confirms configurable size, quality, format, compression, and that the Image API is appropriate for one-shot generation. Sources: [GPT Image 2.5 Flare model](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare), [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation), [OpenAI API pricing](https://developers.openai.com/api/docs/pricing).

### 3.5 Existing forensic defects still current unless explicitly marked otherwise

The November 9 forensic report remains the starting evidence set. The following are still actionable or require explicit product disposition: portion adjustment mismatch; local-only saved recipes/meals for signed-in cross-device expectations; incomplete server media idempotency; saved Discover rail capped at six; counts that can disagree with visible/restored cards; missing successful zero-result recovery; incorrect “Meal saved” feedback for duplicates; ambiguous unavailable-nutrition action; incomplete responsive/accessibility/runtime evidence; media restoration/cleanup risk; skipped tenant-isolation integration tests; recipe-specific telemetry gap; and test portability blocked by database initialization.

The historical “3,664 versus 28” observation is not accepted as a reconciled defect until controlled equivalent-condition evidence proves what each number meant.

## 4. Coordinated implementation sequence

### Phase A — Release integrity and test harness (Required for Launch)

1. Rebase/inspect current protected main and production-release tips; capture serving provenance for API, web, and any native candidate.
2. Rebuild the API artifact from source using the approved build pipeline; verify the generated v5 marker and model metadata.
3. Add a deterministic source-to-dist parity test for recipe-media model version, prompt version, and critical route exports. Fail CI on stale or missing generated output.
4. Repair test-environment portability so premium and recipe-media suites can run with isolated placeholder configuration without importing a production database.
5. Add a report fixture proving no production or customer data was used.

**Acceptance:** source, dist, build metadata, CI result, and deployed provenance agree; a deliberately stale fixture fails the parity test and the corrected artifact passes.

### Phase B — Catalogue, pagination, and card semantics (Required for Launch)

1. Define a versioned API response contract with separate `availableCount`, `filteredCount`, `loadedCount`, `hasMore`, `nextCursor`, `browsePoolSize`, and `catalogueSnapshot` fields. Do not overload one count.
2. Keep unfiltered Discover as continuous browsing with an explicit cycle/pool label; make search and category results finite and terminating.
3. Centralize pagination state in a reducer/state machine keyed by account, search, category, catalogue snapshot, and visit. Reset cursor, loading, error, and dedupe state atomically on filter/search/refresh changes.
4. Make request cancellation and stale-response rejection explicit. Release loading locks in `finally`, including timeouts and provider errors.
5. Deduplicate by stable provider/recipe identity before rendering; preserve existing freshness rotation without duplicate cards.
6. Add a clear zero-result state with retry/change-filter action and keep provider outage distinct from an empty successful result.
7. Change the saved rail to “Recent 6” plus a functional “View all,” or remove the cap. Reconcile saved counts into visible, restored, unavailable, pending, and failed categories.
8. Remove “Nutrition unavailable” from all browse/card/rail surfaces while retaining a detail-level, actionable nutrition state.

**Acceptance:** controlled web and native runs under identical account/filter/release/provider fixtures report the same catalogue metadata; long-scroll, filter-change, remount, refresh, timeout, retry, and duplicate-page tests pass; no permanent spinner or false empty state occurs.

### Phase C — Canonical serving and nutrition contract (Required for Launch)

1. Introduce a typed ingredient representation `{quantity, unit, item, preparation, rawText, parseConfidence}` alongside raw text.
2. Parse conservatively for common units and fractions. Preserve raw text and mark unparseable quantities rather than guessing.
3. Define one canonical serving multiplier used by detail display, ingredient list, shopping list, saved recipe, diary payload, and planner payload.
4. Ensure nutrition confidence and source-yield basis survive scaling; do not turn estimates into verified values.
5. Add explicit “some ingredient quantities could not be scaled” messaging and tests for fractional, unitless, range, and unparseable ingredients.

**Acceptance:** changing 1 to N servings produces the same multiplier across all downstream records; unparseable text remains unchanged and is identified; provider attribution and nutrition confidence remain intact.

### Phase D — Account synchronization and offline reconciliation (Required for Launch for signed-in accounts)

1. Define account-scoped save/remove records with stable recipe identity, operation ID, client mutation ID, version/timestamp, and tombstone semantics.
2. Add server endpoints and database uniqueness constraints for idempotent save/remove replay. Validate account ownership and payload fingerprints.
3. Implement a local outbox with retry/backoff, online recovery, pending/error state, and deterministic merge of local records into the account on sign-in.
4. Partition local caches by account and clear/restore boundaries on account switching and session renewal.
5. Reconcile conflicts using a documented last-write/tombstone policy; never resurrect a removed record due to stale local state.
6. Fix duplicate feedback to distinguish saved, already saved, removed, pending, and failed.
7. Add account-deletion cleanup for saved records and media references.

**Acceptance:** disposable account A saves on device A, restores on device B, removes on either device, repeats offline operations, switches accounts, reinstalls/restores, and never sees account B data; retries create no duplicates.

### Phase E — Creation/media reliability (Required for Launch for Create)

1. Separate durable `generation_intent`, semantic content hash, media asset, attempt, and delivery locator identifiers.
2. Require an idempotency key on create/claim/generate operations; persist request key plus payload fingerprint and return the original result for an equivalent retry. Reject same-key/different-payload reuse.
3. Make the state machine resumable: intent → claimed → generating → stored → needs_review → accepted/rejected → superseded/cleaned. Use compare-and-set transitions on attempt/version.
4. Reconcile post-upload transition failures by listing the owner media row and object key before retrying. Add safe orphan cleanup with retention and audit evidence.
5. Paginate media restoration with a cursor; renew signed URLs from durable media IDs only.
6. Add individual generated-recipe deletion and account-deletion media cleanup, with owner denial tests.
7. Preserve review gating and never substitute a generic unrelated food image.
8. Emit privacy-safe structured lifecycle telemetry: correlation ID, category, phase, attempt, latency bucket, and outcome—never prompt text, image bytes, tokens, or personal ingredients.

**Acceptance:** interrupted provider, upload, database, app restart, refresh, signed-URL expiry, duplicate retry, rejected preview, account switch, and deletion scenarios recover without duplicate generation, duplicate charge, cross-owner access, or orphan accumulation.

### Phase F — Personalization and Coach context (Important Improvement; truthful copy is Required for Launch)

1. Keep Discover/For You explicitly described as curated/provider browse until actual account-aware ranking is implemented.
2. Inventory available profile goals, macro targets, diary context, planner history, saved recipes, programs, and Coach facts; document each input’s freshness and consent boundary.
3. Implement only a bounded ranking layer using documented inputs already available, with explainable reasons and account-scoped caching.
4. Do not claim allergy/intolerance safety without explicit user controls, reliable ingredient semantics, conservative unknown handling, and dedicated validation.
5. Ensure Coach recipe context reads the same account-scoped facts and states limitations clearly.

**Acceptance:** all displayed personalization claims map to tested inputs; a user’s ranking/context cannot leak to another account; unknown allergens are not represented as safe.

### Phase G — Visual, accessibility, and platform certification (Required for Launch)

1. Render the complete journey at 320, 360, 393, and 430 px in light/dark themes.
2. Verify cards, image states, save menus, tabs, detail scrolling, modals, keyboard avoidance, zero/loading/error states, and touch targets.
3. Test web pointer/keyboard/focus order and large text; test Android and iOS gestures/accessibility labels.
4. Use deterministic mock fixtures only for layout tests; label them as mock evidence. Use actual authenticated runtime sessions for product claims.
5. Run the authorized Samsung Galaxy S20 Android journey and an available authorized iOS simulator/physical or TestFlight session. No native build is included in this planning phase.

**Acceptance:** no clipping or overlap; controls are reachable; labels are accurate; runtime evidence names the exact platform, build, source SHA, account fixture, and date.

### Phase H — Security, reliability, telemetry, and final release certification (Required for Launch)

1. Run disposable non-BYPASSRLS tenant tests for recipes, media, saves, sync, and deletion.
2. Test bearer authentication, owner predicates, signed URL issuance, payload validation, idempotency, account cache boundaries, rate limits, provider timeout/error paths, and deletion.
3. Add pagination and offline property/regression tests, rendered interaction tests, and end-to-end scenarios.
4. Add privacy-safe recipe telemetry and verify alertability without personal data.
5. Capture exact API/web/native provenance, migration state, test totals, deployment IDs, and known limitations in a numbered final report.

**Acceptance:** every claimed PASS has objective evidence; skipped tests are listed with reason; source tests are not presented as device or production proof.

## 5. Cost analysis and architecture options

### 5.1 What is and is not currently charged

- **Recipe photo generation:** one OpenAI Images request per generated recipe attempt in the current lifecycle, using `gpt-image-2.5-flare`, low quality, 1024 square, `n: 1`. Related provider cards do not appear to invoke this image generator merely by rendering.
- **Nutrition estimation:** separate OpenAI chat-completion calls on cache misses or stale refreshes. Existing single-flight, L1/L2 cache, concurrency, and hourly-window guards reduce amplification but need live usage evidence.
- **Storage/CDN:** generated PNG upload and signed retrieval incur provider storage/egress costs; current evidence does not contain measured byte volume, retention, cache-hit ratio, or billing.
- **Unknown:** exact image tokens per generated output for GPT Image 2.5 Flare, provider retry billing, actual monthly image-generation calls, and storage/CDN bills. These must be instrumented or obtained from authorized billing telemetry before claiming a production dollar total.

### 5.2 Transparent sensitivity model

The official model page prices image output at $30 per million image tokens Standard, but does not provide a GPT Image 2.5 per-image calculator. The following is therefore a sensitivity model, not a bill forecast. It assumes 0.25 generated recipe-photo requests per monthly active user, one billed attempt per request, and estimated output-token scenarios of 1,000 / 2,500 / 5,000 tokens, corresponding to $0.03 / $0.075 / $0.15 per successful generation. It excludes text prompt tokens, retries, storage, CDN, and nutrition calls.

| MAU | Assumed photo calls | $0.03/call | $0.075/call | $0.15/call |
|---:|---:|---:|---:|---:|
| 1,000 | 250 | $7.50 | $18.75 | $37.50 |
| 10,000 | 2,500 | $75.00 | $187.50 | $375.00 |
| 100,000 | 25,000 | $750.00 | $1,875.00 | $3,750.00 |

If every active user generates one new recipe per month, multiply the table by four. The first implementation task should add counters for generation intents, provider calls, retries, successful stored images, rejected images, duplicate/idempotent replays, output bytes, and cache/media reuse. After one measured billing window, replace sensitivity estimates with observed unit economics.

### 5.3 Options

| Option | Cost | UX | Complexity | Reliability | Recommendation |
|---|---|---|---|---|---|
| **A. Preserve all related recipes with existing images** | Lowest incremental image cost; provider/CDN costs remain | Rich browsing | Low | High if provider fallbacks are explicit | **Adopt now** |
| **B. Progressive recommendations, 8–12 initially** | Reduces network/egress and avoids unnecessary provider pages | Fast initial detail, more on demand | Low/medium | High | **Adopt now** |
| **C. Shared image catalogue by stable identity** | Amortizes generated images across users, but storage/licensing and ownership complexity increase | Consistent imagery | High | Medium/high after governance | Consider later for explicitly licensed Calora-owned recipes |
| **D. Remove/reduce recommendations** | Lowest cost | Reduces discovery value | Low | High | Do not choose unless measured costs prove material |
| **E. Recommended hybrid** | Durable generated media only for user-created recipes; provider images for browse; bounded progressive suggestions; asynchronous generation; one asset per stable semantic identity; aggressive resize/WebP derivatives | Preserves value while controlling cost | Medium | Highest practical balance | **Preferred** |

Do not switch providers, raise image quality, add background pre-generation, or generate images for related cards before measured cost and quality evidence support it.

## 6. Classification matrix

### Required for Launch

- Source/dist/deployment parity for recipe media.
- Stable semantic identity and durable owner-scoped media lifecycle.
- Server idempotency and interrupted-job recovery.
- Explicit web/native catalogue-count contract and stable pagination.
- No permanent Discover/Plus loading locks; provider failures distinct from empty results.
- Canonical serving behavior for all downstream uses.
- Signed-in save/remove synchronization or an explicit product decision that saves are device-local; for the mission’s stated cross-device contract, synchronization is required.
- Correct duplicate-save feedback and saved-count reconciliation.
- Remove the unwanted card label without fabricating nutrition.
- Tenant isolation, deletion, signed URL, rate-limit, and input-validation evidence.
- Genuine web, Android, and iOS runtime evidence for the claimed release scope.
- Truthful personalization wording and Coach context boundaries.

### Important Improvement

- Bounded account-aware ranking using already available goals/diary/planner facts.
- Progressive related suggestions and image derivatives.
- Privacy-safe recipe telemetry dashboards and alert thresholds.
- Expanded rendered accessibility and large-text coverage.
- Better restoration tooling and operator repair commands.

### Future Enhancement

- Shared Calora-owned image catalogue with licensing registry.
- Full allergy/intolerance safety controls and ingredient ontology.
- Advanced recommendation ranking or embeddings.
- Rich offline-first recipe editing and multi-device conflict UI.
- Provider diversification after measured reliability/cost justification.

## 7. Risks, dependencies, and rollback

- **Data migration risk:** save/sync and structured ingredients need additive schema changes, backfill markers, and reversible dual-read/dual-write rollout. Never overwrite raw ingredients or delete local records during migration.
- **Identity risk:** changing semantic versions must preserve legacy lookup and mark old media as legacy; never silently attach another account’s image.
- **Provider risk:** OpenAI outages must degrade to retryable states, not generic food imagery or false nutrition.
- **Cost risk:** async workers and retries can amplify bills; enforce per-account and global budgets before enabling them.
- **UX risk:** explicit missing nutrition and pending states may add friction; validate copy and accessibility rather than hiding uncertainty.
- **Release risk:** generated artifacts, API schema, migrations, web bundle, and native clients must be versioned together. Any candidate change invalidates affected prior runtime evidence.
- **Rollback:** ship additive API fields and feature flags; preserve legacy read paths; pause new generation intents without deleting existing accepted media; roll back UI independently from data writes; use reconciliation jobs to complete or safely expire in-flight intents.

## 8. Final planning acceptance criteria

Implementation may be considered complete only when all of the following are evidenced:

1. Source, generated runtime artifact, build pipeline, and deployed provenance agree on recipe-media semantics.
2. Equivalent recipe content produces the same owner-scoped durable media identity; meaningful content changes create a new version without collision or leakage.
3. Duplicate/replayed/interrupted photo requests are idempotent and recoverable, with no duplicate charge/work beyond documented provider behavior.
4. Web and native show the same underlying catalogue contract and distinguish available, filtered, loaded, and continuous-browse quantities.
5. Discover and Plus recover from long scrolling, tab changes, refreshes, timeouts, provider errors, and offline transitions without permanent locks or duplicate cards.
6. “Nutrition unavailable” is absent from cards and handled honestly in detail-dependent workflows.
7. Serving changes are consistent across ingredients, nutrition, diary, planner, shopping list, and saved presentation, with conservative unparseable handling.
8. Signed-in saves and removals reconcile across devices, offline queues, account switches, reinstall/session renewal, and deletion without cross-tenant exposure.
9. Related recommendations do not trigger image generation on render; initial load is bounded and further loading is intentional.
10. Tenant isolation, authorization, signed URLs, deletion, rate limits, telemetry privacy, and provider error handling have disposable-test evidence.
11. Web, Android, and iOS runtime evidence covers the required recipe journeys and clearly distinguishes real-device evidence from mocks.
12. The final numbered certification report records exact tests, source SHAs, deployment/build IDs, limitations, and a Recipe readiness verdict separate from overall Calora launch readiness.

## 9. Owner decision requested

Phase 1 is complete. The recommended implementation scope is the smallest reliable set described in Section 2, sequenced through Phases A–H. The preferred cost architecture is **Option E**, retaining useful provider-backed recommendations while preventing recommendation rendering from triggering paid image generation.

**Implementation has not started.** Approval is requested to begin Phase 2 under the mission authority, with the following explicit boundaries retained: no destructive production data action, no security bypass, no public store release, no unapproved recurring cost, and no production deployment or native build unless separately authorized by the existing release process and applicable project rule.
