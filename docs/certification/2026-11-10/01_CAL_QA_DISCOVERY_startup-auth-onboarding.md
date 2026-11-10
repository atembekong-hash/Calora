# CAL-QA Discovery — startup-auth-onboarding

**Report ID:** `startup-auth-onboarding`
**Inspection date:** 2026-11-10
**Inspected repository:** `/tmp/calora-m417-main`
**Inspected source SHA:** `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`
**Framework:** `/home/ubuntu/upload/CALORA_AUTONOMOUS_MISSION_FRAMEWORK_V3.txt`
**Method:** Read-only inspection of source, tests, local reports, memory notes, and artifact availability. No source edits, builds, deployments, provider calls, database access, data mutation, or native execution was performed.

## Executive verdict

**Cluster status: PARTIAL.**

The current source contains substantial startup, secure-session restoration, onboarding-resumption, callback-routing, and auth-request deduplication controls, with focused unit/source tests covering many failure and race conditions. This is not a full certification verdict. The framework requires genuine Android and iOS execution for startup/onboarding/auth acceptance, and the inspected workspace has no current signed native binaries, connected devices/simulators, authenticated provider session, or current production-serving attestation. Historical native and production reports are tied to older revisions and are not promoted to evidence for SHA `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`.

No verified current defect was established in the inspected source for this cluster. The residual status is therefore **PARTIAL / UNVERIFIED**, not VERIFIED.

## Mission classifications

| Mission | Classification | Basis |
|---|---|---|
| **CAL-QA-01 — startup and initialization** | **PARTIAL** | Current source has explicit font/splash, auth restore, account-scope, hydration, profile-sync, retry, and protected-route gates; focused tests cover delayed session reads, failed/never-resolving restore, hydration parse/I/O failures, retry, and duplicate retry. Required cold/warm first-install/returning-user/offline/slow-network/expired-session/background-resume execution on both Android and iOS was not performed. No current native build/device evidence exists. |
| **CAL-QA-02 — onboarding and first-user experience** | **PARTIAL** | Seven-step onboarding, validation, keyboard-aware fields, consent, durable step/draft persistence, completion clearing, profile reconciliation, review mode, and retry/error paths are represented in `app/index.tsx`, `CaloraContext.tsx`, `profileSync.ts`, and `onboardingScreen.test.ts`. Actual native keyboard, interruption/resume, permissions, accessibility, persistence/relaunch, and Today-entry journeys were not run. Server profile reconciliation/provider/backend evidence is not current production evidence. |
| **CAL-QA-03 — registration, sign-in, recovery, session management** | **PARTIAL** | Email/Google auth, verification, password reset, trusted HTTPS callback validation, PKCE exchange coalescing, recovery intent, deterministic post-auth navigation, encrypted session storage, logout/account switching, and server bearer verification have source/test coverage. Native callback handoff, email/provider delivery, cold-launch/force-quit links, cross-device/session expiry/revocation, and current Supabase/production execution were not verified. |

## Evidence inspected

### Startup and initialization

- `artifacts/calora/app/_layout.tsx:39-70` prevents premature splash dismissal, loads fonts, configures the API base and token refresh coalescing, and initializes RevenueCat with a guarded failure path.
- `artifacts/calora/app/_layout.tsx:235-317` provides visible `AuthRestoreBootstrap` and `AuthRestoreFailure` states. A secure-storage/session read failure is not silently treated as guest state; the user receives an explicit retry path. Account-scoped providers are keyed by authenticated user/guest scope only after auth restoration.
- `artifacts/calora/app/_layout.tsx:320-415` gates onboarding, tab shell, and application routes on auth restoration, hydration, profile reconciliation, and onboarding state; post-auth routing uses `dismissAll()` plus `replace()`.
- `artifacts/calora/context/AuthContext.tsx:101-209` uses `getSession()` with a 12-second timeout, generation protection against stale reads/events, explicit `loading`/`ready`/`failed` status, and recovery-event handling.
- `artifacts/calora/lib/__tests__/AuthContext.test.tsx:45-284` covers delayed initial reads not overwriting newer auth events, inconclusive `INITIAL_SESSION`, failed and never-resolving restore, retry, immediate adoption of email/signup/Google sessions, late empty events, refresh, and password recovery.
- `artifacts/calora/lib/__tests__/hydrationRetryIntegration.test.tsx` covers parse and I/O errors, visible retry behavior, in-flight duplicate retry suppression, error-kind correctness, autosave gating, and recovery to clean hydrated state.
- `artifacts/api-server/src/lib/startup-readiness.ts` and `artifacts/api-server/src/__tests__/startup-readiness.test.ts:7-24` cover read-only database and persistent capture-limiter readiness checks and fail-closed behavior. This is server source/test evidence, not a live production readiness probe.

### Onboarding and first-user experience

- `artifacts/calora/app/index.tsx:153-237` restores the durable onboarding step and raw draft only after hydration; it distinguishes first-run from completed-profile review and seeds saved profile fields after hydration.
- `artifacts/calora/app/index.tsx:267-321,406-415` validates personal details before completion, invokes `completeOnboarding`, gates content while hydration/profile sync is unresolved, and exposes profile-sync retry/error UI.
- `artifacts/calora/context/CaloraContext.tsx:1017-1024,1217-1346,2635-2702` normalizes persisted onboarding state, account-scopes it, reconciles remote profiles, prevents stale profile overwrites, and clears the step/draft at completion while staging authenticated profile sync.
- `.agents/memory/onboarding-resumption.md:6-10` records the intended boundary: incomplete drafts remain local/account-scoped; completed profiles reconcile from the authenticated server before routing; transport failure must not be treated as first run.
- `artifacts/calora/lib/__tests__/onboardingScreen.test.ts:21-117` checks keyboard-aware layout, stable input targets, affirmative unchecked consent, final-step completion boundary, durable completion/draft markers, sign-in escape, and hydration/reset recovery contracts.

### Authentication, callbacks, and session management

- `artifacts/calora/app/auth/sign-in.tsx:29-91,107-235` implements Google and email sign-in, input validation, loading/duplicate-tap suppression, safe callback error display, forgot-password and account creation routes.
- `artifacts/calora/app/auth/sign-up.tsx:20-96,120-247` implements email/password registration, password confirmation, age eligibility confirmation, verification redirect, pending invite display, legal links, and loading/error states.
- `artifacts/calora/lib/auth.ts:17-24,38-89,182-273` defines exact HTTPS callback origins, validates callback origin/path, handles recovery intent, coalesces duplicate PKCE exchanges, bounds concurrent exchanges, and safely replays/evicts settled results.
- `artifacts/calora/lib/postAuthNavigation.ts:35-130` makes root navigation the sole deterministic owner, keeps callbacks pending until terminal intent is known, prioritizes validated recovery, and prunes auth history after success.
- `artifacts/calora/lib/__tests__/auth_logic.test.ts:68-471` covers web/native callback selection, signup/resend/recovery callback origins, Google OAuth, concurrent and mixed callback delivery, replay TTL/account mismatch, bounded exchanges, bearer-token rejection, trusted-origin/path rejection, provider errors, and malformed email rejection.
- `artifacts/calora/lib/__tests__/postAuthNavigation.test.ts:8-90` covers ordinary auth replacement, pending callbacks, recovery routing, failed restore not becoming guest navigation, and duplicate transition suppression.
- `artifacts/calora/lib/__tests__/supabaseSessionStorage.test.ts:9-130` covers encrypted native storage, safe error categorization, web reload/session separation, PKCE verifier cleanup, and storage-unavailable behavior.
- `artifacts/api-server/src/lib/supabase-auth.ts` verifies bearer identity server-side through Supabase Auth; `artifacts/api-server/src/__tests__/supabase-auth-dedupe.test.ts:16-48` covers concurrent same-token verification coalescing. These are offline/source tests and do not prove current provider availability or production auth behavior.

## Native, provider, and production evidence gaps

1. **No current native artifact:** no current `.apk`, `.aab`, `.ipa`, or `.app` is present in the repository/artifact tree. No build was started, consistent with the read-only restriction.
2. **No native target:** `docs/native-auth-link-validation.md:6-10,39-41,229-277` records prior native execution as blocked by missing `adb`, `xcrun`, signed binaries, and devices/simulators; its matrix remains NOT RUN for Google sign-in, email verification, password recovery, force-quit callback, duplicate delivery, sign-out, account switch, and relaunch restoration. That evidence is historical and not current-SHA execution.
3. **No Android/iOS startup/onboarding execution:** no physical Android device (the framework specifies Samsung Galaxy S20 as the QA device), iOS device, emulator, or simulator evidence was available for cold/warm launch, background/resume, keyboard, interruption, permissions, or accessibility.
4. **No provider-auth execution:** no current Supabase Auth session, inbox/email verification, password-reset delivery, Google OAuth handoff, callback delivery, session expiry/revocation, or cross-device test was run. `real_auth_simulation.test.ts` is explicitly deterministic/offline simulation and cannot substitute for provider evidence.
5. **No current production provenance:** no current Railway serving SHA, live API/auth configuration, Supabase redirect allow-list readback, database profile reconciliation round-trip, or production logs were inspected. `docs/certification/2026-11-07/areas/04-backend.md:32-33,50-54` explicitly distinguishes source/readiness tests from unverified current Railway/Supabase state.
6. **Historical evidence is stale for this inspection:** prior certification reports reference older SHAs (for example `docs/certification/2026-11-07/areas/03-ios.md:8,110-127` and `areas/02-android.md:29-30`) and explicitly state that historical APK/TestFlight/device evidence cannot certify the current baseline.

## Required follow-up evidence

To move CAL-QA-01 through CAL-QA-03 to VERIFIED, execute—under separate authorized native/provider access—a fresh signed Android and iOS candidate built from SHA `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8` (or record a new exact SHA if the candidate changes), and capture build IDs, backend serving SHA, device IDs, and sanitized logs/screenshots. Run first install, cold/warm/relaunch, authenticated/unauthenticated/returning users, offline/slow network, expired/revoked session, secure-storage failure/retry, onboarding draft interruption/resume, keyboard and permission paths, email verification/password recovery, Google callback cold launch/force-quit, duplicate callback, account switch/logout, and Today entry on both platforms. Separately re-attest current Supabase redirect/provider state, profile reconciliation, and production serving identity. Do not treat unit tests, web preview, compilation, a queued build, or historical reports as substitutes for those acceptance journeys.

## Final status

**`PARTIAL` — source/test controls are materially present and cover many high-risk races and recovery paths; full startup-auth-onboarding certification remains unverified because required current native, provider, and production evidence is missing.**
