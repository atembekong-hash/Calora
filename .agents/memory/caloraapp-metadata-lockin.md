---
name: Calora metadata lock-in
description: Canonical product identity decisions and preserved internal identifiers after the CaloraApp → Calora rename.
---

## Rule
The official public product name is **Calora** (Etiendem Technologies). All customer-facing strings must use "Calora"; compatibility-sensitive technical identifiers may retain "caloraapp". New code must import display strings from `artifacts/calora/lib/brand.ts` rather than scattering literals.

**Why:** The approved launch identity uses Calora on mycaloraapp.com, while native/package/persistence identifiers remain frozen for compatibility.

**How to apply:** Before adding any string with the product name, import from `lib/brand.ts`. Before changing any identifier, check the preserved list below.

## Canonical values (from brand.ts)

- `BRAND.name` = "Calora"
- `BRAND.publisher` = "Etiendem Technologies"
- `BRAND.premiumName` = "Calora Pro"
- `BRAND.tagline` = "Eat Smarter. Live Better."
- `BRAND.domain` = "mycaloraapp.com"
- `URLS.*` = all mycaloraapp.com pages

## Identifiers PRESERVED — do not rename

| Identifier | Why frozen |
|---|---|
| `slug: "calora"` in app.json | Expo cloud slug — preserve |
| `@calora/local-state-v2` | AsyncStorage persisted user data contract |
| `calora-hydration`, `calora-meals`, `calora-goal` | Notification tags on existing devices |
| `CaloraContext`, `useCalora` | Internal code identifiers, no user exposure |
| `@workspace/calora` | pnpm workspace name |
| `calora_recipe_nutrition` | DB table name |

## Subscription tier
- Display name: **Calora Pro**
- Badge label: **PRO** (was "PLUS")
- RevenueCat NOT yet integrated — placeholder billing UI in profile.tsx

## app.json config state (post-migration)
- `name`: "Calora"
- `scheme`: "caloraapp"
- `ios.bundleIdentifier`: "com.etiendem.caloraapp" (not yet externally registered)
- `android.package`: "com.etiendem.caloraapp" (not yet externally registered)
- `slug`: "calora" (preserved)

## Key report
Full migration log: `docs/CALORAAPP_METADATA_LOCKIN_REPORT.md`
Authoritative product document: `docs/CALORAAPP_PRODUCT_METADATA.md`
