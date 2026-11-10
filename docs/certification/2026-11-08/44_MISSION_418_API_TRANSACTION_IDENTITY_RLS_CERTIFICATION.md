# Mission 418 — API Transaction Identity Integration and RLS Certification

**Date:** 2026-11-08  
**Scope:** Application-level integration of the staged Mission 417 identity/RLS prototype.  
**Production safety:** No Railway, production Supabase, production database, credentials, native builds, store submissions, or `release/calora-production` changes were performed.

## Verdict

**CONDITIONAL — not production-ready and not a production RLS certification.**

The staged identity abstraction is now integrated into the profile/account path and has been exercised against a disposable PostgreSQL database through the real HTTP profile handler. Legacy profile behavior remains green. The staged policy prototype remains explicitly outside the auto-applied migration directory. The broader API surface is not yet integrated with the transaction identity abstraction; therefore Mission 418 does not close the tenant-isolation or least-privilege launch blocker.

## Implemented changes

- Added `database-identity.ts`, an explicit request-scoped transaction wrapper that verifies a bounded signed assertion, sets identity only with transaction-local `set_config`, commits or rolls back atomically, and releases the pooled client in every path.
- Added an API-package-local `identity-assertion.ts` primitive so production compilation does not depend on a staged security artifact outside the API package root.
- Exported a typed Drizzle database factory for a checked-out PostgreSQL client.
- Updated account-deletion writability checks and user-row provisioning to accept the current transaction executor, avoiding nested `BEGIN` calls in staged mode while preserving legacy behavior.
- Integrated profile GET, PUT, and DELETE paths with the verified identity executor. The first-account user bridge remains owner-bound to the verified external identity.
- Corrected the staged prototype for the account-deletion state lookup and the `extensions.digest` dependency required by the existing deletion fence.
- Updated the profile compatibility test and added Mission 418 static contracts covering fail-closed mode, cleanup, profile adoption, and first-account provisioning.

## Authorization and database-access matrix

| Surface | Current Mission 418 state | Evidence / decision |
|---|---|---|
| Profile read/write/delete | **Integrated** | Real HTTP handler test passed under staged RLS; legacy profile suite also passed. |
| User-row provisioning and account-deletion writability | **Integrated for profile path** | Runs on the outer identity transaction; no nested transaction. |
| Diary / meal logs | **Not integrated** | Existing real-handler suite still uses legacy direct access; not claimed as staged-RLS certified. |
| Sync | **Not integrated** | Existing real-handler suite returns an expected incompatibility under staged mode; requires a dedicated request-scoped sync integration. |
| Recipes / saved content | **Not integrated** | Requires route-by-route executor migration and premium entitlement verification under staged RLS. |
| Coach conversations / turns | **Not integrated** | Coach has service-owned and user-owned records requiring a separate identity matrix. |
| Privacy requests / account deletion | **Partially reviewed** | Deletion fence dependencies are compatible with the profile transaction; full privacy/delete handler certification remains outstanding. |
| Background workers / scheduled jobs | **Unsupported by this change** | Must use separately documented service identities; no broad privileged fallback was added. |
| Public/anonymous routes | **Unchanged** | No authenticated identity is invented; protected paths remain fail-closed. |
| Premium entitlement boundaries | **Not re-certified in staged mode** | Existing RevenueCat authorization tests remain applicable, but staged database enforcement is not proven for every premium route. |

## Real-handler evidence

A disposable PostgreSQL database was created, bootstrapped with the repository-supported empty-target procedure, migrated, and destroyed after testing. The staged Mission 417 SQL was applied only to that disposable target. A synthetic runtime role and synthetic assertion secret were used; no production secret or data was accessed.

- `tenant-isolation.integration.test.ts -t "durable profile"`: **1 passed**.
- The test drove `PUT /v1/profile` and `GET /v1/profile` through Express and Supertest, with two independently mocked verified identities. The owner received its profile; the second identity received no owner data.
- The complete existing tenant-isolation suite was also attempted under staged mode. The profile case passed after integration. Diary, sync, and capture cases were not counted as passes because those routes are not yet migrated to the scoped executor. This is a deliberate conditional result, not a hidden failure.

## Security and compatibility validation

- Mission 418 API identity contracts: **3 passed**.
- Mission 417 security contracts: **3 passed**.
- Recovery-bundle contracts: **5 passed**.
- Identity assertion executable tests: **PASS** for tampering, expiry, nonce uniqueness, bounds, commit, and rollback.
- Legacy profile route suite: **7 passed**.
- API TypeScript validation: **passed**.
- Library typecheck: **passed**.

The staged migration remains under `artifacts/security/mission-417/migrations/` and is not in `lib/db/migrations/`; it cannot be auto-applied by the normal migration runner. No production migration was run.

## Remaining gaps and required next work

1. Migrate diary, meal logging, sync, recipe, saved-content, Coach, privacy, and subscription-related database paths to the same explicit executor or document a narrowly scoped service identity for each.
2. Add disposable real-handler coverage for each surface, including cross-account read/write attempts and pooled concurrent requests.
3. Add worker/service authorization tests and verify that retries and connection reuse clear transaction-local identity.
4. Reconcile policy predicates with every ownership column, including server-owned reports and shared/system content.
5. Obtain explicit owner approval before applying any RLS/grant migration to production, followed by a separately authorized production verification and rollback rehearsal.

## Required approvals

Production enforcement remains owner-gated. No approval to deploy, migrate, restart Railway, modify Supabase, build native artifacts, or submit to stores is implied by this report.

## Final classification

**PASS:** scoped profile integration, legacy compatibility, staged-only placement, assertion hardening, and disposable profile-handler evidence.  
**CONDITIONAL:** API transaction identity architecture and staged policy compatibility.  
**FAIL / NOT READY:** full API-wide staged-RLS certification and launch-blocker closure, because multiple database access paths remain outside the abstraction.
