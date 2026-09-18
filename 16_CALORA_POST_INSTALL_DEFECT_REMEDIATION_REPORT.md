# 16 — Calora Post-Install Defect Remediation Report

## 1. Executive summary

This report records the source-level remediation and deterministic validation for owner-reported issues 1–13. Evidence is deliberately separated as follows:

- **Verified source behavior** means the behavior is directly traceable in the current working tree.
- **Test evidence** means automated tests exercised the behavior. It is not a claim about a physical device.
- **Owner observation** means behavior reported from the installed release candidate.
- **Owner-device-only evidence** means the result cannot be established by source or deterministic tests and still needs exact-device validation.
- **Warning** means a known non-failing validation or security finding.

The current tree contains targeted fixes for keyboard-safe onboarding, consent clarity, Coach request lifecycle safety, recipe catalogue caching and pagination, stable Discover rotation, nutrition provenance, the Progress history action, and Camera-to-Today durability. The current onboarding completion implementation is an account-scoped durable commit: it writes and flushes the completed snapshot before publishing completion in React state. Importantly, the owner's onboarding replay observation was **not reproduced against current source**. This report therefore does not claim a global onboarding fix or physical-device closure; the exact owner device/install/account transition must be revalidated.

Recorded final validation is green: mobile Vitest **87 files / 1214 tests passed**; mobile static server **6/6 passed**; API **36 files passed + 1 skipped / 460 passed + 4 explicitly skipped**; Calora, API, and library typechecks passed; and `git diff --check` passed. Focused Plus/Recipes validation passed **3 files / 21 tests**, focused API Premium validation passed **1 file / 31 tests** (focused total **52**). There are no remaining source P0, P1, or P2 blockers. Physical-device revalidation remains required.

## 2. Owner-observed defects

| Issue | Owner observation/question | Classification before remediation | Current evidence boundary |
|---|---|---:|---|
| 1 | Onboarding inputs can be obscured by the keyboard. | P2 | Source fix + deterministic structural tests; device test required. |
| 2 | Onboarding appeared again after completion/relaunch. | P1 owner observation | Current durable, account-scoped path verified in source; original replay not reproduced in current source; exact-device revalidation required. |
| 3 | Final onboarding agreement was unclear. | P2 | Source fix + deterministic accessibility/label tests; device usability test required. |
| 4 | Coach required end-to-end completeness and sanitization review. | P1/P2 reliability and trust boundary | Source hardening + request-boundary tests; provider/device/network behavior still requires live validation. |
| 5 | Plus recipes reloaded when reopening the submenu. | P2 | Source cache fix + component/state tests. |
| 6 | Plus pagination stopped almost immediately. | P2 | Client/server cursor fixes + API/mobile tests. |
| 7 | Discover/Plus repeatedly showed the same top recipes. | P2 | Account-and-UTC-day stable rotation for unfiltered Discover **and default unfiltered Plus**; Plus also preserves account-scoped loaded inventory, cursor truth, and pagination. |
| 8 | Some Discover cards lacked calorie/nutrition information. | P2 | Explicit verified/estimated/partial/unavailable policy + normalization tests. |
| 9 | Progress history/memory icon needed to move left and grow slightly. | P3 | Source adjustment + structural test; visual device validation required. |
| 10 | Accepted Camera food did not appear on Home → Today. | P1 | Failure-atomic serialized acceptance + durable outbox/server retry + deterministic tests; end-to-end device validation required. |
| 11 | What exactly happens after Connect Health Data, and where does data appear? | OBS | Exact implementation trace in section 15; native permission/provider behavior needs device validation. |
| 12 | Reduce future bugs substantially. | Engineering hardening | Anti-regression outcomes and remaining roadmap recorded in section 17. |
| 13 | Map all application/data/user flows. | Forensic deliverable | No single runtime defect; architecture boundaries identified here and the complete map belongs to report 17. |

## 3. Root cause of every issue

1. **Keyboard-safe onboarding:** the onboarding route used a plain `ScrollView`. It could scroll but did not react to focused-input keyboard geometry or reserve sufficient keyboard/safe-area space.
2. **Onboarding replay:** the owner-observed replay was not reproduced in the current source. The current completion path already uses the account-derived storage key and awaits a persistence flush before setting completion. A plausible historical failure mode—redirecting on memory state before durable write—is explicitly prevented by current code, but without the exact installed binary/storage/auth timeline it is not evidence of the owner's original root cause. No global flag was introduced.
3. **Consent clarity:** the old control was a tappable card without an explicit “required” label, checkbox semantics/state, or a final-button label that explained the blocked action.
4. **Coach:** same-tick duplicate submits could precede React's disabled-state render; pending responses could race clear/account/hydration changes; an older completion could affect a newer request nonce; transport failures were not fully reduced to typed safe UI states; and requests needed a hard timeout and runtime response validation.
5. **Plus cache:** catalogue-local loaded state could be lost when the submenu remounted. Re-publishing identical loaded state could also create a parent/child update loop. Cache ownership needed to include account identity.
6. **Plus pagination:** placeholder data from the previous offset could be mistaken for the current page; provider offsets could fail to advance when normalization/deduplication reduced the returned row count; and zero-unique or non-advancing pages lacked an explicit terminal condition.
7. **Freshness:** default Discover and default unfiltered Plus previously exposed stable provider ordering, so the first slice repeated. Plus had no day seed or seen-history strategy; its client retained loaded account state across remounts, but retention did not create freshness. Naive render-time randomization would have broken pagination. Search and category results already had relevance/provider ordering and therefore must not be shuffled.
8. **Nutrition:** provider normalization accepted negative values and could label an incomplete macro set as verified. The card policy also lacked explicit partial and unavailable labels. Non-finite values needed rejection.
9. **Progress action:** the history/memory action was 34 pt with a 16 pt icon and relied on hit slop. Its footprint did not produce the requested slight leftward shift.
10. **Camera → Today:** acceptance could read a stale React closure immediately after draft creation/edit; concurrent accepts were not coalesced/serialized; visible state could change before durable persistence; and the best-effort approval request was not itself a durable retry path.
11. **Health data:** this was primarily a documentation/trace question, not a newly proven defect. The implementation has real native reads and visible destinations, but workouts are fetched and stored without a direct UI destination.
12. **Anti-regression:** high-risk state transitions needed testable coordinators, explicit trust boundaries, account fences, durable commit boundaries, and API contract fields rather than implicit UI timing.
13. **Full flow mapping:** no single root runtime cause applies. The forensic requirement exists because behavior spans navigation, account-keyed local state, sync/outbox, APIs, providers, and native services; those boundaries must be mapped and tested explicitly.

## 4. Exact files changed

The following is the complete remediation implementation set reported by current `git status`, excluding the uploaded mission attachment. The report itself is a deliverable, not an application source/test/generated change.

**API source (5)**

- `artifacts/api-server/src/lib/premiumRecipes.ts`
- `artifacts/api-server/src/routes/capture.ts`
- `artifacts/api-server/src/routes/premiumRecipes.ts`
- `artifacts/api-server/src/routes/recipes.ts`
- `artifacts/api-server/src/routes/sync.ts`

**API tests (5)**

- `artifacts/api-server/src/__tests__/capture.test.ts`
- `artifacts/api-server/src/__tests__/premiumRecipes.test.ts`
- `artifacts/api-server/src/__tests__/recipes.test.ts`
- `artifacts/api-server/src/__tests__/sync.integration.test.ts`
- `artifacts/api-server/src/__tests__/sync.test.ts`

**Calora source (13)**

- `artifacts/calora/app/(tabs)/insights.tsx`
- `artifacts/calora/app/(tabs)/planner.tsx`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/app/(tabs)/scan.tsx`
- `artifacts/calora/app/coach.tsx`
- `artifacts/calora/app/index.tsx`
- `artifacts/calora/context/CaloraContext.tsx`
- `artifacts/calora/lib/captureAcceptanceCoordinator.ts` *(new)*
- `artifacts/calora/lib/intelligence/coachFactContextClient.ts`
- `artifacts/calora/lib/intelligence/coachFactRequestLifecycle.ts`
- `artifacts/calora/lib/intelligence/useCoachSendAdapter.ts`
- `artifacts/calora/lib/premiumCatalogueState.ts` *(new)*
- `artifacts/calora/lib/recipeModel.ts`

**Calora tests (10)**

- `artifacts/calora/lib/__tests__/captureAcceptanceCoordinator.test.ts` *(new)*
- `artifacts/calora/lib/__tests__/captureAcceptancePersistence.test.ts` *(new)*
- `artifacts/calora/lib/__tests__/captureReview.test.ts`
- `artifacts/calora/lib/__tests__/coachFactContextClient.test.ts` *(new)*
- `artifacts/calora/lib/__tests__/coachFactCoordinator473.test.ts`
- `artifacts/calora/lib/__tests__/livingMemoryHeader.test.ts` *(new)*
- `artifacts/calora/lib/__tests__/onboardingScreen.test.ts` *(new)*
- `artifacts/calora/lib/__tests__/premiumCatalogueState.test.tsx` *(new)*
- `artifacts/calora/lib/__tests__/recipeModel.test.ts`
- `artifacts/calora/lib/__tests__/recipesScreen.test.ts`

**API specification/generated contract files (4)**

- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/generated/types/premiumRecipeList.ts`
- `lib/api-zod/src/generated/types/recipeList.ts`

**Forensic deliverables and durable agent note (3)**

- `16_CALORA_POST_INSTALL_DEFECT_REMEDIATION_REPORT.md` *(new)*
- `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md` *(new)*
- `.agents/memory/local-persistence-recovery.md` *(updated with the general lazy/serialized snapshot-transaction rule learned during review)*

The uploaded mission attachment remains unmodified and untracked. No application source, test, config, or generated contract was changed merely to produce these reports.

### Plus freshness closure addendum — exact implementation files (13)

- `artifacts/api-server/src/__tests__/premiumRecipes.test.ts`
- `artifacts/api-server/src/lib/premiumRecipes.ts`
- `artifacts/api-server/src/routes/premiumRecipes.ts`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/lib/premiumCatalogueState.ts`
- `artifacts/calora/lib/__tests__/premiumCatalogueState.test.tsx`
- `artifacts/calora/lib/__tests__/premiumRecipeQueryKeys.test.ts`
- `artifacts/calora/lib/__tests__/recipesScreen.test.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-zod/src/generated/types/listPremiumRecipesParams.ts`
- `lib/api-zod/src/generated/types/recipeList.ts`

Closure documentation/memory artifacts are this report, report 17, new report 18, `.agents/memory/MEMORY.md`, and new `.agents/memory/plus-recipe-freshness.md`. This addendum supersedes earlier wording that described Plus retention as its only freshness behavior.

## 5. Onboarding keyboard fix

**Verified source behavior:** `app/index.tsx` now places all onboarding `TextInput` instances and bottom actions in one `KeyboardAwareScrollViewCompat`; there is no nested `ScrollView`. It uses:

- `bottomOffset={insets.bottom + 88}`;
- `extraKeyboardSpace={24}`;
- content bottom padding of `insets.bottom + 118`;
- `keyboardShouldPersistTaps="handled"`;
- iOS `keyboardDismissMode="interactive"` and Android `keyboardDismissMode="on-drag"`; and
- a `flexGrow: 1` content container, allowing the action area to remain reachable on short screens and with larger content.

The compatibility component provides focused-input keyboard awareness while the single vertical container avoids nested-scroll conflict.

**Test evidence:** `onboardingScreen.test.ts` proves one keyboard-aware container, no plain nested scroll, the keyboard offsets/dismissal settings, and containment of every onboarding text input.

**Owner-device-only evidence:** verify the name, age, height, current-weight, and goal-weight fields plus Back/Continue on the owner's Android keyboard; repeat on iOS, a small viewport, and large Dynamic Type. Automated source assertions do not prove actual native keyboard geometry.

## 6. Onboarding persistence fix

**Verified current source behavior:** `CaloraProvider` derives `storageKeyForAccount(accountId)` and constructs `PersistenceManager` for that account/guest scope. Hydration completes before routing decides that onboarding is complete. `completeOnboarding`:

1. requires an initialized authoritative snapshot;
2. stages profile, consent, `onboardingComplete: true`, and `onboardingStep: 0`;
3. enqueues the complete snapshot to the account-scoped persistence manager;
4. awaits `pm.current.flush()`; and only then
5. updates the snapshot/ref/React completion state and clears the draft.

On hydration, an explicit `onboardingComplete` value is honored; legacy snapshots with a profile but no flag are treated as completed. Guest and signed-in identities use separate account storage keys, and provider teardown fences account-switch Coach/health work. There is no global completion flag leaking one user's state to another.

**Critical evidence qualification:** the owner's observed “complete → close → reopen → onboarding repeats” sequence was **not reproduced in current source**. The durable path described above is the current account-scoped behavior, not proof that every historical installed binary or guest-to-auth transition was fixed. No global fix is claimed. Exact-device revalidation must cover immediate process kill after completion, cold launch, sign-out, sign-in to the same account, a different account, and guest-to-auth transition.

**Test evidence:** the full mobile suite includes persistence, hydration, account-storage, clear-data, and onboarding coverage and passed. The new onboarding test is structural UI coverage; it does not itself emulate an owner-device process kill.

## 7. Agreement screen fix

**Verified source behavior:** consent remains unchecked for first-run onboarding. The final screen now displays **“Required to continue”**, a prominent tappable card titled **“I agree to these wellness terms”**, and explicit scope: Calora is a wellness tool rather than medical care, AI estimates must be reviewed before logging, and calorie targets are starting estimates. The control has checkbox role, checked state, an explicit checked/unchecked accessibility label, and a toggle hint. The whole padded card is the touch target.

The final button is disabled until consent is selected. While disabled it says **“Check agreement to continue”**; once selected it says **“Agree & enter Calora”**. Helper text explains exactly what to tap next. Review mode represents previously accepted setup and uses “Save changes”; first-run consent is not pre-checked.

**Test evidence:** `onboardingScreen.test.ts` asserts required text, consent scope, checkbox semantics/state, stable test IDs, and disabled final-action accessibility state.

**Owner-device-only evidence:** screen-reader announcement order, actual contrast, tap comfort, and owner comprehension still require native validation.

## 8. Coach sanitization/completeness audit

**Verified source behavior:**

- A synchronous `sendInFlightRef` closes the rapid-tap window before React disables the composer/send button. Message input is trimmed and capped at 3,000 characters; persisted request history is bounded.
- Each send has a sequence ID and conversation generation. Clear/new-chat invalidates the adapter epoch, advances generation, clears visible/persisted history, composer, retry state, and loading state. Late completions cannot repopulate a cleared or switched conversation.
- Request nonce validation requires the response nonce to match the request. Lifecycle completion is scope-specific, so an older completion cannot cancel a newer nonce.
- The transport has a maximum 15-second `AbortController` timeout. Caller cancellation remains distinguishable from timeout.
- Failures are typed as auth, rate-limited, offline, timeout, server, malformed response, or transport. The UI renders fixed bounded messages, never raw provider/server exception text, and offers retry only for retryable classes.
- Runtime Zod validation occurs before provider output/actions reach UI. Malformed responses are rejected.
- Messages render through React Native `Text`; raw HTML is not interpreted, markdown/HTML execution is not enabled, and URLs are not auto-executed. A response containing unsupported script markup fails response validation in the added boundary test.
- Authenticated Fact Context sends only the frozen approved daily calorie/protein fact types and the bounded conversation. Mood, hydration, weight, plans, and Food Memory are excluded. Account ID, hydration generation, consent, clear, and account-switch lifecycle fences prevent stale cross-account acceptance.
- Guest Coach uses local general guidance, does not call the personalized provider, and does not store personal records. Authenticated history remains account-scoped local state. Loading, empty history, retry, clear confirmation, auto-scroll, keyboard-aware scrolling, and accessible live announcements are present.
- There is no fallback to retired Legacy Coach when Fact Context is unavailable.

**Test evidence:** new/changed Coach tests cover malformed response rejection, newer-nonce survival, bounded timeout/abort, caller abort, typed 401/403/429/503/offline/timeout/transport classification, stale lifecycle behavior, and clear/concurrency boundaries.

**Warnings and limits:** the UI intentionally renders plain text, not rich markdown, clickable links, or code execution. Provider availability, live rate limiting, OS network transitions, and native keyboard behavior require device/live-service checks. No claim is made that an external provider itself was exercised by the deterministic suite.

## 9. Plus caching fix

**Verified source behavior:** loaded Plus recipes are lifted into `RecipesScreen` as `premiumCatalogueState`, tagged with the current `userId`, and passed back when the Plus child is shown again. The active session captures its UTC `freshnessDay`. For the same account and day, a quick submenu remount restores the exact cards and order, search/category, offset, `nextOffset`, terminal state, and scroll position; cards are immediate rather than blank while a request runs. Filtered sessions restore across a day because default rotation is disabled for them.

`samePremiumCatalogueState` suppresses identical parent writes by comparing owner, length, recipe IDs, and images, preventing the child-publish/parent-render loop. A continuously active scroller is not reordered at midnight. On a real inactive/background → active transition on a new UTC day, or a new-day unfiltered remount, default cursor/terminal/scroll reset to page 0 while old cards remain visible; replacement is atomic only after a successful real page-0 response. The React Query key remains account-aware.

On account change and on list/detail 401 or 403, the implementation clears all protected Plus list/detail caches, lifted/saved/session state, and the selected Plus detail. This is a stronger fence than merely removing `['premium-recipes']` queries and prevents both stale cards and stale detail from crossing an entitlement or identity boundary.

**Test evidence:** `premiumCatalogueState.test.tsx` exercises the mounted publish lifecycle and equality behavior; `recipesScreen.test.ts` asserts account-scoped restore, account-change query removal, retained content, and retry/footer contracts.

## 10. Plus pagination fix

**Verified source behavior:** before this closure, default Plus sent empty query/category with `limit=18`, `offset=0`; FatSecret `/recipes/search/v3` used `page_number=floor(offset/limit)` and opaque provider order. After normalization/ID-dedup/image-dedup, the API returned `nextOffset`; the client rendered that order unchanged. The server now calculates provider-page boundaries independently from the count that survives normalization and deduplication. FatSecret advances by raw provider page and `total_results` when available; a generic provider cursor remains authoritative. It returns an advancing `nextOffset` or `null`, plus an explicit truthful `terminalReason`. This avoids premature exhaustion when a provider page contains invalid/duplicate rows.

The client applies a page only when it is not React Query placeholder data. Placeholder data cannot advance state. Later pages append only unique IDs, keep existing rows visible, block re-entry while fetching, and stop on explicit terminal reason, missing cursor, zero unique append with a next cursor, or a non-advancing cursor. Near-bottom/content-size triggers continue pagination, loading and retry footers remain available, and terminal exhaustion is shown instead of silently looping. No recipes are fabricated; rotation never crosses provider pages, invents rows, changes continuation, or fabricates infinity.

Discover also consumes the server `nextOffset` rather than deriving an offset from displayed rows and exposes an explicit terminal message.

**Test evidence:** API premium recipe tests cover provider ceilings, normalized/duplicate rows, cursor advancement, and terminal reasons. Mobile tests cover placeholder rejection, unique append, load-more guards, loop prevention, retry, terminal labels, and use of server cursors.

## 11. Discover/Plus freshness strategy

**Verified algorithm:** unfiltered Discover retains its existing account/day behavior. **Default unfiltered Plus now also has a deterministic, server-side freshness strategy.** `freshnessDay` is optional but validated as `YYYY-MM-DD` in OpenAPI and generated clients. The active client session captures the day. For each legitimate normalized recipe *within a single provider page*, the API forms a stable base rank from authenticated account ID plus recipe ID, then applies UTC-day rotation; no `Math.random`, request token, or token material participates. Rare hash ties preserve the provider page's original order. Only default unfiltered Plus is reordered; search/category requests preserve provider relevance and byte/order exactly.

Consequences:

- one account has a stable order for the whole UTC day, so pagination and caching do not reshuffle mid-scroll;
- different accounts and subsequent UTC days can receive different Plus top cards when a page has at least two legitimate normalized recipes;
- token refresh does not alter order because raw/request tokens are not in the seed;
- recipe IDs remain unique and entitlement boundaries are unchanged; and
- query or category requests are **not rotated**, preserving provider search/filter relevance.

Plus does not use unsafe render-time randomization. Static code cannot prove the live inventory has at least two legitimate normalized recipes, so visible variation is conditional on provider inventory and remains an owner device/network validation item. Discover implementation is otherwise unchanged.

**Test evidence:** focused API Premium tests verify default-only deterministic ordering, account/day variation, no token/random material, page containment, cursor/terminal truth, normalization/dedup and filter-order preservation. Focused mobile tests verify captured-day lifecycle, same-day restore/scroll, no active-midnight reorder, new-day atomic replacement, protected-cache clearing, placeholder rejection, and unique continuation.

## 12. Discover nutrition consistency fix

**Verified presentation policy:**

- **Verified:** all four principal provider values—calories, protein, carbohydrate, and fat—are present and the provider declares verified.
- **Estimated:** all four are present and explicitly estimated.
- **Partial:** at least one principal value exists but the complete set does not; available values may display, labeled **“Partial nutrition available.”**
- **Unavailable:** no usable principal value exists; the card displays **“Nutrition unavailable.”**
- Existing user-entered nutrition retains its explicit provenance.

Normalization rejects negative and non-finite numeric nutrition values. A partial set cannot be promoted to verified or estimated completeness. Cards conditionally show only supplied calories/macros, preserve estimated provenance, and provide the explicit partial/unavailable label rather than a broken blank. No nutrition value is fabricated. Existing nutrition warm-up/estimate behavior can populate an estimate when the server has a valid basis; genuinely absent values remain unavailable.

**Test evidence:** API tests cover complete, partial, absent, negative, and non-finite provider nutrition plus mixed pages. `recipeModel.test.ts` covers verified/estimated and explicit partial/unavailable labels; recipe screen tests assert provenance rendering and no invented macros.

## 13. Progress icon adjustment

**Verified source behavior:** the Progress living-memory/history action now has a direct **44 pt × 44 pt** target, a 22 pt radius, and an **18 pt** compass icon. Removing reliance on hit slop and widening the first action shifts its visible center slightly left while preserving the adjacent shopping action and header layout.

**Test evidence:** `livingMemoryHeader.test.ts` asserts the test ID, 44 pt control, and 18 pt icon.

**Owner-device-only evidence:** verify visual balance, safe area, and title/action spacing on Android, iOS, small/large screens, and large text.

## 14. Camera → Today data-flow fix

**Verified source behavior and flow:**

`capture/analyze → review draft → explicit Accept → serialized durable transaction → local log/outbox/memory/living-memory state → Home Today selector/totals → authenticated sync → owner-scoped capture approval`

- Analysis remains only a review draft; no diary log is created before explicit acceptance.
- `foodDraftsRef` is the synchronous authority, preventing a same-event accept from missing a newly created/edited draft.
- `CaptureAcceptanceCoordinator` coalesces concurrent accepts for the same draft and serializes transactions across drafts. A rejection does not poison the queue, so retry remains possible.
- Acceptance stages the complete next snapshot—Today log, draft removal, accepted memory, repeat patterns, living-memory observation, and diary outbox—then awaits persistence flush **before** publishing visible/ref state. If storage fails, no partial visible acceptance is committed and the draft remains retryable.
- Call sites now await acceptance before closing review UI or reporting success. The log's selected date/meal and nutrition enter the same `logs` collection consumed by Home/Today totals.
- The best-effort immediate `/v1/capture/:sessionId/approve` call is bounded to three seconds and does not block local/offline logging.
- Durable retry is the diary outbox carrying `captureSessionId`. During authenticated sync, the API validates the owner-scoped capture, upserts the diary row, and conditionally transitions review → approved in the same transaction.
- The direct approval endpoint is authenticated, owner-scoped, and idempotent: exactly one `review → approved` update occurs; later owner retries return 204. Missing/foreign/non-review sessions are not disclosed as another user's data.

**Test evidence:** coordinator tests cover coalescing, serialization, rejection, and retry. Persistence tests cover failure atomicity and durable state. Capture/API/sync integration tests cover authenticated approval, ownership, idempotence, outbox claim, and transaction behavior.

**Owner-device-only evidence:** take a photo, review/edit, accept, verify the correct Today meal and immediate macro totals, navigate away/back, kill/relaunch, reconnect after offline acceptance, and confirm no duplicate.

## 15. Health-data implementation trace

### Exact flow diagram

`Profile → Manage health data → Connect → platform availability → native permission sheet → request read-only types → connection state → immediate sync when connection is syncable → today's native reads → normalized HealthSnapshot → account-scoped encrypted snapshot + imported weight entries → Home/Progress consumers`

Automatic refresh also occurs after hydrated launch for an existing connection, when the app becomes active, and when the foreground app crosses a local-day boundary. “Sync now” provides success/failure feedback. “Disconnect” invalidates in-flight health work and clears Calora's connection/snapshot state; it does not revoke OS permissions.

### Twenty required answers

1. **Android provider:** Android Health Connect via `react-native-health-connect`.
2. **iOS provider:** Apple HealthKit via `@kingstinct/react-native-healthkit`.
3. **Requested read permissions/types:** Android `Steps`, `ActiveCaloriesBurned`, `ExerciseSession`, and `Weight`; iOS `HKQuantityTypeIdentifierStepCount`, `HKQuantityTypeIdentifierActiveEnergyBurned`, `HKQuantityTypeIdentifierBodyMass`, and `HKWorkoutTypeIdentifier`. Calora requests reads only; it does not write health records.
4. **Actually read:** today's step aggregate, today's active-energy aggregate in kcal, today's exercise/workout records, and weight records (Android within today's range; iOS most recent body-mass sample).
5. **Implemented but unused:** normalized workout records are fetched and retained but have no direct current screen consumer. Steps, active energy, and weights do have consumers.
6. **Storage:** connection metadata and `HealthSnapshot` are held in `CaloraContext` and the account-scoped encrypted export snapshot. Health weights are additionally merged into the ordinary `weights` collection with health identity/provenance so Progress can consume them.
7. **Screens displaying data:** Home/Today displays active calories as Burned; Progress displays health steps and active energy and displays merged health weights in weight UI/charts; Profile displays connection, permission, sync, provider, last-sync, and error state.
8. **Widgets/cards/charts/insights:** Home Burned card; Progress health signal metrics/tracks for steps and active energy; Progress weight card/history/chart through merged weights. Workouts have no direct widget/chart.
9. **Dashboard/Home:** yes—fresh current-day active energy drives the Burned status/value. Past dates intentionally report unavailable.
10. **Progress:** yes—fresh steps and active energy are shown, and imported weights join Progress weight history.
11. **Insights:** in this codebase Progress and Insights are the same `insights.tsx` route; therefore yes, as described above.
12. **Coach:** no health metric is sent to the active personalized request. Although active energy enters the broader local intelligence context construction, the send path freezes and forwards only six approved calorie/protein consumed/target/remaining fact types; weight, mood, hydration, plans, and other facts are excluded.
13. **Planner:** no direct health snapshot consumer was found.
14. **Calorie/activity calculations:** active energy supplies the displayed Burned value and may be available to local intelligence context, but it does not alter the onboarding calorie recommendation or food-consumption totals. Steps/workouts do not alter calorie targets. Imported weight affects the same weight-progress views as manual weights.
15. **Immediately after connecting:** the native permission flow opens. If the resulting connection is syncable, Calora immediately syncs; the profile modal shows connected/provider/last-sync state, and fresh values become available on Home and Progress. On iOS, Apple does not reveal per-category read grants; Calora records authorization as requested and only displays a metric when HealthKit returns a measured value.
16. **No data:** absent/empty values remain `null`, not fabricated zero. Home/Progress show syncing, permission review, unavailable, or an em dash/unavailable state as appropriate.
17. **Permissions denied:** Android returns `denied` if no requested grants exist; Calora explains that it continues locally and reads no health data. Partial Android access is represented as partial. iOS category denial is intrinsically indeterminate; empty reads remain unavailable.
18. **Permissions later revoked:** foreground/launch/manual sync re-reads connection/permission state. Android can become not-connected/partial and skips unavailable reads. iOS may continue to report request completion, but denied/empty quantities remain unavailable; sync errors are surfaced. The user must change OS permission in Health/Health Connect.
19. **Provider unavailable:** availability probe/request returns provider-specific unavailable; generic/web service is unsupported and throws on sync. Profile explains that Calora continues without health data.
20. **Fetched but never shown:** workout records are currently fetched into `HealthSnapshot.workouts` but not directly rendered or used by Dashboard, Progress, Coach, or Planner. This is a documented UX/data-flow gap, not hidden as completed functionality.

**Evidence qualification:** this trace is verified from current source. Native provider installation, permission-sheet wording, denial/revocation behavior, and actual records remain owner-device-only evidence.

## 16. Test results

Recorded final validation evidence:

| Validation | Result |
|---|---|
| Mobile static server suite | **6/6 passed; 0 failures** |
| Focused mobile Plus/Recipes | **3 files passed; 21 tests passed** |
| Focused API Premium | **1 file passed; 31 tests passed** |
| Focused freshness total | **52 tests passed** |
| Calora mobile Vitest | **87 files passed; 1214 tests passed; 0 skipped/failures** |
| API Vitest | **36 files passed + 1 skipped; 460 tests passed + 4 explicitly skipped; 0 failures** |
| Calora typecheck | **Passed** |
| API typecheck | **Passed** |
| Library/workspace typechecks | **Passed** |
| `git diff --check` | **Passed** |

**Warnings:** existing React `act(...)` warnings occurred in `profileScreen` tests. Provider/DB/503 logs were intentionally exercised by negative-path tests. These warnings/logs produced no test failures. The four skipped API tests and one skipped file are reported explicitly and are not represented as passes.

The suites provide deterministic source/component/unit/integration evidence. They do not replace the owner physical-device checks listed in section 18.

## 17. Security/regression results

### Security results

- Dependency audit: **0 critical, 2 high, 2 moderate**.
  - High: `js-yaml` **3.15.1** and **4.3.1**; patched versions **3.15.2** and **4.3.2** are available.
  - Moderate: Vitest toolchain stack; remediation requires a major update.
  - Dependency changes were outside this mission; none were installed or upgraded.
- SAST: **5 medium, 0 high, 0 critical**.
- HoundDog: **0 findings**.

These non-critical findings are warnings requiring a separately approved dependency/tooling cycle; they are not concealed as remediated.

### Anti-regression architecture outcomes

- **P0/P1/P2 source outcomes in this mission:** durable flush-before-publish boundaries for onboarding/capture; testable serialized capture coordinator; idempotent owner-scoped server approval; durable outbox retry; account-scoped recipe cache; deterministic server cursors/terminal states; account+UTC-day stable Discover ranking; runtime Coach schema validation, nonce/account/hydration fences, typed errors, and timeout; strict nutrition provenance; generated API contract synchronization.
- **P3 next hardening:** add physical-device automation for keyboard/process-kill/offline flows; add native Health Connect/HealthKit permission matrix tests; add visual regression and automated accessibility checks; add full navigation/account-switch E2E; instrument privacy-safe crash/timeout metrics; and schedule owner-approved `js-yaml`/Vitest upgrades.
- **Release discipline:** retain tests, typechecks, contract generation checks, `git diff --check`, dependency audit, SAST, and secret scan as gates. Do not add large tooling or alter dependencies without owner approval.

No build, Expo/EAS operation, workflow restart, push, publish/republish, DNS change, provider configuration change, or production data deletion occurred.

## 18. Remaining device-only tests

1. On the owner's exact Android device/install, complete first-run onboarding and immediately force-stop; relaunch and verify no replay.
2. Repeat onboarding persistence across guest use, same-account sign-in, sign-out/sign-in, different-account switch, and guest-to-auth transition; confirm no cross-account completion leakage.
3. Exercise every onboarding input with the native keyboard on small screen and largest supported font; verify focus visibility, scrolling, Continue reachability, and natural dismissal. Repeat representative coverage on iOS.
4. Confirm final consent is visibly required, starts unchecked, is announced correctly by TalkBack/VoiceOver, and enables the correctly labeled final action only after selection.
5. Rapid-tap Coach Send; clear while a request is pending; retry offline/timeout/rate-limit paths; switch accounts while pending; verify no late/stale/cross-account message.
6. Open default unfiltered Plus; record cards/order, search/category/offset/`nextOffset`/terminal/scroll; quick-remount same account/day and confirm exact immediate restoration with no blank. Keep a scroller active across UTC midnight and confirm no reorder. Background/inactive then activate on a new UTC day (and new-day default remount): old cards stay visible until one successful real page-0 response atomically replaces them. Verify filtered search/category restores across day without rotation, account switch and list/detail 401/403 clear all protected Plus state/detail, and later pages uniquely append through true provider exhaustion without duplicate, loop, or invented rows.
7. Reopen unfiltered Discover on the same UTC day and verify stable order; verify rotation on a subsequent UTC day/account; confirm search/filter relevance remains provider-ranked.
8. Inspect verified, estimated, partial, and unavailable nutrition cards on mixed live provider pages.
9. Verify the 44 pt/18 pt Progress history action's position and safe-area/title balance across target devices.
10. Camera capture → review/edit → Accept: verify immediate Today meal/totals, navigation persistence, process restart, offline acceptance/reconnect sync, and no duplicate.
11. Android Health Connect and iOS HealthKit: available/unavailable, full/partial/denied access, no data, measured zero, manual/automatic sync, later revocation, disconnect, and visible Home/Progress/Profile results.

Until these pass, installed-release behavior remains owner-device-only evidence.

## 19. Remaining blockers

- **Source blockers:** none at P0, P1, or P2 in the reviewed current tree.
- **Release evidence blocker:** owner physical-device revalidation is required, especially for onboarding replay, keyboard geometry, Camera-to-Today process/offline durability, live Plus freshness/day transitions/pagination, and native health permissions. Live provider inventory sufficiency (at least two legitimate normalized recipes for visible variation) cannot be proven statically.
- **Warnings, not source release blockers:** two high and two moderate dependency advisories, five medium SAST findings, existing React test `act` warnings, and intentional negative-path logs. Dependency remediation was outside mission scope.
- The owner onboarding replay observation remains unresolved as exact installed-device provenance: it was not reproduced in current source, and the report does not claim a global fix.

## 20. Final verdict

The targeted current-source remediation is complete, including default unfiltered Plus deterministic account-and-UTC-day freshness, and deterministic validation is green. No source P0/P1/P2 blocker remains. The result is not a physical-device certification. No Expo/EAS build, workflow restart, GitHub push, production publish/republish, DNS/Supabase/RevenueCat configuration change, dependency upgrade, or physical-device validation was performed. Owner validation of the exact installed-device flows is the remaining release gate.

POST-INSTALL REMEDIATION COMPLETE — OWNER DEVICE REVALIDATION REQUIRED