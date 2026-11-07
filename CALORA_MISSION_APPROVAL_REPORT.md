# Calora Mission — Approval Report

## Scope implemented locally

1. **Progress → Trends → Built on trust**
   - Both trust rows are now actionable controls with accessibility labels and test IDs.
   - Each opens a compact explanatory sheet describing the evidence/source behavior.
   - The old round Living Memory/history icon was removed from the Progress header.
   - Living Memory remains available from Settings/Profile.

2. **Settings → Onboarding**
   - Existing Resume/Review onboarding controls were re-verified in the current source and covered by the existing Profile regression suite. No native build or release was initiated.

3. **Discover recipes**
   - The count label no longer claims that only the currently loaded page is the complete catalogue.
   - When the API supplies `browsePoolSize`, the UI now reports the shared browse-pool total as “recipes available to explore”; otherwise it truthfully falls back to “recipes loaded.”

4. **Generated recipe-photo stability**
   - The API canonical recipe-photo payload now applies Unicode NFKC normalization, whitespace folding, trimming, and consistent `en-US` case folding before hashing.
   - This makes equivalent web/native serialization produce the same photo identity while preserving ingredient and instruction order.

## Validation

- Calora client TypeScript: **PASS**
- API TypeScript: **PASS**
- Focused client tests: **PASS — 4 files, 88 tests**
- API recipe-media semantic test: **BLOCKED in sandbox** because the test imports the database client and this environment has no `DATABASE_URL`. No production or staging credentials were used.
- Diff hygiene: **PASS** (`git diff --check`)
- Native Android/iOS build: **NOT RUN**
- Merge/deploy: **NOT RUN** pending owner visual approval.

## Genuine mobile visual evidence

The existing authenticated isolated preview captured the live Insights route at 320, 360, 390, 412, and 430px in both themes. Representative evidence:

- [Light 320px Insights](/home/ubuntu/calora-insights-evidence/insights-top-light-320.png)
- [Light 390px Insights](/home/ubuntu/calora-insights-evidence/insights-top-light-390.png)
- [Dark 390px Insights](/home/ubuntu/calora-insights-evidence/insights-top-dark-390.png)
- [Dark scrolled feed 390px](/home/ubuntu/calora-insights-evidence/insights-feed-dark-390.png)
- [All generated Insights screenshots](/home/ubuntu/calora-insights-evidence)

Observed result: readable hierarchy, stable cards, no narrow-width clipping, and acceptable light/dark contrast in the captured states.

## Current release boundary

The checkout contains only the three intended source changes:

- `artifacts/calora/app/(tabs)/insights.tsx`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/api-server/src/lib/recipe-media.ts`

The work is intentionally **local-only and uncommitted**. Please review the screenshots and approve or request changes before any protected PR, merge, or Railway deployment.
