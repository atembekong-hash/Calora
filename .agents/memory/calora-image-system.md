---
name: Calora image system
description: Visual hierarchy and fallback rules for extending Calora imagery beyond editorial headers.
---

Calora imagery should be purposeful: editorial photography belongs on headers and detail views, food photography supports recipe/planner discovery, and small branded crops or illustrations support empty states. Data-heavy surfaces should use imagery as texture, never as the primary content.

**Why:** The app benefits from a richer, premium visual rhythm, but trust, nutrition numbers, provenance, and actions must remain more prominent than decoration.

**How to apply:** Prefer bundled local assets and branded fallbacks when remote food images are absent. Keep overlays dark enough for readable text, preserve stable image aspect ratios, and leave Smart Scan camera UI visually focused unless explicitly redesigned.

Planner meal photos must resolve from the visible canonical meal name, not from a persisted image key or catalog-shaped ID alone. Unknown or user-renamed meals use their validated remote image or a meal-type fallback rather than inheriting a stale curated photo.

**Why:** Planner IDs and image metadata can survive edits or older persisted state; trusting them first can pair a renamed meal with the original food photo.

**How to apply:** Keep client and server name aliases aligned with the planner catalog, normalize planner meals at hydration and mutation boundaries, and test every catalog entry plus a complete seven-day starter week.

Diary thumbnails must always render a bundled category fallback unless a durable HTTPS URL from an allowlisted food-image provider is available. Normalize image metadata before every local or server persistence boundary; never retain camera, file, blob, data, or arbitrary-host URLs.

**Why:** Guaranteed local fallbacks keep every diary row visual offline and after remote failures, while write-time normalization prevents temporary captures or untrusted URLs from leaking into persisted nutrition records.

**How to apply:** When adding an image provider, update the client and server host allowlists and their rejection tests together. Store only the URL and provenance class; never store image bytes in diary data.

Curated foods with bundled canonical assets should not carry remote provider image URLs, and provider recipe pages should clear a reused normalized image URL from later recipes so a fallback is shown instead of a misleading dish photo.

**Why:** Query-string variants can point to the same underlying photo, and a remote image that does not belong to the named food weakens trust even when the nutrition data is correct.

**How to apply:** Compare provider URLs after removing query/hash variants, keep the first recipe image across the accumulated paginated catalogue, and mark later duplicates unavailable; keep bundled curated food imagery local and canonical.

Dashboard inspiration cards should support native horizontal swiping plus visible previous/next controls for web reliability; detail actions should hand off through a one-time route parameter and open the existing recipe detail sheet.

**Why:** Nested horizontal gestures are inconsistent in browser previews, while the shared detail flow preserves attribution, nutrition confidence, and review behavior.

**How to apply:** Keep the card itself swipeable, make “View details” the explicit navigation target, and clear the recipe handoff after the Recipes screen consumes it.

Restaurant representative-image categories must be derived from the menu item name only, never the restaurant brand, and the representative disclaimer must be visible on result cards as well as detail views.

**Why:** Brand names such as coffee shops or taco chains can misclassify unrelated menu items, while an accessibility-only disclaimer is not visible to most users before selection.

**How to apply:** Give serving-format matches priority over ingredient keywords, keep provider nutrition separate from local presentation imagery, and show a compact visible representative badge wherever a restaurant photo appears. For uncategorized branded items, use a neutral local mark rather than an unrelated food fallback.

Restaurant diary entries may carry a stable local asset identity in the `restaurant:<category>` namespace so the diary repeats the same representative category image without persisting a provider URL. The diary thumbnail must keep the representative badge and accessibility wording; restaurant nutrition must remain labeled as Restaurant verified rather than USDA verified.

**Why:** A late provider response or a generic canonical-food lookup must not replace the selected restaurant item with another item's photo, and FatSecret attribution should not be silently collapsed into a different provider.

**How to apply:** Build the asset identity from the selected provider detail, validate the detail against the selected source before accepting it, and reject malformed FatSecret source IDs before provider egress.

Program discovery sheets should use the selected Program's preferred planner pool for the hero and meal preview strip, while keeping the copy and nutrition controls authoritative.

**Why:** Program-specific visual examples make strategy selection concrete without inventing separate nutrition data or implying that photography is a nutritional claim.

**How to apply:** Resolve one preview meal per meal type through the canonical planner catalog, use the existing bundled-image and fallback pipeline, and keep the previews representative rather than authoritative.

Program chooser heroes need an explicit unique meal identity for each Program, selected from that Program's filtered pool rather than simply taking the first ranked catalog meal.

**Why:** Ranking scores can legitimately converge on the same top meal across different strategies, which makes distinct Programs look visually interchangeable.

**How to apply:** Keep the hero identity map shared with the planner pool definitions, validate every mapped meal remains available after Program filters, and test canonical image-key uniqueness across the complete Program set.

Reusable meal-image wrappers must apply caller layout styles after their internal surface styles so full-bleed `absoluteFill` callers retain absolute positioning.

**Why:** A base `position: relative` style applied last can collapse an absolutely filled hero wrapper while overlays continue to render, producing an empty-looking image card.

**How to apply:** Put the component’s structural surface styles first in the style array and the caller-provided layout style second; cover full-bleed image surfaces in visual verification.