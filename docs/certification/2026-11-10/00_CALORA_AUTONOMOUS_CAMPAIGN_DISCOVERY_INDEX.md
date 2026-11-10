# CALORA Autonomous Campaign Discovery Index

**Campaign date:** 2026-11-10
**Inspected revision:** `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`
**Scope:** CAL-QA-01 through CAL-QA-25
**Source basis:** The eight cluster discovery reports supplied for this synthesis.
**Execution posture:** Discovery-only and read-only. No builds, tests, deployments, provider transactions, database mutations, or native-device execution were performed by the cited cluster work.

## Executive campaign disposition

The campaign is **not certifiable from the available evidence**. All clusters report substantial source-level and focused-test evidence, but the campaign-wide proof layer is incomplete: current Android/iOS execution, authenticated production journeys, live provider/store behavior, database/RLS and cross-device persistence, production serving provenance, recovery behavior, accessibility/device evidence, and release governance are not established consistently. No current source defect was proven by the supplied reports. Several risks and historical findings remain unresolved because they require current-build or production retest.

Overall status is therefore **BLOCKED/PARTIAL**, not PASS. The strongest hard blockers are contradictory or unproven production-serving provenance; incomplete production role/migration and API-wide non-BYPASSRLS tenant-isolation evidence; absent native, provider, commercial, recovery, and authenticated database evidence; and missing owner approvals for release-critical exceptions.

## Recommended mission order and dependency gates

The order below is a campaign execution order, not a claim that the missions have already run successfully.

1. **CAL-QA-01 to CAL-QA-03 — startup, authentication, onboarding, and core profile/target contracts.** Establish a clean current Android/iOS build, provider-auth flow, onboarding persistence, and production-serving identity first. These are foundational dependencies for authenticated journeys and tenant-scoped data checks.
2. **CAL-QA-04 to CAL-QA-10 — today, food/nutrition, and capture inputs.** Execute current-build Today and all capture paths (Auto, Barcode, Food, Label, Library, Receipt, Text, Voice), including live camera/microphone/provider behavior, validation, retries, review-before-save, and persistence. These depend on CAL-QA-01–03 authentication/onboarding and on live food/provider access.
3. **CAL-QA-11 to CAL-QA-12 — Discover/recipes and meal planning.** Run authenticated Plus/provider journeys after the core and input flows are available. Verify database-backed and cross-device persistence, recipe portions, planner save/error semantics, and current serving provenance.
4. **CAL-QA-13 to CAL-QA-15 — Coach, progress, and wellness.** Execute provider-backed and Health Connect/HealthKit journeys after authentication, persistence, and production tenant controls are proven. Resolve the documented Coach staged-RLS rate-limit access-boundary blocker.
5. **CAL-QA-16 — integrations.** Validate current database/device execution and integration recovery after the identity, persistence, provider, and native gates are complete.
6. **CAL-QA-17 to CAL-QA-18 — dashboard customization and More/Settings interactions.** Run exhaustive real journeys, including accessibility and default restoration, on current Android/iOS artifacts after navigation/authentication foundations are verified.
7. **CAL-QA-19 — commercial/store lifecycle.** Validate store/provider lifecycle evidence independently; this is a release gate for Plus and commercial enforcement claims.
8. **CAL-QA-20 — commercial/data behavior.** Re-run current commercial enforcement and data behavior with live provider/store and database evidence after CAL-QA-19.
9. **CAL-QA-21 — production/provider/serving and recovery.** Reconcile production provider, Railway, migration, serving-provenance, and recovery evidence. This is a campaign-wide release gate and must precede final certification.
10. **CAL-QA-22 to CAL-QA-25 — backend security, release governance, recovery, and final campaign acceptance.** The supplied cluster explicitly covers backend-security/release concerns but does not map individual findings to these four mission IDs. Treat each as unverified until its mission-specific evidence, owner approval, and current artifact provenance are attached. Final acceptance must also confirm branch protections and production controls.

### Dependency gates that apply across missions

- **G1: Artifact identity:** current Android and iOS artifacts, exact SHA/build identity, and serving provenance reconciled.
- **G2: Identity and tenant boundary:** authenticated provider flows, production roles/migrations, RLS, and API-wide non-BYPASSRLS isolation demonstrated.
- **G3: Live capability:** camera, microphone, food/provider, Health Connect/HealthKit, and store/provider operations exercised on the current build where applicable.
- **G4: Persistence:** authenticated database writes/reads, recovery, synchronization, and cross-device behavior demonstrated; device-local behavior is not sufficient for certification where shared persistence is required.
- **G5: Release approval:** accountable owners approve residual risks, historical findings that remain unresolved, and any exceptions before PASS is issued.

## Mission map (CAL-QA-01 through CAL-QA-25)

Status labels below are limited to the supplied cluster summaries. Where the summaries do not identify a mission-specific result, the status is **UNVERIFIED — not reported**, not an inferred pass or failure.

| Mission | Current discovery status | Evidence available from supplied reports | Evidence gap / blocker | Required dependency / owner approval |
|---|---|---|---|---|
| CAL-QA-01 | PARTIAL | Source and focused unit-test controls substantial. | Current Android/iOS execution, provider-auth flows, production serving/provenance missing. | G1, G2; startup/auth owner approval. |
| CAL-QA-02 | PARTIAL | Source and focused unit-test controls substantial. | Same cluster-level gaps; full certification unverified. | G1, G2; auth/onboarding owner approval. |
| CAL-QA-03 | PARTIAL | Source and focused unit-test controls substantial. | Same cluster-level gaps; full certification unverified. | G1, G2, G4; onboarding/profile owner approval. |
| CAL-QA-04 | PARTIAL/BLOCKED | Today/nutrition source and deterministic contracts substantial. | Native current-build execution, live food/provider evidence, authenticated production/database sync, current device/accessibility evidence missing. | G1–G4; Today/nutrition owner approval. |
| CAL-QA-05 | PARTIAL/BLOCKED | Today/nutrition source and deterministic contracts substantial. | Same gaps; historical calorie-input defect is outdated after later boundary repair but needs current retest. | G1–G4; nutrition owner approval. |
| CAL-QA-06 | PARTIAL | Capture implementation and focused tests cover Auto path, auth binding, validation, retries, review-before-save, persistence, and safe provider matching. | Current Galaxy S20/iOS execution, live camera/provider evidence, production provenance and production-grade sync missing. | G1–G4; capture owner approval. |
| CAL-QA-07 | PARTIAL | Capture implementation and focused tests cover Barcode path and shared safety controls. | Current native/live provider/device and production persistence evidence missing. | G1–G4; capture/provider owner approval. |
| CAL-QA-08 | PARTIAL | Capture implementation and focused tests cover Food path and shared safety controls. | Current native/live provider/device and production persistence evidence missing. | G1–G4; food-provider owner approval. |
| CAL-QA-09 | PARTIAL | Capture implementation and focused tests cover Label, Library, Receipt, Text, and Voice paths and shared controls. | Current camera/microphone/native execution, provider evidence, production provenance, and persistence/sync evidence missing. | G1–G4; capture and accessibility/device owner approval. |
| CAL-QA-10 | PARTIAL | Capture cluster reports extensive source/focused coverage across capture inputs. | Historical S21/S21 Ultra and older-SHA evidence is not current certification; Smart Scan camera-stall history requires current native retest. | G1–G4; release owner approval for historical-risk disposition. |
| CAL-QA-11 | BLOCKED | Discover/recipes source and controlled tests provide substantial partial verification. | Current native/browser runtime, authenticated Plus/provider, database-backed and cross-device persistence, exact serving provenance missing. | G1–G4; Discover/recipes owner approval. |
| CAL-QA-12 | BLOCKED | Meal-planning source and controlled tests provide substantial partial verification. | Same gaps plus planner unconditional save-success feedback, device-local planner/saved-state persistence, recipe portion consistency, and unresolved artifact/provenance reconciliation. | G1–G4; planner/product owner approval for contract risks. |
| CAL-QA-13 | PARTIAL | Coach source and focused-test evidence strong. | Current native, Health Connect/HealthKit, authenticated cross-device/RLS, production-serving, and live provider evidence missing; staged-RLS rate-limit boundary unresolved. | G1–G4; Coach/security owner approval. |
| CAL-QA-14 | PARTIAL | Progress source and focused-test evidence strong. | Current native/provider/database/cross-device and production-serving evidence missing. | G1–G4; progress owner approval. |
| CAL-QA-15 | PARTIAL | Wellness source and focused-test evidence strong. | Current native/provider/database/cross-device and production-serving evidence missing. | G1–G4; wellness/provider owner approval. |
| CAL-QA-16 | PARTIAL | Integrations source/test evidence substantial. | Native and current database/device execution missing. | G1, G2, G4; integrations/data owner approval. |
| CAL-QA-17 | BLOCKED | Dashboard customization source and focused tests cover selected interaction/accessibility contracts. | Current native Android/iOS execution, exhaustive real journeys, default restoration, release-artifact/production provenance missing. | G1, G5; dashboard owner and accessibility approval. |
| CAL-QA-18 | BLOCKED | More/Settings navigation, accessibility, busy/retry, and selected interactions have source/focused coverage. | Same native, exhaustive journey, default-restoration, and provenance gaps. | G1, G5; navigation/accessibility owner approval. |
| CAL-QA-19 | BLOCKED | Mission-specific current evidence was not supplied; cluster says store/provider lifecycle evidence is absent. | Store/provider lifecycle evidence absent; commercial enforcement risk remains unresolved pending current retest. | G1, G3, G5; commercial/store owner approval. |
| CAL-QA-20 | PARTIAL | Source/test evidence substantial for integrations-commercial-data cluster. | Missing native and current database/device execution; historical commercial enforcement risk needs current retest. | G1–G4; commercial/data owner approval. |
| CAL-QA-21 | PARTIAL/BLOCKED | Source-level evidence exists. | Production provider, Railway, migration, serving-provenance, and recovery evidence missing. | G1–G5; platform/release owner approval. |
| CAL-QA-22 | UNVERIFIED — not reported | No separate mission-level finding supplied. Backend-security/release cluster provides related bounded controls only. | Mission-specific security evidence and current execution not identified. | G2, G5; security owner approval required. |
| CAL-QA-23 | UNVERIFIED — not reported | No separate mission-level finding supplied. | Mission-specific evidence, recovery/native/provider proof, and owner disposition not identified. | G3–G5; recovery/platform owner approval required. |
| CAL-QA-24 | UNVERIFIED — not reported | No separate mission-level finding supplied. | Mission-specific release/provenance and governance evidence not identified; historical branch-protection removal is unresolved context. | G1, G5; release/governance owner approval required. |
| CAL-QA-25 | UNVERIFIED — not reported | No separate mission-level finding supplied. | Final acceptance evidence and mission-specific criteria not identified; cannot be treated as passed by campaign synthesis. | G1–G5; campaign owner approval required. |

## Cross-campaign evidence gaps

1. **Current runtime evidence:** No supplied cluster established current Android/iOS native execution; several also lack current browser/runtime execution. Historical device/SHA results are explicitly not promoted to current certification.
2. **Production provenance:** Production serving identity/provenance is missing or contradictory across the security/release and recipes/planning findings. Exact current artifact-to-serving reconciliation is required.
3. **Authentication and tenancy:** Provider-auth flows, authenticated production journeys, production roles/migrations, RLS, and API-wide non-BYPASSRLS tenant isolation are not proven.
4. **Persistence and synchronization:** Authenticated database-backed writes/reads, recovery, cross-device synchronization, and production-grade persistence evidence are missing in affected clusters. Device-local persistence is specifically a risk for planner/saved state.
5. **Live integrations/providers:** Food/provider, camera, microphone, Health Connect/HealthKit, store/provider lifecycle, commercial enforcement, Railway, and recovery evidence remain absent where called out.
6. **Accessibility and device matrix:** Current device/accessibility evidence is missing for affected missions; exhaustive real journeys and default restoration are not demonstrated for customization/interactions.
7. **Known risks requiring retest or owner disposition:** Smart Scan historical camera stall; Coach staged-RLS rate-limit access boundary; planner unconditional save-success feedback; device-local planner/saved state; recipe portion consistency; historical commercial enforcement risk; and historically removed branch protections.
8. **Mission traceability:** The supplied summaries do not provide separate mission-level evidence for CAL-QA-22 through CAL-QA-25. Those IDs remain unverified rather than being mapped by inference.

## Owner approvals required before any PASS claim

The supplied material does not identify named owners or record approvals. Before certification, obtain explicit approvals from the accountable owners for: authentication/onboarding; nutrition/capture/provider integrations; recipes/planning; Coach/progress/wellness and health providers; dashboard/navigation/accessibility; commercial/store/data; platform/production/ Railway; security/RLS; recovery; and release governance/campaign acceptance. Each approval should reference the exact current SHA/build, evidence links, residual risks, and disposition of blockers. Absence of a named approval in this index is an evidence gap, not evidence that approval exists.

## Blocking conclusion

No mission should be promoted to PASS solely from this discovery synthesis. The campaign can advance only after the dependency gates are executed on the current artifacts and the missing evidence is attached. In particular, reconcile serving provenance and production controls first, then prove authentication/tenant isolation and current native/live-provider behavior, followed by persistence/recovery and commercial/release governance. Until then, CALORA remains **campaign-wide PARTIAL/BLOCKED with no established current defect but no full certification**.
