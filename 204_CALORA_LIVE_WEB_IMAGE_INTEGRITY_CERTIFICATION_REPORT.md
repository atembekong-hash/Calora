# 204 — Calora Live Web Image Integrity Certification Report

**Date:** 2026-10-13  
**Environment:** Authenticated My Browser session, deployed Calora web application  
**Production URL:** https://app.mycaloraapp.com/  
**API health URL:** https://mycaloraapp.com/health  
**Release identity URL:** https://mycaloraapp.com/api/version  
**Native builds:** Not triggered, per project rule.

## 1. Executive result

**Web image-integrity certification: PASS for the accessible authenticated web surfaces, with explicit BLOCKED/NOT TESTED boundaries below.**

The live browser pass found no reproducible wrong-food-image association on the accessible recipe and planner surfaces. Rendered recipe images matched their visible labels in the tested examples, and the application showed safe empty/unavailable states rather than unrelated food photography where data was unavailable.

The image-integrity remediation is live in production. The deployed release reports the same protected-main commit as the merged remediation PR:

- **PR:** #164 — https://github.com/atembekong-hash/Calora/pull/164
- **Merge commit:** `aa998dbb8f0c551bd96ae379f5e9ba9b0ea492e6`
- **Live `/api/version` commit:** `aa998dbb8f0c551bd96ae379f5e9ba9b0ea492e6`
- **Release ID:** `calora-api-aa998dbb8f0c-20261013084917839`
- **Live build timestamp:** `2026-10-13T08:49:17.839Z`

## 2. Production health evidence

Read-only checks completed successfully:

| Check | Result |
|---|---|
| `https://mycaloraapp.com/health` | HTTP 200, `{"status":"ok"}` |
| `https://mycaloraapp.com/api/healthz` | HTTP 200, `{"status":"ok"}` |
| `https://mycaloraapp.com/api/version` | HTTP 200; live commit matches protected main and PR #164 |
| Git worktree | Clean after verification |
| Native build/release | Not run |

A public unauthenticated request to `https://mycaloraapp.com/api/v1/recipes?limit=8&offset=0` returned HTTP-successful JSON with zero items. This is treated as an anonymous/API-scope limitation, not as evidence that authenticated recipe imagery is broken; the authenticated browser rendered the recipe catalogue successfully.

## 3. Live browser surface results

### 3.1 Dashboard / Today — PASS (accessible image surfaces)

Observed in the authenticated browser:

- Dashboard loaded normally.
- The Today recipe strip rendered named recipe cards with nutrition and detail affordances.
- No unrelated food image or broken-image marker was observed in the visible dashboard state.
- Empty diary state remained explicit: “No meals yet,” rather than showing a fabricated meal image.
- Generic wellness/dashboard artwork was not treated as food evidence.

### 3.2 Discover recipes — PASS

The live Recipes → Discover surface rendered **46 recipes to explore**. The visible cards showed food-specific imagery and matching labels.

Direct visual checks:

1. **Overnight oats with berries** — rendered image showed a bowl of fruit/oats; opened detail retained the same image and title.
2. **Eggs on sourdough** — rendered image showed eggs on toast/greens; opened detail retained the same image and title.

The detail sheet showed:

- Recipe title matching the selected card.
- Food image matching the title.
- Nutrition summary.
- The expandable “Nutrition details” control.
- No “View original” control exposed in the tested Discover detail.

The browser also demonstrated that multiple cards use distinct, food-relevant imagery rather than one universal fallback image.

### 3.3 Discover recipe detail — PASS for visible portion; preparation-scroll verification limited

The visible detail viewport rendered the correct image, recipe title, cuisine/meal context, and nutrition summary without clipping. The browser automation route could not identify the nested native-style detail-sheet scroll container, so the below-the-fold preparation-method section was **not independently browser-scrolled in this pass**.

This remains covered by the committed automated recipe-method regressions and the previously deployed preparation-method remediation, but is recorded separately from live visual evidence.

### 3.4 Plus — BLOCKED by account entitlement in this browser session

The authenticated browser displayed:

> Sign in for Plus recipes  
> Plus sources require sign-in.

No Plus recipe image payload was available to inspect in this session. This is an access/entitlement boundary, not an observed image mismatch. A signed-in account with active Plus entitlement is required for live Plus image certification.

### 3.5 Create — NOT TESTED for generated image creation

The Create surface loaded successfully and exposed the AI Recipe Creator, ingredient choices, style choices, and “Generate 5 ideas.” No generation was submitted because doing so would create account/local recipe data and requires a controlled test fixture.

The deployed implementation and automated lifecycle tests cover generated-image lifecycle, persistence, stale-attempt protection, review gating, and fail-closed rendering. Live browser generation remains **NOT TESTED** in this pass.

### 3.6 Planner — PASS for visible meal imagery

The live Planner rendered planned meals with matching labels and nutrition:

- Overnight oats with berries
- Salmon quinoa bowl
- Herby chicken rice plate
- Hummus with veggie sticks
- Eggs on sourdough
- Lemon lentil soup
- Thai green curry
- Banana with peanut butter

No unrelated image association or generic fallback food photo was observed in the visible planner state. The planner’s empty/unavailable states remained explicit where data was unavailable.

### 3.7 Progress / Trends — PASS (no food-image surface exposed)

Progress Overview and Trends loaded. The live date-range picker supported periods beyond one week; selecting **30 days** changed the graph range to **Sep 14–Oct 13, 2026** and the graphs rendered the selected-period state.

No food-image defect was present on this surface. Health-sync-unavailable and no-data states were explicit rather than populated with fabricated imagery.

### 3.8 Scan — BLOCKED for live camera capture in browser

The Scan surface loaded and exposed:

- Live camera access prompt.
- Type it.
- Voice.
- Receipt.

The browser session could not provide a physical camera stream or complete an actual barcode/food capture. Therefore live web verification of camera-generated food images, barcode images, and post-analysis review imagery is **BLOCKED**. This is expected for a browser certification route without a camera/device fixture and does not replace Android/iOS validation.

### 3.9 Restaurants — NOT TESTED as an independent live route

Direct navigation to `/restaurants` redirected to the main app route in this web session. The restaurant entry point is reachable from Scan, but the camera/route access limitation prevented a complete independent restaurant-product image journey. Existing automated restaurant provenance tests and the deployed fail-closed remediation remain the evidence for this surface.

### 3.10 Coach — PASS for image safety boundary

Coach opened successfully. The live surface was text-only in the tested state and did not expose any food-image response or unrelated image. Guest/personal-context messaging rendered normally.

### 3.11 Favorites / saved recipes — NOT TESTED independently

The saved-recipes control was present in the Recipes header, but a separate saved-recipe collection was not opened during this pass. The tested Discover image identity was stable on opening detail, which is relevant to persistence, but does not certify the entire Favorites collection.

## 4. Remediation evidence carried into this certification

PR #164 and the permanent report `203_CALORA_COMPLETE_IMAGE_INTEGRITY_REMEDIATION_REPORT.md` implemented and tested the following safeguards:

- Fail-closed rendering when food-image evidence is missing or unverified.
- Removal of generic food-photo fallbacks from diary thumbnails.
- Exact barcode identity enforcement before accepting provider matches.
- Accepted/review-gated generated recipe media before signed URL issuance.
- Attempt-bound generated-media state transitions to prevent stale completions overwriting newer attempts.
- Review-gated generated-image refresh behavior.
- Accepted generated planner media required before retaining diary image evidence.
- Expired/invalid locators rejected before rendering.
- Existing user data preserved; no destructive data migration was performed.

## 5. Defects found during live web testing

**No new reproducible image-integrity defect was found on the accessible authenticated web surfaces.**

Observed boundaries were classified rather than patched:

1. **Plus unavailable in this browser account/session** — entitlement/access limitation.
2. **Camera capture unavailable in browser** — physical camera/device limitation.
3. **Public anonymous recipe API returned zero items** — authenticated/scope limitation; authenticated web UI rendered the catalogue successfully.
4. **Nested recipe-detail sheet could not be scrolled by the browser automation route** — tooling limitation; below-fold live visual evidence is incomplete.

## 6. Certification matrix

| Surface | Result | Evidence boundary |
|---|---|---|
| Dashboard / Today | PASS | Live authenticated browser |
| Diary thumbnails / empty state | PASS | Live empty-state observation; automated fail-closed tests |
| Discover catalogue | PASS | Live rendered cards and visual label/image comparison |
| Discover detail | PASS | Two live opened details; matching images and titles |
| Discover preparation below fold | NOT TESTED live | Automated regressions pass; browser sheet scroll unavailable |
| Plus | BLOCKED | Active Plus entitlement unavailable in session |
| Create generated image | NOT TESTED | No generation submitted; lifecycle tests cover safeguards |
| Planner | PASS | Live planned meals and matching visible labels |
| Progress / Trends | PASS | Live tabs and 30-day range selection |
| Scan camera images | BLOCKED | Browser camera stream unavailable |
| Barcode image/result | BLOCKED | Requires camera/device or controlled fixture |
| Restaurants | NOT TESTED | Direct route redirected; Scan route blocked by camera boundary |
| Coach | PASS | Live text-only surface; no unsafe image surface exposed |
| Favorites / saved recipes | NOT TESTED | Collection not independently opened |
| Production health/revision | PASS | HTTP 200 checks and exact commit match |
| Android/iOS image behavior | NOT TESTED | No native build or physical-device run authorized |

## 7. Final verdict

**Engineering and production deployment:** PASS.  
**Accessible live web image surfaces:** PASS.  
**Complete all-surface image certification:** BLOCKED/NOT TESTED only where explicitly listed above.

No mobile build was triggered. The remaining evidence required for full certification is a controlled Plus-entitled browser session, a generated Create-recipe fixture, independent Favorites/Restaurants navigation, and physical Android/iOS camera validation for Auto, Barcode, Food, Library, Label, and Restaurant capture flows.
