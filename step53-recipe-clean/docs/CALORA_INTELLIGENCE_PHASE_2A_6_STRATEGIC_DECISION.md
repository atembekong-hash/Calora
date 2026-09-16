# Calora Intelligence Phase 2A.6 — Strategic Decision

## Decision

# DECISION B — CLOSE PHASE 2A

Calora should stop Phase 2A feature expansion and consolidate the current Intelligence system before moving to the next architectural stage. No additional Phase 2A user-facing Intelligence capability is authorized by this decision.

## 1. Current Intelligence capability map

### Local Foundation facts

The Foundation is local, deterministic, hydrated, account-scoped, and transient. It currently derives:

- daily calories consumed, target, and remaining;
- daily protein, carbohydrates, and fat consumed, targets, and remaining;
- optional daily fiber, sugar, and sodium totals;
- per-meal calorie distribution;
- daily logging-completeness state;
- weight baseline context;
- optional 28-day local weight short trend;
- optional 7-day nutrition logging coverage;
- optional 7-day macro record coverage;
- planner, recipe, wellness, and activity context inputs that are not currently used for a new visible Intelligence feature.

No Foundation output carries an account ID, raw food content, photo, storage key, or persistence metadata.

### Selectors

- **Contextual local selector:** one result only, pure and side-effect free.
- **Today wrapper:** narrows the contextual selector by excluding descriptive weight baseline context.
- **Post-Log selector:** separate, transient commit-boundary transitions after an approved food-log change.

### Delivery surfaces

- **Today:** current-day context only.
- **Progress:** current-day and explicitly gated longitudinal local context, one card only.
- **Post-Log:** ephemeral transitions only.
- **Coach:** legacy Coach only; Fact Context is not delivered.

## 2. Feature-flag map

| Capability | State | Required posture |
| --- | --- | --- |
| Foundation / local adapter | Enabled | Keep enabled |
| Today local delivery | Enabled | Keep bounded to current-day context |
| Progress local delivery | Enabled | Keep one-card policy |
| Post-Log delivery | Enabled | Keep commit-boundary-only |
| Server adapter | Default-off | Remain dark |
| Progress weight short trend | Default-off | Remain dark |
| Progress 7-day nutrition coverage | Default-off | Remain dark |
| Progress 7-day macro record coverage | Default-off | Remain dark |
| Coach Fact Context | Default-off | Remain completely dark |
| Evidence display | Default-off | Remain dark |
| Observability, feedback, proactive delivery | Default-off | Remain dark |

No default-off flag should be enabled as a consequence of this strategic review.

## 3. Selector and priority map

The Progress selector returns at most one active local insight:

| Priority | Candidate | Scope |
| ---: | --- | --- |
| 400 | Daily calorie target reached | Current day |
| 300 | Protein trailing | Current day |
| 200 | Meal concentration | Current day |
| 150 | Weight short trend | Optional longitudinal |
| 125 | Nutrition logging coverage | Optional longitudinal |
| 110 | Macro record coverage | Optional longitudinal |
| 100 | Weight baseline | Descriptive local baseline |

It fails closed for absent, stale, incompatible same-snapshot-watermark, low-confidence, insufficient, malformed, unhydrated, or disabled states.

The order remains defensible: current-day status signals rank above historical descriptive record signals. However, the number of optional longitudinal candidates now exceeds the one-card delivery capacity in practical use.

## 4. Overlap analysis

- **Nutrition coverage and macro record coverage** are nested record-coverage concepts. One reports observed logged dates; the other reports date coverage under stricter stored-field validity. Both are descriptive and neither evaluates diet quality.
- **Weight baseline and weight short trend** provide adjacent historical weight context. The trend is richer where evidence is sufficient, while baseline remains the low-evidence fallback.
- **Daily meal concentration** already provides the bounded, factual meal-distribution observation. A longitudinal version would add more history without a proportionate new user problem.
- **Daily calories and protein** already cover the highest-value current-day facts. Adding cross-fact or longitudinal relationships would quickly introduce behavioral, adequacy, health, or causal interpretation risk.

## 5. Diminishing-returns analysis

Phase 2A has reached diminishing returns for additional local descriptive features:

1. Progress has one card, yet already has six ordered candidate families.
2. Any new Progress-only candidate would tend to be lower priority, replace a stronger existing candidate, or duplicate logged-record framing.
3. New longitudinal facts multiply feature flags, invalidation paths, watermark scopes, selector rules, account-transition cases, and regression tests.
4. The independent multi-day fact watermark fix in Phase 2A.5 demonstrated that each new longitudinal fact increases shared-selector safety complexity.
5. The product has not yet activated the three existing longitudinal candidates, so expanding their set before evidence, consolidation, or validated rollout would not create proportionate user value.

## 6. Candidate comparison

| Direction | Incremental value | Integrity / inference risk | UX / architecture result | Decision |
| --- | --- | --- | --- | --- |
| Longitudinal macro patterns | Low beyond macro-record coverage | Risks adequacy or adherence reading | More one-card competition | Do not add |
| Longitudinal meal patterns | Low beyond current-day meal concentration | Sparse-log and interpretation risk | More noise | Do not add |
| Goal-progress context | Overlaps existing goal/weight context | Can become evaluative or predictive | Duplicative | Do not add |
| Evidence / explanation UI | Potential trust benefit | Increases provenance/privacy/accessibility scope | Needs separate product decision | Keep dark |
| Transparency / user insight preferences | Potential future value | Requires persistence and preference semantics | Outside Phase 2A boundary | Defer |
| Planner Intelligence | Unclear without recommendations | Recommendation/personalization risk | Needs separate architecture | Defer |
| Recipe Intelligence | Unclear local factual problem | Content/provider/privacy complexity | Needs separate architecture | Defer |
| Longitudinal nutrition trends | Low under present one-card model | Adequacy, health, causal interpretation risk | High test burden | Do not add |
| Relationships between facts | Low without explanation policy | Strong causal misreading risk | High complexity | Do not add |
| Coach integration | Not a Phase 2A feature | Requires separate readiness prerequisites | Architecturally separate | Do not activate |
| Consolidation | High | Low | Reduces maintenance and rollout risk | Next stage |
| No additional feature | High at current maturity | Low | Preserves system safety | Adopt |

## 7. Architecture critique

The one-card Progress model remains appropriate for controlling noise and avoiding an advice-like dashboard. It should remain in place.

The growing selector hierarchy is approaching an architectural smell, not because the existing priorities are indefensible, but because every new historical fact requires:

- another priority and optional selector input;
- another default-off flag;
- another scoped freshness and invalidation contract;
- more interaction tests with all higher-priority candidates;
- more ambiguity about what will ever appear on the one available card.

The Foundation is not overloaded with raw or unsafe facts: its outputs are sanitized and bounded. It is, however, nearing the limit of valuable local longitudinal facts that have a safe delivery slot.

## 8. Capabilities that should remain dark

Remain dark until a separate explicit authorization:

- Progress weight trend;
- Progress nutrition coverage;
- Progress macro record coverage;
- server-side Intelligence adapter;
- Coach Fact Context;
- evidence display;
- observability, feedback, and proactive delivery;
- Planner Intelligence;
- Recipe Intelligence;
- cross-fact relationships;
- longitudinal nutrition/macro/meal patterns;
- goal-progress interpretation;
- user-controlled Intelligence preferences.

## 9. Potential future retirement or replacement

Do not retire any current capability now.

Future product evidence may justify:

- replacing the lower-value weight baseline card with the better-evidenced short trend when the trend is validated and separately authorized;
- consolidating nutrition coverage and macro record coverage into one clearly named record-coverage concept if product review shows users cannot distinguish their value;
- leaving all three longitudinal candidates permanently dark if no activation path produces meaningful, low-noise user value.

Any retirement, merge, or activation needs its own approval and regression plan.

## 10. Exact reasoning for closure

Further Phase 2A expansion would not meet the required bar for incremental user value. The remaining data-supported directions either duplicate present signals, create a weakly delivered candidate under the one-card policy, or require inference/UX/persistence/Coach architecture that Phase 2A intentionally excludes.

Closing Phase 2A now preserves the strongest outcome of the phase: a hardened local, account-isolated, privacy-bounded Foundation with restrained delivery and explicit default-deny rollout controls.

## 11. Next architectural stage

**Phase 2B — Intelligence consolidation and Coach Fact Context activation-readiness review.**

This is not Coach activation. It is a decision, validation, and ownership stage that determines whether the dark architecture is safe, valuable, and comprehensible enough to warrant a future separately authorized rollout.

## 12. Preconditions for Phase 2B

Before any Coach Fact Context activation decision:

- preserve all Fact Context client/server/cohort flags as off;
- complete an explicit selector/flag ownership and retirement review;
- decide whether any longitudinal local fact is eligible for future admission; current Coach allowlists must not expand by accident;
- confirm server-authoritative consent and cohort controls remain default-deny;
- conduct security and privacy review of claim, evidence, risk, TTL, expiry, sign-out, and account-switch behavior;
- validate authenticated browser and real-device account transitions;
- complete physical Android/iOS, responsive, large-text, TalkBack, VoiceOver, and relevant performance/jank validation;
- define the product and evidence policy for any future transparency UI.

## 13. Exact next authorized task

**Phase 2B — Intelligence consolidation and Coach Fact Context activation-readiness review**

Scope:

1. Produce a selector and feature-flag ownership matrix.
2. Identify duplicate/low-value candidate retirement or consolidation options without changing behavior.
3. Freeze all existing default-off flags.
4. Produce a Coach Fact Context activation prerequisite checklist and validation plan.
5. Define a go/no-go rubric for a separate future activation authorization.

This next task must not:

- modify production behavior;
- activate any feature flag or Coach traffic;
- add facts, persistence, APIs, databases, analytics, notifications, background work, or LLM behavior;
- expand the Coach Fact Context allowlist;
- begin a user rollout.

## 14. Remaining risks and validation debt

The following remain pending and are not passed:

- physical Android and iOS validation;
- authenticated browser validation across account transitions;
- responsive/narrow layout validation beyond web smoke;
- large-text validation;
- TalkBack and VoiceOver validation;
- real-device performance and interaction-jank checks;
- account-switch, sign-out, offline, clear-data, and force-close journey validation for Intelligence surfaces;
- product evidence that any default-off longitudinal candidate is useful enough to activate.

Coach Fact Context stays dark and unchanged. Phase 2A is closed pending review of the recommended Phase 2B consolidation/readiness task.