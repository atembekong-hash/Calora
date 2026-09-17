# TheMealDB Premium V2 integration report

**Verdict:** BLOCKED — the validated implementation is present locally, but the
requested scoped push cannot proceed safely from the current branch state.

## Architecture and scope

Calora keeps TheMealDB in its existing open recipe-discovery path. The Premium V2
key is read only by the API service from `THEMEALDB_API_KEY`; it is never
returned to the Expo client. The existing Calora Plus/FatSecret provider path,
Recipes screen structure, recipe provenance labels, and nutrition-confidence
behavior are unchanged.

TheMealDB remains discovery content. Its recipes and images are attributed to
TheMealDB, while nutrition remains Calora-estimated or unavailable—never
presented as verified provider nutrition.

## V2 endpoints and capabilities

- Base: `https://www.themealdb.com/api/json/v2/{server-only-key}`
- Name search: `search.php?s=...`
- Detail lookup: `lookup.php?i=...`
- Category filtering: `filter.php?c=...`
- Multi-ingredient filtering: `filter.php?i=ingredient1,ingredient2,...`

The implementation uses V2 when the deployment secret is present and retains the
legacy developer endpoint only as a non-production/local fallback. A Discover
search containing two through four comma-separated ingredients invokes V2's
documented multi-ingredient filter; a one-word or normal phrase remains a name
search. Client pagination continues to be applied after the provider response.

## Security and resilience

- The key stays in the server-only outbound V2 URL path.
- API responses and generic provider failures do not expose upstream URLs,
  key material, provider status text, or malformed payload content.
- Responses are checked for an object envelope and an optional `meals` array;
  malformed JSON, non-2xx responses, invalid envelopes, and timeouts fail
  safely.
- Recipe rows must contain non-empty `idMeal` and `strMeal`; missing optional
  images and ingredient/detail fields remain safely nullable.

## Files changed

- `artifacts/api-server/src/routes/recipes.ts`
- `artifacts/api-server/src/__tests__/themealdb-v2.test.ts`
- `artifacts/calora/app/(tabs)/recipes.tsx`
- `lib/api-spec/openapi.yaml`
- Generated API client and Zod contract artifacts

## Validation evidence

- API: `pnpm --filter @workspace/api-server exec vitest run
  src/__tests__/themealdb-v2.test.ts src/__tests__/recipes.test.ts
  src/__tests__/recipes-rate-limit.test.ts` — 17 tests passed.
- Calora: `pnpm --filter @workspace/calora exec vitest run
  lib/__tests__/recipesScreen.test.ts` — 9 tests passed.
- Typechecks: API and Calora `typecheck` commands passed; OpenAPI code generation
  and workspace-library typecheck passed.
- Contract generation: `pnpm --filter @workspace/api-spec run codegen` passed.
- Leak review: `git diff --check` passed. The focused test proves its non-secret
  sentinel cannot appear in client responses; key access is limited to the API
  environment reference. No production secret was read or printed.
- Security scan: no critical V2-specific static or privacy/data-flow finding.
  The workspace-wide dependency audit reports two high-severity advisories in
  `image-size@1.2.1`; they are unrelated to this TheMealDB change and require
  separate dependency remediation.
- Runtime: both API and Expo development workflows restarted cleanly. The API
  rebuilt and listened on port 8080 without errors. The direct mobile web
  `/recipes` preview rendered the existing Recipes flow and the new
  comma-separated ingredient guidance with no application exception.

## Limitations

TheMealDB does not supply authoritative nutrition for Calora. Ingredient-filter
results are recipe summaries and must not be interpreted as proof that a user has
every ingredient or that a recipe satisfies dietary/allergen requirements.

## GitHub status

- Curated local TheMealDB integration commit:
  `ec770ab09ec7fdcba693e7ec4b07f46ed0c61245`
- Branch: `reconciliation/curated-calora-publish`
- The curated branch excludes `.agents/agent_assets_metadata.toml`.
- Secret review: `THEMEALDB_API_KEY` appears only as a server environment
  reference and in the test's deliberate fake sentinel; no configured secret
  value is present in the tracked content.
- Push result: **NOT ATTEMPTED — this reconciliation stage is explicitly
  local-only.**
- Remote synchronization: `origin/main` remains at
  `4599c51840540863d90ba3df71f4baa6175119cb`; the curated branch is local-only
  and has not been pushed.
- No force push, history rewrite, Expo/EAS build, or deployment was performed.