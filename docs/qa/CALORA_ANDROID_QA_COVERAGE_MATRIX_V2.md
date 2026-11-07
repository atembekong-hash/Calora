# Calora Android QA Coverage Matrix V2

**Baseline:** protected main `79ecc85d` and verified owner evidence from Samsung Galaxy S20 `SM-G981U`.

This matrix distinguishes source-level automation, prepared local procedures, and owner-executed physical evidence. A checklist or passing script is not itself proof that the application feature passed.

| Area | Current implementation surface | Automated/source coverage | Physical-device procedure | Status |
|---|---|---|---|---|
| Authentication/session restoration | `app/auth/*`, root access gate, encrypted recovery | Client tests and native preflight gates | Level 2/3 with disposable account; background/restore checkpoints | Prepared; physical feature run required |
| Today dashboard | `app/(tabs)/index.tsx` | Dashboard and widget regression tests | Level 2 visual/interaction checkpoints at compact and expanded density | Prepared; physical feature run required |
| Calorie, water, steps, fasting, mood, macros | Today widgets plus `fasting.tsx`, `hydration.tsx`, `steps.tsx` | Focused widget contracts and source tests | Level 2: log/update, navigate away, restart, verify persistence | Prepared; physical feature run required |
| Today's Log and meal editing | Today log and diary synchronization | Diary/client synchronization tests | Level 2 with controlled meals and persistence check | Prepared; physical feature run required |
| Dashboard customization | `dashboard-layout.tsx`, preference migrations | Preference and layout tests | Level 2: reorder, hide/show, compact/expanded, restore defaults | Prepared; physical feature run required |
| Recipes/Discover/Plus | `recipes.tsx`, saved recipes, API recipe routes | Recipe image, pagination, rate-limit, and API tests | Level 2: scroll repeatedly, open detail, save, create, image persistence | Prepared; intermittent scrolling requires repeated evidence |
| Scan inputs | `scan.tsx`, camera and nutrition flows | Scan screen/source contracts | Level 2/3: permission, camera handoff, barcode/label/food image | **BLOCKED** until physical camera session |
| Progress/Trends/Weight/Insights | `insights.tsx`, `progress-insights.tsx` | Progress and Insights source contracts | Level 2: tab navigation, empty states, sync badges, deep link | Prepared; physical feature run required |
| Learning/Coach/Living Memory | `learning.tsx`, `coach.tsx`, `memory.tsx` | Screen and navigation contracts | Level 2: open content, return navigation, persistence | Prepared; physical feature run required |
| More/Settings/Calora Pro | `more.tsx`, `profile.tsx`, `settings.tsx` | More/Profile/source and route contracts | Level 2: theme, onboarding, settings, subscription surface | Prepared; no purchase/submission action |
| Health synchronization | health connection modules and Today/Progress consumers | Privacy and connection policy tests | Level 2/3 with approved health provider and explicit user authorization | **BLOCKED** until approved provider session |
| Background/foreground/network recovery | app lifecycle and sync paths | Source-level resilience tests where present | Level 3 bounded interruption/recovery run | **NOT RUN** in sandbox |
| Performance/crash/ANR | Windows toolkit | Deterministic PowerShell fixture contracts | Level 1 collection on S20; repeat on S21 if available | S20 collection PASS; smoke evidence supplied by owner |
| Native release candidate | `app.json`, EAS/native gates | Native preflight and release-validation checks | Level 3 on signed candidate only | **NOT RUN**; no build authorized |

## Device status

| Device | Role | Discovery | Collection | Smoke | Remaining |
|---|---|---|---|---|---|
| Samsung Galaxy S20 (`SM-G981U`) | `CALORA_PRIMARY_ANDROID` | PASS | PASS | PASS in owner evidence `C:\CaloraEvidence\20261107T144127Z` | Feature, visual, and reliability certification remain separate scopes |
| Samsung Galaxy S21 | `CALORA_SECONDARY_ANDROID` | Not assumed | BLOCKED until connected/authorized | Not run | Owner must run discovery; do not target by model alone |

## Result vocabulary

- **PASS:** The specific check executed and passed.
- **FAIL:** The check executed and found a defect.
- **BLOCKED:** A required device, permission, account, or environment was unavailable.
- **NOT RUN:** Deliberately not executed, usually because it requires an explicit owner opt-in or a release candidate.
