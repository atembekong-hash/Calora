---
name: CaloraApp metadata lock-in
description: Canonical product identity decisions and preserved internal identifiers after the Calora → CaloraApp rename.
---

## Rule
The official product name is **CaloraApp** (Etiendem Technologies). All customer-facing strings must use "CaloraApp" not "Calora". New code must import display strings from `artifacts/calora/lib/brand.ts` rather than scattering literals.

**Why:** Full rename executed across 22 files. Zero stray customer-facing "Calora" references remain after this migration.

**How to apply:** Before adding any string with the product name, import from `lib/brand.ts`. Before changing any identifier, check the preserved list below.

## Canonical values (from brand.ts)

- `BRAND.name` = "CaloraApp"
- `BRAND.publisher` = "Etiendem Technologies"
- `BRAND.premiumName` = "CaloraApp Pro"
- `BRAND.tagline` = "Eat Smarter. Live Better."
- `BRAND.domain` = "mycaloraapp.com"
- `URLS.*` = all mycaloraapp.com pages

## Identifiers PRESERVED — do not rename

| Identifier | Why frozen |
|---|---|
| `slug: "calora"` in app.json | Expo cloud slug — migration needed |
| `@calora/local-state-v2` | AsyncStorage persisted user data contract |
| `calora-hydration`, `calora-meals`, `calora-goal` | Notification tags on existing devices |
| `CaloraContext`, `useCalora` | Internal code identifiers, no user exposure |
| `@workspace/calora` | pnpm workspace name |
| `calora_recipe_nutrition` | DB table name |

## Subscription tier
- Display name: **CaloraApp Pro** (was "Calora Plus")
- Badge label: **PRO** (was "PLUS")
- RevenueCat NOT yet integrated — placeholder billing UI in profile.tsx

## app.json config state (post-migration)
- `name`: "CaloraApp"
- `scheme`: "caloraapp"
- `ios.bundleIdentifier`: "com.etiendem.caloraapp" (not yet externally registered)
- `android.package`: "com.etiendem.caloraapp" (not yet externally registered)
- `slug`: "calora" (preserved)

## Key report
Full migration log: `docs/CALORAAPP_METADATA_LOCKIN_REPORT.md`
Authoritative product document: `docs/CALORAAPP_PRODUCT_METADATA.md`
