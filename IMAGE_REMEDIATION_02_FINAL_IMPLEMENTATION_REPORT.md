# Calora Image Remediation 02 — Final Implementation Report

**Remediation ID:** IMAGE_REMEDIATION_02  
**Date:** 2026-09-07  
**Baseline:** `IMAGE_AUDIT_01_COMPLETE_PROJECT_IMAGE_FORENSIC_REPORT.md`  
**Mission:** `attached_assets/Pasted-You-are-now-executing-CALORA-IMAGE-REMEDIATION-MISSION-_1788778134881.txt`  
**Scope:** Consumer-facing food imagery, image identity, provenance, diary persistence, Planner detail, restaurant imagery, recipe pagination, profile photos, Scan processing photos, and trusted image-source validation.

## 1. Executive summary

The high-severity image identity and failure-handling issues identified by IMAGE_AUDIT_01 were remediated without changing calorie calculations, nutrition values, the `Burned` label, or the existing review-before-acceptance capture flow.

Completed:

- Planner detail now uses the same canonical identity-aware image component as the primary Planner surface.
- Profile photos fall back cleanly when a local file is missing, corrupt, undecodable, or fails to load.
- Scan processing photos validate local URI shape, handle load failures visibly, and reject impractically large decoded dimensions where the platform exposes them.
- Diary sync preserves stable local image keys through the existing JSONB `sync_metadata` field.
- Restaurant representative provenance survives acceptance and restore, while valid item-specific remote images outrank representative local imagery.
- A single shared HTTPS food-image policy now drives client and server URL validation.
- Generated recipe-photo provenance is stored explicitly as `generated`.
- Existing accumulated-list Premium recipe deduplication was verified across pagination boundaries.
- Curated Planner and verified-food assets were visually inspected through contact sheets.

The result remains **PARTIAL**, not PASS, because the configured restaurant provider does not currently expose a trusted item-level photograph through this path, and capture image identity is preserved and validated through the existing session/metadata flow but is not cryptographically fingerprint-bound.

## 2. Original findings addressed

| IMAGE_AUDIT_01 finding | Result |
|---|---|
| Planner detail could bypass canonical identity resolution | Fixed. `PlannerMealImage` now owns Planner detail rendering. |
| Food-log local representative imagery could outrank a more specific remote image | Fixed. A valid non-Planner remote image now wins over bundled canonical/category imagery. |
| Restaurant items collapsed into representative categories | Truthfully retained as a provider limitation; representative provenance is now durable and visible. No arbitrary exactness was invented. |
| Profile photo surfaces lacked resilient load handling | Fixed with `ProfilePhoto`. |
| Scan processing photo path was unguarded | Fixed with URI validation, visible fallback, error handling, and decode-size guard. |
| Diary persistence omitted local image identity | Fixed through `sync_metadata.imageAssetKey`. |
| Recipe duplicate suppression needed cross-page verification | Verified in the accumulated client result set; normalized URL collisions are cleared to fallback. |
| Generated recipe provenance was implicit | Fixed with durable `imageProvenance: 'generated'`. |
| Client/server trusted image rules could drift | Fixed with shared `@workspace/api-zod/image-source-policy`. |

## 3. Architecture decisions

### 3.1 Diary identity strategy: validated stable local identity

The remediation chose the mission’s **Option A**:

- Remote image identity remains `imageUrl` plus `imageSource`, after HTTPS and host validation.
- Curated or representative bundled identity remains `imageAssetKey`.
- `imageAssetKey` is carried through the existing diary sync `sync_metadata` JSONB object rather than adding a new relational column.
- `restaurant_representative` is retained as a local provenance marker even when no remote URL exists.

This preserves the existing database shape and local-first behavior while preventing restored restaurant or curated food logs from losing the identity needed to reconstruct the same image.

### 3.2 Provenance classes

Consumer-facing food imagery is treated as:

- **Exact:** canonical Planner/verified-food local assets, or trusted item-specific remote/provider images.
- **Representative:** restaurant category assets in the `restaurant:<category>` namespace.
- **Fallback:** meal-category, recipe-role, neutral, or branded fallback surfaces used only when exact/representative imagery is unavailable.

Representative restaurant images are never presented as exact menu photography.

### 3.3 Rendering boundaries

The remediation did not force avatars, onboarding artwork, headers, Coach, Progress, security, or settings imagery through the food-image system.

The existing specialized components remain the correct boundaries:

- `PlannerMealImage` for curated Planner food content.
- `FoodLogThumbnail` for diary/memory food content.
- `ProfilePhoto` for account avatars.
- The guarded Scan processing surface for temporary capture imagery.

## 4. Exact changes made

### Planner remediation

**File:** `artifacts/calora/app/(tabs)/planner.tsx`

- Replaced the direct `expo-image` detail resolver with `PlannerMealImage`.
- The visible meal identity now determines the canonical asset through `plannerImageKeyForMeal`.
- Stale stored `imageAssetKey` values cannot independently select the detail photo.
- Existing fallback, accessibility, recycling, and load/error behavior comes from the shared component.
- Detail provenance copy now states that canonical identity is checked against the meal name.

**Evidence:**

- `artifacts/calora/components/PlannerMealImage.tsx`
- `artifacts/calora/lib/mealImageIdentity.ts`
- `artifacts/calora/lib/__tests__/mealImages.test.ts`
- `artifacts/calora/lib/__tests__/planner.test.ts`

### Profile remediation

**Files:**

- `artifacts/calora/components/ProfilePhoto.tsx`
- `artifacts/calora/app/(tabs)/profile.tsx`
- `artifacts/calora/lib/profilePhotoStorage.ts`

`ProfilePhoto` handles:

- Missing URI.
- Missing/deleted local file.
- Corrupt or undecodable image.
- Runtime image load failure.
- Recycling identity after URI changes.
- Accessibility labels for the profile photo and edit preview.

The existing account-scoped storage, copy, delete, and verification behavior remains unchanged.

### Scan remediation

**File:** `artifacts/calora/app/(tabs)/scan.tsx`

`ProcessingPhoto` now:

- Accepts only bounded local URI schemes used by the capture flow.
- Rejects overlong or malformed URI values before attempting to render.
- Shows a visible `Capture preview unavailable` state instead of a blank or crashing surface.
- Handles runtime image errors.
- Rejects decoded images over 20 megapixels when dimensions are provided by the platform.
- Preserves the analyzing overlay and review-before-acceptance flow.

No temporary capture URI is persisted as diary image metadata.

### Diary/image precedence remediation

**Files:**

- `artifacts/calora/components/FoodLogThumbnail.tsx`
- `artifacts/calora/lib/foodImageMetadata.ts`
- `artifacts/calora/lib/foodMemory.ts`
- `artifacts/calora/lib/diarySync.ts`
- `lib/db/src/schema/index.ts`
- `artifacts/api-server/src/routes/sync.ts`

The precedence rule is now explicit:

1. Valid item-specific remote image, except when a Planner-local identity is authoritative.
2. Canonical local food or Planner identity.
3. Stable restaurant representative identity.
4. Meal-category fallback.

Restaurant representative imagery cannot override a valid remote item image. The representative badge and accessibility wording remain present when representative imagery is actually rendered.

`imageAssetKey` is included in diary signatures, outbox payloads, server sync metadata parsing, server serialization, and client restore.

### Restaurant remediation

**Files:**

- `artifacts/calora/app/restaurants.tsx`
- `artifacts/calora/lib/restaurantFoodImageSelection.ts`
- `artifacts/calora/lib/restaurantFoodImages.ts`
- `artifacts/api-server/src/lib/premiumRecipes.ts`
- `artifacts/api-server/src/__tests__/restaurantFoods.test.ts`

The current FatSecret restaurant path was checked through its adapter and normalized contracts. No trusted item-level image field is currently surfaced for these results. The implementation therefore:

- Keeps exact restaurant image count at zero.
- Preserves category-level representative imagery as fallback only.
- Persists `restaurant:<category>` identity and `restaurant_representative` provenance.
- Keeps classification based on menu item name, never brand name.
- Does not assign random or visually similar photos to claim exactness.
- Keeps the visible representative disclosure.

**Provider blocker:** obtaining exact restaurant menu photography requires a provider/API path that exposes and licenses item-level images. No such currently configured source was found, so no new credential, paid provider, or unverified workaround was introduced.

### Recipe remediation

**Files:**

- `artifacts/calora/lib/premiumRecipeImages.ts`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/app/saved-recipes.tsx`
- `artifacts/calora/context/CaloraContext.tsx`
- `artifacts/api-server/src/lib/premiumRecipes.ts`

The existing client merge path applies `clearDuplicatePremiumRecipeImages` to the accumulated catalogue, not one server page at a time. URL identity strips query and hash differences before comparison. Later collisions receive `image: null` and therefore use the role-specific fallback instead of borrowing another recipe’s photo.

Generated/private recipe photos now persist:

- `imageId`
- Signed URL expiry
- `imageStatus`
- `imageProvenance: 'generated'`

Provider images, generated images, signed URL refresh, failure disclosure, and authenticated storage behavior remain intact.

### Shared image-source policy

**Files:**

- `lib/api-zod/src/image-source-policy.ts`
- `lib/api-zod/package.json`
- `artifacts/calora/lib/foodImageMetadata.ts`
- `artifacts/api-server/src/lib/image-metadata.ts`
- `artifacts/api-server/vitest.config.ts`

HTTPS, 2048-character maximum length, and the existing trusted host set are now defined once and consumed by both client and server code:

- `openfoodfacts.org`
- `unsplash.com`
- `themealdb.com`
- `fatsecret.com`
- `ftscrt.com`

No arbitrary internet image loading was enabled.

## 5. Capture and barcode binding status

The accepted diary record now preserves the image metadata and stable local image identity already present on the reviewed draft:

- `captureSessionId`
- validated `imageUrl`
- `imageSource`
- `imageAssetKey`

The existing exact UPC/GTIN validation, single-use session claim, atomic claim/write behavior, trusted-domain validation, and review-before-acceptance flow were not weakened.

The remaining limitation is explicit: the system does not currently store a cryptographic image fingerprint or provider-side candidate version. The record is bound through the authenticated capture session and approved draft metadata, not through a cryptographic image hash.

Component-level capture image URLs remain temporary and are not persisted as arbitrary file/data/blob URLs. Their image identity is therefore intentionally not retained unless it is a durable provider URL or stable local asset key.

## 6. Files inspected

Relevant inspected paths included:

- `IMAGE_AUDIT_01_COMPLETE_PROJECT_IMAGE_FORENSIC_REPORT.md`
- `artifacts/calora/app/(tabs)/planner.tsx`
- `artifacts/calora/app/(tabs)/scan.tsx`
- `artifacts/calora/app/(tabs)/profile.tsx`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/app/saved-recipes.tsx`
- `artifacts/calora/components/PlannerMealImage.tsx`
- `artifacts/calora/components/FoodLogThumbnail.tsx`
- `artifacts/calora/lib/mealImageIdentity.ts`
- `artifacts/calora/lib/mealImages.ts`
- `artifacts/calora/lib/restaurantFoodImageSelection.ts`
- `artifacts/calora/lib/restaurantFoodImages.ts`
- `artifacts/calora/lib/foodMemory.ts`
- `artifacts/calora/lib/diarySync.ts`
- `artifacts/calora/lib/profilePhotoStorage.ts`
- `artifacts/api-server/src/routes/capture.ts`
- `artifacts/api-server/src/routes/diary.ts`
- `artifacts/api-server/src/routes/sync.ts`
- `artifacts/api-server/src/lib/image-metadata.ts`
- `artifacts/api-server/src/lib/premiumRecipes.ts`
- `lib/db/src/schema/index.ts`
- `lib/api-zod/src/planner-image-identity.ts`
- `lib/api-zod/src/planner-program-pools.ts`
- `lib/api-zod/src/image-source-policy.ts`

## 7. Files modified

- `artifacts/api-server/src/__tests__/image-metadata.test.ts`
- `artifacts/api-server/src/lib/image-metadata.ts`
- `artifacts/api-server/src/routes/sync.ts`
- `artifacts/api-server/vitest.config.ts`
- `artifacts/calora/app/(tabs)/planner.tsx`
- `artifacts/calora/app/(tabs)/profile.tsx`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/app/(tabs)/scan.tsx`
- `artifacts/calora/app/restaurants.tsx`
- `artifacts/calora/app/saved-recipes.tsx`
- `artifacts/calora/components/FoodLogThumbnail.tsx`
- `artifacts/calora/components/ProfilePhoto.tsx`
- `artifacts/calora/context/CaloraContext.tsx`
- `artifacts/calora/lib/__tests__/diarySync.test.ts`
- `artifacts/calora/lib/__tests__/foodImageMetadata.test.ts`
- `artifacts/calora/lib/diarySync.ts`
- `artifacts/calora/lib/foodImageMetadata.ts`
- `artifacts/calora/lib/foodMemory.ts`
- `lib/api-zod/package.json`
- `lib/api-zod/src/image-source-policy.ts`
- `lib/db/src/schema/index.ts`

No runtime image asset bytes were changed or added.

## 8. Required tests added or strengthened

Coverage now includes:

- Local restaurant representative provenance without a remote URL.
- Diary sync round-trip of `restaurant:<category>` local identity.
- Existing Planner stale-identity and canonical asset tests.
- Existing canonical Planner and verified-food asset inventory tests.
- Existing accumulated Premium recipe duplicate tests.
- Existing profile local-storage failure tests.
- Existing API trusted-host and insecure-URL rejection tests.
- Full screen/component tests covering Profile and recipe rendering.

## 9. Tests executed

### Calora client

```text
pnpm --filter @workspace/calora run typecheck
PASS

pnpm --filter @workspace/calora exec vitest run
PASS — 79 files, 1,174 tests
```

The suite emitted existing React `act(...)` warnings in Profile screen tests but no test failures.

### API server

```text
pnpm --filter @workspace/api-server run typecheck
PASS

pnpm --filter @workspace/api-server exec vitest run
PASS — 35 files passed, 428 tests passed, 4 pending tests skipped
```

The server workflow was restarted after backend changes and rebuilt successfully:

- `dist/index.mjs` generated successfully.
- Server listening on port 8080.
- Health/root request returned HTTP 200.

### Static checks

```text
git diff --check
PASS
```

No Expo/EAS build was triggered. No deployment was performed. No production database data was modified.

## 10. Fresh project-wide image verification

### Quantitative before/after statistics

| Metric | IMAGE_AUDIT_01 | IMAGE_REMEDIATION_02 |
|---|---:|---:|
| Runtime bundled image files | 57 | 57 |
| Duplicate-byte groups | 0 | 0 |
| Canonical Planner identities | 26 | 26 |
| Canonical verified-food identities | 20 | 20 |
| Restaurant exact-image assignments | 0 | 0 |
| Restaurant representative category keys | 11 | 11 |
| Restaurant representative local asset references | 11 | 11 |
| Canonical Planner duplicate assignments | 0 | 0 |
| Canonical verified-food duplicate assignments | 0 | 0 |
| Premium cross-page duplicate behavior | Client merge test present | Accumulated merge verified |

No image bytes were changed, so the bundled inventory and duplicate-byte result remain stable by design.

### Provenance by surface

**Exact imagery:**

- Curated Planner meals through canonical Planner identity.
- Verified-food suggestions through canonical food identity.
- Trusted provider/barcode product imagery when the remote URL is item-specific and valid.
- Trusted recipe-provider images when not deduplicated.
- Generated recipe images when `imageProvenance` is `generated`.

**Representative imagery:**

- Restaurant category imagery using the `restaurant:<category>` identity.
- Restaurant results and diary thumbnails show representative disclosure when that image is rendered.

**Fallback imagery:**

- Planner meal-type fallback when no trustworthy canonical/provider image exists.
- Recipe-role fallback after provider image failure or duplicate collision.
- Meal-category diary fallback.
- Neutral restaurant fallback for uncategorized items.
- Profile initials/avatar fallback.
- Scan processing preview fallback for malformed, missing, oversized, or failed capture images.

**Intentionally image-free or primarily data-driven surfaces:**

- Progress data surfaces.
- Shopping completion/action rows.
- Coach conversation surfaces.
- Authentication, verification, password recovery, security, and recovery flows.
- Settings rows and navigation wrappers.

## 11. Visual semantic audit

Contact sheets were generated and inspected for all:

- 26 Planner meal assets in `artifacts/calora/assets/images/meals`.
- 20 verified-food assets in `artifacts/calora/assets/images/foods`.

The contact-sheet review found no obvious semantic mismatches between the curated keys and the visible food depiction. The images are visually consistent with their corresponding names at the level required for this implementation audit.

### Suspect mappings requiring human review

| Entity set | Suspect mappings |
|---|---|
| Planner canonical assets | None observed in contact-sheet review |
| Verified-food canonical assets | None observed in contact-sheet review |
| Restaurant representative assets | Not suspect exact mappings; these remain intentionally representative and must not be treated as exact menu photography |

This visual review does not establish licensing ownership or provider attribution. It also does not convert restaurant category imagery into exact imagery.

## 12. Security implications

- HTTPS-only validation remains enforced.
- Trusted image hosts remain allowlisted.
- URL length remains bounded.
- Temporary camera/file/blob/data URLs are not persisted as remote diary images.
- The shared validation policy reduces client/server allowlist drift.
- Profile and Scan local image failure paths now fail closed to visible fallback states.
- No arbitrary remote image loading was introduced.
- No capture session claim, UPC validation, or review gate was weakened.

## 13. Remaining limitations and provider/API blockers

1. **Exact restaurant imagery remains unavailable.** The current FatSecret restaurant response path does not provide a trusted item-level image field that is preserved through normalization. Representative imagery is therefore the correct truthful behavior.
2. **Capture images are not cryptographically fingerprint-bound.** Session identity, validated URL/source, and stable local key survive approval and sync, but no image hash or immutable provider candidate version is stored.
3. **Legacy records without image metadata cannot always be upgraded to exact identity.** Restaurant-verified legacy logs use deterministic category reconstruction only when their source and name make that classification safe; they remain representative.
4. **Generated recipe provenance is explicit for new/updated generated photos.** Older persisted local recipes may omit the new field and remain readable through existing source/status metadata.
5. **Visual semantic review is an implementation-level contact-sheet review, not a legal licensing audit.**

## 14. Git and commit status

- Branch: `release/calora-onboarding-and-plus`
- No commit was created by this remediation mission.
- Working tree contains the listed source, test, shared-policy, and report changes.
- No push to GitHub was performed.
- No deployment was performed.

## 15. Final verdict

**PARTIAL**

The feasible high-severity remediation is implemented and verified. Calora no longer silently treats stale Planner identities or representative restaurant imagery as exact food photography, profile and Scan image failures are controlled, diary image identity survives sync, recipe image deduplication is enforced across the accumulated client result set, and source validation is shared across client and server.

The verdict cannot be PASS while the configured restaurant provider lacks trusted item-level photography and capture records lack cryptographic image binding. Both limitations are documented and the UI remains truthful.