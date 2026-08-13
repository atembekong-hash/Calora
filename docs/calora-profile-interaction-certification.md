# Calora Profile interaction certification

**Scope:** Profile & settings tab and every flow it directly opens  
**Evidence environment:** Expo web preview at 402×874 and 1280×900, signed-out local user  
**Final verdict:** **Ready for the supported preview scope, with explicit native and provider blockers.**

## Interaction map

| Area | Reachable controls | Expected result |
| --- | --- | --- |
| Navigation | Home avatar, Profile tab, header Back | Profile opens; Back returns to the preceding in-app screen safely. |
| Profile editor | Edit, close, photo source, name, calorie target, diet choices, goal choices, save | Existing values initialize the form; invalid values show an inline error; a valid save updates the profile card. |
| Appearance | System, Light, Dark, A−, A, A+, Metric, Imperial | Theme, scale, and displayed units update without clipping and persist through navigation. |
| Reminders | Hydration, wake/wind-down hour/minute controls, interval choices, meal switches and times, daily-goal switch and time | Preference changes are visible; native permission refusal is explained and does not crash the screen. |
| Subscription | Monthly, annual, Continue, Restore purchases, Manage subscription, billing dialog actions | Plan selection updates the CTA; no purchase occurs without explicit confirmation; restore and management feedback is clear. |
| Referrals | Signed-out explanation; signed-in sharing, invite input, Apply | Signed-out users see the sign-in boundary; authorized/referral-service paths remain provider-backed. |
| Saved meals | Create, meal/recipe kind, numeric inputs, validation, save, delete, cancel deletion | Invalid input is explained; templates save locally; deletion is explicitly confirmed and never changes diary entries. |
| Living Memory | Review living memory | Opens the Memory route and Back returns to Profile. |
| Account | Sign in; signed-in sign-out and account deletion confirmation | Sign-in navigates to auth; authenticated actions remain authorization-backed. |
| Trust & privacy | Health data, export, clear local data, food-data/no-ads/help information | Health state does not imply a real connection; exports and clears have safe feedback/confirmation; information sheets can close. |
| About | Website, Privacy Policy, Terms, Help & Support | Shows accurate destinations and hands off to the operating system/browser. |

## Validation ledger

| Control or flow | Final state | Evidence |
| --- | --- | --- |
| Profile entry and Back | **PASSED** | Opened from Home avatar and returned safely via header Back. |
| Profile form validation and save | **PASSED** | Blank name and out-of-range calorie target showed the inline error; valid name, calories, diet, and goal updated the card. |
| Profile photo camera/library/remove | **BLOCKED** | Requires a real mobile camera/photo-library permission flow and device filesystem evidence. |
| System, light, and dark theme | **PASSED** | Each mode visibly changed; System restored after test. |
| Text size and units | **PASSED** | A−/A/A+ and Metric/Imperial worked; A+ stayed readable and unclipped at desktop width. |
| Hydration, meal, and goal reminders | **PASSED WITH DEVICE LIMITATION** | Toggles and time controls updated. The web environment denied notifications and showed explicit permission-required feedback; delivery needs device proof. |
| Subscription plan selection | **PASSED** | Monthly and annual selections updated the CTA. |
| Purchase confirmation and cancellation | **BLOCKED** | The safe pre-purchase confirmation appeared; store sheet/charge was intentionally not approved. |
| Restore purchases | **PASSED IN PREVIEW** | Returned “No previous purchases were found” without error. Real entitlement proof remains provider-backed. |
| Manage subscription | **PASSED IN PREVIEW** | Informational management dialog appeared and closed. Native store settings requires device proof. |
| Referral signed-out state | **PASSED** | Sign-in explanation rendered. Signed-in sharing/redeeming needs an authorized test account. |
| Saved-meal invalid input and creation | **PASSED** | Empty submit showed validation; a safe template saved and rendered. |
| Saved-meal delete: keep and confirm | **REPAIRED → PASSED** | New in-app confirmation preserved a template on Keep, then removed it only after Delete template. |
| Living Memory route | **PASSED** | Opened `/memory`; Back returned to `/profile` without mutation. |
| Account sign-in | **PASSED** | Routed to `/auth/sign-in` and returned safely. |
| Sign-out and delete-account | **BLOCKED** | Require an authenticated test account; account deletion additionally depends on server configuration and is separately tracked. |
| Health data action | **REPAIRED → PASSED** | Opens an honest “not connected” information sheet and does not claim data sync without authorization. Legacy persisted `healthConnected: true` is normalized to false during hydration. |
| Export | **PASSED FOR UI BOUNDARY** | Status/disabled behavior displayed correctly. File share-sheet handoff requires device evidence. |
| Clear local data | **PASSED FOR SAFE BRANCH** | Permanent-action warning appeared; Keep my data dismissed it without clearing. The confirmed destructive path was not run against shared test state. |
| Food-data, no-ads, and help sheets | **PASSED** | Each opened and dismissed while remaining on Profile. |
| Website, policy, terms, and support links | **BLOCKED** | Correct labels/destinations are visible; external navigation was not followed in the shared preview. |
| Rapid repeated theme selection | **PASSED** | Repeated System selection caused no duplicate action or error. |
| Modal keyboard/focus behavior | **PASSED WITH WEB CAVEAT** | Labeled controls were reachable and Escape closed the profile editor. Some React Native Web modal controls have unstable accessibility-tree targeting after repeated dialogs, but end-state behavior passed in fresh sessions. |

## Repairs made

1. **Saved-template delete was inert in the web preview.** It depended on a native alert that never appeared in React Native Web, so a user could not confirm or cancel removal. It now uses an accessible in-app confirmation dialog, preserving the safe cancel path and making it clear that diary entries are unaffected.
2. **Health data could claim a connection before authorization existed.** The former Connect action toggled a persisted connected state even though HealthKit and Health Connect are not wired into this build. Legacy `healthConnected: true` storage is now normalized to `false` during hydration, and the action opens an explanation that no health data has been read and that a future connection requires device permission.

## Responsive, accessibility, and resilience findings

- **Responsive:** no clipping or overlap at mobile 402×874 or desktop 1280×900; A+ text scale remained readable at desktop width.
- **Appearance:** System, Light, and Dark modes rendered successfully.
- **Accessibility:** user-facing press targets exercised in the preview have labels for core actions and destructive confirmations. Existing React Native Web warnings about `pointerEvents` and deprecated shadow props did not cause functional failures.
- **Resilience:** repeated theme taps were safe; reminder permission denial was explicit; billing did not initiate a purchase without confirmation; destructive local-data clear stayed behind a confirmation.

## External blockers

- Native camera and media-library profile photo flow.
- Native notification permission and actual scheduled reminder delivery.
- Native share and exported-file handoff.
- Store purchase, store subscription management, and real RevenueCat entitlement restoration.
- Signed-in referral, sign-out, and account-deletion flows using an authorized test account.
- External website, policy, terms, and support URL handoff.

## Regression evidence

- Targeted Calora tests: **132 passed** across health-connection migration, profile-photo storage, export, and local-data-clear coverage.
- End-to-end re-test: saved-meal deletion confirmation, health-state honesty, information-sheet dismissal, and clear-local-data cancellation all passed in a fresh browser session.
- TypeScript project check remains blocked by four pre-existing `AuthContext.tsx` Supabase `null`-error typing mismatches; no Profile-file error was reported.