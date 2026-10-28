# Calora Learning image experience implementation report

**Date:** 2026-10-28
**Scope:** Learning browse and reader visuals, More destination cards, and removal of all imagery from the Today dashboard.
**Status:** Implemented locally; validated in a local static web preview; ready for protected GitHub review. No native mobile build, production deployment, production data access, or external runtime-image request was performed.

## 1. Objective and original defect

The goal was to replace the prior collection-level Learning image treatment with a visibly image-led, article-specific experience. The supplied visual references guided hierarchy only: compact browsable cards, visible editorial art, and a prominent image followed by a readable content sheet. They are not bundled or displayed by the app.

The protected-main baseline had a concrete mapping defect: one fallback image was assigned to every lesson in a collection. The baseline local preview therefore showed the same image repeated across all five Fundamentals cards, all five Planning cards, and so on. This was not a loading issue; it was the resolver design.

![Learning browse before — collection-level image repetition](/tmp/Calora-inspect/docs/reports/assets/learning-image-experience-2026-10-28/learning-browse-before.webp)

## 2. Implemented system

### 2.1 Article-specific local images

1. Added a stable `imageAssetKey` to every Learning lesson. Every key equals the lesson ID.
2. Replaced collection fallback behavior with `lib/learningImages.ts`, a local immutable resolver containing exactly 50 static `require()` entries.
3. The resolver throws if a key is missing; it has no collection or generic image fallback.
4. Generated and bundled 50 square editorial illustrations under `assets/images/learning/articles/`. Every file is a 512×512 JPEG.
5. Every article asset is different at the binary level: 50 lesson keys, 50 local files, 50 resolver entries, and 50 distinct SHA-256 hashes.
6. The new illustrations appear on featured cards, browse cards, reader heroes, reader related cards, and the Learning destination in More. `expo-image` uses memory-and-disk caching with a local source only.

The library totals **2,947,412 bytes** compressed, with individual JPEGs from **38,016 to 90,041 bytes**. The governed application-wide inventory remains inside its established image budget: 108 bundled assets, 15,197,578 compressed bytes, and 304,126,912 decoded RGBA bytes.

![Learning browse after — distinct illustration for every article](/tmp/Calora-inspect/docs/reports/assets/learning-image-experience-2026-10-28/learning-browse-after.webp)

### 2.2 Browse and reader hierarchy

1. Updated Learning browse cards to a dense square-art grid with compact title treatment while retaining search, topic filters, saved state, completion state, and canonical reader navigation.
2. Corrected the narrow-device grid calculation: two 48% cards plus the 10pt gap fit inside the padded content area at 320pt and 360pt widths. The previous 48.5% width could overflow or wrap.
3. Added a clearly visible, centered editorial reader hero on a calm pastel stage. The reading sheet overlaps it to create the supplied-reference hierarchy without obscuring the image.
4. Reduced reader, browse, and More card type sizing selectively while preserving the existing font-scale accessibility behavior and readable body copy.
5. Preserved the general-education boundary, medical-adjacent safety metadata, `tryThis` actions, save behavior, and completion behavior.

![Learning article after — prominent local hero and compact reading sheet](/tmp/Calora-inspect/docs/reports/assets/learning-image-experience-2026-10-28/learning-reader-after.webp)

### 2.3 Complete Learning coverage

The catalog now contains **50 articles across 10 visible topics**, with exactly **five lessons in every topic**:

| Topic | Articles |
| --- | ---: |
| Fundamentals | 5 |
| Planning | 5 |
| Recipes | 5 |
| Labels | 5 |
| Habits | 5 |
| Fasting | 5 |
| Hydration | 5 |
| Movement | 5 |
| Sleep | 5 |
| Mindset | 5 |

The Learning content remains practical general education rather than individualized care. The topic expansion was reviewed against the accompanying public-health source ledger: [Learning five-per-topic editorial sources](LEARNING_FIVE_PER_TOPIC_EDITORIAL_SOURCES_2026-10-28.md).

### 2.4 More tab

The More tab now uses compact type and visible local editorial imagery on the primary Fasting and Learning destinations, replacing generic Learning stock-photo references with topic-specific article artwork. The existing destination actions remain unchanged.

![More before — older generic Learning imagery](/tmp/Calora-inspect/docs/reports/assets/learning-image-experience-2026-10-28/more-before.webp)

![More after — local topic-specific editorial destinations](/tmp/Calora-inspect/docs/reports/assets/learning-image-experience-2026-10-28/more-after.webp)

### 2.5 Image-free Today dashboard

All dashboard image renderers and asset locators were removed. This includes the profile photo, hourly header image, recipe imagery/fallbacks, food-log thumbnails, and empty-diary art. Their functional locations now use accessible icon-and-color surfaces. The dashboard keeps its existing navigation, meal controls, logging, and accessibility labels.

![Today before — dashboard image surfaces](/tmp/Calora-inspect/docs/reports/assets/learning-image-experience-2026-10-28/today-before.webp)

![Today after — image-free dashboard with semantic icon surfaces](/tmp/Calora-inspect/docs/reports/assets/learning-image-experience-2026-10-28/today-after.webp)

## 3. Local-only image, privacy, and provenance controls

1. No Learning browse, reader, or resolver source contains an HTTP(S) image URL.
2. The image manifest contains zero static external image URLs.
3. Image-governance CI now rejects **any** static external image URL, even one that is documented as approved. It also scans the Learning content directory as runtime source.
4. The six retired Unsplash Learning photos and their source record are removed because the app now uses article-specific original local illustrations.
5. Every new image has manifest provenance, reviewer/date, declared render consumers, dimensions, SHA-256 digest, and a matching ledger row in [`GENERATED_ASSET_PROVENANCE.md`](../image-assets/GENERATED_ASSET_PROVENANCE.md).
6. The references supplied for visual direction are not embedded, uploaded, or fetched by the app.

## 4. Validation record

The following validations passed after the final code and governance corrections:

| Validation | Result |
| --- | --- |
| `pnpm exec tsc -p artifacts/calora/tsconfig.json --noEmit` | Pass |
| `pnpm run typecheck` workspace validation | Pass |
| Focused Learning, dashboard, tabs, and visual suite | **58/58 tests passed** across 7 files |
| Image-governance validator | Pass: 108 assets, 0 static external URLs, 13 registered renderers |
| Image-governance Node regression suite | **13/13 tests passed** |
| Static identity audit | 50 lesson keys, 50 local files, 50 manifest records, 50 unique hashes; no missing or extra asset |
| Static image audit | No Learning HTTP(S) image literal; no Today image renderer, asset locator, recipe URI, or retired hourly-image hook |
| Local web export | Pass: 161 exported files, 30,754,464 bytes |
| Local browser review | Pass: browse, reader, More, and Today reviewed against the local static export |

The complete app test command has a known sandbox-only Node 22/Vitest JSDOM worker boot issue (`undici` worker initialization) that prevents some JSDOM files from starting before assertions execute. It is not represented as a green full-suite result here. Protected GitHub validation uses Node 24 and remains the authoritative full-CI merge gate.

## 5. Before/after evidence method

The before screenshot was captured from the exact protected-main baseline in a separate local build after onboarding. The after screenshots were captured from the finalized local static web export after the final type, focused-test, governance, and build checks. Both use only inert placeholder public configuration; no user data, production service, or private asset URL was queried.

## 6. Retained behavior and release constraints

- Kept: Learning search, filters, reader routing, saved/completed state, educational boundary, safe-content metadata, theme support, and accessible labels.
- Kept: More destination routes and dashboard logging/navigation behavior.
- Removed only: Today-dashboard imagery and retired Learning collection-level/stock-photo assets.
- Not performed: Android, iOS, Expo/EAS, APK/AAB/IPA, TestFlight, App Store, or Play Store build/release; production deployment; production data mutation; external runtime image loading.

## 7. Review readiness

This implementation is ready to commit to a protected feature branch and send through GitHub’s required Node 24 release-validation gate. A Railway deployment, if release alignment is later required after protected merge, would not deliver these bundled mobile UI changes to installed clients; a separately authorized native application release would be required for that distribution path.
