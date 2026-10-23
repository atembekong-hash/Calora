# Calora Recipe-Image Alternative Runner Readiness

**Date:** 2026-10-23
**Verdict:** **BLOCKED — awaiting separate owner authorization for credentialed recovery.**

## Selected runner

No repository self-hosted GitHub Actions runners are registered. The simplest available materially different runner is the Manus Sandbox, which is separate from the failed GitHub-hosted runner path and has working public Supabase DNS/TLS connectivity.

No credentialed recovery was executed in this preparation phase.

## Credential-free preflight evidence

The sandbox preflight passed against the current protected release:

- Protected `main`: `744bb7f59853a67da9818de53826497eee0bd0b0`.
- `https://mycaloraapp.com/api/version`: exact SHA match; health PASS.
- `https://app.mycaloraapp.com/api/version`: exact SHA match; health PASS.
- Supabase project hostname DNS: PASS.
- Node/Undici HTTPS reachability: PASS.
- TLS verification: PASS.

The preflight emits only fixed status fields, public origins, and the expected commit. It does not read or accept credentials.

## Alternative execution path

Added locally:

- `scripts/run-alternative-recipe-image-recovery.mjs`
- `scripts/run-alternative-recipe-image-recovery.test.mjs`

The wrapper is recovery-only and:

- Refuses execution when `GITHUB_ACTIONS=true`.
- Requires explicit `CALORA_QA_ALTERNATIVE_RUNNER_ID=manus-sandbox`.
- Requires the exact confirmation phrase and numeric historical run ID.
- Requires the expected commit to match the local Git commit.
- Runs the credential-free dual-origin release/health and Supabase DNS/HTTPS/TLS preflight before reading credentialed recovery configuration.
- Delegates cleanup to the existing `recoverProductionRecipeImageQa` implementation.
- Preserves the existing deterministic QA identities, release-SHA guard, authorization, redirect refusal, least-privilege environment handling, sanitized output, and fail-closed cleanup semantics.
- Never invokes the normal image-generation lifecycle.

The wrapper contains no credential values, GitHub secret interpolation, bearer token handling, or raw error output.

## Validation

- Alternative-runner source syntax: PASS.
- Alternative-runner refusal and secret-boundary tests: 3 PASS.
- Existing production recipe-image QA and recovery tests: 18 PASS.
- Combined focused suite: **21 passed, 0 failed**.
- Native Android/iOS builds: not triggered.
- Production data or accounts: not modified.

## Cost

Preparation used credential-free public checks and local tests only. No image generation, provider charge, production account operation, storage operation, or native build was initiated.

## Remaining blocker and owner action

A separate explicit owner authorization is required before credentialed recovery. The authorization must cover exactly one Sandbox recovery-only execution for historical run `39891020186`, using the then-current protected-main SHA after a fresh preflight. Required QA credentials must be supplied through the approved secret mechanism; they must not be sent in chat or written to the repository.

After authorization, the Sandbox wrapper will execute once and inspect its sanitized result. Only `result: "pass"` with terminal cleanup evidence will be certified. A failure will stop the mission without automatic retry.

The normal production image lifecycle remains unauthorized.

## Final verdict

**BLOCKED — alternative runner is prepared and credential-free validated; credentialed recovery awaits separate owner authorization and secure secret availability.**
