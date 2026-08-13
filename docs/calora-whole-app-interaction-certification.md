# Calora whole-app interaction certification

**Scope:** Supported Expo web preview on mobile (402×874) and desktop (1280×900), after the Profile certification. This report records observed behavior, not assumptions about native capabilities.

## Readiness verdict

**Supported web-preview journeys: certified.** The routes and controls listed below were exercised from normal user context, including safe retry, dismissal, persistence, and direct-route recovery where applicable. Device, store, OS, and provider flows remain blocked until they receive the required real-device or authorized-provider evidence.

## Interaction map and live validation ledger

| Area | Live evidence | Result |
| --- | --- | --- |
| Onboarding | Goal, activity, diet, profile values, Back, progress, consent-disabled entry, and completion were exercised. | Passed |
| Shared tabs and navigation | Home, Recipes, Scan, Progress, and Planner tabs remained reachable at mobile and desktop widths; routed Coach, Memory, auth, invite, and direct-route Back paths were exercised. | Passed |
| Home and diary | Date navigation, water repeat guard, mood, verified-food logging, diary edit, manual quick add, Coach round trip, reload persistence. | Passed |
| Scan web fallback | Permission state, typed description, review, include/remove, serving edit, cancel/retry, approval to diary, Voice/Receipt fallback guidance, Coach round trip. | Passed |
| Recipes | Search/category navigation, recipe detail close, serving stepper, ingredients shopping sheet, diary log, plan picker, bookmark save/remove, reload persistence. | Passed |
| Planner | Day/week/Today navigation, detail, shopping check, edit mode, planned-meal edit, custom meal, safe action dismissal, reload persistence. | Passed |
| Insights | Main/empty-safe rendering, weekly indicator, Coach navigation and reload. The 7D label is now an honest indicator rather than a nonfunctional range control. | Passed |
| Coach | Consent, weekly read, empty composer guard, prompt/composer send path, menu open/close, New chat and Back. | Passed |
| Living Memory | Natural entry, correction cancel/save, forget confirmation, Keep, confirm, in-place Undo, and return. | Passed |
| Auth and recovery | Sign-in, sign-up, forgot/reset/verify-email validation and recovery UI, password visibility, keyboard submit, resend state, direct-route Back. | Passed in unauthenticated preview |
| Invite and error recovery | Benign invite route and deep-link/store fallback rendered safely; onboarding hydration error UI was source-mapped. | Passed / provider action blocked |

## Repairs found during certification

1. **Manual quick add silently ignored invalid input.** It now explains whether the food name or calorie value needs correction, clears the message while editing, and successfully adds a valid retry.
2. **Recipe bookmarks could open the card instead of toggling save.** The interactive card and bookmark are now separate press targets; save, remove, no-unwanted-modal behavior, and reload persistence were retested.
3. **Insights displayed a fake 7-day range control.** It is now a non-interactive last-seven-days indicator, so it does not advertise unavailable behavior.
4. **Shared Back was inert from direct routes.** The shared header now returns to the tab shell when no navigation history exists; direct `/auth/sign-in` and `/memory` verification passed with no unhandled-back warning.
5. **Malformed sign-in email reached the server as a generic credentials failure.** Sign-in now rejects malformed email locally with clear inline guidance, matching the other auth forms.

## Accessibility and resilience evidence

- Primary actions use accessible labels across the exercised paths; disabled and loading paths were checked for final onboarding consent, water confirmation, empty Coach composer, Scan text submission, and auth submission.
- Mobile and desktop sweeps found no observed overlapping or unreachable primary controls on the covered routes.
- Local diary, plan edits, bookmark removal, manual food additions, and profile-adjacent local state survived reload in their tested journeys.
- Automated gates passed after the interaction repairs: **TypeScript typecheck clean** and **772/772 Vitest tests passed**.

## Reproducible verification

Run from the workspace root:

```sh
pnpm --filter @workspace/calora run typecheck
pnpm --filter @workspace/calora test
git diff --check
```

Targeted browser evidence covered the five repaired controls:

- Manual food: blank-name and non-positive-calorie feedback, correction, successful retry, and persistence.
- Recipe card: explicit **Save** and **Remove** controls do not open detail, and removal survives reload.
- Insights: the 7D label has no button semantics.
- Shared header: direct `/auth/sign-in` and `/memory` Back controls return to Home without an unhandled-navigation error.
- Sign-in: malformed addresses receive local inline guidance before a credential request.
- Known non-blocking preview warnings: Expo notifications web limitations, deprecated React Native Web `pointerEvents`/shadow styles, RevenueCat browser-preview logs, and a password input outside a native HTML form.

## Explicitly blocked or out of scope

- Camera, barcode, microphone, photo-library, audio recording, native haptics, notification delivery, sharing, backgrounding, platform assistive technology, HealthKit/Health Connect, and store purchase flows require device or provider evidence.
- External OAuth success, real authenticated account operations, authorized referral redemption, account deletion, and real purchase/subscription proof require authorized accounts or services.
- Existing focused tasks retain ownership of chart/deletion races, goal-celebration edge cases, OAuth error handling, account deletion, recipe-carousel edge behavior, referral/subscription proof, and real-device release journeys.
