# CaloraApp

CaloraApp is a calm, AI-powered calorie and nutrition tracker for iOS and Android with verified food provenance, low-friction logging, adaptive insights, and transparent premium pricing.

**Publisher:** Etiendem Technologies  
**Tagline:** Eat Smarter. Live Better.  
**Descriptor:** AI Nutrition & Calorie Tracker

> Canonical product metadata lives in `docs/CALORAAPP_PRODUCT_METADATA.md`. Read it before modifying any product name, URL, identifier, or subscription configuration.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Mobile preview: `pnpm --filter @workspace/calora run dev`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod 3-compatible generated API schemas, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/calora` — Expo mobile app
- `artifacts/calora/context/CaloraContext.tsx` — local-first diary and theme state
- `artifacts/calora/constants/colors.ts` — CaloraApp light and dark semantic tokens
- `artifacts/calora/lib/brand.ts` — canonical product metadata (single source of truth)
- `docs/CALORAAPP_PRODUCT_METADATA.md` — full product identity, identifier decisions, privacy inventory
- `docs/store-metadata/` — App Store and Google Play listing specifications
- `docs/product-strategy.md` — competitive audit, scorecard, gaps, and verified-food schema

## Architecture decisions

- The first build is local-first with AsyncStorage so logging remains useful offline and does not pretend a backend is complete.
- Food suggestions carry provenance and confidence in the UI; photo results remain estimates until reviewed.
- Calora Pro uses a 7-day free trial, then permanent $4.99/month or $35.88/year pricing ($2.99/month billed annually). Store/RevenueCat products remain the authority for localized prices and trial eligibility.
- `@calora/local-state-v2` (AsyncStorage key) and `calora-*` notification tags are persisted contracts — do not rename them without a backward-compatible migration.

## Product

CaloraApp gives users a daily calorie and macro view, verified food shortcuts, photo-assisted capture, manual quick add, weekly insights, adaptive-target framing, and explicit light/dark/system appearance controls.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
