# Calora Mandatory CI Release Gate — Final Verification Report

**Date:** 2026-09-09  
**Scope:** Phase 1 only — mandatory workspace CI release foundation and React `act(...)` warning remediation  
**Final implementation verdict:** **PASS**  
**Repository merge-enforcement verdict:** **NOT VERIFIED** — branch protection was intentionally not changed or claimed

## 1. Scope and constraints

This phase was limited to:

- Adding a new mandatory workspace CI workflow.
- Provisioning a deterministic PostgreSQL 16 CI service.
- Running workspace typechecks, generated-contract drift checks, database-backed verification, full API tests, full Calora tests, Expo identity checks, API production build, and API startup/readiness smoke verification.
- Sanitizing failure evidence before artifact upload.
- Removing React `act(...)` warnings from the Profile test path.

The following were intentionally not performed:

- No production deployment.
- No EAS/native build.
- No native-device certification.
- No GitHub push.
- No branch-protection or required-check configuration.
- No unrelated UI redesign or broad refactor.

## 2. Files inspected

The implementation was scoped against:

- Root `package.json`
- `artifacts/api-server/package.json`
- `artifacts/calora/package.json`
- `lib/api-spec/package.json`
- `lib/db/package.json`
- `artifacts/calora/app.json`
- `artifacts/api-server/vitest.config.ts`
- `artifacts/calora/vitest.config.ts`
- `artifacts/calora/vitest.setup.ts`
- `artifacts/api-server/src/routes/health.ts`
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/index.ts`
- `scripts/verify-api-release.test.mjs`
- Existing `.github/workflows/*.yml`

## 3. Permanent changes

### New CI foundation

- `.github/workflows/mandatory-ci-release-gate.yml`
  - Runs on push, pull request, and manual dispatch.
  - Uses Ubuntu, Node 24, pnpm 10.26.1, and PostgreSQL 16.
  - Uses a deterministic test database URL and explicit database-required test flags.
  - Installs with `pnpm install --frozen-lockfile`.
  - Provisions schema, migrations, and PostgreSQL support objects.
  - Runs root, API, and Calora typechecks.
  - Regenerates OpenAPI clients and validators, then fails on any working-tree drift.
  - Runs database-backed account-deletion and built-release verification.
  - Runs the complete API suite.
  - Runs the complete Calora suite and static-server security tests.
  - Validates resolved Expo identity and branded auth-link configuration.
  - Builds the production API bundle.
  - Starts the built API and verifies `/api/` plus `/api/healthz`, requiring JSON `status: "ok"`.
  - Collects only sanitized failure evidence and uploads it with a 30-day retention period.

- `scripts/ci/validate-expo-config.mjs`
  - Validates `Calora`, `caloraapp`, `com.etiendem.caloraapp`, `mycaloraapp.com`, the iOS associated domain, and the Android `/auth/callback` App Link filter.
  - Accepts the actual direct JSON shape emitted by `expo config --json`.

- `scripts/ci/sanitize-failure-artifacts.mjs`
  - Redacts PostgreSQL connection strings, bearer credentials, named secrets, email identities, JWT-like tokens, and workspace paths.
  - Safely handles an empty or missing input log directory.

### React warning remediation

- `artifacts/calora/lib/__tests__/profileScreen.test.tsx`
  - Tracks the notification-inbox mock.
  - Awaits the initial asynchronous inbox/effect boundary.
  - Sets route parameters before rendering.
  - Converts affected interactions to async tests.
  - Focused result: **9 passed, 0 `act(...)` warnings**.

### Runtime/test corrections required by deterministic rehearsal

- `artifacts/api-server/src/routes/premiumRecipes.ts`
  - Replaced the early-rejecting `Promise.all` rate-limit pair with `Promise.allSettled`.
  - This preserves the independent IP limiter write when the account-deletion fence rejects the user limiter; otherwise the database integration test was timing-sensitive on a fresh PostgreSQL instance.

- `scripts/verify-api-release.test.mjs`
  - Updated the expected account-deletion fence signal to include its already-emitted schema version.
  - This corrected a stale release assertion without weakening the validation.

## 4. Exact CI architecture and enforced commands

The workflow enforces these stages, in order:

1. Checkout source.
2. Set up pnpm 10.26.1.
3. Set up Node 24 with pnpm caching.
4. Create log and artifact directories.
5. `pnpm install --frozen-lockfile`
6. `pnpm --filter @workspace/db run push-force`
7. `pnpm --filter @workspace/db run migrate`
8. `pnpm --filter @workspace/db run provision-support-objects`
9. `pnpm run typecheck`
10. `pnpm --filter @workspace/api-server run typecheck`
11. `pnpm --filter @workspace/calora run typecheck`
12. `pnpm --filter @workspace/api-spec run codegen`
13. `git diff --exit-code -- .`
14. `pnpm --filter @workspace/api-server run test:account-deletion-fence`
15. `pnpm --filter @workspace/api-server run test:built-deletion-fence-release`
16. `pnpm --filter @workspace/api-server run test`
17. `pnpm --filter @workspace/calora run test`
18. `pnpm --filter @workspace/calora exec expo config --json`
19. `node scripts/ci/validate-expo-config.mjs ...`
20. `pnpm --filter @workspace/api-server run build`
21. Start the API on port 18080.
22. Verify `/api/`.
23. Verify `/api/healthz`.
24. Require `status: "ok"` from both JSON responses.
25. Always sanitize and upload evidence.

The workflow uses `set -o pipefail` for piped test/build commands so a failed command cannot be hidden by `tee`.

## 5. Healthy verification evidence

### Workspace and API typechecks

- `pnpm run typecheck`
- Result: **PASS**
  - API Server typecheck passed.
  - Calora typecheck passed.
  - FatSecret gateway typecheck passed.
  - Mockup sandbox typecheck passed.
  - Scripts typecheck passed.

### API database path

The workflow sequence was rehearsed against an isolated disposable Docker PostgreSQL 16 instance, not the user’s persistent database:

- Schema push: **PASS**
- Migrations: **PASS**
- Support-object provisioning: **PASS**
- Account-deletion fence integration: **5 passed, 1 skipped**
- Built API deletion-fence release verification: **1 passed, 0 failed**
- Full API suite: **471 passed, 4 skipped**

### Calora suite

- Full Vitest suite: **88 files passed, 1,224 tests passed**
- Static-server security suite: **6 passed, 0 failed**
- Combined Calora command: **PASS**

### OpenAPI generation and drift

- `pnpm --filter @workspace/api-spec run codegen`: **PASS**
- Generated-file drift check after generation: **PASS**
- No generated API client or validator files remain modified.

### Expo configuration

Resolved Expo configuration validation: **PASS**

Validated values:

- Name: `Calora`
- Scheme: `caloraapp`
- iOS bundle identifier: `com.etiendem.caloraapp`
- Android package: `com.etiendem.caloraapp`
- iOS associated domain: `applinks:mycaloraapp.com`
- Android auth callback: `https://mycaloraapp.com/auth/callback`

### API build and startup

- Production API build: **PASS**
- Live startup smoke after the final rebuild: **PASS**
- `/api/`: JSON `status=ok`
- `/api/healthz`: JSON `status=ok`

### CI helper validation

- Workflow YAML parsed successfully.
- Required `verify` job and PostgreSQL service were found.
- Both helper scripts passed `node --check`.
- New CI files pass Prettier.
- Sanitizer synthetic smoke passed with connection string, bearer token, email identity, JWT-like token, and workspace path redacted.
- Missing log directories are created safely.

## 6. Controlled-failure demonstrations

Each mutation was temporary, produced the expected nonzero result, and was restored immediately.

| Required failure | Mutation | Observed evidence |
| --- | --- | --- |
| TypeScript failure | Temporary invalid string/number assignment in API health route | `TS2322: Type 'number' is not assignable to type 'string'`; typecheck exited 2 |
| API test failure | Temporary failing API health test | Expected `controlled-api-failure` to equal `healthy`; Vitest exited 1 |
| Calora test failure | Temporary failing Profile test | Expected `controlled-calora-failure` to equal `healthy`; Vitest exited 1 |
| OpenAPI drift | Temporary edit after clean code generation | `git diff --exit-code` exited 1 and identified generated API drift |
| API build failure | Temporary syntax error in API health route | esbuild reported `Unexpected ";"`; build exited 1 |

The final healthy checks were rerun after all controlled mutations were removed.

## 7. Security and privacy review

- CI uses test-only PostgreSQL service credentials.
- No secret values were added to source, logs, or this report.
- Failure evidence is sanitized before upload.
- Redaction covers connection strings, bearer credentials, named secret assignments, email identities, JWT-like tokens, and workspace paths.
- Artifact collection runs with `if: always()` so failures remain diagnosable.
- The sanitizer writes a manifest describing sanitized files without copying raw credentials.
- No production database, production deployment, provider credential, or native signing credential was changed.

## 8. Existing workflows preserved

The new workflow was added without replacing or modifying these existing specialized workflows:

- `.github/workflows/account-deletion-fence.yml`
- `.github/workflows/monitor-ios-signing.yml`
- `.github/workflows/monitor-native-associations.yml`
- `.github/workflows/native-auth-preflight.yml`
- `.github/workflows/native-encrypted-recovery.yml`

## 9. Remaining blockers and limitations

The implementation is ready for repository CI, but the following item remains outside this workspace change:

1. **GitHub branch protection has not been enabled or independently verified.**
   The new workflow must be selected as a required status check by a repository administrator before merges are actually blocked on failure.

The following are intentionally outside Phase 1 and remain unverified as previously documented:

- Native-device auth/deep-link matrix.
- Camera, barcode, HealthKit, Health Connect, notifications, billing lifecycle, share sheets, accessibility, and lifecycle interruption on real devices.
- Real external provider callbacks.
- Production canary/promotion/rollback automation.

## 10. Final working-tree review

Intended permanent changes:

- `.github/workflows/mandatory-ci-release-gate.yml`
- `scripts/ci/validate-expo-config.mjs`
- `scripts/ci/sanitize-failure-artifacts.mjs`
- `artifacts/calora/lib/__tests__/profileScreen.test.tsx`
- `artifacts/api-server/src/routes/premiumRecipes.ts`
- `scripts/verify-api-release.test.mjs`
- `20_CALORA_MANDATORY_CI_RELEASE_GATE_FINAL_REPORT.md`

Checks:

- `git diff --check`: **PASS**
- Generated API paths: clean
- No temporary controlled-failure mutation remains
- No tracked build output was added
- No unrelated workflow was modified

## Final verdict

**PASS for the Phase 1 mandatory CI release foundation and Profile `act(...)` warning remediation.**

The workspace now has a deterministic, fail-closed CI release gate with database-backed verification, generated-contract drift enforcement, sanitized evidence, Expo identity validation, API build/startup checks, and healthy full-suite evidence. The only release-enforcement action still required is selecting this workflow as a required branch-protection check in GitHub; that setting was intentionally not changed or claimed here.