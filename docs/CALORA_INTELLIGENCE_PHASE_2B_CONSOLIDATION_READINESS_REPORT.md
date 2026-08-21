# Calora Intelligence Phase 2B — Consolidation and Coach Fact Context Activation-Readiness Report

## Scope and posture

This is a review, consolidation, and readiness assessment only. No production behavior, feature flag, cohort, consent state, Coach route, allowlist, persistence system, API, or LLM capability was changed.

All currently default-off Intelligence capabilities remain off. Coach Fact Context remains client-off, server-off, and cohort-denied.

## Executive assessment

The Phase 2A local Intelligence system is coherent enough to freeze: its Foundation is local and account-scoped, visible delivery is stateless and fail-closed, and the one-card Progress hierarchy remains understandable if no further Phase 2A candidates are added.

The Coach Fact Context dark boundary is strongly constrained, but it is **not ready for separately authorized controlled activation**. The primary blockers are deployable consent ownership and lifecycle wiring, plus provider deadline behavior. These are activation blockers, not deferred device/accessibility debt.

## 1. Definitive Intelligence ownership matrix

| Area | Owner / source of truth | Consumer | Boundary and responsibility |
| --- | --- | --- | --- |
| Local source snapshot | Account-keyed Calora state and hydration boundary | `createIntelligenceContext` | Snapshot is cloned and local-only; account/hydration changes must clear visible output synchronously |
| Intelligence context | `contextAdapter` | Foundation fact builder | Includes broad local state but does not itself authorize Coach egress |
| Daily nutrition facts | Foundation fact builder | Today, Progress, Post-Log selectors | Current-day facts use a coherent current-day watermark |
| Weight short trend | Foundation + strict trend helper | Optional Progress candidate | Separate 28-day local fact; default-off delivery |
| Nutrition coverage | Foundation + seven-day coverage helper | Optional Progress candidate | Count-only recorded dates; default-off delivery |
| Macro record coverage | Foundation + macro-record helper | Optional Progress candidate | Count-only valid stored-field dates; default-off delivery |
| Selector | Contextual selector | Today and Progress wrappers | Pure, one-card, priority-ordered, no I/O |
| Today delivery | Today wrapper | Today screen | Excludes weight baseline; no longitudinal opt-ins |
| Progress delivery | Progress local-insight wiring | Progress screen | Explicit subflags gate longitudinal candidates |
| Post-Log delivery | Post-Log selector in log mutation path | Post-Log UI | Commit-boundary transition only |
| Feature flags | `featureFlags` | All local delivery consumers | Default deny for optional longitudinal, Coach, and proactive paths |
| Invalidation classification | `invalidation` mapping | Tests and future cache/invalidation owners | Explicit family metadata; presently declarative, not an active cache engine |
| Daily freshness | Daily source watermark | Selector | Current-day facts must agree within their snapshot |
| Longitudinal freshness | Fact-specific scoped watermarks | Selector | Multi-day families may share a window but have distinct valid fact scopes |
| Coach projection | `CoachFactContextV1` builder | Dark request lifecycle | Narrows broad local Foundation to an allowlisted, sanitized payload |
| Durable consent | Server consent route/table schema | Intended future activation coordinator | Server must remain authoritative; local cache cannot authorize |
| Consent cache | Local status-only cache | UI/lifecycle helper | Must invalidate on revoke, sign-out, account switch, clear, and deletion; it cannot be the source of truth |
| Client Coach gate | `intelligence.coach.fact_context` | Dormant UI/request path | Default-off |
| Server Coach gate | `COACH_FACT_CONTEXT_ENABLED` | Fact Context server endpoint | Exact true required; default-off |
| Cohort gate | Server rollout policy | Fact Context server endpoint | Current policy denies all cohorts |
| Risk gate | Server route | Pre-provider request handling | Screens every supplied turn before provider egress |
| Claim validator | Server route | Provider response handling | Deterministically rejects unsupported claims |
| Legacy Coach | Existing `/v1/coach/respond` request path | Live Coach UI | Remains live, isolated, and unchanged; no automatic fallback/coexistence |

### Orphaned, duplicate, and ambiguous responsibilities

- **Lifecycle/consent routing is ambiguous:** local cache, lifecycle helper, Fact Context builder, and dormant request helper exist, but no single client-side activation-time owner obtains authoritative server consent, binds the active account/hydration generation, selects exactly one context architecture, and handles revoke/delete/switch.
- **Invalidation is declarative rather than operational:** the mapping is sound as a classification contract but does not independently drive a persisted cache. This is acceptable for the current render-derived local model; it should not be mistaken for a general invalidation service.
- **Coverage signals overlap:** nutrition coverage and macro record coverage are intentionally distinct but nested record-quality concepts. They should not be expanded further without product evidence.
- **Weight signals overlap at low evidence:** baseline remains a fallback while short trend is richer when adequate history exists.

## 2. Selector architecture review

| Priority | Candidate | Assessment |
| ---: | --- | --- |
| 400 | Calorie status | Defensible highest current-day state |
| 300 | Protein balance | Defensible below calorie status |
| 200 | Meal distribution | Bounded current-day descriptive observation |
| 150 | Weight short trend | Appropriate optional historical signal |
| 125 | Nutrition coverage | Appropriate optional record-coverage signal |
| 110 | Macro record coverage | Appropriate lower-priority, record-only refinement |
| 100 | Weight baseline | Useful low-evidence fallback |

The one-card policy remains correct for noise control and safety. The priority order remains defensible because current-day signals outrank descriptive longitudinal context.

No priorities should change in Phase 2B. No candidate should be added. The architecture would become unnecessarily complex if more candidates were introduced before an activation/retirement decision for the existing dark signals.

### Future consolidation candidates, not authorized now

- Weight baseline may eventually be retired or replaced by short trend after separate product, evidence, and rollout review.
- Nutrition coverage and macro record coverage may eventually be consolidated if user research shows their distinction is not meaningful.
- No existing candidate should be retired, merged, enabled, or reprioritized in this phase.

## 3. Phase 2A expansion freeze

Phase 2A is frozen:

- no new Foundation facts;
- no new selector candidates;
- no new Progress cards;
- no new longitudinal Intelligence;
- no Planner or Recipe Intelligence;
- no default-off flag activation.

## 4. Coach Fact Context boundary audit

### Current verified strengths

- The configured Fact Context projection is allowlisted and sanitized; it does not send raw Foundation logs, food text, photos, account IDs, planner data, recipes, weights, or the Phase 2A.3–2A.5 longitudinal facts.
- Strict payload validation rejects legacy context, raw fields, unknown nested keys, and mixed legacy/new context payloads.
- Server consent, exact server gate, and deny-all cohort controls form layered default-deny entry gates.
- High-risk requests are screened before provider egress and receive deterministic safe handling.
- Unsupported provider claims, malformed output, empty output, and provider errors are contained into safe unavailable/limited responses.
- Legacy Coach and Fact Context do not automatically coexist or fall back into each other.
- Current gates are off, so these boundaries are not exposed to users or traffic.

### Readiness blockers

1. **Deployable durable consent is not proven.** The consent schema’s intended cascade relationship is sound, but a deployable migration creating the consent table was not found in the reviewed migration locations. The isolated integration test depends on a database and does not prove the account-deletion saga against deployed schema.

2. **No single owned client activation coordinator exists.** Dormant cache, registry, context-builder, and request-lifecycle pieces are not wired into an account-scoped routing owner. The live Coach UI still constructs/sends legacy context. A flag change alone would not safely select exactly one architecture or reliably coordinate authoritative consent, revoke, sign-out, clear, delete, account switch, and hydration generation.

3. **Provider deadline behavior is incomplete.** Provider rejection and invalid responses fail closed, but no enforced timeout/abort boundary was found for a hung provider request. A hung request can violate the documented safe-unavailable and latency guarantees.

4. **Replay policy is undecided.** Current nonces are client-generated and TTL-limited; the server does not atomically consume them per account. This does not bypass bearer authentication, server consent, cohort denial, or account isolation, and rate limits bound duplicate egress. It is not independently blocking unless the future policy promises exactly-once egress/audit semantics. That policy decision must be explicit before activation.

5. **Incomplete-source behavior should be made explicit.** The client adapter can construct values from nullable finite sources before the server’s deterministic reconstruction rejects malformed facts. The result fails closed, but it can cause avoidable safe-unavailable responses without a clear user-facing lifecycle owner.

## 5. Frozen Coach Fact Context allowlist

The exact current eligible projection remains limited to the existing sanitized daily Fact Context fields:

- daily calories consumed;
- daily calorie target;
- daily protein consumed;
- daily protein target.

Admission remains subject to local validity, freshness, and the existing strict Fact Context projection/validator.

The following must **not** enter Coach automatically:

- weight baseline or short trend;
- nutrition coverage;
- macro record coverage;
- meals, raw food logs, notes, photos, recipes, planner, shopping, wellness, activity, or health data;
- arbitrary legacy CoachContext fields;
- unknown future Foundation facts.

No allowlist expansion is authorized.

## 6. Legacy Coach retirement path

Legacy Coach cannot be retired yet. A future retirement requires:

- owned Fact Context routing that can choose exactly one architecture;
- capability and response-quality comparison against the legacy path;
- server-authoritative consent, version, revoke, deletion, and cohort behavior;
- user conversation-continuity decisions;
- proven account switch/sign-out/hydration/clear lifecycle handling;
- rollback with no legacy/new context coexistence;
- real rollout evidence for usefulness, latency, safety, and support burden;
- separate product, privacy, security, and engineering authorization.

The privacy advantage of Fact Context does not itself establish legacy feature parity or justify automatic migration.

## 7. Activation prerequisite checklist

### Blocking before any controlled activation

- [ ] Deploy and verify the durable Fact Context consent schema/migration in the target environment.
- [ ] Prove consent row cleanup through the real account-deletion flow and recreated-account scenario.
- [ ] Establish one account-scoped client activation coordinator for authoritative server consent, architecture selection, hydration generation, revoke, sign-out, switch, clear, and deletion invalidation.
- [ ] Prove no cache-only authorization can send Fact Context.
- [ ] Add a provider timeout/abort-safe deterministic unavailable result and test it.
- [ ] Decide and document nonce replay policy; if exactly-once semantics are required, use CSPRNG nonce issuance plus per-account atomic consumption.
- [ ] Verify client/server/cohort gate disagreement always fails closed.
- [ ] Keep cohort containment default-deny until a named, bounded server cohort design is approved.
- [ ] Rehearse flag-off and cohort-removal rollback with no late response or legacy/new context crossover.
- [ ] Confirm allowlist, claim validation, risk suppression, provider failure, and privacy-safe logging through current tests plus activation-specific tests.

### Deferred pre-production validation

These remain pending and do not block Phase 2B review, but they are required before a production-quality rollout decision:

- physical Android validation;
- physical iOS validation;
- responsive-layout validation beyond web smoke;
- large-text validation;
- TalkBack validation;
- VoiceOver validation;
- real-device performance and interaction-jank validation;
- authenticated browser and device account-switch, sign-out, offline, clear-data, and force-close journeys.

Security-critical consent, account-isolation, privacy, claim-validation, or cross-account failures cannot be reclassified as deferred validation debt.

## 8. Future controlled-activation GO/NO-GO rubric

| Outcome | Evidence threshold |
| --- | --- |
| **NO-GO** | Any cross-account leakage, cache-only authorization, consent/revocation failure, legacy/new coexistence, raw egress, unsupported claim acceptance, unbounded provider failure, or rollback failure |
| **INTERNAL-ONLY** | All blocking controls proven in test/staging; gates remain default-deny; named internal cohort; server-observable consent/cohort/latency/error signals; no migration |
| **LIMITED OPT-IN** | Internal criteria sustained; explicit user consent and server confirmation; bounded allowlist; named opt-in cohort; rollback rehearsal; usefulness and latency thresholds approved; no automatic legacy migration |
| **BROADER MIGRATION** | Limited opt-in evidence demonstrates privacy, security, account isolation, factual integrity, hallucination containment, acceptable provider failure/latency, user usefulness, supportability, and a separately approved legacy retirement plan |

All future stages require: privacy, security, consent, account isolation, factual integrity, hallucination containment, legacy separation, rollback, observability, provider failure, latency, response usefulness, and cohort containment evidence.

## 9. Architecture challenge findings

- The one-card selector is still appropriate, but Phase 2A candidate expansion must remain frozen.
- The selector’s multi-day watermark accommodation is justified for distinct scoped fact families; it is another reason not to add more families without delivery capacity.
- Feature flags are intentionally dark rather than dead; their ownership needs a single activation coordinator before any flag can safely be treated as rollout-ready.
- The consent migration/documentation story is ahead of deployable schema proof.
- The lifecycle design describes broad invalidation requirements, but call-site ownership is not yet proven across every relevant real user journey.
- The Fact Context dark architecture is secure by default today because all gates deny access. This must not be conflated with controlled-activation readiness.

## 10. Smallest exact remediation task

**Make Coach Fact Context authorization and failure boundaries deployable before any controlled activation**

Scope:

1. Add and verify the deployable durable-consent migration and account-deletion cascade behavior.
2. Add one account-scoped client activation coordinator that uses server-confirmed consent, selects exactly one Coach architecture, and invalidates safely on revoke, sign-out, switch, clear, hydration reset, and deletion.
3. Add an enforced provider timeout/abort-safe unavailable response.
4. Add real database and lifecycle tests proving those boundaries while all Fact Context gates and cohorts remain off.
5. Explicitly decide replay policy; implement server nonce consumption only if exactly-once egress/audit semantics are required.

This remediation must not activate a flag, send Coach Fact Context traffic, migrate users, expand the allowlist, or change legacy Coach behavior.

## Remaining risks

- Current dark-default behavior is safe but may hide integration gaps until a future activation task exercises the dormant route.
- Consent migration drift could make the current durable-consent design nonfunctional in a target environment.
- Without a deadline, provider hangs can degrade availability in a future activation.
- Without an explicit replay policy, audit and egress semantics remain ambiguous.
- Current default-off longitudinal Intelligence features remain unvalidated as user-visible product value and must not be enabled by this review.

PHASE 2B VERDICT: REMEDIATION REQUIRED