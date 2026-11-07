# Calora Autonomous Production Certification Mission
## Master Production Certification Report

**Assessment date:** 2026-11-07  
**Tested commit:** `9e7790cffb0cbf8062d1fa1986be6e71b76ff5161`  
**Repository:** `/home/ubuntu/calora-coach-live-main`  
**Baseline status:** clean protected-main worktree; no source files modified by this reduction  
**Environment:** bounded read-only sandbox; source inspection and selected Vitest/preflight runs; no current signed release-candidate binary, physical Android/iOS device, authorized simulator, production credentials, or live provider/database access.

## Final verdict

# NOT CERTIFIED — BLOCKED

This verdict is mandatory because critical launch evidence is unavailable or unresolved. The evidence supports substantial source-level and focused-test readiness, but it does **not** establish US commercial release readiness across current Android/iOS binaries, managed-PostgreSQL tenant isolation, production operations/recovery, billing lifecycle, accessibility, native permissions, or authenticated end-to-end flows. Confirmed failures include misleading/orphan contract paths, an Android Auto camera startup/lifecycle defect, six iOS signing-evidence test failures, missing database-boundary certification, incomplete calorie-input validation, and historically documented paid-benefit enforcement gaps.

## Evidence accounting

The eight independent domain reports supplied for this reduction contain **101 assessed evidence items**: **68 PASS, 7 FAIL, 13 BLOCKED, and 13 NOT RUN**. These are item-level statuses, not a claim that 68 product capabilities are commercially certified. There are **0 audit failures**. `NOT APPLICABLE` was not assigned to any mandatory launch control; where evidence was unavailable, it remains BLOCKED or NOT RUN.

| Domain | PASS | FAIL | BLOCKED | NOT RUN | Domain result |
|---|---:|---:|---:|---:|---|
| Product screens and interactions | 11 | 1 | 1 | 1 | BLOCKED / FAIL |
| Android certification readiness | 4 | 2 | 3 | 3 | BLOCKED / FAIL |
| iOS certification readiness | 7 | 1 | 2 | 2 | BLOCKED / FAIL |
| Backend, database and infrastructure | 11 | 1 | 1 | 1 | BLOCKED / FAIL |
| Nutrition, health and calculations | 10 | 1 | 1 | 1 | BLOCKED / FAIL |
| Calora Coach and AI safety | 8 | 0 | 2 | 2 | BLOCKED |
| Recipes, Discover Plus and media reliability | 10 | 0 | 2 | 2 | BLOCKED |
| Commercial compliance and operations | 7 | 1 | 1 | 1 | BLOCKED / FAIL |
| **Total** | **68** | **7** | **13** | **13** | **NOT CERTIFIED — BLOCKED** |

## Confirmed defects and material adverse findings

1. The forensic map records runtime-only legacy `POST /v1/coach/respond` and orphan privacy export/delete OpenAPI paths without a current mobile consumer/runtime route. These are misleading contract paths and fail contract-integrity review.
2. Android Auto Scan was observed stuck at “Starting camera…” after route/resume; restart recovered it. It remains partial/defective. No current protected-main signed Android release candidate was installed.
3. Android Health Connect authorization/data, TalkBack traversal, large-font/keyboard variants, notifications, reduced motion, lifecycle/recovery, and broad device coverage were not demonstrated.
4. Current iOS has no independently evidenced signed native artifact, Apple signing record, App Store Connect processing/tester evidence, or device/simulator acceptance. The current native preflight run was 31 passed / 6 failed; failures are in `ios-signing-evidence.test.js`, plus a synthetic Apple-rejection fixture is gated by build number.
5. Actual Calora customer data is in managed PostgreSQL, not the inspected Supabase project. No database-level RLS or equivalent independently verified boundary was found for the customer-data database. Current Railway identity, roles/grants, migrations, storage policy, observability, rollback, restore, and recovery were not re-certified.
6. `calorieRecommendation.ts` lacks direct tests and does not validate/bound `weightKg`/result; key profile numeric validation checks finiteness but not positivity.
7. Active Coach uses clean-room `/v1/coach/v2/chat`; the dormant Fact Context adapter/allowlist route must not be represented as active production evidence. Signed-in conversation messages are persisted/resubmitted as history and require privacy/provider-retention approval.
8. Recipes/media mobile focused tests passed, but database-backed API tests were blocked by missing `DATABASE_URL`; authenticated Plus/provider content, live generation acceptance/regeneration, and native/device flows were not evidenced.
9. No current store evidence proves purchase, restore, renewal, expiration, grace/billing retry, cancellation, refund, revocation, cross-device restore, or account switching. The committed billing certification explicitly concludes NOT CERTIFIED FOR LAUNCH and historically records paid-benefit enforcement gaps.

## What passed and what it means

Focused source-level suites provide meaningful positive evidence: nutrition/serving/date/fasting/health-day/progress/diary-sync coverage (165/165), Coach API (60/60) and client (146/146), mobile recipe reliability (143 tests), plus static configuration and readiness checks. These PASS results validate bounded code contracts at the tested commit; they do not substitute for production identity, live database/provider evidence, signed binaries, physical-device behavior, accessibility, or store-console proof.

## Certification rule applied

Commercial certification requires every mandatory release gate to be PASS or explicitly NOT APPLICABLE with evidence. Any FAIL or unresolved BLOCKED mandatory gate prevents certification. Historical reports were preserved as historical context only and were not promoted to current PASS when tied to older commits, older APKs, or unavailable consoles/devices.

## Required release decision

Do not authorize US commercial release from this evidence set. Re-open certification only after the owner actions in the companion blocker register are completed, independently evidenced against the same release candidate, and re-run through the authoritative register.

## Source reports

- [01 Product](areas/01-product.md)
- [02 Android](areas/02-android.md)
- [03 iOS](areas/03-ios.md)
- [04 Backend](areas/04-backend.md)
- [05 Calculations](areas/05-calculations.md)
- [06 AI](areas/06-ai.md)
- [07 Recipes](areas/07-recipes.md)
- [08 Commercial](areas/08-commercial.md)
