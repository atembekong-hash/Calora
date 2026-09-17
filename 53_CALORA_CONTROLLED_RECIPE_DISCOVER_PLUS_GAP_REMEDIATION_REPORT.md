# CALORA — Step 53 Controlled Recipe / Discover / Plus Gap Remediation

## Scope

This change is limited to Calora recipe browsing and recipe nutrition presentation. It does not change API contracts, database schema, migrations, seeds, onboarding, Coach, Health, Fitness, Smart Scan, native builds, TestFlight, deployments, or publishing.

## Remediation delivered

- **Plus reopen behavior:** A fresh, account-scoped Plus catalogue cache is valid on remount. Stale entries revalidate on mount. Existing 401/403 handling still removes the account-scoped query and displays the access state.
- **Discover and Plus freshness:** A bounded, session-only memory tracks recently shown stable recipe IDs independently by account, surface, query, and category. It retains at most 36 IDs for 24 hours and at most eight active scopes. It never writes recipe history to durable storage.
- **Stable-ID deduplication:** Initial and appended pages are deduplicated by recipe ID, not image or provider metadata. Small exhausted catalogues rotate deterministically rather than fabricating entries.
- **Pagination truthfulness:** Discover uses the server-provided `nextOffset` to prefetch and load pages, including terminal exhaustion. It does not infer continuation from page length.
- **Nutrition truthfulness:** Recipe cards and details distinguish available, loading, unavailable, and error states. Finite provider-supplied zero remains `0`; missing values render as `—`. Partial nutrition is identified instead of being presented as complete. Diary totals no longer convert missing macros to zero, and planning refuses incomplete nutrition instead of creating zero-valued planner records.

## Safety checks

- Plus freshness hooks are evaluated before the component’s early returns, preserving React hook order as users open and leave Plus.
- Entitlement enforcement remains server-authoritative. Fresh cache visibility does not override an explicit denied response.
- Freshness data is bounded and session-only, preventing cross-account persistence and unbounded local history.

## Validation

- `pnpm install --frozen-lockfile`
- `pnpm run typecheck`
- `pnpm --filter @workspace/calora test` — 85 files, 1,171 tests passed
- `pnpm --filter @workspace/scripts test` — 47 tests passed
- Focused recipe API compatibility tests — 34 tests passed
- `pnpm --filter @workspace/calora exec expo config --json`
- `git diff --check`
- Confirmed `origin/main` remained `cd638c22a1195a4969087d1cd9717e91c0be2506` with tree `c4b99f0cc926dab5c7d8d37988c30a7d5405f96a` immediately before commit.

## Owner review boundary

The branch is ready for owner review. No deployment, Replit publish, native build, TestFlight action, database mutation, or API contract change was performed.