# Mission 203 — Calora Complete Image Integrity Remediation

## Scope

Application-wide remediation of food-image correctness, generated recipe media lifecycle, barcode identity, stale media races, and fail-closed rendering. No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was triggered.

## Root causes confirmed

1. Generated recipe media could be stored or refreshed without an explicit accepted review state, allowing an image locator to be treated as renderable before review.
2. Generated-media completion and failure updates were not consistently bound to the claimed generation attempt, allowing stale provider completions to overwrite newer state.
3. The client refresh scheduler could attempt signed-URL refreshes for media still awaiting review.
4. Food-log rendering fell back to generic category photographs for records without verified item-specific evidence. A generic food photo is unsafe because it can depict the wrong meal.
5. Unverified provider image evidence could still reach the image renderer instead of failing closed.
6. Barcode provider responses were not uniformly rejected when the returned product code differed from the scanned code.
7. Accepted generated media did not immediately fetch and persist a newly issued signed locator after review, leaving the UI without the accepted image until a later lifecycle event.

## Implemented fixes

- Generated recipe signed URLs now require `semantic_review_state = 'accepted'`.
- Generated-media completion and failure transitions are attempt-bound, preventing stale jobs from changing the active generation.
- Generated recipe UI renders generated photos only after explicit acceptance.
- Accepted image review immediately requests and stores a fresh signed locator.
- The refresh scheduler skips explicit `needs_review` and `rejected` states while preserving legacy accepted/generated behavior where review state is absent.
- Planner and diary image evidence retain generated locators only for accepted media.
- Food-log thumbnails fail closed to a clear “No photo” state for fallback and unverified evidence; generic category photographs are no longer used as food identity substitutes.
- Barcode candidates require exact normalized identity when the provider returns a product code.
- Added regressions for barcode mismatch rejection, no-photo rendering, accepted-review refresh, and review-gated refresh suppression.

## Validation evidence

- Calora image/lifecycle regressions: **47 tests passed**.
- API capture, sync, and diary regressions: **118 tests passed**.
- Calora TypeScript check: **passed**.
- API-server TypeScript check: **passed**.
- `git diff --check`: **passed**.
- Repository-scoped change: **11 files, 65 insertions, 42 deletions** after formatter churn was removed.
- Database-backed recipe-media integration tests were not run locally because this sandbox has no `DATABASE_URL`; protected CI remains the authoritative database integration environment.

## Device validation boundary

The source and API behavior are covered by automated tests. Physical Android/iOS camera, image-library, caching, and native image-decoding behavior still requires the user's normal signed-device testing. No native build was triggered.

## Release status

This report is part of the protected release commit for the remediation. Merge and Railway deployment evidence will be recorded in the final task response after protected CI and production release verification complete.
