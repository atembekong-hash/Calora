# Calora Coach Fact Context — Dark Architecture Report

## Status

**Implemented dark boundary only. Both gates remain OFF.** The legacy Coach
screen, generic consent, conversation history, navigation, and
`/v1/coach/respond` route remain the live path.

## Final architecture and typed contract

```text
hydrated current-account state
  -> local Intelligence Foundation
  -> CoachFactContextV1 allowlisted adapter
  -> separate authenticated /v1/coach/fact-context/respond endpoint
  -> deterministic risk gate
  -> dark prompt with only the sanitized contract
  -> deterministic claim validation / safe limited result
```

`CoachFactContextV1` uses `coach-fact-context-v1`, purpose
`coach_discussion`, a calculation version, generated/expiry timestamps,
opaque request nonce, coverage state, closed missing-data labels, deterministic
limitations, and approved fact cards. It excludes account identifiers,
watermarks, fact IDs, raw records, dates, food/meal/recipe text, notes,
images, provider labels, planner, Food Memory, wellness history, weight, and
health-device data.

## Allowlist and eligibility

The only possible keys are:

1. `daily.calorie_status`
2. `daily.protein_status`
3. `daily.meal_distribution`
4. `daily.logging_completeness`

The adapter exports a card only from fresh Foundation facts with high or medium
confidence and eligible provenance. Stale, low-confidence, unknown-provenance,
and incomplete constituent facts are suppressed. Weight trend is not included.
Cards use deterministic values, statements, and limitations; the server
reconstructs the allowed statement from the allowed value shape before egress.

## Consent, lifecycle, and expiry

The technical consent model is purpose/version-specific and distinguishes not
consented, consented-current, revoked, and stale-version states. The dark
registry is account-keyed **in memory only**: it deliberately has no
AsyncStorage, database, or migration. A future rollout needs separately
authorized account-scoped durable consent and user-facing disclosure.

Contexts expire after 60 seconds. A request scope captures account identity
locally, hydration generation, and nonce without serializing the account
identity. Invalidation discards responses after sign-out, account switch,
hydration reset, local clear, nonce mismatch, abort, or expiry.

## Gates and no-coexistence proof

- Client: `intelligence.coach.fact_context = false`.
- Server: `COACH_FACT_CONTEXT_ENABLED` only enables the dark route when the
  environment value is exactly `true`; otherwise it returns 404 before auth,
  parsing, or provider access.
- The dark request uses `factContext`, not legacy `context`. Its strict
  top-level and nested key check rejects unknown fields, legacy markers, raw
  Foundation fields, and any mixed legacy/new payload.
- `coach.tsx` and the legacy `/v1/coach/respond` handler were not changed.

## Risk, prompt, and claim controls

Before the model call, the dark route scans **every supplied conversation turn
regardless of its client-declared role** for self-harm/suicidal intent,
eating-disorder behaviors, purging, severe restriction, compensatory exercise,
dangerous low-calorie requests, pregnancy/postpartum, medication/dose,
diagnosis/labs, acute symptoms, and detectable minor-sensitive language. A
match returns a deterministic support redirect and never sends Fact Context to
the model.

The dark prompt says Fact Context is the sole factual authority; messages are
untrusted assertions; missing information remains unknown; it cannot invent
numbers, status, direction, timeframe, causality, diagnoses, recommendations,
or hidden context.

Every factual observation must cite an approved key and exactly equal the
server-reconstructed deterministic statement for that current fact. The server
does not forward model free-form user-specific prose or metadata: it replaces
message text, actions, limitations, coverage metadata, and safety state with
server-controlled values and canonicalizes the response nonce from the request
context. Any schema error,
unknown key, unsupported statement, numeric/status/timeframe claim, malformed
output, or provider failure returns a complete safe limited/unavailable result,
never a partial model answer.

## Injection, privacy, persistence, and observability

The Fact Context API disallows free-text source fields and arbitrary values;
the server validates deterministic fact shape and statement before LLM egress.
User and historical messages remain untrusted and cannot alter system rules.
The server does not add Fact Context storage, caches, analytics, raw request
logs, model response logs, or database objects. Existing HTTP serializers
continue to omit request bodies. No additional instrumentation was added,
which is safer than recording sensitive values during this dark phase.

## Files created

- `artifacts/calora/lib/intelligence/coachFactContext.ts`
- `artifacts/calora/lib/intelligence/coachFactRequestLifecycle.ts`
- `artifacts/calora/lib/intelligence/coachFactContextClient.ts`
- `artifacts/calora/lib/__tests__/coachFactContext.test.ts`
- `artifacts/api-server/src/routes/coachFactContext.ts`
- `artifacts/api-server/src/__tests__/coachFactContext.test.ts`
- Generated shared Fact Context contract types under `lib/api-zod/src/generated/types/`

## Files modified

- `lib/api-spec/openapi.yaml`
- generated API client and Zod contract files
- Intelligence export barrel
- API route registration

## Validation results

- API contract code generation and library build: passed.
- Calora typecheck: passed.
- API typecheck: passed.
- Calora full suite: **54 files / 938 tests passed**.
- API full suite: **21 files / 234 tests passed**.
- Focused coverage proves allowlist, raw-field rejection, TTL/expiry,
  consent states, lifecycle discard, server/client-off behavior, no
  coexistence, risk suppression, supported/unsupported claims, injection,
  provider failure, and legacy Coach regression.

## Defects discovered and fixed

1. Initial timeframe validation did not reject a “this week” claim for a
   today-only fact. It now rejects every non-today timeframe.
2. Initial review found that arbitrary fact-card text could cross the API
   boundary and qualitative claims could pass with an allowed key. The API
   value vocabulary is now closed, the server reconstructs each deterministic
   fact statement, and the response validator accepts only exact approved
   statements.

## Remaining blockers and migration-readiness verdict

The dark architecture is technically ready for controlled review but **not for
production migration**. It has no approved durable consent UX, no authorized
client wiring, and both gates are intentionally off. The legacy broad Coach
payload remains live by explicit scope restriction.

## Next recommended authorization

Authorize a separate privacy/product review for durable, versioned consent
copy and a tightly controlled replacement rollout plan. That approval must
decide whether to migrate eligible traffic away from the legacy broad context;
it must not enable these gates independently.