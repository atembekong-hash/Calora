# Calora Meal + Image Integrity Remediation Mission 03 — Final Report

## Final verdict: PASS

Mission 03 is complete. The planner now has one canonical catalog authority,
rule-based Program eligibility, deterministic variety scheduling, stable image
identity, and checked-in evidence that can be recomputed from the live data.

No Expo/EAS build, deployment, production-data mutation, or GitHub push was
performed during this remediation.

## What changed

### One canonical meal authority

- `lib/api-zod/src/planner-catalog.ts` is the sole hand-maintained definition
  of all 28 planner meals.
- The Calora client derives its planner records from it and adds only
  client-owned day and local image-key values.
- The API derives its planner records from it and adds only request/runtime
  behavior.
- Stable planner image identities remain centralized in the shared image
  identity contract.

### Program correctness

- All 12 Programs now admit meals through the shared
  `programEligibility` contract, using role, macros, preparation time, and
  declared ingredients.
- Existing Program pools are ordering preferences, not permission to show an
  ineligible meal.
- Plant-Based Week no longer accepts meals with animal-derived ingredients.
  The formerly inconsistent coconut-yogurt, date-syrup, flaxseed/oat-milk,
  plant-feta, and nutritional-yeast catalog facts are explicit.
- Both the local fallback planner and API-generated planner receive the same
  eligible candidate set.

### Variety and overlap

- The scheduler rotates each meal role deterministically, maximizes unique
  candidates before reuse, and blocks adjacent repeats whenever a role has two
  or more eligible candidates.
- The catalog grew from **26 to 28** meals:
  - Breakfast: 7 → 7
  - Lunch: 7 → 7
  - Dinner: 7 → 9
  - Snack: 5 → 5
- The two additive Keto dinner candidates are exact bundled identities:
  `keto-chicken-zucchini` and `keto-salmon-olive`.
- Every Program now has at least two eligible meals for every role. The former
  single-candidate Keto dinner exception is eliminated.
- Cross-program reuse is measured as pairwise Jaccard similarity across the
  deterministic seven-day outputs. The evidence exposes all 66 program-pair
  metrics and the canonical meal IDs behind every overlap, making Program
  similarity auditable rather than implicit.

### Image and diary integrity

- All 28 planner meals resolve to a distinct stable local image identity.
- The two new Keto images are bundled exact meal images; they are not
  restaurant-category or generic fallbacks.
- Planner image selection continues to prioritize canonical local identity,
  and diary sync/restore tests continue to cover stable image metadata and
  provenance.
- Restaurant imagery remains explicitly representative where an item-level
  provider photo is unavailable; this is not represented as exact imagery.

## Durable validation artifacts

- Machine-readable, live-catalog-derived inventory and metrics:
  `artifacts/calora/lib/validation/plannerIntegrityEvidence.ts`
- Human-readable deterministic Program sample:
  `artifacts/calora/PLANNER_INTEGRITY_VALIDATION.md`
- Mission regression tests:
  `artifacts/calora/lib/__tests__/plannerIntegrityEvidence.test.ts`

The validation surface includes canonical IDs and names, macros, ingredients,
image identity/provenance, per-Program eligibility decisions and reasons,
seven-day schedules, recurrence flags, adjacent-repeat totals, and
cross-program overlap metrics.

## Verification

Completed successfully:

| Scope | Result |
| --- | --- |
| Shared API-Zod declaration build/typecheck | Passed |
| Calora typecheck | Passed |
| Calora full suite | 80 files, 1,178 tests passed |
| Calora static serving security checks | 6 passed |
| API typecheck | Passed |
| API full suite | 36 files, 433 tests passed; 4 explicitly skipped |
| Planner/image/diary focused Calora checks | 91 tests passed |
| API planner checks | 8 tests passed |
| `git diff --check` | Passed |
| Calora Expo workflow restart | Running cleanly |
| API workflow restart | Running cleanly |

The test logs include expected simulated network/provider failure messages and
React test-environment `act(...)` warnings; neither represents a failed test.

## Scope confirmation

- Calorie calculations for existing meals were not changed.
- The visible **Burned** label was not changed.
- No silent image-provenance upgrade was introduced.
- No external provider or deployment dependency remains blocking this verdict.