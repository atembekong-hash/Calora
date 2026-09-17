# CALORA Step 54A — Final Source-Gap Remediation Report

Date: 2026-09-17

## Baseline and scope

- Canonical baseline verified before implementation: `origin/main`
  `f9148dc2070debf7ce944b229caa83b6d8f906f6`
- Baseline tree: `4a10536808297bd85933be65941d0df9136f336b`
- Only the Step 54A source/test findings were remediated.
- No database, schema, migration, seed, Fitness, build, deployment, or TestFlight
  operation was performed.

## Remediations

### AI nutrition estimates

- Replaced `Number(value) || 0` coercion with finite, non-negative parsing.
- Empty strings, missing values, `null`, `NaN`, infinities, negative values, and
  incomplete estimates remain unavailable.
- Explicit numeric zero for a macro remains zero.
- Incomplete AI nutrition does not enter either nutrition cache or the persisted
  nutrition table; the existing pending/unavailable response path remains the
  user-visible fallback.

### User-created recipes

- Required calories still reject blank, invalid, negative, and non-positive input.
- Optional protein, carbohydrate, and fat fields now preserve blank input as
  `null` rather than converting it to zero.
- Explicit zero remains zero.
- Non-blank invalid optional macro input is rejected with the existing validation
  feedback pattern.

### Planner meals

- Blank and invalid nutrition fields are rejected before edited or custom meals
  are written.
- Explicit zero remains zero.
- Post-validation writes no longer contain `?? 0` fallbacks, so a future
  validation regression cannot silently fabricate zero nutrition.

### Retired generated operations

- Confirmed no released mobile runtime consumer imports or calls the generated
  profile or weight operations.
- Removed the stale `/v1/profile` and `/v1/weights` OpenAPI paths, tags, and
  operation-only schemas.
- Regenerated `api-client-react` and `api-zod` with:
  `pnpm --filter @workspace/api-spec run codegen`.
- Added compatibility assertions preventing those operations from returning.

## Focused coverage added

- AI nutrition parsing: missing, empty, invalid, non-finite, partial, positive,
  and explicit-zero cases.
- Shared recipe/planner nutrition input: blank, whitespace, explicit zero,
  positive, non-finite, and negative cases.
- Recipe screen source contract: blank user macros remain nullable and partial
  nutrition renders unavailable values with an explicit notice.
- Planner source contract: both custom and edited meal paths validate every
  nutrition field before writing and have no zero fallback.
- Recipe freshness: account, surface, query, and category isolation, the
  36-entry bound, 24-hour expiry, and eight-scope cap.
- Plus refresh: one request while cached data is fresh, revalidation after the
  controlled stale boundary, invalidation behavior, and account-switch cache
  isolation.

## Validation

Passed:

- `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/calora run typecheck`
- `pnpm --filter @workspace/api-server run typecheck`
- `pnpm --filter @workspace/calora run test`
  - 87 test files passed
  - 1,185 tests passed
  - static asset security tests passed
- `pnpm --filter @workspace/api-server run test`
  - 36 test files passed
  - 438 tests passed
  - 4 intentional tests skipped
- `pnpm --filter @workspace/scripts test`
  - 47 tests passed
- `git diff --check`

The Expo preview workflow was not used as a release gate for this source-only
step. Its existing startup attempt failed at Metro watcher initialization with
`ENOSPC: System limit for number of file watchers reached`; no application
assertion failed, and no build was started.

## Release boundary

This report authorizes only the narrow source/test changes listed above. Step 55,
native builds, deployment, TestFlight submission, Fitness restoration, and
database changes remain outside this step.