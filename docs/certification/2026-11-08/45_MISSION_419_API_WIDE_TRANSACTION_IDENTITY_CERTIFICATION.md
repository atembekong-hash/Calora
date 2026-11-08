# Mission 419 — API-Wide Transaction Identity and Staged RLS Integration

**Date:** 2026-11-08  
**Branch:** `mission/419-api-wide-transaction-identity`  
**Base:** protected `main` at `dede7ad4c0403fd37c2fc423bfabbb388b9a89ce`  
**Production safety:** No Railway deployment, release-branch update, production SQL, database-role change, credential change, native build, OTA update, or store submission was performed.

## Verdict

**CONDITIONAL — not production-ready and not API-wide RLS certified.**

Mission 419 extends the verified transaction-scoped identity executor beyond the profile path to the core diary and privacy-request routes. The implementation is fail-closed in staged mode and preserves legacy behavior when staged mode is disabled. Important API surfaces remain outside the abstraction and are explicitly retained as certification blockers.

## 1. Database-access inventory and authorization matrix

| Surface | Principal / boundary | Current executor state | Certification status |
|---|---|---|---|
| Profile read/write/delete | Authenticated external identity mapped to one `calora_users` row | Verified transaction executor; first-account provisioning and deletion fence share the transaction | Integrated in Missions 418–419 |
| Diary list/create/delete | Authenticated external identity; `diary_entries.user_id` ownership predicate | Verified transaction executor; account writability and user-row bridge use the same executor | Integrated in Mission 419 |
| Privacy request list/create | Authenticated external identity; `privacy_rights_requests.user_id` ownership predicate | Verified transaction executor; account writability and request insert are atomic | Integrated in Mission 419 |
| Diary first-log capture anchor | Authenticated identity plus capture-session ownership and candidate evidence | Still direct legacy Drizzle access with an inner transaction | Not integrated |
| Offline sync and conflict ledger | Authenticated identity; diary and capture-session ownership; idempotency ledger | Still direct `db` access with nested per-mutation transactions | Not integrated |
| Food capture / capture sessions | Authenticated identity, provider analysis, rate-limit and candidate records | Direct pool/Drizzle access and service/provider calls | Not integrated |
| Recipes, saved meals, favorites, generated content | Authenticated identity plus entitlement and content ownership | Direct route/helper access; premium authorization exists but staged DB execution is not proven | Not integrated |
| Coach conversations, turns, memory, fact context | Authenticated identity for user rows plus server-owned generated records | Direct pool/Drizzle helpers; mixed user/service ownership | Not integrated |
| Account deletion workflow | Authenticated identity, deletion state, object storage, RevenueCat, auth provider | Deletion fence is compatible with profile/diary/privacy request transactions; full workflow remains direct and service-owned | Partial |
| Health, activity, weight, hydration, wellness records | Authenticated identity and per-user ownership columns | Direct route/database helpers | Not integrated |
| Referrals and qualification | Authenticated identity plus shared referral-code state | Direct database transactions and concurrency helpers | Not integrated |
| Admin, observability, rate limits, recovery warnings | Explicit admin/service operational identity | Direct pool access; must not be placed under ordinary user RLS identity | Separate service-identity design required |
| Background workers and scheduled jobs | Narrow service identity, never invented user identity | No staged service identity integration in this mission | Unsupported / blocked |
| Public and anonymous routes | No authenticated principal | Unchanged; no identity is invented | Preserved |

The inventory was performed from route modules, API helpers, integration tests, and direct `@workspace/db` access references. It found direct Drizzle calls, raw `pool.query` calls, nested transactions, capture/provider helpers, admin paths, and worker-like service operations. The staged abstraction cannot safely be applied by simply replacing every `db` reference: nested transaction boundaries and server-owned records require separate executor and identity decisions.

## 2. Implemented integrations

### Diary

- `GET /v1/diary` resolves the user row and reads diary entries through `withVerifiedDatabaseIdentity`.
- `POST /v1/diary` performs account-writability checks, user-row provisioning, image-evidence normalization, and diary insertion through the same scoped executor.
- `DELETE /v1/diary/:entryId` performs the deletion fence, user-row resolution, and owner-scoped delete through the same scoped executor.
- Existing ownership predicates remain in place; no client-supplied user identity is trusted.

### Privacy requests

- `GET /v1/privacy/requests` reads only the authenticated user’s requests through the scoped executor.
- `POST /v1/privacy/requests` performs the account-deletion writability check, user-row provisioning, and insert atomically through the scoped executor.
- Existing deletion-fence error mapping remains unchanged.

### Shared safety properties

- Legacy mode continues to call the existing database object.
- Staged mode requires `CALORA_RLS_IDENTITY_SECRET` and verified signed assertions.
- Identity is transaction-local through `set_config(..., true)`.
- Commit, rollback, and pooled-client release remain centralized in the identity wrapper.
- No `BYPASSRLS` fallback or session-global identity setting was introduced.

## 3. Validation evidence

The following checks passed on the Mission 419 branch:

- API TypeScript validation: **PASS**.
- Mission 419 API-wide identity contracts: **9/9 PASS** across diary adoption, privacy adoption, and explicit unsupported-path detection.
- Mission 418 identity contracts: **3/3 PASS**.
- Mission 417 security contracts: **3/3 PASS**.
- Diary route suite: **32/32 PASS**.
- Privacy-rights route suite: **3/3 PASS**.
- Combined diary/privacy focused suite: **35/35 PASS**.
- `git diff --check`: **PASS**.

The focused route suite used only a harmless local PostgreSQL URL to satisfy module initialization; it did not connect to production. The staged SQL was not applied to production.

## 4. Remaining unsupported paths and required work

The following remain explicit blockers for API-wide certification:

1. Sync must be refactored so its idempotency and diary writes run on the outer verified transaction without opening nested pooled transactions.
2. Capture and first-log flows must share the verified executor across capture sessions, candidates, rate limits, and diary anchoring.
3. Recipes, saved meals, favorites, and generated content need route-by-route executor integration plus staged premium-entitlement tests.
4. Coach user-owned and server-owned records need a policy matrix and separate service identity for generated reports and worker writes.
5. Privacy export and full account deletion need end-to-end staged validation across object storage, RevenueCat, auth-provider calls, and deletion fences.
6. Health and wellness routes, referrals, and other user-specific routes need real-handler cross-account tests.
7. Admin, logging, rate-limit, scheduled, and background operations require narrowly scoped service identities; they must not use fabricated user identities or a general privileged fallback.
8. Disposable PostgreSQL real-handler and concurrent pooled-client evidence is still required for every integrated family before certification can be upgraded.

## 5. Production rollout dependencies and owner approvals

Before production enforcement, the owner must separately approve:

- Applying the staged function-hardening and RLS/grant migration to a controlled non-production target.
- A migration-window plan, backup/restore evidence, rollback procedure, and post-migration health checks.
- Production database-role, grant, policy, and environment-secret changes.
- Enabling staged mode only after all required route and worker paths have passed real-handler validation.
- A separately authorized Railway/release-branch rollout and production verification.

No such approval was exercised by Mission 419. Railway remains untouched and native release restrictions remain in force.

## Final classification

- **PASS:** diary list/create/delete integration, privacy request list/create integration, legacy compatibility, identity-wrapper safety contracts, focused route tests, and TypeScript validation.
- **CONDITIONAL:** staged policy compatibility for the newly integrated routes pending disposable PostgreSQL real-handler execution with the staged SQL applied.
- **FAIL / NOT READY:** complete API-wide transaction identity and staged-RLS certification, because sync, capture, recipes, Coach, wellness, deletion workflows, workers, and service-owned paths remain outside the abstraction.
