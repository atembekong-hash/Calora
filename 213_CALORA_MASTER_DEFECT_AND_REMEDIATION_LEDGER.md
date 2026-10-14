# Report 213 — Calora Master Defect and Remediation Ledger

**Date:** 2026-10-14  
**Evidence basis:** merged PR history #144–#172, Reports 202–211, current source/tests, protected CI, and live production health.

## Status legend

- **RESOLVED/PASS:** implementation and available validation support the intended outcome.
- **PARTIAL:** supported tests or web evidence pass, but a required platform/account context remains unavailable.
- **BLOCKED:** the workflow could not be executed without an external prerequisite.
- **NOT TESTED:** deliberately not run because the environment or authorization was unavailable.

## Ledger

| Area / defect | Root cause or intended change | Remediation / evidence | Current status |
|---|---|---|---|
| Progress selectable date ranges | Graphs were limited to the original period model | PR #144; UI tests and prior live web picker evidence | RESOLVED/PASS in web/regression scope |
| Progress macro trend | Macro trend was absent from trends section | PR #145; focused UI coverage | RESOLVED/PASS in regression scope |
| Plus transient entitlement outage | Entitlement failure could make Plus appear unavailable | PR #146; entitlement boundary tests | RESOLVED/PASS in automated scope; live Plus content requires authorized entitlement |
| Discover/Plus infinite scroll | Native layout metrics could be invalid or missing | PRs #147–#148; pagination tests and previous stress evidence | RESOLVED/PASS in regression scope; native gesture execution blocked |
| Discover/Plus feed repetition | Feed was reused on reopen | PRs #149–#150; rotation tests | RESOLVED/PASS |
| Discover preparation methods | Bundled recipes lacked usable method steps | PR #151; bundled-recipe tests and live detail evidence | RESOLVED/PASS |
| Scan tab labels | Focused Scan state hid labels | PR #152; navigation tests and live web evidence | RESOLVED/PASS on web/regression; native not independently tested |
| Create image forever-loading | Generated image lifecycle lacked prompt reconciliation/failure handling | PRs #153–#154; lifecycle persistence tests | RESOLVED/PASS in regression; authenticated generation live test blocked |
| Image integrity | Unverified or unrelated images could remain visible | PR #155 and #164; fail-closed validation, metadata/provenance tests, live public-image evidence | RESOLVED/PASS in executable scope |
| Voice capture | Camera-video path was unsuitable for audio transcription | PRs #157–#158; Expo AV/m4a contract tests | RESOLVED/PASS in regression; microphone hardware not tested |
| Auto/Barcode scan fallback | Barcode hints could block photo fallback | PRs #159 and #163; capture tests | RESOLVED/PASS in regression; native camera hardware not tested |
| Plan-to-Today logging | Planned meal acceptance did not refresh diary visibility | PR #160; planner/diary tests | RESOLVED/PASS in regression; live mutation not submitted |
| Official app icon | Icon assets/governance were incomplete | PR #162; packaging/asset tests | RESOLVED/PASS; no native build run |
| Saved bundled recipe restore | Saved bundled IDs were not rehydrated locally | PR #167; live close/reopen evidence and saved screen tests | RESOLVED/PASS |
| Authenticated Plus recipes/images | Requires valid signed-in QA identity and Plus entitlement | Public gate correctly returns 401; no bypass attempted | BLOCKED |
| Authenticated Create image generation/save/reopen | Requires authenticated account and provider-backed generation | Guest concepts pass; authenticated lifecycle not reachable | BLOCKED |
| Restaurants populated imagery/provenance | Requires authenticated provider context and populated result | Fail-closed unauthenticated gate returns 401 | BLOCKED / NOT TESTED for provenance |
| Coach account history/delete/copy | Requires authenticated conversation state | Guest entry/menu/new-chat surface pass; account state unavailable | BLOCKED |
| Planner/Diary real persistence | Requires authenticated account mutation | Fixture tests pass; no production mutation performed | BLOCKED for live user journey |
| Physical Android camera/barcode/audio | Requires authorized Desktop/device route and installed app | Windows Desktop gateway/session route only recently stabilized; no native build authorized | BLOCKED / NOT TESTED |
| iOS physical/simulator workflows | Requires macOS/iOS execution route | Not available in sandbox; no build authorized | BLOCKED / NOT TESTED |

## Defect decision

No new application-source defect was reproducible in the available safe environment. The only transient validation failure was an API `public-pages` test timeout while four large suites ran concurrently. The test passed three isolated repetitions and the full API suite passed 503/503 when rerun alone. This is classified as test-run resource contention, not a production defect; no timeout weakening or source workaround was introduced.
