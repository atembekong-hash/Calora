# 232 — Calora Free Signed-In Plus Access Remediation Report

**Date:** 2026-10-19
**Status:** Implemented and locally validated; not yet merged or deployed at the time of this report
**Scope:** Authenticated access to the Recipes → Plus catalogue and its protected recipe-detail endpoints

## Trigger and policy decision

A signed-in Android user saw **“Sign in for Plus recipes — Your session ended. Sign in again.”** on the Plus pane. The owner clarified the intended product policy during this remediation: **every signed-in Calora account must have free access to Plus recipes**. This report records the implementation of that explicit policy. It does not change billing, subscription products, Restore Purchases, or other subscription-specific benefits.

## Root cause

The Plus API (`/v1/premium-recipes` and `/v1/premium-recipes/:sourceId`) authenticated the Supabase bearer token, then required an active RevenueCat `caloraapp_pro` entitlement. A correctly signed-in account without that entitlement received HTTP `403`.

The mobile client grouped HTTP `401` and `403` together as an authentication failure, then rendered a false “session ended” message and a Sign in button. Therefore, a valid session was presented as expired, and the catalogue was inaccessible despite the account being signed in.

## Implemented remediation

### API policy

`artifacts/api-server/src/routes/premiumRecipes.ts` now treats Plus recipes as an authenticated Calora benefit:

- A missing or invalid bearer token still returns `401` with the existing sign-in recovery path.
- The prior RevenueCat entitlement lookup, verified-entitlement cache, and `403` paid-entitlement denial were removed from the Plus recipe authorization path.
- Per-account and per-IP limits, account-deletion fencing, provider input validation, provider failure handling, and `Cache-Control: private, no-store` remain intact.
- Subscription/RevenueCat code remains in place for subscription-specific flows; this change only removes it from recipe-catalogue authorization.

### Mobile policy

`artifacts/calora/app/(tabs)/recipes.tsx` now treats only HTTP `401` as an expired-session state. The stale client behavior that treated `403` as a sign-out was removed. Since the server no longer emits `403` for a signed-in user’s Plus catalogue request, an authenticated account proceeds to the catalogue request rather than being redirected toward sign-in.

The same status separation was applied to route and saved-recipe reliability helpers so stale authorization semantics cannot reintroduce the false session-ended UI.

## Validation

All validation below used isolated/offline test configuration; no user data, subscription, provider credential, purchase, deployment, or native build was changed.

| Validation | Result |
|---|---:|
| Focused client Plus suites | PASS — 44 tests |
| Focused API Premium route suite | PASS — 32 tests |
| Complete Calora client suite | PASS — 161 files / 1,776 tests |
| Complete API offline suite | PASS — 41 files / 506 tests |
| Calora TypeScript check | PASS |
| API TypeScript check | PASS |
| `git diff --check` | PASS |

The complete API suite initially loaded two test modules without their required inert AI integration environment variables. Those were test-process configuration omissions before any route test executed. Rerunning with a loopback AI base URL and a non-secret placeholder key produced the passing 506-test result above; no external AI request was made.

## Required production verification after merge

1. Sign in with a non-subscriber Calora account.
2. Open Recipes → Plus and verify that recipes load without a RevenueCat entitlement.
3. Open a Plus recipe detail and verify it loads while signed in.
4. Sign out and verify that Plus remains protected by the existing `401` sign-in recovery state.
5. Verify that account/IP throttling, provider-unavailable messaging, and image fail-closed behavior remain accurate.

## Boundaries

- No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was triggered.
- No device interaction was performed during this source remediation.
- No RevenueCat entitlement was granted, modified, bypassed for subscription-specific features, or exposed.
- Local tests are not a substitute for post-deployment authenticated browser/native verification.
