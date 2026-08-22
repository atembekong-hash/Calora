# Final Phase 2B Activation-Readiness Review

**Review date:** 2026-08-22  
**Scope:** Independent adversarial readiness review of dormant Coach Fact Context.  
**Activation authority:** None. This review did not enable any client flag, server gate, cohort, or user traffic.

## 1. Authoritative state and flow

The local review head was `956a56b`; `origin/main` was `71d1d65` at evidence collection. The completed second-remediation commit is present in the local history. The local branch being ahead of the fetched remote is recorded as repository state only and is not activation evidence.

The actual live flow is:

1. `artifacts/calora/app/coach.tsx` creates the standard Coach context and calls `useCoachSendAdapter`.
2. `useCoachSendAdapter.ts` calls `CoachFactActivationCoordinator.select`.
3. A denied selection calls the existing legacy `respondCoach` route exactly once; a Fact Context selection calls only the dark route and does not fall back to legacy after Fact Context egress.
4. The dark server route authenticates, checks server consent and rollout eligibility, validates a minimized request, screens risk, calls the provider with a 12-second deadline, validates output, then rechecks gate/cohort/consent before returning.
5. Client settlement is guarded by a lifecycle epoch.

## 2. Current dark-state verification

| Control | Evidence | Result |
|---|---|---|
| Client gate | `artifacts/calora/lib/intelligence/featureFlags.ts` declares `intelligence.coach.fact_context: false` | OFF |
| Server gate | `COACH_FACT_CONTEXT_ENABLED` must be exactly `"true"` in `coachFactContext.ts` | OFF by default |
| Cohort | `coach-fact-rollout.ts` has `COHORT_ENABLED = false` and an empty set | DENY ALL |
| Eligible accounts | Empty cohort plus disabled gate | None |
| Fact allowlist | Server allowlist remains the four daily nutrition keys | Unchanged |
| Legacy Coach | Denied selection calls legacy exactly once | Available |
| Longitudinal flags | Existing flags remain false | OFF |

No observed route allows client self-enrollment or bypasses server bearer authentication, current server consent, and rollout eligibility.

## 3. Database authority and durable consent

Canonical consent ownership is managed PostgreSQL through `lib/db/src/schema/index.ts` and `lib/db/drizzle.config.ts` using `DATABASE_URL`. The Supabase migration is intentionally inert; it contains no active DDL. Runtime consent read/accept/revoke code resolves the verified external identity to `calora_users` and uses the managed database only.

Direct development-database inspection confirmed:

- primary key: `(user_id, purpose)`;
- FK: `user_id → calora_users(id) ON DELETE CASCADE`;
- state check: only `consented_current` or `revoked`;
- metadata-only columns (no facts, prompts, messages, or nutrition content).

The real-database consent integration suite passed, including no/revoked/current consent, idempotent accept/revoke, stale-version behavior, account isolation, cascade deletion, recreated identity, and invalid-state rejection.

**Blocker:** schema propagation is `drizzle-kit push` from `scripts/post-merge.sh`, not an immutable migration history with a production application record. The development target is proven; the production target and its deployment history are not. This is an activation blocker.

## 4. Contract, provider egress, and privacy

The route rejects unknown top-level/context/fact/message object keys, pins calculation version, uses a frozen allowlist, requires deterministic statements/values, rejects legacy context fields, and validates model observations against approved facts. It sends a neutralized response and never returns model prose/actions/metadata.

Provider-bound data remains minimized relative to legacy Coach, but the request includes the supplied conversation messages. HTTP logging records method/path/request ID and redacts authorization/cookies; no reviewed route logs Fact Context values, messages, prompts, or consent content.

**Blockers:**

1. Strict-key enforcement is not recursive inside `fact.values`; generated Zod objects can strip nested unknown properties rather than strictly reject them.
2. There is no narrower aggregate request/message size limit for this endpoint beyond global body parsing and per-message schema limits.
3. The provider message history is not independently bounded/minimized beyond the current client turn-window behavior.

## 5. Time, replay, and failure containment

Server checks require an exact 60-second `expiresAt - generatedAt` window, expiry strictly after generation, a maximum +10-second future skew, and server-observed expiry. It has a 12-second abortable provider deadline and fails closed for missing auth, consent lookup failure, absent/revoked consent, denied cohort, invalid payload, rate limit, and invalid claims. It does not retry a Fact Context send through broad legacy context.

Timestamp tests pass for expired, malformed, future, skew boundary, and non-exact interval cases.

**Blocker:** no user-scoped nonce consumption or request-idempotency ledger exists. A valid context may be replayed before expiry and concurrent duplicates may both reach the provider. The documented policy permits duplicates today, but this final readiness mission requires adversarial replay proof; absent a consciously accepted product policy and abuse/cost bound, this remains an activation blocker.

## 6. Exactly-one architecture and lifecycle attack

The adapter tests demonstrate one selected path, no Fact Context-to-legacy fallback, A→B account switch suppression, sign-out, hydration reset, clear-data, revoke, deletion, client rollback, and stale-response non-display. Server settlement rechecks gate/cohort/consent after provider completion, protecting in-flight server rollback.

**Blockers:**

1. The live screen currently passes `facts: []` to the adapter. Therefore the current UI cannot produce an eligible minimized Fact Context from actual daily facts, even if a future rollout turns gates on.
2. `createCoachSendAdapter` registers a lifecycle epoch in a module-global set but discards the unregister callback. Repeated Coach unmount/remount cycles retain stale epochs.
3. The review could not prove every sign-out, account deletion, and client consent-revoke path invokes the same concrete epoch before response settlement. Render-time synchronization is helpful but is weaker than explicit lifecycle ownership.

These findings prevent a safe activation rehearsal.

## 7. Rollout control and rollback rehearsal

Default deny is real: an empty hard-coded cohort and `COHORT_ENABLED = false` deny every account. Client input cannot alter membership. The server gate is an environment check and a post-provider completion recheck blocks return after gate-off, cohort removal, or revoke.

**Blocker:** the named cohort and its enablement are compile-time constants. The code claims they can be removed/disabled without a deploy, but changing them actually requires source change, build, and deployment. There is no server-owned operational cohort source, audit trail, expiry, or no-deploy cohort kill switch. A controlled isolated activation/rollback rehearsal could not be performed without changing code, so it was not attempted.

## 8. Regression and operational evidence

Passed in this review:

- `pnpm --filter @workspace/api-server typecheck`
- `pnpm --filter @workspace/calora typecheck`
- `pnpm --filter @workspace/api-server test`
- `pnpm --filter @workspace/calora test`
- direct development PostgreSQL constraint and FK inspection

Expected simulated failure warnings occurred in existing test cases; no suite failure occurred.

Not proven:

- production managed-PostgreSQL migration/deployment application;
- real controlled cohort activation and rollback;
- physical Android/iOS behavior;
- accessibility (large text, TalkBack, VoiceOver);
- offline, force-close, background/foreground, or real-device performance;
- production logging/observability behavior.

## 9. Required remediation before reconsidering activation

1. Establish a single immutable managed-PostgreSQL migration/deployment record and independently verify the production schema.
2. Add a server-owned, auditable, short-lived cohort mechanism with immediate operational global/cohort rollback that does not require a source deployment.
3. Feed the live Coach adapter verified daily Intelligence facts and prove no broad context crosses into the Fact Context branch.
4. Replace global epoch leakage with mounted lifecycle ownership and explicit invalidation from sign-out, clear-data, deletion, consent revoke, client rollback, and unmount paths.
5. Enforce recursive strict request rejection, a narrow aggregate payload/message budget, and a documented/retested replay/idempotency policy.
6. Complete isolated activation/rollback, direct API abuse, and physical-device/accessibility validation only after the preceding controls exist.

FINAL ACTIVATION-READINESS VERDICT: BLOCKED — DO NOT ACTIVATE COACH FACT CONTEXT