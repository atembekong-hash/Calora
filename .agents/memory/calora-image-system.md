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

**How to apply:** Give serving-format matches priority over ingredient keywords, keep provider nutrition separate from local presentation imagery, and show a compact visible representative badge wherever a restaurant photo appears.