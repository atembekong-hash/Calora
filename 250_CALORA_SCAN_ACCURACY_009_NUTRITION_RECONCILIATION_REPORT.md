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
- Extended the generated API/client contract with FatSecret metric amount, metric unit, number of units, measurement description, and default-serving metadata.
- Connected the reconciliation boundary to Scan review cards. High-confidence, unambiguous matches are applied automatically; ambiguous matches remain estimates with a single `Use match` action.
- Kept reconciled nutrition as one selected serving so FoodMemory does not scale provider values a second time. Eaten fraction remains the only subsequent consumption multiplier.

## Existing review safeguards confirmed

The current Scan review already permits users to edit serving text, include or remove detected components, and reject invalid or unsupported serving units before saving. Existing review questions remain visible for unresolved photo estimates. This work does not remove those safeguards or claim that a photo estimate is verified.

The existing authenticated Restaurant/FatSecret flow provides concrete provider records, serving options, nutrition confidence, and nutrition-source metadata. The module is now connected to Scan review through the generated query hook; it only applies a match when provider nutrition is complete, the identity score is high, and the top result is not ambiguous. Unsupported or unavailable provider results leave the original editable photo estimate intact.

## Offline validation

- `lib/__tests__/nutritionReconciliation.test.ts`: **3 passed**.
  - controlled singular/plural identity matching and ranking;
  - complete provider nutrition scaled from a verified 100 g serving to 200 g;
  - fail-closed behavior for a provider serving with no verified gram basis;
  - no double scaling after provider reconciliation.
- Mobile review and nutrition regressions: **153 passed** across capture-review, FoodMemory, and reconciliation suites.
- API capture regressions: **68 passed**.
- API restaurant-food regressions: **8 passed** with a disposable localhost-only `DATABASE_URL`.
- Mobile TypeScript check: **PASS** — `tsc -p tsconfig.json --noEmit`.
- API TypeScript check: **PASS** — database and API project build validation.
- Diff integrity: **PASS** for the new module and tests.
- Frozen baseline evidence from reports 247/249 was not modified.

## Remaining limitation

The integration has not yet been exercised against a new paid same-image benchmark or a physical native build. Provider search remains dependent on the authenticated FatSecret route and its entitlement/rate limits. A provider match is not proof that the photographed food is identical; ambiguous matches and incomplete serving metadata remain estimates by design. No additional paid benchmark was run in this mission.

## Recommendation

Run the existing same-image post-correction benchmark next, after owner authorization for paid calls. Compare nutrition and portion metrics without changing the frozen baseline. Then perform native Scan review validation; no build or deployment is authorized by this mission.
