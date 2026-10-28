# Calora Experience 06 — Settings and Navigation

## Navigation contract

The visible tabs remain exactly **Today, Recipes, Scan, Plan, More**. More prioritizes three primary cards for Fasting, Progress, and Learning. Quick Access remains compact and secondary, linking to existing Saved Meals, Coach, Reminders, Membership, Goals, and Health locations.

Progress remains accessible from More and existing Today actions. Fasting links to its dedicated destination, its safety education, and the existing reminder controls. Learning has a canonical route for detail pages. Saved Meals and Dashboard Layout are dedicated destinations that reuse existing stores rather than duplicate data.

## Settings contract

The existing **You / Membership / Account** architecture is preserved:

- **You:** personal details, nutrition goals, appearance/text size, reminders, personalization, dashboard layout, Saved Meals, and onboarding preferences.
- **Membership:** existing RevenueCat plan selection, trial/store disclosures, purchase restoration, management, and referrals—without invented success states.
- **Account:** authentication, sign-out, Health permissions, export, local-data deletion, account deletion, legal/privacy/support. Destructive controls remain separated and confirmed.

Existing deep-link validation redirects contextual reminders/goals to You and Health to Account. Account deletion warnings continue to distinguish account deletion from store-billing cancellation.

## Accessibility and visual integrity

The branch retains PR #241’s semantic color, contrast, font scaling, reduced-motion, header/back behavior, and screen-reader label work. New routes use the existing app chrome and semantic palette rather than bespoke global styling.
