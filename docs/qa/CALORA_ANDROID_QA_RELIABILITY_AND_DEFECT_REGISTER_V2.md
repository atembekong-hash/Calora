# Calora Android QA Reliability and Defect Register V2

## Bounded reliability plan

Run these checks only on an approved disposable device and controlled account. Keep each run short and retain the timestamped evidence directory.

| Check | Procedure | Evidence | Outcome rule |
|---|---|---|---|
| Repeated navigation | Open Today → Recipes → Progress → More → Today five times | Screen captures, `qa-results.json` | FAIL on crash, dead-end, or persistent loading |
| Background/foreground | Background for 30–60 seconds during Today and Recipes, then restore | Timestamped screen and logcat | BLOCKED if lifecycle automation is unavailable |
| Session persistence | Restart app after authenticated navigation | Auth state and route evidence | Never use production/customer account |
| Intermittent scrolling | Repeat Discover and Plus scrolling at least 10 times with the same fixture | Scroll evidence, request/log notes | Do not call fixed after one successful scroll |
| Network recovery | Use an approved controllable test environment to interrupt and restore connectivity | Error/recovery screenshots and logs | BLOCKED without isolated non-production controls |
| Memory/startup | Level 1 performance snapshot plus bounded cold-start timing | `performance.txt`, timestamp | Compare only like-for-like device/build |
| Crash/ANR | Level 1 crash scanner before and after the bounded flow | `crash-scan.txt` | Calora marker = FAIL; ambiguous marker = NOT RUN |
| Duplicate API requests | Use existing client telemetry/tests for repeated navigation and session restoration | Test report and request count | Requires isolated instrumentation; not inferred from UI success |
| Loading states | Capture initial, empty, error, and recovered list states | Screenshots and logs | FAIL on indefinite loading or clipped recovery UI |

## Defect register

| ID | Area | Severity | Reproduction/evidence | Confirmed cause | Status |
|---|---|---:|---|---|---|
| QA-ANDROID-001 | Windows discovery | Medium | PR #387 owner-side discovery failure | Inventory facts lacked serialized `state` under strict mode | Resolved and merged |
| QA-ANDROID-002 | Safety regression harness | High | PR #387 false positive on `ADB_NOT_FOUND: install...` | Broad text regex matched harmless text | Resolved with PowerShell AST and merged |
| QA-ANDROID-003 | PowerShell AST diagnostics | Medium | PR #387 `.line` failure | `$matches` collided with automatic `$Matches` | Resolved with `$findings` and safe property access |
| QA-ANDROID-004 | Collection package path | Medium | S20 collection `.Count` failure | Single native output unwrapped to scalar | Resolved with `@(...)` and merged |
| QA-ANDROID-005 | Crash attribution/deduplication | High | PRs #388–#390 fixtures and owner evidence | Companion AndroidRuntime lines counted; fixture mislabeled explicit ANR process as unknown | Resolved; primary event matching and corrected regression contracts |
| QA-ANDROID-006 | Smoke launch binding | High | S20 evidence reported `args: [-p, package, 1]` | PowerShell 5.1 native executable binder mishandled tail arguments | Resolved with typed arguments plus `ProcessStartInfo`; owner evidence later confirmed smoke PASS |
| QA-ANDROID-007 | Secondary device certification | Medium | S21 not currently evidenced | Physical availability/authorization unknown | Open / BLOCKED |
| QA-ANDROID-008 | Full feature certification | Medium | No complete owner evidence package supplied | Requires repeated physical interaction, visual, and lifecycle sessions | Open / NOT RUN |
| QA-ANDROID-009 | Camera/scan certification | Medium | Camera requires physical permission and lens | Cannot run in sandbox | Open / BLOCKED |
| QA-ANDROID-010 | Network interruption recovery | Medium | Requires controllable isolated network | No approved isolated interruption environment | Open / BLOCKED |

## Reporting rule

Do not mark an unresolved item PASS because a script completed. Report the narrowest verified scope and preserve the evidence path privately on the Windows PC.
