# Calora Recipe-Image Alternative Recovery Final Report

**Date:** 2026-10-23
**Verdict:** **BLOCKED — Sandbox recovery prepared; awaiting explicit credentialed execution authorization.**

## Release and deployment state

Protected `main` is:

```text
2707b32e4f823f6efcd6989f47287cf58353d4a2
```

Both production API origins report that exact revision and pass canonical health checks:

- `https://mycaloraapp.com/api/version` — exact SHA; `/health` status `ok`.
- `https://app.mycaloraapp.com/api/version` — exact SHA; `/health` status `ok`.

No deployment was performed because production was already aligned. A Railway deployment ID is therefore not applicable. Read-only Railway CLI inspection was attempted, but the current Sandbox Railway session returned `Unauthorized; please login`; no Railway state was changed and no deployment was retried.

## Alternative runner

The Manus Sandbox runner from protected PR #222 is merged and release validation passed in run `39962197720`.

Verified locally:

- 21 focused recovery/security tests passed, 0 failed.
- Credential-free Supabase DNS passed.
- Node/Undici HTTPS reachability passed.
- TLS verification passed.
- Both production API revisions and health checks passed.
- Local-source SHA guard and GitHub-hosted-runner refusal are enforced.
- No QA secret was read, printed, copied, or modified.

The alternative path delegates to the existing fail-closed recovery implementation and only supports recovery mode. It cannot generate images or access unrelated accounts.

## Secret mechanism

The wrapper accepts credentials only through process environment variables at execution time. No values are stored in source, reports, command arguments, artifacts, or the repository. Required names are:

```text
CALORA_QA_API_BASE_URL
CALORA_QA_SUPABASE_URL
CALORA_QA_SUPABASE_ANON_KEY
CALORA_QA_SUPABASE_SERVICE_ROLE_KEY
CALORA_QA_TEST_PASSWORD
```

The values must be supplied through the approved secret mechanism immediately before the authorized run. They are not currently available in the Sandbox and were not requested or used during preparation.

## Prepared single recovery execution

The one prepared execution is:

```text
runner: manus-sandbox
mode: recovery-only
historical recovery_run_id: 39891020186
expected_commit: 2707b32e4f823f6efcd6989f47287cf58353d4a2
confirmation: RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA
```

Before credentialed execution, the wrapper will repeat the credential-free dual-origin release/health and DNS/HTTPS/TLS preflight. It will stop if any check fails. After execution, only a sanitized `result: "pass"` with terminal cleanup evidence can be certified. A failure will stop with no automatic retry.

The normal production image lifecycle is not prepared for execution and remains unauthorized.

## Costs and safety

This mission performed no image generation, provider operation, production account operation, database change, storage change, native build, or deployment. Costs were limited to public health/version requests and local/protected CI tests.

## Remaining blocker

Explicit owner authorization is required for exactly one credentialed Sandbox recovery execution, together with secure availability of the required QA secrets. The current prompt authorized preparation and verification but is not treated as authorization for that credentialed execution.

## Evidence

- Alternative runner PR [#222](https://github.com/atem.../Calora/pull/222)
- Post-merge release validation [39962197720](https://github.com/atem.../Calora/actions/runs/39962197720)
- Protected source [2707b32e4f823f6efcd6989f47287cf58353d4a2](https://github.com/atem.../Calora/commit/2707b32e4f823f6efcd6989f47287cf58353d4a2)
