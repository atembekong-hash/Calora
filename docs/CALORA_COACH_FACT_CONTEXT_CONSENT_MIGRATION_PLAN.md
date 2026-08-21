# Calora Coach Fact Context — Durable Consent & Controlled Migration Plan

## Decision boundary and current state

This is a planning and authorization document. It does not enable
`intelligence.coach.fact_context` or `COACH_FACT_CONTEXT_ENABLED`, migrate any
traffic, modify the legacy Coach path, add consent UI, change a database, or
alter production configuration.

Today, legacy Coach uses a broad, locally persisted `CoachContext` and the
generic `coachConsentAccepted` boolean. The dark Fact Context endpoint is
separate, default-off, authenticated, TTL-bound, claim-validated, and limited
to four fresh daily nutrition/logging facts. Its current consent registry is
in-memory only. The generic consent boolean is valid only for the existing
legacy flow; it is never proof of consent for `coach_fact_context_v1`.

The permanent rule for every stage is:

> A request uses exactly one context architecture: legacy `CoachContext` or
> sanitized `CoachFactContextV1`, never both.

## 1. Consent storage recommendation

### Options evaluated

| Option | Privacy and isolation | Cross-device / deletion | Offline behavior | Rollback / complexity | Decision |
| --- | --- | --- | --- | --- | --- |
| Account-scoped local persistence only | Better than device-wide storage because current account keys are isolated, but a modified client can forge consent | Cannot reliably follow a person across devices or be centrally deleted | Can show state offline, but cannot safely authorize remote egress | Simple, but no server enforcement or auditability | Reject |
| Server-side consent record only | Server can bind status to verified authenticated identity and ensure the dark endpoint enforces it | Consistent across devices; account deletion can delete it transactionally | Cannot safely use Fact Context while offline; UI state needs a fetch | Strong authorization, moderate schema/API work | Viable |
| Hybrid: server authority plus local cache | Server remains the only authorization source; local cache contains only the last known state for clear UX | Server record is cross-device and deletable; local cache is cleared on local clear/sign-out | Cache may explain status offline but never grants egress | Moderate, explicit failure modes, strongest usable design | **Recommend** |

### Recommended model

Implement a server-authoritative consent ledger and a non-authorizing,
account-scoped local status cache.

- **Server authority:** a record keyed to the existing internal
  `calora_users.id`, with purpose `coach_fact_context_v1`, consent document
  version, state, decision timestamp, and a revocation timestamp when
  applicable. It stores no Fact Context, raw diary data, prompts, or Coach
  messages.
- **Local cache:** account-scoped only; stores the last server-confirmed state,
  document version, and refresh status for UI. It must be removed on account
  switch, sign-out, local clear, and account deletion cleanup. It is never
  sufficient to build or send Fact Context.
- **Server enforcement:** the dark endpoint independently requires
  `consented_current` for its configured document version after authenticating
  the bearer token. The client cannot self-assert consent.
- **Offline:** no Fact Context request, queue, background retry, or legacy
  downgrade. Show the existing safe unavailable/offline experience and retain
  the cached status only for explanation.

This design minimizes consent data while making revocation and cross-device
behavior enforceable. It fits Calora’s current Supabase identity plus managed
PostgreSQL/Drizzle ownership model and account deletion transaction.

## 2. Consent state machine

Purpose: `coach_fact_context_v1`. Current document version is a compile-time,
server-owned value; changing it creates a new required consent version.

| State | Meaning | May build/send Fact Context? | Entry | Exit |
| --- | --- | --- | --- | --- |
| `not_consented` | No current affirmative choice on server | No | New account, no ledger record, cleared local cache before refresh | Explicit acceptance of current version |
| `consented_current` | Server record affirms the exact current version | Yes, only with every other eligibility gate | Server accepts current disclosure | Revocation, version change, account deletion |
| `revoked` | Person withdrew this purpose | No | Explicit revoke, deletion preparation | Explicit new acceptance of current version |
| `stale_version` | Earlier version exists but does not match the active disclosure | No | Consent document version advances | Explicit acceptance of current version |

Lifecycle rules:

- The active Supabase account is the only local scope. Account A’s status is
  never displayed as or applied to account B.
- On sign-out or account switch: cancel active Fact Context requests, invalidate
  scope, clear in-memory registry/cache from the active UI, and rehydrate the
  next account before status can be used.
- On local clear: remove the local cache and abort/discard pending work. The
  server record remains because “clear device data” is not consent revocation;
  the next sign-in refetches it.
- On account deletion: revoke/delete the server consent record in the same
  deletion workflow as account-owned records, remove the local cache, cancel
  active requests, and sign out. Deletion must be idempotent and recoverable
  under the existing account-deletion fence.
- A server failure, unknown version, missing record, or stale cache resolves to
  `not_consented`/not eligible, never to consented.

## 3. Exact proposed consent disclosure

> **Use summarized daily logging with Coach?**
>
> With your permission, Calora can send a small summary of your current logged
> daily calories, protein, meal distribution, and logging completeness to the
> Coach service so it can explain the information you have logged today.
>
> This summary does not include raw food names, diary notes, photos, recipe
> text, raw timelines, account identifiers, or your full history. Messages you
> write in this Coach conversation are still sent to the Coach service.
>
> Coach is not medical care and cannot diagnose, treat, or replace a clinician.
> You can turn this sharing off at any time. Turning it off stops future
> summarized Fact Context sharing and cancels a request when possible, but it
> cannot take back a request that has already been completed remotely.
>
> **[Allow summarized Fact Context]**  **[Not now]**

This copy is proposed only. It must receive product/privacy approval,
accessibility review, and localization review before any screen is implemented.

## 4. Traffic eligibility and explicit failure behavior

A Coach request may use Fact Context only when all conditions are true:

1. The request has a verified bearer token for the currently hydrated account.
2. The active client account and hydrated local state match the captured request
   scope.
3. The server ledger reports `consented_current` for the active document
   version.
4. The client gate is on for the account’s approved rollout cohort.
5. The server gate is on for the same approved rollout cohort.
6. The sanitized adapter produces fresh, eligible, allowlisted Foundation facts.
7. The nonce, hydration generation, account scope, and 60-second context TTL
   remain valid when sending and when accepting the response.
8. No pre-egress high-risk policy trigger appears in any supplied conversation
   turn.
9. The request contains only the Fact Context contract and never legacy
   `context`.

| Failed condition | Required behavior |
| --- | --- |
| No authenticated/hydrated current account | Do not construct context; show signed-out/unavailable state. |
| No current consent, stale consent, server lookup error, or offline | Do not send Fact Context or queue it; show consent/offline state. |
| Client or server gate/cohort off | Keep the request on the rollout-selected architecture; do not silently switch architectures. |
| No fresh eligible facts, expired TTL, invalid scope, account switch, sign-out, clear, or nonce mismatch | Abort or do not send; discard any late response and show neutral unavailable/insufficient state. |
| Higher-risk trigger | Do not egress Fact Context; return the deterministic support redirect. |
| Validation, timeout, provider, or claim-validation failure | Return the safe limited/unavailable result; no automatic broad-context downgrade. |

## 5. Legacy fallback policy

**Recommendation: no automatic legacy fallback.**

Once an account has been deliberately routed to Fact Context, any Fact Context
eligibility or service failure must result in a visible safe unavailable,
consent-needed, or insufficient-information state. Automatically substituting
the broad legacy payload would expand data sharing at the moment the minimized
path fails and would make consent/rollout semantics ambiguous.

A temporary fallback may exist only as a separate, server-enforced,
cohort-limited rollback policy for an approved internal/testing stage. It must
be explicit in the UI, never be triggered by a generic transport failure, be
time-limited, be measurable without logging raw payloads, and be disabled by
default. It is not authorized in the next implementation scope.

## 6. Conversation continuity

- Existing local Coach turns remain visible; this plan does not rewrite or
  delete them.
- Historical turns are conversation text, never factual evidence. The new
  request must state that current approved facts supersede older factual claims.
- On first approved migration, show a concise one-time disclosure that Coach is
  now using a smaller current-data summary and that older messages may reflect
  earlier information. The disclosure design requires separate product approval.
- Do not persist Fact Context, source values, fact metadata, or request nonce in
  local Coach history. Store ordinary display text only under existing limits.
- On account switch, sign-out, hydration reset, or clear: clear active display
  turns for the previous account, abort the request, invalidate its lifecycle
  scope, and discard late output. Never merge histories between accounts.

## 7. Revocation lifecycle

When a person revokes `coach_fact_context_v1`:

1. Write `revoked` to the server ledger before confirming success to the UI.
2. Update/remove the local cached status only after the server result.
3. Immediately prevent new Fact Context construction and requests.
4. Abort the active request when possible; invalidate its request lifecycle so
   any late response is discarded.
5. Do not rewrite existing Coach history and do not retain a Fact Context
   snapshot for retry, diagnostics, or offline delivery.
6. On restart/offline, cached revoked status remains restrictive. If status is
   unknown, remain restrictive until a server refresh succeeds.

Revocation stops future sharing but cannot retract a completed remote request.

## 8. Account-deletion behavior

The new server consent record is account-owned data. The account-deletion route
must delete it in the same transactional deletion sequence as the corresponding
internal user record, before final Supabase Auth deletion. The client must
invalidate the lifecycle, clear its local status cache, clear in-memory consent
state, then continue the current local-data cleanup/sign-out flow.

Deletion tests must cover authenticated deletion, forged/expired-token
rejection, retry/idempotency behavior, failed downstream cleanup, and proof
that a re-created or different account cannot inherit the deleted account’s
consent.

## 9. Rollout-gate matrix and rollback

| Gate | Owner / default | Enables | Rollback |
| --- | --- | --- | --- |
| `intelligence.coach.fact_context` | Client / `false` | Candidate client routing only | Set `false`; abort/discard active Fact Context work. |
| `COACH_FACT_CONTEXT_ENABLED` | Server / absent or `false` | Dark endpoint access only | Set off; endpoint returns 404 before processing. |
| Current consent-version check | Server authority / deny | Permission for this purpose | Change active version or revoke; deny requests immediately. |
| Cohort/rollout gate | Server-derived, default deny | Named internal/beta/percentage eligibility | Reduce to zero/deny all without app update. |
| Temporary legacy fallback gate | Server-derived, default deny | Explicit internal-only fallback only | Disable first; no automatic fallback. |

The client gate is not a privacy control. The server must enforce consent,
cohort, and no-coexistence policy using the verified account. Gate configuration
must be versioned, reviewed, and tested for disagreement: a client-on/server-off
or client-off/server-on combination must fail closed.

## 10. Controlled rollout cohorts and evidence gates

No cohort is activated by this plan.

| Stage | Audience | Required evidence before advancing |
| --- | --- | --- |
| 0. Dark | Nobody | Both gates off; contract/claim/risk tests remain green. |
| 1. Development | Local development fixtures only | Consent state-machine, server enforcement, no-coexistence, lifecycle, and failure tests pass. |
| 2. Internal testers | Named Calora internal accounts with current consent | Real-device sign-in/out/switch/revoke/delete tests; privacy review sign-off; no unresolved high-severity issue. |
| 3. Opt-in beta | Explicitly consented invited users | Stable consent completion/revocation, safe failures, latency/usefulness baseline, support review, rollback rehearsal. |
| 4. Small percentage | Server-selected consenting cohort | Predefined error/latency/safety thresholds met for a full observation window; no raw-payload logging. |
| 5. Expanded percentage | Additional consenting cohorts | Repeated thresholds, cohort fairness/accessibility review, and demonstrated rollback. |
| 6. Full eligible migration | All eligible accounts only | Legacy retirement criteria below are met and separately approved. |

Each advancement requires recorded approval by product, privacy/security, and
engineering owners. A safety/privacy regression returns the cohort to Stage 0
or the prior safe stage; it never turns on legacy fallback automatically.

## 11. Quality and safety acceptance criteria

Before Stage 2, automated tests must prove:

- Unsupported numeric, status, timeframe, qualitative, and metadata claims are
  rejected or replaced by a safe result; no partial model output passes through.
- Hallucination containment accepts only exact server-reconstructed current
  fact statements.
- Stale/low-confidence/unknown-provenance facts, expired TTLs, and invalid
  lifecycle scopes never egress.
- The server rejects Fact Context without current consent even when a modified
  client claims consent.
- Account A cannot use, display, or complete a request scoped to account B;
  sign-out, switch, hydration reset, clear, and deletion abort/discard work.
- Every supplied conversation turn, regardless of client-declared role, is
  screened before Fact Context egress for high-risk policy triggers.
- Provider timeout/5xx/invalid output returns the deterministic safe result
  without queues, automatic retries after scope change, or legacy downgrade.
- A request never contains both `context` and `factContext`; strict unknown-key
  and free-text rejection remain covered.

Before Stage 3, measure and approve:

- Consent correctness: 100% of Fact Context requests have server-confirmed
  current consent; 0 requests use only cached/local consent.
- Account/lifecycle safety: 0 accepted late responses in scripted switch,
  sign-out, clear, and revoke tests.
- Latency: establish a baseline and require the p95 end-to-end response time to
  stay within the product-approved Coach budget for a full beta observation
  window.
- Usefulness: opted-in tester feedback meets a predeclared product threshold
  without users reporting unexpected facts, broad-data disclosure, or unsafe
  guidance.
- Continuity: testers understand the new-summary notice and old history does
  not appear as current evidence.

## 12. Legacy retirement criteria

Do not remove broad legacy `CoachContext` until all are true:

1. Fact Context supports every Coach capability intentionally retained for
   eligible users; any missing capability has an approved separate minimized
   contract or an explicit product retirement decision.
2. Durable consent UX, version upgrade, revocation, offline restrictive state,
   and deletion are stable across supported devices.
3. Server-authoritative consent, cohorting, no-coexistence, and rollback have
   passed production-like and real-device tests.
4. The rollout completes its agreed observation windows with no unresolved
   safety, privacy, cross-account, stale-history, or unsupported-claim issue.
5. Legacy fallback is disabled and its removal is rehearsed.
6. Product, privacy/security, and engineering separately approve retirement.

## 13. Production migration risks and mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Privacy regression or accidental broad-data egress | Critical | Server-enforced single-architecture routing, strict schemas, no automatic fallback, raw-payload-free logs, security review. |
| Consent misapplied across account/device/version | Critical | Server authority keyed to verified internal user, explicit version, deny-on-unknown, account-switch and deletion tests. |
| Accidental legacy fallback | High | Default-deny fallback gate, no transport-triggered fallback, dedicated rollback approval and test. |
| Flag/configuration drift | High | Independent safe-default client/server/cohort gates, tested mismatch cases, owned configuration review. |
| High-risk request reaches model with facts | High | Scan every conversation turn before egress; deterministic support redirect and adversarial tests. |
| Stale or cross-account history/response | High | Hydration/account/nonce/TTL lifecycle binding, abort/discard rules, history-not-evidence policy. |
| Reduced Coach richness or missing legacy capability | High | Capability inventory, opt-in cohorts, visible transition notice, do not expand facts without a new authorization. |
| Consent drop-off or user confusion | Medium | Specific concise disclosure, “Not now” path, analytics limited to consent outcomes, accessibility/localization review. |
| Model response behavior changes | Medium | Exact factual claim validation, neutral server-generated metadata, tester usefulness review, immediate cohort rollback. |
| Latency/provider failure | Medium | Tight deadline, no queued Fact Context, safe unavailable response, p95 evidence gate. |
| Rollback itself re-expands sharing | Medium | Rollback only changes cohort routing; never silently sends legacy data for an opted-in Fact Context request. |

## 14. Rollback model

Rollback is a data-minimizing stop, not an architecture blend:

1. Set the server cohort gate to deny new Fact Context requests.
2. Set the server endpoint gate off if immediate containment is necessary.
3. Set the client gate off in the next safe configuration release.
4. Abort/invalidate active Fact Context lifecycle scopes and discard late
   responses.
5. Preserve consent records and ordinary conversation history; do not delete
   user decisions or rewrite history.
6. Investigate using only minimized operational outcomes, never stored raw Fact
   Context or prompt text.

Accounts previously in a Fact Context cohort see a safe unavailable/transition
state until a separately approved routing policy is active. They are not
silently routed to broad legacy sharing.

## 15. Final authorization recommendation

**AUTHORIZE IMPLEMENTATION OF DURABLE CONSENT + ROLLOUT CONTROLS**

This authorizes only the bounded implementation below. It does **not** authorize
activation of any cohort, either Fact Context gate, production traffic
migration, legacy removal, broad-context fallback, or expanded Fact Context
categories. Any activation requires a later review against the evidence gates.

## 16. Exact next implementation scope

The next implementation task may:

1. Add the server-authoritative, versioned, purpose-scoped consent record,
   authenticated read/accept/revoke operations, deletion integration, and
   server-side enforcement on the dark endpoint.
2. Add an account-scoped, non-authorizing local consent-status cache and
   lifecycle invalidation for sign-out, account switch, clear, revocation, and
   deletion.
3. Add the approved consent UI and accessible revoke control behind the still-off
   client gate; do not alter the existing generic legacy Coach consent.
4. Add server-derived default-deny cohort and fallback configuration structures,
   with no enabled cohort and no legacy fallback behavior.
5. Add automated, integration, and real-device test plans for consent version,
   cross-device status, denial, no-coexistence, revocation, account lifecycle,
   deletion, gate mismatch, rollback, and safe failures.
6. Update the dark-path contract/reporting documentation without logging Fact
   Context, raw facts, prompts, or conversation content.

It may not enable any gate, route a real account to Fact Context, send legacy
and Fact Context together, change legacy Coach consent/behavior, store
Foundation facts server-side, or remove the legacy pathway. Stop after
implementation and evidence review; activation remains a separate authorization.