# 0. Master Validation Ledger

**Baseline:** PR #312 protected-main commit `b5b994cb85a6f30f49232a3a53e4737f0be8cdb4`.

| Area | PASS | FAIL | BLOCKED | NOT TESTED | Total |
|---|---:|---:|---:|---:|---:|
| Authentication, onboarding, consent, registration, recovery, session, logout | 9 | 0 | 1 | 0 | 10 |
| Today dashboard, nutrition, calories, macros, burned energy, health, insights | 13 | 0 | 0 | 0 | 13 |
| Camera scanning | 1 | 0 | 8 | 1 | 10 |
| Voice logging, manual food, diary edit/delete/history/sync/offline | 7 | 0 | 1 | 0 | 8 |
| Recipes Discover, Plus, Create, details, images, saved meals, pagination, caching | 20 | 0 | 0 | 1 | 21 |
| Restaurant search, menus, nutrition, imagery, logging | 8 | 0 | 0 | 1 | 9 |
| Planner programs, previews, selection, generation, regeneration, persistence | 6 | 0 | 1 | 0 | 7 |
| Progress, trends, measurements, goals, historical records, deep links | 10 | 0 | 0 | 1 | 11 |
| Profile, Settings, Account, Notifications, privacy, export, support, navigation | 12 | 1 | 0 | 0 | 13 |
| Membership trial, offerings, entitlements, restore/cancel, referrals | 8 | 0 | 0 | 1 | 9 |
| Android/iOS readiness and native coverage | 7 | 0 | 5 | 3 | 15 |
| Resilience and security | 10 | 0 | 1 | 2 | 13 |
| **TOTAL** | **111** | **1** | **17** | **11** | **140** |

## Confirmed defect disposition

The single FAIL was the missing mobile Settings access path for the already-supported authenticated privacy-rights request API. PR #313 repairs this gap with a single Settings-owned component and focused tests. The 17 BLOCKED and 11 NOT TESTED results are retained honestly; they are not promoted to PASS without native, provider, database, or exact-baseline evidence.
