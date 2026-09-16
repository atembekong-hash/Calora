# Calora Intelligence Phase 2B — Post-Remediation Activation-Readiness Re-review

## Scope and non-activation boundary

This is an independent review of the repository after the Phase 2B remediation work. It does not rely on the prior report as proof. No feature flag, environment gate, cohort, allowlist, Coach route, or legacy Coach behavior was changed during this review.

The current safe operational state remains:

- client `intelligence.coach.fact_context`: off;
- server `COACH_FACT_CONTEXT_ENABLED`: off by default;
- server rollout: deny-all;
- Fact Context allowlist: unchanged;
- legacy Coach: unchanged.

## Independent result

Some server boundary controls are fail-closed and well-covered, but controlled activation is **not** ready. The remediation introduced a deployability mismatch and did not connect the dormant coordinator to the real Coach architecture boundary. A server-time validity gap also makes the stated 60-second replay boundary unenforceable against a future-dated client payload.

## Requirement-by-requirement verification

| # | Requirement | Re-review finding |
| --- | --- | --- |
| 1 | Deployable durable consent migration and schema | **Not resolved.** `supabase/migrations/20260821143000_create_coach_fact_context_consents.sql` creates a foreign key to `public.calora_users`, while the current Supabase security report records no Calora domain tables in Supabase. The canonical Drizzle schema places `calora_users` and the consent table in managed PostgreSQL. The migration therefore is not a proven deployable migration for the actual domain-data target. |
| 2 | Server-authoritative consent behavior | **Verified in code.** The dark endpoint verifies bearer identity and resolves current consent server-side. Consent lookup errors deny egress. The client cache is not consulted by the endpoint. |
| 3 | Account deletion cascade and recreated-account isolation | **Partially verified, but deployment proof is blocked by item 1.** The Drizzle declaration uses `ON DELETE CASCADE`; the integration test exercises direct owner-row deletion and recreated-account `not_consented` behavior. This cannot establish production durability while the DDL is not deployed through the managed PostgreSQL schema path. The full external-Auth deletion saga remains deferred. |
| 4 | Single `CoachFactActivationCoordinator` ownership | **Not resolved.** The class is a dormant helper and has no production consumer. The live Coach screen still owns the send decision directly through `useRespondCoach`. |
| 5 | Server-confirmed consent requirement | **Verified inside the dormant coordinator and server endpoint.** The coordinator fetches current consent for a Fact Context selection; the server independently rechecks it. The live Coach path never reaches this architecture today. |
| 6 | Prohibition of cache-only authorization | **Verified.** The coordinator has no AsyncStorage consent-cache read path, and the server performs its own consent lookup. |
| 7 | Exactly-one-architecture selection | **Verified only in isolated helper code; not in the live flow.** The coordinator returns either `legacy` or `fact_context`, and the dark request helper accepts no legacy context. However, `app/coach.tsx` bypasses it and always sends legacy context. |
| 8 | Account/hydration/request lifecycle binding | **Not resolved for production.** The helper carries account ID, hydration generation, nonce, and expiry, but live Coach does not supply a real hydration generation or own the coordinator. The response check is passed immutable request values and global invalidation is lifecycle-effect based, so an in-flight transition needs a synchronous live epoch fence before it can be trusted for activation. |
| 9 | Nonce and TTL behavior | **Partially verified, with a blocker.** The nonce is echoed and checked, and client context expiry is checked. The server accepts a client-generated `generatedAt` with no future-time/skew check; a future-dated payload can pair with a 60-second interval and remain unexpired far beyond the intended window. The no-persistent-nonce replay policy remains acceptable only once server-observed freshness is enforced. |
| 10 | Provider timeout/abort behavior | **Verified.** The dark completion wrapper uses a 12-second abort deadline, and focused tests cover timeout/abort and rejected-provider unavailable responses. |
| 11 | Late-response rejection | **Partially verified.** A deadline race prevents late provider completion from changing the server’s unavailable path. Client lifecycle rejection exists in isolation, but no live Coach binding or rollback-in-flight proof exists; a server gate change also is not rechecked after provider completion. |
| 12 | Strict Fact Context allowlist | **Verified.** The endpoint validates strict request shape, eligible deterministic facts, controlled calculation version, and exact observation fact keys. No allowlist change was made. |
| 13 | Raw/legacy payload rejection | **Verified at the dark endpoint.** Strict request validation rejects a body that is not the Fact Context shape. The live route remains legacy by design while disabled. |
| 14 | Risk pre-egress suppression | **Verified.** User/assistant message content is screened before the provider request; a risk match returns a deterministic safe response without provider egress. |
| 15 | Deterministic claim validation | **Verified.** Provider JSON is schema-checked and each user-specific observation must exactly match a current allowed fact statement with supported keys, availability, and time window. |
| 16 | Privacy-safe logging | **Verified in the reviewed dark route.** It does not log Fact Context, prompts, messages, or provider output on the normal/exception paths. The consent ledger stores metadata only. This does not substitute for target-environment operational log retention review. |
| 17 | Client/server/cohort default-deny behavior | **Verified for the present dark state.** Client flag defaults off; server gate requires explicit `"true"`; rollout returns a hard-coded deny-all decision; endpoint requires all three independent controls plus consent. Gate-disagreement behavior has not been integration-tested under an approved gate change. |
| 18 | Rollback architecture | **Not ready for controlled activation.** The hard-off server gate and deny-all cohort are immediate fail-closed controls, but there is no named bounded cohort source, reversible cohort configuration, rollback rehearsal, or live pending-request cancellation proof. |

## New weaknesses introduced or exposed by this re-review

### 1. Consent deployment target is inconsistent with Calora’s data architecture

The repository’s Supabase security report explicitly says that the configured Supabase project has no Calora domain schema and identifies the `calora_*` schema as intended managed-PostgreSQL/Drizzle data. The new Supabase migration nevertheless requires `public.calora_users`. A schema declaration and a database-conditional test do not create durable deployment evidence for the database that actually owns domain data.

**Impact:** activation could be configured with an absent or undeployable authoritative consent ledger.

### 2. Future timestamps defeat the intended bounded context lifetime

The route verifies `expiresAt - generatedAt <= 60 seconds` and `expiresAt > server now`, but does not reject `generatedAt` after server now or cap permitted clock skew. A malicious or stale client can submit a future generated time and delay expiry arbitrarily.

**Impact:** the documented TTL-bounded duplicate/replay risk assumption is false until server freshness is enforced.

### 3. The coordinator is not the live Coach authority

The only live send path in `artifacts/calora/app/coach.tsx` continues to build broad legacy context and submit it to the legacy endpoint. The coordinator is only constructed in unit tests. Enabling the client flag today would reveal the consent panel but would not route through Fact Context.

**Impact:** no production proof exists for single architecture selection, direct server-consent selection, or no-legacy-fallback behavior. It also prevents meaningful account/hydration lifecycle validation.

### 4. Pending lifecycle and rollback closure remain incomplete

The request helper checks scope after a response, but it is passed the account ID and hydration generation captured at request time. The current global invalidation mechanism cannot be treated as a synchronous live identity/hydration epoch. Server gate rollback also cannot revoke a completion that has already passed the initial gate and is awaiting the provider.

**Impact:** a future activation requires live settlement-time scope validation and in-flight cancellation/rejection coverage for sign-out, account switch, clear, delete, hydration reset, consent revoke, and rollback.

## Positive boundary evidence

The following controls were independently found to be present and fail-closed:

- bearer authentication, current server consent, and deny-on-consent-lookup failure;
- deny-all server rollout and independent server feature gate;
- no client cache authorization;
- strict minimized Fact Context request validation and legacy/raw shape rejection;
- risk-pattern suppression before provider egress;
- deterministic output claim validation, response nonce echoing, and neutral replacement output;
- provider deadline abort and safe unavailable response;
- no reviewed dark-route logging of facts, prompts, messages, or provider output;
- focused API and Calora test suites pass in the current workspace.

## Validation executed for this re-review

- Fresh independent architecture reviews of server, client, and rollout boundaries.
- Direct source inspection of the migration, canonical schema, Supabase security report, dark endpoint, rollout implementation, coordinator, lifecycle helper, request client, and live Coach path.
- Fresh API-server and Calora automated test runs: both passed. The Calora suite reported 58 test files and 964 tests passing. Expected simulated failure-path warnings appeared in unrelated existing tests.

Passing tests do not erase the deployment, integration, and live-lifecycle gaps above.

## Deferred evidence — not passed

The following remain deferred and are **not** marked passed:

- real authenticated external-Auth account-deletion saga;
- target managed-PostgreSQL migration/deployment proof;
- Android and iOS device validation;
- responsive and large-text validation;
- TalkBack and VoiceOver validation;
- offline and force-close behavior;
- real-device performance validation;
- named cohort rollback rehearsal and client/server/cohort gate-disagreement testing.

## Smallest exact remediation task

**Make the dormant Fact Context path genuinely activation-ready before any flag can route traffic.**

This task must:

1. move/create the consent-ledger DDL in the actual managed PostgreSQL migration/deployment path, verify its target schema, and prove cascade plus recreated-account isolation there;
2. reject future-dated Fact Contexts using a server-observed freshness/skew rule and add adversarial future-timestamp/expiry tests;
3. make live Coach own one coordinator-backed architecture selection path, with a synchronous account/hydration epoch invalidated on sign-out, switch, clear, deletion, hydration reset, revoke, and rollback;
4. prove in-flight requests and late responses are discarded on each invalidation, and prove no legacy fallback/mixed payload occurs;
5. add a separately approved server-owned bounded cohort configuration and exercise server-gate-off plus cohort-removal rollback before any cohort is named.

No controlled activation stage is recommended until this remediation completes and is re-reviewed. Physical-device and accessibility evidence remains separate deferred debt even after this remediation.

PHASE 2B RE-REVIEW VERDICT: ADDITIONAL REMEDIATION REQUIRED