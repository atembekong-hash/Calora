# Calora Intelligence — Phase 1.5 Foundation Hardening Report

## Executive result

**Phase 1.5 status: complete for the local Foundation hardening scope.**

The local, deterministic Intelligence Foundation was stress-tested and hardened without enabling any visible Intelligence experience, changing Coach behavior, adding remote fact persistence, adding an LLM calculation path, or starting Phase 2.

The local calculation layer is suitable for continued controlled development. It is **not approved for Phase 2 delivery or server-persisted Intelligence data** until database migration ownership and tenant isolation are resolved.

## Exact work performed

1. Re-audited Drizzle schema, API startup DDL, migration evidence, and RLS/policy source.
2. Replaced the generic `preference_changed` invalidation contract with the explicit `fact_relevant_preference_changed` contract.
3. Added a fact-family invalidation matrix so implemented facts do not claim a generic “invalidate everything” behavior.
4. Confirmed planner and preference events do not recompute current facts because no current fact consumes planner or preference state.
5. Added local timing seams around context adaptation, evidence partitioning, confidence computation, source watermark generation, and fact generation.
6. Added executable scenario, provenance, confidence, invalidation, safety, flag, offline/local-only, and performance coverage.
7. Re-ran the complete Calora mobile test suite and application typecheck.

## Files created

- `artifacts/calora/lib/__tests__/intelligenceHardening.test.ts`
- `artifacts/calora/lib/__tests__/intelligencePerformance.test.ts`
- `docs/CALORA_INTELLIGENCE_PHASE_1_5_HARDENING_REPORT.md`

## Files modified

- `artifacts/calora/lib/intelligence/types.ts`
- `artifacts/calora/lib/intelligence/invalidation.ts`
- `artifacts/calora/lib/intelligence/observability.ts`
- `artifacts/calora/lib/intelligence/evidence.ts`
- `artifacts/calora/lib/intelligence/confidence.ts`
- `artifacts/calora/lib/intelligence/contextAdapter.ts`
- `artifacts/calora/lib/intelligence/facts.ts`
- `artifacts/calora/lib/__tests__/intelligenceFoundation.test.ts`

No dependency, environment-variable, migration, database, production-build, or server API changes were made.

## Executed validation

| Command | Result |
|---|---|
| `pnpm --filter @workspace/calora exec vitest run lib/__tests__/intelligenceFoundation.test.ts lib/__tests__/intelligenceHardening.test.ts lib/__tests__/intelligencePerformance.test.ts lib/__tests__/coachContext.test.ts` | PASS — 20 tests in 4 files |
| `pnpm --filter @workspace/calora exec vitest run lib/__tests__/intelligencePerformance.test.ts` | PASS — 1 test in 1 file |
| `pnpm --filter @workspace/calora test` | PASS — 884 tests in 50 Vitest files, plus 6 Node static-asset security tests; 0 failed, 0 skipped |
| `pnpm --filter @workspace/calora run typecheck` | BLOCKED by 6 pre-existing errors in `artifacts/calora/app/(tabs)/recipes.tsx`; no Intelligence Foundation errors remain |

The existing typecheck blocker is an API-client `ApiError` export mismatch and nullable query-error accesses in the Premium Recipes screen. It is unrelated to this hardening work and must be resolved before relying on the project-wide typecheck as a release gate.

## Deterministic parity matrix

| Scenario | Current Calora result | Intelligence fact result | Status | Explanation |
|---|---|---|---|---|
| New user, no profile/history | Today uses its existing 2000 kcal display fallback | Target `2000`; missing profile/target/weight recorded | MATCH | Facts preserve Today’s visible fallback but retain missing-state evidence |
| Profile, no food logs | Today has target with zero consumed | Target 2000, consumed 0, incomplete/no-log state | MATCH | Facts distinguish no logs from logged zero |
| Normal single-day logger | Sum current-day log nutrition | Same calories/macros/targets/remaining | MATCH | Executable parity coverage |
| Heavy logger | Sum all selected-day logs | 25 × 100 kcal = 2500 kcal | MATCH | Bounded pure aggregation |
| Partial macro data | Existing aggregate can contain incomplete inputs | Missing macros explicitly recorded | PARTIAL | Facts sanitize non-finite values instead of claiming complete macro evidence |
| AI-estimate-heavy day | Today totals entries | Estimated provenance retained; low confidence | MATCH | No upgrade to verified evidence |
| Provider/barcode-heavy day | Today totals entries | Strong provenance; high confidence | MATCH | Provider and barcode remain distinct |
| Manual-entry-heavy day | Today totals entries | Manual provenance; moderate/mixed confidence rules | MATCH | Manual never becomes verified |
| Mixed-provenance day | Today totals entries | Separate evidence partitions preserved | MATCH | Mixed evidence is not flattened |
| Edited food entry | Today uses edited values | Updated values change totals and watermark | MATCH | Covered by changed-log parity case |
| Deleted food entry | Today excludes deleted entry | Empty/day totals exclude the deleted entry | MATCH | Covered by no-log result |
| Active health energy | Today adds current-day energy to remaining | Remaining includes supplied current-day active energy | MATCH | Only supplied snapshot data is used |
| Onboarding weight differs from first log | Coach and Insights currently differ | Weight fact exposes both baselines and Coach change | MATCH | Difference is explicit, not silently unified |
| Timezone/day boundary | Today selection is date/timezone sensitive | Watermark includes date, timezone, and day-boundary contract | MATCH | Date-sensitive recomputation occurs |

## Invalidation matrix

| Reason | Affected implemented facts | Recompute | Verified |
|---|---|---:|---|
| `food_added` | daily nutrition, meal distribution, logging completeness | Yes | Yes |
| `food_updated` | daily nutrition, meal distribution, logging completeness | Yes | Yes |
| `food_deleted` | daily nutrition, meal distribution, logging completeness | Yes | Yes |
| `goal_changed` | none currently | No | Yes |
| `target_changed` | daily nutrition/targets/remaining | Yes | Yes |
| `weight_changed` | weight baselines | Yes | Yes |
| `timezone_changed` | date-sensitive nutrition/meal/completeness | Yes | Yes |
| `day_boundary_changed` | date-sensitive nutrition/meal/completeness | Yes | Yes |
| `fact_relevant_preference_changed` | none currently | No | Yes |
| `planner_changed` | none currently | No | Yes |
| `source_refreshed` | daily, meal, completeness, weight families | Yes | Yes |

Negative cases passed: a historical diary entry outside the viewed day does not churn today’s watermark; a planner change and a fact-irrelevant preference change do not cause recomputation because current facts do not consume those inputs.

## Provenance validation

Executed combinations include provider + manual, barcode/provider + AI estimate, manual + recipe estimate, AI + recipe estimates, and unknown legacy + provider.

- Provider/USDA and barcode are strong but remain separate categories.
- Manual remains moderate.
- Photo estimates remain `ai_estimate`.
- Recipe remains `recipe_estimate`.
- Unknown legacy sources remain `unknown` and cause insufficient confidence.
- Aggregation never upgrades a lower-quality source.

Current `FoodLog` does not carry a dedicated user-correction provenance event. `memoryId` alone must not be treated as a correction because accepted Food Memory can represent a reuse rather than an edit. `user_corrected` remains reserved until a source-level correction record exists.

## Confidence validation

| Category | Executed example | Result |
|---|---|---|
| High | All strong provider/barcode entries | PASS |
| Medium | Manual plus provider entry | PASS |
| Low | More than half estimated inputs | PASS |
| Insufficient | No food evidence, missing target, or unknown provenance | PASS |

The model is deterministic and categorical. It does not use opaque scoring and makes no clinical reliability claim.

## Weight baseline decision support

| Surface | Current baseline | Why it differs | User-visible consequence | Recommendation |
|---|---|---|---|---|
| Coach | Profile/onboarding weight, then first log only if profile absent | Coach narrates change from initial user state | Can differ from logged-history trend | Preserve until a product decision is approved |
| Progress trend | First logged weight | Trend reflects recorded weigh-ins | Can differ from onboarding-to-now | Preserve existing behavior |
| Progress goal | Profile baseline when a goal exists | Goal distance is set from onboarding state | Goal progress can differ from trend delta | Preserve existing behavior |

The distinction is defensible but potentially confusing. The safest future unification is a product decision that names each baseline in user language, then introduces a versioned transition with before/after regression tests. No visible behavior changed in Phase 1.5.

## Offline and local-first resilience

The Foundation has no network, API, authentication, AI-provider, persistence, retry, or sync dependency. It accepts a hydrated local snapshot and produces facts with a null profile or no remote state. Existing full-suite coverage for local persistence, diary sync recovery, and network error handling remains green.

| Degraded condition | Result |
|---|---|
| No network/API/AI | PASS — no Foundation call exists |
| Stale authentication | PASS — facts do not read auth |
| Local hydrated state | PASS — read-only context adapter |
| Foundation visible delivery disabled | PASS — no UI consumer is enabled |
| Core logging/Today/navigation | PASS — Expo smoke test from Phase 1 remains valid; Phase 1.5 adds no UI path |

## Performance measurement

Command: `pnpm --filter @workspace/calora exec vitest run lib/__tests__/intelligencePerformance.test.ts`

Environment: local Vitest/Node development run; 100 iterations on a 100-log same-day fixture. Values are mean milliseconds per operation and are not production-device benchmarks. Captured command output at **2026-08-20 14:11 America/New_York**: `{"contextAdaptationMs":0.172,"evidencePartitioningMs":0.0135,"confidenceComputationMs":0.0038,"watermarkGenerationMs":0.2364,"factGenerationMs":0.5854}`. Timings are environment-sensitive; repeat the command for a new sample rather than treating this capture as a fixed SLA.

| Operation | Before | After | Delta | Sample | Result |
|---|---:|---:|---:|---|---|
| Context adaptation | NOT MEASURABLE | 0.1720 ms captured sample | NOT MEASURABLE | 100 | Measured local-only |
| Evidence partitioning | NOT MEASURABLE | 0.0135 ms captured sample | NOT MEASURABLE | 100 | Measured local-only |
| Confidence computation | NOT MEASURABLE | 0.0038 ms captured sample | NOT MEASURABLE | 100 | Measured local-only |
| Watermark generation | NOT MEASURABLE | 0.2364 ms captured sample | NOT MEASURABLE | 100 | Measured local-only |
| Fact generation | NOT MEASURABLE | 0.5854 ms captured sample | NOT MEASURABLE | 100 | Measured local-only |
| Today/log/edit/delete/hydration UI paths | NOT MEASURABLE | NOT MEASURABLE | NOT MEASURABLE | N/A | Foundation is not mounted in these paths |

The Foundation adds no runtime work to existing user-visible flows because no screen calls it. Device-specific render/path benchmarks remain not measurable until a future, separately approved delivery adapter exists.

## Schema parity and migration authority

| Structure | Drizzle | Startup DDL | Match | Risk / recommended action |
|---|---|---|---|---|
| Users, food items, diary entries, capture sessions/candidates, referrals, sync mutations, deletion state, capture rate limit | Present | Present/bootstrapped | Partial | Startup `CREATE IF NOT EXISTS` and selective alters cannot prove full constraints/index parity |
| Profiles | Present | Not created | No | Fresh deployment may lack typed table; move to generated migration authority |
| Weight entries | Present | Not created | No | Same drift risk |
| Saved meals | Present | Not created | No | Same drift risk |
| Recipes and recipe items | Present | Not created | No | Same drift risk |
| Subscriptions | Present | Not created | No | Same drift risk |
| Consent events | Present | Not created | No | Same drift risk |
| Deletion triggers/functions | Not fully declarative | Startup DDL creates/replaces | No | Runtime SQL is a second schema authority |
| RLS policies | No source evidence | No source evidence | No | Must be committed as reviewed migration SQL |

Development and fresh deployments currently rely on API startup DDL when the API runs. Drizzle configuration points to the typed schema but no committed migration output/history was found. Database age can therefore produce drift.

**Safest authority:** make `lib/db/src/schema/index.ts` the declarative model, generate and commit ordered additive SQL migrations, include indexes/constraints/functions/triggers/RLS in reviewed migration source, deploy migrations, then retire duplicate startup DDL after reconciliation.

## RLS and tenant isolation

**RLS STATUS: NOT VERIFIED**

Repository search found no `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, Supabase migration folder, policy SQL, `auth.uid()` ownership predicate, or repository-accessible policy evidence. Application route filtering is not database isolation.

External Supabase console verification must cover: RLS enabled/forced state, policy names, SELECT/INSERT/UPDATE/DELETE `USING` and `WITH CHECK` clauses, role grants, service-role bypass behavior, and cross-user positive/negative tests for user-owned tables (`calora_profiles`, diary, weights, saved meals, recipes/items, capture sessions/candidates, subscriptions, sync mutations, consent), referral tables, shared food/nutrition tables, and operational rate-limit/deletion tables. Policies must prevent forged ownership and enforce child ownership transitively.

**Server-persisted Intelligence facts remain blocked.**

## Security review

| Check | Result |
|---|---|
| Cross-user leakage | PASS for local-only Foundation; server path does not exist |
| Accidental persistence | PASS — no storage/database/network code in Foundation |
| Secret/raw sensitive observability | PASS — observer test confirms notes and image URLs are absent |
| Provenance spoofing | PARTIAL — unknown runtime source becomes unknown/insufficient; source authenticity cannot be proven from current local `FoodLog` alone |
| Malformed nutrition | PASS — non-finite/negative numeric values are clamped or marked incomplete |
| Oversized inputs | PARTIAL — bounded unit fixture exercised; no formal production input-size limit exists |
| Auth assumptions | PASS — facts do not read session/authentication |
| Future server adapter risk | BLOCKED — no RLS/migration authority |
| Read-only behavior | PASS — context adapter copies state; no mutation API exists |

No model or API call can mutate diary state through this layer because none exists.

## Feature flag status

| Flag | Default | Current effect | User-visible effect | Rollback |
|---|---:|---|---|---|
| `intelligence.foundation.enabled` | true | Local domain available only | None | Existing screens do not consume it |
| `intelligence.facts.local_adapter` | true | Pure local adapter available | None | Stop calling adapter |
| `intelligence.facts.server_adapter` | false | Disabled | None | Already off |
| Today/post-log/Progress/Coach/evidence delivery | false | Disabled | None | Already off |
| feedback/proactive | false | Disabled | None | Already off |
| observability | false | No UI delivery; test observer requires explicit registration | None | Remove observer |

Disabling Foundation availability preserves current Calora behavior because no visible path is wired to the Foundation.

## Clean repository review

No temporary runtime debug code, generated migrations, database changes, dependencies, scripts, environment variables, or production artifacts were added. Permanent test and report files were retained intentionally.

## Acceptance gates

| Gate | Status | Evidence |
|---|---|---|
| A — Deterministic parity | PARTIAL | Representative executable parity; not every UI/render path is mounted |
| B — Provenance preservation | PASS | Mixed-source and unknown-source tests |
| C — Confidence behavior | PASS | All four categories exercised |
| D — Invalidation | PARTIAL | Add/edit/delete/target/weight/goal transitions and all declared reason mappings covered; no independent input exists yet for planner or fact-relevant preference facts |
| E — Offline resilience | PASS | Pure local/no remote dependencies plus regression suite |
| F — Performance | PASS (local); UI NOT MEASURABLE | Measured pure operations; no UI adapter exists |
| G — Schema/migration readiness | BLOCKED | Dual authority and no migration history |
| H — RLS/tenant isolation | NOT VERIFIED | External console evidence required |
| I — Security | PARTIAL | Local safety proven; source authenticity/remote readiness unresolved |
| J — Phase 2 readiness | DO NOT APPROVE | Database/RLS blockers and delivery validation remain |

## Remaining blockers

1. A canonical, versioned schema migration workflow is not established.
2. Drizzle and startup DDL parity is unresolved.
3. Production RLS, policies, role grants, and cross-user isolation are not verified.
4. Current FoodLog provenance cannot independently prove a user correction or provider authenticity.
5. Device-level UI-path performance is not measurable until an approved delivery adapter exists.
6. Project-wide TypeScript release validation remains blocked by unrelated Premium Recipes errors.

## Final engineering verdict

**Phase 1.5 local Foundation hardening is complete. Phase 2 is not approved.**

Do not enable visible Intelligence, Coach fact-context delivery, server-persisted facts, feedback, proactive behavior, predictions, or adaptive learning until the remaining blockers are resolved through a separate approved task.