# Calora Intelligence Phase 2A.5 Authorization Brief

## Decision

**Recommended phase:** **Phase 2A.5 — Local 7-Day Macro Record Coverage**

**Decision: GO for authorization and design only.** This document does not authorize implementation. Stop for approval before creating any new fact, flag, selector candidate, UI behavior, or test.

## Current state reviewed

The review covered the local Intelligence Foundation, current Progress, Today, and Post-Log delivery paths, Phase 2A.3 local weight short trend, Phase 2A.4 local 7-day nutrition coverage, current flags, Coach Fact Context's dark architecture, and known pre-production validation debt.

Existing state that must remain intact:

- Coach Fact Context is dark and unchanged.
- All currently active Intelligence is local, transient, deterministic, and account-scoped.
- Progress is the only approved surface for bounded longitudinal local observations.
- Today remains current-day-only.
- Post-Log remains commit-boundary transition UI, not a longitudinal surface.
- A one-card selector currently prioritizes calorie status, protein balance, meal distribution, optional weight trend, optional nutrition coverage, then baseline context.
- Existing client and server gates for Coach Fact Context stay off.

## Candidate ranking

Ratings are relative assessments. High is favorable for value, integrity, Foundation reuse, reversibility, and data readiness; low is favorable for privacy/isolation risk, persistence/network need, complexity, UX noise, and regression risk.

| Rank | Candidate | Assessment | Decision |
| --- | --- | --- | --- |
| 1 | **Multi-day macro record coverage** | High user value and factual integrity; excellent reuse of local food logs and existing multi-day fact patterns; low privacy/isolation risk; no persistence, network, server, or Coach requirement; low-to-medium complexity and UX noise; fully reversible; data is already available. | Recommend |
| 2 | Logging coverage quality | Technically safe, but materially overlaps Phase 2A.4 and risks being read as an adherence signal. | Defer |
| 3 | Evidence/explanation UI | Could improve trust, but the existing evidence-display gate is intentionally off and a new UI increases provenance exposure, accessibility scope, and noise. | Defer |
| 4 | Another generic longitudinal Progress observation | Safe only if tightly bounded, but has no clearer user problem or stronger data readiness than macro record coverage. | Defer |
| 5 | Goal-progress context | Easily becomes evaluative, predictive, or motivational; requires careful interpretation beyond current authorization. | Defer |
| 6 | Trend explanation | Risks presenting causal or explanatory claims that current local observations cannot prove. | Defer |
| 7 | Weight/nutrition relationship observations | Aligned correlations are readily misread as causal and demand much stronger evidence. | Defer |
| 8 | Longitudinal meal-distribution patterns | Current-day meal distribution already exists; a longitudinal version has sparse-log ambiguity and higher UX noise. | Defer |
| 9 | Planner-related local context | Local data exists, but there is no clearly safe, bounded factual problem without entering recommendation or adherence territory. | Defer |
| 10 | Recipe-related local context | Lower readiness and value; introduces recipe/provider/content privacy and UI complexity without a clear local factual insight. | Defer |

## User problem

A user may know that food was recorded on several days, while still not know whether the saved records contain usable macro fields. The existing 7-day nutrition coverage fact intentionally reports only observed logging dates; it does not say whether macro fields are present.

## User-facing value

When evidence is sufficient, Progress could transparently state the availability of complete recorded macro fields across observed dates. It helps users understand the scope of their local record without evaluating diet quality or judging unlogged days.

Fixed prospective copy:

> Macro records are complete on N of the last 7 local-calendar days.

This wording is descriptive of records, not of eating behavior or nutritional adequacy.

## Why this is the correct next phase

This is the highest-value distinct capability that:

- requires no Coach activation;
- requires no server, persistence, database, API, network, notification, or LLM work;
- builds on proven strict local-calendar and scoped-watermark patterns from Phases 2A.3 and 2A.4;
- exposes only an aggregate count;
- remains independently flag-reversible;
- does not require a behavioral, causal, medical, nutritional-quality, or adherence interpretation.

## Exact prospective Foundation fact

One local-only Foundation fact:

`nutrition.seven_day_macro_record_coverage`

Prospective sanitized value schema:

```ts
{ qualifiedDayCount: number; windowDays: 7; state: 'eligible' | 'insufficient' }
```

The fact may include only derived aggregate evidence:

```ts
[{ origin: 'derived', quality: 'moderate', count: number, logIds: [] }]
```

It must never serialize raw food-log identifiers, dates, food names, notes, images, provider payloads, calorie values, or macro values.

## Deterministic prospective calculation

1. Validate the explicit IANA timezone and `todayKey` as a strict local calendar key.
2. Define the inclusive local-calendar window as `todayKey - 6` through `todayKey`.
3. Strictly validate every input log date. Any malformed or future date fails closed.
4. Consider only valid food logs whose dates lie inside the window.
5. A logged date qualifies only when it has one or more included food logs and **every** included log has finite, non-negative `calories`, `protein`, `carbs`, and `fat` fields.
6. Count distinct qualifying dates, independent of input order.
7. Emit an eligible result only at three or more qualifying dates. Otherwise emit insufficient/no candidate.

The calculation must report observed field presence only. It must not attempt to infer whether unqualified or unlogged dates represent missing meals, poor logging, diet quality, adherence, or nutrient adequacy.

## Minimum evidence threshold

- At least **3 distinct qualifying local-calendar dates** in the 7-day inclusive window.
- At least one valid log per qualifying date.
- All included logs for a qualifying date must contain finite, non-negative values for calories, protein, carbohydrates, and fat.
- Duplicated records on one date count as one date only.

## Suppression and failure rules

Silence/no card is required for:

- fewer than three qualifying dates;
- an unhydrated, clearing, changed, guest, or otherwise unsafe local account snapshot;
- invalid or unavailable timezone;
- malformed calendar keys;
- future-dated logs;
- malformed, missing, negative, or non-finite macro/calorie fields;
- stale facts;
- incompatible watermarks for facts sharing the same time window;
- low or insufficient confidence;
- disabled rollout flag;
- any ambiguity in the source snapshot.

No stale value may remain visible after a source change, hydration reset, sign-out, or account switch.

## Delivery surface and prospective priority

- **Surface:** Progress only, through the existing stateless local one-card insight path.
- **Today:** unchanged; it remains current-day-only.
- **Post-Log:** unchanged; it remains transition-only.
- **Prospective priority:** `110`, below calorie status (`400`), protein balance (`300`), meal distribution (`200`), optional weight trend (`150`), and optional nutrition coverage (`125`), but above weight baseline (`100`).

The new candidate must compete within the existing one-card selector. It cannot create an additional card or UI surface.

## Prospective flag and rollback

Proposed flag:

```text
intelligence.insights.progress_macro_record_coverage
```

Default: `false`.

Rollback is a flag-off change only. It must require no migration, data deletion, cache cleanup, local persistence change, server change, or user-data mutation.

## Account isolation requirements

- Read only the existing hydrated, account-scoped `IntelligenceContext` snapshot.
- Keep calculation render-derived and transient.
- Never carry a previous account's result into a new account, a signed-out state, local-data clear, or hydration transition.
- Preserve the existing keyed-provider and hydration reset behavior as the isolation authority.

## Privacy and non-I/O boundaries

Phase 2A.5 implementation, if later approved, must add none of the following:

- AsyncStorage or any persistent Intelligence state;
- API, server, database, network, cache, background processing, analytics, or notifications;
- Coach integration, Coach Fact Context activation, consent changes, routing changes, or legacy Coach changes;
- LLM generation;
- Planner or Recipe Intelligence behavior;
- evidence/explanation UI;
- recommendations, nudges, personalization, scores, or forecasts.

## Prohibited interpretations

The fact and UI must never assert or imply:

- skipped meals or unlogged food;
- adherence, consistency, effort, success, failure, or a score;
- diet quality, calorie sufficiency, macro adequacy, or nutrient balance;
- medical, diagnostic, or causal conclusions;
- that macro records caused or explain a weight or wellness outcome;
- predictions, forecasts, advice, recommendations, or nudges.

## Staleness and watermark requirements

The fact needs a separate deterministic seven-day source watermark. It must include only the scoped calculation inputs required to invalidate this fact: contributing log identity, local date, macro-field presence/value-validity semantics, window, timezone, and local day-boundary semantics.

Do not broaden the existing daily food-log watermark. The selector must continue to fail closed for conflicting watermarks within an otherwise identical fact window, while allowing purpose-scoped multi-day facts to have distinct valid window watermarks.

## Interaction with existing Intelligence surfaces

- Foundation: add only one aggregate local fact family if implementation is approved.
- Progress: add one default-off candidate behind the dedicated flag.
- Today: no new input, candidate, copy, or behavior.
- Post-Log: no new input, candidate, copy, or behavior.
- Weight trend and 7-day nutrition coverage: remain independently gated and higher priority.
- Coach Fact Context: remains dark and unchanged.

## Exact subsequent implementation scope, if approved

1. Add a pure strict local macro-record-coverage helper.
2. Add one count-only, sanitized Foundation fact and dedicated scoped watermark.
3. Add its fact family to relevant food, source-refresh, timezone, and day-boundary invalidations.
4. Add the default-off feature flag.
5. Add an explicit Progress-only delivery option and candidate at priority `110`.
6. Add focused tests for strict dates/timezones/DST, field validity, duplicates, input order, threshold boundaries, multi-day watermark updates, privacy serialization, stale/mixed watermark suppression, hydration/account changes, one-card priority, flag-off rollback, Today/Post-Log non-regression, and local performance.
7. Run full Calora and API typechecks/tests, a flag-off Progress browser smoke, and document the result.

No other Phase 2A capability is included in this scope.

## Required later completion report

If implementation is separately approved, create:

```text
docs/CALORA_INTELLIGENCE_PHASE_2A_5_MACRO_RECORD_COVERAGE_REPORT.md
```

It must state:

- exact files changed;
- calculation logic, strict field/date rules, threshold, copy, and priority;
- Foundation schema and watermark design;
- flag default and rollback behavior;
- proof of account isolation, privacy, and no-I/O boundaries;
- exact test commands, counts, and results;
- local performance result;
- defects found and fixed;
- explicit pending physical-device, responsive, large-text, TalkBack, and VoiceOver validation debt.

## Deferred validation debt

The following remain pending and must not be marked passed:

- physical Android validation;
- physical iOS validation;
- responsive-layout validation beyond web smoke;
- large-text validation;
- TalkBack validation;
- VoiceOver validation;
- related device and accessibility validation.

## GO

**GO for a later, explicit implementation authorization only.** Local 7-Day Macro Record Coverage is a bounded, reversible, Progress-only capability with sufficient current data and the strongest factual/privacy profile among reviewed candidates. No Phase 2A.5 implementation has begun.