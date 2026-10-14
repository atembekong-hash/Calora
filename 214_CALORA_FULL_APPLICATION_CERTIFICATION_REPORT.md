# Report 214 — Calora Full Application Certification Report

**Date:** 2026-10-14  
**Certification boundary:** real production web where accessible, deterministic UI/API tests, public API contracts, and prior authenticated/live evidence. Native builds and physical-device certification remain prohibited unless explicitly authorized.

## Executive verdict

**Application certification: PASS for all executable and authorized checks; PARTIAL overall because authenticated Plus/Create/Restaurant/persistence and native hardware journeys remain externally blocked.** No claim of 100% certification is made.

## 1. Automated validation

| Suite | Result | Boundary |
|---|---:|---|
| Calora UI/web suite | **1,736 / 1,736 passed; 156 files** | Deterministic component/screen and web-support coverage |
| API offline suite | **503 / 503 passed; 41 files** | No production DB/provider contact; loopback placeholder DB/OpenAI values |
| Repository scripts/release contracts | **88 / 88 passed** | Safety, attestation, release, provider, and workflow contract tests |
| Repository TypeScript | **PASS** | Workspace libraries, API, Calora, integrations, and scripts |
| Isolated public-pages reproduction | **16 / 16 passed in each of 3 runs** | Confirms the earlier timeout was contention/flakiness |
| Git diff integrity | **PASS** | No whitespace corruption in the source baseline |

The initial API run reported 502/503 because `public-pages.test.ts` exceeded its 5-second default while the UI, API, scripts, and typecheck jobs were running concurrently. The test passed three isolated runs, and a serial full API rerun passed 503/503 in 6.73 seconds. The timeout was not converted into a source or test-policy change.

## 2. Production and public API validation

| Workflow | Evidence | Result |
|---|---|---|
| Web health | `/health` HTTP 200 with `status: ok` | PASS |
| API readiness | `/api/healthz` HTTP 200 with `status: ok` | PASS |
| Release identity | `/api/version` reports protected commit `e7c98edd...` | PASS |
| Unauthenticated Plus gate | `/api/v1/premium-recipes?limit=1` → HTTP 401 | PASS security boundary |
| Unauthenticated Restaurant gate | `/api/v1/restaurant-foods?...` → HTTP 401 | PASS security boundary |
| Unauthenticated Profile gate | `/api/v1/profile` → HTTP 401 | PASS security boundary |
| Discover/bundled recipes | Prior live browser evidence, including saved-recipe reopen | PASS |
| Saved bundled recipe restoration | Same title/image/ingredients/method/nutrition after close/reopen | PASS |
| Food image fail-closed policy | Automated provenance/image suites and live public image inspection | PASS executable scope |

## 3. Accessible user journeys

### PASS

- Today/dashboard rendering and whole-number presentation in available web scope.
- Discover recipe rendering, rotation, preparation methods, recipe details, and two-row suggestions.
- Saved bundled recipe close/reopen restoration after PR #167.
- Plan week navigation and visible content retention in the live browser.
- Progress date-range picker and macro/calorie trend coverage in web/regression scope.
- Coach guest entry, new-chat control, triple-line menu, input, and suggestions.
- Scan web surface and bottom-tab labels.
- Public legal/support pages, SEO/social assets, and site manifests.
- Authentication/security gates for unauthenticated requests.

### PARTIAL/BLOCKED

- Plus authenticated recipe catalogue/detail/image identity: valid authorized entitlement unavailable.
- Create authenticated generation → image lifecycle → save → reopen → refresh: valid QA identity unavailable.
- Restaurants populated search/detail/product-image provenance: authenticated provider context unavailable.
- Coach account-scoped history/delete/copy: signed-in conversation unavailable.
- Planner → Today and Diary cross-session persistence: no authorized account mutation performed.
- Auto, Barcode, Library, Voice, and camera background/resume: browser cannot supply native hardware.
- Native Plan swipe physics, native feed scrolling, and mobile keyboard behavior: no authorized native execution route.
- iOS device/simulator workflows: unavailable in the current Linux environment.

## 4. Safety and integrity

- No security, payment, subscription, entitlement, or authentication control was bypassed.
- No real customer record was created or changed.
- No native build or store submission was run.
- No unrelated photograph was accepted as verified food/restaurant imagery.
- No production database migration or destructive operation was executed.

## 5. Final certification conclusion

Calora is **production-healthy and regression-green for the executable web/API/source scope**, with the image fail-closed rule preserved. It is **not fully independently certified across all real-user surfaces** until an authorized QA identity/Plus Test Store fixture and stable native device execution are available.
