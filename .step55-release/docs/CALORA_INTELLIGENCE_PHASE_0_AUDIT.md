# Calora Intelligence — Phase 0 Forensic Audit

**Status:** Complete — forensic audit only  
**Scope:** Read-only comparison of the Calora Intelligence Master Blueprint against the current repository.  
**Date:** 2026-08-20  
**Implementation status:** No production behavior, schema, dependencies, workflows, builds, or UI were changed for this audit.

---

## Table of Contents

1. [Executive finding](#1-executive-finding)
2. [Audit method and evidence boundary](#2-audit-method-and-evidence-boundary)
3. [Current architecture map](#3-current-architecture-map)
4. [Current data-flow map](#4-current-data-flow-map)
5. [Current Calora Coach architecture](#5-current-calora-coach-architecture)
6. [Existing nutrition intelligence](#6-existing-nutrition-intelligence)
7. [Existing reusable systems](#7-existing-reusable-systems)
8. [Database and schema implications](#8-database-and-schema-implications)
9. [Required new services and modules](#9-required-new-services-and-modules)
10. [Security and privacy findings](#10-security-and-privacy-findings)
11. [Performance and reliability risks](#11-performance-and-reliability-risks)
12. [AI and API cost risks](#12-ai-and-api-cost-risks)
13. [Potential regression points](#13-potential-regression-points)
14. [Recommended Intelligence Engine architecture](#14-recommended-intelligence-engine-architecture)
15. [Integration classification and affected files](#15-integration-classification-and-affected-files)
16. [Feature-flag strategy](#16-feature-flag-strategy)
17. [Proposed migration strategy](#17-proposed-migration-strategy)
18. [Exact Phase 1 plan](#18-exact-phase-1-plan)
19. [Testing requirements](#19-testing-requirements)
20. [Unknowns and decisions required](#20-unknowns-and-decisions-required)
21. [Phase 0 conclusion](#21-phase-0-conclusion)

---

## 1. Executive finding

Calora already has many appropriate foundations for an Intelligence Engine:

- a local-first operating model with resilient AsyncStorage persistence;
- structured food logs, food-memory, nutrition data, provenance, confidence, wellness, planner, recipe, and weight data;
- deterministic dashboard and progress calculations;
- an existing Coach with consent, bounded structured context, server-side authentication, JSON validation, safety routing, and allowlisted navigation;
- server-side AI integrations with established rate-limit, caching, fallback, and request-coalescing patterns.

However, Calora does **not** yet have one canonical, versioned nutrition-and-evidence layer. Current behavior combines:

- mutable local `FoodLog` numeric fields;
- food-memory component calculations;
- Today-screen aggregate calculations;
- provider data;
- AI estimates;
- recipe nutrition estimates;
- server-synced diary records;
- local-only profile/wellness/planner/weight state.

These sources are useful but are not yet joined by a common facts contract. Building Intelligence directly on top of them without that contract risks contradictory advice between Today, Coach, Planner, Recipes, and Progress.

### Primary recommendation

Phase 1 should not begin with a new AI insight or broad screen redesign. It should begin with a **small, deterministic, read-only, provenance-aware Intelligence Foundation** that:

1. adapts existing local and server-backed data;
2. calculates shared facts and explicit missing-data state;
3. preserves evidence quality and calculation versions;
4. makes facts expire or invalidate when relevant source data changes;
5. exposes only structured facts to Coach and later UI delivery surfaces.

The Intelligence Engine must **consume and explain trusted application facts**. It must not become a competing owner of nutrition, diary, profile, or target data.

---

## 2. Audit method and evidence boundary

### Audit method

This Phase 0 review inspected the repository’s existing mobile state, API routes, schema definitions, startup DDL, data helpers, AI routes, synchronization logic, authentication boundaries, subscription boundaries, and relevant UI flows.

Representative evidence includes:

- `artifacts/calora/context/CaloraContext.tsx`
- `artifacts/calora/lib/persistenceManager.ts`
- `artifacts/calora/lib/foodMemory.ts`
- `artifacts/calora/lib/coachContext.ts`
- `artifacts/calora/lib/livingMemory.ts`
- `artifacts/calora/lib/livingState.ts`
- `artifacts/calora/lib/weeklySignals.ts`
- `artifacts/calora/lib/diarySync.ts`
- `artifacts/calora/hooks/useDiarySync.ts`
- `artifacts/calora/app/(tabs)/index.tsx`
- `artifacts/calora/app/(tabs)/insights.tsx`
- `artifacts/calora/app/(tabs)/planner.tsx`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/app/coach.tsx`
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/index.ts`
- `artifacts/api-server/src/routes/coach.ts`
- `artifacts/api-server/src/routes/capture.ts`
- `artifacts/api-server/src/routes/diary.ts`
- `artifacts/api-server/src/routes/sync.ts`
- `artifacts/api-server/src/routes/recipes.ts`
- `artifacts/api-server/src/routes/planner.ts`
- `artifacts/api-server/src/routes/premiumRecipes.ts`
- `artifacts/api-server/src/lib/rate-limit.ts`
- `artifacts/api-server/src/lib/revenuecat.ts`
- `lib/db/src/schema/index.ts`

### Evidence boundary

Any point not demonstrated by repository evidence is labeled **UNKNOWN**. This includes external provider console configuration, production deployment topology, production RLS policy, production database migration execution, provider retention settings, external job infrastructure, and operational security controls outside source control.

---

## 3. Current Architecture Map

### 3.1 Mobile application

| Area | Current implementation | Current authority |
|---|---|---|
| Application shell | Expo Router tabs plus routes for Coach, capture, restaurants, auth, invite, and memory | Mobile app |
| Shared operating state | `CaloraContext` | React state and AsyncStorage |
| Authentication | `AuthContext`, Supabase client/session | Supabase session |
| Offline persistence | `PersistenceManager`, storage schema, hydration guard | AsyncStorage |
| Remote/query data | TanStack Query for recipe, Premium, and API data | API plus transient cache |
| Theme and presentation preferences | Profile/local state | Local state |
| Diary/food logging | Today, Scan, Food Memory, manual, recipes, planner, restaurants | Local-first `FoodLog` state |
| Progress/weight/wellness | Insights and helpers | Local state |
| Planner/shopping | Planner screen and context | Local state |
| Coach | Local context builder plus authenticated API request | Local context sent to server |

### 3.2 Operational client state

`artifacts/calora/context/CaloraContext.tsx` is the immediate operational source of truth for:

- onboarding state;
- profile and goals;
- food logs;
- weight records;
- water;
- mood;
- activity and minutes;
- planner meals and planner preferences;
- shopping items;
- local recipes and saved recipe IDs;
- reminders;
- health connection and snapshots;
- Coach consent and local chat history;
- living memory;
- user display preferences;
- local synchronization outbox and related metadata.

The context hydrates from a versioned AsyncStorage snapshot and autosaves through a serialized persistence manager. This is a deliberately local-first model: users can log and view state without requiring a successful server round-trip.

### 3.3 API server

| Layer | Current implementation |
|---|---|
| HTTP server | Express API mounted under `/api` |
| Authentication | Supabase Bearer verification |
| Database | PostgreSQL through Drizzle and direct SQL |
| AI access | Replit-managed OpenAI integration |
| Food/provider access | Open Food Facts, USDA, TheMealDB, FatSecret |
| Billing/subscription | RevenueCat, checked server-side for Premium content |
| Rate limits | Persistent PostgreSQL fixed-window buckets |
| Background behavior | Recipe nutrition warmup/re-estimation, account-deletion recovery, rate-limit cleanup |
| Durable queue/workers | **UNKNOWN** — no general durable queue, retry worker, or dead-letter system was found |

### 3.4 Database and schema

There are two schema-related authorities:

1. typed Drizzle definitions in `lib/db/src/schema/index.ts`;
2. hand-written startup DDL in `artifacts/api-server/src/index.ts`.

The typed schema describes entities including users, profiles, food items, diary entries, weights, saved meals, recipes, recipe items, capture sessions/candidates, subscriptions, referral entities, sync mutations, consent events, recipe nutrition, rate-limit records, and account-deletion state.

The startup DDL creates or alters only a subset of these structures. That dual-authority design is a material future risk for Intelligence because new data contracts could be represented in one authority but missing in a new database or deployment path.

---

## 4. Current Data-Flow Map

### 4.1 Food logging and nutrition flow

```text
User action
  → Today / Scan / Food Memory / Recipe / Planner / Restaurant
  → FoodMemory draft or direct FoodLog
  → CaloraContext local state
  → AsyncStorage autosave
  → Today / Insights / weekly signal / living state calculations
  → authenticated diary synchronization when available
  → API validation and PostgreSQL diary persistence
```

#### Manual, suggested, repeated, recipe, and planner foods

1. The user selects or creates food through Today, Food Memory, recipes, planner, or a saved meal.
2. The data resolves to a `FoodLog` or accepted food-memory draft.
3. `CaloraContext` updates local state immediately.
4. `PersistenceManager` serializes the AsyncStorage write.
5. Today and Insights derive totals and signals from the local state.
6. When authenticated, diary sync attempts to persist compatible diary mutations to the server.

#### Capture flow

```text
User capture action
  → POST /v1/capture/analyze
  → barcode provider lookup OR AI/provider analysis
  → editable candidate/draft
  → user review and acceptance
  → local FoodLog
  → optional authenticated server provenance and diary sync
```

The capture route handles text, voice, image, nutrition label, receipt, barcode, and automatic modes. Barcode primarily uses deterministic provider lookup before AI fallback. Other capture modes can produce AI-assisted estimates. Accepted results remain editable before they become a diary log.

#### Diary synchronization

```text
Local diary change
  → useDiarySync observes state
  → local mutation/signature preparation
  → POST /v1/sync
  → user-scoped validation
  → upsert/delete by user and client ID
  → local sync metadata update
```

The synchronization model is local-first:

- server state is backup/verification for authenticated diary records;
- client state remains the immediate user-visible truth;
- no server diary pull/merge was found as a normal hydration source for local app state.

### 4.2 Nutrition calculation flow

| Calculation source | Current implementation | Observation |
|---|---|---|
| Component arithmetic | `foodMemory.ts` sums components and applies eaten fraction | Strong reusable primitive |
| Daily totals | Today filters local logs by date and sums numeric fields | Separate calculation path |
| Target display | Today derives remaining calories/macros from local profile and active energy | Local-only in normal operation |
| Provider values | Barcode/label/provider data feeds candidates/logs | Quality metadata exists but is not centrally rolled up |
| AI capture values | Values are normalized/clamped | No broad macro/calorie plausibility reconciliation was found |
| Recipe estimates | AI-generated nutrition can enter normal diary arithmetic | Explicitly estimated but not isolated in aggregate totals |

### 4.3 Today/dashboard flow

```text
Local FoodLog + profile target + water + mood + activity + planner
  → Today calculations
  → calorie gauge / macro display / quick actions / planner preview
  → weekly signals and living state
  → UI
```

Today is predominantly local-state driven. It does not currently request a server-authoritative nutrition summary before rendering. This is important: Phase 1 must preserve responsive offline behavior and should first calculate Intelligence facts from compatible local adapters.

### 4.4 Coach flow

```text
Local Calora state
  → forgotten-memory filtering
  → bounded buildCoachContext()
  → authenticated POST /v1/coach/respond
  → server safety checks + rate limit + model request
  → Zod validation + navigation action allowlist
  → Coach UI message, confidence, limitations, navigation cards
```

### 4.5 Recipe, planner, and shopping flow

```text
Recipe browse / Premium / local recipe / AI concept
  → local recipe state or API/React Query
  → optional full recipe generation
  → local saved recipe state
  → planner placement
  → derived shopping list
  → local persistence
```

```text
Authenticated planner request
  → POST /v1/planner/generate
  → bounded AI generation or deterministic starter-week fallback
  → local planner edits/replacements/custom meals
  → local planner persistence
  → shopping list derived from viewed week
```

Planner and shopping state are local-device state. The server assists generation but does not appear to own the resulting weekly plan or shopping list.

---

## 5. Current Calora Coach Architecture

### 5.1 Existing Coach protections

| Capability | Current evidence |
|---|---|
| Authenticated endpoint | Coach requires verified Supabase Bearer identity |
| Persistent per-user rate limit | DB-backed account-level rate limiting |
| Bounded request size | Coach context capped at 90,000 UTF-8 bytes |
| Sensitive-topic fallback | Deterministic redirection for certain high-risk requests |
| Injection-aware instructions | Context and user content treated as untrusted |
| Structured output | JSON mode plus Zod validation |
| Navigation controls | Server allowlist and matching fixed mobile routes |
| No model-side mutation | Coach cannot update logs, goals, recipes, planner, or account state |
| User consent | Explicit consent prior to data transmission |
| Local history controls | Clear local history and forgotten-memory filtering |

### 5.2 Current Coach context

`artifacts/calora/lib/coachContext.ts` composes a bounded 30-day view with:

- profile goal, diet, calorie target, activity, age, and weight fields;
- daily calorie and macro summaries;
- recent entries;
- water, mood, and activity;
- planner/shopping/saved-meal summaries;
- food-memory summary;
- missing-data indicators;
- local weight-change calculation.

The UI filters forgotten living-memory sources before context construction. This is a valuable privacy boundary to preserve.

### 5.3 Current Coach limitations

1. **Mixed evidence is flattened in aggregate totals.** Coach sees daily totals that can include verified, manual, provider, and AI-estimated values without a clear per-fact evidence partition.
2. **Weight baseline can differ from Progress.** Coach may use profile weight fallback while Progress applies its own baseline/trend logic.
3. **Context is client-derived.** The API authenticates the caller but does not independently reconstruct the entire Coach context from server records.
4. **Cost controls are incomplete.** There is no clearly evidenced Coach cache, daily budget, model fallback, provider timeout policy, or token/cost telemetry.
5. **Safety state is not fully surfaced.** The UI renders response text and limitations but does not appear to render a distinct structured support/safety banner for server safety states.
6. **Safety scanning is narrow.** Deterministic sensitive-content matching primarily inspects the latest message, so indirect/euphemistic or earlier-conversation risks may not be detected deterministically.

### 5.4 Coach integration rule

Coach should remain a **read-only explanation and navigation surface**.

It should receive a structured, provenance-aware subset of Intelligence facts and explain those facts in careful language. It must not become an independent calculator of targets, trends, causality, or nutrition truth.

---

## 6. Existing Nutrition Intelligence

Calora contains several existing intelligence-like systems. They are valuable inputs but do not yet form one shared Intelligence Engine.

| Existing system | Current role | Phase 1 classification |
|---|---|---|
| `foodMemory.ts` | Component arithmetic, confidence/provenance structures, accepted/reviewed memory | REUSE / EXTEND |
| `weeklySignals.ts` | Local behavioral summary derivation | REUSE / EXTEND |
| `livingState.ts` | Selects the highest-context daily need | REUSE / EXTEND |
| `livingMemory.ts` | Source-derived local memory with forget behavior | REUSE |
| `coachContext.ts` | Bounded contextual summary and missing-data flags | REUSE / EXTEND |
| Insights progress logic | Weight trends, celebration logic, chart signals | REUSE / EXTEND |
| Capture candidates | Editable estimate/verification distinctions | REUSE |
| Recipe cache | TTL, stale-while-refresh, single-flight, L1/L2 behavior | REUSE as a cost-control pattern |
| Planner fallback | Deterministic starter week when AI fails | REUSE as a resilience pattern |

### Current nutrition truth problem

The app has useful deterministic arithmetic, but not one explicitly versioned nutrition measurement contract. In particular:

- Food Memory component arithmetic and Today total arithmetic are separate paths.
- A calories-only edit can leave macros stale.
- AI recipe/capture values can be summed with verified values.
- Provenance/confidence can be retained on entries but not consistently rolled up into daily conclusions.
- Server synchronization omits certain useful source/context fields from ordinary client mutations.
- Server conflict behavior is arrival-oriented rather than a documented cross-device freshness policy.

Phase 1 should make these distinctions visible to facts and insights without breaking existing local diary behavior.

---

## 7. Existing Reusable Systems

### REUSE EXISTING

- `CaloraContext` for local-first ownership and immediate rendering.
- `PersistenceManager` for serialized writes and destructive-clear safety.
- Food Memory’s component calculations, provenance dimensions, confidence structures, and draft/accept/reject workflow.
- `weeklySignals`, `livingState`, and `livingMemory`.
- Coach context size/missing-data/sanitization patterns.
- Supabase authentication and route-level user ownership checks.
- Persistent fixed-window rate-limit helper.
- Recipe L1/L2 caching, TTL, stale-while-refresh, single-flight, and warmup throttling patterns.
- Coach JSON validation and navigation action allowlist.
- Capture’s review-before-accept interaction.
- Planner’s deterministic fallback strategy.
- Server-side RevenueCat entitlement authorization.

### EXTEND EXISTING

- Extend food provenance to fact-level and daily/weekly evidence rollups.
- Extract or wrap current nutrition arithmetic as a shared deterministic domain service.
- Extend Coach context with versioned facts, evidence references, confidence, and explicit freshness.
- Align Coach and Progress on a common weight baseline selector.
- Extend diary sync contracts only when necessary to preserve required provenance/timestamp data.
- Use existing local persistence schema versioning for future additive Intelligence state.
- Apply existing rate-limit/cache patterns to expensive Intelligence-related calls.

### DO NOT CHANGE

- Immediate local diary visibility and offline-first logging.
- Existing FoodLog identifiers, date/meal compatibility, and idempotent sync behavior.
- Capture review-before-accept behavior.
- User-scoped authenticated server routes.
- Premium entitlement enforcement on the server.
- Coach consent, no-mutation rules, and allowlisted navigation.
- Provider keys remaining server-side.
- Safe local clear ordering.

---

## 8. Database and Schema Implications

### 8.1 Current schema findings

The Drizzle schema describes a richer relational model than the startup DDL provisions. In particular, the startup DDL does not clearly create every typed table, including some profile, weight, saved-meal, recipe, subscription, and consent structures.

This is a schema-parity concern before adding Intelligence persistence.

### 8.2 Current persistence split

| Data domain | Current practical authority |
|---|---|
| Food diary in current session | Local Calora state + AsyncStorage |
| Authenticated diary backup/sync | PostgreSQL |
| Food capture sessions/candidates | PostgreSQL for eligible authenticated flows |
| Profile/goals/preferences | Local state |
| Weights | Local state |
| Water/mood/activity | Local state |
| Health snapshot | Local state |
| Planner/shopping | Local state |
| Local/AI-created recipes | Local state |
| Remote recipe browse results | API/React Query cache |
| Premium authorization | RevenueCat server-side |

### 8.3 Proposed future Intelligence schema

Phase 1 should not copy or rewrite raw diary data. If persistence is approved, add minimal, additive, versioned records:

#### `calora_intelligence_context_versions`

- user ID;
- source watermark/version;
- date/time window;
- timezone/day-boundary metadata;
- deterministic calculation schema version;
- generated timestamp;
- freshness state.

#### `calora_intelligence_facts`

- user ID;
- fact type;
- deterministic value/value range;
- source/evidence quality;
- evidence references;
- calculation version;
- source watermark;
- confidence;
- valid-from and valid-until;
- invalidation state.

#### `calora_intelligence_insights`

- user ID;
- insight type;
- linked fact/evidence IDs;
- confidence;
- display payload;
- allowed action/navigation identifier;
- status: generated, active, suppressed, expired;
- generation and expiration timestamps;
- invalidation watermark.

#### `calora_intelligence_feedback`

This should be deferred until later adaptive phases and explicit privacy/retention approval. It must not be added merely because it is technically useful.

### 8.4 Schema requirements before any migration

1. Establish one authoritative migration process.
2. Resolve Drizzle/startup-DDL parity.
3. Confirm production RLS and tenant isolation.
4. Define account-deletion behavior for all Intelligence records.
5. Define retention and expiration behavior.
6. Define indexes for user, active status, validity window, and source watermark.
7. Keep new fields/tables additive and nullable where older clients may exist.
8. Avoid persisting raw images, raw audio, raw Coach history, or full raw provider payloads by default.

---

## 9. Required New Services and Modules

### 9.1 Deterministic Intelligence Facts service

**NEW COMPONENT REQUIRED**

This is the central Phase 1 module. It should create versioned, read-only facts from current Calora data.

#### Inputs

- normalized food logs;
- food-memory component data where available;
- profile goal and targets;
- local weights;
- water/mood/activity;
- planner context;
- source provenance and confidence;
- timezone/day-boundary state;
- explicit missing-data state.

#### Outputs

- canonical calorie/macro totals;
- verified/estimated/manual/provider partitions;
- target comparisons;
- meal distribution;
- logging consistency;
- weight baseline facts;
- missing-data/freshness state;
- confidence;
- evidence references;
- calculation version;
- valid/expiry/invalidation metadata.

### 9.2 Evidence and confidence framework

**NEW COMPONENT REQUIRED**

The framework must distinguish:

- deterministic calculation confidence;
- verified label/barcode/provider evidence;
- user-entered values;
- manual corrections;
- AI/capture estimates;
- incomplete or conflicting data;
- statistical pattern confidence.

It must never transform “AI estimated” into “verified.”

### 9.3 Insight repository and lifecycle service

**NEW COMPONENT REQUIRED**

Responsible for:

- candidate generation;
- evidence validation;
- confidence thresholding;
- ranking;
- display eligibility;
- suppression;
- deduplication;
- expiry;
- invalidation after changes to logs, profile, goals, weights, or timezone.

### 9.4 Shared AI policy and observability gateway

**NEW COMPONENT REQUIRED**

Use a shared policy boundary for Coach, recipes, planner, capture, and future Intelligence:

- request IDs;
- model/version metadata;
- bounded request/response sizes;
- timeout policy;
- cache behavior;
- token/cost telemetry;
- prompt-injection handling;
- sensitive-content routing;
- structured provider failure behavior;
- raw-media non-retention controls.

### 9.5 Local/server context adapters

**NEW COMPONENT REQUIRED**

There should be distinct adapters for:

- local mobile state;
- authenticated server-backed diary data;
- incomplete/stale/offline state.

Do not falsely imply that server state is the full user profile while profiles, wellness, health, planner, shopping, and weights remain local-only.

---

## 10. Security and Privacy Findings

| Finding | Impact | Recommendation |
|---|---|---|
| No repository RLS evidence | Tenant isolation at DB level is **UNKNOWN** | Resolve before persisting sensitive Intelligence facts/insights |
| Client-supplied Coach context | Caller can send fabricated context | Keep Coach explanatory/non-authoritative until server-backed facts exist |
| Mixed nutrition provenance | Estimates can affect totals like verified values | Add evidence partitions before surfacing conclusions |
| Prompt injection from user/provider content | Food titles, notes, recipes, and messages are untrusted | Preserve Coach protections; build shared policy boundary |
| Sensitive health/nutrition context sent to AI | Privacy/retention concern | Maintain consent; minimize fields; verify provider retention settings |
| Image/audio capture | Media can be sent to providers | Preserve delete-after-analysis behavior; formalize retention policy |
| Authenticated rate limit can fail open | Cost/abuse risk during DB issue | Consider fail-closed/secondary spending limits for high-cost paths |
| Unrestricted CORS and 15 MB parsing | Larger unauthenticated abuse surface | Review before adding public endpoints |
| In-memory cache growth | Memory exhaustion/operational risk | Add bounds and observable eviction for new cache use |
| Account deletion | New Intelligence tables could retain data | Build deletion behavior into the schema/service design from day one |
| Subscription boundary | Premium routes are server-authorized | Do not route Intelligence around RevenueCat checks |

### Existing security systems to preserve

- Supabase bearer verification;
- user-scoped ownership filtering;
- server-side RevenueCat authorization;
- persistent rate limiting;
- Coach consent;
- Coach sensitive-topic fallback;
- Coach JSON/Zod response validation;
- action route allowlists;
- capture review-before-accept;
- account-deletion state/recovery behavior.

### Unknown security properties

- Actual Supabase RLS policies;
- provider-side data retention/data-use settings;
- production secret rotation;
- edge/WAF/TLS configuration;
- production logging retention;
- external penetration-test status;
- externally managed background worker or queue configuration.

---

## 11. Performance and Reliability Risks

1. **Local render pressure.** Today, Insights, Planner, and Coach already derive from local arrays. Recomputing broad history on every render could degrade mobile interaction.
2. **Duplicate arithmetic.** Parallel calculations in Today, Coach, Insights, and an Intelligence layer would increase both drift and unnecessary work.
3. **Unbounded in-memory caching.** Existing recipe cache maps appear process-local and without a clearly evidenced eviction limit.
4. **No durable job model found.** Daily/weekly recomputation and retries require careful design if a queue is not introduced.
5. **Insight staleness.** A fact or insight can become invalid after a logged meal, edit, deletion, goal change, weight change, timezone change, or planner change.
6. **Offline/server disagreement.** Local state may be newer or richer than the server. Intelligence must disclose freshness rather than silently presenting a remote snapshot as current.
7. **Sync omissions/conflicts.** Existing signature/payload behavior omits some data fields, and server conflict behavior does not appear to use a documented client freshness ordering.
8. **Remote recipe availability.** Saved remote recipe IDs do not necessarily make full remote content durable offline.

---

## 12. AI and API Cost Risks

| Surface | Current protections | Main gap |
|---|---|---|
| Coach | Persistent rate limit, bounded context, JSON output | No clear timeout, cache, daily spend budget, model fallback, or cost telemetry |
| Capture | Provider-first path where appropriate; persistent limits | Estimate reconciliation and central observability need strengthening |
| Recipe concepts | Auth/guest quotas and bounded request bodies | Centralized cost attribution is absent |
| Recipe nutrition | Strong cache/coalescing behavior | Cached AI estimates can persist and appear more authoritative than intended |
| Planner | User limit plus deterministic fallback | Future explanations must be based on shared facts |
| Future Intelligence | Not implemented | Must not call an LLM for deterministic totals, threshold checks, or simple aggregation |

### Cost-control rule

Deterministic calculations must generate facts and insight eligibility. An LLM may explain a supported fact, but it should not be used to calculate a daily total, determine data freshness, establish evidence quality, or generate a result that can be calculated deterministically.

---

## 13. Potential Regression Points

1. Today totals changing after canonicalization.
2. Macro/calorie displays diverging after an edit that changes only one numeric field.
3. Coach and Progress using different weight baselines.
4. Local-first logging accidentally becoming dependent on API availability.
5. Expanded provenance fields breaking diary sync compatibility.
6. Future Intelligence records surviving account deletion.
7. AsyncStorage schema changes breaking hydration of existing users.
8. AI recipe/capture estimates being represented as verified data.
9. Coach contradicting Today, Planner, Recipes, or Progress.
10. Cached insights persisting after meal deletion or changed goals.
11. Premium recommendation behavior bypassing entitlement boundaries.
12. Feature flags producing inconsistent mobile/API state.
13. Timezone changes assigning facts/insights to the wrong day.
14. Server schema differences appearing only on a fresh deployment.

---

## 14. Recommended Intelligence Engine Architecture

```text
Existing Calora local state / authenticated server diary
          │
          ▼
Input adapters + freshness metadata
          │
          ▼
Deterministic Nutrition and Context Facts
  - totals and target comparisons
  - provenance/evidence partitions
  - missing-data state
  - baseline selection
  - calculation schema version
          │
          ├───────────────────────┐
          ▼                       ▼
Insight rule engine          Coach fact adapter
  - thresholds                - explanation only
  - confidence                - read-only
  - ranking                   - evidence/confidence aware
  - expiry                    - allowlisted navigation only
  - invalidation
          │                       │
          ▼                       ▼
Insight repository                Existing Coach API/UI
          │
          ▼
Contextual delivery adapters
Today / post-log / Progress / Recipes / Planner
```

### Architectural rules

1. **Facts are the shared contract.** Every later surface should consume the same facts, evidence, freshness, and confidence.
2. **Intelligence is not the data owner.** It reads existing state; it does not replace diary, profile, planner, or nutrition records.
3. **LLMs explain; deterministic code calculates.**
4. **Evidence must travel with conclusions.** An insight must know whether it relies on verified, manual, provider, or AI-estimated inputs.
5. **Insights expire.** Cached advice must not remain active after relevant data changes.
6. **Missing data is a supported state.** The system should say “not enough information” rather than fabricate a conclusion.
7. **Coach is downstream of facts.** Coach should not independently invent a contradictory understanding of the user.
8. **Local-first UX remains intact.** Offline and immediate logging behavior must remain functional with Intelligence disabled or unavailable.

---

## 15. Integration Classification and Affected Files

### 15.1 Classification summary

| Classification | Systems |
|---|---|
| **REUSE EXISTING** | Local persistence, Food Memory arithmetic/provenance, weekly signals, living state/memory, Coach safety and action validation, capture review flow, rate limiting, cache/coalescing patterns |
| **EXTEND EXISTING** | Shared deterministic totals, Coach context, Progress baseline, diary sync fields where required, local schema versioning, observability |
| **NEW COMPONENT REQUIRED** | Intelligence facts, evidence model, confidence/ranking rules, insight repository/lifecycle, context adapters, shared AI policy/observability |
| **DO NOT CHANGE** | Local-first logging ownership, existing Coach mutation boundary, server entitlement checks, user scoping, provider-secret location, clear-data safety |

### 15.2 Likely new files in Phase 1

Exact paths should be confirmed after Phase 1 approval, but the following structure fits the current repository:

```text
artifacts/calora/lib/intelligence/types.ts
artifacts/calora/lib/intelligence/facts.ts
artifacts/calora/lib/intelligence/contextAdapter.ts
artifacts/calora/lib/intelligence/confidence.ts
artifacts/calora/lib/intelligence/insightRules.ts
artifacts/calora/lib/intelligence/invalidation.ts
artifacts/calora/lib/intelligence/featureFlags.ts

artifacts/api-server/src/lib/intelligence/types.ts
artifacts/api-server/src/lib/intelligence/facts.ts
artifacts/api-server/src/lib/intelligence/insight-repository.ts
artifacts/api-server/src/lib/intelligence/observability.ts
artifacts/api-server/src/routes/intelligence.ts

lib/db/src/schema/intelligence.ts
```

The migration location is **UNKNOWN** until migration authority is resolved.

### 15.3 Likely existing files to modify later

| File | Classification | Reason |
|---|---|---|
| `artifacts/calora/context/CaloraContext.tsx` | EXTEND EXISTING | Expose read-only adapter inputs without changing local ownership |
| `artifacts/calora/lib/foodMemory.ts` | EXTEND EXISTING | Reuse/extract canonical arithmetic and evidence rollups |
| `artifacts/calora/lib/coachContext.ts` | EXTEND EXISTING | Consume structured facts/evidence rather than duplicate conclusions |
| `artifacts/calora/app/(tabs)/index.tsx` | EXTEND EXISTING, later | Deliver narrowly scoped Today insight once facts are proven |
| `artifacts/calora/app/(tabs)/insights.tsx` | EXTEND EXISTING, later | Use shared facts for interpretation |
| `artifacts/calora/app/coach.tsx` | EXTEND EXISTING, later | Render evidence/confidence/safety state |
| `artifacts/api-server/src/routes/coach.ts` | EXTEND EXISTING, later | Accept trusted structured facts and add bounded cost/timeout controls |
| `artifacts/api-server/src/routes/sync.ts` | EXTEND EXISTING only if needed | Preserve expanded provenance/timestamp contracts |
| `artifacts/api-server/src/index.ts` | EXTEND EXISTING | Only after migration/schema authority is reconciled |
| `lib/db/src/schema/index.ts` | EXTEND EXISTING | Export the approved Intelligence schema |

---

## 16. Feature-Flag Strategy

Do not use a single broad Intelligence switch. Use independently controllable, safe-by-default flags:

| Flag | Purpose |
|---|---|
| `intelligence.foundation.enabled` | Enables fact/context computation only; no UI delivery |
| `intelligence.facts.local_adapter` | Enables facts derived from CaloraContext |
| `intelligence.facts.server_adapter` | Enables future server-backed verification where data exists |
| `intelligence.insights.today` | Enables Today delivery |
| `intelligence.insights.post_log` | Enables post-log impact intelligence |
| `intelligence.insights.progress` | Enables Progress interpretation |
| `intelligence.coach.fact_context` | Lets Coach consume structured Intelligence facts |
| `intelligence.evidence.display` | Shows evidence/confidence rationale |
| `intelligence.observability` | Emits safe diagnostics/metrics |
| `intelligence.feedback` | Future feedback-learning layer; disabled by default |
| `intelligence.proactive` | Future notification/proactive behavior; disabled by default |

### Flag requirements

- Disabled must preserve current Calora behavior.
- Flags should support controlled QA/allowlist activation.
- Mobile and API evaluation must not disagree where both participate.
- Flag diagnostics must not log sensitive raw data.
- A flag rollback must be safe even with existing additive persisted records.

---

## 17. Proposed Migration Strategy

### Phase 1 posture

No broad user-data migration should occur in Phase 1.

Start with additive, versioned, optional contracts and records only.

1. Resolve migration ownership and fresh-schema parity.
2. Add only additive Intelligence tables and fields.
3. Do not mutate raw diary, food, profile, planner, or recipe records.
4. Build facts from adapters rather than copying all raw source data.
5. Create indexes for user, active status, validity, and source watermark.
6. Add account-deletion cleanup behavior before enabling materialized facts/insights.
7. Version fact calculations and context schemas.
8. Keep old mobile clients safe through nullable/additive contracts and disabled defaults.

### Decisions required before later phases

| Topic | Decision needed |
|---|---|
| Local-first profile/wellness/weights | Whether and when these domains are synchronized server-side |
| Server diary authority | Whether server becomes a true read model or remains backup/verification |
| Nutrition evidence | How verified, provider, manual, corrected, and AI estimates are partitioned |
| Timezone | Canonical user day-boundary policy |
| Cross-device edits | Explicit conflict-resolution policy |
| Retention | Fact, insight, evidence, and feedback expiry/deletion rules |
| Cached AI nutrition | Versioning, refresh, and stale-output policy |
| RLS | Production tenant isolation confirmation and enforcement |

---

## 18. Exact Phase 1 Plan

**This section is a recommended implementation sequence only. It is not approval to begin Phase 1.**

### Step 1 — Establish typed contracts, no UI delivery

Define:

- `IntelligenceFact`;
- `IntelligenceEvidence`;
- `IntelligenceContext`;
- `InsightCandidate`;
- `InsightConfidence`;
- `InsightStatus`;
- `InsightInvalidationEvent`.

Classification: **NEW COMPONENT REQUIRED**

### Step 2 — Extract deterministic calculation adapters

Build a pure calculation layer from existing:

- `FoodLog`;
- Food Memory components;
- profile targets;
- weights;
- local wellness;
- planner state.

It must return totals, source-quality partitions, missing-data state, timestamps, evidence references, confidence, and calculation version.

Classification: **EXTEND EXISTING**

### Step 3 — Build read-only local context adapter

Build from `CaloraContext` without changing current logging behavior, persistence, or source ownership.

Classification: **EXTEND EXISTING**

### Step 4 — Reconcile schema/migration/RLS posture

Before adding persisted Intelligence data:

- establish authoritative migrations;
- verify fresh-database parity;
- confirm RLS/tenant isolation;
- define deletion/retention behavior.

Classification: **FOUNDATIONAL PREREQUISITE**

### Step 5 — Add optional server fact/insight repository

Add only after Step 4. Start disabled by feature flag and store only the minimum materialized structured data required.

Classification: **NEW COMPONENT REQUIRED**

### Step 6 — Add deterministic confidence, ranking, and lifecycle rules

Initial insight types should be narrowly descriptive:

- today’s calorie/macro status;
- data completeness;
- meal distribution;
- simple logging consistency.

Do not begin with health diagnosis, causal claims, prediction, or prescriptive target changes.

### Step 7 — Add observability and safe failure behavior

Capture safe metadata only:

- fact/insight version;
- duration;
- cache behavior;
- invalidation cause;
- feature flag state;
- provider/model use when relevant;
- failure category.

Do not include raw food notes, raw chat, raw image/audio, or full provider payloads in diagnostics.

### Step 8 — Test, validate parity, and stop

No broad UI delivery and no Coach rewrite in Phase 1. Prove fact parity and stale-invalidation behavior first.

---

## 19. Testing Requirements

### 19.1 Unit tests

- Food Memory arithmetic parity with Intelligence calculations.
- Meal/day/week aggregation.
- Calories/macros bound handling.
- Serving/eaten-fraction behavior.
- Verified/estimated/manual/provider evidence partitions.
- Missing-data behavior.
- Confidence thresholds and ranking.
- Weight baseline selection.
- Timezone/day-boundary behavior.
- Fact calculation versioning.
- Insight deduplication and suppression.
- Expiry/invalidation after:
  - food add;
  - food edit;
  - food deletion;
  - goal change;
  - target change;
  - weight change;
  - timezone change;
  - preference change.

### 19.2 Integration tests

- User-scoped fact and insight repository access.
- Schema setup/migration on a clean database.
- Feature flag disabled behavior.
- Feature flag rollout behavior.
- Account deletion/recovery cleanup.
- Authentication/authorization.
- RLS behavior after production policy confirmation.
- Diary sync compatibility.
- Local/server freshness behavior.
- Coach structured fact handoff.
- Coach no-mutation boundary.

### 19.3 Real-user flow tests

- New user with no history.
- One-day user.
- Regular user.
- Inconsistent logger.
- Heavy logger.
- User with mostly AI-estimated entries.
- User with verified barcode/label/provider entries.
- Offline user.
- Stale local state.
- Changed goal.
- Changed target.
- Changed timezone.
- Provider outage.
- LLM timeout.
- Rate-limit or quota exhaustion.
- Account deletion and recovery.

### 19.4 Adversarial tests

- Prompt injection in food names, notes, recipe titles, and Coach messages.
- Fabricated client Coach context.
- Cross-user fact/insight access attempts.
- Stale insight after a meal is deleted.
- Unsupported causal conclusions.
- Hallucinated nutrition values.
- Contradictory Coach/Today/Planner/Progress outputs.
- Malformed model JSON.
- Provider-cache poisoning.
- Abuse of anonymous or high-cost endpoints.
- Attempts to cause Coach or insights to mutate state.

---

## 20. Unknowns and Decisions Required

The following items are not established by repository evidence and must remain explicitly **UNKNOWN** until verified:

1. Production Supabase RLS policies and database tenant isolation.
2. Production migration execution process.
3. Whether deployed database schema fully matches Drizzle and startup DDL.
4. AI/provider data retention and data-use configuration.
5. Production secret-rotation process.
6. Edge, WAF, TLS, and request filtering configuration.
7. Production logging/monitoring retention policy.
8. Durable queue or background-job infrastructure outside the repo.
9. RevenueCat webhook/reconciliation implementation.
10. Intended cross-device sync strategy for profile, wellness, planner, shopping, recipes, and weights.
11. Cross-device diary conflict-resolution policy.
12. Legal/privacy approval for adaptive learning and feedback retention.
13. Whether health data may be persisted server-side for future Intelligence.

---

## 21. Phase 0 Conclusion

Calora is well-positioned for carefully staged Intelligence because it already has:

- a local-first, resilient user state model;
- useful structured data;
- deterministic calculation primitives;
- privacy-aware local memory;
- a safe Coach boundary;
- server-side auth, rate limits, and subscription controls;
- established AI fallback and caching patterns.

The necessary next move is foundational, not cosmetic:

> Build one deterministic, evidence-aware, versioned facts layer before introducing broad insight delivery or changing Coach behavior.

The first implementation should preserve all current behavior with feature flags disabled by default. It should not make the server a false owner of local-only data, should not replace existing diary/progress arithmetic without parity proof, and should not allow model output to establish nutrition truth.

### Recommended approval boundary

Approve Phase 1 only if the work is limited to:

1. schema/migration/RLS clarification;
2. typed Intelligence contracts;
3. deterministic local fact/context adapters;
4. confidence/evidence/lifecycle rules;
5. optional additive repository design;
6. feature flags;
7. observability;
8. comprehensive parity, safety, and stale-invalidation tests;
9. no broad UI redesign;
10. no automatic Coach rewrite.

No Phase 1 implementation has been performed as part of this audit.