# Calora Intelligence Phase 1.8A — Infrastructure and Restricted Phase 2A Feasibility

**Scope:** non-destructive investigation only.  
**Database mutations:** none.  
**Feature changes:** none.

## 1. Executive verdict

This phase reaches two independent conclusions:

1. **Database infrastructure verdict: C — CURRENT PLATFORM CANNOT RELIABLY SUPPORT TARGET ARCHITECTURE.** The currently proven project lifecycle cannot demonstrate a durable non-superuser runtime credential, custom role/grant/RLS deployment path, managed publish persistence, upstream-pooling behavior, or tested rollback.
2. **Restricted Phase 2A verdict: APPROVE WITH CONDITIONS.** A future implementation can calculate existing deterministic Foundation facts transiently from the active in-memory user state, with no new database storage, API route, server adapter, cache, background task, Coach context, or cross-user processing. It must first prevent account-switch/shared-device exposure and satisfy the boundary in this report.

No RLS, role, credential, feature flag, Contextual Intelligence, Coach integration, or persistent Intelligence state was enabled.

## 2. Current PostgreSQL architecture

Calora domain data is in Replit-managed PostgreSQL. Supabase supplies authentication. The database package builds one `pg.Pool` from one server-only `DATABASE_URL`.

The Phase 1.8 live inventory remains current: `postgres` is the effective runtime and session role, database/table owner, superuser, role creator, and RLS bypasser. All 19 `calora_*` tables have RLS and FORCE RLS disabled; no Calora RLS policies exist.

## 3. Managed platform capabilities investigated

| Capability | Classification | Evidence |
| --- | --- | --- |
| Managed development/production PostgreSQL | VERIFIED | Replit documentation describes separate development and production databases. |
| Typed-table deployment lifecycle | VERIFIED for development | Drizzle push runs in the managed post-merge script. |
| Custom PostgreSQL roles/functions/policies in PostgreSQL itself | SUPPORTED BY POSTGRESQL, NOT VERIFIED IN PROJECT LIFECYCLE | Current support provisioning manages extensions/functions/triggers only. |
| Custom roles, grants, RLS policy production persistence | UNKNOWN | No source-controlled publish lifecycle or production proof exists. |
| Production credential rotation | SUPPORTED BUT NOT VERIFIED FOR ROLE SEPARATION | Replit documentation describes credential rotation; no separate Calora runtime credential is configured or tested. |
| Development rollback / production point-in-time recovery | SUPPORTED PLATFORM CAPABILITY, NOT A VERIFIED RLS ROLLBACK | No tested Calora role/policy/credential recovery procedure exists. |

## 4. Runtime-role feasibility

**NOT RELIABLY FEASIBLE IN THE CURRENT CONFIGURATION.**

A secure target needs a non-owner, non-superuser, non-BYPASSRLS API role. Current application traffic instead uses `postgres`, which defeats RLS as a request-path protection. No second API role or corresponding connection configuration exists.

## 5. Credential-separation feasibility

**UNKNOWN / NOT CONFIGURED.**

The project has only `DATABASE_URL` for database access. It has no documented equivalent of separate `DATABASE_ADMIN_URL` and `DATABASE_RUNTIME_URL`, no secure role-password lifecycle, and no tested credential rotation/revocation/recovery path. Database credentials are not exposed to the mobile application.

## 6. Role persistence findings

**NOT TESTED.**

The task deliberately did not create a disposable custom role: it would be a database mutation outside the approved investigation scope and could not answer the essential question of whether it persists through the relevant production lifecycle.

No evidence shows custom roles survive publishing, credential rotation, fresh-environment recreation, or rollback. A local-only role experiment would not prove those properties.

## 7. Grant/RLS deployment feasibility

| Operation | Classification | Finding |
| --- | --- | --- |
| `CREATE ROLE` / role password management | UNKNOWN in managed production lifecycle | PostgreSQL can do this, but this project has no source-controlled propagation or credential lifecycle. |
| `GRANT` / `REVOKE` | UNKNOWN in managed production lifecycle | No checked-in role/grant provisioner exists. |
| `ENABLE ROW LEVEL SECURITY` / `CREATE POLICY` | UNKNOWN in managed production lifecycle | No policy lifecycle or published proof exists. |
| Functions/triggers | PARTIAL | A development-only source-controlled provisioner exists; production propagation is not proven. |
| Table schema | VERIFIED for managed development | Drizzle schema push is used after merge. |

No security operation above was performed in this phase.

## 8. Pooling findings

The application directly instantiates Node PostgreSQL `pg.Pool`. That confirms in-process pooled connection reuse, but managed upstream pooling mode, reconnect behavior, and production transaction-pool semantics are not exposed by the available project evidence.

The existing pool has no request-specific identity and no wrapper that scopes identity to a transaction. Global/session-level identity must not be used because pooled reuse could leak one user’s authorization context to another.

## 9. Transaction-local identity feasibility

**POSTGRESQL CAPABILITY: SUPPORTED. PROJECT ARCHITECTURE: NOT VERIFIED.**

PostgreSQL `SET LOCAL` can be transaction-bound, but Calora has no authenticated transaction wrapper, effective least-privilege role, direct RLS test target, or upstream-pooling evidence. A production wrapper must not be added until all of those conditions and rollback are proven.

## 10. Production propagation findings

**NOT VERIFIED.**

The proven project lifecycle applies Drizzle table changes and development support objects. It does not prove deterministic, versioned, auditable production application of roles, grants, RLS policies, role passwords, or runtime URL changes.

Replit documentation confirms separate production databases and credential/recovery capabilities, but it does not supply project-specific evidence that Calora’s target role/RLS architecture will survive publish unchanged.

## 11. Rollback findings

**NOT AVAILABLE / NOT VERIFIED for the target architecture.**

Platform recovery options do not replace an application-tested rollback for:

- incorrect runtime credentials;
- incomplete grants;
- an RLS policy blocking requests;
- broken transaction identity;
- a custom role disappearing after publish;
- connection failures after rotation.

Future work needs a rehearsed, data-preserving rollback that restores a prior known-good role/policy/credential configuration without declaring a permanent superuser runtime fallback secure.

## 12. Database infrastructure verdict

**C — CURRENT PLATFORM CANNOT RELIABLY SUPPORT TARGET ARCHITECTURE, based on the current evidence and project configuration.**

This is not a claim that PostgreSQL lacks roles, RLS, grants, or transaction-local settings. It means Calora cannot truthfully deploy and operate the entire architecture until role credentials, deterministic production propagation, pool semantics, and rollback are directly proven.

Retain the Phase 1.7 API authorization model. Do not enable RLS, create roles, rotate credentials, or claim database tenant isolation.

## 13. Migration alternatives if necessary

No migration is recommended or performed.

| Option | Security and operational assessment |
| --- | --- |
| Keep managed PostgreSQL with API-only authorization | Lowest immediate migration risk; preserves Drizzle and existing API predicates; does not add database tenant isolation. Appropriate while the target lifecycle remains unproven. |
| Move Calora domain data to Supabase PostgreSQL | Could colocate Auth and RLS, but is a material data/operational migration with downtime, reconciliation, RLS-policy, admin-path, backup, and rollback work. Drizzle compatibility alone is not sufficient reason to migrate. |
| Another managed PostgreSQL provider | May offer explicit role/credential/migration controls, but adds cost, operational burden, data migration, and recovery complexity. Consider only after a concrete requirements gap is confirmed. |

Any migration requires a separate approved architecture, privacy review, rehearsal, and rollback plan.

## 14. Existing Intelligence Foundation capabilities

The existing local Foundation can:

- make an isolated deep-cloned snapshot of logs, profile, weights, wellness/activity logs, planner, shopping, recipes, and a caller-supplied current energy value;
- generate deterministic daily calorie, macro, meal-distribution, logging-completeness, and weight-baseline facts;
- attach calculation version, source watermark, confidence, evidence classification, freshness, and missing-data states;
- use explicit date/timezone and a fixed generation time for repeatable results;
- measure local operation timing without persistence or network use.

It does not write a Calora database record or invoke the server fact adapter.

## 15. Phase 2A proposed architecture

The smallest permitted future architecture is:

```text
active, hydrated in-memory Calora state
  → isolated local context snapshot with explicit date/timezone
  → deterministic Foundation facts with fixed generated time
  → bounded transient contextual-insight selector
  → current in-memory screen state only
```

It must have no new table, persistent fact/profile, database write, API endpoint, network request, shared cache, background task, analytics payload containing nutrition content, Coach context, autonomous action, or cross-user computation.

## 16. Class A capabilities

**Safe only under the Phase 2A conditions below:**

- current-day calorie status and remaining amount;
- current-day macro balance from recorded logs;
- meal distribution and logging completeness;
- explicitly labeled freshness, incomplete-day, missing-target, missing-weight, missing-macro, and unknown-provenance states;
- deterministic comparisons to the current user’s existing goal/target;
- weight-baseline facts already produced by the Foundation;
- transient “no insight” output when evidence is inadequate.

Every item must use only the active user’s already authorized state and must remain deterministic.

## 17. Class B capabilities

**Require additional controls before implementation:**

| Capability | Missing control |
| --- | --- |
| Visible Phase 2A insight delivery | Account-switch/shared-device state isolation and a no-persistence/no-cache guarantee. |
| Server-side fact generation | Least-privilege database boundary or a separately approved secure server design. |
| Persistent insight history or profiles | Data minimization, retention/erasure, tenant isolation, and deletion coverage. |
| Cross-session personalization | Explicit consent, durable privacy model, retention, and account-switch safety. |
| Coach consumption of insights | Bound structured fact contract, consent, provenance, and no client-forged sensitive context. |
| Proactive/background analysis | Scheduling, authorization, cost, retention, and safety controls. |

## 18. Class C capabilities

**Not appropriate yet:**

- autonomous interventions or recommendations;
- diagnosis-like or unsupported health claims;
- opaque behavioral profiling;
- LLM output treated as nutritional or behavioral fact;
- private-data cross-user/global learning;
- persistent sensitive Intelligence records without the missing controls above;
- unrestricted Coach memory derived from Intelligence.

## 19. Persistence requirements

Restricted Phase 2A requires:

- no new database table or record;
- no persistent Intelligence facts/profile/history;
- no AsyncStorage snapshot field or local cache;
- no server adapter;
- no background worker;
- no new cross-user data processing.

Existing app state is broadly persisted to one fixed AsyncStorage key. Intelligence facts are not currently included, and future work must keep them excluded.

## 20. Privacy/security analysis

The current API boundary verifies Supabase bearer tokens, resolves the internal user server-side, and applies owner predicates on active persistence routes. A future server read must retain that exact boundary and must never accept arbitrary user ownership from request payloads.

Restricted Phase 2A should be local-only, but it has a material existing shared-device risk: Calora persists broad local state under a fixed key and the inspected sign-out behavior does not establish a verified per-account local-state namespace or wipe. A second user on the same device could therefore see previous local data; a newly calculated transient insight could reflect that data.

**Condition:** do not expose a Phase 2A insight until the active account/local-state relationship is proven safe. Never use a shared cache, retain raw evidence/log identifiers unnecessarily, or log derived nutrition content. Account deletion creates no new Intelligence data under the proposed architecture.

## 21. Coach boundary

Coach remains unchanged and disabled as an Intelligence consumer. The Foundation remains the factual layer. Future Coach work must consume only bounded, structured, provenance-aware facts through a separately approved contract; it must never manufacture or become the source of truth.

## 22. Feature-flag model

All flags remain unchanged:

| Flag | Required state during this phase |
| --- | --- |
| `intelligence.foundation.enabled` | Existing local foundation only |
| `intelligence.facts.local_adapter` | Existing local foundation only |
| `intelligence.facts.server_adapter` | OFF |
| `intelligence.insights.today` | OFF |
| `intelligence.insights.post_log` | OFF |
| `intelligence.insights.progress` | OFF |
| `intelligence.coach.fact_context` | OFF |
| evidence, observability, feedback, proactive flags | OFF |

Future contextual flags depend on Foundation correctness, transient-only operation, active-account state isolation, and the relevant surface-specific review. Coach context must remain independently disabled.

## 23. Failure behavior

When identity, hydration, account ownership, freshness, completeness, confidence, provenance, date/timezone, or deterministic evidence is inadequate, the future selector must return one of:

- no insight;
- insufficient data;
- stale data;
- low confidence.

It must not infer missing values, fabricate advice, or block ordinary Calora use.

## 24. Performance considerations

No production performance claim is made. The existing local performance fixture measured:

| Operation | Sample time |
| --- | --- |
| Context adaptation | 0.2223 ms |
| Evidence partitioning | 0.0172 ms |
| Confidence computation | 0.0049 ms |
| Source watermark | 0.1576 ms |
| Fact generation | 0.3751 ms |

These are test-fixture samples, not device or production service-level benchmarks. A future implementation must keep calculations synchronous, bounded to the active surface/date, and measured on representative devices before enabling any UI.

## 25. Remaining unknowns

1. Managed production support for a separate Calora runtime role and credential.
2. Deterministic publish persistence for roles, grants, policies, and support objects.
3. Managed upstream pool behavior under transaction-local settings and reconnects.
4. Rehearsed role/policy/credential rollback.
5. Whether sign-out or account-switch behavior already has a separate user-state-clearing path outside the inspected code.
6. Real-device cost of Foundation calculations on large local histories.

## 26. Remaining blockers

### Database architecture

- no non-superuser API runtime role;
- no separate runtime credential;
- no verified managed production role/grant/RLS lifecycle;
- no proven transaction-local pool behavior;
- no tested rollback.

### Restricted Phase 2A

- fixed-key local persistence/account-switch exposure must be resolved or conclusively bounded before insights are displayed;
- no implementation may add persistence, caching, server access, Coach context, or feature-flag enablement without review.

## 27. Database infrastructure verdict

**C — NOT RELIABLY FEASIBLE ON THE CURRENT PLATFORM CONFIGURATION.**

Continue to treat API authorization as Calora’s active tenant boundary. This verdict may be revisited only with direct, reproducible evidence for every missing role/credential/publishing/pooling/rollback control.

## 28. Restricted Phase 2A verdict

**APPROVE WITH CONDITIONS.**

The deterministic Foundation can support a narrowly transient future calculation layer without creating a new persistent security boundary. Approval does not authorize implementation or UI display today. It is conditional on correcting or proving safe the shared-device/account-switch state boundary and retaining every non-persistence, non-network, non-Coach, non-background limitation in this report.

## 29. Exact scope recommended for the next task

A future task may only:

1. establish and test active-account local-state isolation/clear behavior so a logout or account switch cannot expose a previous user’s local data;
2. design and test a pure, bounded, transient contextual-insight selector over existing Foundation facts;
3. prove it emits no persistence, cache, network request, server adapter call, Coach context, or sensitive log payload;
4. leave all contextual Intelligence and Coach flags OFF until a later explicit rollout approval.

It must exclude persistent facts/profiles, proactive work, database migration, RLS changes, Coach rewrite, autonomous recommendations, LLM factual state, and cross-user processing.

## 30. Files changed, if any

- `docs/CALORA_INTELLIGENCE_PHASE_1_8A_INFRASTRUCTURE_AND_PHASE_2A_FEASIBILITY_REPORT.md`

No application, feature flag, secret, workflow, database, role, policy, grant, or deployment setting changed.

## 31. Tests/inspections performed

```text
Read-only PostgreSQL inventory from Phase 1.8
PASS — one postgres superuser/owner/BYPASSRLS runtime role; 19 Calora tables without RLS/policies; postgres sole table grantee

Repository lifecycle and connection audit
PASS — one DATABASE_URL and one pg.Pool; development support-object provisioner only; no role/grant/policy or second credential lifecycle

Replit managed PostgreSQL documentation review
PASS — development/production separation, managed credential rotation, and recovery capability documented; no Calora-specific proof of target role/RLS lifecycle

pnpm --filter @workspace/calora exec vitest run lib/__tests__/intelligenceFoundation.test.ts lib/__tests__/intelligenceHardening.test.ts lib/__tests__/intelligencePerformance.test.ts
PASS — 19 tests in 3 files
```

No expensive full regression suite was rerun because this investigation changed no executable code. No database write or production inspection was performed.

## Final stop condition

Stop for review. Do not enable RLS, alter credentials, migrate data, enable Contextual Intelligence, create persistent Intelligence data, change Coach behavior, or begin Phase 2A implementation.