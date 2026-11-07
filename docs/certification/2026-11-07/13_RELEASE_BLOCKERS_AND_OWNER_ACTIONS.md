# Calora Release Blockers and Owner Actions

**Tested commit:** `9e7790cffb0cbf8062d1fa1986be6e71b76ff5161`  
**Decision:** **NOT CERTIFIED — BLOCKED**  
**Rule:** Every critical blocker below must be closed with current, release-candidate-specific evidence. Historical reports may explain context but cannot close a gate when tied to an older commit, older binary, or unavailable production console.

| Priority | Blocker IDs | Owner | Required action / acceptance evidence |
|---|---|---|---|
| P0 | CAL-15, CAL-16, CAL-17 | Backend lead, DBA, SRE | Identify the actual managed-PostgreSQL production boundary; provide current roles/grants, tenant-isolation proof (DB RLS or formally reviewed equivalent), migration journal, storage policy, observability/alerts, and execute a documented rollback plus database/storage restore drill. |
| P0 | CAL-07, CAL-06 | Android release lead | Fix Auto Scan route/resume startup; build and install a signed RC from the tested commit; capture repeatable cold/warm/resume camera evidence and crash/log results on supported Android devices. |
| P0 | CAL-12, CAL-11 | iOS release lead | Correct the six iOS signing-evidence failures, resolve build-number fixture gating, produce current IPA/signing provenance, and provide App Store Connect processing plus tester/install evidence for the same RC. |
| P0 | CAL-27, CAL-28 | Revenue/Payments owner | Close the documented paid-benefit enforcement gap; prove purchase, restore, renewal, expiration, grace/retry, cancellation, refund, revocation, cross-device restore, and account-switch behavior in current sandbox/store evidence. |
| P0 | CAL-02 | API + Product owner | Remove, route, or explicitly deprecate legacy `/v1/coach/respond` and orphan privacy export/delete OpenAPI operations; regenerate contract checks and prove no misleading runtime-only paths remain. |
| P0 | CAL-03, CAL-22, CAL-23 | AI + Mobile + Privacy | Run authenticated Coach persistence, deletion, copy, retention, provider, cost, and production-schema checks. Document active `/v1/coach/v2/chat` provenance; do not count dormant Fact Context tests as activation evidence. |
| P1 | CAL-08, CAL-09, CAL-13, CAL-30 | QA lead + platform leads | Execute physical Android/iOS matrix: Health Connect/HealthKit permissions/data, camera/mic, notifications, lifecycle, offline recovery, TalkBack/VoiceOver, Dynamic Type/large fonts, keyboard, reduced motion, deletion and purchase-sheet accessibility. |
| P1 | CAL-19 | Nutrition engineering | Add direct recommendation tests and enforce finite, positive, bounded weight inputs and bounded outputs; re-run focused suite and review edge cases. |
| P1 | CAL-20 | Nutrition + QA | Independently verify live barcode-provider serving metadata/manufacturer selection; run authenticated sync, native health, timezone/DST and offline/reconnect acceptance. |
| P1 | CAL-25, CAL-26 | Recipes + Backend | Supply authorized `DATABASE_URL`/test database, run blocked API persistence tests, and execute authenticated Plus/provider and live generated-media review/accept/regenerate flows on the RC. |
| P1 | CAL-04 | Mobile QA | Execute the missing product interaction matrix and capture evidence for native camera/barcode/voice/library, permissions, notifications, swipe physics, large fonts, screen reader and reduced motion. |
| P1 | CAL-29 | Compliance + Support | Finalize current App Store/Google Play console records, signed-build metadata, reviewer access, Data Safety, licenses, support mailbox delivery/reply/escalation and privacy/legal submission evidence. |

## Closure protocol

1. Owners attach immutable evidence to the evidence index with commit/build ID, timestamp, device/provider/environment, method, and outcome.
2. A reducer re-runs the affected stable IDs; PASS is granted only when the evidence is current and directly addresses the blocker.
3. Any regression, missing credential, or stale artifact reopens the blocker and keeps the verdict **NOT CERTIFIED — BLOCKED**.
4. Release approval requires zero unresolved P0/P1 mandatory blockers and a fresh master report for the exact production candidate.
