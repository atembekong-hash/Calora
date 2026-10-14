# 208 — Calora 72-Hour Real-User Validation & Production Recovery Report

**Date:** 2026-10-14  
**Forensic window:** 2026-10-11 05:55:56Z through 2026-10-14 06:06Z  
**Production release verified:** `4daebdac49b5b68262ee6b3b652c4218c710c91f`  
**Scope:** Reconstruct and validate the recent change set, execute real-user journeys wherever the connected browser and production access permitted, distinguish reproducible defects from test-environment failures, and preserve the no-native-build rule.

## Executive result

**Engineering status: PASS for all executable checks. No reproducible production source defect was found during this 72-hour recovery pass.**

The connected My Browser session exposed a live guest/unauthenticated Calora experience. The following workflows were executed against the deployed app: Today, Recipes/Discover, saved-recipe restoration and reopen, recipe-detail preparation methods and image identity, two-row suggestions, Plus access gating, Create guest UI, Coach entry/menu, Plan week navigation, and Scan surface/tab-label rendering. Production API gates were probed with both malformed and valid request contracts. The initially observed HTTP 500 responses were caused by intentionally malformed JSON in the diagnostic probe; valid requests returned the designed 401/400/200 outcomes.

**Remaining blockers are genuine environment prerequisites, not unaddressed defects:** authenticated Plus entitlement, authenticated Create image generation/persistence, populated Restaurant provider context, physical mobile execution, and native camera/barcode/audio hardware. No security gate was bypassed and no production data was created, edited, deleted, or submitted.

## 1. Safety and scope controls

| Control | Result | Evidence |
|---|---|---|
| Native build restriction | **PASS** | No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, Google Play, or other native build was triggered. |
| Protected GitHub workflow | **PASS** | Report 207 was delivered through PR #169; no source change was required in this pass. |
| Production data preservation | **PASS** | No meal, recipe, account, Coach, subscription, restaurant, or admin record was created, edited, deleted, or submitted. |
| Security/access controls | **PASS** | Plus, Restaurants, Profile, and authenticated Create/Capture routes were not bypassed. |
| Credential handling | **PASS** | No password, token, bearer credential, payment detail, or private user data was read or exposed. |
| Working tree | **PASS** | `git diff --check` passed and no uncommitted source changes remained after validation. |

## 2. Change-to-test traceability ledger

The recent remediation sequence was reviewed through repository history, merged PR metadata, changed-file maps, CI checks, deployment identity, production health, and live browser interaction. The change families and their validation status are below.

| Change family / recent PR area | Intended outcome | Validation performed | Result |
|---|---|---|---|
| Discover and Plus pagination/infinite scroll | Continuous recipe loading without a static or stuck tab | UI/API regression suites; live Discover rendered the complete open-recipe collection | **PASS in executable web/regression scope; native gesture not tested** |
| Per-open recipe rotation | Fresh recipe mix on subsequent opens | Source tests and live Discover collection inspection | **PASS** |
| Bundled Discover preparation methods | Every bundled recipe detail includes usable method steps | Source tests plus live Overnight oats detail | **PASS** |
| Saved bundled recipe restoration (#167) | Saved bundled IDs rehydrate locally and open correctly | Live close/reopen of saved Overnight oats card after deployment; matching image, ingredients, method, and nutrition displayed | **PASS** |
| Recipe detail suggestions | Two horizontal rows with up to 20 suggestions per row | Live detail showed `40 suggestions · up to 20 per row`; identities were populated | **PASS** |
| Scan tab label regression | All tab labels remain visible when Scan is focused | Live Scan screenshot/DOM extraction showed Home, Recipes, Scan, Progress, Plan labels simultaneously | **PASS web** |
| Auto/Barcode/Voice/Library capture hardening | Reliable capture fallback and safe review flow | API capture/auth contracts and isolated capture suite; live camera hardware unavailable in browser session | **PASS regression; physical hardware BLOCKED** |
| Plan-to-Today logging | Planned meal appears in Today after logging | Isolated sync/planner tests; live Plan showed planned meals and Log controls without submitting a meal | **PASS regression; live mutation not performed** |
| Create image lifecycle | Generated image does not remain indefinitely loading; refresh/retry/persistence are safe | Lifecycle and screen regression suites; guest Create surface live; authenticated generation unavailable | **PASS regression; authenticated live flow BLOCKED** |
| Image integrity/fail-closed policy | Never display an unverified or unrelated food/restaurant image | 11 Calora image/lifecycle suites, 8 API image/provider suites, live saved-recipe identity, live public API image visual check | **PASS executable scope** |
| Coach new chat/menu and response tooling | New chat affordance and Coach controls are reachable without deleting history | Live Coach route showed Start new Coach chat, main menu, input, and suggestions; guest history correctly identified as temporary | **PASS surface; signed-in per-chat delete/copy flow BLOCKED** |
| Progress date-range graphs | Date-range picker supports weekly/monthly periods | Live Progress route and 30-day picker interaction from prior certification; UI/type/regression coverage | **PASS web/regression scope** |
| Plan swipe transition | Adjacent Plan pages remain rendered during page changes | Live Plan next-week and previous-week navigation retained rendered meal/program content; gesture-level native execution unavailable | **PASS web navigation; native gesture BLOCKED** |

### PR/deployment trace

- Reports 204–207 and the preceding remediation PRs were reviewed as the governing evidence set.
- Report 207 was delivered via protected PR **#169** and merged before this 72-hour pass.
- The current production release identity is `4daebdac49b5b68262ee6b3b652c4218c710c91f`.
- The latest release attestation reports source tree `d159951c92816f29a2d40ada6a393c522c75f676`, source digest `9ac44973ae2002f65126a03fe8326e23e43818869763c7c745a47ca0f3e512a4`, and release ID `calora-api-4daebdac49b5-20261013121045141`.

## 3. Production health and deployment verification

| Check | Result | Evidence |
|---|---|---|
| Web liveness | **PASS** | `https://app.mycaloraapp.com/health` returned `{"status":"ok","service":"calora-web"}` with HTTP 200. |
| Release identity | **PASS** | `https://app.mycaloraapp.com/api/version` returned commit `4daebdac49b5b68262ee6b3b652c4218c710c91f`. |
| Railway API runtime | **PASS** | Latest API deployment `4c39567e-3779-45b3-bc2e-d53a5b54f91b` was `SUCCESS`; recent HTTP logs showed successful health, recipes, and gate requests. |
| Production API recipe feed | **PASS** | `GET /api/v1/recipes?limit=1` returned a labeled recipe and a TheMealDB image URL. |
| Public recipe image visual check | **PASS** | The returned Air fryer patatas bravas image was downloaded and visually inspected: browned potato pieces with red/white sauces, consistent with the recipe identity. Evidence file: `evidence-208/air-fryer-patatas-bravas-live.jpg`. |
| Native workflows | **PASS — not triggered** | No matching Android/iOS/EAS/APK/AAB/IPA/TestFlight/Play/native workflow run was created during the mission. |

## 4. Real-user browser execution

The connected **My Browser** route was used against `https://app.mycaloraapp.com`.

### 4.1 Today

**PASS for accessible read-only surface.** Today rendered the Certification fixture, calorie ring, whole-number macro/water values, steps unavailable-on-web notice, meal area, Building your picture, Add meal affordance, and recipe cards. The web correctly explains that live device steps are available in the mobile app. No diary mutation was submitted.

### 4.2 Recipes / Discover / saved restoration

**PASS.** The live Recipes screen rendered Discover, categories, a saved `Overnight oats with berries` card, and 46 open recipes. The saved card was opened, closed, and reopened through its accessible button. On both detail openings:

- the same fruit/oats image remained attached to the recipe;
- title, ingredients, nutrition context, and three preparation steps were present;
- the detail showed `40 suggestions · up to 20 per row`;
- no blank detail, remote 404, or unrelated provider image appeared.

This is direct post-deployment browser evidence for the saved bundled recipe fix.

### 4.3 Plus

**PASS for access control; BLOCKED for authenticated content.** The live Plus surface displayed `Sign in for Plus recipes` and `Plus sources require sign-in`. The production endpoint returned:

```text
GET /api/v1/premium-recipes
HTTP 401
{"message":"Sign in to access Plus recipes."}
```

No provider image was displayed without entitlement. Authenticated Plus image identity therefore remains **BLOCKED**, not passed.

### 4.4 Create

**PASS for guest surface; BLOCKED for authenticated image generation.** The live Create UI rendered presets, ingredient choices, and `Generate 5 ideas`. A valid unauthenticated production request:

```text
POST /api/v1/recipes/guest-concepts
{"ingredients":["lentils"],"mealType":"Dinner","preferences":["Vegan"]}
```

returned HTTP 200 with recipe concepts. Empty valid JSON returned the designed HTTP 400 input response. Authenticated generation, AI image generation, save, reopen, refresh, and persistence require a signed-in QA account and were not falsely classified as PASS.

### 4.5 Restaurants

**BLOCKED by account/provider context.** Direct unauthenticated navigation did not expose a stable populated restaurant search/detail surface. The production endpoint correctly returned:

```text
GET /api/v1/restaurant-foods?query=chicken
HTTP 401
{"message":"Sign in to search restaurant foods."}
```

No restaurant image was classified as verified. This preserves the fail-closed rule.

### 4.6 Scan

**PASS for web surface and label regression; hardware workflows BLOCKED.** The live Scan route displayed `Scan food`, the camera permission affordance, the review-before-logging copy, and the non-camera modes `Type it`, `Voice`, and `Receipt` in extracted page content. The bottom navigation simultaneously showed Home, Recipes, Scan, Progress, and Plan labels. Browser camera, barcode, photo-library background/resume, microphone, and native sensor behavior cannot be certified from this web session.

### 4.7 Coach

**PASS for accessible guest surface.** The live Coach route showed:

- back control;
- `Start a new Coach chat` control;
- triple-line `Open Coach main menu` control;
- Coach input field and suggestions;
- correct guest notice that chats are temporary and use general wellness information only.

The menu opened to Coach settings. Signed-in chat persistence, per-chat deletion, and copy-button behavior require an authenticated conversation and remain **BLOCKED**, not falsely passed.

### 4.8 Plan

**PASS for live navigation; no destructive log submitted.** The live Plan page rendered planned meals with images, nutrition, and Log controls. Advancing from Sep 21–27 to Sep 28–Oct 4 rendered the adjacent week with its empty meal slots; returning to the prior week restored the populated plan. No blank frame or lost page was observed during these controlled transitions. Native slow/fast/partial/cancelled swipe physics remain **NOT TESTED** because no native build or physical-device session was authorized.

## 5. Production API contract probes and 500 forensic finding

The first probe intentionally used an invalid JSON body (`{}"`) while testing POST routes. Railway HTTP logs recorded two 500 responses at 06:02:41Z and 06:02:48Z. The application’s global JSON parser error handler correctly returned its generic 500 response for malformed JSON before route-level validation.

A valid-contract rerun established the actual production behavior:

| Request | Result |
|---|---|
| `POST /api/v1/capture/analyze` with `{}` and no auth | **401** — `Please sign in to analyze a capture.` |
| `POST /api/v1/recipes/guest-concepts` with `{}` | **400** — `invalid_recipe_input` |
| Valid guest concepts payload | **200** with concepts |
| `GET /api/v1/profile` without auth | **401** |
| `GET /api/v1/premium-recipes` without auth | **401** |
| `GET /api/v1/restaurant-foods?query=chicken` without auth | **401** |

**Diagnosis:** no production application defect is reproducible. The two 500s were malformed-request diagnostics, not failures of Auto Scan, Create, or authentication. No source change is justified.

## 6. Automated and static regression validation

### UI and image regression

The prior focused Calora run passed **11 test files / 67 tests**, including saved recipe restoration, Plus images, Plus detail, reliability, saved Plus recipes, restaurant images/review/screen, Create reopen image lifecycle, generated-image lifecycle screens, and Recipes screen behavior.

### API regression

The isolated API run passed **41 test files / 503 tests**, including:

- capture and approval flows;
- Plus and restaurant routes;
- recipe generation and rate limits;
- saved/persistence-related routes;
- planner, diary, sync, profile, Coach, RevenueCat, image evidence, recipe media, and admin alert contracts.

The run used a loopback-only placeholder `DATABASE_URL` and test-only OpenAI integration placeholders. No production database or provider credential was contacted.

### Static checks

- Calora TypeScript: **PASS**
- API TypeScript: **PASS**
- `git diff --check`: **PASS**
- Worktree after the report preparation: **clean apart from the new report/evidence artifacts before delivery**

## 7. Certification matrix

| Journey | Status | Reason/evidence |
|---|---|---|
| Today rendering and whole-number widgets | **PASS** | Live browser rendered the dashboard and expected web/device notices. |
| Discover recipe list and images | **PASS** | 46 open recipes rendered; public recipe image visually matched its label. |
| Saved bundled recipe restoration | **PASS** | Live close/reopen preserved title, image, method, ingredients, and nutrition. |
| Recipe detail two-row suggestions | **PASS** | 40 suggestions, up to 20 per row, populated and distinct. |
| Plus entitlement gate | **PASS** | Correct 401 and no unverified image. |
| Authenticated Plus recipes/images | **BLOCKED** | Authorized signed-in Plus entitlement unavailable in connected browser. |
| Create guest concept generation | **PASS** | Valid production request returned concepts. |
| Authenticated Create image generation/save/reopen | **BLOCKED** | Authorized authenticated QA access unavailable. |
| Restaurant search/detail/product images | **BLOCKED** | Authorized account plus populated provider context unavailable. |
| Restaurant image provenance | **NOT TESTED** | No live populated restaurant result was shown. |
| Scan web surface/tab labels | **PASS** | Live Scan surface and all bottom labels rendered. |
| Auto/photo-library/barcode/voice native capture | **NOT TESTED** | Physical device/native build prohibited for this task. |
| Coach guest entry/menu/new-chat surface | **PASS** | Controls rendered and menu opened. |
| Coach signed-in history/delete/copy | **BLOCKED** | No authenticated conversation in connected browser. |
| Plan week navigation | **PASS** | Adjacent week and return navigation retained content. |
| Native Plan gesture physics | **NOT TESTED** | Native device/build not authorized. |
| Progress date-range graphs | **PASS** | Prior live picker and regression evidence retained; no regression observed. |
| API/auth/error contracts | **PASS** | Valid-contract probes matched 401/400/200 design. |
| UI/API automated regression | **PASS** | 67 UI/image tests and 503 API tests passed. |
| Production health/release identity | **PASS** | Web health 200; release commit `4daebdac...`. |

## 8. Recovery decision and remaining owner actions

### No code recovery required

The forensic pass did not identify a reproducible source defect requiring implementation, PR, merge, or Railway redeployment. Making a patch merely to convert malformed JSON parser errors would be unrelated and would weaken the distinction between malformed transport input and valid route behavior.

### Genuine external prerequisites

To close the remaining workflows without bypassing security, the owner must provide one of the following through the existing supported workflow:

1. an authorized signed-in Calora QA account with active Plus entitlement for Plus and Restaurant tests;
2. an authorized signed-in QA account permitted to generate, save, reopen, refresh, and persist Create images;
3. a live populated Restaurant provider context for provenance verification; and
4. a separately authorized physical-device/native test instruction if Auto, Barcode, library-resume, Voice, or native swipe physics must be certified.

No generic troubleshooting or repeated browser authorization is requested here; these are the exact prerequisites needed to execute the currently blocked journeys.

## Final conclusion

**Report 208 outcome: PASS for executable 72-hour real-user, API, regression, and production-health validation; BLOCKED/NOT TESTED only where authenticated entitlement, provider population, native hardware, or an explicitly authorized native build is required.**

No native build was triggered. No production data was changed. No security control was bypassed. No new application defect was reproduced, and therefore no source fix was pushed, merged, or deployed in this pass.
