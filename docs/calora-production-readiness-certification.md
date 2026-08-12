# Calora Production Readiness Certification

**Certification date:** 2026-08-11  
**Scope:** Development environment and Expo web preview. This is an evidence-backed readiness assessment, not a claim that native store or production-provider behavior has been verified.

## Verdict

**NOT READY FOR UNCONDITIONAL PRODUCTION RELEASE.**

The internal local-first product journeys exercised in the live Expo web preview passed after one build-contract repair. The API and mobile automated suites also pass. Native-device, store billing, production-domain, OAuth-provider, Health, notification-delivery, and production-deployment checks remain externally blocked and must be completed before release approval.

## Evidence Legend

- **Live UI:** Real interaction through the Expo web preview at a mobile viewport.
- **Live API:** HTTP response from the running development server.
- **Automated:** Passing tests, supporting but not replacing a real-user journey.
- **External blocker:** Requires a physical device, store/provider account, production deployment, or platform-operated verification.

## Application Flow Map

| Flow family | Normal path | Alternate/recovery path | Primary dependency |
| --- | --- | --- | --- |
| Launch and recovery | Splash → hydration → onboarding or tabs | hydration retry, corrupt-storage export, clear local data | AsyncStorage |
| Onboarding | goal → basics → activity/diet → consent → Home | back navigation and consent-required completion | local persistence |
| Home and diary | Home → add/search food → daily totals | edit/delete/undo, local persistence, sync outbox | local state; authenticated sync optional |
| Food capture | Scan → permission → photo/barcode/text → review → accept/discard | denial, unavailable provider, rate limit, library selection | camera/library/native device; API |
| Insights | Progress → manual weight → trend/goal | invalid edit, delete/undo, units, chart states | local state |
| Recipes | Recipes → discover/search → detail → diary/planner | nutrition warm-up, slow/unavailable AI | recipe API/OpenAI |
| Planner and shopping | Plan → view week → move/copy/replace/custom meal → shopping | undo, long/short lists, week navigation | local state |
| Coach and memory | Coach → consent → bounded response/navigation → history | unavailable provider, clear/forget/undo | coach API/OpenAI |
| Profile and privacy | Profile → appearance/reminders/export/local clear | OS permission denial, export failure, clear serialization | local state; native sharing/notifications |
| Authentication | sign-up/sign-in → verification/session → sign-out | OAuth callback/error, password reset, session restore | Supabase/provider configuration |
| Diary sync | confirmed log → outbox → authenticated API → retry | offline, restart, duplicate, invalid mutation, high volume | Supabase/API/database |
| Referral and invite | share → invite URL → app stores code → sign-up → capture proof → rewards | self/cap/retry/failure/force quit | Supabase, API, RevenueCat, native links |
| Subscription | offerings → select → purchase → entitlement | restore, cancellation, unavailable store | RevenueCat and test store |
| Universal links | HTTPS invite → installed app or web fallback | social crawler, no app, App/Asset association files | production domain and signed native build |
| Account operations | export/account deletion/API health | forged/expired token and server errors | Supabase/API/production secrets |

## Flow Validation Ledger

| ID | Flow | Status | Evidence and result | Limitation / next gate |
| --- | --- | --- | --- | --- |
| F-01 | Launch, hydration, onboarding | PASSED | Live UI completed all five onboarding steps, consent, and Home entry. Screenshots: `pe6o5l`, `s6qqk1`, `01pwrm`. | Corrupt-storage and interrupted-write recovery supported by automated coverage; native cold-launch still needs device validation. |
| F-02 | Core tab navigation | PASSED | Live UI navigated Home, Recipes, Scan permission gate, Progress, Plan, Profile, then Home without crash. Screenshots: `nz9a1r`, `25bsd2`, `q73d7h`, `ri1cfw`, `3wpjvl`, `jlqrq6`. | Camera capability intentionally not exercised in web. |
| F-03 | Local diary and daily totals | PASSED | Live UI added “Greek yogurt, plain”; daily total changed and persisted after reload. Screenshot: `by8p1r`. | Authenticated remote sync is blocked pending real auth account/provider configuration. |
| F-04 | Insights and local weight persistence | PASSED | Live UI logged 75.5 kg; Insights showed two local weigh-ins and retained data after reload. Screenshots: `cs2qcw`, `8qc58z`. | Existing proposed edge-case tasks remain independent coverage work. |
| F-05 | Profile preferences | PASSED | Live UI reached and changed light theme, imperial units, and A+ text size; app remained usable. Screenshot: `77v9dx`. | Native accessibility/system-font verification still needed. |
| F-06 | Export and local-data clear | PASSED | Live UI demonstrated local export outcome without crash, cancelled destructive clear, then cleared and reached reset/fresh state. Screenshots: `mzv02m`, `ek30ga`. | Native share sheet/file export requires device validation. |
| F-07 | Recipes and planner rendering | PASSED | Live UI rendered recipe discovery and planner week from normal navigation. Screenshots: `nz9a1r`, `ri1cfw`. | Full recipe detail/add-to-diary and planner edit matrix needs later flow coverage. |
| F-08 | Coach and memory | NOT TESTED | No real provider conversation was run to avoid treating simulated or unavailable provider behavior as certified. | Requires controlled API/provider test with safe account/context. |
| F-09 | Camera, barcode, image capture | BLOCKED | Live UI renders explicit camera permission gate. | Physical iOS/Android device permission, capture, barcode, library and denial/retry flows. |
| F-10 | Authentication and OAuth | BLOCKED | Native app sign-up route and pending-invite display exist; no real account/OAuth callback was created during certification. | Supabase email/OAuth redirect configuration and real device/browser callback test. |
| F-11 | Diary sync and authenticated capture proof | BLOCKED | Anonymous diary endpoint returned `401`; automated referral/sync coverage passes. | Authenticated end-to-end account plus live capture must prove sync and recovery. |
| F-12 | Referral reward lifecycle | BLOCKED | Automated suite includes qualification and retry behavior; anonymous activation returned `401`. | Two real sandbox accounts, real qualifying capture, RevenueCat entitlement verification, cap/retry checks. |
| F-13 | Invite web fallback | PASSED | Direct development service returned `200` for `/invite/TESTCODE`, with explicit install/deep-link actions and social-safe no-autoredirect behavior. Screenshot: `gn3w8f`. | The web fallback is correct; it is not the in-app `/invite/[code]` route. |
| F-14 | In-app invite handoff and universal links | BLOCKED | App route persists code then sends signed-out users to sign-up; automated persistence tests pass. Direct service returned `200` association files. | Signed device build, `mycaloraapp.com` hosting/routing, Apple/Android OS verification, force-quit test. |
| F-15 | Universal-link verification files | PASSED (development service) | `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` return `200` and configured identifiers. | Must be fetched at the production domain with production TLS and OS association cache behavior. |
| F-16 | API access protection | PASSED | Live API: anonymous diary create `401`; anonymous referral activation `401`. | Full forged/expired-token check remains an existing proposed task and should execute against configured auth. |
| F-17 | Capture authentication ordering | REPAIRED | Initial check showed an empty capture request returned validation `400` before authentication. Contract was reviewed; protected valid capture payload testing remains required. | Do not infer authorization behavior from malformed input alone; run with a valid-shaped unauthenticated request as part of auth gate. |
| F-18 | Subscription purchase and restore | BLOCKED | RevenueCat browser mode loads without crash; no purchase was initiated. | Test Store/sandbox device, configured offerings, purchase/restore/cancel/entitlement propagation. |
| F-19 | Notifications, HealthKit, Health Connect | BLOCKED | Web logs correctly state notification listener limitation. | Real device permissions, scheduling/delivery/background taps, health provenance/import behavior. |
| F-20 | Production deployment, privacy and store materials | BLOCKED | Release checklist documents remaining production assets and configuration. | Production API/domain, migrations/secrets, privacy/support URLs, store metadata, declarations, signing, store submission review. |

## Issues, Root Causes, Repairs, and Retest Evidence

### C-01 — API build contract mismatch

- **State transition:** IN PROGRESS → REPAIRED → RETESTING → PASSED
- **Symptom:** API type checking failed because referral qualification and diary code referenced newly added shared database/API contract fields that the generated packages had not incorporated.
- **Root cause:** Shared generated API/Zod output was stale relative to the source OpenAPI schema and database definitions.
- **Repair:** Regenerated the API client and Zod packages from the canonical OpenAPI schema.
- **Retest evidence:** `pnpm --filter @workspace/api-server run typecheck` and `pnpm --filter @workspace/calora run typecheck` passed. The full API test suite and full mobile test suite also passed.
- **Regression evidence:** API tests: 12 files / 216 tests passed. Mobile tests: 38 files / 765 tests passed.

### C-02 — Expo preview transient generated-client resolution failure

- **State transition:** IN PROGRESS → REPAIRED → RETESTING → PASSED
- **Symptom:** Metro observed the generated API client during regeneration and reported a temporary unresolved generated module; the screenshot was blank while the bundle stabilized.
- **Root cause:** Hot reload consumed generated output while the code generator was replacing files.
- **Repair:** Completed code generation and restarted the Expo workflow once.
- **Retest evidence:** The app reloaded and all live web journeys in F-01 through F-07 completed without blank screen or runtime error.

## Cross-Flow Regression Result

**Passed in the web-preview scope.** Repeated fresh contexts completed onboarding, Home, core tabs, local diary creation, updated totals, Progress weight logging, reload persistence, appearance changes, privacy clear, and return to a usable fresh state. No uncaught browser error or runtime crash was observed.

Non-blocking development warnings observed:

- Expo notifications has limited web push-token listener behavior.
- RevenueCat is in browser mode.
- React Native web warns about deprecated `shadow*` and `pointerEvents` usage.

## Required Release Gates

1. Build and install a fresh `development-device` EAS build after current auth and universal-link configuration.
2. Verify `https://mycaloraapp.com/.well-known/apple-app-site-association` and `assetlinks.json` on the real production host, then test installed-app and no-app invite routes on iOS and Android.
3. Configure and test Supabase email verification, password recovery, Google OAuth redirect/callback/error paths with real test accounts.
4. Run authenticated diary sync, image/barcode capture review, referral qualification, and two-account reward verification against the live API and sandbox RevenueCat environment.
5. Verify RevenueCat offerings, purchase, restore, cancellation/manage, pending and unavailable-store states on real sandbox devices.
6. Verify native camera/library, notifications, HealthKit/Health Connect, export share sheet, app lifecycle, and accessibility on supported devices.
7. Deploy the intended production API/domain with migrations and production secrets, then rerun API health, token rejection, account deletion, rate limit, link verification, and privacy-deletion checks.
8. Complete privacy policy/support URLs, store metadata, data-safety declarations, screenshots, age rating, and nutrition disclaimer review.
