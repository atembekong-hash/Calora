# Calora Certification Evidence Index

**Assessment date:** 2026-11-07  
**Tested commit:** `9e7790cffb0cbf8062d1fa1986be6e71b76ff5161`  
**Repository:** `/home/ubuntu/calora-coach-live-main`  
**Final verdict:** **NOT CERTIFIED — BLOCKED**

This index distinguishes current evidence from historical context. A historical artifact is not current certification evidence unless it explicitly covers the tested commit and release candidate.

| Evidence ID | Domain | Current evidence / method | Result or boundary |
|---|---|---|---|
| E-01 | Product | `areas/01-product.md`; route/layout and focused screen tests | 11 PASS; authenticated and native/device gaps remain. |
| E-02 | Product contracts | `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md`, API route/OpenAPI review | FAIL: legacy/orphan paths are misleading. |
| E-03 | Android | `areas/02-android.md`; `app.json`, `eas.json`, health and scan tests; source inspection | Static controls PASS; no current signed RC. |
| E-04 | Android lab | `docs/qa/CALORA_PHYSICAL_ANDROID_QA_LAB_REPORT_V2.md` | Historical/narrow S20 evidence retained; Auto camera defect remains; not broad certification. |
| E-05 | iOS | `areas/03-ios.md`; preflight scripts and `node --test` result | 31 PASS / 6 FAIL; no current IPA/ASC/device proof. |
| E-06 | Backend | `areas/04-backend.md`; API source, migration files, integration gates, workflows | Application controls PASS; live DB boundary and recovery not verified. |
| E-07 | Database security | `docs/CALORA_INTELLIGENCE_SUPABASE_SECURITY_REPORT.md`; migrations 0001–0020 | Supabase has no Calora tables; customer managed-Postgres RLS/equivalent is FAIL/BLOCKED. |
| E-08 | Calculations | `areas/05-calculations.md`; 12 focused files / 165 tests | 165 PASS; recommendation validation defect and live/native gaps remain. |
| E-09 | Coach AI | `areas/06-ai.md`; API 60/60 and client 146/146 focused tests | Current code contracts PASS; production provider/retention/ops and authenticated runtime blocked. |
| E-10 | Recipes/media | `areas/07-recipes.md`; mobile 15 files / 143 tests; API 99 PASS plus 24 DB-gated | Mobile reliability PASS; DB-backed persistence and live generation blocked/not run. |
| E-11 | Commercial | `areas/08-commercial.md`; RevenueCat source/tests, store metadata/checklists | Source controls present; lifecycle/store/support proof absent; billing certification historically NOT CERTIFIED. |
| E-12 | Historical boundary | `230_CALORA_FINAL_ANDROID_IOS_TESTFLIGHT_AND_PRODUCTION_CERTIFICATION_REPORT.md`, `231_...`, `216_...`, `209_...`, `210_...` | Retained for context only; older commits/APKs or explicit blocks prevent promotion to current PASS. |
| E-13 | Baseline | `git rev-parse HEAD`, `git status --short --branch`, latest commit metadata | Exact tested commit confirmed; worktree clean. |
| E-14 | Audit quality | Supplied audit failures list | 0 audit failures; sandbox wrapper blocked some fresh commands, recorded as BLOCKED/NOT RUN rather than PASS. |

## Domain report links

- [01 Product](areas/01-product.md)
- [02 Android](areas/02-android.md)
- [03 iOS](areas/03-ios.md)
- [04 Backend](areas/04-backend.md)
- [05 Calculations](areas/05-calculations.md)
- [06 AI](areas/06-ai.md)
- [07 Recipes](areas/07-recipes.md)
- [08 Commercial](areas/08-commercial.md)

## Evidence handling notes

- Source inspection and focused tests are evidence of bounded implementation behavior, not proof of production deployment or store acceptance.
- Physical-device, signed-build, authenticated, database-backed, provider, accessibility, and operational claims require direct current evidence.
- No mandatory control was marked NOT APPLICABLE; unavailable evidence remains BLOCKED or NOT RUN.
