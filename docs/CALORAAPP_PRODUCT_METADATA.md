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
| Main website | https://mycaloraapp.com |
| Privacy Policy | https://mycaloraapp.com/privacy |
| Terms of Use | https://mycaloraapp.com/terms |
| Help & Support | https://mycaloraapp.com/support |
| Contact | https://mycaloraapp.com/contact |
| Account Deletion | https://mycaloraapp.com/delete-account |
| Subscription Info | https://mycaloraapp.com/subscriptions |
| Help Center | https://mycaloraapp.com/help |
| Provisional API hostname | https://api.mycaloraapp.com *(not yet live — see §11)* |

> **IMPORTANT:** `https://api.mycaloraapp.com` is the preferred production API hostname but is not yet configured.
> The working development API endpoint must not be replaced until this hostname is live and operational.
> Product metadata and live network configuration are separate concerns.

---

## 3. Email Identity

| Role | Address |
|---|---|
| Customer support | support@mycaloraapp.com |
| Billing | billing@mycaloraapp.com |
| Privacy | privacy@mycaloraapp.com |
| Security | security@mycaloraapp.com |
| Legal | legal@mycaloraapp.com |
| General contact | contact@mycaloraapp.com |
| Transactional sender | noreply@mycaloraapp.com |

> **Status:** All email addresses require external DNS and email-provider configuration before launch. None are currently active.

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
| Annual | 7-day free trial | $35.99/year ($2.99/month billed annually) | Renews at $35.99/year unless changed or canceled through the store |

> **IMPORTANT:**
> - These are the permanent US production prices. There is no introductory, first-year, or later higher renewal tier.
> - Actual localized prices, taxes, and trial eligibility are configured in App Store Connect, Google Play Console, and RevenueCat — those configurations are authoritative.
> - The live paywall must use authoritative store/RevenueCat product data when a valid store product is available.
> - Trial eligibility must be determined by the store, not assumed.

### RevenueCat Status
RevenueCat client integration and repository seed configuration exist. Production still requires the external product, package, entitlement, and trial configuration to match this model, followed by native purchase verification.

---

## 6. Subscription Disclosure (required on paywall)

> Eligible customers receive a 7-day free trial. After the trial, your selected subscription begins at $4.99/month or $35.99/year ($2.99/month billed annually) and renews at the same plan price unless changed or canceled through the store.

---

## 7. Legal Metadata

| Document | URL | Status |
|---|---|---|
| Privacy Policy | https://mycaloraapp.com/privacy | 🚫 PAGE NOT YET LIVE — **external launch blocker** |
| Terms of Use | https://mycaloraapp.com/terms | 🚫 PAGE NOT YET LIVE — **external launch blocker** |
| Subscription Info | https://mycaloraapp.com/subscriptions | 🚫 PAGE NOT YET LIVE — **external launch blocker** |
| Account Deletion | https://mycaloraapp.com/delete-account | 🚫 PAGE NOT YET LIVE — **external launch blocker** |

> Required by Apple App Store, Google Play, and applicable data protection regulations before public distribution.

---

## 8. Nutrition and Health Disclaimer

The following disclaimer must appear in appropriate places (Terms of Use, AI Coach context, onboarding where required):

> Nutrition values, AI analysis, photo estimates, recommendations and other information provided by CaloraApp are estimates and are intended for general informational and wellness purposes. They are not medical advice.

CaloraApp Coach must not present itself as a doctor, registered dietitian, diagnostic system, emergency service, or substitute for professional medical care.

---

## 9. Privacy Data Inventory

### Locally Stored (on device only — AsyncStorage `@calora/local-state-v2`)

| Data Type | Collected | Stored | Transmitted | To Whom | Purpose | Deletion |
|---|---|---|---|---|---|---|
| Display name | Yes | Local | No | — | Personalization | Delete local data |
| Age, height, weight, goal weight | Yes | Local | No | — | Calorie target calculation | Delete local data |
| Calorie goal, macro goal | Yes | Local | No | — | Diary tracking | Delete local data |
| Food diary (logs, timestamps) | Yes | Local | No | — | Nutrition tracking | Delete local data |
| Saved meals | Yes | Local | No | — | Quick logging | Delete local data |
| Meal plans (planner) | Yes | Local | No | — | Meal planning | Delete local data |
| Weight entries | Yes | Local | No | — | Progress tracking | Delete local data |
| Water, mood, wellness entries | Yes | Local | No | — | Wellness tracking | Delete local data |
| Living memory observations | Yes | Local | No | — | Pattern personalization | Delete local data |
| Theme / font / unit preferences | Yes | Local | No | — | Personalization | Delete local data |
| Reminder preferences | Yes | Local | No | — | Scheduling | Delete local data |

### Transmitted to API Server (ephemeral, not persisted with user identity)

| Data Type | Transmitted | To Whom | Purpose | Retention |
|---|---|---|---|---|
| Food description text | Yes (Scan/text mode) | OpenAI (via Replit proxy) | Food recognition | Not retained by API |
| Food photo (base64) | Yes (Scan/photo mode) | OpenAI (via Replit proxy) | Food recognition | Not retained by API; `imageRetention: delete_after_analysis` |
| Nutrition label photo | Yes (Scan/label mode) | OpenAI (via Replit proxy) | Nutrition extraction | Not retained by API |
| Coach conversation messages | Yes | OpenAI (via Replit proxy) | AI guidance | Not retained server-side |
| User profile context (Coach) | Yes (bounded) | OpenAI (via Replit proxy) | Personalized guidance | Not retained server-side |
| Planner preferences | Yes | OpenAI (via Replit proxy) | Meal plan generation | Not retained server-side |

### Not Collected

- Email address (no auth)
- Account ID (no auth)
- Precise or approximate location
- Device identifiers
- Analytics
- Crash diagnostics
- Push notification tokens (notifications are local-only, scheduled on-device)
- Health platform data (HealthKit/Health Connect UI placeholder exists; no data is actually read)
- Subscription/purchase data (RevenueCat not yet integrated)

---

## 10. Third-Party Services

| Service | Purpose | Secrets Location | Data Sent | Production Ready |
|---|---|---|---|---|
| OpenAI (via Replit AI Integrations proxy) | Food recognition, nutrition label reading, AI Coach, meal planning | Server-side env vars only | Food descriptions, photos (ephemeral), coach messages | ✅ Integrated |
| TheMealDB | Recipe catalog | None (public API) | Recipe queries | ✅ Integrated |
| Open Food Facts | Barcode lookup | None (public API) | Barcode strings | ✅ Integrated |
| USDA FoodData Central | Barcode fallback | `USDA_FOODDATA_API_KEY` (server-side) | Barcode/food queries | ✅ Integrated (DEMO_KEY fallback) |
| Replit (hosting) | Development hosting, preview | Platform | App code | ✅ Development |
| RevenueCat | In-app subscriptions | Not yet configured | Purchase events | ❌ Not integrated |
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

No authentication system is currently implemented. The app is local-first with no user accounts, email, Google Sign-In, or Sign in with Apple. No OAuth client IDs, redirect URIs, or Firebase configuration exists.

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
| Domain DNS (`mycaloraapp.com`) | REQUIRES OWNER ACTION |
| Email aliases (all `@mycaloraapp.com`) | REQUIRES OWNER ACTION |
| Privacy Policy page hosted at `/privacy` | REQUIRES OWNER ACTION — **launch blocker** |
| Terms of Use page hosted at `/terms` | REQUIRES OWNER ACTION — **launch blocker** |
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
