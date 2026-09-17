# Calora Coach — Existing Context Forensic Audit

## Status and scope

**AUDIT ONLY.** This report traces the existing Coach pipeline as implemented.
It does not authorize or make any production, prompt, consent, schema,
migration, feature-flag, or Coach Fact Context changes.

The existing `intelligence.coach.fact_context` flag remains **OFF**. It is not
consulted by the legacy Coach request path.

## Executive finding

The current Coach path independently builds a broad local `CoachContext` and
sends it to the authenticated backend, where the complete serialized context is
embedded in the LLM system prompt. This happens independently of the
Intelligence Foundation and its freshness/confidence/provenance controls.

The route has meaningful safeguards: authenticated access, per-user rate
limiting, request-schema validation, a 90 KB context limit, a small
sensitive-topic filter, an output schema, restricted navigation actions, and
HTTP request serializers that omit request bodies. Those controls do not make
the existing payload data-minimized, lifecycle-bound, or Foundation-governed.

The privacy firewall proposed for Foundation → Coach cannot be considered
sufficient while this independent legacy path still sends broad food, wellness,
planning, memory, profile, and historical context.

## Confirmed end-to-end path

```text
CaloraContext local account state
  -> CoachScreen filters only selected forgotten sources
  -> buildCoachContext() creates broad CoachContext
  -> useRespondCoach POST body { context, messages, currentScreen }
  -> /api/v1/coach/respond
  -> bearer-token verification + rate limit + Zod body validation
  -> JSON.stringify(context), 90 KB check
  -> serialized context concatenated into OpenAI system prompt
  -> LLM JSON response
  -> Zod response parsing + fixed navigation-action filter
  -> CoachScreen displays response and persists recent conversation turns locally
```

Evidence:

- Context construction: `artifacts/calora/lib/coachContext.ts`
- Request construction: `artifacts/calora/app/coach.tsx`
- Route/prompt construction: `artifacts/api-server/src/routes/coach.ts`
- Runtime schema: `lib/api-zod/src/generated/api.ts` (`RespondCoachBody`)
- HTTP logging serializer: `artifacts/api-server/src/app.ts`

## What the current request actually transmits

`CoachScreen` uses `useCalora()` state and calls `buildCoachContext()` during
render. It filters forgotten sources only for **logs, water, mood, activity,
and planner meals**. It passes weights, shopping items, saved meals, recipes,
Food Memory, and repeat patterns directly to the builder.

On send, it posts:

```ts
{
  context,       // entire object below
  messages,      // current user message plus up to 10 recent local turns
  currentScreen: 'progress-coach'
}
```

The server Zod-parses this body, serializes `context` with
`JSON.stringify()`, and inserts that exact serialized string in the OpenAI
system message. Therefore every successfully validated context field crosses:

**device → Calora backend → LLM provider**.

The route does not write the context to a database. This is not equivalent to
zero retention: the LLM provider receives it, and platform/provider retention
must be assessed separately before treating the feature as privacy-safe.

## Field-by-field inventory and minimization classification

Classification meanings:

- **KEEP:** may be retained only after a separate purpose/consent review;
- **DERIVE/MINIMIZE:** replace with a bounded deterministic summary;
- **REMOVE:** do not include in an eventual data-minimized Coach request;
- **REQUIRES SEPARATE REVIEW:** sensitive or product-critical enough to need
  explicit policy, privacy, and risk review before any egress.

| Current field | Local source and transformation | Backend / LLM | Current purpose | Privacy, injection, and factual concerns | Classification |
| --- | --- | --- | --- | --- | --- |
| `schemaVersion` | Literal `1` | Yes / Yes | Payload compatibility | No user content | KEEP |
| `generatedAt` | Device ISO timestamp | Yes / Yes | Freshness grounding | Reveals exact client timing; no TTL is enforced | DERIVE/MINIMIZE |
| `currentDate` | Local `dateKey()` | Yes / Yes | Temporal grounding | Date-level personal timeline | DERIVE/MINIMIZE |
| `dateRange.start/end` | Local rolling 30-day range | Yes / Yes | Coverage window | Reveals longitudinal tracking window; no need for exact endpoints in most explanations | DERIVE/MINIMIZE |
| `profile.name` | Profile name | Yes / Yes | Personal tone | Direct identifier; not necessary for factual coaching | REMOVE |
| `profile.goal` | Profile goal enum | Yes / Yes | Framing | Can support goal-directed advice not yet safety-approved | REQUIRES SEPARATE REVIEW |
| `profile.activity` | Profile activity enum | Yes / Yes | Context | Self-reported health/lifestyle information; can induce advice | REQUIRES SEPARATE REVIEW |
| `profile.diet` | Profile dietary preference | Yes / Yes | Food framing | Potentially sensitive preference and not Foundation-governed | REQUIRES SEPARATE REVIEW |
| `profile.calorieTarget` | Saved profile target | Yes / Yes | Daily analysis | Numeric target can enable unsafe restriction advice; Foundation labels target assumptions more safely | REQUIRES SEPARATE REVIEW |
| `profile.weightKg` | Saved profile body weight | Yes / Yes | Weight analysis | Sensitive body measurement; raw value is broader than a descriptive trend | REQUIRES SEPARATE REVIEW |
| `profile.targetWeightKg` | Saved profile target weight | Yes / Yes | Goal analysis | Sensitive body/goal data, unsafe for unrestricted advice | REQUIRES SEPARATE REVIEW |
| `profile.age` | Saved profile age | Yes / Yes | Generic tailoring | Sensitive demographic data; not needed for initial fact explanation | REMOVE |
| `dailySummaries[].date` | Each date in 30 local days | Yes / Yes | Daily timeline | Longitudinal behavior/timeline disclosure | DERIVE/MINIMIZE |
| `dailySummaries[].calories` | Sum of each day’s food logs | Yes / Yes | Intake analysis | Sensitive nutrition history; can facilitate restrictive advice | DERIVE/MINIMIZE |
| `dailySummaries[].proteinG/carbsG/fatG/fiberG/sugarG/sodiumMg` | Per-day nutrition sums | Yes / Yes | Nutrition analysis | 30-day detailed diet profile; source quality not included | DERIVE/MINIMIZE |
| `dailySummaries[].meals` | Distinct meal count | Yes / Yes | Meal pattern | Can be misread as adherence/behavior score | DERIVE/MINIMIZE |
| `dailySummaries[].waterOunces` | Per-date water log | Yes / Yes | Hydration discussion | Personal wellness timeline; no confidence/missingness distinction | DERIVE/MINIMIZE |
| `dailySummaries[].mood` | Per-date mood check-in | Yes / Yes | Wellness context | Sensitive mental-wellness data; may interact with medical/safety context | REQUIRES SEPARATE REVIEW |
| `dailySummaries[].activity` | Per-date activity log | Yes / Yes | Wellness context | Personal health/activity timeline; can facilitate compensatory-exercise advice | REQUIRES SEPARATE REVIEW |
| `dailySummaries[].hasData` | Any data on the date | Yes / Yes | Coverage | Useful only as an aggregate completeness label | DERIVE/MINIMIZE |
| `recentEntries[].date` | Last up to 80 entries inside 30 days | Yes / Yes | Specific food discussion | Detailed personal eating timeline | REMOVE |
| `recentEntries[].meal` | Logged meal label | Yes / Yes | Specific food discussion | Behavioral chronology; untrusted content | REMOVE |
| `recentEntries[].name` | Food name, clipped to 160 chars | Yes / Yes | Specific food discussion | Free text / indirect prompt-injection surface; sensitive dietary information | REMOVE |
| `recentEntries[].calories/macros/fiber/sugar/sodium` | Entry nutrition, nonnegative-clamped | Yes / Yes | Specific analysis | Raw per-food nutrition lets model create unbounded advice; provenance is incomplete | REMOVE |
| `recentEntries[].source` | Food-log source | Yes / Yes | Provenance | Provider/source fingerprint; raw taxonomy is not a safe explanation contract | REMOVE |
| `recentEntries[].confidence` | Entry confidence, clamped/rounded 0–100 | Yes / Yes | Reliability | Model receives a number without approved semantics or enforcement | DERIVE/MINIMIZE |
| `wellness.waterAverageOunces` | Average over water-logged days | Yes / Yes | Hydration summary | Aggregate, but limited-sample behavior can be hidden | DERIVE/MINIMIZE |
| `wellness.waterLoggedDays/moodLoggedDays/activityLoggedDays` | Counts in current 30-day period | Yes / Yes | Coverage | Better represented as bounded missing-data state | DERIVE/MINIMIZE |
| `wellness.weightEntries` | Raw count of weights | Yes / Yes | Weight coverage | Could be a limited eligibility signal | DERIVE/MINIMIZE |
| `wellness.latestWeightKg` | Existing array-order helper result | Yes / Yes | Weight discussion | Sensitive raw body value; legacy helper order is not the Phase 2A.3 strict chronology design | REMOVE |
| `wellness.weightChangeKg` | Existing Coach baseline helper | Yes / Yes | Weight trend discussion | Derived separately from Foundation; no strict daily de-duplication/freshness context | REMOVE |
| `planning.plannedMealCount` | Meal-plan count in 30 days | Yes / Yes | Planning discussion | Could be a bounded aggregate but not Foundation-approved | REQUIRES SEPARATE REVIEW |
| `planning.shoppingItemCount` | Unchecked shopping count | Yes / Yes | Planning discussion | Shopping behavior; low initial value | REMOVE |
| `planning.savedMealNames` | Up to 20 saved names, clipped to 120 chars | Yes / Yes | Planning discussion | Free text / indirect prompt injection and personal food preference disclosure | REMOVE |
| `planning.savedRecipeCount` | Saved IDs or local recipe count | Yes / Yes | Planning discussion | Aggregate potentially sufficient only after separate purpose review | REQUIRES SEPARATE REVIEW |
| `foodMemory.acceptedCount` | Accepted memory count | Yes / Yes | Memory context | Aggregate, but not an approved Foundation fact | REQUIRES SEPARATE REVIEW |
| `foodMemory.repeatPatterns` | Up to 20 pattern titles | Yes / Yes | Habit discussion | Derived text can include hostile/untrusted content and sensitive eating patterns | REMOVE |
| `foodMemory.verifiedShare/estimatedShare` | Percentages based on memory provenance | Yes / Yes | Reliability | A bounded provenance summary may be useful, but semantics need review | DERIVE/MINIMIZE |
| `missingData[]` | Strings inferred from absent profile/log/wellness/weight records | Yes / Yes | Uncertainty | Useful but free-form, legacy-specific, and not tied to fact confidence/freshness | DERIVE/MINIMIZE |
| `messages[].role/content` | Persisted local Coach turns + new user text | Yes / Yes | Conversation continuity | User text and previous model text are untrusted; stale user-state claims can persist | REQUIRES SEPARATE REVIEW |
| `currentScreen` | Client literal `progress-coach` | Yes / Yes | Navigation context | Low sensitivity; client-forgeable under current schema | KEEP |
| `coachConsentAccepted` | Local persisted boolean | No / No | Client UI gate | Does not travel in request; generic and unversioned | REQUIRES SEPARATE REVIEW |

## Additional discovered data behavior

### Legacy account and storage behavior

`coachConsentAccepted` and `coachMessages` are part of the autosaved local
Calora state in `artifacts/calora/context/CaloraContext.tsx`. Coach messages
are capped to 12 saved turns by the context setter. The current screen displays
the last eight in its local menu and sends up to 11 previous-plus-new turns per
request.

Clear-all-data resets both consent and Coach messages. This is a useful local
clear behavior, but it does not abort an in-flight request or retract an
already-sent remote payload.

### Actual consent wording

Before enabling Coach, the UI says Coach can use “nutrition, hydration, mood,
activity, weight, Food Memory, and planning information” and that the request
is sent to Calora’s AI service. It also says Coach is not medical care and
does not change data without confirmation.

This accurately names broad categories. It does **not** disclose:

- the 30-day timeline;
- up to 80 individual named entries and their nutrition/source/confidence;
- saved meal names, repeat-pattern titles, or raw weight metrics;
- the exact profile fields sent;
- the LLM-provider prompt embedding;
- conversation-history transmission;
- exact data limits and retention posture;
- a versioned purpose or revocation behavior for this payload.

The consent is therefore understandable at a category level but insufficiently
specific for a future Foundation-derived context expansion and inadequate as a
data-minimization disclosure.

## Maximum practical exposure of one Coach request

The server rejects a serialized `context` over **90,000 UTF-8 bytes**. That
limit is only on `context`, not the full request body or the conversation
messages. The app accepts JSON request bodies up to 15 MB.

In normal app behavior, one request can expose:

- a 30-day day-by-day nutrition/wellness timeline;
- up to 80 individual food entries, each including date, meal, 160-character
  name, nutrients, source, and confidence;
- all listed profile fields;
- weight metrics;
- planning summaries, up to 20 saved-meal names, and up to 20 repeat-pattern
  titles;
- food-memory aggregate/provenance share;
- up to 11 recent user/assistant conversation messages; the new user message is
  clipped to 3,000 characters.

The 90 KB cap prevents unbounded context but permits materially more sensitive
detail than a factual discussion requires. It is a denial-of-service/budget
bound, not a data-minimization control. A modified client can submit any
schema-valid payload within server bounds; the server does not independently
recompute local facts.

## Account isolation and stale-context audit

### Confirmed controls

- The endpoint derives an authenticated user from the bearer token and rate
  limits on that user ID.
- Coach state is part of the local persisted Calora state and clear-all-data
  clears consent/history.
- The client prevents a second send while the React Query mutation is pending.

### Gaps and exposure risks

1. **No request scope binding:** `CoachContext` includes no account scope,
   hydration generation, expiry, or request nonce. The backend has no way to
   compare context to an authoritative Foundation snapshot.
2. **No visible abort/discard policy:** `CoachScreen` awaits the mutation and
   appends the response on resolution. It does not capture account/hydration
   generation or abort on sign-out, account switch, hydration reset, clear, or
   navigation.
3. **No context TTL:** `generatedAt` is informational only. A delayed request
   can reach the model after local data changes.
4. **History is not evidence:** old assistant claims and user statements are
   resent with new requests without a deterministic “newest facts supersede
   history” mechanism.
5. **Selective forgotten-source filtering:** only some categories are filtered
   before construction. Weights, shopping, saved meals/recipes, Food Memory,
   and repeat patterns bypass that filtering path.
6. **Client context is forgeable:** bearer authentication identifies the caller,
   but the route accepts any schema-valid context supplied by that caller. This
   is a factual-integrity risk, not a cross-tenant database-read issue.

No direct cross-account leak was proven by this read-only audit. The missing
lifecycle binding means cross-account/stale-response behavior has not been
proven safe and must be treated as a release blocker for any new integration.

## Server validation, logs, retention, and prompt injection

### Server controls

The route:

1. verifies bearer authentication;
2. rate limits to 40 requests per user per hour;
3. Zod-validates the request;
4. enforces the 90 KB serialized context cap;
5. runs a regex sensitive-topic check against only the latest user message;
6. gives the model policy instructions and full serialized context;
7. Zod-validates model response shape; and
8. permits only fixed navigation destinations.

The response validator does **not** verify that an observation’s evidence keys,
numeric values, timeframe, direction, or confidence are supported by the
request context. Prompt instruction alone therefore cannot prevent a
schema-valid hallucinated user-specific claim.

### Logging

`artifacts/api-server/src/app.ts` configures `pino-http` request serialization
to log only request ID, method, and path; response serialization logs status
code. The Coach route itself does not log the raw context, serialized prompt,
messages, user ID, or model response.

This is a positive finding for direct application logs. It does not establish
provider retention, infrastructure request capture, error-monitoring behavior,
or future logging changes. The audit found no dedicated privacy-safe Coach
observability layer.

### Prompt-injection exposure

The server prompt correctly says food names, notes, recipes, and user messages
are untrusted and cannot change rules. However, the legacy request supplies
untrusted strings in food entry names, saved-meal names, repeat-pattern titles,
and messages. It appends historical messages after the system prompt. The
single sensitive-topic regex also has predictable coverage limits and runs
after body/context parsing.

This is **defense in depth, not a containment boundary**. A minimized
Foundation Fact Context should eliminate free-text food/planning/memory data
from the LLM payload and add deterministic output-claim validation.

## Comparison with proposed `CoachFactContextV1`

| Area | Legacy `CoachContext` | Proposed `CoachFactContextV1` |
| --- | --- | --- |
| Data model | Broad 30-day raw/derived state | Narrow allowlisted fact cards |
| Source of truth | Separate client helper plus legacy metrics | Fresh deterministic Foundation facts |
| Freshness | Informational timestamp only | Required freshness + expiry |
| Confidence/provenance | Partial raw log fields; not enforced | Closed labels carried with each allowed fact |
| Missing data | Free-form strings | Closed uncertainty vocabulary |
| IDs/raw text | Names, dates, sources, message history included | No IDs, food text, notes, images, sources, or raw timeline |
| Weight | Raw latest/baseline helper outputs | Only separately allowlisted descriptive fact, if eligible |
| Account lifecycle | No request scope/nonce/generation guard | Proposed account/hydration/nonce checks and discard rules |
| Consent | General persisted boolean | Proposed versioned, purpose-scoped, revocable consent |
| Output grounding | Prompt instruction + schema shape | Proposed factual claim-to-approved-key validation |
| Rollback | No Coach context feature gate | Client and server gates default off |

## Required migration strategy

**Do not coexist with the current broad context in the same request.**

The recommended future sequence is a **broader Coach architecture migration**:

1. Keep the existing pathway unchanged until separately authorized remediation.
2. Define and validate a versioned, minimized `CoachFactContextV1` contract.
3. Add purpose-scoped consent, client/server kill switches, TTL/scope lifecycle
   controls, and deterministic response claim validation.
4. Replace the legacy broad `context` field for opted-in, authorized Coach
   flows with the new context—not as a supplemental payload.
5. Retain the legacy flow only behind a short-lived rollback gate during
   controlled rollout; never merge its raw fields with Fact Context.
6. Remove the legacy builder/API contract after the replacement proves safe.

If some non-Foundation capability is later needed (for example, a planner
feature), it must be proposed as a separate minimized, purpose-bound contract.
It must not re-open a general `CoachContext`.

## High-priority hardening findings before any integration

1. Broad raw data egress independently bypasses Foundation safety controls.
2. Generic consent is not specific enough for detailed LLM data transmission or
   the proposed new purpose.
3. No account/hydration/request-generation binding or response discard policy
   is present.
4. Legacy weight metrics are separate from the stricter Foundation fact model.
5. Untrusted free-text context remains an indirect prompt-injection surface.
6. Schema-valid responses can contain unsupported user-specific claims.
7. A size cap is not a minimization, freshness, or retention control.
8. Sensitive-topic handling is a narrow latest-message regex, not a structured
   pre-egress risk policy.

## Non-actions

This audit did not:

- remove or minimize any legacy field;
- change Coach prompts, consent, request handling, logging, flags, or storage;
- enable `intelligence.coach.fact_context`;
- create a migration or database/RLS change; or
- implement the proposed Coach Fact Context.

CURRENT COACH CONTEXT VERDICT: HIGH RISK

RECOMMENDED MIGRATION STRATEGY: Broader Coach architecture migration that replaces the broad legacy CoachContext with a versioned, consent-gated, sanitized CoachFactContextV1; do not coexist with or supplement it using raw legacy context.