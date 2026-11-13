# CAL-PRO-003 — Free History and Subscription-Boundary Implementation

## Implemented

- Added a dedicated **Food History** screen with date navigation, search, meal filters, daily calorie/macro totals, inline editing, deletion, and a direct Log food action.
- Registered Food History in the protected Expo Router shell and added it to More quick access.
- Added deterministic history helpers and tests for filtering, totals, invalid-number safety, and UTC date boundaries.
- Changed Plus catalogue browsing so signed-out and Free users can browse provider-backed recipes. Provider requests remain protected by persistent IP/account rate limits.
- Kept complete Plus recipe detail access entitlement-protected; the server still requires Pro for the detail endpoint.
- Added a migration and server module for atomic successful-operation allowances with idempotency keys, pending reservations, finalization, and release on failed operations.
- Added the approved Free allowance constants: one successful daily photo scan, barcode scan, nutrition-label scan, receipt scan, voice log, and recipe creation; three successful daily Coach messages; and two successful weekly meal-planner generations.

## Deliberate boundary

Numerical Pro fair-use limits were not activated. The source marks them as pending owner approval, as required by the subscription decision. No new Pro paywalls or database records were created by this task.

## Validation

- Mobile Food History + Recipes tests: **55 tests passed**.
- Mobile TypeScript validation: **passed**.
- API subscription-policy tests: **2 tests passed**.
- API TypeScript validation through the repository TypeScript compiler: **passed**.
- Formatting/diff check: **passed**.

## Remaining approval / release work

The successful-operation allowance module is migration-ready but is not yet wired into every paid-provider route because that requires selecting and approving the final Pro fair-use policy and defining each route's durable idempotency contract. No production migration, deployment, native build, or store submission was performed.
