# Calora Complete Project-Wide Image Forensic Report

**Audit ID:** IMAGE_AUDIT_01  
**Audit date:** 2026-09-07  
**Scope:** Calora mobile client, API server, shared API/image identity libraries, bundled assets, recipe/planner/restaurant/capture/diary flows, persistence, fallbacks, and image-bearing user-facing screens.  
**Mode:** Read-only forensic audit. No product code, database schema, provider configuration, or image assets were changed as part of this audit.

## 1. Executive summary

Calora has a sound foundation for curated planner and verified-food imagery: 57 runtime image files are bundled, all 57 have distinct SHA-256 bytes, 26 planner meals have canonical image identities, 20 verified foods have canonical image identities, and the main planner/diary image components have explicit fallback and mismatch handling.

The system is not yet production-ready as a project-wide item-image system. The largest gap is restaurant imagery. FatSecret restaurant normalization does not expose or preserve an item-level image, so the client intentionally maps every restaurant result to one of 11 category keys backed by 11 local asset references. The UI discloses that these are representative images, which prevents a hidden claim of exact menu photography, but distinct menu items still cannot have distinct verified images.

The second major gap is inconsistent image identity enforcement across surfaces. The primary planner card recalculates a canonical key from the visible meal name and detects swaps, but the planner detail image passes a persisted `imageAssetKey` directly to the lower-level source resolver. That path can display a stale curated image if normalization is bypassed. Food-log thumbnails also prioritize local canonical/restaurant assets over a valid remote photo without a general provenance label.

Capture and barcode flows have good security and transaction controls, including trusted-domain filtering, review-before-acceptance, exact UPC matching for the USDA fallback, and atomic session claim/diary insertion. However, the approved diary image is not cryptographically or server-side bound to the image returned for the verified capture candidate, and component-level capture images are intentionally dropped when a multi-component capture becomes a diary log.

Recipe imagery is comparatively well guarded. Remote recipe images have role-based fallbacks and visible failure copy, generated recipe photos are stored in user-scoped object storage with authenticated refresh, and duplicate provider URLs are normalized by removing query/hash variants. Remaining weaknesses are implicit generated-image provenance, page-local server duplicate suppression, and generic premium source URLs that are less constrained than premium image URLs.

### Final verdict

**PARTIAL — architecture is sound but remediation is required.**

The curated local image system is structurally healthy. Restaurant item identity, planner detail identity, unguarded user/scan photo surfaces, provenance durability, and cross-page recipe-image deduplication require remediation before claiming that every displayed food image accurately represents the attached entity.

## 2. Audit method and evidence boundary

The review searched and read:

- `artifacts/calora/app/**`
- `artifacts/calora/components/**`
- `artifacts/calora/lib/**`
- `artifacts/calora/data/**`
- `artifacts/api-server/src/**`
- `lib/api-zod/src/**`
- `lib/db/src/**`
- `artifacts/calora/assets/images/**`
- Runtime image tests, device validation, image audit utilities, and production-readiness documentation.

Read-only evidence methods:

- Repository-wide `rg` searches for image components, image fields, URLs, fallbacks, asset keys, provider fields, and image metadata.
- Asset enumeration with `find`.
- Exact byte duplicate detection with SHA-256.
- File-type and dimension inspection with `file`.
- Direct source reads for image maps, identity resolvers, API normalization, persistence, and rendering components.
- Existing tests and device validation references were inspected but no build, deployment, Expo/EAS build, provider mutation, or database mutation was performed.

The audit can establish source identity, data flow, fallback behavior, key/URL duplication, and code-level correctness contracts. It cannot prove that every photograph visually depicts the named food without a human visual review or a trusted provider assertion. Visual-match claims below are therefore labeled as code-verifiable, provider-asserted, representative, or unverified.

## 3. Quantitative totals

| Metric | Audited total | Interpretation |
|---|---:|---|
| Runtime bundled image files | 57 | 26 planner meals, 20 verified foods, 6 surface images, 4 category fallbacks, 1 app mark |
| Exact duplicate bundled byte groups | 0 | All 57 SHA-256 hashes are distinct |
| Canonical planner image identities | 26 | One bundled `meals/*.jpg` asset per planner key |
| Canonical verified-food image identities | 20 | One bundled `foods/*.jpg` asset per food key |
| Static curated entities with one canonical asset | 46 | 26 planner meals + 20 verified foods; visual semantics still require human/provider review |
| Planner catalog remote URLs | 26 unique within catalog | Repeated once in the API mirror; local canonical assets take precedence in the client |
| Restaurant presentation keys | 11 | `main`, `drink`, `snack`, `breakfast`, `bowl`, `chicken`, `wrap`, `salad`, `soup`, `tacos`, `pasta` |
| Distinct local restaurant asset references | 11 | One local reference per category key; `main`/unknown uses the neutral app mark; an unused `FALLBACK_MAIN` constant is also declared |
| Restaurant provider item-level image fields preserved | 0 | FatSecret restaurant normalization has no image field |
| Direct-image screens | 8 | Home, Recipes, Insights, Planner, Profile, Scan, Restaurants, Meal Image Preview |
| Indirect image-bearing screens | 2 | Memory uses `FoodLogThumbnail`; Saved Recipes imports recipe image components |
| Identified meaningful image surface groups | 20 | Counting screen-level render roles, not every repeated card instance |
| Role/category fallback families | 4 | Breakfast, main, snack, drink |
| Runtime remote/generated image classes | 3 | Provider food/capture URLs, provider recipe URLs, generated private recipe photos |
| Static incorrect image assignments proven by code | 0 | Curated key maps are internally one-to-one; visual correctness is not established by source inspection alone |
| Distinct menu items with exact images | Not enumerable / effectively 0 in current restaurant path | Provider restaurant photos are discarded; all restaurant results are representative category imagery |
| Known high-severity image-integrity findings | 3 | Planner detail stale-key path, profile/photo failure surfaces, scan processing URI |
| Known medium-severity findings | 6 | Restaurant identity loss, capture image binding, catalog duplication, provenance gaps, classifier divergence, premium duplicate behavior |
| Recommended new image surface groups | 1–3 | Only where a clear comprehension benefit exists; no broad decorative expansion recommended |

The “static incorrect image assignments proven by code” total deliberately excludes representative restaurant images: those are not exact item images by design and are disclosed as representative. They are a product-integrity limitation, not a hidden false claim.

## 4. Complete image architecture and provenance inventory

### 4.1 Canonical bundled image maps

| Image family | Source | Identity authority | Render behavior |
|---|---|---|---|
| Planner meals | `artifacts/calora/lib/mealImages.ts:6-33` | `lib/api-zod/src/planner-image-identity.ts:7-39,74-96` | Canonical local asset wins when key is recognized; remote catalog URL is fallback only |
| Verified foods | `artifacts/calora/lib/mealImages.ts:35-56` | `artifacts/calora/lib/mealImageIdentity.ts:13-36` | Canonical local food asset; unknown key yields no food image and falls through to caller fallback |
| Restaurant representatives | `artifacts/calora/lib/restaurantFoodImages.ts:9-35` | `restaurantFoodImageSelection.ts:6-47` | Stable `restaurant:<category>` key maps to local representative image |
| Category fallbacks | `FoodLogThumbnail.tsx:10-15`, `PlannerMealImage.tsx:12-18`, recipe fallback maps | Meal/name/recipe role classifier | Shown after missing source or load error; some surfaces disclose fallback |
| Hourly headers | `artifacts/calora/lib/hourlyHeaderImages.ts:6-64` | Surface and hour slot | Local non-food presentation image, rotated by hour/AppState |
| App mark and shell imagery | `artifacts/calora/app.json:7,12,70` | App configuration | `icon.png` used for app icon, splash, and favicon |
| Profile photo | `artifacts/calora/lib/profilePhotoStorage.ts:21-120` | Account-scoped local document path | User-selected local file; initials/avatar when no URI |
| Generated recipe photo | `artifacts/api-server/src/routes/recipes.ts:278-374` | Authenticated user + image UUID | Private object-storage object with expiring signed URL and refresh |

### 4.2 Trusted remote sources

Client/server image metadata allowlists currently cover:

- `openfoodfacts.org`
- `unsplash.com`
- `themealdb.com`
- `fatsecret.com`
- `ftscrt.com`

Evidence:

- Client: `artifacts/calora/lib/foodImageMetadata.ts:5-49`
- Server: `artifacts/api-server/src/lib/image-metadata.ts:17-74`

The policy requires HTTPS and a maximum URL length of 2,048 characters. Data, blob, file, malformed, untrusted-host, and overlong values are removed or normalized to absent metadata. This is a strong injection defense, but invalid values become a silent image loss rather than a surfaced data-quality error.

### 4.3 Image-rendering component inventory

| Component/surface | Source path | Current source precedence | Audit result |
|---|---|---|---|
| `PlannerMealImage` | `artifacts/calora/components/PlannerMealImage.tsx:34-118` | Name/ID-derived canonical key → trusted/legacy remote URI → meal-role fallback | Strongest image contract: load/error state, mismatch detection, fallback notice, accessibility label, cache/recycling key |
| `FoodLogThumbnail` | `artifacts/calora/components/FoodLogThumbnail.tsx:5-55` | Restaurant asset → canonical food asset → validated remote URL → category fallback | Good fallback/error behavior; provenance precedence needs product decision |
| `RecipeImage` | `artifacts/calora/app/(tabs)/recipes.tsx:98-136` | Provider/generated URL → role fallback | Strong failure copy and generated-photo pending/retry behavior |
| Restaurant card/detail image | `artifacts/calora/app/restaurants.tsx:255-322` | Local representative category asset | Explicit representative disclaimer and badge; no exact item image path |
| Scan processing photo | `artifacts/calora/app/(tabs)/scan.tsx:70-105` | User-selected/captured URI | Unguarded native `<Image>`; no error or size/decode state |
| Profile avatar/edit preview | `artifacts/calora/app/(tabs)/profile.tsx:689-695,1551`; home `:1493` | User-selected local URI | No load error/fallback/accessibility contract |
| Hourly header image | Home `index.tsx:1501`, Recipes `recipes.tsx:1602`, Insights `insights.tsx:1642` | Bundled local header pool | Low runtime risk; no explicit failure/accessibility contract |
| Empty-state surface images | Home `index.tsx:1651`, Profile `profile.tsx:1143` | Bundled local header | Decorative and reliable; no runtime fallback |
| Meal image audit screen | `artifacts/calora/app/meal-image-preview.tsx:90-105` | `PlannerMealImage` with expected key | Good diagnostic surface; exposes fallback/swap evidence |

## 5. Screen-by-screen image usage audit

### 5.1 Home / diary

Evidence: `artifacts/calora/app/(tabs)/index.tsx:40-70,729,1493-1501,1651`.

- Recipe widget images use remote recipe URLs with `expo-image`, memory/disk caching, placeholder, category fallback, error handling, recycling key, and fallback notice.
- Diary entries delegate to `FoodLogThumbnail`.
- The header uses the hourly local header pool.
- The profile avatar renders `profilePhotoUri`.
- Empty diary uses the bundled home header.

**Correctness:** Recipe and diary content have strong source/fallback contracts.  
**Finding:** The home/profile avatar has no load error state, placeholder, fallback, cache/recycling key, or accessibility label. A corrupt or deleted local photo can produce a blank identity surface. **Severity: High.**

### 5.2 Recipes and Saved Recipes

Evidence: `artifacts/calora/app/(tabs)/recipes.tsx:98-136,495-504,1064,1169-1170,1397,1492-1510,1602`; `artifacts/calora/app/saved-recipes.tsx:7-17,237-255`.

- Recipe cards and detail views use `RecipeImage`.
- Provider recipe images are shown when available.
- Role-based bundled images are used as placeholders/fallbacks.
- Remote errors show “Food photo unavailable” rather than silently presenting the fallback as exact photography.
- Generated/user-created recipe photos use private signed URLs and retry/refresh behavior.
- Saved Recipes imports the same recipe card/detail components, so it inherits their image behavior.

**Correctness:** This is a comparatively strong area.  
**Findings:**

1. Generated image provenance is inferred from recipe metadata rather than carried as an immutable image-origin field. **Severity: Medium.**
2. Server duplicate suppression is page-local; cross-page uniqueness depends on every client merge path calling `clearDuplicatePremiumRecipeImages`. **Severity: Low/Medium.**
3. Generic premium `sourceUrl` validation is weaker than image URL validation and can send malformed/non-HTTP URLs to `Linking.openURL`. **Severity: Medium.**

### 5.3 Insights

Evidence: `artifacts/calora/app/(tabs)/insights.tsx:1253,1642`.

- Insights has a local hourly header image.
- Data and insight cards are icon/chart/text-led.

**Classification:** No food image is required. A purpose-built insight illustration could be optional, but adding imagery is not necessary for comprehension. Header failure/accessibility semantics are missing. **Severity: Low.**

### 5.4 Weekly Planner

Evidence: `artifacts/calora/app/(tabs)/planner.tsx:203-208,1212-1218,1320,1342`; `PlannerMealImage.tsx:34-118`; `data/planner.ts:10-424`; API mirror `artifacts/api-server/src/routes/planner.ts:49-465`.

- Planner meal cards, add/replace catalogs, Program chooser thumbnails, and Program preview strips use canonical planner identities.
- 26 planner meals have 26 bundled local meal assets.
- Program-specific hero mapping is explicit in `lib/api-zod/src/planner-program-pools.ts`, and the uniqueness regression test covers all 12 Programs.
- The primary shared component recalculates identity from visible ID/name, detects expected/actual key swaps, and displays a fallback/mismatch notice.
- The planner catalog and API catalog duplicate the 26 remote Unsplash URLs and meal data.

**Findings:**

1. The planner detail image path directly uses `plannerImageSource(detail.imageAssetKey, detail.image)` and a plan-header fallback instead of `PlannerMealImage`. It bypasses mismatch detection, shared accessibility state, visible fallback status, and shared load/error behavior. A stale persisted key can display the wrong curated asset. **Severity: High.**
2. Client and API maintain duplicate planner catalog authorities. Local canonical assets hide many URL mismatches at runtime, but URL/nutrition/name drift can still occur between mirrors. **Severity: Medium.**
3. Catalog URLs are remote legacy/fallback data even when local canonical assets win. They increase maintenance and licensing surface. **Severity: Low/Medium.**

### 5.5 Restaurants

Evidence: `artifacts/calora/app/restaurants.tsx:102-142,255-322`; `restaurantFoodImageSelection.ts:6-47`; `restaurantFoodImages.ts:9-52`; `artifacts/api-server/src/lib/premiumRecipes.ts:48-59,229-277`.

- Result cards and detail sheets use deterministic local category images.
- The UI says “Representative images · exact menu photography unavailable”.
- Result cards carry a visible representative badge.
- Brand names are intentionally ignored in classification, preventing brand-based misclassification.
- FatSecret restaurant normalization returns identity, brand, nutrition, servings, and URL, but no image field.

**Finding:** The system is transparent but cannot satisfy exact item imagery. McChicken, Whopper, generic burgers, unrelated branded entrees, and unknown items can collapse to the same `restaurant:main` neutral asset. Drinks, salads, bowls, tacos, etc. also legitimately reuse category imagery across many distinct items. **Severity: High product-integrity limitation.**

The current approach is safer than pretending a generic photo is exact menu photography. It should remain disclosed until a trusted item-level provider image is available.

### 5.6 Scan and barcode

Evidence: `artifacts/calora/app/(tabs)/scan.tsx:70-105,369,526-538`; `artifacts/api-server/src/routes/capture.ts:75-107,171-191,225-288`; `diary.ts:263-349`.

- Captured/picked photo is displayed while analysis runs.
- Scan review is required before acceptance.
- Open Food Facts prefers `image_front_url`, then `image_url`, then `image_front_small_url`.
- USDA fallback provides nutrition/identity but no image.
- Exact scanned UPC/GTIN matching is required for the USDA fallback.
- Capture session claim and first diary insert are atomic and single-use.

**Finding:** The processing photo uses a native `<Image>` with no URI validation, load/error handler, placeholder, accessibility label, or bounded decode/size guard. A malformed or very large image can blank or stress the screen. **Severity: High.**

**Finding:** Capture candidate persistence proves nutrition/session provenance but does not retain the image URL/source on the candidate. The approval request can submit a different trusted image URL than the image associated with the analyzed candidate. This is an auditability gap, not an arbitrary-host injection gap. **Severity: Medium.**

**Finding:** Component-level images can exist transiently on capture components but are dropped when the accepted item becomes a diary log/memory. **Severity: Medium.**

### 5.7 Profile and settings

Evidence: `artifacts/calora/app/(tabs)/profile.tsx:689-695,1143,1551`; `profilePhotoStorage.ts:21-120`.

- Profile photos are account-scoped local files.
- Storage verifies existence and copies/deletes through a controlled path.
- Initials/avatar UI is used when no photo exists.
- Profile saved-empty state uses a bundled profile header.

**Finding:** Avatar and edit-preview images have no load error/fallback/accessibility contract. Null state is covered by initials, but corrupt/deleted/non-decodable local files are not. **Severity: High.**

### 5.8 Memory, Progress, Coach, onboarding, and empty states

- Memory food rows use `FoodLogThumbnail`; non-food rows correctly use icons. `app/memory.tsx:37-80`.
- Progress/shopping surfaces are appropriately data/action-led; adding food imagery broadly would be decorative rather than useful.
- Coach uses vector icons and feature marks (`app/coach.tsx:350-382,491`). No coach raster image is required.
- Onboarding has a bundled visual asset (`calora-onboarding-visual.jpg`) but no broad food-photo requirement.
- Empty diary and saved-recipe/profile states use appropriate bundled surface art or text/icon-led states.

## 6. Screens without images and opportunity classification

### NOT APPROPRIATE

Imagery should not be added merely to fill space in:

- Auth callback, sign-in, sign-up, forgot-password, reset-password, verify-email.
- App/bootstrap/layout/not-found/system screens.
- Bottom sheets, interaction wrappers, error boundaries, keyboard wrappers, local save notices, setting rows, surfaces, and pager infrastructure.
- Progress/shopping action rows where imagery would compete with completion state.
- Security/recovery steps where trust depends on clear text and controls.

### OPTIONAL

An image could help, but is not needed for correctness or comprehension:

- Coach branded welcome illustration.
- Encrypted recovery trust illustration.
- Invite/referral welcome illustration.
- Celebration/referral cards.
- Insight-specific illustration alongside data visualization.

### RECOMMENDED

- Saved-recipes empty state could use a discovery-oriented illustration if product wants a stronger first-save affordance.
- Planner peek/profile goal summaries could use a compact food/goal cue only if it improves recognition without competing with data.

### REQUIRED

No additional generic photo surface is required. The required work is robustness and identity correction on existing surfaces: profile photo failures, scan preview failures, and planner detail identity enforcement.

## 7. Duplicate-image findings

### 7.1 Exact bundled bytes

- 57 runtime image files.
- 57 distinct SHA-256 hashes.
- 0 exact duplicate-byte groups.

This confirms the bundled files are not accidentally duplicate copies.

### 7.2 Intentional reference reuse

The following reuse is valid or disclosed:

- `food-fallback-main.jpg` serves both Lunch and Dinner role fallbacks.
- The four role fallbacks are referenced by multiple components.
- Five header assets are shared among three hourly pools.
- Restaurant representative keys reuse food assets by category.
- Equivalent provider URL variants with query/hash differences are intentionally treated as the same image for duplicate suppression.

### 7.3 Product-risk reuse

- All restaurant menu items use category-level representative art because provider item-level images are not available in the normalized path.
- Premium recipe duplicate suppression is page-local on the server; cross-page correctness depends on client accumulation.
- A stale planner key can bypass the name-authoritative path on the detail surface.
- Food-log canonical/restaurant image precedence can hide a valid remote image without a general provenance indicator.

## 8. Mismatched-image findings

| Finding | Evidence | Severity | Why it matters |
|---|---|---|---|
| Planner detail trusts stored `imageAssetKey` | `planner.tsx:1212-1218`, `mealImages.ts:66-72` | High | Edited/restored meal can show an old curated photo |
| Restaurant category image stands in for exact menu item | `restaurantFoodImageSelection.ts:21-47`, `restaurantFoodImages.ts:22-45` | High | Distinct items cannot be visually distinguished |
| Food-log canonical image wins over remote image | `FoodLogThumbnail.tsx:26-40` | Medium | A user/provider photo can be hidden by a representative local asset |
| Capture candidate image is not bound to approved diary image | `capture.ts`, `diary.ts` | Medium | Nutrition verification does not prove photo identity |
| Component capture images dropped at acceptance | `captureReviewTransitions.ts:93-141` | Medium | Multi-component food imagery cannot persist |
| Recipe role fallback may be representative, not exact | `recipeImagePresentation.ts`, `recipes.tsx:98-136` | Low/Medium | Correctly disclosed as unavailable, but still not item-specific |

No static curated planner/verified-food key collision was found. The 26 planner and 20 food key maps are one-to-one at the asset-byte level.

## 9. Placeholder and fallback findings

### Safe/explicit fallback behavior

- `PlannerMealImage` displays fallback/mismatch status and accessibility text.
- `FoodLogThumbnail` displays a representative badge for restaurant assets and uses remote error fallback.
- `RecipeImage` displays “Food photo unavailable” and role fallback rather than silently claiming exactness.
- Unknown restaurant items use neutral `icon.png` rather than an unrelated salad/entrée image.
- Invalid/untrusted remote URLs are rejected by client and server allowlists.

### Risky/implicit fallback behavior

- Profile avatar/edit photo and scan processing image can blank without a visible fallback.
- Hourly headers and bundled restaurant direct images lack runtime error/accessibility contracts.
- Non-restaurant local canonical food/planner images do not carry a general provenance label when they are representative rather than provider-verified.
- Invalid provider URLs become null silently, so new provider-domain drift can look like a missing image.

## 10. Restaurant-specific findings

### Provider capability

FatSecret restaurant food normalization has no image field:

- `artifacts/api-server/src/lib/premiumRecipes.ts:48-59`
- `artifacts/api-server/src/lib/premiumRecipes.ts:229-277`

The current restaurant API returns nutrition/identity, not item-level photography. The client therefore cannot preserve a valid restaurant photo because none reaches the client.

### Root cause of repetition

The repeated imagery is not caused by cache corruption. It is caused by a deliberate category substitution:

1. Menu item name is classified into 11 category keys.
2. Brand is ignored to avoid brand-name misclassification.
3. `restaurant:<category>` is assigned to the draft.
4. Category key resolves to a small local representative set.
5. `FoodLogThumbnail` prioritizes the representative asset when restoring/logging.

### Correctness judgment

The current UI is honest because it explicitly says exact menu photography is unavailable. It is not an exact-image system. A future exact-image path must require a provider-verified item-level URL or a user-supplied photo with explicit provenance; it must not silently upgrade category art to exact imagery.

## 11. Recipe-specific findings

- Open/premium recipe images are URL-based and normalized by provider adapters.
- `RecipeImage` has role fallback and failure disclosure.
- Generated photos are private, user-scoped, expiring, and refreshable.
- Premium server duplicate clearing strips query/hash and keeps the first URL.
- The server’s set is page-local; client accumulated-list clearing is required for cross-page uniqueness.
- Generated image origin is inferred rather than a durable immutable field.
- Generic premium `sourceUrl` validation is weaker than image validation.

## 12. Weekly Planner findings

Positive controls:

- 26 curated meal identities.
- 26 local bundled assets.
- Canonical name/ID identity map.
- Shared `PlannerMealImage` mismatch detection.
- Program-specific hero mapping and uniqueness regression test.
- Program pools preserve visual strategy without weakening dietary/calorie filters.

Remediation-required findings:

- Detail view bypasses the shared identity/fallback component.
- Client/API catalogs are duplicated.
- Remote URL fields remain as a second maintenance/provenance authority.

## 13. Other food and logging findings

- Diary persistence supports `image_url` and `image_source` only:
  - `lib/db/src/schema/index.ts:68-129`
  - `artifacts/api-server/src/routes/sync.ts:197-223,506-533`
  - `artifacts/api-server/src/routes/diary.ts:142-203`
- No `imageAssetKey` database column exists.
- Local restaurant/planner asset identity cannot be reconstructed solely from a restored diary row.
- Capture components can carry image metadata transiently but accepted diary records have one draft-level image.
- Client image-source union only reconstructs `provider`, `recipe`, and `planner`, while the server accepts any nonempty source label with a valid URL. This can lose labels such as `Open Food Facts` during rehydration.

## 14. Non-food image findings

- Header images are local, stable, and visually useful as surface identity.
- Profile images are user-owned content and need stronger load failure handling.
- Coach imagery is correctly vector-led.
- App icon/splash/favicon use the neutral app mark.
- Onboarding visual is a bundled surface asset.
- No additional decorative photography should be added to auth, security, system, or action-heavy surfaces without a demonstrated comprehension benefit.

## 15. API, database, caching, and provenance architecture

### Current pipeline

```text
provider/client/local source
  -> provider normalizer or local identity resolver
  -> URL/domain validation or bundled asset map
  -> client model / API schema
  -> local diary/planner/recipe state
  -> optional sync/database image_url + image_source
  -> component-level fallback and cache
  -> rendered image
```

### Important architecture boundaries

- Bundled canonical planner/food assets are client-owned and not persisted as database asset identities.
- Diary server persistence preserves remote URL/source but not local `imageAssetKey`.
- Restaurant provider data has no item photo field in the normalized contract.
- Generated recipe photos use a separate private-object flow with expiring URLs.
- Provider URL policy is duplicated in client and server.
- Cache keys use meal/log/image identity in the stronger shared components, but direct image surfaces do not consistently share the same contract.

## 16. Licensing and API limitations

- Runtime records do not carry license, attribution, rights, expiration, or license URL metadata per image.
- Planner catalog references Unsplash URLs, while bundled canonical assets are local and take precedence.
- Provider domains include Open Food Facts, TheMealDB, FatSecret/FTSCRT, and Unsplash.
- Restaurant search is nutrition-oriented FatSecret data, not a photo provider.
- Signed generated photos have expiry; ordinary provider URLs generally do not have explicit expiration handling.
- URL allowlists prevent arbitrary-host injection but can silently discard legitimate future provider domains until both client and server policy are updated.

This report does not make a legal determination about image licensing. A production image-rights review remains necessary for provider and bundled asset usage.

## 17. Severity summary

### High

1. Planner detail image can trust stale `imageAssetKey` outside the name-authoritative shared component.
2. Profile avatar/edit preview has no broken-image/error contract.
3. Scan processing URI has no validation, load error, or bounded decode protection.
4. Restaurant exact item imagery is unavailable and all items collapse to representative categories.

### Medium

1. FatSecret restaurant item images are discarded because the normalized type has no image field.
2. Capture image is not bound to the verified scan candidate.
3. Component-level capture images are dropped on diary acceptance.
4. Client/API planner catalogs are duplicated.
5. Generated recipe image provenance is implicit.
6. Food-log canonical local precedence can hide a valid remote image.
7. Server/client image-source labels can diverge.
8. Premium duplicate suppression is page-local.
9. Local `imageAssetKey` is not durable through server restore.

### Low

1. Hourly headers lack explicit error/accessibility semantics despite local sources.
2. Restaurant bundled assets lack runtime error handling despite static `require` sources.
3. Custom/arbitrary image assignments are reported by audits but not rejected at runtime.

## 18. Recommended production architecture

1. **Use an explicit image identity record for every exact item.**
   - Identity should include entity type, entity/provider ID, normalized name, image URL or local key, source/provider, provenance class, verified-at timestamp, and optional rights/attribution metadata.

2. **Keep exact and representative imagery separate in the data model.**
   - `exact_item_image` must never be populated by category fallback.
   - `representative_category_image` must remain visibly labeled.

3. **Persist stable local asset identity where it affects restored UI.**
   - Either persist a validated asset key or persist enough entity/provider identity to deterministically reconstruct it.

4. **Make the shared image component the only consumer-facing image path for food content.**
   - It should own identity resolution, safe source selection, error state, fallback disclosure, cache key, accessibility label, and audit status.

5. **Bind capture image metadata to the capture session when auditability matters.**
   - Candidate and approval records should carry a verified image fingerprint/provider identity, not only nutrition/evidence metadata.

6. **Use an accumulated image-identity registry for paginated recipe results.**
   - Dedupe against the entire loaded result set, not each page independently.

7. **Centralize trusted-domain/source policy.**
   - Generate or share the same validation contract between client and server to prevent rollout drift.

## 19. Proposed remediation plan

### Phase 1 — correctness and blank-state prevention

1. Replace planner detail’s direct `plannerImageSource` call with `PlannerMealImage` or an equivalent shared audited path.
2. Add a resilient local-photo component for profile avatar/edit preview with error fallback and accessibility labels.
3. Add a safe processing-photo component for Scan with URI validation, load failure state, and bounded image handling.
4. Add regression tests for full-bleed image wrapper layout, stale planner keys, local photo failure, and scan preview failure.

### Phase 2 — provenance and persistence

1. Decide and document whether trusted/user remote images or canonical local assets win in diary thumbnails.
2. Persist/reconstruct validated local asset identity where restore behavior requires it.
3. Expand image-source metadata beyond the current narrow client union or reject unsupported source labels at the server boundary.
4. Carry generated image origin explicitly and immutably.

### Phase 3 — restaurant identity

1. Confirm whether a licensed/provider-authorized restaurant image source is available.
2. Extend normalized restaurant item/API/DB contracts only if the provider supplies an item-specific image and usage rights.
3. Preserve current representative disclosure as the safe fallback.
4. Never infer exact menu photography from category or brand names.

### Phase 4 — catalog and pagination hygiene

1. Establish one authoritative planner catalog or generate client/API contracts from one source.
2. Make duplicate image identity tracking accumulated and mandatory for every premium recipe merge path.
3. Add runtime or build-time validation for arbitrary/custom duplicate image assignments.

## 20. Tests to add or strengthen

- Planner detail renders name-derived key and rejects stale persisted key.
- Every consumer-facing food image route uses the shared audited image component.
- Profile avatar/edit preview shows explicit fallback on broken local URI.
- Scan processing photo shows retry/error state for malformed or failed URI.
- Restaurant representative asset remains labeled after local restore.
- Server/client image-source metadata round-trips all supported source values.
- Capture approval rejects or records image identity mismatches when exact binding is required.
- Component-level capture image retention behavior is explicitly tested for intended product semantics.
- Premium duplicate image suppression is tested across page boundaries and every client merge path.
- Planner/API catalog parity is tested from one generated/static contract.
- Every static canonical key resolves to a real unique asset.
- Representative and exact image provenance are separately exposed to accessibility/UI audit surfaces.

## 21. Valid intentional image reuse

The following reuse is valid when clearly classified:

- Same meal-role fallback for Lunch and Dinner when no exact image exists.
- Same category representative image across restaurant items, provided the UI continues to say representative and exact photography is unavailable.
- Same app mark for app icon, splash, favicon, and neutral unknown restaurant state.
- Same provider image for genuine serving-size variants of the same product.
- Same generated image when it is explicitly the same recipe/entity and the storage identity remains stable.
- Same hourly header asset appearing in multiple surface pools as decorative surface imagery.

## 22. Cases where a verified image cannot currently be obtained

- FatSecret restaurant result item-level images are not present in the normalized API contract.
- USDA barcode fallback supplies nutrition/identity but no image.
- Unknown restaurant items cannot safely inherit a food category photo; neutral icon is the correct current behavior.
- Untrusted/invalid provider URLs are intentionally discarded.
- Exact image for a user-created/custom food cannot be asserted unless the user supplies a photo or a trusted provider match exists.

## 23. Final verdict

**PARTIAL — architecture is sound but remediation is required.**

Calora’s canonical bundled planner/food image foundation, URL validation, recipe failure handling, and representative-image disclosures are strong. The application should not yet be described as having item-accurate images everywhere because restaurant imagery is category-level, several user/capture image surfaces can fail blank, planner detail can bypass name-authoritative identity, and image provenance is not fully durable or scan-bound.

The audit is complete. Remediation should begin only after review and approval of this report.