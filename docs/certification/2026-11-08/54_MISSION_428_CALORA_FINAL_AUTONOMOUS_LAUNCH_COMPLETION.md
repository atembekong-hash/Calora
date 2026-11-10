# Mission 428 — Calora Final Autonomous Launch Completion

**Assessment date:** 2026-11-08
**Protected-main baseline:** `a933bb58fc27a949696b6f1f3c853510c643d618`
**Working branch:** `mission/428-autonomous-launch`
**Protected PR:** [#416](https://github.com/atembekong-hash/Calora/pull/416)
**Protected-main merge:** `60bc031e6bf5cfd2aaa40b8b497c6d897e52ee76`
**Scope:** authorized engineering corrections and evidence reconciliation only; no production mutation, deployment, native build, OTA publication, store submission, live entitlement change, or customer-data access.

## Executive verdict

**NOT READY — with precise unresolved blockers.**

The autonomous phase completed a focused Coach/Fact Context transaction-identity correction and app-wide Coach-context expansion, and reconciled the remaining launch-hardening domains. The source-level Coach package is validated, but the application is not fully launch-certified because mandatory evidence remains owner- or environment-gated: production tenant-boundary attestation, complete non-BYPASSRLS real-handler coverage, current signed Android/iOS acceptance, live subscription lifecycle proof, production recovery proof, and privacy/deletion service-identity rehearsal.

## Implemented in this worktree

### Coach and Fact Context identity hardening

- Coach V2 conversation/settings/history mutations and reads reuse the request-local verified transaction context when staged identity is active; external AI work remains outside database transactions.
- Coach Fact Context consent and nonce phases use short verified identity transactions; provider execution is not held under a database lock.
- Legacy/unit compatibility is retained for partial test doubles without weakening real staged-RLS behavior.
- No-op Coach mutation outcomes (`false`, `not_found`, and `active_or_pending`) preserve rollback semantics.

### Coach context can relate to the broader Calora application

The authenticated server-owned Coach snapshot now includes bounded signals for:

- profile and calorie target;
- today’s logged nutrition and recent logging coverage;
- latest weight;
- saved-meal count;
- personal-recipe count;
- recent capture-session activity;
- latest subscription status.

The prompt contract explicitly labels these as bounded signals. Coach is forbidden from claiming access to raw food names, notes, images, full timelines, account identifiers, health-provider data, or local-only hydration, steps, and fasting values that are not present in the server snapshot. This is deliberate: local-only facts must enter through the existing consented, allowlisted Fact Context path rather than through an untrusted arbitrary payload. The design therefore broadens Coach’s application awareness without granting unrestricted tenant or sensitive-data access.

## Validation evidence

- Coach V2, Coach Fact Context, Coach consent, and Coach data suites: **84/84 passed**.
- Complete API offline suite (47 files): **564/564 passed**.
- API TypeScript validation: **passed**.
- Database package TypeScript validation: **passed**.
- Mission 417 security contracts: **3/3 passed**.
- Diff whitespace audit: **passed** for the current worktree.
- No native build, OTA, store submission, production database operation, live RevenueCat operation, Railway mutation, or production customer query was performed.

## Reconciled remaining findings

| Domain | Status | Priority | Evidence-based disposition |
|---|---|---:|---|
| Capture, barcode, label scan, voice, local acceptance, diary retry | Source/unit PASS; native proof blocked | P1 runtime | Current source contains guarded voice/barcode/capture flows and durable local-first retry. The older P0 voice finding is stale against current source. Native cold-start, permission, interruption, and device evidence remain required. |
| Planner, wellness, weight, activity, fasting, progress | Local persistence PASS; cross-device/RLS unverified | P1 | Encrypted account-keyed local persistence is covered. Server-side cross-session and non-BYPASSRLS real-handler proof is absent. No speculative source change made. |
| Recipes/media | Staged-RLS blocked | P1 | `recipe-media.ts` still uses pooled queries; staged artifact lacks recipe-media grant/policy. Media lifecycle supersession is not atomic. Requires reviewed executor/policy design and three-user rehearsal. |
| Saved meals/collections | Cross-device contract inconsistent | P1 | Client state is local-first; `saveMeal` does not enqueue a supported server mutation, and `/v1/sync` rejects `savedMeal`. Product/data-owner decision is required: intentional local-only behavior or a real sync domain. |
| Discover/recipe pagination | Source/unit PASS with deliberate cycle repeats | P2 | Server/client deduplication and cursor tests are strong. Unfiltered For You deliberately repeats cards after a full cycle; product confirmation is advisable but no defect is proven. |
| Account deletion/privacy | Source and disposable/unit controls strong; service proof blocked | P1 | Fences, staged cleanup, leases, redaction, and privacy intake are implemented. Worker identity, current-candidate proof, and legal fulfillment/export evidence are absent. |
| Workers/service identities | Incomplete | P0/P1 | Background recovery is fire-and-forget with periodic polling and shared application DB access; no independent least-privilege service identity or durable queue/dead-letter proof exists. |
| RevenueCat/subscriptions | Fail-closed authorization PASS; lifecycle persistence unproven | P0/P1 | Credential separation, entitlement fail-closed behavior, rate limiting, and emulator idempotency pass. No webhook ingestion, event ledger, durable reconciliation, renewal/refund/revocation evidence, or current Test Store acceptance exists. |
| Recovery | Synthetic local rehearsal PASS; production CAL-17 blocked | P0 | Encrypted backup/restore contracts and disposable restore passed in Mission 424. Production custody, retention, key escrow, private media/Auth/provider reconciliation, and measured RPO/RTO remain unverified. |
| Android/iOS | Static readiness only | P0 | No native build or device execution was authorized in this mission. Samsung Galaxy S20 remains the only authorized physical Android target; iOS signed/TestFlight proof is absent. |

## Authoritative control status

- **CAL-15 tenant isolation:** BLOCKED. Bounded sync/referral/diary staged-RLS evidence exists, but API-wide route, production role/migration, service identity, and current production attestation do not.
- **CAL-17 recovery:** BLOCKED. Synthetic evidence is not production recovery certification.
- **CAL-21 Coach focused controls:** source/unit PASS for this correction; authenticated runtime, production retention/cost/provider evidence remain blocked under CAL-22/CAL-23.
- **CAL-25 recipes/media:** BLOCKED for authenticated staged-RLS proof.
- **CAL-27/CAL-28 subscriptions:** BLOCKED for current lifecycle and cross-device proof.
- **CAL-06–13 native release gates:** remain blocked or not run pending owner-authorized signed-candidate/device work.

## Owner-gated checklist

1. Approve the reviewed production identity/RLS migration and role/grant attestation plan; do not apply the staged prototype directly.
2. Decide whether saved meals and recipe collections are local-only or require cross-device sync; if sync is required, approve the schema/API contract.
3. Provide disposable authenticated QA identities and a non-BYPASSRLS database fixture for the omitted route-family rehearsal.
4. Provide an isolated RevenueCat Test Store identity and webhook ownership/policy if durable subscription reconciliation is required.
5. Authorize exactly one Android preview/release build and one iOS/TestFlight candidate when ready; no such action was taken here.
6. Complete production backup custody, key escrow, retention, provider/Auth reconciliation, and measured restore drill before public launch.
7. Obtain legal/store-console approval for privacy disclosures, Data Safety/App Privacy, subscription disclosures, and account-deletion fulfillment.

## Final release recommendation

Do not promote the production release branch or declare US launch readiness yet. The smallest safe next engineering package is a dedicated disposable non-BYPASSRLS real-handler rehearsal for recipes/media, saved-content (after the product decision), planner/wellness, Coach, and deletion/service identities, followed by a separately reviewed production identity rollout. Native builds, live billing acceptance, production recovery, and store submission must remain owner-authorized actions.
