# Calora Phase 1 GitHub Sync and Remote CI Verification Report

**Date:** 2026-09-09  
**Branch:** `release/calora-onboarding-and-plus`  
**Repository:** `atembekong-hash/Calora`  
**Scope:** Phase 1 GitHub synchronization and mandatory remote CI verification

## Final verdict

**PASS.**

The exact Phase 1 implementation was pushed to GitHub, the mandatory workflow became valid and executable, the GitHub-only CI assumptions were corrected without skipping checks, and the final remote `verify` job passed all stages.

Branch protection was intentionally not changed or claimed. Production deployment and EAS/native builds were intentionally not performed.

## GitHub synchronization

- Initial Phase 1 implementation commit: `899f4df81cba007af68a2ff73b98dd0231d88576`
- Workflow-context correction: `55e96a236edc9632b4c8712aff2593d6ac351fde`
- Final implementation commit: `8fb4dd049060618a2f67829019253d17a5770739`
- Branch pushed: `release/calora-onboarding-and-plus`
- Final implementation local SHA: `8fb4dd049060618a2f67829019253d17a5770739`
- Final implementation remote SHA: `8fb4dd049060618a2f67829019253d17a5770739`
- Local and remote SHAs matched after the final implementation push.
- Pushes completed successfully with fast-forward updates.

## Committed Phase 1 files

The Phase 1 implementation and its supporting corrections include:

- `.github/workflows/mandatory-ci-release-gate.yml`
- `scripts/ci/validate-expo-config.mjs`
- `scripts/ci/sanitize-failure-artifacts.mjs`
- `artifacts/calora/lib/__tests__/profileScreen.test.tsx`
- `artifacts/api-server/src/routes/premiumRecipes.ts`
- `scripts/verify-api-release.test.mjs`
- `.agents/memory/independent-limiter-side-effects.md`
- `.agents/memory/MEMORY.md`
- `20_CALORA_MANDATORY_CI_RELEASE_GATE_FINAL_REPORT.md`

This report is the follow-up verification document:

- `21_CALORA_PHASE1_GITHUB_SYNC_REMOTE_CI_VERIFICATION_REPORT.md`

## Remote workflow results

Workflow:

- Path: `.github/workflows/mandatory-ci-release-gate.yml`
- Workflow ID: `354218758`
- State: active
- Trigger: push

Final implementation run:

- Run ID: `34383499370`
- Run URL: https://github.com/atembekong-hash/Calora/actions/runs/34383499370
- Head SHA: `8fb4dd049060618a2f67829019253d17a5770739`
- Status: completed
- Conclusion: **success**

Final job:

- Job ID: `102573856402`
- Job name: `Verify workspace release foundation`
- Job URL: https://github.com/atembekong-hash/Calora/actions/runs/34383499370/job/102573856402
- Status: completed
- Conclusion: **success**
- All 21 primary workflow steps passed, including cleanup and evidence upload.

Successful remote stages included:

1. PostgreSQL 16 service initialization.
2. Checkout, pnpm 10.26.1, and Node 24 setup.
3. Frozen dependency installation.
4. Deterministic database schema, migration, and support-object provisioning.
5. Root, API, and Calora typechecks.
6. OpenAPI generation and generated-file drift enforcement.
7. Database integration verification.
8. Full API test suite.
9. Full Calora test suite and static-server security tests.
10. Expo configuration validation.
11. Production API build.
12. API startup, `/api/`, and `/api/healthz` smoke checks.
13. Sanitized failure evidence collection and artifact upload.

Uploaded evidence:

- Artifact: `calora-mandatory-ci-34383499370`
- Artifact ID: `10116874827`
- Size: 15,783 bytes
- Expiration: 2026-10-09
- Digest: `sha256:8f1fc5b6ae1a2a34d87c70cc1a47f806e2c7bcee0f6cc5f86b9dd2323cdeeeec`

## GitHub-only failures and fixes

### Run 1 — workflow rejected before a job existed

- Run ID: `34379353443`
- Conclusion: failure
- Jobs created: none
- GitHub reported:
  - `.github/workflows/mandatory-ci-release-gate.yml#L1`
  - Line 27 used an unrecognized `runner` context in job-level `env`.

Fix:

- Replaced job-level `${{ runner.temp }}` paths with `${{ github.workspace }}` paths.
- Kept the same log collection and artifact upload behavior.
- No validation step was removed or weakened.

### Run 2 — API suite reached the runner but lacked Replit-only test configuration

- Run ID: `34383059920`
- Job ID: `102572404205`
- Setup, database provisioning, typechecks, OpenAPI drift, and database integration passed.
- The full API step failed because GitHub Actions does not inherit Replit runtime configuration:
  - Built API startup could not initialize without the OpenAI integration variables.
  - Recipe photo tests correctly returned 502 without an object-storage bucket value.

Fix:

- Added CI-only deterministic sentinels to the workflow:
  - OpenAI base URL: loopback port `127.0.0.1:9`
  - OpenAI key: non-secret placeholder
  - Object-storage bucket: `calora-mandatory-ci`
- The loopback endpoint prevents external AI egress from CI.
- Tests continue to exercise startup and mocked provider behavior; no suite was skipped.

Local reproduction with those exact sentinel values passed:

- Full API suite: **471 passed, 4 skipped**
- Recovery-summary rolling-restart rehearsal: **1 passed**
- Recipe-generation suite: **13 passed**

## Test and build counts

The final Phase 1 verification evidence includes:

- Account-deletion integration: **5 passed, 1 skipped**
- Built API deletion-fence release verification: **1 passed**
- Full API suite: **471 passed, 4 skipped**
- Full Calora suite: **1,224 passed**
- Static-server security tests: **6 passed**
- OpenAPI code generation and drift check: **passed**
- Expo configuration validation: **passed**
- Production API build: **passed**
- API startup and health/readiness smoke: **passed**
- Profile focused test: **9 passed, 0 `act(...)` warnings**

## Final repository checks

- Final implementation local SHA matched the remote branch SHA.
- `git diff --check`: passed.
- Generated API paths: clean.
- No temporary controlled-failure mutation remained.
- No tracked build output was added.
- Existing specialized workflows were preserved.
- Branch protection was not modified.

## Explicit exclusions confirmed

- No EAS build was run.
- No native-device build or certification was run.
- No production deployment was performed.
- No production database or provider credential was changed.
- No branch-protection setting was changed.

The Phase 1 GitHub synchronization and remote mandatory CI verification are complete.