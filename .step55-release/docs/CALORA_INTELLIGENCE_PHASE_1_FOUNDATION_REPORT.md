# Calora Intelligence — Phase 1 Foundation Report

**Status:** Local deterministic Foundation implemented.  
**Scope:** Phase 1 only. No visible Intelligence delivery, server-persisted Intelligence data, schema migration, Coach rewrite, LLM fact calculation, prediction, adaptive learning, notification, or Phase 2 work was performed.

## What was built

The mobile artifact now contains a read-only Intelligence domain under `artifacts/calora/lib/intelligence/`. It adapts existing local Calora state into deterministic, versioned daily facts. The Foundation does not own, persist, mutate, synchronize, or display product data.

The calculation version is defined once as:

```text
nutrition-facts-v1
```

## Files created

| File | Role |
|---|---|
| `artifacts/calora/lib/intelligence/types.ts` | Typed facts, evidence, context, confidence, freshness, status, watermark, and invalidation contracts |
| `artifacts/calora/lib/intelligence/contextAdapter.ts` | Read-only adapter from existing Calora local state |
| `artifacts/calora/lib/intelligence/facts.ts` | Deterministic daily nutrition, meal, completeness, evidence, watermark, and baseline facts |
| `artifacts/calora/lib/intelligence/evidence.ts` | Provenance-to-evidence classification |
| `artifacts/calora/lib/intelligence/confidence.ts` | Explainable categorical confidence rules |
| `artifacts/calora/lib/intelligence/invalidation.ts` | Deterministic invalidation events and eligibility |
| `artifacts/calora/lib/intelligence/featureFlags.ts` | Safe-by-default Foundation and future-delivery flags |
| `artifacts/calora/lib/intelligence/observability.ts` | Opt-in safe development/test metadata observer |
| `artifacts/calora/lib/intelligence/weightMetrics.ts` | Explicit Coach and Insights baseline selectors |
| `artifacts/calora/lib/intelligence/index.ts` | Domain exports |
| `artifacts/calora/lib/__tests__/intelligenceFoundation.test.ts` | Parity, provenance, invalidation, offline, flags, and baseline tests |

## Existing files modified

| File | Change |
|---|---|
| `artifacts/calora/lib/coachContext.ts` | Reuses the shared Coach-specific weight selectors without changing Coach’s existing profile-baseline semantics |

## Canonical facts implemented

- Daily calories consumed, target, and remaining. Remaining includes current-day
  active health energy only when the caller supplies a fresh Health snapshot,
  matching Today’s existing calculation.
- Daily protein, carbohydrates, and fat consumed, target, and remaining.
- Optional daily fiber, sugar, and sodium consumption when the existing logs contain those values.
- Breakfast, lunch, dinner, and snack distribution: calories, percentage of daily calories, log count, and `logged`/`not_logged` state.
- Daily logging completeness: log count, distinct meal slots, and `partially_logged`/`no_logs` state.
- Weight baseline fact: latest logged weight, first logged weight, profile baseline, and Coach-profile-baseline change.

The Foundation deliberately does not infer that a missing meal was skipped. A meal without logs is represented as `not_logged`, not as a logged zero.

## Evidence model

Evidence preserves source class rather than flattening values:

| Origin | Quality | Current mapping |
|---|---|---|
| `provider` | strong | USDA or Brand verified logs |
| `barcode` | strong | Barcode verified logs |
| `nutrition_label` | strong | Legacy/runtime Nutrition label logs where present |
| `manual` | moderate | Manual logs |
| `recipe_estimate` | estimated | Recipe logs |
| `ai_estimate` | estimated | Photo-estimate logs |
| `unknown` | unknown | Unrecognized legacy source |
| `user_corrected`, `food_memory`, `verified`, `derived` | reserved/typed | Available for future adapters where the current `FoodLog` contains adequate source-level evidence |

An AI or recipe estimate is never transformed into verified evidence during aggregation.

## Confidence model

Confidence is deterministic and categorical:

- **insufficient:** no food evidence, missing target, or unknown provenance;
- **low:** estimated evidence is more than half of daily entries;
- **medium:** there is usable non-estimated evidence but inputs remain mixed/partial;
- **high:** every contributing entry is strong evidence.

This is intentionally simple and explainable. It does not infer clinical reliability or use an opaque score.

## Freshness, watermark, and invalidation

Every fact includes:

- `generatedAt`;
- `validFrom`;
- freshness state (`fresh` at generation);
- calculation version;
- deterministic FNV-1a source watermark;
- missing-data state;
- source evidence;
- confidence.

The source watermark is generated from the viewed date/timezone plus fact-relevant
profile fields, selected-day log values/provenance, weights used by the baseline
fact, and current-day active health energy where available. It does not churn for
unrelated historical diary entries or planner edits.

Supported invalidation reasons:

- food added, updated, or deleted;
- goal or target changed;
- weight changed;
- timezone or day boundary changed;
- fact-relevant preference changed;
- planner changed;
- source refreshed.

No fact persistence or active user-visible insight cache was introduced in this phase, so invalidation is a deterministic contract and testable event rather than a new storage system.

## Weight baseline result

The audit finding is retained rather than silently unified into one ambiguous result:

| Surface | Preserved baseline |
|---|---|
| Coach weight change | profile/onboarding weight, then first logged weight only when profile is absent |
| Insights trend delta | first logged weight |
| Insights goal progress | existing profile-baseline logic remains unchanged in the screen |

The new helper uses explicit names for these selectors. Coach now uses its matching shared helper; Insights remains behaviorally unchanged. Parity tests demonstrate the expected difference when onboarding weight and first logged weight differ.

## Feature flags

Enabled only for controlled local/test Foundation use:

- `intelligence.foundation.enabled`
- `intelligence.facts.local_adapter`

Disabled:

- server adapter;
- Today, post-log, Progress, Coach, and evidence delivery;
- feedback;
- proactive behavior.

No screen reads these flags for user-visible delivery in Phase 1.

## Observability

The Foundation offers an opt-in observer for development and tests. It emits only safe metadata:

- calculation version;
- source watermark;
- calculation duration;
- invalidation reason;
- confidence counts;
- evidence category counts;
- missing-data categories;
- feature-flag state.

It does not emit raw food notes, raw Coach messages, media, provider payloads, tokens, or secrets.

## Parity and regression coverage

The Phase 1 tests verify:

- daily totals/targets and health-adjusted remaining calories match current Today
  arithmetic for representative inputs;
- evidence partitions preserve provider/barcode/manual/recipe/AI distinctions;
- missing meals remain `not_logged`;
- watermarks are stable and change for relevant source updates;
- every declared invalidation reason is covered;
- all visible delivery flags remain disabled;
- Coach and Insights baseline semantics stay deliberately distinct;
- facts still compute without a profile or API connection.

## Performance observation

The Foundation uses pure bounded daily calculations and a compact source fingerprint. It is not mounted into a React render path, does not create a second state copy, does not run a background job, and does not change hydration, logging, or navigation. Fact generation duration is available to development/test observability. No visible-core-flow performance path was changed in this phase.

## Schema and migration findings

No schema or migration was added.

Repository evidence confirms:

1. Drizzle definitions live in `lib/db/src/schema/index.ts`.
2. Startup DDL in `artifacts/api-server/src/index.ts` is a separate, partial schema authority.
3. Startup DDL does not create all tables represented by the Drizzle schema, including profiles, weights, saved meals, recipes/items, subscriptions, and consent events.
4. No standalone versioned migration history/output directory was found.

**Blocker:** Server-persisted Intelligence facts must not be enabled until migration authority and Drizzle/startup-DDL parity are explicitly resolved.

## RLS status

**RLS VERIFICATION BLOCKED: EXTERNAL CONSOLE ACCESS REQUIRED**

No repository-accessible Supabase migration, `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, or equivalent policy definition was found. Existing API ownership checks are application-level protections and do not prove database-level tenant isolation.

Server-persisted Intelligence data remains blocked until tenant isolation/RLS is verified.

## Remaining blockers

1. Canonical migration ownership is unresolved.
2. Drizzle/startup-DDL parity is unresolved.
3. Production RLS and database tenant isolation are unverified.
4. Local profile, wellness, planner, shopping, and weight state are not currently server-owned across devices.
5. No approved retention/deletion policy exists for persistent facts, evidence, or insight history.

## Recommended Phase 2 entry point

After the blockers above are resolved and Phase 1 calculations are validated on real device flows, begin with a single high-confidence, non-prescriptive Today insight delivery adapter. It should consume the existing local facts layer, display explicit evidence/freshness state where useful, and remain behind the disabled `intelligence.insights.today` flag.

Do not begin Phase 2 as part of this work.