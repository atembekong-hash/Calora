# Calora Authoritative Certification Register

**Assessment date:** 2026-11-07  
**Tested commit:** `a129ee316d6b4ddd4b8f52098f0af8fb05aee8df` (PR #394; source-level remediation branch)
**Platform:** Android, iOS, backend/database, mobile/web product, AI, nutrition, recipes/media, commercial operations  
**Verdict:** **NOT CERTIFIED — BLOCKED**

Status meanings: **PASS** = evidence supports the bounded control at the tested commit; **FAIL** = adverse defect or failed test; **BLOCKED** = mandatory evidence could not be independently obtained; **NOT RUN** = the activity was not executed; **NOT APPLICABLE** = deliberately excluded with rationale (none used for mandatory gates). Historical evidence is labeled stale when tied to older commits or artifacts.

| Stable ID | Platform / risk | Method | Evidence | Owner | Status | Blocker / interpretation |
|---|---|---|---|---|---|---|
| CAL-01 | Product / high | Source and focused UI-test review | `areas/01-product.md`; route/layout and screen tests | Product + Mobile | PASS | Core five-tab and secondary-route contracts are coherent at source level. |
| CAL-02 | Product / high | Contract-integrity forensic review | `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md` | API + Product | FAIL | Legacy `/v1/coach/respond` and orphan privacy export/delete OpenAPI paths mislead; remove, route, or document intentionally. |
| CAL-03 | Product / high | Authenticated runtime flow | `areas/01-product.md` | Mobile + QA | BLOCKED | Signed-in Coach persistence, per-chat deletion, and copy require authorized account/runtime. |
| CAL-04 | Product / high | Physical/native interaction matrix | `areas/01-product.md` | QA | NOT RUN | Camera/barcode/voice/library, permissions, notifications, swipe physics, large fonts, screen reader, reduced motion unavailable. |
| CAL-05 | Android / critical | Source/config/preflight review | `areas/02-android.md`; `app.json`, `eas.json`, health tests | Android Release | PASS | Static configuration and QA infrastructure are prepared. |
| CAL-06 | Android / critical | Physical Auto Scan route/resume observation | `docs/qa/CALORA_PHYSICAL_ANDROID_QA_LAB_REPORT_V2.md`; `16_REMEDIATION_UPDATE.md` | Android + QA | BLOCKED | PR #394 adds bounded camera remount, timeout, and retry recovery at source level; physical verification on a fresh authorized binary remains required. |
| CAL-07 | Android / critical | Current signed RC install/build | `areas/02-android.md` | Android Release | BLOCKED | No protected-main signed Android release candidate built/installed; older APK evidence stale. |
| CAL-08 | Android / critical | Health Connect provider/device matrix | `areas/02-android.md` | Android + Health | NOT RUN | Authorization/data and real-time steps evidence absent. |
| CAL-09 | Android / high | Native accessibility/device matrix | `areas/02-android.md` | QA | NOT RUN | TalkBack, large-font/keyboard, lifecycle, recovery, secondary device absent. |
| CAL-10 | iOS / critical | Static iOS source/config review | `areas/03-ios.md`; `app.json`, `eas.json`, health/notification/RevenueCat code | iOS Release | PASS | Source-level controls are materially present. |
| CAL-11 | iOS / critical | Native preflight test | `areas/03-ios.md`; PR #394 remediation; 37 pass / 0 fail | iOS Release | PASS | Repository preflight and sanitized signing-evidence fixture contracts pass; this does not certify Apple credentials or a signed IPA. |
| CAL-12 | iOS / critical | Signing, ASC, signed artifact provenance | Historical 230/26 reports; current `areas/03-ios.md` | iOS Release | BLOCKED | No current IPA, signing record, ASC processing/tester proof; historical claims stale. |
| CAL-13 | iOS / high | Physical device/simulator acceptance | `areas/03-ios.md` | QA | NOT RUN | HealthKit, prompts, StoreKit, lifecycle, VoiceOver, Dynamic Type absent. |
| CAL-14 | Backend / critical | Application auth/rate-limit/readiness source review | `areas/04-backend.md`; API tests and workflows | Backend | PASS | Strong application-level controls are evidenced at source level. |
| CAL-15 | Backend / critical | Customer-data isolation review | `CALORA_INTELLIGENCE_SUPABASE_SECURITY_REPORT.md`; migrations | Backend/DB Security | FAIL | Customer data is managed PostgreSQL; no independently verified DB RLS/equivalent boundary. Supabase inspected project has no Calora tables. |
| CAL-16 | Backend / critical | Live deployment/roles/observability review | `areas/04-backend.md`; historical Railway reports | Platform/DBA | BLOCKED | Current Railway identity, env, grants, migrations, storage, alerts not inspected; historical evidence stale. |
| CAL-17 | Backend / critical | Rollback/restore drill | `areas/04-backend.md` | SRE/DBA | NOT RUN | No current production rollback, DB restore, storage restore, or recovery drill. |
| CAL-18 | Calculations / high | Focused deterministic suite | `areas/05-calculations.md`; 12 files / 165 tests passed | Nutrition Engineering | PASS | Core macro, serving, dates, fasting, health-day, progress, sync contracts pass. |
| CAL-19 | Calculations / high | Recommendation input-boundary review | `calorieRecommendation.ts`; `profileTargets.test.ts` | Nutrition Engineering | PASS | PR #394 rejects non-finite and out-of-range weights (25–350 kg), and fails closed for non-finite/non-positive results; valid calculation vector remains covered. |
| CAL-20 | Calculations / high | Provider/device/production sync acceptance | `areas/05-calculations.md` | Nutrition + QA | BLOCKED | Live barcode serving metadata, authenticated sync, native health, timezone/DST and offline flows unavailable. |
| CAL-21 | Coach / critical | API/client focused suites | `areas/06-ai.md`; API 60/60, client 146/146 | AI + Mobile | PASS | Current bounded Coach v2 safety and separation contracts pass. |
| CAL-22 | Coach / critical | Active-route provenance review | `coach.tsx`, `coachV2.ts`, Fact Context routes | AI + Product | BLOCKED | Active path is `/v1/coach/v2/chat`; dormant Fact Context route is not production activation evidence. |
| CAL-23 | Coach / critical | Production retention/cost/provider/ops proof | `areas/06-ai.md` | AI Ops + Privacy | BLOCKED | Production schema/provider/retention/cost/latency and device/ops evidence absent. |
| CAL-24 | Recipes / high | Mobile reliability suite | `areas/07-recipes.md`; 15 files / 143 tests passed | Recipes + Mobile | PASS | Pagination, cache, image identity, lifecycle and saved restoration controls pass. |
| CAL-25 | Recipes / high | API/database media suite | `areas/07-recipes.md`; 99 pass, 24 DB-gated | Backend + Recipes | BLOCKED | Missing `DATABASE_URL`; persistence, authenticated Plus/provider and live generation not certified. |
| CAL-26 | Recipes / high | Physical/live generation acceptance | `areas/07-recipes.md` | QA + Recipes | NOT RUN | No live generate-review-accept-regenerate or device flow evidenced. |
| CAL-27 | Commercial / critical | Billing source and historical certification review | `calora-payment-billing-entitlements-certification.md`; `areas/08-commercial.md` | Revenue/Payments | FAIL | Committed certification says NOT CERTIFIED FOR LAUNCH and records paid-benefit enforcement gaps. |
| CAL-28 | Commercial / critical | Store purchase lifecycle and restore | `areas/08-commercial.md` | Revenue/QA | BLOCKED | No current purchase, restore, renewal, expiration, retry, cancellation, refund, revocation, cross-device proof. |
| CAL-29 | Commercial / critical | Store/legal/reviewer/support operations | Store metadata/checklists; `areas/08-commercial.md` | Compliance + Support | BLOCKED | Console finalization, signed build, Data Safety, mailbox delivery/SLA and reviewer access unverified. |
| CAL-30 | Commercial / high | Native accessibility and deletion acceptance | `areas/08-commercial.md` | QA + Privacy | NOT RUN | VoiceOver/TalkBack, purchase-sheet accessibility, cancellation settings and deletion on signed builds absent. |

## Roll-up

| Status | Count |
|---|---:|
| PASS | 68 |
| FAIL | 7 |
| BLOCKED | 13 |
| NOT RUN | 13 |
| NOT APPLICABLE | 0 |

Counts above are item-level counts from the eight supplied domain reports; this register preserves the 30 stable control IDs for repeatable re-certification and maps each material gate explicitly.
