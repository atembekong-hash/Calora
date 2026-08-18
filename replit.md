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

- GitHub `main` is the authoritative Calora source. Before every requested change, fetch `origin/main` and stop on divergence; after validated work, commit intended changes, push safely, fetch again, and confirm local/remote SHA parity before reporting completion. Never force-push, rewrite published history, or commit secrets.

## QA: Recipe-generation end-to-end verification

The `POST /v1/recipes/concepts` and `/v1/recipes/generated` endpoints require a valid Supabase Bearer token (401 otherwise). Two ways to exercise the full flow:

### Automated integration test (recommended)
Add `SUPABASE_SERVICE_ROLE_KEY` as a Replit secret (Supabase dashboard → Project Settings → API → service_role key), then run:
```
pnpm --filter @workspace/api-server test recipe-generation.integration
```
The suite creates an ephemeral confirmed user, hits both endpoints with a real JWT, asserts 200 + correct shape + no third-party attribution, then deletes the user. It is skipped when the secret is absent.

### Manual browser flow (one-time setup)
1. Add `SUPABASE_SERVICE_ROLE_KEY` as a Replit secret (see above).
2. Run the provision script to create a permanent `qa@calora.dev` account:
   ```
   pnpm --filter @workspace/scripts run provision-qa-account
   ```
3. Open the Calora mobile preview → Profile → Sign In → `qa@calora.dev` / `CALORA_SIGNUP_TEST_PASSWORD`.
4. Navigate to Recipes → Create, enter a concept, submit.
5. Verify three idea cards appear with no 401 error.
6. Tap a card → verify the full recipe saves to My Recipes with no third-party attribution row.

### Why Supabase signup was broken for new accounts
Anonymous sign-ins are disabled and email confirmation delivery fails in the Replit preview environment (no SMTP relay configured). The admin API (`email_confirm: true`) bypasses delivery entirely — this is the canonical path for QA account creation.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
