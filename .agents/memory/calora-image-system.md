---
name: Calora image system
description: Visual hierarchy and fallback rules for extending Calora imagery beyond editorial headers.
---

Calora imagery should be purposeful: editorial photography belongs on headers and detail views, food photography supports recipe/planner discovery, and small branded crops or illustrations support empty states. Data-heavy surfaces should use imagery as texture, never as the primary content.

**Why:** The app benefits from a richer, premium visual rhythm, but trust, nutrition numbers, provenance, and actions must remain more prominent than decoration.

**How to apply:** Prefer bundled local assets and branded fallbacks when remote food images are absent. Keep overlays dark enough for readable text, preserve stable image aspect ratios, and leave Smart Scan camera UI visually focused unless explicitly redesigned.

Dashboard inspiration cards should support native horizontal swiping plus visible previous/next controls for web reliability; detail actions should hand off through a one-time route parameter and open the existing recipe detail sheet.

**Why:** Nested horizontal gestures are inconsistent in browser previews, while the shared detail flow preserves attribution, nutrition confidence, and review behavior.

**How to apply:** Keep the card itself swipeable, make “View details” the explicit navigation target, and clear the recipe handoff after the Recipes screen consumes it.