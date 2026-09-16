# Google Play Console Submission Worksheet

This worksheet translates CaloraApp's production behavior into the Play Console
fields. Confirm each answer against the final signed Android build before
submitting. Do not place reviewer credentials, passwords, tokens, or order IDs
in this repository.

## Release identity

| Field | Value |
|---|---|
| App name | CaloraApp |
| Package name | `com.etiendem.caloraapp` |
| Category | Health & Fitness |
| Default language | English (United States) |
| Ads | No |
| Public website | `https://calorie-coach-pie35449.replit.app/api/legal/` |
| Privacy policy | `https://calorie-coach-pie35449.replit.app/api/legal/privacy` |
| Account deletion | `https://calorie-coach-pie35449.replit.app/api/legal/delete-account` |
| Support | `https://calorie-coach-pie35449.replit.app/api/legal/support` |
| Support email | `support@mycaloraapp.com` |

## Store listing assets

- App icon: `artifacts/calora/assets/images/icon.png` (1024 × 1024 PNG).
- Feature graphic: `docs/store-assets/google-play-feature-graphic.png`
  (1024 × 500 PNG).
- Phone screenshots: capture the eight screens listed in
  `docs/store-metadata/google-play.md` from the final signed Android build.
- Do not show real account data, email addresses, health records, order IDs, or
  provider credentials in screenshots.

## App access

Select **Some functionality is restricted** because account sync,
subscriptions, referral rewards, and account deletion require sign-in.

In Play Console's secure reviewer-instructions fields:

1. Provide a dedicated QA email/password account. Never put those credentials
   in source control or the public listing.
2. Explain that onboarding and local nutrition tracking can be explored
   without an account.
3. Give the route to sign in, open the paywall, restore purchases, and delete
   the account.
4. If a test subscription is required, use a Play license tester and state that
   no real purchase is necessary.

## Data Safety draft

### Top-level answers

| Question | Draft answer |
|---|---|
| Does the app collect or share required user data types? | Yes |
| Is all collected data encrypted in transit? | Yes |
| Can users request deletion? | Yes — in-app deletion plus the public deletion URL above |
| Does the app sell user data? | No |
| Is data used for advertising? | No |

### Data types

Use the conservative disclosures below. Google may treat a contracted service
provider differently from “sharing”; do not remove a disclosure unless the
final provider terms and Play's current service-provider exception clearly
apply.

| Play data type | Collected | Shared | Required? | Purpose / handling |
|---|---:|---:|---|---|
| Personal info — email address | Yes | Yes | Optional; required for account features | Authentication, account management, support; processed by Supabase |
| Personal info — user IDs | Yes | Yes | Optional; required for account features | Account ownership, sync, subscriptions, fraud prevention |
| Health and fitness — health info | Yes | Yes | Optional | User-entered age, height, weight, goals, nutrition and diary context; app functionality and requested personalization |
| Photos — user photos | Yes | Yes | Optional | Meal and nutrition-label analysis; submitted only on user action and processed ephemerally by the AI provider |
| Other user-generated content | Yes | Yes | Optional | Food descriptions, Coach messages, and planner preferences submitted for requested AI features |
| Financial info — purchase history | Yes | Yes | Optional | Subscription purchase, entitlement, restore, and referral rewards through Google Play and RevenueCat |

Health Connect steps, active energy, exercise, and weight remain on-device and
are not uploaded by the diary sync route. Declare Health Connect access in the
separate Health Apps declaration and include only the permissions used by the
final build.

### Retention and deletion notes

- Submitted photos and AI request content are not intentionally retained by the
  Calora API after processing.
- Authenticated diary and account records are retained while the account is
  active and removed through account deletion, subject to legal obligations.
- Store purchase records remain subject to Google Play and RevenueCat retention
  requirements.
- Local-only data can be cleared from the app/device.

## Target audience and content rating

- Target audience: **13 and older**, consistent with the published statement
  that CaloraApp is not directed to children under 13.
- The app is a general wellness and nutrition tool, not a medical device.
- No violence, sexual content, gambling, controlled-substance promotion,
  advertising, or public user-to-user communication is designed into the app.
- Disclose AI-generated nutrition and Coach content where the questionnaire
  asks about dynamic or generated content.
- Keep the nutrition/AI disclaimer visible: estimates are not medical advice,
  diagnosis, or treatment.

## Permissions and declarations

- Camera/photo access: meal and nutrition-label capture initiated by the user.
- Health Connect: read-only steps, active calories, exercise, and weight after
  explicit permission.
- Notifications: local reminders only; no push-token collection.
- Complete Google Play's Health Apps declaration for nutrition/activity
  tracking and provide the public privacy-policy URL.
- Confirm the final Android target API level and permission list from the AAB
  before submission.

## Final Console checks

- [ ] Upload a new AAB built from the current merged source.
- [ ] Upload the app icon, feature graphic, and final phone screenshots.
- [ ] Paste the short and full descriptions from `google-play.md`.
- [ ] Complete Data Safety using this worksheet and the final provider terms.
- [ ] Complete App access with secure QA credentials.
- [ ] Complete Target audience, Content rating, Health Apps, and Ads forms.
- [ ] Verify the privacy, deletion, website, and support URLs from an
      unauthenticated browser.
- [ ] Confirm `support@mycaloraapp.com` receives and can reply to mail.
- [ ] Run Play Billing purchase and restore with a license tester.
- [ ] Start with Internal testing; promote the same verified build only after
      signed-device QA passes.