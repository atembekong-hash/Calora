# Calora Intelligence Phase 2A.3 Proposal

## Decision

**RECOMMEND PHASE 2A.3: transient local longitudinal weight-trend observation.**

This is a proposal for review and authorization only. It does not authorize
implementation, enable a flag, add a task, or alter currently shipped
Intelligence behavior.

The recommended capability is a descriptive local observation of a sufficiently
logged recent weight direction. It is **not** goal forecasting, a prediction,
a diagnosis, a recommendation, or a judgment about health or adherence.

## Repository-grounded starting point

The completed system already has:

- account-keyed storage, keyed Calora-provider remounting, and hydration gates;
- a deterministic local Foundation context and fact pipeline;
- fresh, confidence- and watermark-gated Progress and Today delivery;
- a transient, commit-boundary Post-Log response;
- the `weight.baselines` Foundation fact containing latest, first logged, and
  profile-baseline weights;
- feature flags for local Foundation and the three completed delivery paths.

The current Foundation does **not** provide a bounded longitudinal trend fact.
It must not treat the existing baseline fact as a forecast, infer causality, or
fill in missing weigh-ins.

Current repository evidence also keeps server facts, Coach fact context,
evidence display, observability, feedback, and proactive behavior disabled.

## Candidate evaluation

Ratings are relative to Calora's current restricted Phase 2A architecture.
“Ready” means technically compatible with that architecture, not authorized.

| Candidate | User value | Readiness / Foundation reuse | Privacy, factual, and regression risk | Persistence / network need | Reversibility | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| **Descriptive longitudinal weight trend** | High | High: reuses local weights, target, account boundary, Progress delivery, and deterministic facts | Low–medium if descriptive and confidence-gated; no causality or prediction | None / none | High: one local flag | **Recommend** |
| Coach Intelligence integration | High | Low: Coach contract and consent boundary are intentionally separate | High: client-forged context, provenance, consent, and response-safety risks | No existing approved route | Medium | Do not proceed |
| Proactive Intelligence / notifications | Medium | Low | High: scheduling, authorization, interruption, and safety risks | Background work likely required | Medium | Do not proceed |
| Persistent personalization | Potentially high | Low | High: retention, deletion, consent, account-switch, and tenant-isolation requirements | Persistence required | Low | Do not proceed |
| Goal/progress forecasting | High | Medium-low | High: extrapolation and factual-integrity risk; insufficient reliable longitudinal evidence | No network required, but new rules/evaluation required | Medium | Do not proceed |
| Meal-level or nutrition-pattern Intelligence | Medium | Medium | Medium-high: sparse logging must not become behavioral inference | None possible | High | Defer |
| Planner Intelligence | Medium-high | Low: Planner is AI-assisted and has no Foundation-aware contract | High: cost, provenance, recommendation, and regression risk | Existing server/AI path would be implicated | Medium | Do not proceed |
| Recipe Intelligence | Medium | Low | High: recipe nutrition may be estimated and server/AI-backed | Likely server/cache use | Medium | Do not proceed |
| Evidence / explanation UI | Medium | Medium | Medium: disclosure and raw-evidence leakage risk | None | High | Defer; not required for trend |
| Feedback and learning | Medium | Low | High: consent, retention, feedback storage, and evaluation | Persistence likely required | Low | Do not proceed |
| Server-assisted Intelligence | Medium | Blocked | High: current runtime-role, least-privilege, RLS lifecycle, and rollback evidence is insufficient | Server/database required | Low | Do not proceed |

## Proposed Phase 2A.3 specification

### Objective

Optionally show one factual, local-only observation on the existing Progress
overview when the active account has enough recent, reliable weigh-ins to
describe a direction over a fixed observation window.

Example bounded language:

- “Recent logged weight is lower than your earlier entries.”
- “Recent logged weight is higher than your earlier entries.”
- “Recent logged weight is broadly stable.”

The output must never claim that food, exercise, adherence, a Plan, or any
other action caused the change. It must not predict a future date or outcome.

### User experience

- Progress retains its existing content and visible Intelligence behavior.
- Phase 2A.3 may replace the existing descriptive baseline result only when a
  higher-confidence short-trend observation is eligible; otherwise the existing
  behavior remains unchanged.
- At most one optional Progress contextual card is visible.
- Today and Post-Log do not receive this observation.
- The card is informational, has no action, does not open an explanation view,
  and does not expose raw weight-entry identifiers or exact historical dates.

### Trigger

Render-derived evaluation only while the Progress overview is mounted, after
the active account has hydrated. It must recompute from the current local
snapshot on the existing Progress render path.

It must not be emitted on food logging, weight entry mutation, navigation,
background execution, notification scheduling, sync completion, Coach
interaction, or a network response.

### Data inputs

Only the active hydrated account's existing local state:

- current profile target and units;
- locally stored weight entries;
- explicit local date and timezone;
- existing Foundation metadata: confidence, freshness, watermark, evidence
  classification, and missing-data state.

No diary food names, notes, photos, capture payloads, Coach messages, Planner
content, recipe data, network responses, account identifiers, or external data
may be added to the computation.

### Foundation facts reused

- `weight.baselines`;
- shared freshness, confidence, source-watermark, time-window, provenance, and
  missing-data contracts;
- the canonical deterministic selection and visible delivery safety pattern.

### New fact required

Add one local-only, deterministic Foundation fact family:

`weight.short_trend`

It may be generated only when all of the following are true:

1. at least three valid local weight entries exist;
2. the earliest and latest eligible entries span at least 14 calendar days and
   no more than 56 calendar days;
3. there are at least two entries in the most recent 14 days;
4. the fact uses only entry dates and kilograms, with no interpolation;
5. a direction is emitted only when the absolute difference between the median
   of the earlier half and median of the recent half is at least 0.5 kg.

The fact value may contain only sanitized derived fields such as
`direction` (`down`, `up`, or `stable`), `deltaKg`, `entryCount`, and
`windowDays`. It must carry the existing calculation version, watermark,
evidence count/classification, confidence, freshness, and missing-data state.
The output contract must not include raw weight-entry IDs or dates.

If any gate is not met, the fact is insufficient and no Phase 2A.3 card is
delivered. It must never classify a sparse, short, stale, malformed, mixed, or
low-confidence series as a trend.

### Persistence policy

No persistence of facts, observations, card state, view history, dismissals,
or preferences:

- no AsyncStorage field;
- no Calora state/autosave field;
- no React Query persistence;
- no sync outbox item;
- no database record;
- no Coach/living-memory entry;
- no analytics payload or file.

### Network and server policy

No API route, server adapter, database query, cache, LLM, health-provider
fetch, background worker, network call, or server-assisted calculation.

### Account-isolation requirements

- Compute only after hydration inside the current account-keyed provider.
- Evaluate to `null` while hydration is incomplete, on guest state, or after an
  account scope reset.
- Do not retain prior output in component, provider, cache, or module state.
- Account A → guest → B → A must never display A's derived title/message in
  guest or B state.
- Preserve existing scoped storage, query-client, diary-sync, and pending-write
  protections unchanged.

### Privacy boundary

Only derived, sanitized title/message and fact references may reach the card.
The observable output must exclude account identifiers, raw entry IDs, raw
dates, food content, source payloads, photos, notes, and sensitive Coach data.
No logging or analytics expansion is permitted.

### Failure behavior

Fail closed to no card when:

- the feature flag is disabled;
- hydration/account scope is unsafe;
- input is malformed, stale, mixed-watermark, insufficient, or low confidence;
- the observation window or entry count is inadequate;
- selector/fact calculation throws.

The optional card must never block Progress, retry indefinitely, or alter
existing Progress, Today, or Post-Log output on failure.

### Proposed feature flag

`intelligence.insights.progress_weight_trend`

It must default to **OFF**. It must be independently reversible without data
migration, cleanup, or behavior changes to the existing Progress, Today, or
Post-Log flags.

### Implementation boundary

If authorized, implementation may be limited to:

1. the deterministic local Foundation fact and its pure tests;
2. a pure, single-candidate Progress-only selector policy;
3. the existing stateless/hydration-gated Progress delivery path;
4. the dedicated OFF-by-default flag;
5. focused privacy, isolation, failure, performance, and regression tests;
6. a Phase 2A.3 completion report.

### Explicit exclusions

- Forecasting, timelines, projected goal dates, or future weight predictions.
- Nutrition, meal, Planner, Recipe, or post-log Intelligence changes.
- Coach context, Coach wording, or Coach navigation.
- Recommendations, nudges, notifications, background work, or autonomous
  action.
- Persistent personalization, view history, feedback, learning, or analytics.
- Server facts, API changes, database/schema changes, RLS, migrations, cache,
  external services, or LLM calls.
- Evidence/explanation screens or raw-history disclosure.
- Any change to completed Progress, Today, or Post-Log behavior outside the
  precisely defined Progress priority policy.

## Prerequisites before implementation authorization

1. The tracked pre-production debt for **existing Today and Post-Log
   Intelligence** must remain honestly recorded and be scheduled for validation:
   authenticated-browser, physical Android/iOS, responsive layout, large text,
   TalkBack, and VoiceOver checks are not passed by this proposal.
2. A surface-specific product review must approve the exact wording and the
   replacement/priority interaction with the existing Progress baseline card.
3. A technical review must confirm the proposed fact shape can stay within the
   existing Foundation provenance, confidence, and no-raw-identifier contract.
4. Explicit written authorization must approve Phase 2A.3 before a task is
   created or any flag/code is changed.

## Required validation if authorized

- Deterministic repeat-input result and no mutation of inputs.
- Exact threshold and boundary tests: three-entry minimum, 14/56-day window,
  two-recent-entry gate, 0.5 kg direction threshold, stable behavior, sparse
  series, duplicate dates, and malformed entries.
- Freshness, confidence, missing-data, stale, and mixed-watermark suppression.
- Feature-flag rollback.
- Progress one-card/priority policy, with Today and Post-Log regression tests.
- A → guest → B → A, unresolved hydration, failed sign-out, restart, and
  pending-autosave lifecycle coverage.
- No persistence, no fetch/network, no logging/analytics, no server adapter,
  and no raw identifier/content serialization assertions.
- Local performance measurement on representative histories.
- Full Calora and API typecheck/regression suites where applicable.
- Authenticated browser and physical-device validation must be reported
  separately and honestly; no unexecuted Android/iOS, responsive, large-text,
  TalkBack, or VoiceOver check may be marked passed.

## Measurable acceptance criteria

1. With an eligible stable local snapshot, the selector produces the same
   sanitized result on repeated calls and emits at most one Progress card.
2. With fewer than three entries, a window below 14 or above 56 days, fewer
   than two recent entries, a delta below 0.5 kg, malformed data, stale data,
   mixed watermarks, insufficient confidence, disabled flag, guest state, or
   unfinished hydration, it delivers no Phase 2A.3 card.
3. The serialized fact/result exposes no account ID, raw weight-entry ID, raw
   date, food name, notes, media, or provider payload.
4. The operation causes zero storage writes, fetches, server calls, analytics
   emissions, background work, Coach mutations, or persistence changes.
5. Account switching and hydration reset clear visible output before the next
   scope computes.
6. Turning the dedicated flag off removes only the new observation with no
   migration and no change to completed Progress, Today, or Post-Log behavior.

## Rollback

Set `intelligence.insights.progress_weight_trend` to `false`. Because the
proposal permits no data persistence, server work, cache, schema, or migration,
rollback removes the optional delivery only and requires no cleanup.

## Authorization boundary

This document is a proposed roadmap decision. Wait for explicit approval before
creating a Phase 2A.3 implementation task or modifying any production code.