# Calora Phase 2 — Final Official Metadata Specification

**Specification date:** September 7, 2026  
**Status:** Authoritative metadata and identity specification  
**Implementation status:** Specification only; no implementation is authorized by this document  
**Source audit:** `00_CALORA_METADATA_IDENTITY_INVENTORY_REPORT.md`  
**Final specification verdict:** **FINAL METADATA SPECIFICATION COMPLETE**

---

## 1. Executive Summary

This document resolves the owner decisions identified during the metadata and
brand-identity audit.

### Locked decisions

- Official public/customer-facing product name: **Calora**
- Parent company/publisher: **Etiendem Technologies**
- Tagline: **Eat Smarter. Live Better.**
- Descriptor: **AI Nutrition & Calorie Tracker**
- Premium tier: **Calora Pro**
- Canonical long-term public domain: **https://mycaloraapp.com**
- Canonical public support email: **support@mycaloraapp.com**
- Default listing language: **English (United States)**
- Intended public app version: **1.0.0**
- Technical identifiers remain unchanged.
- `calora.app` is not approved and must not be presented as an official domain.

The current Replit origin,
`https://calorie-coach-pie35449.replit.app`, remains temporary operational
infrastructure. It is not the permanent marketing, legal, store, or social
domain. Migration to `mycaloraapp.com` is a later implementation phase and is
not performed by this specification.

### Scope boundary

This document defines what future implementation and store submissions must
use. It does not:

- modify application code;
- modify native configuration;
- modify assets;
- change DNS;
- deploy a website or API;
- trigger an Expo/EAS build;
- change App Store Connect or Google Play Console;
- create, update, or delete external accounts;
- publish a store listing;
- commit or push changes.

### Completion meaning

The specification is complete because the essential identity decisions are
locked. Store IDs, seller-account names, final build numbers, questionnaire
results, territory approval, social profiles, and legally required business
disclosures remain explicitly marked for external confirmation. They do not
prevent this specification from being complete.

---

## 2. Official Brand Identity

| Field | Final specification |
|---|---|
| Public product name | **Calora** |
| Short public name | **Calora** |
| Publisher/company | **Etiendem Technologies** |
| Tagline | **Eat Smarter. Live Better.** |
| Functional descriptor | **AI Nutrition & Calorie Tracker** |
| Premium tier | **Calora Pro** |
| Copyright line | **© 2026 Etiendem Technologies** |
| Primary category | **Health & Fitness** |
| Secondary Apple category | **Food & Drink** |
| Initial listing language | **English (United States)** |
| Brand domain | **mycaloraapp.com** |
| Canonical support email | **support@mycaloraapp.com** |

### Product positioning

Calora is a local-first nutrition and calorie-tracking application operated
and published by Etiendem Technologies. It helps people log meals, review
nutrition estimates, plan meals, browse recipes, observe progress, and request
bounded AI-assisted food or Coach features.

Calora is a wellness and nutrition product. It must not be described as a
medical device, medical provider, diagnostic service, treatment service, or
replacement for professional medical or dietetic care.

### Approved factual capability language

The following capabilities are approved when they accurately describe the
specific surface:

- meal logging by photo, barcode, search, or manual entry;
- review of nutrition estimates before saving;
- daily calorie and macronutrient views;
- curated recipe browsing, saving, and logging;
- weekly meal planning around targets and preferences;
- shopping-list support where the UI exposes it;
- weight and nutrition progress views;
- local-first diary and wellness state;
- authenticated sync for supported account data;
- bounded AI-assisted food analysis and Coach guidance;
- optional health activity/weight reads after platform permission;
- Calora Pro subscription features.

### Claims that are not approved

Do not claim or imply:

- medical diagnosis, treatment, or prevention;
- medically accurate calorie or nutrition measurements;
- guaranteed weight loss or health outcomes;
- professional dietitian or physician advice;
- universal food-database completeness;
- unlimited AI access;
- that all features work offline;
- that all territories, stores, or payment methods are available;
- that a food-photo estimate is exact;
- that a store rating or listing is live before external confirmation.

---

## 3. Naming Rules

### Customer-facing name

Use **Calora** for:

- App Store name;
- Google Play app name;
- website and page titles;
- marketing and promotional copy;
- SEO metadata;
- Open Graph and Twitter/X metadata;
- social profiles and share cards;
- screenshots and screenshot captions;
- user-facing public copy;
- legal-facing product references where appropriate;
- the premium tier label: **Calora Pro**.

### Technical names

Do not rename working technical identifiers merely to match the public brand.
The existing `CaloraApp` string may remain in technical identifiers, source
paths, package names, historical evidence, or migration notes where changing it
would break compatibility. It must not be used as the preferred new public
product name.

### Naming examples

| Context | Correct | Avoid |
|---|---|---|
| Store name | Calora | CaloraApp |
| Website heading | Calora | CaloraApp |
| Premium plan | Calora Pro | CaloraApp Pro |
| Product relationship | Calora is published by Etiendem Technologies | CaloraApp is the official public name |
| Technical package | `com.etiendem.caloraapp` | Renaming for cosmetic consistency |
| URL scheme | `caloraapp://` | Changing the scheme without a migration |
| Unapproved domain | Do not use | `calora.app` |

---

## 4. Technical Identifiers That Must Remain Unchanged

The following are compatibility-sensitive technical identifiers:

| Identifier | Required value | Policy |
|---|---|---|
| Android package/application ID | `com.etiendem.caloraapp` | Preserve |
| iOS bundle identifier | `com.etiendem.caloraapp` | Preserve |
| Expo slug | `calora` | Preserve |
| Custom URL scheme | `caloraapp` | Preserve |
| Existing EAS project identifiers | Current configured project/owner identifiers | Preserve |
| Existing persistent local-state keys | Current persisted contracts | Preserve |
| Existing notification tag namespace | Current `calora-*` contracts | Preserve |
| Existing account and database identifiers | Current internal IDs | Preserve |
| Existing subscription product IDs | Current registered IDs take precedence | Preserve unless provider registration requires a documented change |
| Intended public version | `1.0.0` | Preserve for the initial public release |

The public rename from CaloraApp to Calora is a metadata and copy decision, not
a request to rename bundle IDs, package IDs, database keys, storage keys,
subscription IDs, or persisted state.

---

## 5. Company and Publisher Identity

### Official identity

| Field | Specification |
|---|---|
| Publisher | Etiendem Technologies |
| Preferred public developer identity | Etiendem Technologies |
| Copyright owner | Etiendem Technologies |
| Copyright year for initial release | 2026 |
| Product relationship | Calora is operated and published by Etiendem Technologies |

### External account distinction

The preferred public developer identity is not proof of the external account
display names. Before store submission, verify:

- the Apple seller/developer name in App Store Connect and Apple Developer;
- the Google Play developer name in Google Play Console;
- the legal spelling and capitalization of Etiendem Technologies;
- any platform-required seller address or legal disclosure.

Do not fabricate or infer those account values from repository metadata.

### Business address and phone

- Business address:
  **EXTERNAL BUSINESS CONFIRMATION REQUIRED IF PLATFORM OR LEGAL REQUIREMENTS DEMAND PUBLIC DISCLOSURE**
- Public phone:
  **NOT REQUIRED UNLESS PLATFORM OR BUSINESS POLICY REQUIRES IT**

No address or phone number is to be invented or copied from an unrelated
source. Personal contact details must not be exposed in public metadata.

---

## 6. Contact Identity

### Canonical contact

| Purpose | Canonical value |
|---|---|
| Customer support | `support@mycaloraapp.com` |
| Privacy questions | `support@mycaloraapp.com` |
| Billing questions | `support@mycaloraapp.com` |
| Security reports | `support@mycaloraapp.com` |
| Legal questions | `support@mycaloraapp.com` |
| Account deletion requests | `support@mycaloraapp.com` |
| General contact | `support@mycaloraapp.com` |

The support address is the canonical public contact channel. Do not create
additional public addresses or aliases in the next phase without an owner
decision.

### Contact language

Approved:

> Need help with Calora? Email support@mycaloraapp.com. Please do not include
> passwords, access tokens, full payment-card numbers, or unnecessary health
> information.

Approved response expectation:

> We aim to reply within two business days.

This is a service goal, not a guaranteed service-level agreement.

### Contact gaps

The following remain external or policy decisions:

- business mailing address;
- public telephone number;
- whether a separate legal/privacy/security mailbox is required;
- whether a dedicated contact form is required after the branded website exists.

---

## 7. Canonical Domain Strategy

### Long-term canonical domain

The official long-term public domain is:

**https://mycaloraapp.com**

The apex domain is the canonical website origin. The `www` host may redirect
to the apex host if the owner later chooses to support it, but it is not a
separate canonical identity.

### API host

The intended future API host is:

**https://api.mycaloraapp.com**

This hostname is provisional until DNS, TLS, routing, CORS, authentication,
health checks, and deployment ownership are externally confirmed. It must not
be presented as live during the specification-only phase.

### Temporary infrastructure

Current temporary infrastructure:

`https://calorie-coach-pie35449.replit.app`

Policy:

- keep it operational until the branded replacement is verified;
- do not claim that it is the permanent marketing domain;
- do not remove it before deep links, legal URLs, auth callbacks, and store
  references have been migrated and tested;
- do not change it during this phase.

### Rejected domain

`calora.app` is not approved. Any production-facing reference to it must be
removed in the next implementation phase unless ownership is separately
verified and the owner changes this decision.

---

## 8. Current-to-Future URL Mapping

The following map defines the intended destination. No redirects or route
changes are performed by this document.

| Current operational URL | Intended future URL | Migration note |
|---|---|---|
| `https://calorie-coach-pie35449.replit.app/` | `https://mycaloraapp.com/` | Branded product website |
| `https://calorie-coach-pie35449.replit.app/api/legal/` | `https://mycaloraapp.com/` | Public legal/product landing |
| `https://calorie-coach-pie35449.replit.app/api/legal/privacy` | `https://mycaloraapp.com/privacy` | Privacy Policy |
| `https://calorie-coach-pie35449.replit.app/api/legal/terms` | `https://mycaloraapp.com/terms` | Terms of Use |
| `https://calorie-coach-pie35449.replit.app/api/legal/support` | `https://mycaloraapp.com/support` | Help & Support |
| `https://calorie-coach-pie35449.replit.app/api/legal/contact` | `https://mycaloraapp.com/contact` | Dedicated contact route preferred; current route redirects |
| `https://calorie-coach-pie35449.replit.app/api/legal/delete-account` | `https://mycaloraapp.com/delete-account` | Account deletion |
| `https://calorie-coach-pie35449.replit.app/api/legal/subscriptions` | `https://mycaloraapp.com/subscriptions` | Subscription information |
| `https://calorie-coach-pie35449.replit.app/api/legal/help` | `https://mycaloraapp.com/help` | Help alias or dedicated help page |
| `https://calorie-coach-pie35449.replit.app/auth/callback` | `https://mycaloraapp.com/auth/callback` | HTTPS auth callback |
| `https://calorie-coach-pie35449.replit.app/invite` | `https://mycaloraapp.com/invite` | Invite landing page |
| `https://calorie-coach-pie35449.replit.app/invite/<code>` | `https://mycaloraapp.com/invite/<code>` | Invite code path |
| `https://calorie-coach-pie35449.replit.app/invite/og-image.png` | `https://mycaloraapp.com/invite/og-image.png` | Generated invite image |
| `https://calorie-coach-pie35449.replit.app/.well-known/apple-app-site-association` | `https://mycaloraapp.com/.well-known/apple-app-site-association` | Apple association |
| `https://calorie-coach-pie35449.replit.app/.well-known/assetlinks.json` | `https://mycaloraapp.com/.well-known/assetlinks.json` | Android association |
| Current API origin under the Replit host | `https://api.mycaloraapp.com` | Verify before changing app configuration |
| Any `calora.app` URL or image label | No replacement until branded host is live | Remove unapproved reference |

### Redirect policy

Once the branded host is live and verified, the temporary host should redirect
stable public web paths to their branded equivalents where safe. Association
files, auth callbacks, API origins, and app links require coordinated native
and provider changes; they must not rely on an accidental HTTP redirect.

---

## 9. Apple App Store Metadata

### App identity

| Field | Final proposed value |
|---|---|
| App name | **Calora** |
| Subtitle | **AI Nutrition & Calorie Tracker** |
| Bundle ID | `com.etiendem.caloraapp` |
| Primary category | **Health & Fitness** |
| Secondary category | **Food & Drink** |
| Proposed age rating | **4+**, provisional |
| Default language | **English (United States)** |
| Copyright | **© 2026 Etiendem Technologies** |

The age rating remains provisional until the App Store Connect questionnaire
is completed for the final release candidate.

### Promotional text

Proposed:

> Log meals, understand nutrition, plan ahead, and build habits that fit real life.

This must remain within App Store Connect limits and be checked against the
final UI before entry.

### Search description

Proposed:

> Track calories, scan meals, understand nutrition, and reach your goals with AI.

### Keywords

Proposed keyword string:

> calorie,nutrition,macro,food diary,meal tracker,AI,health,weight loss,meal plan,barcode

Review character count in App Store Connect before submission. Do not add
unsupported medical or guaranteed-outcome keywords.

### Full description

Proposed English-US copy:

> Nutrition tracking should not feel like data entry. Calora helps you log
> meals faster, understand what you eat, plan ahead, and see the habits shaping
> your progress.
>
> **Smart Food Logging**
>
> Scan a meal photo, read a barcode, or type what you ate — Calora identifies
> foods and estimates nutrition as a starting point for your review. You
> confirm before anything goes in your diary.
>
> **Nutrition Insights**
>
> See your daily calories, protein, carbohydrates, and fat at a glance. Weekly
> signals summarize your patterns so trends are visible without obsessing over
> single days.
>
> **Meal Planning**
>
> Plan your week around your nutrition goals. Calora's planner builds a
> balanced week from a curated recipe catalog matched to your daily target and
> food preferences.
>
> **Recipes**
>
> Browse, search, and save recipes. Log a recipe directly to your diary or add
> ingredients to your shopping list.
>
> **Progress**
>
> Track your weight over time alongside your nutrition. See how your habits are
> shaping your direction.
>
> **AI Coach**
>
> Ask Calora Coach about your nutrition patterns, meals, or goals. Coach uses
> the permitted context from your Calora experience to provide contextual,
> evidence-aware guidance — not generic medical advice.
>
> **Privacy by Design**
>
> Calora is local-first. If you sign in, supported diary data syncs to your
> Calora account. AI features send only the information needed for the feature
> you request. You can export local data or permanently delete your account
> from Settings.
>
> Nutrition values, AI analysis, and photo estimates are starting points for
> your review — not exact measurements or medical advice.

The final listing must be checked against the final release candidate. If a
capability, provider, or data behavior changes, update the copy before
submission.

### URLs

| Field | Future canonical value |
|---|---|
| Support URL | `https://mycaloraapp.com/support` |
| Marketing URL | `https://mycaloraapp.com/` |
| Privacy URL | `https://mycaloraapp.com/privacy` |
| Terms URL | `https://mycaloraapp.com/terms` |
| Account deletion URL | `https://mycaloraapp.com/delete-account` |
| Subscription information | `https://mycaloraapp.com/subscriptions` |

Do not submit these future URLs until the branded domain is live and each
route is reachable over HTTPS.

### Release notes

Proposed v1.0.0 release notes:

> Meet Calora — a thoughtful way to log meals, understand nutrition, plan your
> week, and see the habits shaping your progress.

### Screenshot narrative

Use the shared sequence in Section 18. The Apple set must be generated from the
final release candidate, not from existing QA/reference captures.

### App Privacy declarations

Complete the final App Store Connect privacy questionnaire from the final
production data audit. The current specification expects review of:

- contact information for account authentication;
- user content submitted to diary and requested AI features;
- subscription/entitlement status;
- health and fitness values only after permission;
- account and provider identifiers.

Do not copy the draft declarations into the console without checking the final
release candidate and provider behavior.

---

## 10. Google Play Metadata

### App identity

| Field | Final proposed value |
|---|---|
| App name | **Calora** |
| Package ID | `com.etiendem.caloraapp` |
| Category | **Health & Fitness** |
| Default language | **English (United States)** |
| Tags | Calorie counter; Nutrition tracker; Meal planner |
| Content rating | Complete from Google Play Console questionnaire |

The previous “Everyone” draft is input only, not a final rating.

### Short description

Proposed:

> Track calories, scan meals, understand nutrition, and reach your goals with AI.

Confirm the Google Play character limit before entry.

### Full description

Proposed English-US copy:

> Nutrition tracking should not feel like data entry. Calora helps you log
> meals faster, understand what you eat, plan ahead, and see the habits shaping
> your progress.
>
> SMART FOOD LOGGING
>
> Scan a meal photo, read a barcode, or type what you ate — Calora identifies
> foods and estimates nutrition as a starting point for your review. You
> confirm before anything goes in your diary.
>
> NUTRITION INSIGHTS
>
> See your daily calories, protein, carbohydrates, and fat at a glance. Weekly
> signals summarize your patterns so trends are visible without obsessing over
> single days.
>
> MEAL PLANNING
>
> Plan your week around your nutrition goals. Calora's planner builds a
> balanced week from a curated recipe catalog matched to your daily target and
> food preferences.
>
> RECIPES
>
> Browse, search, and save recipes. Log a recipe directly to your diary or add
> ingredients to your shopping list.
>
> PROGRESS
>
> Track your weight over time alongside your nutrition. See how your habits are
> shaping your direction.
>
> AI COACH
>
> Ask Calora Coach about your nutrition patterns, meals, or goals. Coach uses
> the permitted context from your Calora experience to provide contextual,
> evidence-aware guidance — not generic medical advice.
>
> PRIVACY BY DESIGN
>
> Calora is local-first. If you sign in, supported diary data syncs to your
> Calora account. AI features send only the information needed for the feature
> you request. You can export local data or permanently delete your account
> from Settings.
>
> Nutrition values, AI analysis, and photo estimates are starting points for
> your review — not exact measurements or medical advice.

### Contact and URLs

| Field | Future canonical value |
|---|---|
| Support email | `support@mycaloraapp.com` |
| Website | `https://mycaloraapp.com/` |
| Privacy Policy | `https://mycaloraapp.com/privacy` |
| Terms of Use | `https://mycaloraapp.com/terms` |
| Account deletion | `https://mycaloraapp.com/delete-account` |
| Subscription information | `https://mycaloraapp.com/subscriptions` |

### Data Safety

Complete Data Safety from the final production data audit and signed build.
The final review must account for:

- account email and authentication data;
- diary/profile data that syncs for signed-in users;
- food descriptions and photos submitted for requested AI features;
- subscription/customer status;
- health activity and weight only after Health Connect permission;
- provider-specific handling and retention;
- data that remains local unless the user requests a feature requiring
  transmission.

Do not claim that all data is local if the user has enabled authenticated sync
or requested a server/AI feature.

### Release notes

Proposed v1.0.0 release notes:

> Meet Calora — a thoughtful way to log meals, understand nutrition, plan your
> week, and see the habits shaping your progress.

### Feature graphic

The existing 1024 × 500 feature graphic is the master candidate:

`docs/store-assets/google-play-feature-graphic.png`

Before submission:

- replace any public-name text if the source still says CaloraApp;
- confirm no unapproved `calora.app` reference appears;
- confirm final artwork against the approved icon and tagline;
- verify the final PNG in Play Console.

### Store status

The final live listing URL and developer identity are external confirmations.
The package-based URL is not a proof of publication until Google Play Console
shows the listing as available.

---

## 11. Website Metadata

### Canonical homepage

| Field | Final proposed value |
|---|---|
| URL | `https://mycaloraapp.com/` |
| Product name | Calora |
| Publisher | Etiendem Technologies |
| Tagline | Eat Smarter. Live Better. |
| Descriptor | AI Nutrition & Calorie Tracker |
| Language | `en-US` |
| Canonical host | `mycaloraapp.com` |

### Homepage title

> Calora — AI Nutrition & Calorie Tracker

### Homepage meta description

> Calora helps you log meals, understand nutrition, plan ahead, and see the habits shaping your progress.

### Homepage content requirements

The finished website should make these facts clear:

- Calora is a nutrition and calorie-tracking application;
- Calora is operated and published by Etiendem Technologies;
- meal logging and nutrition values are estimates for review;
- Calora is not medical advice;
- the app is available through the relevant official stores once live;
- support is available at `support@mycaloraapp.com`;
- privacy, terms, subscription, help, and account deletion links are visible;
- any store availability statement is limited to confirmed territories.

### Navigation requirements

The canonical website should provide links to:

- Privacy Policy;
- Terms of Use;
- Support;
- Contact;
- Account deletion;
- Subscription information;
- Help;
- official store listings once they exist.

### Favicon and page chrome

Use a dedicated Calora favicon family and an approved wordmark. Do not use the
generic Expo landing-page favicon as the permanent public website identity.

---

## 12. SEO Metadata

### Required public files

The future branded website should provide:

| File | Requirement |
|---|---|
| `/robots.txt` | State the approved crawl policy and sitemap location |
| `/sitemap.xml` | Include canonical public pages only |
| `/site.webmanifest` or `/manifest.webmanifest` | Add if the website is intended to support installable web behavior |
| Favicon files | Provide browser-appropriate sizes and maskable treatment where needed |

### Canonical pages

The sitemap should include only live, canonical, indexable pages such as:

- `/`;
- `/privacy`;
- `/terms`;
- `/support`;
- `/contact`;
- `/delete-account`;
- `/subscriptions`;
- `/help`.

Invite pages should remain `noindex, nofollow` if they are referral
transaction pages rather than evergreen search content.

### Page-level metadata

Every indexable page requires:

- unique `<title>`;
- unique meta description;
- canonical URL on `mycaloraapp.com`;
- `lang="en"` or the correct localized language;
- viewport metadata;
- approved Open Graph metadata;
- approved Twitter/X card metadata;
- visible Calora and Etiendem Technologies relationship where appropriate.

### Recommended page titles

| Page | Title |
|---|---|
| Homepage | Calora — AI Nutrition & Calorie Tracker |
| Privacy | Calora Privacy Policy |
| Terms | Calora Terms of Use |
| Support | Calora Help & Support |
| Contact | Contact Calora |
| Delete account | Delete Your Calora Account |
| Subscriptions | Calora Pro Subscription Information |
| Help | Calora Help |

---

## 13. Open Graph and Social Metadata

### General website card

The general share image must be a dedicated, approved Calora asset. It must
not be the invite-only generated image unless the owner explicitly approves
that reuse.

Proposed homepage values:

| Field | Value |
|---|---|
| `og:type` | `website` |
| `og:site_name` | `Calora` |
| `og:title` | `Calora — AI Nutrition & Calorie Tracker` |
| `og:description` | `Log meals, understand nutrition, plan ahead, and see the habits shaping your progress. |
| `og:url` | `https://mycaloraapp.com/` |
| `og:image` | `https://mycaloraapp.com/assets/social/calora-social-card.png` |
| `og:image:alt` | `Calora nutrition and meal planning app` |
| `og:image:type` | `image/png` or approved final format |
| `og:image:width` | Final asset dimension, documented after creation |
| `og:image:height` | Final asset dimension, documented after creation |
| `twitter:card` | `summary_large_image` |
| `twitter:title` | `Calora — AI Nutrition & Calorie Tracker` |
| `twitter:description` | `Log meals, understand nutrition, plan ahead, and see the habits shaping your progress. |
| `twitter:image` | Same approved general social image |

The asset path above is a specification target, not a claim that the asset
currently exists.

### Social profiles

No official social accounts are established from current evidence. Do not add
`sameAs` URLs, profile links, or social handles until real official accounts
exist and the owner confirms them.

### Invite metadata

Invite cards may keep their route-specific noindex behavior, but must:

- use `Calora`, not CaloraApp, as the public product name;
- use `mycaloraapp.com` after branded hosting is live;
- remove every `calora.app` label or URL;
- keep referral-specific titles and descriptions distinct from the homepage;
- never be treated as the general website share card.

---

## 14. Structured Data / JSON-LD Specification

The future website should expose a JSON-LD graph containing `Organization`,
`MobileApplication` (or `SoftwareApplication` if the implementation requires
it), and `WebSite`.

### Organization

Proposed factual shape:

```json
{
  "@type": "Organization",
  "@id": "https://mycaloraapp.com/#organization",
  "name": "Etiendem Technologies",
  "url": "https://mycaloraapp.com/",
  "email": "support@mycaloraapp.com"
}
```

Do not add a postal address, telephone, logo, social `sameAs`, or legal
registration identifier until externally confirmed.

### MobileApplication

Proposed factual shape:

```json
{
  "@type": "MobileApplication",
  "@id": "https://mycaloraapp.com/#application",
  "name": "Calora",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "iOS, Android",
  "description": "Calora helps users log meals, understand nutrition, plan meals, and observe progress.",
  "publisher": {
    "@id": "https://mycaloraapp.com/#organization"
  },
  "url": "https://mycaloraapp.com/"
}
```

Add these only after external confirmation:

- `downloadUrl` for each live store;
- `installUrl`;
- `applicationSubCategory`;
- `aggregateRating`;
- `review`;
- `offers`;
- store IDs;
- exact pricing or trial claims.

Never invent ratings, reviews, store IDs, or availability.

### WebSite

Proposed factual shape:

```json
{
  "@type": "WebSite",
  "@id": "https://mycaloraapp.com/#website",
  "url": "https://mycaloraapp.com/",
  "name": "Calora",
  "description": "Calora — AI Nutrition & Calorie Tracker",
  "publisher": {
    "@id": "https://mycaloraapp.com/#organization"
  },
  "inLanguage": "en-US"
}
```

### Relationship statement

The structured-data graph must make this relationship explicit:

> Calora is a nutrition and calorie-tracking application operated and
> published by Etiendem Technologies.

Do not describe Calora as a medical device or medical service in JSON-LD.

---

## 15. Deep-Link and Association Specification

### Stable app identifiers

Preserve:

- custom scheme `caloraapp`;
- iOS bundle ID `com.etiendem.caloraapp`;
- Android package `com.etiendem.caloraapp`;
- existing invite path shape `/invite/<code>`;
- existing auth callback path `/auth/callback`.

### Future iOS configuration

When the branded domain is live:

- change the iOS associated domain from the temporary Replit host to
  `applinks:mycaloraapp.com`;
- serve AASA at
  `https://mycaloraapp.com/.well-known/apple-app-site-association`;
- include `/invite/*`;
- include `/auth/callback`;
- keep the correct production app identifier and signing/team identity;
- verify on a signed device.

Do not remove the temporary host association until active production links no
longer depend on it.

### Future Android configuration

When the branded domain is live:

- change Android intent-filter hosts to `mycaloraapp.com`;
- preserve `/invite` and `/auth/callback` path handling;
- serve asset links at
  `https://mycaloraapp.com/.well-known/assetlinks.json`;
- preserve package `com.etiendem.caloraapp`;
- use the signing fingerprint for the final release key;
- verify `android:autoVerify` on a signed install.

### Auth callbacks

The future canonical callback is:

`https://mycaloraapp.com/auth/callback`

Update all of the following together:

- app callback constant;
- Supabase redirect allow-list;
- email verification links;
- password recovery links;
- OAuth provider redirect configuration;
- association files;
- browser callback screen handling;
- public documentation.

### Invite links

Future public invite links should use:

`https://mycaloraapp.com/invite/<code>`

The custom app fallback remains:

`caloraapp://invite/<code>`

Store fallback URLs must only point to live, externally confirmed store
listings. Do not publish a search fallback as if it were a listing.

### Other coordinated systems

The domain migration must update and verify:

- Expo Router origin;
- API origin and API URL configuration;
- CORS and allowed origins;
- server-generated absolute URLs;
- legal/support URL constants;
- subscription and account-deletion links;
- invite OG URL generation;
- email templates;
- Supabase redirect allow-list;
- public-page canonical tags;
- store listing URLs;
- website canonical tags and sitemap;
- monitoring and association probes;
- any webhook or provider callback that requires an origin.

---

## 16. Legal and Trust URL Specification

### Future branded routes

| Purpose | Final URL |
|---|---|
| Homepage/public product | `https://mycaloraapp.com/` |
| Privacy Policy | `https://mycaloraapp.com/privacy` |
| Terms of Use | `https://mycaloraapp.com/terms` |
| Support | `https://mycaloraapp.com/support` |
| Contact | `https://mycaloraapp.com/contact` |
| Account deletion | `https://mycaloraapp.com/delete-account` |
| Subscription information | `https://mycaloraapp.com/subscriptions` |
| Help | `https://mycaloraapp.com/help` |

### Page requirements

Every trust page must:

- use the Calora public name;
- identify Etiendem Technologies as publisher;
- show `support@mycaloraapp.com`;
- use the branded canonical URL;
- include a title and description;
- link to adjacent trust pages;
- preserve the wellness/not-medical-advice boundary;
- avoid exposing secrets or unnecessary personal information;
- accurately describe local-first storage, authenticated sync, AI requests,
  health permissions, subscriptions, and account deletion.

### Subscription language

The public page may describe Calora Pro and reference plans, but the live
store/RevenueCat configuration remains authoritative for:

- localized price;
- taxes;
- trial eligibility;
- renewal behavior;
- availability;
- refunds;
- product identifiers.

Do not hardcode a price in a legal or store surface if it differs from the
authoritative provider configuration.

### Account deletion language

The account-deletion page must clearly state:

- deletion is permanent;
- the user must cancel a store subscription separately;
- the app flow requires an authenticated account;
- support can verify ownership for inaccessible accounts;
- local-only data must be cleared from the device;
- provider unavailability may delay final completion and should not be
  represented as silently complete.

---

## 17. Icon and Visual Asset Specification

### Master icon

Keep the existing 1024 × 1024 Calora icon as the master source unless a later
design review rejects it.

The master icon should preserve:

- the coral/orange circular mark;
- the mint leaf;
- the dark navy field;
- the approved Calora visual language.

### Required asset family

| Asset | Requirement |
|---|---|
| Primary app icon | 1024 × 1024 master, reviewed for iOS and Android masking |
| Android adaptive foreground | Safe-area-aware mark with transparent background |
| Android adaptive background | Approved solid or background layer |
| Android monochrome/themed icon | Single-color readable mark |
| Notification icon | Small monochrome Android-compatible icon |
| iOS icon output | Platform-reviewed output without unwanted pre-rounded treatment |
| Light splash | Calora mark and approved light background |
| Dark splash | Calora mark and approved dark background |
| Favicon family | PNG/SVG/ICO as appropriate, including small-size review |
| Calora wordmark | Approved vector and raster exports |
| Etiendem Technologies identity | Separate approved company mark if used |
| General social image | Dedicated Open Graph/Twitter card |
| Google Play feature graphic | 1024 × 500, public name Calora |
| Apple screenshots | Final release-candidate captures |
| Google Play screenshots | Final release-candidate captures |

### Asset rules

- Do not place `CaloraApp` in new customer-facing artwork.
- Do not place `calora.app` in artwork or metadata.
- Do not use the generic Expo favicon as the permanent website identity.
- Do not use a QA screenshot as a store screenshot without final review.
- Do not include real email addresses, user names, health data, account IDs,
  order IDs, or debug overlays in store assets.
- Keep text inside platform-safe areas.
- Review assets in light and dark presentation contexts where applicable.

No graphics are created or modified during this specification phase.

---

## 18. Store Screenshot Specification

### Source requirement

Final screenshots must come from the final release candidate for each target
platform. Existing files under `screenshots/` and `docs/evidence/` are
QA/design references only and must not automatically become store assets.

### Required narrative sequence

Use this shared eight-screen narrative where platform limits allow:

| # | Headline | Supporting message | Screen |
|---|---|---|---|
| 1 | Meet Calora | Smarter nutrition starts here. | Onboarding/brand |
| 2 | Log meals in seconds | Scan, search, or type what you ate. | Smart Scan/food logging |
| 3 | Know what you're eating | Review where every number comes from. | Food review/diary |
| 4 | See your day at a glance | Calories, macros, and progress in one view. | Home dashboard |
| 5 | Plan meals around your goals | A balanced week, built around you. | Planner |
| 6 | Find meals worth eating | Recipes matched to your preferences. | Recipes |
| 7 | Understand your progress | Habits visible, trends that make sense. | Progress/insights |
| 8 | Guidance when you need it | Calora Coach uses permitted context from your experience. | Coach |

### Privacy-safe data requirements

Screenshots must:

- use synthetic or approved demo data;
- contain no personal names, email addresses, account IDs, or support tickets;
- contain no real health records;
- contain no real payment receipts or order IDs;
- contain no API keys, URLs with tokens, debug logs, or internal hostnames;
- show only capabilities available in the release candidate;
- make estimates and review states clear where applicable;
- avoid implying medical advice.

### Visual consistency

- Use the final Calora public name.
- Use the approved icon, color system, and typography.
- Keep screenshot captions consistent across stores.
- Avoid mixing obsolete CaloraApp copy with Calora copy.
- Use the same core narrative while adapting framing to each platform.
- Capture both light and dark modes only if the selected store set remains
  visually coherent.

### Device requirements

Capture platform-approved phone dimensions from the final release candidate.
Add tablet screenshots only if tablet support and the store submission target
are confirmed. Do not upscale or stretch a phone capture.

### Apple set

- Provide the required iPhone sizes for the targeted App Store submission.
- Add iPad captures only if iPad distribution is intended.
- Use Apple-safe text areas and final store screenshot ordering.

### Google Play set

- Provide required phone screenshots.
- Add tablet or Chromebook captures only when supported and intended.
- Keep the feature graphic separate from the screenshot narrative.

---

## 19. Localization Policy

### Initial release

- Canonical metadata language: **English (United States)**.
- Initial store copy, website metadata, screenshot copy, and legal page copy
  should be internally consistent in English.

### Future localization

Localization is permitted and expected after the English-US baseline is
approved. Future localized surfaces must:

- preserve the Calora public name unless platform naming rules require otherwise;
- preserve Etiendem Technologies;
- translate the tagline only through an approved translation;
- use localized legal pages where required;
- keep nutrition units, currency, subscription terms, and health disclosures
  accurate for the locale;
- avoid machine-translated legal or medical-sounding claims without review.

No localized store listing or social account should be claimed as live until
external publication is confirmed.

---

## 20. Version and Build Policy

### Intended public version

The initial public app version is:

**1.0.0**

Do not change the intended public version during metadata implementation.

### Native build identities

The source values currently visible in configuration are not authoritative
proof of the latest uploaded binaries:

- iOS `buildNumber`;
- Android `versionCode`.

Production EAS builds auto-increment according to the configured release
profile. Before store submission, verify the final signed release candidate's:

- marketing version;
- iOS build number;
- Android versionCode;
- bundle/package identifiers;
- EAS build record;
- store-uploaded binary identity.

### Store copy alignment

Release notes must describe the final binary. Do not submit “initial release”
copy if the version has materially changed or the binary has already been
published.

### Technical compatibility

Versioning work must not rename:

- bundle/package IDs;
- URL scheme;
- persisted state keys;
- notification namespaces;
- subscription identifiers;
- account identifiers.

---

## 21. External Confirmations Still Required

These are required before implementation can be considered release-ready.
They do not block this completed specification.

| Confirmation | Status | Owner/action |
|---|---|---|
| Apple seller/developer identity | **EXTERNAL CONFIRMATION REQUIRED** | Verify in Apple Developer/App Store Connect |
| Apple App Store ID | **EXTERNAL CONFIRMATION REQUIRED** | Record after app record exists |
| Live Apple listing URL | **EXTERNAL CONFIRMATION REQUIRED** | Record only after listing is published |
| Google Play developer identity | **EXTERNAL CONFIRMATION REQUIRED** | Verify in Play Console |
| Live Google Play listing status | **EXTERNAL CONFIRMATION REQUIRED** | Confirm package listing is published |
| Final iOS build number | **EXTERNAL CONFIRMATION REQUIRED** | Match final signed candidate |
| Final Android versionCode | **EXTERNAL CONFIRMATION REQUIRED** | Match final signed candidate |
| Apple rating questionnaire | **EXTERNAL CONFIRMATION REQUIRED** | Complete with final binary |
| Google Play content rating | **EXTERNAL CONFIRMATION REQUIRED** | Complete questionnaire |
| Google Play Data Safety | **EXTERNAL CONFIRMATION REQUIRED** | Complete against final data audit |
| Apple App Privacy | **EXTERNAL CONFIRMATION REQUIRED** | Complete against final data audit |
| Health Apps/Health Connect declarations | **EXTERNAL CONFIRMATION REQUIRED** | Complete platform-specific forms |
| Territory availability | **EXTERNAL CONFIRMATION REQUIRED** | Confirm legal, operational, store, and subscription scope |
| Branded-domain DNS | **EXTERNAL CONFIRMATION REQUIRED** | Establish and verify `mycaloraapp.com` |
| Branded API DNS | **EXTERNAL CONFIRMATION REQUIRED** | Establish and verify `api.mycaloraapp.com` if used |
| TLS/certificate ownership | **EXTERNAL CONFIRMATION REQUIRED** | Verify both public hosts |
| Support inbox deliverability | **EXTERNAL CONFIRMATION REQUIRED** | Confirm receipt and reply workflow |
| Business address | **EXTERNAL BUSINESS CONFIRMATION REQUIRED IF NEEDED** | Supply only if law/platform requires it |
| Public phone | **NOT REQUIRED UNLESS PLATFORM OR BUSINESS POLICY REQUIRES IT** | Do not invent |
| Official social profiles | **EXTERNAL CONFIRMATION REQUIRED** | Add only real approved accounts |
| Final wordmark/company logo approval | **EXTERNAL CONFIRMATION REQUIRED** | Provide or approve assets |
| Final screenshot approval | **EXTERNAL CONFIRMATION REQUIRED** | Review final release-candidate captures |

---

## 22. Exact Implementation Checklist for the Next Phase

This checklist is a future execution plan. It is not authorization to execute
during the specification phase.

### A. Lock and stage external infrastructure

- [ ] Establish DNS for `mycaloraapp.com`.
- [ ] Establish `api.mycaloraapp.com` if the API will use a separate host.
- [ ] Verify TLS certificates and proxy routing.
- [ ] Confirm the branded hosts serve the intended environments.
- [ ] Keep the Replit host available during migration validation.

### B. Update canonical metadata sources

- [ ] Change customer-facing brand constants from CaloraApp to Calora.
- [ ] Keep technical IDs and persisted identifiers unchanged.
- [ ] Change the public premium display label to Calora Pro.
- [ ] Change public legal-page headings, titles, navigation, and footer copy.
- [ ] Change public API-generated page metadata to the branded domain.
- [ ] Review every remaining public `CaloraApp` occurrence for context.
- [ ] Identify and remove every production-facing `calora.app` reference.

### C. Implement the branded website and trust pages

- [ ] Serve the homepage at `https://mycaloraapp.com/`.
- [ ] Implement `/privacy`.
- [ ] Implement `/terms`.
- [ ] Implement `/support`.
- [ ] Implement `/contact`.
- [ ] Implement `/delete-account`.
- [ ] Implement `/subscriptions`.
- [ ] Implement `/help`.
- [ ] Preserve accurate support, privacy, subscription, and deletion language.
- [ ] Add branded titles, descriptions, canonicals, and footer links.
- [ ] Verify all pages return correct HTTPS responses.

### D. Implement SEO and social metadata

- [ ] Add homepage and page-level titles/descriptions.
- [ ] Add canonical tags for all indexable pages.
- [ ] Add `robots.txt`.
- [ ] Add `sitemap.xml`.
- [ ] Add a web manifest if the website scope requires it.
- [ ] Add general Open Graph and Twitter/X cards.
- [ ] Create and approve the general social image.
- [ ] Add Organization, MobileApplication/SoftwareApplication, and WebSite JSON-LD.
- [ ] Add `sameAs` only after official social accounts are confirmed.
- [ ] Verify no unsupported health or medical claims appear in structured data.

### E. Migrate deep links and authentication

- [ ] Update iOS `associatedDomains`.
- [ ] Update Android intent-filter hosts.
- [ ] Serve branded AASA.
- [ ] Serve branded assetlinks.
- [ ] Verify the final signing identity in both association files.
- [ ] Update Expo Router origin.
- [ ] Update the HTTPS auth callback.
- [ ] Update Supabase redirect allow-list.
- [ ] Update OAuth/email/password-recovery links.
- [ ] Update invite URLs and generated fallback URLs.
- [ ] Verify custom-scheme invite routing remains compatible.
- [ ] Test signed iOS and Android builds.

### F. Update store metadata

- [ ] Rename Apple listing to Calora.
- [ ] Rename Google Play listing to Calora.
- [ ] Enter final English-US copy from this specification.
- [ ] Confirm character limits and prohibited claims.
- [ ] Replace temporary URLs with branded URLs after reachability verification.
- [ ] Complete Apple App Privacy.
- [ ] Complete Google Play Data Safety.
- [ ] Complete platform ratings questionnaires.
- [ ] Confirm seller/developer names.
- [ ] Confirm territory availability.
- [ ] Add live store IDs and listing URLs after publication.
- [ ] Add release notes matching the final binary.

### G. Create and review visual assets

- [ ] Review the master icon under platform masks.
- [ ] Create adaptive foreground/background assets.
- [ ] Create the monochrome/themed icon.
- [ ] Create the notification icon.
- [ ] Create light and dark splash assets.
- [ ] Create the favicon family.
- [ ] Approve Calora wordmark and Etiendem Technologies identity assets.
- [ ] Update the Play feature graphic to use Calora.
- [ ] Create final Apple screenshots from the release candidate.
- [ ] Create final Google Play screenshots from the release candidate.
- [ ] Run privacy-safe screenshot review.

### H. Release verification

- [ ] Verify the final signed candidate's version/build identifiers.
- [ ] Verify app association files from the public branded host.
- [ ] Verify auth redirects on signed devices.
- [ ] Verify all store URLs resolve to live listings.
- [ ] Verify legal pages, metadata, and deletion links.
- [ ] Verify no `calora.app` reference remains.
- [ ] Verify no development or Replit host is presented as the permanent brand.
- [ ] Record external confirmation results.

---

## 23. Risks and Migration Dependencies

### Domain migration risk

Changing from the Replit host to `mycaloraapp.com` affects web pages, API
origins, native associations, authentication, CORS, invites, generated OG
URLs, legal links, and store metadata. A partial migration can break sign-in,
invite opening, app links, or store review links.

### Authentication risk

Supabase redirect allow-lists and email/OAuth callback URLs must be updated in
the same release window as the app callback configuration. The old callback
must remain available until the migration is proven.

### Association risk

Apple and Android association files are host-specific. A valid response at the
Replit host does not prove that the branded host is valid. Both files must be
checked from the exact production host and tested with signed builds.

### Store-review risk

Submitting branded URLs before DNS and routes are live can cause store review
failures. Submitting `CaloraApp` copy after the public-name decision can create
store inconsistency. Submitting a package URL before the Play listing exists
will produce an unavailable destination.

### Asset risk

The current icon is a strong master candidate but is reused as splash and
favicon and lacks adaptive/monochrome/notification variants. Platform-specific
small-size and masking review is required before final submission.

### Claim and privacy risk

Store copy and structured data must remain synchronized with actual feature
availability and data flows. Changes to AI providers, health integrations,
authenticated sync, or account deletion require a metadata/privacy re-review.

### Versioning risk

Source build numbers are not proof of the latest uploaded native builds because
production builds auto-increment. Store metadata and release notes must be
bound to the exact final signed candidate.

### Unapproved-domain risk

The literal `calora.app` label in existing invite artwork or generated output
could be interpreted as an official domain. It must be removed or separately
verified before any public release.

---

## 24. Final Specification Verdict

# FINAL METADATA SPECIFICATION COMPLETE

The essential specification decisions are now resolved:

- public product name: **Calora**;
- publisher: **Etiendem Technologies**;
- tagline and descriptor;
- premium-tier naming;
- canonical long-term domain: **mycaloraapp.com**;
- temporary status of the Replit origin;
- rejection of `calora.app`;
- support contact;
- store naming and category direction;
- English-US baseline;
- version policy;
- preservation of technical identifiers;
- future URL structure;
- SEO, social, structured-data, legal, asset, screenshot, localization, and
  migration requirements.

External account facts and publication results remain explicitly marked
**EXTERNAL CONFIRMATION REQUIRED**. They are not guessed and do not block this
specification.

This verdict means the metadata specification is complete. It does not mean
the branded domain, store listings, assets, signed builds, or migration have
been implemented or are ready for publication.

No code, configuration, asset, database, environment variable, DNS,
deployment, build, store record, commit, or GitHub branch was changed while
creating this specification.