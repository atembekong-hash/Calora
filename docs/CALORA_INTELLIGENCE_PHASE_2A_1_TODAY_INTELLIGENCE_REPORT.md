# Calora Intelligence Phase 2A.1: Today Intelligence

## 1. Final status

**COMPLETE — controlled Today Intelligence implementation.**

Today/Home may now render zero or one optional contextual card from the active account’s current-day local Foundation facts. The implementation remains local-only, transient, hydration-gated, deterministic, feature-flagged, and fail-closed. No other Intelligence surface or capability was enabled.

## 2. Architecture reviewed

Phase 2A.1 reuses the established Phase 2A.0 pipeline:

```text
hydrated, current-account local state
  → isolated Foundation context snapshot
  → deterministic daily facts and source watermark
  → canonical contextual selector
  → surface-specific, stateless delivery gate
  → one optional Today card for the current render
```

The Today screen does not retain an insight in React state, provider state, AsyncStorage, React Query, a server response, analytics, Coach context, or any other storage. When hydration is false, the date is not today, the feature flag is off, or selection fails, the card is absent.

## 3. Implementation details

- The Today screen builds Foundation facts from the same account-local values already used by its existing daily display: profile, food logs, weights, local wellness/activity state, planner/shopping/recipe context, and fresh current-day active energy where available.
- It calls the existing pure selector through a dedicated Today delivery wrapper. The wrapper delegates all hydration, feature-flag, confidence, freshness, watermark, and malformed-input handling to the established visible-delivery gate.
- The integration is a secondary card placed after the diary/footer and before Planner, preserving primary Today information and logging actions.
- The card has a `summary` accessibility role and a label that mirrors its visible title and message. It exposes no evidence metadata, raw food names, notes, source-log identifiers, photos, or account identifiers.

## 4. Selector and cross-surface policy

Today and Progress share one canonical selector and therefore produce the same title, message, priority, confidence, and fact references from equivalent hydrated actionable fact snapshots.

The deterministic surface policy is:

- **Today allows:** current-day calorie status, macro balance, and meal-distribution observations returned by the canonical selector.
- **Today suppresses:** the descriptive `weight_baseline` result. Weight-baseline context remains Progress-only, so Today does not present it as a duplicate non-actionable observation.
- **Both surfaces suppress:** insufficient, low-confidence, stale, mixed-watermark, disabled, unhydrated, malformed, or otherwise unsafe input.

No cross-surface display-history state is introduced. A surface cannot know whether the user previously saw another surface without adding retained state; policy is therefore static, deterministic, and recomputed solely from the current snapshot.

## 5. Invariants preserved

| Invariant | Result |
| --- | --- |
| Foundation-only, deterministic computation | PASS |
| Current-account local-state isolation | PASS — existing keyed provider/scoped storage boundary is retained; Today is render-derived |
| Hydration gate | PASS — unhydrated delivery returns `null` |
| No persistence or retained output | PASS |
| No network, server adapter, background work, or Coach context | PASS |
| Confidence, freshness, and watermark suppression | PASS |
| Malformed-input failure containment | PASS — optional card returns `null` |
| One-card maximum | PASS |
| Feature-flag rollback | PASS — `intelligence.insights.today` removes only the Today card |
| Existing Progress behavior | PASS — Progress selector and delivery path unchanged |

## 6. Privacy and account-isolation validation

Automated delivery tests verify:

- active User A facts produce an eligible Today result;
- hydration reset (the guest/sign-out boundary) clears delivery synchronously;
- User B facts produce no User A result;
- returning to User A recomputes only from User A facts;
- malformed input, disabled flag, stale facts, incompatible watermarks, insufficient data, and low confidence produce no visible Today card.

The existing account-scoped provider, storage, query-client, and persistence lifecycle remains the authority for rapid account switches and pending hydration. Today introduces no cache or prior-result state that could flash while that lifecycle resets.

## 7. Automated validation

| Validation | Result |
| --- | --- |
| Calora TypeScript check | PASS — `pnpm --filter @workspace/calora run typecheck` |
| Focused Today/Foundation/selector/home suites | PASS — 4 files, 50 tests |
| Full Calora regression suite | PASS — 52 files, 912 tests, plus 6 static-server security tests |
| API-server TypeScript check | PASS — `pnpm --filter @workspace/api-server run typecheck` |
| API-server regression suite | PASS — 20 files, 228 tests |

Focused coverage includes eligible delivery, no-data and low-confidence suppression, stale and incompatible-watermark suppression, live add/delete recomputation, account reset/recompute, hydration gates, malformed facts, Today flag rollback, canonical Today/Progress consistency, Today baseline suppression, and static placement of the one card in the Today hierarchy.

## 8. Browser and device evidence

An Expo web smoke check reached the unauthenticated onboarding/root experience without browser crashes. It did not have an authenticated Today session, so it did **not** validate the visible Today card and is not represented as such.

No physical-device, TalkBack, VoiceOver, large-text, or representative responsive-layout validation is claimed for Today Intelligence.

## 9. Defects discovered and repaired

No new implementation defect, security failure, or data-isolation failure was discovered during Phase 2A.1 validation.

## 10. Feature-flag state

| Flag | State |
| --- | --- |
| `intelligence.foundation.enabled` | ON |
| `intelligence.facts.local_adapter` | ON |
| `intelligence.insights.progress` | ON |
| `intelligence.insights.today` | ON |
| `intelligence.facts.server_adapter` | OFF |
| `intelligence.insights.post_log` | OFF |
| `intelligence.coach.fact_context` | OFF |
| `intelligence.evidence.display` | OFF |
| `intelligence.observability` | OFF |
| `intelligence.feedback` | OFF |
| `intelligence.proactive` | OFF |

## 11. Remaining limitations and mandatory pre-production validation debt

The dedicated Phase 2A.0 pre-production validation task remains the authority for Progress release checks. Before production publication, record actual device evidence for the Today card as applicable:

- authenticated Android and iOS Today visual behavior;
- User A → sign-out → guest → User B → sign-out → User A visible leakage checks;
- force-close/relaunch and post-authentication airplane-mode behavior;
- narrow/large layouts, light/dark themes, and large accessibility text;
- TalkBack and VoiceOver announcement/traversal behavior.

These items are **PENDING / DEFERRED — NOT PASSED**. No evidence is inferred from automated or Progress-only checks.

## 12. Acceptance matrix

| Gate | Result |
| --- | --- |
| One current-day Today card maximum | PASS |
| Eligible canonical delivery | PASS |
| No-data, low-confidence, stale, and mixed-watermark suppression | PASS |
| Live add/delete recomputation | PASS |
| Today/Progress canonical consistency | PASS |
| Today descriptive-baseline duplication policy | PASS |
| Account reset and next-account recomputation | PASS |
| Hydration and feature-flag rollback | PASS |
| Offline/local-only architectural boundary | PASS |
| Failure containment | PASS |
| Full mobile and API regressions | PASS |
| Authenticated browser Today-card session | NOT EXECUTED |
| Physical-device, accessibility, and responsive validation | PENDING / DEFERRED |
| Other Intelligence surfaces | NOT ENABLED |

## 13. Next roadmap decision

Do not begin another Intelligence phase automatically. Any future surface, including post-log or Coach delivery, needs separate explicit authorization, a new surface-specific duplication and safety policy, and completion of the applicable pre-production validation gate.