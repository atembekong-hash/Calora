# Calora product strategy

## 2026 competitive audit

This is a directional product audit, not a lab-grade benchmark. Public pricing, feature pages, App Store/Play Store review themes, and independent 2026 comparison articles were used to identify opportunities. Pricing can vary by country, platform, promotions, and test cohort; verify final offers inside each app before launch.

| App | Data verification method | AI logging speed | Pricing transparency | Reported friction to design against | Strategic read |
| --- | --- | --- | --- | --- | --- |
| MyFitnessPal | Very large mixed database; branded entries and user-created foods vary in provenance. | Search/barcode are mature; AI and photo-led logging are improving but not the default for every user. | Tiered Free, Premium, and Premium+ messaging can make the offer feel complex. | Ads and premium gates, database duplicates, sync/data-loss or entry bugs after updates, and a dense surface. | Win on calmness, provenance labels, and a single obvious value proposition. |
| Cronometer | Strong science/USDA-style foundation and unusually deep micronutrient coverage. | Mostly deliberate search/manual logging; photo-first speed is not the core identity. | Gold benefits are relatively clear, but the many analysis options add cognitive load. | Dated or dense UX, effort required to log mixed meals, and a learning curve for casual users. | Win on a fast default path while preserving an accuracy mode. |
| Noom | Coaching and behavior content are the primary trust mechanism; food data provenance is less visible to users. | Faster for coached plans and common foods than for custom mixed meals. | Trial/renewal language and plan packaging can create suspicion if not explained plainly. | Coaching overload, repetitive prompts, pricing/cancellation anxiety, and a mismatch for users who only want logging. | Win by making coaching optional and pricing literal. |
| Cal AI | AI photo capture is the central promise; estimates are fast and motivating. | Fastest perceived start for a photo, but food decomposition and portion uncertainty require review. | The subscription is prominent, but users still need clear renewal and entitlement language. | Photo accuracy, portion estimates, paywalls, and trust when a confident-looking result is wrong. | Win with confidence ranges, one-tap corrections, and visible evidence behind estimates. |
| Lifesum | Curated/partner and user data mix, with broad food and wellness coverage. | Fast search, barcode, and guided plans; less differentiated around verified AI review. | Multiple plan surfaces and promotions can obscure the simplest price. | Ads, notifications, feature gates, and occasional database or sync frustration. | Win on fewer prompts and a smaller, more coherent core loop. |
| AppDiet | Lightweight tracker positioning; verification and dataset depth are less visible publicly. | Manual-first simplicity can be quick for repeat foods. | Smaller product surface makes pricing easier to understand, but public details are inconsistent. | Limited depth, less mature integrations, and uncertainty about database authority. | Win with a trust layer and richer repeat-meal shortcuts without adding clutter. |
| KCALM | AI-led logging with a messaging angle; verification is less visibly standardized than USDA-first tools. | Photo, text, and voice in a conversational flow can be extremely fast. | Messaging-led offers need a very explicit in-app plan and cancellation path. | AI confidence, country/food coverage, and handoff from chat result to a reliable diary. | Win by pairing chat-speed capture with an audit trail and structured diary. |

### Scorecard

Scores are 1–5, where 5 is strongest for the user. They are strategic estimates used to prioritize Calora’s wedge, not claims of measured app-store performance.

| App | Trust / verification | Photo & voice speed | Price clarity | UX simplicity | Ads / interruption risk | Opportunity gap |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| MyFitnessPal | 3 | 3 | 2 | 2 | 2 | Make the default loop smaller and more explainable. |
| Cronometer | 5 | 2 | 4 | 3 | 4 | Add a fast capture layer without losing evidence. |
| Noom | 3 | 3 | 2 | 3 | 2 | Remove coaching from the critical path. |
| Cal AI | 2 | 5 | 3 | 4 | 3 | Make estimates accountable, not just instant. |
| Lifesum | 3 | 3 | 3 | 3 | 2 | Reduce wellness surface area and interruptions. |
| AppDiet | 2 | 2 | 4 | 4 | 4 | Add authoritative data and feedback loops. |
| KCALM | 3 | 5 | 3 | 4 | 4 | Bridge conversational speed to a structured, trusted log. |
| **Calora target** | **5** | **5** | **5** | **5** | **5** | One-tap capture, visible confidence, local-first reliability, plain $4.99 / $35.99 pricing. |

## Gaps Calora should own

1. **Speed with accountability:** photo, voice, or search should create a reviewable estimate in seconds, with confidence and the evidence behind it.
2. **A verified core, not a noisy mega-database:** show source, last verified date, serving basis, and conflict flags. Keep user-created foods separate.
3. **One-screen correction:** let a user change food, portion, cooking state, or oil with one or two taps; never force a full re-log.
4. **Plain monetization:** no ads in the core loop, show the permanent $4.99 monthly and $35.99 annual ($3.00/month billed annually) pricing, state the 7-day free trial and same-price renewal terms before purchase, and provide a visible cancel/manage link.
5. **Adaptive but legible goals:** only change targets when there is enough signal, and explain the reason in one sentence.
6. **Offline-first trust:** logging, recent foods, and daily totals should work without a connection and reconcile later.

## Minimal viable schema for a verified 1M+ food database

Use PostgreSQL for the canonical entities and a search index for normalized lookup. Keep immutable source snapshots so every displayed nutrient can be reproduced.

### Canonical tables

- `foods`: `id`, `canonical_name`, `brand_id`, `category`, `country_codes`, `default_serving_id`, `status`, `created_at`, `updated_at`.
- `food_aliases`: `food_id`, `alias`, `locale`, `normalized_alias`, `search_weight`.
- `brands`: `id`, `name`, `manufacturer`, `country_codes`, `verification_level`.
- `servings`: `id`, `food_id`, `label`, `grams`, `milliliters`, `household_unit`, `is_default`.
- `nutrient_profiles`: `food_id`, `basis` (`per_100g`, `per_serving`), `energy_kcal`, `protein_g`, `carbohydrate_g`, `fat_g`, `fiber_g`, `sugar_g`, `sodium_mg`, `micronutrients_json`.
- `food_barcodes`: `food_id`, `gtin`, `region`, `source_id`, `valid_from`, `valid_to`.
- `food_sources`: `id`, `provider`, `source_record_id`, `source_url`, `license`, `retrieved_at`, `snapshot_hash`.
- `food_verifications`: `food_id`, `method` (`lab`, `government`, `label`, `editorial`, `community`), `reviewer_id`, `confidence`, `checked_at`, `notes`.
- `food_edits`: `food_id`, `field`, `old_value`, `new_value`, `actor_type`, `reason`, `created_at`.
- `food_conflicts`: `food_id`, `field`, `severity`, `status`, `candidate_values`, `resolved_by`, `resolved_at`.
- `recipes`: `id`, `owner_id`, `name`, `yield_servings`, `source`, `created_at`.
- `recipe_items`: `recipe_id`, `food_id`, `quantity_grams`, `preparation_state`.

### User diary tables

- `users`, `profiles`, `goals`, `weight_observations`, `food_logs`, `food_log_items`, `ai_capture_sessions`, `ai_capture_candidates`, `subscriptions`, and `consent_events`.
- Each `food_log_item` stores `food_id` or `custom_food_id`, quantity, unit, preparation state, nutrient snapshot, provenance, confidence, and correction history. Store the nutrient snapshot at log time so a later database edit cannot silently rewrite history.

### Scale and quality rules

- Partition diary data by `user_id` and month; index `(user_id, logged_at)`.
- Keep canonical food IDs stable; create new versions for materially changed nutrition.
- Deduplicate by normalized brand / GTIN / serving / nutrient fingerprint before search indexing.
- Use a verification queue with automated outlier checks plus human review for high-volume foods.
- Never display “verified” without a source, method, and check date.
- Separate estimated AI output from accepted diary data; AI candidates never become food truth automatically.

## Launch handoff

### Ready in the local-first mobile build

- Onboarding, profile-based starting targets, consent acknowledgement, and resume-safe local persistence.
- Date-aware diary with previous/next navigation, empty states, manual/search/verified/photo-estimate logging, one-screen editing, and deletion.
- Saved meals and recipe templates, weekly insights, weight trend logging, macro and micronutrient views, and adaptive-target messaging.
- Light, dark, and system themes; transparent 7-day free trial, $4.99/month, and $35.99/year ($3.00/month billed annually) Pro presentation; export and local delete controls.
- Persisted offline outbox records with an explicit waiting-for-connection state rather than a false synced state.
- App icon, splash, Expo iOS/Android configuration, accessible labels for core actions, and verified end-to-end preview coverage.

### Required before store submission

- Attach a native billing provider and create the App Store/Google Play products before enabling purchases. The current UI intentionally does not take payment or imply an entitlement.
- Add native HealthKit and Health Connect packages, permission copy, import provenance, last-sync timestamps, conflict handling, and disconnect/delete behavior.
- Implement authenticated API route handlers and database migrations for the OpenAPI contracts, then connect the mobile outbox to conflict-safe reconciliation.
- Add production account/auth, server-backed export/delete execution, consent history UI, privacy policy URL, support URL, store subscription metadata, and country-specific tax/legal review.
- Replace photo-library estimates with a real reviewable recognition service and add native camera, barcode, and microphone capability flows.

### Release acceptance

1. Test onboarding, date navigation, edit/delete, saved-meal reuse, theme switching, export/delete, and permission-required states on both iOS and Android builds.
2. Verify every paid path in sandbox stores: purchase, restore, renewal, cancellation/manage, pending, declined, unavailable-store, and entitlement expiration.
3. Verify offline logging, app restart persistence, duplicate-safe sync retries, stale-write conflicts, and account deletion.
4. Confirm nutrition copy remains non-clinical and that estimates cannot silently become verified food truth.

## Fitness program provider decision

### First approved provider: LES MILLS Content

Calora’s first trusted fitness-program provider is **LES MILLS Content**, selected on August 30, 2026. The approved integration path is the provider’s official Content Portal API, paired with attributed links back to official LES MILLS destinations.

This is an approved target and content boundary, not a claim that partner credentials, a commercial agreement, or a production feed is active. The app should keep program discovery unavailable until the provider relationship is executed and access is verified.

#### Launch rights and display policy

The first launch may:

- display provider-approved program metadata that is delivered through the official API or an approved partner feed;
- show required LES MILLS attribution, branding, and source links;
- deep-link users to the corresponding official program destination.

The first launch may **not**:

- copy, scrape, crawl, or proxy LES MILLS pages or APIs;
- republish workout instructions, class descriptions beyond licensed metadata, images, video, audio, instructor likenesses, or other proprietary assets;
- provide in-app playback or render licensed program content unless a signed agreement expressly grants those rights;
- infer a program catalog from public pages when an official partner feed is unavailable.

#### Contract gates before activation

Before switching the UI from “partner access pending” to live discovery, product and legal must confirm in writing:

1. API or partner-feed credentials and permitted fields;
2. territory, language, and catalog coverage;
3. metadata, logo, attribution, and deep-link requirements;
4. whether any content rendering or playback is licensed (default: no);
5. commercial terms, usage limits, reporting, termination, and takedown behavior.

The app’s source-of-truth implementation keeps the launch model as `metadata-deep-link`; it must not be widened to licensed in-app content by implementation convenience.

#### Provider comparison

| Candidate | Official access signal | Rights and coverage assessment | Decision |
| --- | --- | --- | --- |
| **LES MILLS Content** | Public official Content Portal API documentation and formal partner distribution examples. | Strong, curated program coverage; proprietary rights require a signed partner agreement and explicit attribution/rendering terms. | **Selected first. Metadata + official deep links only at launch.** |
| wger | Public official REST API. | Useful exercise/routine reference data, but not a comparable premium editorial program catalog; license, image, and contribution provenance must be reviewed per feed/version. | Not selected as the first program provider. |
| Peloton | No public partner discovery API was identified; public distribution examples are negotiated partnerships. | Strong proprietary-content restrictions and a closed catalog. | Not selected; do not scrape or proxy. |
| FitOn | No public program-discovery API or self-serve partner feed was identified. | Partnership-led content with terms requiring direct confirmation. | Not selected; do not scrape or proxy. |

Official references: [LES MILLS Content Portal API](https://api.content.lesmills.com/docs/), [LES MILLS partner distribution announcement](https://www.lesmills.com/us/articles/les-mills-and-hyperhuman-bring-premium-fitness-content-into-the-ai-powered-platform-era), [wger REST API](https://wger.de/api/v2/), [Peloton intellectual-property policy](https://www.onepeloton.com/ip-policy).
