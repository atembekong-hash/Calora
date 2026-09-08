# Calora Official Metadata & Brand Identity Inventory Report

**Audit date:** September 7, 2026  
**Audit mode:** Read-only repository and public-endpoint inspection  
**Requested output:** Factual baseline for a future final metadata specification  
**Final verdict:** **NOT READY FOR FINAL METADATA SPECIFICATION**

---

## 1. Executive Summary

Calora has a substantial metadata foundation, but it does not yet have one
fully reconciled official identity package.

The repository consistently identifies the publisher as **Etiendem
Technologies** and consistently uses the native application identifiers
`com.etiendem.caloraapp`. It also contains:

- a canonical product metadata document;
- client and server brand constants;
- Apple App Store and Google Play listing drafts;
- live legal, support, subscription, and account-deletion pages;
- live Apple Universal Link and Android App Link association responses;
- a 1024 × 1024 application icon;
- a 1024 × 500 Google Play feature graphic;
- a defined English store-listing narrative.

The audit also found unresolved conflicts and material gaps:

1. The supplied baseline calls the product **Calora**, while current canonical
   repository sources and native display configuration call it
   **CaloraApp**.
2. The supplied baseline calls `mycaloraapp.com` the primary website, but
   `mycaloraapp.com`, `www.mycaloraapp.com`, and `api.mycaloraapp.com` did not
   resolve during this audit.
3. Current production-facing configuration uses
   `calorie-coach-pie35449.replit.app`, a working Replit-hosted origin.
4. No live App Store or Google Play listing was established from repository
   evidence. The package-based Google Play listing URL returned HTTP 404.
5. General website SEO is incomplete: no `robots.txt`, sitemap, web manifest,
   JSON-LD, Organization schema, SoftwareApplication schema, general Open
   Graph image, or social-profile inventory exists.
6. The sole app icon is reused as the splash image and favicon. Separate
   adaptive Android, monochrome, notification, and platform splash assets are
   absent.
7. Store screenshot narratives exist, but final store screenshot sets do not.
8. Business address, public phone, store seller names, social profiles, and
   externally verified developer-account identities are not established.

The current repository is therefore suitable as an input to an owner decision
and remediation phase, but it is not sufficient to produce the final official
metadata package without guessing.

---

## 2. Audit Method and Status Definitions

### Status definitions

| Status | Meaning |
|---|---|
| **EXISTS** | Verified in current source, generated configuration, or a live public response |
| **PARTIAL** | Some information exists, but a required field, asset, external confirmation, or production proof is missing |
| **MISSING** | No repository or live-response evidence was found |
| **CONFLICTING** | Two or more plausible sources disagree |
| **OUTDATED** | Evidence appears historical, provisional, generated for preview, or unsuitable as current official metadata |

### Evidence rules used

- Current source/configuration was weighted above historical reports.
- `artifacts/calora/app.json` was treated as the primary native app
  configuration.
- `artifacts/calora/lib/brand.ts` and
  `docs/CALORAAPP_PRODUCT_METADATA.md` were treated as the repository's stated
  canonical brand sources.
- Files under `artifacts/calora/static-build/` were treated as generated build
  evidence, not editable source-of-truth configuration.
- Files under `docs/universal-links/` were treated as templates/documentation;
  live `/.well-known/` responses were treated as production evidence.
- Store metadata files were treated as draft specifications, not proof that a
  store listing exists.
- Secret values were not collected or reproduced.

---

## 3. Repository Areas Inspected

The audit searched or inspected:

- root workspace configuration and documentation;
- `replit.md`;
- root and artifact `package.json` files;
- `artifacts/calora/app.json`;
- `artifacts/calora/eas.json`;
- `artifacts/calora/lib/brand.ts`;
- `artifacts/calora/lib/auth.ts`;
- `artifacts/calora/lib/api-config.ts`;
- Calora app routes and user-facing copy;
- Calora assets under `artifacts/calora/assets/`;
- generated iOS and Android Expo manifests;
- Calora production landing-page source;
- API-server brand, public-page, and universal-link routes;
- artifact routing configuration;
- canonical product metadata documentation;
- Apple and Google store metadata drafts;
- Google Play submission worksheet;
- universal-link templates and validation documentation;
- store assets, screenshots, and QA evidence directories;
- URL, email, identity, metadata, association, and credential-reference
  searches across app, API, libraries, scripts, and documentation;
- live public pages and association endpoints at the currently configured
  Replit production origin.

Major generated dependency trees, package-manager caches, Git internals, and
source maps were excluded from identity searches except when generated
manifests were specifically needed.

---

## 4. Existing Official Identity

### Repository-stated canonical identity

| Field | Current repository value | Evidence | Status |
|---|---|---|---|
| Product name | CaloraApp | `artifacts/calora/lib/brand.ts`; `docs/CALORAAPP_PRODUCT_METADATA.md`; `replit.md` | **EXISTS** |
| Short name | CaloraApp | `artifacts/calora/lib/brand.ts` | **EXISTS** |
| Supplied baseline product name | Calora | Audit brief | **CONFLICTING** |
| Publisher/company | Etiendem Technologies | `artifacts/calora/lib/brand.ts`; `docs/CALORAAPP_PRODUCT_METADATA.md`; public legal pages | **EXISTS** |
| Tagline | Eat Smarter. Live Better. | `artifacts/calora/lib/brand.ts`; `replit.md`; store feature graphic | **EXISTS** |
| Descriptor | AI Nutrition & Calorie Tracker | `artifacts/calora/lib/brand.ts`; `replit.md`; App Store subtitle | **EXISTS** |
| Premium tier name | CaloraApp Pro | `artifacts/calora/lib/brand.ts`; public subscription page | **EXISTS** |
| Copyright | © 2026 Etiendem Technologies | `artifacts/calora/lib/brand.ts`; public-page footer | **EXISTS** |
| Primary category | Health & Fitness | Canonical metadata and store drafts | **EXISTS** |
| Secondary category | Food & Drink | Canonical metadata and App Store draft | **EXISTS** |

### Naming conclusion

The repository's current official display name is **CaloraApp**, not
**Calora**. However, the supplied baseline explicitly identifies the product
as **Calora**, and several current user-facing surfaces use shortened
**Calora** wording:

- invite-page Open Graph site name and title;
- invite-page calls to action;
- some user-facing application copy;
- artifact title `Calora`.

Those shortened uses may be intentional brand shorthand, but the official
store/display name cannot be finalized until the owner chooses one of these
options:

1. **CaloraApp** as the legal/store/display product name, with **Calora** as
   conversational shorthand; or
2. **Calora** as the customer-facing product name, while preserving technical
   identifiers containing `caloraapp`.

No rename is recommended by this report. This is an owner decision.

---

## 5. Company and Developer Identity

| Field | Current value/evidence | Status | Finding |
|---|---|---|---|
| Parent company/publisher | Etiendem Technologies | **EXISTS** | Consistent in canonical metadata, client brand constants, legal pages, and footer |
| Legal business name verification | Repository assertion only | **PARTIAL** | No incorporation or external seller-account evidence is stored |
| Apple seller/developer display name | Not found | **MISSING** | Needs App Store Connect/Apple Developer confirmation |
| Google Play developer display name | Not found | **MISSING** | Needs Google Play Console confirmation |
| Business address | Not found | **MISSING** | Add only if legally or operationally required; owner must supply |
| Public phone number | Not found | **MISSING** | Owner confirmation required |
| Copyright owner | Etiendem Technologies | **EXISTS** | Repository consistently uses 2026 |
| Publisher wording on legal pages | Etiendem Technologies | **EXISTS** | Live privacy and terms pages use this publisher |

No conflicting company name was found in current canonical sources. Historical
documents and test fixtures were not treated as official company metadata.

---

## 6. App Identifiers and Versioning

| Field | Current value | Source | Status |
|---|---|---|---|
| Native display name | CaloraApp | `artifacts/calora/app.json` | **EXISTS** |
| Expo slug | `calora` | `artifacts/calora/app.json` | **EXISTS** |
| URL scheme | `caloraapp` | `artifacts/calora/app.json` | **EXISTS** |
| iOS bundle identifier | `com.etiendem.caloraapp` | `artifacts/calora/app.json` | **EXISTS** |
| Android package/application ID | `com.etiendem.caloraapp` | `artifacts/calora/app.json` | **EXISTS** |
| App version | `1.0.0` | `artifacts/calora/app.json` | **EXISTS** |
| iOS build number | `1` | `artifacts/calora/app.json` | **EXISTS** |
| Android versionCode | `24` | `artifacts/calora/app.json` | **EXISTS** |
| EAS owner | Configured in source | `artifacts/calora/app.json` | **EXISTS** |
| EAS project ID | Configured in source | `artifacts/calora/app.json` | **EXISTS** |
| EAS app version source | Local | `artifacts/calora/eas.json` | **EXISTS** |
| Production build increment | Automatic | `artifacts/calora/eas.json` | **EXISTS** |
| Explicit update URL | Not found | `artifacts/calora/app.json` | **MISSING** |
| Explicit source runtimeVersion | Not found | `artifacts/calora/app.json` | **PARTIAL** |
| Generated runtime version | `exposdk:54.0.0` | generated iOS/Android manifests | **OUTDATED/GENERATED** |
| Workspace package version | `0.0.0` | `artifacts/calora/package.json` | **CONFLICTING** |
| Artifact metadata version | `1.0.0` | Calora artifact configuration | **EXISTS** |

The workspace package version appears to be internal monorepo metadata rather
than store versioning, but the distinction should be documented in the final
specification.

Because production builds use automatic incrementing, `buildNumber: 1` and
`versionCode: 24` in source are not proof of the latest externally submitted
native build numbers.

---

## 7. Contact and Trust Information

### Email inventory

The canonical public contact address is:

`support@mycaloraapp.com`

It is used for:

- customer support;
- billing;
- privacy;
- security;
- legal;
- general contact;
- account deletion;
- the repository's transactional/no-reply role.

Evidence:

- `artifacts/calora/lib/brand.ts`
- `docs/CALORAAPP_PRODUCT_METADATA.md`
- `docs/store-metadata/app-store.md`
- `docs/store-metadata/google-play.md`
- `docs/store-metadata/google-play-submission-checklist.md`
- `artifacts/api-server/src/routes/public-pages.ts`

### Contact findings

| Item | Status | Finding |
|---|---|---|
| Support email | **EXISTS** | Consistent across current canonical sources |
| Privacy email | **EXISTS** | Same shared support mailbox |
| Billing email | **EXISTS** | Same shared support mailbox |
| Legal/security email | **EXISTS** | Same shared support mailbox |
| Contact form | **MISSING** | Contact URL redirects to support page/email |
| Public phone | **MISSING** | No current source evidence |
| Business address | **MISSING** | No current source evidence |
| Response-time statement | **EXISTS** | Public support pages state two business days |
| Owner verification that inbox receives/replies | **PARTIAL** | Canonical document says confirmed; Play worksheet still requires final verification |

Owner confirmation is required that one shared mailbox is appropriate for all
legal, billing, privacy, security, support, and transactional roles.

---

## 8. Public URL Inventory

### Current live production-facing origin

Current source configuration and live public responses use:

`https://calorie-coach-pie35449.replit.app`

### Live URL results

The following returned HTTP 200 during this audit:

| Purpose | URL | Result |
|---|---|---|
| Main legal/product page | `https://calorie-coach-pie35449.replit.app/api/legal/` | **EXISTS — 200** |
| Privacy Policy | `https://calorie-coach-pie35449.replit.app/api/legal/privacy` | **EXISTS — 200** |
| Terms of Use | `https://calorie-coach-pie35449.replit.app/api/legal/terms` | **EXISTS — 200** |
| Support | `https://calorie-coach-pie35449.replit.app/api/legal/support` | **EXISTS — 200** |
| Contact | `https://calorie-coach-pie35449.replit.app/api/legal/contact` | **EXISTS — redirects to support** |
| Account deletion | `https://calorie-coach-pie35449.replit.app/api/legal/delete-account` | **EXISTS — 200** |
| Subscription information | `https://calorie-coach-pie35449.replit.app/api/legal/subscriptions` | **EXISTS — 200** |
| Help | `https://calorie-coach-pie35449.replit.app/api/legal/help` | **EXISTS — redirects to support** |
| Apple association | `https://calorie-coach-pie35449.replit.app/.well-known/apple-app-site-association` | **EXISTS — 200** |
| Android association | `https://calorie-coach-pie35449.replit.app/.well-known/assetlinks.json` | **EXISTS — 200** |
| Invite landing page | `https://calorie-coach-pie35449.replit.app/invite` | **EXISTS — 200** |
| Invite OG image | `https://calorie-coach-pie35449.replit.app/invite/og-image.png` | **EXISTS — 200** |

The API also mounts legal pages at root aliases such as `/privacy`, `/terms`,
`/support`, `/contact`, `/delete-account`, `/subscriptions`, and `/help`.
Repository-controlled metadata consistently prefers the `/api/legal/*` URLs.

### Branded-domain status

| Host | Audit result | Status |
|---|---|---|
| `mycaloraapp.com` | DNS resolution failed | **MISSING** |
| `www.mycaloraapp.com` | DNS resolution failed | **MISSING** |
| `api.mycaloraapp.com` | DNS resolution failed | **MISSING** |

This directly conflicts with the supplied baseline that identifies
`mycaloraapp.com` as the primary website/domain.

### Other URL findings

- `api.mycaloraapp.com` is documented as preferred/provisional but not live.
- No Railway public URL was found in official product source.
- Localhost and `127.0.0.1` references found in API code are internal
  development/sidecar endpoints, not public metadata.
- Generated static Expo manifests contain Replit development host URLs and
  local asset URLs. These are generated preview artifacts and must never be
  copied into store or production metadata.

---

## 9. Legal URLs and Content

| Legal/trust surface | Repository implementation | Live | Status |
|---|---|---:|---|
| Privacy Policy | Full HTML route | Yes | **EXISTS** |
| Terms of Use | Full HTML route | Yes | **EXISTS** |
| Subscription information | Pricing, trial, renewal, cancellation, refund guidance | Yes | **EXISTS** |
| Account deletion | In-app and email path, deletion scope, subscription warning | Yes | **EXISTS** |
| Help & Support | Email and safe-information guidance | Yes | **EXISTS** |
| Contact | Redirect to support | Yes | **PARTIAL** |

The legal pages contain:

- page titles;
- meta descriptions;
- canonical URLs;
- index/follow response directives;
- Etiendem Technologies publisher references;
- an effective date of August 27, 2026;
- monitored support email;
- wellness/not-medical-advice statements;
- subscription and account-deletion guidance.

The legal pages do not include general Open Graph/Twitter cards, structured
data, logos, or Organization schema.

Legal accuracy was inventoried, not legally certified.

---

## 10. App Icons, Logos, and Brand Assets

### Primary icon

| Item | Details |
|---|---|
| Path | `artifacts/calora/assets/images/icon.png` |
| Type | PNG, RGB |
| Dimensions | 1024 × 1024 |
| Visual | Coral/orange circular medallion with mint leaf on dark navy rounded-square background |
| Uses | Expo app icon, splash image, web favicon, generic restaurant fallback |
| Status | **EXISTS, but over-reused** |

The source icon appears intentionally designed and current. It is already
precomposed on a rounded dark square, so platform masking/adaptive-icon
behavior must be reviewed before store submission.

### Required/icon-family gaps

| Asset | Status | Finding |
|---|---|---|
| Primary app icon | **EXISTS** | One 1024 × 1024 PNG |
| Android adaptive foreground | **MISSING** | No `android.adaptiveIcon` source configuration |
| Android adaptive background | **MISSING** | No adaptive color/image configuration |
| Android monochrome icon | **MISSING** | No themed-icon source |
| Notification icon | **MISSING** | Notifications exist, but no notification-specific monochrome asset was found |
| Separate iOS icon set | **PARTIAL** | Expo can derive icons, but no platform-specific reviewed set exists |
| Splash image | **PARTIAL** | Primary app icon reused with white background |
| Dark-mode splash | **MISSING** | No separate dark splash configuration |
| Web favicon | **PARTIAL** | Primary 1024 PNG reused; no dedicated favicon family or `.ico` |
| Wordmark/logo export | **MISSING** | No standalone SVG/PNG wordmark |
| Etiendem Technologies logo | **MISSING** | No company-logo asset found |
| Social/Open Graph image | **PARTIAL** | Invite OG image is generated; no general site/social card |
| App Store promotional art | **MISSING** | No Apple promotional/marketing art found |
| Store badges | **MISSING** | No branded Apple/Google download-badge assets found |

### Product imagery

`artifacts/calora/assets/images/` contains 59 files:

- one primary icon;
- six named screen/header/onboarding images;
- four fallback food images;
- food and meal catalog images.

The app/header/fallback JPEGs inspected are generally 1024 × 1024 and are
product UI imagery, not official company logos or store screenshots.

---

## 11. Store Graphics and Screenshots

### Google Play feature graphic

| Item | Details |
|---|---|
| Path | `docs/store-assets/google-play-feature-graphic.png` |
| Type | 16-bit RGBA PNG |
| Dimensions | 1024 × 500 |
| Content | CaloraApp wordmark, tagline, product descriptor, primary icon |
| Status | **EXISTS** |

The graphic is correctly dimensioned and visually coherent with the icon. Its
use of **CaloraApp** must be revisited if the owner chooses **Calora** as the
official customer-facing name.

### Screenshot inventory

The repository contains QA and design-reference screenshots under:

- `screenshots/`
- `docs/evidence/`

Observed sizes include:

- 390 × 844;
- 402 × 874;
- 768 × 1024.

These files document UI states and design evolution. They are not organized,
captioned, localized, device-framed, or certified as final App Store/Google
Play screenshot sets.

| Store screenshot requirement | Status |
|---|---|
| App Store screenshots | **MISSING** |
| Google Play phone screenshots | **MISSING** |
| Tablet screenshots | **MISSING/NOT CURRENTLY TARGETED** |
| Final privacy-safe screenshot review | **MISSING** |
| Screenshot narrative | **EXISTS** in both store metadata drafts |

---

## 12. Apple App Store Metadata

Source: `docs/store-metadata/app-store.md`

| Field | Current draft | Status |
|---|---|---|
| App name | CaloraApp | **EXISTS/CONFLICTING with supplied baseline** |
| Subtitle | AI Nutrition & Calorie Tracker | **EXISTS** |
| Bundle ID | `com.etiendem.caloraapp` | **EXISTS** |
| Primary category | Health & Fitness | **EXISTS** |
| Secondary category | Food & Drink | **EXISTS** |
| Content rating | 4+ | **PARTIAL — console confirmation required** |
| Availability | All territories, with adjustment warning | **PARTIAL** |
| Short/search description | Present | **EXISTS** |
| Full description | Present | **EXISTS** |
| Promotional text | No separate field established | **MISSING** |
| Keywords | Present | **EXISTS** |
| Support URL | Current Replit legal origin | **EXISTS** |
| Marketing URL | Current Replit legal root | **EXISTS but unbranded** |
| Privacy URL | Current Replit legal origin | **EXISTS** |
| What's New | Initial v1.0.0 release text | **EXISTS/PARTIAL** |
| Copyright | Defined canonically, not clearly included as an App Store field | **PARTIAL** |
| Seller/developer name | Not established | **MISSING** |
| App Store ID | Not committed as official metadata | **MISSING/EXTERNAL** |
| App Store listing URL | Runtime environment-dependent; no repository-confirmed live listing | **MISSING/EXTERNAL** |
| Localizations | English only | **PARTIAL** |
| Store screenshots | Narrative only | **MISSING** |
| App privacy answers | Draft narrative exists | **PARTIAL — console completion required** |

The initial release note says “Initial release of CaloraApp — AI-powered
calorie and nutrition tracking for iOS.” The owner should confirm whether this
remains correct for the intended launch sequence.

---

## 13. Google Play Metadata

Sources:

- `docs/store-metadata/google-play.md`
- `docs/store-metadata/google-play-submission-checklist.md`

| Field | Current draft | Status |
|---|---|---|
| App name | CaloraApp | **EXISTS/CONFLICTING with supplied baseline** |
| Package ID | `com.etiendem.caloraapp` | **EXISTS** |
| Category | Health & Fitness | **EXISTS** |
| Content rating | Everyone | **PARTIAL — console questionnaire required** |
| Tags | Calorie counter, Nutrition tracker, Meal planner | **EXISTS** |
| Default language | English (United States) | **EXISTS** |
| Ads declaration | No | **PARTIAL — console confirmation required** |
| Short description | Present | **EXISTS** |
| Full description | Present | **EXISTS** |
| Website | Current Replit legal origin | **EXISTS but unbranded** |
| Support email | Present | **EXISTS** |
| Privacy URL | Present | **EXISTS** |
| Account-deletion URL | Present in worksheet | **EXISTS** |
| Data Safety draft | Detailed worksheet exists | **PARTIAL — console completion required** |
| Health Apps declaration | Required by worksheet | **MISSING/EXTERNAL** |
| App access instructions | Draft guidance exists | **PARTIAL — secure console entry required** |
| Feature graphic | 1024 × 500 PNG | **EXISTS** |
| Phone screenshots | Narrative only | **MISSING** |
| Release notes | No Android-specific release-note package found | **MISSING** |
| Localizations | English only | **PARTIAL** |
| Live listing | Package URL returned HTTP 404 during audit | **MISSING** |

---

## 14. Web, SEO, and Discovery Metadata

### Root mobile landing page

The production root page exposes:

- title: `CaloraApp`;
- an Expo/QR-oriented landing experience;
- a data-URL favicon.

It does not expose a complete product website metadata package.

### Legal pages

The legal pages have:

- HTML titles;
- meta descriptions;
- canonical URLs;
- index/follow headers.

### Invite pages

Invite pages intentionally use `noindex, nofollow` and include:

- Open Graph type;
- Open Graph site name;
- Open Graph title and description;
- generated 1200 × 630 Open Graph image;
- Open Graph URL;
- Twitter/X summary-large-image metadata.

This metadata applies only to referral invitations and is not a replacement
for main-site metadata.

### SEO/discovery gap inventory

| Field | Status | Finding |
|---|---|---|
| Main HTML title | **EXISTS** | `CaloraApp` |
| Main meta description | **MISSING** | Root app landing page lacks one |
| Main canonical URL | **MISSING** | Root app landing page lacks one |
| Legal-page titles/descriptions/canonicals | **EXISTS** | Server-generated |
| Robots directives | **PARTIAL** | Headers/tags on generated pages; no `robots.txt` |
| `robots.txt` | **MISSING** | Live request returned 404 |
| Sitemap | **MISSING** | Live `/sitemap.xml` returned 404 |
| Web manifest | **MISSING** | Common manifest URLs returned 404 |
| General Open Graph metadata | **MISSING** | Only invite pages have OG |
| General Twitter/X cards | **MISSING** | Only invite pages have cards |
| General social image | **MISSING** | Invite image is route-specific |
| JSON-LD | **MISSING** | No `application/ld+json` found |
| Organization schema | **MISSING** | No Schema.org organization entity |
| SoftwareApplication/MobileApplication schema | **MISSING** | No application entity |
| WebSite schema | **MISSING** | No website entity |
| `sameAs` social profiles | **MISSING** | No social URLs found |
| Search Console verification | **MISSING** | No verification file/config found |
| Dedicated favicon family | **MISSING** | App icon/data favicon only |
| Theme-color metadata | **MISSING/PARTIAL** | Native theme exists; web metadata not established |

Search engines cannot currently infer a complete, explicit relationship:

> Calora/CaloraApp is an application product operated by Etiendem Technologies.

The legal pages state the relationship in prose, but structured discovery
metadata does not.

---

## 15. Deep Linking and App Association

### Source configuration

| Item | Current value | Status |
|---|---|---|
| Custom scheme | `caloraapp` | **EXISTS** |
| iOS associated domain | Replit production host | **EXISTS** |
| Android App Link `/invite` | Replit production host, autoVerify | **EXISTS** |
| Android App Link `/auth/callback` | Replit production host, autoVerify | **EXISTS** |
| Expo Router origin | Replit production host | **EXISTS** |
| Canonical auth callback | HTTPS Replit production host `/auth/callback` | **EXISTS** |
| Invite custom link | `caloraapp://invite/<code>` | **EXISTS** |

### Live association verification

The live Apple association response:

- returned HTTP 200;
- contained one application identifier;
- claimed `/invite/*`;
- claimed `/auth/callback`.

The live Android association response:

- returned HTTP 200;
- contained package `com.etiendem.caloraapp`;
- contained one signing fingerprint.

No private signing or credential values are reproduced in this report.

### Association gaps

| Item | Status | Finding |
|---|---|---|
| Repository AASA template | **PARTIAL** | Contains an owner-supplied placeholder |
| Repository assetlinks template | **PARTIAL** | Contains a signing-fingerprint placeholder |
| Live association endpoints | **EXISTS** | Properly configured at current Replit host |
| Branded-domain associations | **MISSING** | Branded domains do not resolve |
| Supabase redirect allow-list source config | **MISSING/EXTERNAL** | External provider configuration, not repository-controlled |
| Signed-device callback validation | **PARTIAL** | Historical validation documentation reports native-device gaps |
| App Store exact fallback URL | **PARTIAL** | Environment-driven; source falls back to search if absent |
| Google Play fallback URL | **EXISTS but listing unavailable** | Package URL exists in source; live listing returned 404 |

The current deep-link system is coherent around the Replit host. Moving to a
branded domain requires a coordinated migration across native associated
domains, Android intent filters, Expo Router origin, Supabase redirect
allow-list, association files, CORS, public links, and deployed hosting.

---

## 16. Social and Discovery Metadata

| Item | Status | Finding |
|---|---|---|
| Facebook URL | **MISSING** | No official profile found |
| Instagram URL | **MISSING** | No official profile found |
| X/Twitter URL | **MISSING** | No official profile found |
| LinkedIn company URL | **MISSING** | No official profile found |
| TikTok/YouTube URL | **MISSING** | No official profile found |
| Social `sameAs` list | **MISSING** | No structured profile inventory |
| Main social share image | **MISSING** | Invite-only generated OG image exists |
| Invite sharing metadata | **EXISTS** | Complete OG/Twitter metadata, intentionally noindex |

The generated invite OG image contains the text `calora.app`, even though that
host is not the current configured origin and was not established as an
official domain. This is **CONFLICTING/OUTDATED** production-facing branding.

---

## 17. Brand Consistency Findings

### Consistent

- `Etiendem Technologies`
- `com.etiendem.caloraapp`
- `caloraapp` custom URL scheme
- `calora` Expo slug
- `support@mycaloraapp.com`
- `CaloraApp Pro`
- “Eat Smarter. Live Better.”
- “AI Nutrition & Calorie Tracker”

### Conflicting or context-dependent

| Variant | Context | Assessment |
|---|---|---|
| CaloraApp | Native display name, canonical metadata, store drafts | Current repository-official name |
| Calora | Supplied baseline, artifact title, invite/social copy, conversational UI | Possible preferred public shorthand or new official name |
| calora | Expo slug, internal paths/keys | Technical identifier; preserve |
| caloraapp | Scheme, package/bundle fragments, persisted IDs | Technical identifier; preserve |
| mycaloraapp.com | Email domain and supplied primary-domain baseline | Email identity exists; website DNS missing |
| calorie-coach-pie35449.replit.app | Current working public/legal/deep-link origin | Operational but unbranded |
| calora.app | Invite OG graphic footer/fallback host text | Not established; conflicting |

Technical identifiers should not be cosmetically renamed merely to match a
future display-name decision.

---

## 18. Security and Exposure Findings

### No secret values included

This audit did not reproduce:

- API keys;
- service-role keys;
- tokens;
- passwords;
- database credentials;
- signing fingerprints;
- Apple team identifiers;
- RevenueCat secret keys;
- session secrets;
- private administrative URLs.

### Findings

1. `artifacts/calora/eas.json` contains concrete `EXPO_PUBLIC_*` Supabase and
   RevenueCat client configuration. These values are intentionally public and
   bundle-visible by design, not server secrets. They must never be treated as
   authorization by themselves.
2. A real-looking publishable Supabase client value is present in a test
   source file. It is a public client credential class, but source-controlled
   test fixtures should not be confused with safe server authorization.
3. Server-secret variable names are referenced across server code and example
   environment files. No server-secret values were copied into this report.
4. EAS owner/project ID, bundle/package IDs, Supabase project origin, Replit
   origin, and public association metadata are discoverable by design.
5. Generated Expo manifests contain development Replit hosts and localhost
   asset URLs. They are preview artifacts and unsuitable for official
   metadata.
6. The public invite route builds absolute OG URLs from request host headers.
   Current proxy trust and host handling should remain part of production
   security review.

### Security status

| Area | Status |
|---|---|
| Server secret values in official metadata | **No exposure found in audited output** |
| Public SDK/client configuration | **EXISTS by design** |
| Client metadata used as authorization | **Must remain prohibited** |
| Generated dev URLs copied into official metadata | **Risk identified; none should be used** |
| Secret-safe final metadata process | **PARTIAL — needs final manual review** |

---

## 19. Missing Metadata

The following are materially missing:

- owner-approved official public product name;
- working branded website/domain;
- final marketing site;
- business address decision;
- public phone decision;
- Apple seller/developer display name;
- Google Play developer display name;
- live App Store listing and exact public URL;
- live Google Play listing;
- App Store promotional text;
- Android release notes;
- final store screenshot sets;
- Android adaptive icon;
- Android monochrome/themed icon;
- notification icon;
- dedicated splash assets and dark splash;
- standalone wordmark/logo exports;
- Etiendem Technologies logo;
- general Open Graph image and metadata;
- general Twitter/X metadata;
- `robots.txt`;
- sitemap;
- web manifest;
- JSON-LD;
- Organization schema;
- SoftwareApplication/MobileApplication schema;
- WebSite schema;
- social profile URLs and `sameAs`;
- Search Console verification;
- non-English app/store localizations;
- externally completed App Privacy/Data Safety/Health Apps declarations;
- final signed-build/version confirmation.

---

## 20. Conflicting or Outdated Metadata

| Conflict/outdated item | Evidence | Required action |
|---|---|---|
| Calora vs CaloraApp | Audit baseline vs canonical repository sources | Owner chooses official public/display name |
| mycaloraapp.com vs Replit origin | Supplied baseline/email domain vs current working source/live host | Establish branded DNS/hosting or explicitly approve Replit URL |
| `calora.app` in invite OG graphic | `artifacts/api-server/src/routes/universal-links.ts` | Remove or confirm ownership before final metadata |
| Package version `0.0.0` vs app `1.0.0` | `artifacts/calora/package.json` vs `app.json` | Document internal vs release version |
| Source build numbers vs EAS auto-increment | `app.json` and `eas.json` | Confirm latest submitted native build identities externally |
| App Store “initial iOS release” wording | App Store draft | Confirm intended launch sequence |
| Root Expo landing page vs official website expectation | Production root landing source | Decide whether root is a product site or app-preview launcher |
| Generated static manifests with dev/local URLs | `artifacts/calora/static-build/*/manifest.json` | Never use as official metadata; regenerate only through release process |
| Historical reports claiming readiness or old states | Various reports under root/docs | Revalidate against current source and live services |

---

## 21. Complete Metadata Gap Table

| Field | Current value | Source file/path | Status | Recommended final value or action |
|---|---|---|---|---|
| Official product name | CaloraApp in repo; Calora in supplied baseline | `artifacts/calora/lib/brand.ts`; audit brief | **CONFLICTING** | **NEEDS OWNER CONFIRMATION** |
| Display name | CaloraApp | `artifacts/calora/app.json` | **EXISTS** | Preserve until owner approves any rename |
| Internal workspace name | `@workspace/calora` | `artifacts/calora/package.json` | **EXISTS** | Keep technical/internal |
| Publisher | Etiendem Technologies | brand and legal sources | **EXISTS** | Confirm legal seller spelling externally |
| Tagline | Eat Smarter. Live Better. | brand/store sources | **EXISTS** | Approve as final |
| Descriptor | AI Nutrition & Calorie Tracker | brand/store sources | **EXISTS** | Approve as final |
| Copyright | © 2026 Etiendem Technologies | brand/public pages | **EXISTS** | Confirm year at release |
| Android package | `com.etiendem.caloraapp` | `artifacts/calora/app.json` | **EXISTS** | Preserve |
| iOS bundle ID | `com.etiendem.caloraapp` | `artifacts/calora/app.json` | **EXISTS** | Preserve |
| Expo slug | `calora` | `artifacts/calora/app.json` | **EXISTS** | Preserve unless EAS migration is approved |
| Scheme | `caloraapp` | `artifacts/calora/app.json` | **EXISTS** | Preserve |
| Expo project | Configured | `artifacts/calora/app.json` | **EXISTS** | Verify owner/project externally before release |
| App version | 1.0.0 | `artifacts/calora/app.json` | **EXISTS** | Confirm intended store version |
| iOS build | 1 in source | `artifacts/calora/app.json` | **PARTIAL** | Confirm latest EAS/App Store build |
| Android versionCode | 24 in source | `artifacts/calora/app.json` | **PARTIAL** | Confirm latest EAS/Play build |
| Runtime/update config | Expo SDK runtime generated; no explicit source runtime/update URL | app and generated manifests | **PARTIAL** | Document release/update policy |
| Primary domain | Replit live; mycaloraapp DNS missing | brand/config/live probes | **CONFLICTING** | **NEEDS OWNER CONFIRMATION** |
| Marketing website | Replit legal root | canonical URL sources | **PARTIAL** | Launch branded product site or approve current URL |
| API hostname | Replit current; branded API provisional | `eas.json`; canonical metadata | **PARTIAL** | Keep current until branded API is live and verified |
| Support URL | Live Replit legal support page | brand/store sources | **EXISTS** | Repoint only with coordinated domain migration |
| Contact URL | Redirects to support | public routes | **PARTIAL** | Decide whether dedicated contact page is required |
| Privacy URL | Live Replit legal page | brand/store sources | **EXISTS** | Legal review before store submission |
| Terms URL | Live Replit legal page | brand/store sources | **EXISTS** | Legal review before store submission |
| Deletion URL | Live Replit legal page | brand/store sources | **EXISTS** | Verify final store-console entry |
| Subscription URL | Live Replit legal page | brand/store sources | **EXISTS** | Keep aligned with live products/prices |
| Support email | `support@mycaloraapp.com` | brand/legal/store sources | **EXISTS** | Confirm deliverability and reply workflow |
| Business address | Unknown | No source found | **MISSING** | **NEEDS OWNER CONFIRMATION** |
| Public phone | Unknown | No source found | **MISSING** | **NEEDS OWNER CONFIRMATION** |
| Apple seller name | Unknown | No source found | **MISSING** | **NEEDS OWNER CONFIRMATION** |
| Play developer name | Unknown | No source found | **MISSING** | **NEEDS OWNER CONFIRMATION** |
| Primary app icon | 1024 × 1024 PNG | `artifacts/calora/assets/images/icon.png` | **EXISTS** | Run final platform mask/small-size review |
| Android adaptive icon | None | `artifacts/calora/app.json` | **MISSING** | Create foreground/background/monochrome set |
| Notification icon | None | assets/config search | **MISSING** | Create Android-compatible monochrome icon |
| Splash asset | App icon reused | `artifacts/calora/app.json` | **PARTIAL** | Produce reviewed light/dark splash assets |
| Favicon | App icon/data SVG reused | app/landing config | **PARTIAL** | Create dedicated favicon family |
| Wordmark/logo files | None | asset search | **MISSING** | Export official vector and raster wordmarks |
| Company logo | None | asset search | **MISSING** | **NEEDS OWNER CONFIRMATION** |
| Play feature graphic | 1024 × 500 PNG | `docs/store-assets/google-play-feature-graphic.png` | **EXISTS** | Reconfirm name/domain before upload |
| App Store screenshots | Not finalized | screenshot directories/store draft | **MISSING** | Capture final signed-build set |
| Play screenshots | Not finalized | screenshot directories/store draft | **MISSING** | Capture final signed-build set |
| App Store description | Draft exists | `docs/store-metadata/app-store.md` | **EXISTS** | Fact-check against final build |
| Play description | Draft exists | `docs/store-metadata/google-play.md` | **EXISTS** | Fact-check against final build |
| Keywords/tags | Draft exists | store metadata files | **EXISTS** | Final owner/ASO review |
| Promotional text | Not separately defined | App Store draft | **MISSING** | Draft or mark intentionally blank |
| Categories | Health & Fitness; Food & Drink secondary on Apple | metadata docs | **EXISTS** | Confirm in consoles |
| Age/content rating | Apple 4+; Play Everyone/13+ target guidance | store docs | **PARTIAL** | Complete platform questionnaires |
| Release notes | Apple initial v1.0.0 only | App Store draft | **PARTIAL** | Add Android and release-specific notes |
| Localization | English only | repository search | **PARTIAL** | **NEEDS OWNER CONFIRMATION** on launch locales |
| Root page title | CaloraApp | live root | **EXISTS** | Align with final name |
| Root meta description | None | live root | **MISSING** | Add product description |
| Root canonical | None | live root | **MISSING** | Set official canonical after domain decision |
| Legal-page metadata | Title/description/canonical | public-page route | **EXISTS** | Add share/structured metadata if retained as public site |
| `robots.txt` | 404 | live probe | **MISSING** | Add after crawl strategy is approved |
| Sitemap | 404 | live probe | **MISSING** | Add canonical public URLs |
| Web manifest | 404 | live probe | **MISSING** | Add only if web/PWA discovery is intended |
| General OG/Twitter | Invite only | universal-link route | **PARTIAL** | Add main product/site cards |
| JSON-LD/schema | None | repository/live search | **MISSING** | Add Organization + MobileApplication after identity decisions |
| Social profiles | None | repository search | **MISSING** | **NEEDS OWNER CONFIRMATION** |
| Universal links | Live at Replit host | app config/live AASA | **EXISTS** | Preserve until coordinated migration |
| Android App Links | Live at Replit host | app config/live assetlinks | **EXISTS** | Preserve until coordinated migration |
| Auth callback | Replit HTTPS `/auth/callback` | app/auth/association sources | **EXISTS** | Verify provider allow-list and signed devices |
| App Store URL | Not repository-confirmed/live | universal-link fallback | **MISSING/EXTERNAL** | Add exact live listing after publication |
| Google Play URL | Package URL returns 404 | universal-link route/live probe | **MISSING** | Add after listing publication |
| Secret safety | No private values reproduced; public SDK values committed by design | EAS/client/server references | **PARTIAL** | Final credential-classification review before release |

---

## 22. Items Requiring Owner Confirmation

The owner must confirm:

1. Is the official customer-facing product name **Calora** or **CaloraApp**?
2. If the name is CaloraApp, may Calora remain approved shorthand?
3. Is `mycaloraapp.com` still the intended primary website?
4. Should the current Replit domain remain public in store metadata, or is it
   temporary?
5. Is `calora.app` owned/approved, or must it be removed from invite artwork?
6. What are the exact Apple seller and Google Play developer display names?
7. Is a business address required for legal/store/customer trust surfaces?
8. Is a public phone number required?
9. Is one shared support mailbox approved for support, billing, privacy,
   legal, security, and transactional communication?
10. What launch territories and languages are approved?
11. Are Apple 4+ and Google target-audience/content-rating drafts still
    appropriate after final console questionnaires?
12. Is version 1.0.0 still the intended first public release?
13. What are the latest externally assigned iOS build and Android versionCode?
14. Are the current App Store and Google Play app records created?
15. Which social profiles, if any, are official?
16. Is a full branded marketing website required before store submission?
17. Are final screenshot captions and creative direction approved?

---

## 23. Recommended Next Phase

Proceed with a controlled **Owner Decision and Final Metadata Specification**
phase, not implementation.

Recommended order:

1. Lock the official public name: Calora or CaloraApp.
2. Lock the canonical public domain strategy.
3. Confirm company/seller/developer/contact details.
4. Confirm store-account and listing status.
5. Confirm version/build identities from the final signed candidates.
6. Approve English store copy, category, content rating, and territory scope.
7. Define missing asset deliverables:
   - adaptive/monochrome/notification icons;
   - dedicated splash/favicon/wordmark files;
   - final store screenshots;
   - general social share image.
8. Define web discovery deliverables:
   - canonical root metadata;
   - robots/sitemap;
   - JSON-LD;
   - social profiles.
9. Produce the final metadata specification with no unresolved placeholders.
10. Only after explicit authorization, implement metadata/asset/domain changes
    as a separate phase with native and public-link validation.

---

## 24. Final Verdict

# NOT READY FOR FINAL METADATA SPECIFICATION

The project has enough verified evidence to identify the decisions and missing
deliverables, but it does not yet have enough owner-approved information to
produce a final official metadata package without guessing.

The blocking issues are:

- official name conflict;
- non-resolving branded domains;
- unapproved canonical production-domain strategy;
- missing live store listings and external developer identities;
- incomplete icon/splash/screenshot/social asset family;
- incomplete general web/SEO/structured metadata;
- missing business/contact/social decisions;
- unconfirmed final native release identities.

No application code, configuration, assets, database data, environment
variables, build settings, deployment state, or store records were changed by
this audit.