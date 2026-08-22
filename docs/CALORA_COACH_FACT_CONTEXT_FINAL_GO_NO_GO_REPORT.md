# Calora Coach Fact Context — Final GO/NO-GO Report

**Report date:** 2026-08-22  
**Decision scope:** Independent evidence reconciliation for a future controlled
activation proposal.  
**Activation authority:** None. This report does not enable any client gate,
server gate, cohort, real account, or production traffic.

## 1. Executive verdict

The repository and development evidence show that the Phase 2B code and
development-only control remediation is complete, and that Coach Fact Context
is currently dark and deny-by-default. However, production schema application,
target-environment operational verification, supported-device lifecycle
validation, and the required governance approval have not been independently
proven. Those gaps prevent a controlled activation proposal.

## 2. Exact repository and database state

The authoritative implementation uses a committed forward-only Drizzle
migration and migration journal for managed PostgreSQL. It provides canonical
consent, rollout configuration, reviewed/expiring cohort membership, and
metadata-only replay storage. The prior Supabase consent migration is inert and
does not compete for Calora domain authority.

Development inspection confirmed the consent composite primary key, cascade
foreign key to the Calora account record, and two-state check constraint.
Development rehearsal evidence also records that temporary synthetic rollout
and nonce records were removed. This report does **not** treat development
inspection as proof that the production target has applied the migration.

## 3. Dark-state proof

| Control | Required state | Recorded result |
|---|---|---|
| Client Fact Context gate | Off | Off |
| Server environment gate | Unset or not exactly `true` | Off by default |
| Global operational config | Absent or false | No enabled value |
| Operational cohort | Empty / deny all | No active member |
| Real eligible accounts | Zero | Zero |
| Fact allowlist | Frozen | Unchanged |
| Longitudinal Intelligence flags | Off | Off |
| Legacy Coach | Available | Retained |

The operational controls are server-owned. There is no client API for cohort
or global-switch mutation, and database errors deny access.

## 4. Authorization attack results

Automated route and integration coverage verifies fail-closed handling for
missing or invalid authentication, no/revoked/stale consent, consent belonging
to another account, local-only consent, server-gate denial, absent/expired or
unreviewed cohort membership, and direct endpoint attempts. A client-supplied
eligibility signal cannot authorize server egress.

The server requires all of the following before egress: authenticated identity,
current account-scoped consent, explicit server environment gate, enabled
database configuration, reviewed unexpired membership, valid minimized request,
and risk-screen approval. It rechecks authorization after provider settlement.

## 5. Real Coach-path proof

The reviewed path is:

1. Coach UI derives the standard legacy context and the live daily Intelligence
   fact input.
2. The send adapter asks the activation coordinator to select one architecture.
3. A denied selection uses Legacy Coach once; an authorized Fact Context
   selection uses only the dark endpoint.
4. The endpoint authenticates, authorizes, validates and risk-screens the
   minimized request, invokes the provider behind a deadline, validates output,
   then rechecks authorization before settlement.
5. A lifecycle epoch prevents stale client settlement after account, consent,
   hydration, rollback, clear-data, deletion, or unmount transitions.

The Fact Context branch receives approved daily calorie/protein inputs; broad
Coach context remains exclusively in the Legacy branch.

## 6. Allowlist and provider-egress proof

Only the approved daily calorie/protein status facts are fed to the dark
coordinator. The route uses a frozen allowlist, pins deterministic statements
and values, rejects legacy context fields and mixed payloads, and validates any
factual model observation against supported values. Request validation rejects
unknown nested fields, non-primitive values, and prohibited structures before
provider egress.

The replay ledger stores only identity, nonce, and timing metadata. It must not
store fact values, diary data, conversation content, prompts, or responses.

## 7. Exactly-one-architecture proof

Coordinator and adapter coverage verifies one selected route per send:
**LEGACY**, **FACT_CONTEXT**, or a safe no-send result. A Fact Context send does
not automatically retry through Legacy Coach if it fails, preventing broad
legacy context from following sanitized egress. Mixed legacy and Fact Context
payloads are rejected.

## 8. Payload-budget results

The endpoint enforces request-body, individual-string, aggregate-message,
turn-count, and nesting-depth budgets. Tests cover normal-sized requests,
maximum/boundary inputs, over-limit body and strings, excess turns, aggregate
message overages, deep objects, unknown nested keys, and non-primitive values.
Oversized or malformed input is rejected before provider egress.

## 9. Replay and concurrency results

An atomic per-account `(external_user_id, request_nonce)` claim rejects exact
replay and concurrent duplicate nonce use before a second provider call.
Independent-account nonce use does not collide. Database failure during claim
denies the request. Provider timeout or failure does not reopen the nonce for
another egress attempt; cleanup removes only synthetic rehearsal records under
the controlled procedure.

## 10. TTL results

The context lifetime is exactly 60 seconds. The server requires valid ordering,
server-observed non-expiry, and only a bounded future clock skew. Tests cover
expired, malformed, inverted, non-exact interval, and future-skew timestamps.

## 11. Account and lifecycle results

Lifecycle tests cover account switching in both directions, sign-out, hydration
reset, local-data clear, deletion path, consent revoke, client rollback,
unmount/remount, pending response settlement, and stale-response suppression.
Mounted adapters unregister their lifecycle epochs on teardown. Server-side
post-provider authorization rechecks protect an in-flight global kill, cohort
removal, or consent revocation.

No evidence supports rendering an Account A response under Account B.

## 12. Rollout-control results

Rollout is database-backed and default-deny: a true global configuration,
reviewed membership in the named cohort, and an unexpired membership are all
required. A configuration row can be removed or set false, and a membership can
be removed, without a source deployment. No client enrollment path exists.
Database lookup failures deny access.

## 13. Synthetic rehearsal results

The recorded rehearsal used a development-only synthetic identifier, a
short-lived reviewed membership, and a temporary true global configuration.
Direct operational queries confirmed both controls. The temporary membership,
global configuration, and replay record were then removed. The final recorded
state was zero enabled global switches and zero active cohort members.

No customer identity, customer Fact Context, conversation, or provider request
was used. This report does not claim a fresh production or real-device
rehearsal.

## 14. Deployment and rollback findings

The deployment runbook specifies database-first migration application, target
schema verification, API compatibility before client rollout, and final
dark-state confirmation. It prescribes a forward migration for failures and
never editing an applied migration. Immediate rollback is available through the
global configuration, individual membership removal, consent revocation, and
the server environment gate; a selected Fact Context request must not fall back
to Legacy Coach.

No identified deployment ordering authorizes Fact Context while all dark-state
controls remain off. Production application of that procedure remains
unproven.

## 15. Privacy findings

Reviewed operational records are structural only. The endpoint and replay
mechanism are designed not to log or persist Fact Context values, Foundation
facts, nutrition details, messages, prompts, or model output. Authorization and
request abuse failures are fail-closed. Production observability behavior has
not been independently sampled.

## 16. Complete regression results

Recorded development validation:

- `pnpm --filter @workspace/db run migrate` — passed
- `pnpm run typecheck:libs` — passed
- `pnpm --filter @workspace/api-server run typecheck` — passed
- `pnpm --filter @workspace/calora run typecheck` — passed
- `pnpm --filter @workspace/api-server test` — 24 files, 300 tests passed
- `pnpm --filter @workspace/calora test` — 60 files, 1005 tests passed
- managed PostgreSQL consent constraint/FK inspection — passed

Focused coverage includes consent, rollout, endpoint abuse, recursive schema
validation, budgets, replay, provider deadline, lifecycle settlement,
unmount cleanup, and real mobile-calorie/protein payload compatibility with
the API validator.

## 17. Second-pass findings

The prior independent readiness review found several activation blockers. The
later remediation evidence addresses immutable migration authority,
server-owned controls, live minimized fact wiring, lifecycle cleanup,
recursive validation/budgets, replay prevention, and synthetic rehearsal. The
remaining gaps below are evidence and approval gaps, not a basis to enable the
feature now.

## 18. Defects by severity

- **Critical:** None established by the available development evidence.
- **High:** Production migration application and production operational
  dark-state verification are not independently established.
- **Medium:** Supported iOS/Android lifecycle and accessibility validation is
  deferred.
- **Low:** Production observability/log sampling for the dormant route is not
  independently established.

## 19. Accepted residual risks

No residual risk is accepted for real-user activation in this report. The
feature remains dark, so the listed evidence gaps do not expose user Fact
Context today.

## 20. Deferred validation

Before any future controlled activation proposal: verify the target production
migration history and schema; independently inspect target global/cohort state;
perform approved supported-device lifecycle and accessibility checks; complete
privacy, product, security, and engineering approval of the disclosure and
rollback criteria; and conduct a separately authorized non-production synthetic
end-to-end rehearsal using the current deployed artifacts.

## 21. Final gate and cohort state

- Client Fact Context gate: **OFF**
- Server environment gate: **OFF/default deny**
- Global operational configuration: **OFF/absent**
- Cohort membership: **empty / deny all**
- Real eligible accounts: **0**
- Fact allowlist: **unchanged**
- Longitudinal Intelligence: **OFF**
- Legacy Coach: **available**

## Minimum remediation before reconsideration

1. Independently prove production migration application and target operational
   deny-all state using the published deployment procedure.
2. Complete the deferred supported-device/accessibility and governance checks.
3. Obtain explicit authorization for a new non-production synthetic rehearsal;
   restore every control to the dark state afterward.

FINAL DECISION: NO-GO — REMEDIATION REQUIRED