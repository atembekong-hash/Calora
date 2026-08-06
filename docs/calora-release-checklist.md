# Calora release checklist

This checklist separates the current local-first preview from the work required to ship a store build.

## Current preview

- [x] Expo app metadata, icon, splash, portrait orientation, and automatic system appearance.
- [x] Onboarding with goal, profile basics, activity, diet, consent, and calculated target.
- [x] Verified search, manual add, photo-library estimate, date-aware diary, edit, delete, and saved meal reuse.
- [x] Insights with calorie trend, weight logging, trust metrics, and micronutrient summary.
- [x] Light/dark/system settings, transparent Plus pricing, export modal, and local delete confirmation.
- [x] Local persistence and an outbox that reports pending connection work honestly.

## Native integrations still required

- [ ] RevenueCat or equivalent authorized and configured with `$9.99/month` and `$69.99/year` products.
- [ ] Purchase, restore, entitlement, renewal, cancellation/manage, pending, failure, and unavailable-store states verified in sandbox.
- [ ] Apple HealthKit and Android Health Connect permissions and imported-data provenance implemented.
- [ ] Native camera, barcode, and microphone permissions and retry/denial states implemented.
- [ ] Authenticated API routes, production migrations, outbox upload, conflict resolution, export completion, and deletion completion implemented.

## Store and privacy material

- [ ] Public privacy policy and support URLs added to the app and store listings.
- [ ] Subscription metadata, renewal language, cancellation instructions, screenshots, age rating, and nutrition disclaimer reviewed per platform.
- [ ] Data-safety declarations match local-first storage, health imports, billing provider, analytics policy, and deletion behavior.
- [ ] iOS bundle identifier, Android application ID, signing credentials, production API base URL, and release channel configured outside the preview.