# Calora Intelligence — Coach Integration Architecture Proposal

## Status and decision boundary

**DESIGN ONLY. No Coach Intelligence implementation is authorized by this
proposal.**

This document is grounded in the completed restricted Intelligence Foundation
through Phase 2A.3 and the current Coach client/API path. It does not change
production code, prompts, flags, server behavior, database schema, or data
retention.

The central rule is:

> The Intelligence Foundation determines what Calora knows. Coach determines
> how approved knowledge can be discussed with the user.

Coach is not an independent calculator of user nutrition, wellness, weight, or
adherence facts. It must never infer a user-specific fact that is absent from
the approved context.

The existing `intelligence.coach.fact_context` flag remains **OFF**.

## Repository findings

### Intelligence Foundation today

The Foundation is local and deterministic:

- `artifacts/calora/lib/intelligence/facts.ts` builds dated facts from the
  current local snapshot, with source watermarks, confidence, freshness,
  missing-data state, calculation version, and a local-calendar time window.
- `artifacts/calora/lib/intelligence/types.ts` defines the fact envelope,
  evidence classification, freshness, provenance, source watermark, and
  restricted insight types.
- `artifacts/calora/lib/intelligence/insightDelivery.ts` fails closed before
  hydration, when disabled, on stale facts, and on malformed selection.
- `artifacts/calora/lib/intelligence/featureFlags.ts` already declares
  `intelligence.coach.fact_context: false`.
- Phase 2A.3 adds a sanitized local `weight.short_trend` fact only for an
  optional Progress selector. It explicitly excludes Coach, network,
  persistence, server facts, and LLM expansion.

The Foundation is therefore the right deterministic source, but its raw
envelope is **not** automatically suitable for a remote generative service.

### Coach today

Current Coach is a separate pathway, not a Foundation consumer:

- `artifacts/calora/app/coach.tsx` builds a local `CoachContext` and sends it
  with up to 11 recent conversation messages to `/v1/coach/respond`.
- `artifacts/calora/lib/coachContext.ts` currently includes a 30-day daily
  timeline, up to 80 named food entries, broad profile fields, wellness,
  planning, food-memory summaries, and locally calculated weight metrics.
- `artifacts/api-server/src/routes/coach.ts` verifies the bearer token,
  rate-limits per authenticated user, validates the request, caps context at
  90 KB, checks a sensitive-topic pattern, and sends the serialized context
  plus conversation to the LLM. It has a JSON response schema and limits
  actions to approved navigation destinations.
- Current consent is explicit but general: the user accepts Coach data sharing
  before the first request. It is persisted as a boolean and is not a
  versioned, purpose-scoped Intelligence-context consent.
- Conversation history is local-device state, capped to recent messages. The
  server has no conversation record or account-bound conversation ID.

The current prompt asks the model to use only structured context and treats
user-supplied food names, notes, recipes, and messages as untrusted data.
Those are useful defenses, but they are not enough to make the current broad
context a safe Foundation integration boundary.

## Threat model and trust boundary

```
Account-keyed local user state
  -> deterministic Foundation (local, hydrated snapshot only)
  -> Coach Fact Context adapter (local, allowlisted and sanitized)
  -> authenticated Coach backend (validate, authorize, rate limit)
  -> LLM (bounded discussion of supplied contract only)
  -> validated Coach response (claim/evidence validation)
  -> local Coach UI
```

### Where deterministic computation ends

It ends at the **Coach Fact Context adapter**. The adapter is a pure local
projection from fresh, eligible Foundation facts into a small allowlisted
contract. It decides:

- whether a fact may leave the device;
- whether the user has consented to this context purpose and version;
- whether it is current enough and sufficiently confident;
- how freshness, provenance class, missingness, and uncertainty are represented;
- whether the account/hydration scope remains valid.

### Where generative reasoning begins

It begins only after the validated Coach Fact Context is accepted by the
authenticated backend and passed to the LLM. The model may explain approved
facts in calm, non-diagnostic language. It does **not** calculate new facts,
upgrade confidence, resolve contradictory sources, fill gaps, or make facts
persist.

## Architecture options

| Dimension | A. Raw Foundation facts → Coach | B. Sanitized Coach Fact Context → Coach | C. Tool-mediated approved fact access |
| --- | --- | --- | --- |
| Security | Weak: raw fact shape and future fields leak by default | Strong: explicit allowlist and schema firewall | Potentially strongest runtime authority, but tool abuse risk |
| Privacy | Weak: raw values, fact IDs, watermarks, evidence metadata can expand unintentionally | Strong: purpose-specific minimum data, no raw IDs/sources | Good if tool payloads are minimized; complex audit surface |
| Factual integrity | Moderate: model sees metadata but may misuse it | Strong: facts are labeled allowed/unknown/limited and response claims can be checked | Strong if deterministic tools mediate each lookup |
| Token cost | High and grows with Foundation | Low, bounded card-sized contract | Lowest per request when only needed facts are fetched |
| Latency | Low client work, one LLM request | Low client work, one LLM request | Higher: LLM/tool round trips and tool timeouts |
| Implementation complexity | Low initially, unsafe long term | Moderate and testable | High: server tools, authorization, tracing, retries |
| Account isolation | Fragile if raw client state is mixed or stale | Strong local scope token plus server validation | Strong only with robust server-side identity and tool auth |
| Observability | Noisy and privacy-sensitive raw payloads | Minimal contract hashes/counts and schema outcomes | Rich but expensive tool-call auditing |
| Reversibility | Difficult once raw fields are part of prompts/history | Immediate flag-off and adapter removal | Multiple server/tool toggles and stateful failure paths |
| Extensibility | Poor: every new fact silently becomes exposed | Good: new facts require an allowlist decision | Good later, but premature for current local-only Foundation |

### A. Raw Foundation facts → Coach

Do not use this architecture. A raw `IntelligenceFact` includes internal fact
IDs, a source watermark, calculation metadata, a time window, evidence
classification, and a flexible value object. Passing the entire envelope makes
future Foundation additions remotely visible by accident and invites the model
to treat technical metadata as user evidence. It also encourages a “send all
facts” design rather than minimization.

### B. Sanitized Coach Fact Context → Coach

**Recommended.** A local adapter constructs a deliberately small,
versioned, allowlisted contract. It carries user-visible factual statements and
explicit uncertainty metadata, not raw facts or sources. The backend validates
the contract and the response. The feature can be disabled entirely through
one client-side fact-context gate, with a defense-in-depth server gate.

This is the smallest safe bridge for a local-only Foundation and preserves the
existing account-keyed hydration boundary.

### C. Tool-mediated Coach access to approved Foundation facts

Do not implement now. It becomes attractive only if a future Foundation has a
server-authoritative, account-isolated fact store and there is a genuine need
for on-demand fact retrieval. Today it would require transferring or
recomputing local Foundation state server-side, adding tool authorization,
timeouts, auditing, and database/RLS controls before it provides value.

It is a possible later evolution of B, not a prerequisite for B.

## Recommended architecture: B

### Proposed contract (design only)

The following TypeScript-like contract is illustrative. It must be a new,
separate API contract when implementation is explicitly authorized; it must not
reuse raw `IntelligenceFact`.

```ts
type CoachFactContextV1 = {
  schemaVersion: 1;
  purpose: 'coach_discussion';
  generatedAt: string;
  expiresAt: string;
  calculationVersion: string;
  accountScope: {
    // Opaque, request-only local nonce; never a user ID, email, storage key,
    // or stable cross-request identifier.
    requestScopeNonce: string;
  };
  coverage: {
    state: 'available' | 'partial' | 'insufficient';
    missingData: CoachMissingData[];
    freshness: 'fresh' | 'limited';
  };
  facts: CoachApprovedFact[];
};

type CoachMissingData =
  | 'no_profile'
  | 'no_logged_food_today'
  | 'incomplete_logging'
  | 'no_weight_history'
  | 'insufficient_weight_history'
  | 'unknown_provenance'
  | 'context_expired';

type CoachApprovedFact = {
  key:
    | 'daily.calorie_status'
    | 'daily.protein_status'
    | 'daily.meal_distribution'
    | 'daily.logging_completeness'
    | 'weight.short_trend';
  status: 'available' | 'limited' | 'unknown';
  statement: string;
  values?: Record<string, number | string | boolean>;
  unit?: 'kcal' | 'g' | 'kg' | 'percent';
  timeWindow: { kind: 'today' | 'last_28_days' };
  confidence: 'high' | 'medium' | 'limited';
  freshness: 'fresh' | 'limited';
  provenance: 'verified' | 'mixed' | 'estimated' | 'derived';
  limitations: string[];
};
```

Contract rules:

1. **No raw fact IDs, source watermarks, log IDs, food names, diary notes,
   photo references, recipe names, source/provider labels, dates, account IDs,
   emails, storage keys, or health-device payloads.**
2. `statement` is deterministic, bounded, reviewed copy generated by the
   adapter—not LLM-written summary material.
3. `values` are optional and only included when needed for an accurate
   explanation. Rounded display values are preferred over raw precision.
4. A `limited` or `unknown` fact must include a deterministic limitation and
   cannot be transformed into a positive/negative user judgment by Coach.
5. The context has a short TTL (recommended: 60 seconds at first release) and
   is single-request scoped. It is never persisted in Coach history.
6. The context is a replacement for the relevant broad Coach context sections,
   not an additional unrestricted payload.

### Initial allowlist

An initial authorized implementation should consider only these Foundation
categories, after explicit review:

| Candidate | May enter contract? | Conditions |
| --- | --- | --- |
| Daily calorie status | Yes, cautiously | Fresh only; confidence high/medium; deterministic target-source limitation shown |
| Daily protein status | Yes, cautiously | Fresh only; confidence high/medium; never framed as medical protein advice |
| Meal distribution | Yes, cautiously | Fresh only; descriptive, no moralizing or compensatory language |
| Logging completeness | Yes | May say records are incomplete; may never treat absence as non-adherence |
| Weight short trend | Possibly, later rollout | Only Phase 2A.3 eligibility; explicit 28-day logged-data limitation; no causality, prediction, body-composition, or recommendation |

The adapter should not export a fact merely because it exists. A product-level
allowlist must name each permitted key.

### Facts that must never be exposed to Coach through this layer

Do not expose:

- raw Foundation facts, raw evidence arrays, raw watermark values, internal
  fact IDs, calculation timestamps, or invalidation events;
- source log IDs, food names, custom notes, free text, photo/image references,
  barcode data, recipe ingredients/instructions, scan payloads, or provider
  responses;
- exact day-by-day diary timelines, raw activity/mood/water histories, shopping
  lists, saved meal names, planner details, food-memory entries, repeat
  patterns, forgotten-memory records, or local living-memory content;
- account/user identifiers, auth tokens, device identifiers, IP/location, or
  storage keys;
- raw Health/fitness data or active-energy inputs;
- targets, weight, age, or other profile fields unless separately reviewed for
  an approved, minimized fact; and
- any fact that is stale, expired, unknown, unhydrated, mixed-scope,
  insufficient, low-confidence, or outside the explicit allowlist.

The existing broad `CoachContext` should be separately audited before any
integration. This proposal does not approve its current broad content.

## Meaning, evidence, and uncertainty

### Confidence, freshness, provenance, and missingness

The adapter preserves these dimensions as constrained labels:

- **Confidence:** Foundation `high` maps to `high`; `medium` maps to `medium`;
  all other values map to `limited` or suppress the fact.
- **Freshness:** only `fresh` can become `fresh`; a fact nearing expiry may
  become `limited`; stale/expired/unknown is suppressed.
- **Provenance:** evidence is coarsened to `verified`, `mixed`, `estimated`, or
  `derived`; no individual source or provider is sent.
- **Missing data:** Foundation missing-data kinds map to the closed
  `CoachMissingData` vocabulary. Never send implementation-specific details or
  source identifiers.

Coach must distinguish:

- **verified/strong:** “Based on your logged records…”;
- **estimated/mixed:** “This is an estimate from the information currently
  available…”;
- **unknown/insufficient:** “I do not have enough reliable logged information
  to say.”

Missing data is a limitation, never a score, failure, diagnosis, or inference
about behavior.

### Insufficient evidence

When no allowlisted fact is available, the adapter sends only bounded coverage
state and generic missing-data labels. Coach responds with uncertainty and may
offer a non-coercive app navigation action such as reviewing Progress. It does
not invent a substitute claim from conversation history.

## Account, lifecycle, and history controls

### Account isolation

1. Build the adapter only after the current account is hydrated.
2. Capture the current authenticated account identity locally at request start,
   but do not serialize it into the LLM payload.
3. Bind the HTTP request to the existing bearer token; the server derives the
   account from `verifyBearerToken`, never from client-provided context.
4. Include a request-local opaque scope nonce in the request and response
   metadata. The client accepts the response only if the captured account,
   hydration generation, and nonce still match.
5. On account A → B switch, sign-out, hydration reset, or local-data clear:
   abort pending Coach requests, discard responses, clear in-memory fact
   context, and never merge prior turns into the new account’s display.

### Conversation history and changing facts

Conversation text is historical user/assistant content, not evidence. It must
not become a source of user state.

- Each Coach request receives a newly built, short-lived Fact Context.
- Persisted local turns must not contain raw Fact Context, values, watermarks,
  or source IDs.
- The model must be instructed that the newest context supersedes any
  historical numeric or factual claim.
- Assistant responses should carry non-persisted claim references such as
  approved fact keys and request nonce. The UI discards them on reset and uses
  them only to show an “updated data may change this” disclaimer during the
  active response.
- When a user asks about an earlier statement, Coach should re-evaluate only
  from the newest context and say it lacks confirmation when the context no
  longer supports the old claim.

### Pending request, timeout, retry, and offline behavior

- Abort requests on navigation-away, sign-out, account switch, hydration reset,
  or local clear.
- Use a short request deadline with no automatic replay after scope changes.
- Retry only a transport-safe request while the same authenticated account,
  hydration generation, context TTL, and scope nonce remain valid. At most one
  retry, with no retry on 4xx safety/validation responses.
- Offline, timeout, server 5xx, and LLM-invalid-output behavior must return the
  existing safe “unavailable” response. No queued context, no deferred send,
  no background retry, and no local persistence of the Fact Context.

## Consent and data egress

### Consent recommendation

**Yes—separate, explicit, versioned consent is required before any Foundation
Fact Context is supplied to Coach.**

Existing generic Coach consent should not silently cover this expansion because
it changes the category and purpose of data sent to a remote generative service.

The consent screen should explain:

- which summarized categories may leave the device;
- that raw food entries, photos, notes, identifiers, and full histories are not
  part of this feature;
- that Coach is not medical care;
- that consent can be revoked;
- that revocation immediately suppresses future context and aborts in-flight
  requests, but cannot retract an already completed remote request.

Consent should be versioned and purpose-scoped (`coach_fact_context_v1`), not a
global boolean. The exact persistence/storage decision requires a separate
privacy review; this proposal does not authorize a schema change.

### What may leave the device

Only a fresh, minimized `CoachFactContextV1` allowlisted by the adapter, the
current bounded conversation messages, and current-screen label may leave.
The backend may receive the bearer token as it does today, but the LLM prompt
must receive neither the token nor an account identifier.

No raw local state, Foundation envelope, source metadata, or internal
calculation data may be sent just to improve conversational detail.

## Coach response controls

### Preventing hallucinated user-specific claims

Prompt instructions are necessary but insufficient. Require deterministic
response validation:

1. Extend the eventual response schema so every factual observation includes
   one or more approved `factKeys` from the request and no arbitrary evidence
   keys.
2. Validate each returned key against the current request’s allowlist.
3. Reject or rewrite observations that claim a numeric value, direction,
   timeframe, or status not represented in the corresponding contract fact.
4. Reject claims from an unavailable/limited fact unless the text explicitly
   communicates uncertainty.
5. If validation fails, return a safe limited response rather than a partial
   model answer.

An initial implementation should constrain Coach to deterministic explanation
templates for factual statements and let the model add only supportive,
non-factual connective language.

### Conflicts between a user message and Foundation context

User statements are user-provided, not facts to reconcile automatically.
Coach should:

- acknowledge the user’s report without asserting it is wrong;
- state the limited, time-bounded nature of current logged context;
- avoid choosing a “winner” or overwriting data;
- invite the user to review/correct relevant records through fixed navigation;
- avoid diagnosis, blame, and recommendations based on unresolved conflict.

Example: “Your recent logs do not give me enough reliable information to
confirm that pattern. If you want, you can review your Progress records.”

### Higher-risk nutrition and medical contexts

The existing sensitive-request filter is a useful first defense, but the
future architecture needs a structured policy gate before the LLM:

- self-harm, suicidal intent, eating-disorder behaviors, purging, severe
  restriction, compensatory exercise, and dangerous low-calorie requests;
- pregnancy/postpartum questions;
- medication, dose, diagnosis, laboratory, acute symptom, chest-pain, fainting,
  or treatment questions;
- pediatric/minor or other legally/clinically sensitive contexts if identified.

For a match, do not include Fact Context in the LLM request. Return a
deterministic supportive redirect that avoids diagnosis, medication changes,
weight-loss optimization, calorie targets, or personalized medical advice. It
may offer approved navigation to neutral logging/Progress surfaces.

## Insight explanation and recommendations

### Existing insight surfaces

Coach may eventually explain a currently available Progress, Today, Post-Log,
or Weight Trend observation only if the adapter independently exports the
underlying allowlisted fact. It must not consume a transient card object,
Post-Log before/after data, or a display-ready selector message as evidence.

Recommended staged policy:

- **Today:** explanatory discussion only for fresh daily nutrition/logging
  facts; no background or proactive mention.
- **Progress:** explanatory discussion only for fresh approved facts.
- **Post-Log:** no direct Coach exposure in the first integration. It is
  transient, event-bound, and should remain local.
- **Weight Trend:** no first-release default. If later enabled, it may be
  explained only as a descriptive 28-day logged-data comparison with its
  limitation.

### Recommendations

Coach must not generate personalized nutrition, calorie, weight-loss,
supplement, medication, clinical, or exercise recommendations from Foundation
facts in the first integration.

At most, Coach can offer:

- a neutral explanation of an approved fact;
- a statement of uncertainty;
- a fixed, non-mutating navigation action to review data or existing app
  surfaces; or
- a general safety redirect.

Any future recommendation capability requires a separately authorized policy
taxonomy, risk review, testing, consent review, and product/clinical review.

## Prompt-injection controls

Treat all user-entered text and any legacy content as hostile instructions:

- do not include raw food names, notes, recipes, planner names, or memories in
  Fact Context;
- continue to place policy before untrusted messages and state that user content
  cannot modify system rules;
- do not expose system prompts, feature flags, raw facts, watermarks, or hidden
  context in model output;
- use structured input schema validation, byte caps, message caps, and
  server-side output schema validation;
- redact/deny outputs that request hidden context or reveal internal fields;
- never grant model-provided mutations, URLs, tool calls, or arbitrary routes;
- test indirect injection embedded in food names, diary notes, recipe text,
  messages, and prior assistant history.

## Server, database, RLS, observability, and rollback

### Required future server architecture

An initial B implementation does **not** require a server-side Foundation
database or Foundation tool service, because the adapter can remain local.
It does require:

- a versioned API schema for `CoachFactContextV1`;
- strict server validation of context size, keys, enum values, TTL, and claim
  references;
- authenticated account-derived request identity;
- defense-in-depth server feature flag for this endpoint/path;
- request cancellation/timeout handling;
- response claim validation before it reaches the client; and
- privacy-reviewed, minimized observability.

It must not add a database table, migration, RLS policy, or server-side fact
cache unless a later architecture makes server persistence necessary.

If tool-mediated/server-authoritative facts are later considered, then a new
database/RLS design is required: account-scoped fact rows, tenant-enforced
queries (not only application predicates), expiry/invalidation semantics,
minimal audit records, and tool authorization bound to the verified account.

### Logging and observability

Do not log raw context, conversation content, fact values, user identifiers, or
LLM prompts/responses by default. Allowed telemetry should be aggregate and
privacy-reviewed: schema version, feature flag state, request outcome class,
latency bucket, rejection reason category, and count of fact keys—not their
values.

### Immediate disable/rollback

The future implementation must require all of these gates:

1. local `intelligence.foundation.enabled`;
2. local `intelligence.coach.fact_context`;
3. explicit current consent for `coach_fact_context_v1`;
4. server `coach_fact_context` acceptance flag;
5. normal Coach availability/auth/rate-limit gates.

Any false gate suppresses Fact Context. The client sends either no Coach
request or the existing non-Foundation Coach flow only if separately approved;
it must never silently fall back to a broad/raw Foundation payload.

The server flag is the emergency kill switch for remotely supplied context.
The client flag is the immediate UI/request kill switch. Both must default off.

## Future validation plan

No implementation should be enabled until the following tests and reviews pass.

| Scenario | Required validation |
| --- | --- |
| Account A → B isolation | Begin request under A, switch to B before completion; verify abort/discard, no A context/turns on B, and no B response acceptance for A nonce |
| Sign-out during request | Verify abort, local reset, response discard, and no persisted Fact Context |
| Hydration/reset | Verify no context before hydration and no prior-context flash after clear/reset |
| Stale/expired facts | Verify adapter suppresses them and Coach says unknown rather than using history |
| Low-confidence/insufficient facts | Verify only bounded uncertainty reaches Coach; no factual observation is returned |
| Conflicting facts/message | Verify neutral acknowledgment, no adjudication, no data mutation, and approved navigation only |
| Offline/server/LLM failure | Verify no queue/retry after scope change, safe fallback, no persisted payload |
| Timeout/retry | Verify a single same-scope retry at most; no replay after TTL, sign-out, or account switch |
| Prompt injection | Test direct/indirect attacks in user messages, food names, notes, recipes, memories, and prior assistant content; verify no system/context disclosure or policy bypass |
| Hallucinated user-state claims | Seed model invalid numeric/timeframe/status claims; verify deterministic response rejection/fallback |
| Conversation contamination | Place outdated or malicious old claims in history; verify newest Context controls factual output |
| Consent | Verify no context egress before consent, after revocation, or for old consent version |
| Feature-flag rollback | Toggle client/server flags during and before request; verify immediate suppression and safe completion behavior |
| Privacy inspection | Capture network/logs; verify only contract fields leave and no raw IDs, notes, food names, images, sources, watermarks, or account IDs appear |
| Regression protection | Verify existing Coach consent/history/menu/actions/fallbacks and existing Intelligence Today/Progress/Post-Log surfaces are unchanged while flag is off |
| Device/accessibility | Authenticated iOS/Android flows, slow network, large text, TalkBack, VoiceOver, and screen-reader announcement checks |

## Explicit non-goals

This proposal does not authorize:

- enabling `intelligence.coach.fact_context`;
- any Coach prompt edit;
- any client/server implementation;
- a migration, database, RLS policy, server fact storage, cache, analytics, or
  observability pipeline;
- exposing raw Foundation data;
- proactive Coach messages, notifications, background processing, or automatic
  recommendations; or
- a Phase 2A.4 implementation.

## Recommended authorization sequence

1. Security/privacy/clinical-risk review of this proposal.
2. Narrow product decision on the first approved fact allowlist and consent
   language.
3. Separate implementation authorization for a dark, default-off local adapter
   and API schema only.
4. Automated boundary validation and authenticated device/accessibility QA.
5. Limited rollout only after explicit approval; retain both client and server
   kill switches.

RECOMMEND COACH ARCHITECTURE: B. Sanitized Coach Fact Context → Coach