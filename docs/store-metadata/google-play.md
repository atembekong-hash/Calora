# Google Play Store — CaloraApp Store Listing Metadata

> Repository-controlled specification for Google Play Console submission.
> Do not publish without owner authorization.
> All metadata must accurately describe the production application.

---

## App Identity

| Field | Value |
|---|---|
| App name | CaloraApp |
| Package ID | com.etiendem.caloraapp |
| Category | Health & Fitness |
| Content rating | Everyone |
| Tags | Calorie counter, Nutrition tracker, Meal planner |

---

## Short Description (80 characters max)

Track calories, scan meals, understand nutrition, and reach your goals with AI.

---

## Full Description (4000 characters max)

Nutrition tracking should not feel like data entry. CaloraApp helps you log meals faster, understand what you eat, plan ahead, and see the habits shaping your progress.

SMART FOOD LOGGING
Scan a meal photo, read a barcode, or type what you ate — CaloraApp identifies foods and estimates nutrition as a starting point for your review. You confirm before anything goes in your diary.

NUTRITION INSIGHTS
See your daily calories, protein, carbohydrates, and fat at a glance. Weekly signals summarize your patterns so trends are visible without obsessing over single days.

MEAL PLANNING
Plan your week around your nutrition goals. CaloraApp's AI planner builds a balanced week from a curated recipe catalog matched to your daily target and food preferences.

RECIPES
Browse, search, and save recipes. Log a recipe directly to your diary or add ingredients to your shopping list.

PROGRESS
Track your weight over time alongside your nutrition. See how your habits are shaping your direction.

AI COACH
Ask CaloraApp Coach about your nutrition patterns, meals, or goals. Coach uses your actual diary data to give contextual, evidence-aware guidance — not generic advice.

PRIVACY BY DESIGN
CaloraApp is local-first. If you sign in, diary entries sync to your Calora account; AI features send only the information needed for the feature you request. You can export local data or permanently delete your account from Settings.

Nutrition values, AI analysis, and photo estimates are starting points for your review — not exact measurements or medical advice.

---

## Contact Details

| Field | Value |
|---|---|
| Email | support@mycaloraapp.com |
| Website | https://calorie-coach-pie35449.replit.app/api/legal/ |
| Privacy Policy | https://calorie-coach-pie35449.replit.app/api/legal/privacy |

---

## Data Safety (Google Play Data Safety)

See `docs/CALORAAPP_PRODUCT_METADATA.md` § Privacy Data Inventory for the full data audit.

**Data collected and shared with third parties:**
- Food descriptions and photos are sent to an AI provider (OpenAI via proxy) for food recognition and coach responses. Images are not retained after analysis.
- Email/account identity is processed by Supabase Auth.
- Subscription/customer status is processed by RevenueCat and Google Play.
- Health activity and weight are read only after the user grants Health Connect permission.

**Data collected and NOT shared:**
- Authenticated diary entries sync to Calora's account-scoped backend.
- Profile, local wellness data, and imported health data otherwise remain in Calora's on-device state except when bounded context is submitted for a requested AI feature.

**Data not collected:**
- Precise or approximate location, contacts, full payment-card details, advertising data, analytics, and crash diagnostics.

> Google Play Data Safety declarations must be completed in the Play Console based on the final production data audit before submission.

---

## Screenshot Narrative

| # | Headline | Supporting | Screen to show |
|---|---|---|---|
| 1 | Meet CaloraApp | Smarter nutrition starts here. | Onboarding |
| 2 | Log meals in seconds | Scan, search, or type what you ate. | Smart Scan |
| 3 | Know what you're eating | Every number shows where it came from. | Food review |
| 4 | See your day at a glance | Calories, macros, and progress in one view. | Home |
| 5 | Plan meals around your goals | A balanced week, built around you. | Planner |
| 6 | Find meals worth eating | Recipes matched to your preferences. | Recipes |
| 7 | Understand your progress | Habits visible, trends that make sense. | Progress |
| 8 | Guidance when you need it | AI Coach uses your actual data. | Coach |

---

## Feature Graphic

Required dimensions: 1024 × 500 px
Content: CaloraApp wordmark + tagline "Eat Smarter. Live Better." on brand-consistent background.
Status: **REQUIRES OWNER ACTION** — asset not yet created.
