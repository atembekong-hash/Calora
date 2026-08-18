# Calora comprehensive user-flow QA

**Date:** 2026-08-18  
**Environment:** Expo web preview, mobile-sized browser (400 × 720), isolated local browser state  
**Safety boundary:** Existing user data was not deleted. Destructive account, billing, and referral operations were not performed.

## Overall result

Web-capable user journeys passed unless noted below. The full automated suite and TypeScript check also passed. Native hardware, external account, and sandbox-gated journeys are intentionally listed as blocked—not passed—until tested in the required environment.

## Browser-verified journeys

| Area | Result | Evidence / notes |
| --- | --- | --- |
| Fresh launch and hydration | Pass | A fresh context reached onboarding without a crash or recovery screen. |
| Onboarding and consent | Pass | All five steps, goal selection, back navigation, valid measurements, activity/diet choices, consent gate, completion, and refresh persistence worked. |
| Authentication screens | Pass / blocked | Sign-in, sign-up, forgotten-password validation, expired-reset state, verification screen, and invalid callback state rendered safely. Live email delivery, account creation, and OAuth are blocked on external credentials/providers. |
| Invite landing | Pass | A safe test code rendered the invite landing page without redemption. |
| Today and diary | Pass | Date navigation, quick logging, blank manual-add validation, add/edit/remove of QA data, mood logging, recipe detail/return, Planner, Coach, and Profile shortcuts all worked. |
| Water rapid tap | Pass | A single real browser `dblclick` added exactly one 8 fl oz increment. Sequential automation clicks are not a valid rapid-tap test because they can exceed the 1.5-second guard window. |
| Scanner alternatives | Pass / blocked | Text and voice-description review flows worked; receipt flow correctly explained its web limitation. Camera, barcode, microphone, and library behavior are device-only. |
| Living Memory | Pass | QA-only signal correction and forget confirmation worked; the short-lived undo affordance was displayed. |
| Planner navigation and shopping overlay | Pass | Week/day navigation, item details, edit mode, and shopping-list open/close worked. Plan generation and mutations were not exercised because no QA-only plan item was available. |
| Recipes | Pass / limited | Search/filter, recipe details, serving adjustment, and diary logging worked. The save state and shopping-save confirmation could not be conclusively observed without modifying non-QA data. |
| Progress and weight | Pass | Overview, Trends, Weight, chart range, valid local weight save, edit cancel, and invalid text validation worked. `/progress` is not a valid route; the implemented screen is `/insights`. |
| Profile | Pass / limited | You, Membership, Account, preferences, units persistence, reminder controls, Health status, profile-edit cancel, and web photo control rendered correctly. |
| Coach | Pass / limited | Landing, starter prompts, safe custom message, allowlisted action cards, history drawer, and new chat worked. Clear-history confirmation was not exposed and was not forced. |

## Native or connected-service prerequisites

These require a real test device, a configured provider, or sandbox/test account before they can be passed:

- Camera, microphone, photo library, and barcode capture.
- Apple Health and Health Connect authorization, reads, writes, and sync.
- Live OAuth callback and email verification/password-reset delivery.
- RevenueCat purchase, restore, billing management, and membership changes.
- Referral claim/redemption and reward issuance.
- Account deletion using a dedicated test account.
- Scheduled notification delivery and permission behavior.
- Planner generation/offline fallback with an explicitly disposable generated plan.

## Temporary test data

The isolated browser session created the following minimal test state:

- `QA Core Snack` (left in the test browser diary)
- `QA Core Citrus Bowl` (created, edited from 145 to 150 kcal, then removed)
- `QA Core chicken rice bowl with vegetables` (created through text capture; later removed through the QA-only Memory flow)
- `QA Core voice rice bowl with vegetables` (reviewed and dismissed, not saved)
- A local 75.4 kg weigh-in
- An `Air fryer patatas bravas` recipe diary entry
- A Coach conversation-only QA prompt

## Diagnostics and regression checks

- `pnpm --filter @workspace/calora exec tsc --noEmit` — passed.
- `pnpm --filter @workspace/calora test -- --run` — passed: 40 files, 771 tests.
- Expo and API development workflows were running throughout the campaign.
- API requests for capture, recipes, and Coach completed successfully. Recipe-search request aborts were observed when search input changed quickly; no user-visible failure or server crash resulted.
- Browser output contained only known non-blocking Expo/React deprecation and web-capability warnings.