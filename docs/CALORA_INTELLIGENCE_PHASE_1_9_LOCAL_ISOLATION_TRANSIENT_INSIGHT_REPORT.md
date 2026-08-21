# Calora Intelligence Phase 1.9: Local Isolation and Transient Insight Engine

## Executive verdict and rollout decision

Phase 1.9 hardens the existing account-scoped local foundation and adds a restricted contextual selector. The selector is a pure local calculation over already-derived Foundation facts. Following a separate safety review, the Progress tab is the sole approved visible consumer. It recomputes one eligible current-account result from local state during render; it is not mounted in a cache, Coach context, background worker, API route, or persistence layer.

**Rollout decision: restricted Progress delivery approved.** Only `intelligence.insights.progress` is enabled. The server-facts adapter, Today and post-log delivery, Coach fact context, feedback, and proactive behavior remain disabled.

## Local persistence map and account boundary

| Domain | Boundary |
| --- | --- |
| Broad Calora local state | Account-scoped AsyncStorage key derived from the authenticated identity; guest state has a separate namespace. |
| Diary sync bookkeeping | Account-scoped persisted IDs, signatures, and rejection records, with in-memory bookkeeping reset on scope change. |
| Protected recipe query responses | Query keys include the authenticated account identity. |
| React Query runtime | Account scope changes rebuild the query client. |
| Calora runtime state | Account scope changes remount the Calora provider before another identity hydrates. |
| Profile photo | The sign-out path deletes the current local file before the authentication session ends; hydration verifies that any persisted URI still points to a file. |
| Legacy fixed key | Never read into an account. It is copied verbatim into a non-account quarantine key before source deletion; failed copies leave the source untouched. Conflicting recoverable values are left intact. |

This design preserves returning users’ account namespaces. It intentionally does not guess ownership for pre-isolation device-wide state.

## Sign-out and account-switch lifecycle

Sign-out first removes the active profile photo file and URI while the current account is still mounted. When Supabase confirms sign-out, the root scope changes to guest, which hard-remounts the Calora provider and Query client before guest hydration. A failed sign-out does not switch scope, so the existing account remains mounted and no new account observes its state. Provider-level tests cover both the A → guest scope change and the unchanged-scope failed-sign-out case.

On an A → B switch, the root scope changes from A to B. The keyed provider and Query client discard A runtime state/cache; B then hydrates only B's key. The diary-sync generation guard resets in-memory bookkeeping and discards async results that finish after the account changes. A returning A rehydrates only A's preserved namespace. Provider-level tests cover switching while A hydration is unresolved, a pending A autosave during the change, unchanged-account token refresh, and the guest sign-out boundary.

Persistence writes remain serialized. Clears wait behind pending writes and reject writes started during a clear. Account-scoped persistence managers retain their original key, so a pending A write cannot land in B storage during a rapid switch. Storage read or write failures remain non-destructive: hydration blocks autosave after an error, and a failed legacy quarantine leaves the original snapshot available for recovery.

## Transient selector contract

`selectContextualInsight` accepts only Foundation `IntelligenceFact[]` input. It returns at most one structured value with category, priority, supporting derived-fact references, sanitized evidence classification (origin, quality, and count only), confidence, freshness, active/no-insight state, reason, and deterministic generation time.

Allowed categories are limited to:

1. Current calorie status
2. Macro balance
3. Meal distribution
4. Logging completeness
5. Weight baseline

Priority is deterministic: calorie-target status (400), macro balance (300), meal distribution (200), and descriptive weight baseline (100). Confidence must be high or medium, facts must be fresh, and all facts must share one source watermark. The selector otherwise returns `stale`, `low_confidence`, `insufficient_data`, or `no_insight`; it does not fabricate an active result.

The module imports no storage, React, server client, Coach code, or network client. Its output excludes account identifiers, food names, notes, photos, and raw local state.

## Approved Progress delivery boundary

The Progress overview may render one selector result only after Calora hydration completes and only while `intelligence.insights.progress` is enabled. The screen creates a read-only local Foundation snapshot for the current local calendar day, passes it through the delivery gate and existing selector, and renders only an `active` result with `fresh` freshness.

- The card is not held in React state, a provider, AsyncStorage, React Query, Coach messages, analytics, or any network request.
- On hydration reset it evaluates to `null` synchronously. Sign-out and account switching remount the account-scoped provider; the card has no previous-account value to flash and can only recompute from the next hydrated scope.
- The display exposes only the selector's pre-sanitized title and message. It does not expose evidence identifiers, raw food names, notes, photos, account identifiers, or source log IDs.
- Accessibility uses a concise `summary` label containing the same title and message that are visibly rendered. It is informational and does not introduce an action or navigation path.
- The enabled flag is intentionally limited to this one surface. A disabled flag, unfinished hydration, insufficient evidence, stale facts, mixed watermarks, and low confidence all render no card.

## Privacy proofs

- **No persistence:** no Intelligence persistence key or state store was introduced. Selector tests spy on storage writes and verify that input facts are unchanged. The selector is not passed to AsyncStorage, PostgreSQL, Supabase, files, Coach history, living memory, React Query, or analytics.
- **No network:** selector tests replace `fetch` and prove zero calls. The module has no network, provider, API-client, or server-adapter import.
- **Sensitive logging:** the selector contains no logging call. Tests verify no log call during selection and assert result serialization omits raw meal name, notes, source-log identifiers, and account-like identifiers.
- **Cross-account insights:** because output is not retained in a cache or UI state, the next account recomputes from only its facts. Tests execute an A-derived active result followed by B-derived empty facts and verify B receives only an inactive result with no A data.

## Validation evidence

Focused validation completed on the development workspace:

- Calora TypeScript typecheck: passed.
- Focused account-isolation, legacy quarantine, Foundation, hardening, selector, and performance suites: **5 files, 32 tests passed**. The provider-level lifecycle suite also passed **16 tests**, including unresolved hydration, sign-out, failed sign-out, token refresh, and pending-autosave cases.
- Full Calora suite: `pnpm --filter @workspace/calora test` — **52 files, 902 tests passed**, plus **6 static-server security tests passed**.
- API typecheck: `pnpm --filter @workspace/api-server run typecheck` — passed.
- Full API suite: `pnpm --filter @workspace/api-server test` — **20 files, 228 tests passed**.
- Representative local timing samples (100 iterations; development machine, not a device benchmark):
  - Context adaptation: 0.1987 ms
  - Evidence partitioning: 0.0220 ms
  - Watermark generation: 0.2051 ms
  - Fact generation: 0.4091 ms
  - Insight selection with fact generation: 0.3966 ms

The selector tests prove deterministic selection, strict allowed-category output, priority ordering, stale/mixed-watermark rejection, insufficient/low-confidence suppression, no mutation of inputs, no storage write, no fetch, no logging, and no raw meal/note/account data in output. Account-storage tests prove A/B namespace separation, queued-write separation, legacy copy-before-delete behavior, and non-destructive quarantine failure handling.

The app preview also loaded successfully at the onboarding screen in a 402×874 mobile viewport. Browser output contained only pre-existing development/web warnings for Expo notifications and deprecated shadow style props.

## Files changed

Created:

- `artifacts/calora/lib/intelligence/insightSelector.ts`
- `artifacts/calora/lib/__tests__/insightSelector.test.ts`
- `docs/CALORA_INTELLIGENCE_PHASE_1_9_LOCAL_ISOLATION_TRANSIENT_INSIGHT_REPORT.md`

Modified:

- `artifacts/calora/lib/accountStorage.ts`
- `artifacts/calora/context/CaloraContext.tsx`
- `artifacts/calora/lib/intelligence/types.ts`
- `artifacts/calora/lib/intelligence/index.ts`
- `artifacts/calora/lib/__tests__/accountStorage.test.ts`
- `artifacts/calora/lib/__tests__/intelligencePerformance.test.ts`

## Acceptance gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Local account isolation | PASS | Distinct account/guest namespaces plus A → B → A persistence test |
| Sign-out safety | PASS | Sign-out retains pre-auth photo cleanup and guest provider remount boundary |
| Account-switch safety | PASS | Keyed provider/query-client replacement, scoped sync reset, A → B → A test |
| Legacy state migration | PASS | Copy-before-delete quarantine; failed copies preserve the original |
| Cache isolation | PASS | Scoped Query client and protected recipe keys retain account identity |
| Insight determinism | PASS | Repeat-input test produces identical structured output |
| Confidence/freshness gates | PASS | Low/insufficient/stale/mixed-watermark tests |
| No persistence | PASS | No new state/key path plus storage-write test |
| No network | PASS | Fetch-spy test and import boundary |
| No cross-user insight leakage | PASS | Explicit A-derived → B-derived selector regression test; no selector state exists to flash |
| Performance | PARTIAL | Representative Node/Vitest timing completed; this is not a native-device benchmark |
| Regression suite | PASS | Full Calora and API suites passed |

## Remaining unknowns and blockers

The restricted Progress card is the only authorized visible rollout. Native-device validation must be recorded with the release evidence before production publication: confirm the card appears only for eligible verified local data, disappears during sign-out and account switching, stays hidden for stale/low-confidence data, and announces its informational label correctly with VoiceOver and TalkBack. Existing database/RLS blockers remain unchanged.

## Recommended future Phase 2A scope

Any future delivery expansion still needs separate approval. It must recompute from Foundation facts, clear synchronously on hydration/scope reset, preserve all confidence/freshness gates, remain non-persistent and network-free, and add no Coach, background, server, database, or LLM integration.

## Explicitly not added

- Persistent Intelligence facts, insight history, profiles, or cache entries
- Intelligence network/API/server-adapter behavior
- UI delivery outside the approved Progress overview (Today, post-log, Planner, Recipes, or Coach)
- Coach context changes, analytics payloads, background computation, notifications, or LLM state
- Database, RLS, deployment, or production-build changes