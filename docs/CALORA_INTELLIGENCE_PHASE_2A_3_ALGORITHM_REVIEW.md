# Calora Intelligence Phase 2A.3 — Pre-Authorization Algorithm Review

## Scope and decision status

This is a pre-authorization review of the proposed `weight.short_trend`
algorithm in `CALORA_INTELLIGENCE_PHASE_2A_3_PROPOSAL.md`. No Phase 2A.3 code,
flag, implementation task, server behavior, persistence behavior, or existing
Intelligence delivery behavior was changed.

The review uses the current Calora data model and Foundation architecture as the
source of truth. The proposed capability remains restricted to a local,
deterministic, account-isolated, transient, Progress-only descriptive
observation. It remains non-predictive, non-causal, non-recommendatory,
network-free, server-free, persistence-free, analytics-free, and outside Coach,
LLM, background, and proactive behavior.

## Repository facts that materially affect the algorithm

1. `WeightEntry` is `{ id, date, kg, source }`: it has a local calendar date
   but no time of day. Kilograms are the stored canonical numeric value.
2. The app currently allows multiple manual entries for the same date. Health
   synchronization can also leave same-day source combinations in the list.
3. Existing first/latest weight helpers use array order, not chronological date
   order. A new trend algorithm must therefore not reuse those helpers for
   ordering or cohort construction.
4. `dateKey()` is based on the device's local calendar; Foundation carries an
   explicit timezone and `local-calendar-day` boundary. Existing generic date
   parsing normalizes invalid dates, so a trend algorithm must strictly validate
   keys before calendar arithmetic.
5. Preferred imperial units are presentation preference only. Computation must
   remain in canonical kilograms and must never classify a trend from rounded
   pounds display values.
6. Current `weight.baselines` exposes first/latest/profile-baseline data, but it
   is not a longitudinal trend fact and cannot safely substitute for one.

## Review of the proposed rules

### Minimum three entries

**Not sufficient.**

Three entries cannot produce two non-empty, comparable cohorts after correct
same-day deduplication. It also allows a two-readings-on-one-day cluster to
outvote a single older reading if raw entries are counted.

**Required correction:** require **at least four distinct valid local calendar
dates**, with at least two daily observations in each defined cohort.

This is the smallest defensible change that makes an earlier-versus-recent
comparison meaningful without adding persistence, external data, or a
statistical model.

### Proposed 14–56 day observation window

**Too ambiguous and not technically justified as written.**

A variable 14–56 day span allows materially different samples to be described
by the same output: two clustered early readings plus recent readings may be
compared across 15 days, while an equally sparse series might span 56 days.
The proposal also does not define how observations inside a variable interval
are split.

**Required correction:** use two fixed, consecutive 14-local-calendar-day
cohorts anchored to the supplied Foundation `todayKey`:

- earlier cohort: `todayKey - 27` through `todayKey - 14`, inclusive;
- recent cohort: `todayKey - 13` through `todayKey`, inclusive.

The observation is therefore always a descriptive comparison of the most recent
28 local calendar days. It is not a rolling 56-day trend, a long-term claim, or
a forecast.

### Two entries within the latest 14 days

**Directionally correct but incomplete.**

The proposal must require two **distinct daily observations** in the recent
cohort, not two raw records. It also needs comparable earlier evidence.

**Required correction:** require at least two distinct valid dates in **both**
the earlier and recent 14-day cohorts. A source with no eligible recent
observation must be suppressed rather than treated as fresh merely because the
Foundation itself was freshly computed today.

### Earlier-half versus recent-half median comparison

**Unsafe as specified.**

“Half” is undefined for odd counts, dates with repeated entries, clusters, and
irregular spacing. Raw-entry medians allow duplicate or provider-repeated
same-day measurements to dominate.

**Required correction:**

1. Strictly validate an input as a finite positive canonical-kilogram value on
   a valid `YYYY-MM-DD` local calendar key that is not after `todayKey`.
2. Group eligible entries by date and calculate the median kilograms for each
   date. A date therefore has one daily observation irrespective of source or
   repeated same-day logging.
3. Place daily observations in the two fixed cohorts by validated date.
4. Calculate each cohort median from its daily observations.
5. Compare `recentMedianKg - earlierMedianKg` in unrounded canonical kilograms.

This is deterministic, ordering-independent, resistant to repeated same-day
entries, and still bounded to existing local data.

### 0.5 kg direction threshold

**Acceptable only with the corrected cohort and daily-median rules.**

At 0.5 kg, the threshold is a conservative product-display guardrail rather
than evidence of physiological change. It must not be described as proving fat
loss, gain, adherence, or causality. Daily deduplication and two observations
per cohort reduce—but do not eliminate—normal short-term measurement
fluctuation.

**Required precision:**

- `deltaKg >= 0.5` → `up`;
- `deltaKg <= -0.5` → `down`;
- `-0.5 < deltaKg < 0.5` → `stable`.

Use exact unrounded canonical kilograms for classification. Round only a
displayed derived value, if a later surface explicitly approves displaying one.
The proposed Phase 2A.3 card need not display a numeric delta.

### Stable

**Contradictory in the original proposal.**

It allowed `stable` in the data shape but said that sub-0.5 kg changes should
deliver no observation. This creates an undefined result for eligible,
near-zero movement.

**Required correction:** `stable` is an eligible result only after all cohort,
recency, validation, confidence, freshness, account, and flag gates pass and
the unrounded median delta is strictly between -0.5 kg and +0.5 kg.

The wording must be scoped: “Across the logged 28-day comparison window, your
recorded weight was broadly stable.” It must not imply that all body weight,
health, behavior, or future progress is stable.

### Duplicate and same-day weigh-ins

**A blocking ambiguity in the original proposal.**

The current data model has no timestamp and permits same-day records. Array
order cannot determine a reliable latest same-day observation.

**Required correction:** median all valid same-day canonical-kilogram values
into exactly one daily observation. Do not use source priority, array order, or
the last record. Do not expose entry IDs, sources, or per-day details.

### Irregular logging, sparse data, and clustered measurement

**Must suppress, not infer.**

The fixed cohort rule makes a sparse or clustered history ineligible unless it
has at least two distinct dates in each half. Four readings on two days,
three readings in the recent half and one earlier reading, or a series outside
the 28-day comparison window produces no result.

This conservative suppression is preferable to a technically calculated but
misleading direction. It does not penalize users; it simply preserves the
existing no-insight behavior until enough locally logged data exists.

### Short-term fluctuation and measurement noise

The algorithm cannot distinguish water retention, measurement timing, clothing,
illness, or scale variance from a true long-term change. No deterministic local
calculation can do so from this data model.

The corrected algorithm is therefore acceptable only as a statement about
**recorded median weights across two logged calendar cohorts**. It must:

- use descriptive logged-data wording;
- avoid health, composition, adherence, and causal claims;
- avoid goal-date or trajectory forecasts;
- suppress instead of trying to smooth, interpolate, or explain the data.

### Unit conversion and rounding

**Safe only under a canonical-unit rule.**

All input comparison and threshold classification must use `WeightEntry.kg`
without display rounding. Any metric/imperial conversion occurs after selection
and must not affect up/down/stable classification. The Phase 2A.3 proposal
should not expose an exact delta unless a separate wording/layout review
approves it.

### Timezone and date-boundary behavior

Weight records contain local calendar keys, not timestamps. The algorithm must
accept an explicit Foundation `todayKey` and timezone, use local calendar-day
arithmetic only, and define both 14-day cohorts inclusively.

Requirements:

- strict key validation before any date computation;
- no acceptance of dates after `todayKey`;
- no reliance on lexical comparison for malformed values;
- no interpretation of the time of a same-day measurement;
- recompute on the existing timezone/day-boundary invalidation path;
- suppress on malformed timezone/date inputs instead of normalizing them.

This preserves deterministic behavior through DST, month, and year boundaries.
Changing device timezone may change which local calendar cohort contains a
date; that is expected under the current local-calendar data model and must
recompute rather than retain prior output.

## Misleading-but-technically-calculable patterns

The original proposal could have produced misleading output for:

| Pattern | Why it is misleading | Corrected behavior |
| --- | --- | --- |
| Three records, with two on one recent day | Raw median can be dominated by one-day repetition | Suppress: fewer than four distinct dates / missing earlier daily evidence |
| Old entries with no current weighing | Foundation can be freshly calculated while the history is old | Suppress: no two recent cohort dates |
| Four entries spread unevenly across 56 days | Variable window makes “trend” timing unclear | Suppress unless entries fit the two fixed 14-day cohorts |
| Array reordered after sync/import | Existing helpers could call a later-imported old entry “latest” | Daily cohorts sorted by validated dates, never array order |
| A 0.49 kg median difference rounded to 0.5 | Display rounding could create a false direction | Classify from unrounded kg as stable |
| A 0.5 kg difference with noisy same-day values | Direction may overstate a single-day cluster | Daily median and two-date-per-cohort requirement; still descriptive only |
| Invalid calendar key normalized by JavaScript date parsing | An impossible date may silently move to another cohort | Suppress invalid key before grouping |
| Future-dated imported value | Could falsely dominate recent result | Exclude/suppress; never classify with future data |

## Minimal specification changes required

Before implementation authorization, amend the Phase 2A.3 proposal to replace
the current `weight.short_trend` eligibility rule with:

1. fixed earlier/recent 14-day local-calendar cohorts anchored to the explicit
   Foundation `todayKey`;
2. finite positive kg and strict non-future date validation;
3. date-level median deduplication;
4. at least four distinct valid dates, with at least two daily observations in
   each cohort;
5. cohort medians in unrounded canonical kilograms;
6. inclusive direction threshold and eligible `stable` definition;
7. no output for all other patterns;
8. sanitized count-only evidence, no raw entry IDs/dates, and a real
   multi-day fact time window;
9. the narrow type, fact-family, invalidation, selector-policy, and
   fail-closed tests needed to express this fact without changing existing
   baseline behavior.

These are algorithm-definition corrections, not scope expansion. They preserve
the proposal's local-only Foundation path, one optional Progress result,
dedicated OFF-by-default flag, and no-persistence/no-network restrictions.

## Validation additions required before implementation authorization

The later implementation plan must include table-driven tests for:

- exact four-distinct-date minimum and two-per-cohort gates;
- same-day manual, health, mixed-source, and repeated-value medians;
- input order independence;
- irregular and clustered series;
- exact `-0.5`, `+0.5`, and just-inside threshold behavior;
- `stable` wording/classification;
- malformed, non-finite, non-positive, invalid, and future inputs;
- 14-day inclusive boundaries plus DST, month, and year transitions;
- timezone/day-boundary recomputation;
- stale/mixed/low-confidence/disabled/unhydrated/account-switch suppression;
- no raw IDs/dates in serialized fact or result;
- no storage/network/server/Coach/analytics/background side effects;
- unchanged Progress, Today, and Post-Log behavior when the new flag is off.

Existing pre-production debt remains unchanged: authenticated-browser, physical
Android/iOS, responsive-layout, large-text, TalkBack, and VoiceOver checks are
not passed by this review and must never be represented as passed without actual
evidence.

## Final decision

**APPROVE WITH CHANGES.**

The proposed capability remains a safe, reversible candidate for restricted
Phase 2A because it can reuse active-account local state and deterministic
Foundation conventions without prediction, causality, recommendation,
persistence, server/network processing, LLM use, or cross-user behavior.

It is **not safe to authorize for implementation as originally specified**:
three raw entries, a variable 14–56-day window, undefined halves, duplicate
same-day records, stale-history handling, and contradictory stable behavior can
produce technically computed but misleading up, down, or stable observations.

Implementation authorization requires the exact minimal algorithm-definition
changes listed above, followed by a separately approved implementation task.