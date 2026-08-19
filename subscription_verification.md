# Calora subscription verification (2026-08-15)

Target identity: Google Play app `caloraapp`, Android package `com.etiendem.caloraapp`; RevenueCat project `CaloraApp`, project ID `9890aae2`.

## Google Play Console

- Subscription `caloraapp_pro_monthly` exists in the `caloraapp` application. Base plan `monthly` is Active at $4.99/month with an active 7-day free trial offer (`free-trial`).
- Subscription `caloraapp_pro_annual` exists. Base plan `annual` is Active at **$35.99/year** with a 7-day free trial.
- **Final Pricing Decision:** The U.S. annual price of **$35.99/year** is accepted as final. Customer-facing annual marketing displays **"$3.00/month, billed annually"**, while the transaction price remains $35.99/year.

## RevenueCat

- Project `CaloraApp` (`9890aae2`) is connected to Android app `CaloraApp Android` (`com.etiendem.caloraapp`).
- Products `caloraapp_pro_monthly:monthly` and `caloraapp_pro_annual:annual` are mapped to packages `$rc_monthly` and `$rc_annual` under the `caloraapp_pro` entitlement.
- Default offering is current and correctly configured.

## Build & Source Code

- EAS build `065a8ed9-ee29-4a33-af0e-c59999d9e31c` completed successfully (`versionCode 13`).
- `lib/brand.ts` and all repository documentation (`docs/CALORAAPP_PRODUCT_METADATA.md`, `docs/calora-payment-billing-entitlements-certification.md`, `docs/calora-release-checklist.md`, `docs/product-strategy.md`) reflect $35.99/year and $3.00/mo billed annually.
- No changes made to TutorSnap. No new build triggered.
