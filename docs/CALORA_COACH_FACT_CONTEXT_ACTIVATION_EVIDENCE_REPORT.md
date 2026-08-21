# Calora Coach Fact Context — Activation Evidence Report

**Review date:** 2026-08-21  
**Scope:** Validation and evidence review only.  
**Activation status:** **Not authorized. No gates, cohorts, routing, or legacy
Coach behavior were changed.**

## Executive verdict

The durable consent and default-deny rollout foundation is implemented and
operating in its intended dark state. The system is **not ready for an
activation decision that would expose any real user to Coach Fact Context**.

It is ready only for a separate, tightly bounded authorization discussion on
how to collect the remaining real-device, governance, and controlled
observation evidence.

## Verified dark-state controls

| Control | Verified state |
| --- | --- |
| Client Fact Context flag | Off: `intelligence.coach.fact_context = false` |
| Server endpoint gate | Off by default; enabled only by exact `COACH_FACT_CONTEXT_ENABLED=true` |
| Server rollout cohort | Deny all accounts |
| Legacy fallback | Disabled; always false |
| Consent authority | Server-authoritative, account-scoped, purpose/version-scoped |
| Local consent cache | Status-only; cannot authorize construction, egress, or retries |
| Legacy Coach | Unchanged and live through `/v1/coach/respond` |
| Mixed request architectures | Rejected; Fact Context cannot accept legacy `context` beside `factContext` |

The consent ledger stores only user linkage, consent purpose/version/state, and
decision timestamps. It does not store Foundation facts, Fact Context,
prompts, Coach messages, raw request bodies, or model responses.

## Fresh validation results

### Automated validation

- API contract regeneration and library typecheck: passed.
- API test suite: **23 files / 241 tests passed**.
- Calora test suite: **55 files / 940 tests passed**.
- API coverage includes dark endpoint gating, server consent enforcement,
  default-deny rollout, disabled fallback, fail-closed consent lookup,
  account isolation, and consent deletion cascade.
- Calora coverage includes local cache isolation and lifecycle invalidation.

### Running-service validation

- A direct `POST /v1/coach/fact-context/respond` probe against the running API
  returned **404**, confirming the endpoint gate blocks request handling before
  Fact Context processing or provider egress.
- Browser validation of `/coach` without authentication confirmed the legacy
  Coach card remains visible.
- The dormant Fact Context controls were absent:
  - `Use summarized daily logging with Coach?`
  - `Allow summarized Fact Context`
  - `Turn off summarized sharing`
- The browser reported no errors. Existing Expo/web warnings were
  non-blocking and unrelated to Fact Context.

## Validation issue observed and resolved

Contract regeneration briefly caused Metro to resolve the generated API-client
directory while it was being cleaned and recreated. The generated files were
present and correct; restarting the Expo development workflow cleared the
transient resolution state. A post-restart Coach preview rendered normally.

This did not change application source, gates, rollout policy, or data flow.

## Evidence required before any activation decision

The following are mandatory before an authorization could consider activating a
named internal or user-facing cohort.

### 1. Real-device lifecycle validation

Validate on supported iOS and Android devices:

- sign-in and sign-out;
- account switching and cross-account isolation;
- consent accept, revoke, and stale document-version behavior;
- restrictive offline behavior;
- local data clear and account deletion;
- request cancellation and late-response discard.

### 2. Consent UX and governance approvals

- Product, privacy/security, and engineering approval of the exact disclosure.
- Accessibility review, including revoke behavior.
- Localization review.
- No unresolved high-severity privacy, safety, or account-isolation issue.

### 3. Activation-control and rollback evidence

- A separately approved, server-side named cohort policy.
- Independent review of client, server, and cohort gate ownership/configuration.
- Gate-mismatch validation.
- Rollback rehearsal proving cohort denial and endpoint shutdown prevent new
  Fact Context processing without automatic broad legacy fallback.

### 4. Controlled observation thresholds

Before a broader rollout stage:

- 100% of Fact Context requests must have server-confirmed current consent.
- Zero cache-only authorizations.
- Zero accepted late responses in scripted lifecycle tests.
- A product-approved p95 response-time budget across a defined observation
  window.
- Predeclared usefulness and safety-feedback thresholds.
- Evidence that the summary transition is understood and historical Coach
  content is not interpreted as current evidence.

## Legacy Coach boundary

The legacy Coach path must remain in place. Its generic consent, broad legacy
context, conversation history, navigation, and `/v1/coach/respond` endpoint
were not changed in this review.

No automatic fallback from Fact Context to broad legacy sharing is permitted.
Legacy retirement requires its own later evidence set and separate product,
privacy/security, and engineering approval.

## Authorization boundary

This report records evidence only. It does **not** authorize:

- enabling `intelligence.coach.fact_context`;
- enabling `COACH_FACT_CONTEXT_ENABLED`;
- activating a cohort;
- routing any account to Fact Context;
- changing production routing;
- altering or retiring legacy Coach;
- adding an automatic legacy fallback.

Any activation requires explicit user authorization after the evidence above is
collected and reviewed.