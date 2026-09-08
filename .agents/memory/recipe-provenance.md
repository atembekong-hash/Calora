---
name: Recipe provenance
description: Product boundary for imported, personal, and verified recipe data.
---

Imported open-source recipes are discovery content, not Calora-verified nutrition. User-created recipes are local personal content and should remain distinct from imported recipes. Nutrition confidence and source attribution must stay visible whenever recipe data is browsed or logged.

**Why:** Open recipe sources provide useful cookbook breadth but do not establish verified nutrition, and blending them would undermine Calora's trust positioning.

**How to apply:** Keep source attribution, confidence, and local/imported identity explicit in recipe cards, detail views, diary entries, exports, and any future normalization or USDA enrichment pipeline.

Calora’s shared Planner catalog is a separate first-class recipe source with stable `calora-original` identities. Its existing description is shown as an “About this recipe” note; do not invent cooking steps when the catalog has none.

**Why:** Planner meals need exact detail links without becoming open-source or user-created content, while the trust boundary requires honest presentation of the catalog’s limited recipe data.

**How to apply:** Preserve `calora_catalog` provenance, estimated nutrition labeling, exact catalog IDs, and source-specific detail behavior across Discover, Planner, Saved Recipes, and future recipe normalization.