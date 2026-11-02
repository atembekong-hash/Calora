# Mission 342 — Today Dashboard Compact Grid Visual Approval

## Scope

This local-only correction preserves the locked calorie widget and refines only the supporting Today widgets. The four supporting cards use the same compact height, remain in a 2×2 layout from 360px upward, and fall back to one column below 360px or under high accessibility text scaling.

## Changes verified

- Shared supporting-card height uses `h(180)` with the existing `0.8` Today scale, rendering at 144px in the preview.
- Steps and Macro cards measured at exactly 144px at 360, 390, 412, and 430px.
- All five Mood choices remain present in one horizontal row; narrow labels can wrap to two lines without removing choices.
- Steps ring scales down on narrow cards while retaining the count, goal, label, and Connect Health action.
- Recipes for You completed cards render with image, title, calories, preparation time, and difficulty metadata in the isolated mock preview.
- No horizontal overflow was detected at any requested width.
- CalorieGauge source span is byte-identical to protected `origin/main` (SHA-256 `6fec1dab7960bc1c3a917524c352d41ddeed4767dd640ec8a5b3a134859d22ae`).

## Validation

- Focused Today suite: 39/39 passed.
- TypeScript validation: passed.
- `git diff --check`: passed.
- Visual evidence: light and dark full-page plus scrolled renders at 360, 390, 412, and 430px.
- Recipe cards use isolated mock API responses and are not evidence of production recipe API integration.

## Status

READY FOR OWNER VISUAL APPROVAL. Changes remain local and unmerged; no Railway deployment or native build was initiated.
