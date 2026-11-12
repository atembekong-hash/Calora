# CAL-SCAN-ACCURACY-009 — Reliable Nutrition Reconciliation

## Status

Implemented and validated on the isolated `fix/scan-accuracy-002` worktree. No provider calls, production access, database mutations, deployments, merges, or native builds were performed.

## Implemented

- Added `artifacts/calora/lib/nutritionReconciliation.ts` as a conservative reconciliation boundary.
- Added controlled food-identity normalization for singular/plural forms and token-ranked provider matches. Matching only ranks candidates; it never silently upgrades a visual estimate.
- Added provider-record reconciliation that requires complete calories and macros and a compatible serving basis.
- Added gram-based scaling when the provider supplies a verified metric gram serving. Serving quantities are scaled before the component is marked `verified_provider`.
- Preserved the original component object as the caller’s pre-reconciliation estimate and emitted a `FoodMemoryCorrection` describing the replacement.
- Preserved uncertainty when a provider record has no compatible gram basis; the helper returns a fail-closed reason rather than guessing.
- Set `servingWeightG` from the selected gram portion or the provider metric basis, and retain the provider nutrition source label.

## Existing review safeguards confirmed

The current Scan review already permits users to edit serving text, include or remove detected components, and reject invalid or unsupported serving units before saving. Existing review questions remain visible for unresolved photo estimates. This work does not remove those safeguards or claim that a photo estimate is verified.

The existing authenticated Restaurant/FatSecret flow provides concrete provider records, serving options, nutrition confidence, and nutrition-source metadata. The new module is the shared deterministic boundary for connecting those records to reviewed capture components without inventing a match.

## Offline validation

- `lib/__tests__/nutritionReconciliation.test.ts`: **3 passed**.
  - controlled singular/plural identity matching and ranking;
  - complete provider nutrition scaled from a verified 100 g serving to 200 g;
  - fail-closed behavior for a provider serving with no verified gram basis.
- Mobile TypeScript check: **PASS** — `tsc -p tsconfig.json --noEmit`.
- Diff integrity: **PASS** for the new module and tests.
- Frozen baseline evidence from reports 247/249 was not modified.

## Remaining limitation

The current generated client contract does not expose FatSecret metric-serving metadata even though the server/provider model carries it. The helper uses a narrow compatible extension at the reconciliation boundary; the generated API contract should be regenerated or explicitly extended before wiring this into the photo-review UI. The next safe step is a local API/client contract update plus an authenticated test-provider fixture, followed by the same-image benchmark comparison. No additional paid benchmark was run in this mission.

## Recommendation

Keep visual estimates clearly labeled until the user selects or confirms a concrete provider record and serving. Do not mark a photo result as verified solely from token similarity, model confidence, or a guessed gram conversion.
