# 18 — Calora Plus Recipe Freshness Final Closure Report

## 1. Original owner requirement

Resolve the observation that Discover/Plus repeatedly showed the same top recipes without compromising entitlement, provider relevance, pagination truth, cache safety, or the cards already visible to the user.

## 2. Previous implementation gap

Before closure, default Plus requested empty query/category with `limit=18` and `offset=0`. FatSecret `/recipes/search/v3` received `page_number=floor(offset/limit)` and its opaque order was rendered unchanged after normalization, ID deduplication, and image deduplication. The API returned `nextOffset`; the client lifted the account cache across submenu remounts, but Plus had no freshness seed, seen history, or scroll-restoration lifecycle.

## 3. Root cause

Provider order made the default first page repeat. Retaining the same account’s loaded inventory prevented blank remounts but could not vary a newly requested default page. Render-time randomness or cross-page sorting would have broken cursor semantics; filters must retain provider relevance.

## 4. Exact Plus ordering before change

| Stage | Before behavior |
|---|---|
| Default request | Empty query/category, `limit=18`, `offset=0` |
| Provider request | FatSecret page `floor(offset / limit)` |
| Provider order | Opaque, unchanged |
| Normalization | Normalize, ID-dedup, image-dedup |
| Continuation | API `nextOffset`; client order unchanged |
| Client lifecycle | Lifted account cache across submenu remounts; no day seed/seen history/scroll restoration |

## 5. Exact freshness algorithm after change

`freshnessDay` is optional and validated as `YYYY-MM-DD` in OpenAPI and generated clients. For **default unfiltered Plus only**, the server orders only legitimate normalized recipes inside their existing provider page. It derives a stable base rank from authenticated account ID plus recipe ID, applies UTC-day rotation, and preserves the provider page's original order for rare hash ties. It uses no `Math.random`, raw token, or token material. Search and category requests remain byte/order-preserved in provider relevance order. Discover implementation is unchanged.

### End-to-end ordering trace

| Step | Default unfiltered Plus result |
|---|---|
| 1 | Active session captures UTC `freshnessDay` |
| 2 | Client requests page/cursor with that optional day |
| 3 | API verifies account and entitlement; provider returns its page |
| 4 | API normalizes and removes illegitimate/duplicate ID/image rows |
| 5 | API deterministically ranks only that page’s legitimate rows using account + recipe ID + UTC day |
| 6 | API returns reordered page and authoritative continuation |
| 7 | Client accepts only real, non-placeholder data and appends unique later rows |

## 6. Cache/remount behavior

Same-account, same-day quick remount restores exact cards, order, search, category, offset, `nextOffset`, terminal state, and scroll position with cards immediately visible—no blank intermediary. Filtered sessions restore across days because rotation is disabled. List/detail 401 or 403 and identity change clear all protected Plus list/detail caches, lifted/saved/session state, and selected Plus detail.

## 7. Session/day lifecycle

An actively used scroller is not reordered merely because UTC midnight passes. A real background/inactive-to-active transition on a new UTC day, or a new-day unfiltered remount, resets default cursor, terminal state, and scroll to page 0 while retaining old cards. Only a successful real page-0 response atomically replaces those cards. Failed or placeholder responses do not advance or replace state.

## 8. Pagination interaction

Later pages append uniquely. Generic provider cursor remains authoritative. FatSecret advances page boundaries from the raw provider page and `total_results` when available, not from the reduced normalized count. Rotation never crosses pages, invents rows, changes continuation, or fabricates infinity. At actual exhaustion `nextOffset` is `null` with a truthful terminal reason.

## 9. Provider limitations

FatSecret order is opaque and live inventory is not statically knowable. Visible day-to-day variation is therefore conditional: a page with at least two legitimate normalized recipes can vary. Static inspection cannot prove the live count; provider restriction/network and real inventory require owner device validation.

## 10. Account-isolation proof

The only ordering identity is the authenticated account ID; token material is excluded. Account changes remove protected Plus state. List/detail 401/403 removes the same state, including selected detail, so an expired entitlement or new identity cannot retain protected data. Saved, lifted, session, query, and detail boundaries are cleared together.

## 11. Exact files changed

1. `artifacts/api-server/src/__tests__/premiumRecipes.test.ts`
2. `artifacts/api-server/src/lib/premiumRecipes.ts`
3. `artifacts/api-server/src/routes/premiumRecipes.ts`
4. `artifacts/calora/app/(tabs)/recipes.tsx`
5. `artifacts/calora/lib/premiumCatalogueState.ts`
6. `artifacts/calora/lib/__tests__/premiumCatalogueState.test.tsx`
7. `artifacts/calora/lib/__tests__/premiumRecipeQueryKeys.test.ts`
8. `artifacts/calora/lib/__tests__/recipesScreen.test.ts`
9. `lib/api-spec/openapi.yaml`
10. `lib/api-client-react/src/generated/api.schemas.ts`
11. `lib/api-zod/src/generated/api.ts`
12. `lib/api-zod/src/generated/types/listPremiumRecipesParams.ts`
13. `lib/api-zod/src/generated/types/recipeList.ts`

Closure documentation and durable project-note changes:

14. `16_CALORA_POST_INSTALL_DEFECT_REMEDIATION_REPORT.md`
15. `17_CALORA_COMPLETE_USER_FLOW_FORENSIC_MAP.md`
16. `18_CALORA_PLUS_RECIPE_FRESHNESS_FINAL_CLOSURE_REPORT.md` *(new)*
17. `.agents/memory/MEMORY.md`
18. `.agents/memory/plus-recipe-freshness.md` *(new)*

## 12. Tests added

Focused mobile Plus/Recipes coverage verifies captured-day session lifecycle, same-day exact restore and scroll, active-midnight stability, new-day atomic replacement, protected cache clearing, placeholder rejection, and unique append. Focused API Premium coverage verifies validated day input, default-only deterministic ranking, account/day variation, no token/random input, provider-page containment, truthful cursor/terminal handling, normalization/deduplication, and unmodified search/category order.

## 13. Full test results

- Focused mobile Plus/Recipes: **3 files passed, 21 tests passed**.
- Focused API Premium: **1 file passed, 31 tests passed**.
- Focused total: **52 tests passed**.
- Full Calora Vitest: **87 files, 1214 tests passed, 0 skipped/fail**; only the existing ProfileScreen React `act(...)` warnings remained.
- Calora static server security: **6 passed, 0 skipped/fail**.
- Full API: **36 files passed, 1 skipped; 460 tests passed, 4 explicitly skipped**; expected intentional RevenueCat 503, FatSecret restricted, DB read/write, and service-failure logs occurred without failures.
- Library `tsc --build`, Calora typecheck, API typecheck, and `git diff --check`: **passed**.
- Independent final review: **PASS**, with no P0–P3 findings in the Plus freshness/entitlement scope.

No Expo/EAS build, workflow restart, GitHub push, production publish/republish, DNS/Supabase/RevenueCat configuration, dependency upgrade, or physical-device validation was performed.

## 14. Remaining device tests

- [ ] Same account/same UTC day: open default Plus, scroll/filter/search, quick-remount, and verify exact immediate cards/order/query/category/cursor/terminal/scroll restoration.
- [ ] Keep default Plus active across UTC midnight; verify no active-scroller reorder.
- [ ] Background/inactive then activate after a UTC-day change; verify old cards remain until one successful page-0 response atomically replaces them.
- [ ] Start a default unfiltered Plus remount on a new day; verify reset/atomic replacement behavior.
- [ ] Search/category across a day; verify provider relevance order and state restore remain unchanged.
- [ ] Long-scroll live pages; verify unique append, truthful end, no loop, no invented content, and network/restricted-provider recovery.
- [ ] Account A→B and list/detail 401/403; verify no protected cards, saved/session state, cache, or selected detail flashes.
- [ ] Confirm whether live provider inventory supplies at least two legitimate normalized recipes for observable variation.

## 15. Final verdict

The original Plus freshness gap is fully implemented in source: default unfiltered Plus has deterministic account-and-UTC-day, within-provider-page ordering; filters remain provider ordered; cache/day/account transitions and pagination preserve truth and protected-state isolation. Automated and independent review evidence is green. Physical-device and live-provider inventory validation remain the final evidence gate.

PLUS RECIPE FRESHNESS REQUIREMENT FULLY IMPLEMENTED — OWNER DEVICE VALIDATION REQUIRED