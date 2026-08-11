# CaloraApp payment, billing, and entitlement certification

**Assessment date:** August 11, 2026  
**Scope:** CaloraApp Pro pricing, purchase, restore, subscription management, entitlement identity, referral promotional access, and financial-integrity controls.

## Verdict

**NOT CERTIFIED FOR LAUNCH.**

The browser paywall and its non-transactional states work, the RevenueCat integration is attached, and automated tests validate the referral reward retry/concurrency design. However, no native or store transaction was exercised, “Manage subscription” does not open platform settings, and the entitlement state is not used to protect any advertised Pro feature. The app must not charge for a plan whose stated benefits are still available without that plan.

## Evidence collected

| Evidence | Result | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Expo web billing journey | Passed | Pro card, monthly/annual selection, confirmation dialog, restore-empty response, and manage dialog render and respond without browser-console errors. | Native purchase sheets, paid transactions, store renewals, cancellations, refunds, and account restoration. |
| RevenueCat workspace connection | Attached | A RevenueCat connection is available to the workspace. | Product/entitlement/offering correctness in Test Store, App Store Connect, or Google Play Console. |
| Referral automated suites | 163 API tests passed | Qualification, duplicate protection, retry rollback, concurrency behavior, and promotional extension logic are covered in test scenarios. | A real two-account referral, real provider promotional grant, or customer entitlement observed in RevenueCat. |
| Source review | Completed | The client derives active status from the `caloraapp_pro` RevenueCat entitlement and synchronizes RevenueCat identity with the signed-in Supabase user. | That real store products map to the expected entitlement or that account-switch behavior is correct on a device. |

## Observed browser billing journey

The following was run through the active Expo web preview after ordinary onboarding, without confirming a purchase:

1. The Profile screen displayed the CaloraApp Pro card, benefits, billing disclosure, restore link, and manage link.
2. Selecting Monthly changed the CTA to `Continue with $9.99 / month`.
3. Selecting Annual changed the CTA to `Continue with $69.99 / year`; the view also showed `SAVE 42%` and `You save $49.89 with annual billing.`
4. Continuing opened a confirmation dialog rather than charging immediately:
   - `Confirm your purchase`
   - `Subscribe to CaloraApp Pro (annual) at $69.99 per year? The store purchase sheet will complete the payment.`
5. Restore returned the explicit empty-account result: `No previous purchases were found for this account.`
6. Manage subscription opened a local informational dialog. It stated that settings *will* open, but offered only `Got it` and never linked to platform settings.

The tester found no browser-console errors in the billing journey. Non-blocking platform/deprecation warnings remain outside billing scope.

## Lifecycle ledger

| Lifecycle or integrity requirement | Status | Evidence / blocker |
| --- | --- | --- |
| Current offering loads and determines displayed plans | **Partially evidenced** | Browser showed monthly and annual prices. The client prefers offering package prices, but the same UI hard-falls back to `$9.99` and `$69.99`; no provider catalog response was directly inspected. |
| Monthly and annual selection | **Passed — browser UI only** | Both selectors changed the visible CTA and annual summary. |
| Pre-purchase confirmation | **Passed — browser UI only** | Confirmation dialog was observed; no payment was confirmed. |
| Successful Test Store / sandbox purchase | **Blocked** | Requires a controlled test account and an intentionally executed purchase. |
| Purchase cancellation and failure handling | **Blocked** | Requires an actual provider purchase sheet / injected provider failure on a supported runtime. |
| Restore existing entitlement | **Blocked** | Only the no-purchase response was observed; restoring an active purchase was not. |
| Subscription management / cancellation destination | **Failed** | The current control only opens an in-app message. It does not open iOS or Android subscription settings. |
| Renewal, expiry, grace period, billing issue, refund, and revocation | **Blocked** | Requires store/provider lifecycle events and device verification. |
| Account switching and cross-device entitlement isolation | **Blocked** | The implementation logs into RevenueCat with the Supabase user ID and waits for sync before reading customer info, but no real account-switch test was executed. |
| Entitlement identity | **Partially evidenced** | Client checks exactly `caloraapp_pro`; store-to-entitlement mapping has not been confirmed with provider data. |
| Enforce marketed Pro benefits | **Failed** | No application consumer of `isSubscribed` exists outside the Profile billing display; the marketed Pro capabilities are not protected. |
| Referral promotional extension resilience | **Passed — automated implementation evidence** | API tests cover qualification, idempotency, concurrency, and retry-safe rollback. Live two-account/provider verification remains owned by the separate referral certification mission. |
| Price authority and locale/tax correctness | **Blocked** | Live provider/store pricing, currency, tax, and trial metadata need direct Test Store plus iOS/Android store validation. |
| Legal, support, and external billing destinations | **Blocked** | Branded URLs and addresses are configured, but must be externally hosted and reachable before release. |

## Implementation findings

- RevenueCat customer state is computed from the single `caloraapp_pro` entitlement.
- Signed-in identity is aligned to the Supabase user ID; anonymous/logout state is intentionally handled before customer information is fetched.
- The paywall reads monthly and annual packages from RevenueCat when available, but silently displays reference prices while offerings are unavailable. Those fallbacks cannot be treated as verified storefront pricing.
- The referral server extends promotional access from the later of the current expiration or now, so it is designed not to shorten an existing entitlement.
- The display promises four Pro benefits: unlimited photo/voice logging, verified-food/source history, adaptive targets/deeper insights, and an ad-free offline diary. Current entitlement state has no gating consumer beyond billing presentation.

## Required release evidence

1. Configure and inspect the authoritative RevenueCat offering, products, package mapping, and `caloraapp_pro` entitlement in the connected project.
2. On iOS and Android device builds, use controlled sandbox/Test Store accounts to complete: new purchase, user-cancelled purchase, provider failure, restore of an active purchase, account switching, cross-device restore, and post-expiry/revocation behavior.
3. Replace the current informational Manage subscription dialog with an actual platform-appropriate cancellation/settings destination and verify it on each platform.
4. Define and implement the genuine Pro boundary, then prove free users cannot receive paid-only functionality while active entitled users can.
5. Complete the real two-account referral lifecycle under the dedicated referral mission; include direct provider entitlement evidence.
6. Confirm hosted privacy, terms, support, and subscription-management destinations, along with final store-facing pricing, taxes/currency, and any trial disclosures.

## Conclusion

This assessment verifies that the web paywall is navigable and that the referral implementation has meaningful automated resilience coverage. It does **not** certify CaloraApp for taking money. Native/provider lifecycle testing and the entitlement enforcement/remediation work above are mandatory before launch.