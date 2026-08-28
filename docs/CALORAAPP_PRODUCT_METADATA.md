# CaloraApp — Canonical Product Metadata

> **This document is the authoritative source of truth for CaloraApp product identity.**
> Future agents and contributors must read this before modifying any product name, URL, identifier, or subscription configuration.
> It clearly distinguishes **Canonical Business Metadata** from **Current Technical Configuration** to prevent blind overwrites of production identifiers.

---

## 1. Identity

| Field | Value |
|---|---|
| Official product name | **CaloraApp** |
| Short name | CaloraApp |
| Publisher / company | **Etiendem Technologies** |
| Primary positioning | AI Nutrition & Calorie Tracker |
| Brand tagline | Eat Smarter. Live Better. |
| Copyright | © 2026 Etiendem Technologies |
| Platforms | iOS and Android |
| Primary store category | Health & Fitness |
| Secondary category | Food & Drink |

---

## 2. Domains and URLs

| Purpose | URL |
|---|---|
| Main website | https://calorie-coach-pie35449.replit.app/api/legal/ |
| Privacy Policy | https://calorie-coach-pie35449.replit.app/api/legal/privacy |
| Terms of Use | https://calorie-coach-pie35449.replit.app/api/legal/terms |
| Help & Support | https://calorie-coach-pie35449.replit.app/api/legal/support |
| Contact | https://calorie-coach-pie35449.replit.app/api/legal/contact |
| Account Deletion | https://calorie-coach-pie35449.replit.app/api/legal/delete-account |
| Subscription Info | https://calorie-coach-pie35449.replit.app/api/legal/subscriptions |
| Help Center | https://calorie-coach-pie35449.replit.app/api/legal/help |
| Provisional API hostname | https://api.mycaloraapp.com *(not yet live — see §11)* |

> **IMPORTANT:** `https://api.mycaloraapp.com` is the preferred production API hostname but is not yet configured.
> The working development API endpoint must not be replaced until this hostname is live and operational.
> Product metadata and live network configuration are separate concerns.

---

## 3. Email Identity

| Role | Address |
|---|---|
| Customer support | support@mycaloraapp.com |
| Billing | support@mycaloraapp.com |
| Privacy | support@mycaloraapp.com |
| Security | support@mycaloraapp.com |
| Legal | support@mycaloraapp.com |
| General contact | support@mycaloraapp.com |
| Transactional sender | support@mycaloraapp.com |

> **Status:** `support@mycaloraapp.com` is the monitored customer channel for support, privacy, billing, legal, security, and general contact requests.

---

## 4. Technical Identifiers — Current vs. Preferred

| Identifier | Canonical / Preferred | Current Configuration | Status |
|---|---|---|---|
| iOS Bundle ID | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | ✅ SET — not yet externally registered in App Store Connect |
| Android Package | `com.etiendem.caloraapp` | `com.etiendem.caloraapp` | ✅ SET — not yet externally registered in Google Play |
| URL scheme | `caloraapp` | `caloraapp` | ✅ SET — no external OAuth or deep-link registered yet |
| Expo slug | `calora` | `calora` | ⚠️ PRESERVED — Expo cloud project slug; changing requires EAS project migration |
| AsyncStorage key | `@calora/local-state-v2` | `@calora/local-state-v2` | 🔒 DO NOT CHANGE — persisted user data contract |
| Notification tags | `calora-hydration`, `calora-meals`, `calora-goal` | same | 🔒 DO NOT CHANGE — scheduled on existing devices |
| DB table name | `calora_recipe_nutrition` | `calora_recipe_nutrition` | 🔒 DO NOT CHANGE — schema stability over cosmetic naming |
| Export filename | `caloraapp-export.json` | `caloraapp-export.json` | ✅ UPDATED |

> **Rule:** Do not change externally registered identifiers without explicit owner authorization and a migration plan.

---

## 5. Subscription Identity

| Field | Value |
|---|---|
| Premium tier display name | **CaloraApp Pro** |
| Entitlement ID (preferred) | `caloraapp_pro` |
| Monthly product ID (preferred) | `caloraapp_pro_monthly` |
| Annual product ID (preferred) | `caloraapp_pro_annual` |
| RevenueCat offering | `default` |

### Final Production Pricing Model

| Plan | Trial | Price | Renewal |
|---|---|---|---|
| Monthly | 7-day free trial | $4.99/month | Renews at $4.99/month unless changed or canceled through the store |
| Annual | 7-day free trial | $35.99/year ($3.00/month billed annually) | Renews at $35.99/year unless changed or canceled through the store |

> **IMPORTANT:**
> - These are the permanent US production prices. There is no introductory, first-year, or later higher renewal tier.
> - Actual localized prices, taxes, and trial eligibility are configured in App Store Connect, Google Play Console, and RevenueCat — those configurations are authoritative.
> - The live paywall must use authoritative store/RevenueCat product data when a valid store product is available.
> - Trial eligibility must be determined by the store, not assumed.

### RevenueCat Status
RevenueCat client integration and repository seed configuration exist. Production still requires the external product, package, entitlement, and trial configuration to match this model, followed by native purchase verification.

---

## 6. Subscription Disclosure (required on paywall)

> Eligible customers receive a 7-day free trial. After the trial, your selected subscription begins at $4.99/month or $35.99/year ($3.00/month billed annually) and renews at the same plan price unless changed or canceled through the store.

---

## 7. Legal Metadata

| Document | URL | Status |
|---|---|---|
| Privacy Policy | https://calorie-coach-pie35449.replit.app/api/legal/privacy | ✅ Published at the confirmed public origin |
| Terms of Use | https://calorie-coach-pie35449.replit.app/api/legal/terms | ✅ Published at the confirmed public origin |
| Subscription Info | https://calorie-coach-pie35449.replit.app/api/legal/subscriptions | ✅ Published at the confirmed public origin |
| Account Deletion | https://calorie-coach-pie35449.replit.app/api/legal/delete-account | ✅ Published at the confirmed public origin |

> Required by Apple App Store, Google Play, and applicable data protection regulations before public distribution.

---

## 8. Nutrition and Health Disclaimer

The following disclaimer must appear in appropriate places (Terms of Use, AI Coach context, onboarding where required):

> Nutrition values, AI analysis, photo estimates, recommendations and other information provided by CaloraApp are estimates and are intended for general informational and wellness purposes. They are not medical advice.

CaloraApp Coach must not present itself as a doctor, registered dietitian, diagnostic system, emergency service, or substitute for professional medical care.

---

## 9. Privacy Data Inventory

### Stored locally first (AsyncStorage `@calora/local-state-v2`)

| Data Type | Collected | Stored | Transmitted | To Whom | Purpose | Deletion |
|---|---|---|---|---|---|---|
| Display name | Yes | Local | Bounded context on requested AI features | OpenAI via Replit proxy | Personalization | Delete local data |
| Age, height, weight, goal weight | Yes | Local | Bounded context on requested AI features | OpenAI via Replit proxy | Calorie target and personalized guidance | Delete local data |
| Calorie goal, macro goal | Yes | Local | Bounded context on requested AI features | OpenAI via Replit proxy | Diary tracking and personalized guidance | Delete local data |
| Food diary (logs, timestamps) | Yes | Local and, when signed in, Calora backend | Yes for authenticated sync; bounded context for requested Coach features | Calora backend; OpenAI via Replit proxy when requested | Nutrition tracking, sync, contextual guidance | Delete account and local data |
| Saved meals | Yes | Local | No | — | Quick logging | Delete local data |
| Meal plans (planner) | Yes | Local | No | — | Meal planning | Delete local data |
| Weight entries | Yes | Local | Bounded context on requested AI features | OpenAI via Replit proxy | Progress tracking and personalized guidance | Delete local data |
| Water, mood, wellness entries | Yes | Local | No | — | Wellness tracking | Delete local data |
| Living memory observations | Yes | Local | No | — | Pattern personalization | Delete local data |
| Theme / font / unit preferences | Yes | Local | No | — | Personalization | Delete local data |
| Reminder preferences | Yes | Local | No | — | Scheduling | Delete local data |

### Account, sync, AI, and provider processing

| Data Type | Transmitted | To Whom | Purpose | Retention |
|---|---|---|---|---|
| Food description text | Yes (Scan/text mode) | OpenAI (via Replit proxy) | Food recognition | Not retained by API |
| Food photo (base64) | Yes (Scan/photo mode) | OpenAI (via Replit proxy) | Food recognition | Not retained by API; `imageRetention: delete_after_analysis` |
| Nutrition label photo | Yes (Scan/label mode) | OpenAI (via Replit proxy) | Nutrition extraction | Not retained by API |
| Coach conversation messages | Yes | OpenAI (via Replit proxy) | AI guidance | Not retained server-side |
| User profile context (Coach) | Yes (bounded) | OpenAI (via Replit proxy) | Personalized guidance | Not retained server-side |
| Planner preferences | Yes | OpenAI (via Replit proxy) | Meal plan generation | Not retained server-side |
| Email address and account ID | Yes when a user creates or signs into an account | Supabase Auth and Calora backend | Authentication, account ownership, account deletion | Retained while the account is active and as legally required |
| Authenticated diary entries | Yes while signed in | Calora backend | Cross-session diary sync | Retained while the account is active; removed through account deletion |
| Subscription/customer status | Yes when billing features are used | RevenueCat and Apple/Google | Purchase, entitlement, restore, and referral-reward handling | Controlled by the store and RevenueCat retention policies |
| Health activity and weight | Read only after explicit device permission | Apple Health / Health Connect and on-device Calora state | Progress and calorie context | Stored locally by Calora; not uploaded by the diary sync route |

### Not Collected

- Precise or approximate location
- Analytics
- Crash diagnostics
- Push notification tokens (notifications are local-only, scheduled on-device)
- Contacts
- Full payment-card details

---

## 10. Third-Party Services

| Service | Purpose | Secrets Location | Data Sent | Production Ready |
|---|---|---|---|---|
| OpenAI (via Replit AI Integrations proxy) | Food recognition, nutrition label reading, AI Coach, meal planning | Server-side env vars only | Food descriptions, photos (ephemeral), coach messages | ✅ Integrated |
| TheMealDB | Recipe catalog | None (public API) | Recipe queries | ✅ Integrated |
| Open Food Facts | Barcode lookup | None (public API) | Barcode strings | ✅ Integrated |
| USDA FoodData Central | Barcode fallback | `USDA_FOODDATA_API_KEY` (server-side) | Barcode/food queries | ✅ Integrated (DEMO_KEY fallback) |
| Replit (hosting) | Development hosting, preview | Platform | App code | ✅ Development |
| Supabase Auth | Email/password and Google authentication | Public project URL/key in the client; privileged operations server-side | Email, account ID, auth/session data | ✅ Integrated |
| RevenueCat | In-app subscriptions and referral entitlements | Public platform SDK keys in the client; secret server credentials in Replit | Customer ID, purchase and entitlement events | ✅ Integrated; native store purchase verification still required before submission |
| Apple Health / Health Connect | Optional health activity and weight import | Native permission grants | User-selected steps, active energy, workouts, and body weight | ✅ Integrated; accessed only after permission |
| Push notifications | Local reminders | None | Nothing (on-device only) | ⚠️ On-device only; no push token registered |

---

## 11. Environment Variables

| Variable | Classification | Location | Purpose |
|---|---|---|---|
| `DATABASE_URL` | SERVER SECRET | Replit Secrets | PostgreSQL connection string |
| `USDA_FOODDATA_API_KEY` | SERVER SECRET | Replit Secrets | USDA FoodData Central API access |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | SERVER SECRET | Replit Secrets | OpenAI via Replit proxy |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | SERVER SECRET | Replit Secrets | OpenAI proxy base URL |
| `SESSION_SECRET` | SERVER SECRET | Replit Secrets | Session signing |
| `EXPO_PUBLIC_DOMAIN` | PUBLIC CLIENT | Build env | API base URL for Expo app |

> API hostname migration: When `api.mycaloraapp.com` is operational, set `EXPO_PUBLIC_DOMAIN` to that hostname and update server hosting configuration.

---

## 12. Store Metadata Specification

See `docs/store-metadata/app-store.md` and `docs/store-metadata/google-play.md`.

---

## 13. Authentication Review

CaloraApp supports Supabase email/password and Google authentication. Signed-in users receive authenticated diary sync, referral, and account-deletion functionality. Authentication is optional for local-first use, and synced records remain scoped to the authenticated account.

Required before launch if authentication is added: Google Cloud OAuth consent screen, Apple Developer Sign in with Apple, bundle ID registration in respective consoles.

---

## 14. Versioning Convention

| Release type | Version format | Example |
|---|---|---|
| Initial production | 1.0.0 | 1.0.0 |
| Patch | 1.0.x | 1.0.1 |
| Feature release | 1.x.0 | 1.1.0 |
| Major generation | x.0.0 | 2.0.0 |

iOS build numbers and Android versionCode values must increase monotonically. Do not reset them.

---

## 15. External Actions Required Before Launch

| Item | Status |
|---|---|
| Custom domain DNS (`mycaloraapp.com`) | OPTIONAL — public legal/support URLs use the confirmed Replit production origin |
| Monitored support inbox (`support@mycaloraapp.com`) | ✅ CONFIRMED |
| Privacy Policy page hosted at `/privacy` | ✅ Published on the confirmed public origin |
| Terms of Use page hosted at `/terms` | ✅ Published on the confirmed public origin |
| App Store Connect — app record + bundle ID registration | REQUIRES STORE CONFIGURATION |
| Apple Developer — Sign in with Apple (if added) | REQUIRES CREDENTIAL |
| Google Play Console — app record + package ID registration | REQUIRES STORE CONFIGURATION |
| RevenueCat — production offering, products, packages, entitlement, and trial configuration | REQUIRES OWNER ACTION |
| Store subscription product IDs (`caloraapp_pro_monthly`, `caloraapp_pro_annual`) | REQUIRES STORE CONFIGURATION |
| Store recurring pricing ($4.99/mo, $35.99/yr) + 7-day free trial | REQUIRES STORE CONFIGURATION |
| App Store screenshots | REQUIRES OWNER ACTION |
| Google Play feature graphic | REQUIRES OWNER ACTION |
| `api.mycaloraapp.com` DNS and server deployment | REQUIRES OWNER ACTION |
| USDA FoodData Central production API key | REQUIRES CREDENTIAL |
| EAS project configuration (Apple Team ID, ASC App ID, service account) | REQUIRES CREDENTIAL |
