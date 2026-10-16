# 219 — Calora Recipes Continuity & Image Stability Remediation

**Date:** 2026-10-16  
**Scope:** Discover continuous browsing, Plus availability/infinite scroll, and Create/suggestion image flicker  
**Native-build status:** **No Android, iOS, EAS, APK, AAB, IPA, TestFlight, or store build was triggered.**

## Executive result

| Surface | Finding | Remediation | Status |
|---|---|---|---|
| Discover | The provider pool was finite and the client de-duplicated a repeated page, leaving no appendable cards once its cursor ended. | The API now cycles only unfiltered browse results, and the client assigns each intentional cycle entry a unique display identity while retaining the stable recipe ID for saving/detail actions. | **PASS — source and automated regression** |
| Plus | Live API requests consistently returned `503` because server-side RevenueCat entitlement verification failed. The UI correctly exposed the failure rather than falsely granting Plus. | Confirmed the authoritative CaloraApp RevenueCat project and entitlement; aligned Railway's `REVENUECAT_PROJECT_ID` to `proj9890aae2`. Added safe provider error classes so the next deployed API log identifies configuration, authentication, timeout, or upstream failure without exposing credentials. | **PARTIALLY REMEDIATED — live verification pending the deployed diagnostic / credential outcome** |
| Plus pagination | The catalogue had a terminal provider cursor and no graceful continuation. | Once the verified catalogue reaches the last provider page, cards intentionally repeat with a unique feed-entry key. No fabricated recipes, images, or subscription access are created. Filters reset the cycle. | **PASS — source and automated regression** |
| Create and suggestions image stability | Every successful image load wrote `rendered`; periodic reconciliation could write `url_ready` again even when the same image was already rendered, causing native image remounts and visible flashing. | Render acknowledgement is idempotent. Reconciliation preserves `rendered` when image identity and locator are unchanged, and suppresses no-op storage writes. | **PASS — source and automated regression** |

## Forensic evidence

### Discover finite-scroll mechanism

The former `/v1/recipes` response used `meals.slice(offset, offset + limit)` and set `nextOffset` to `null` after the finite TheMealDB-backed pool was exhausted. The client then merged pages through stable-ID de-duplication. When an upstream or cached pool repeated, the merge removed every repeated card and the native scroll surface had nothing left to append.

The repair deliberately applies continuous cycling only to an **unfiltered** Discover browse request. Searches remain finite and honest: a narrow search result is never relabeled as newly discovered content.

### Plus production outage

Read-only Railway evidence for `@workspace/api-server` showed repeated `GET /api/v1/premium-recipes → 503` responses aligned with repeated `Premium entitlement verification unavailable` records. The production service has both RevenueCat variable names present, but the prior log format intentionally did not distinguish a missing/mismatched project, invalid credential, provider timeout, or upstream fault.

The authorized RevenueCat connection confirms:

- project: **CaloraApp** (`proj9890aae2`)
- entitlement lookup key: **`caloraapp_pro`**
- native apps: **CaloraApp Android**, **CaloraApp iOS**, and a **Test Store**

Railway production was aligned to that known project ID. The source now emits only an allowlisted error class (`RevenueCatConfigurationError`, `RevenueCatAuthenticationError`, `RevenueCatTimeoutError`, or `RevenueCatUpstreamError`), never a provider response body or credential. Access remains fail-closed: a failed verification cannot grant Plus.

### Generated image flicker mechanism

Railway request logs showed bursts of generated-image media reads during Create use. The client had two feedback paths:

1. `onLoad` marked a rendered image as `rendered` repeatedly.
2. The reconciliation loop converted the same image back to `url_ready`, even after it had visibly rendered.

This reconfigured/remounted native `expo-image` instances. The repair keeps a rendered image in the durable terminal display state unless its image identity or signed locator genuinely changes. It does not substitute a fallback food image for an unverified generated image.

## Implemented changes

1. `artifacts/api-server/src/routes/recipes.ts`
   - Added a bounded circular page helper for unfiltered Discover browsing.
   - Preserved finite terminal pagination for filtered/search results.
2. `artifacts/calora/app/(tabs)/recipes.tsx`
   - Added unique `feedEntryKey` identities for intentional Discover cycles.
   - Added catalogue cycles after verified Plus content reaches its final provider page.
   - Preserved actual recipe IDs for all detail, save, Plan, and diary actions.
3. `artifacts/calora/lib/generatedRecipeImageLifecycle.ts`
   - Made render acknowledgement idempotent.
   - Prevented same-image reconciliation from regressing `rendered` to `url_ready`.
   - Avoided no-op recipe persistence writes.
4. `artifacts/api-server/src/lib/revenuecat.ts`
   - Added redacted, bounded provider error classification.
5. Tests
   - Updated Discover API cursor assertions.
   - Added cycle-key and Plus-continuity source contracts.
   - Added a direct test proving rendered generated images do not trigger further state writes.
   - Updated RevenueCat tests for the safe diagnostic contract.

## Validation evidence

| Validation | Result |
|---|---:|
| Calora full suite | **PASS — 1,740 tests / 156 files** |
| Targeted Calora Recipes/image tests | **PASS — 69 tests / 5 files** |
| Targeted API Recipes/Premium/RevenueCat tests | **PASS — 71 tests / 3 files** |
| Calora TypeScript | **PASS** |
| API TypeScript | **PASS** |
| API Zod TypeScript | **PASS** |
| Diff whitespace integrity | **PASS** |
| Railway configuration deployment after project-ID alignment | **Healthy; no pending production work** |

The web-test console emitted existing React test-environment warnings unrelated to these changes; no test failed.

## Remaining verification

1. The code change must pass protected GitHub validation and be merged/deployed before it can reach web clients.
2. A fresh Android build is required for the source changes to reach the Galaxy S21 Ultra. It was **not** created, as explicitly required.
3. After deployment, an authenticated Plus request must be checked once. If the new safe diagnostic class is `RevenueCatAuthenticationError`, the sole remaining action is to replace the existing Railway `REVENUECAT_SECRET_API_KEY` with a current **CaloraApp** RevenueCat secret key. This report does not expose or recreate that key.
4. Physical-device verification of Discover/Plus scrolling and Create image stability requires the next owner-authorized Android build.

## Security and data-integrity commitments

- No subscription, entitlement, customer, user record, or recipe data was created, changed, or deleted.
- Plus access remains server-authoritative and fail-closed.
- No credentials were printed, copied, or committed.
- Generated images remain subject to Calora's existing image review and fail-closed policy.
