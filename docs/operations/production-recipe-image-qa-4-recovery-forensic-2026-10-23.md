# Production Recipe-Image QA #4 — Recovery Configuration Forensic Report

**Date:** 2026-10-23 UTC
**Scope:** Production Recipe-Image QA run `39891020186`, its explicitly authorized recovery-only run `39905663786`, the sanitized evidence artifacts, and source-only remediation.
**Security boundary:** No secret value was read, printed, copied, or committed. No database was queried. No storage object was listed or deleted. No normal recipe-image QA lifecycle was dispatched in this investigation.

## 1. Verdict

**BLOCKED — terminal cleanup for the bounded QA aliases is not yet proven.** The originally failed owner provisioning call remains an ambiguous Auth side effect. The recovery-only run did not resolve that state because the current runner correctly rejected the configured Supabase target as non-root before it could make any network, Auth, Calora API, cleanup, or image-generation request.

The production image workflow remains **not verified**. Neither run reached recipe-media listing, recipe-photo generation, preview, review, rejection, account deletion, or storage cleanup. There is no evidence of a generated image, signed locator, or storage object from either run.

## 2. Evidence chronology

1. [Run 39891020186](https://github.com/atembekong-hash/Calora/actions/runs/39891020186) was a normal manually dispatched QA run at protected-main commit `24ec736d21425f1e7f330faad287d869aa705533`.
2. Its public release preflight succeeded. The sanitized primary report recorded HTTP `200` and an exact expected-commit match before the first disposable-account provisioning attempt.
3. The first owner Auth Admin provisioning request returned HTTP `404`, producing the sanitized result `qa_account_provision_failed`. The primary report has no sign-in, Calora API, media, review, deletion, or storage fields populated.
4. Its in-run recovery attempted the deterministic owner password sign-in and failed with `recovery_qa_sign_in_failed`. This did not establish that the account did not exist.
5. [Run 39905663786](https://github.com/atembekong-hash/Calora/actions/runs/39905663786) was an owner-approved recovery-only run from protected `main` at `bc9f788c668116f99cf3e52f3cdfabdb36a23698`. Its normal image lifecycle was skipped.
6. The recovery-only artifact contains only `{ "result": "fail", "failure": "invalid_supabase_target" }`. The runner rejected the target locally before release verification, identity recovery, sign-in, Auth Admin provisioning, account deletion, or any Calora API request.

Both artifacts remain retained by GitHub until their stated expiration. They contain sanitized status data only; no account ID, email address, token, password, response body, signed URL, recipe payload, image bytes, or customer data was retained.

## 3. Root cause

At the original run’s source revision, `normalizeSupabaseUrl` accepted a Supabase URL with an arbitrary pathname and returned it unchanged. The runner then appended `/auth/v1/...` to perform Auth Admin provisioning and password sign-in. A target configured with an Auth path could therefore create a doubled Auth route and return the observed fast `404`.

The current protected-main runner requires an HTTPS `*.supabase.co` URL with exactly root pathname `/`, then canonicalizes it to `url.origin`. The recovery-only artifact establishes that the currently configured protected-environment value still fails this root-origin requirement. The value itself was not read, so this report does not claim the exact path or rule out an intervening secret change.

The original `404` does not prove that the first owner Auth Admin request had no side effect. The runner marked that request as potentially sent before making it and received no Auth identifier in response. Its later sign-in failure cannot distinguish a missing identity from another Auth failure. The owner is therefore **unresolved**, not declared absent. The secondary identity was not reached by the original sequence; recovery conservatively treats both deterministic aliases as potentially provisioned.

## 4. Confirmed non-events

The original run stopped before any authenticated Calora API call. The recovery-only run stopped even earlier, during local target validation. Therefore neither run has an evidence path to `POST /api/v1/recipes/photo`, private review preview issuance, image review, rejection, private storage upload, or the application account-deletion saga.

No automated bucket-wide storage inventory was performed, because it would require broader production credentials and could expose or affect unrelated data. The bounded recovery procedure remains the authorized mechanism for proving cleanup of only its own deterministic aliases.

## 5. Source remediation

The existing root-only Supabase target validator is correct and has not been weakened. This change adds defense in depth around the GitHub Actions invocation guard:

- The protected invocation check now has the explicit step identifier `invocation_guard`.
- If that guard fails, the credential-bearing recovery step, the report-enforcement step, and artifact upload are all skipped.
- A mismatched `expected_commit` can no longer reach recovery merely because a separately supplied value happens to match the deployed API release.
- The QA test suite now asserts the three invocation-guard gates and verifies that an explicit recovery run with a path-qualified Supabase target makes zero requests and performs zero cleanup actions.

This remediation does not alter application APIs, production configuration, storage policy, account-deletion semantics, review policy, or native build configuration.

## 6. Validation

All validation below is local, deterministic, and non-production.

- The focused production recipe-image QA runner suite passed three consecutive times: 16 tests passed and 0 failed on each run.
- The suite covers normal lifecycle sanitization, missing confirmation, stale-release refusal, redirect refusal, pre-API direct cleanup, ambiguous provisioning envelopes, interrupted cleanup, recovery-only alias reconciliation, path-qualified target refusal in normal and recovery modes, secret scope, protected-main controls, and sanitized artifact boundaries.
- The complete scripts workspace regression passed: 120 tests passed and 0 failed. The scripts TypeScript check also passed.
- `node --check scripts/production-recipe-image-qa.mjs` and `git diff --check` passed.
- The workflow YAML and static contract checks validate that the service-role key remains step-scoped and that the newly gated steps cannot execute after a failed invocation guard.

## 7. Required next action

The next production action is not authorized by this report and must not be dispatched automatically.

First, an owner must update only `CALORA_QA_SUPABASE_URL` in the `calora-production-recipe-image-qa` GitHub Environment to the canonical HTTPS Supabase project origin with root path `/`. It must not contain `/auth/v1`, `/rest/v1`, another path, a query, fragment, embedded credential, or whitespace. Do not alter the other Environment secrets or protection rules.

After this source-only hardening is merged and the current protected-main commit is deployed to the production API, a separate explicit owner authorization is required for one **recovery-only** run with the current deployed commit and `recovery_run_id=39891020186`. The existing Environment reviewer gate must remain in place. That bounded run must emit a sanitized `result: pass` before the aliases can be called cleaned. A normal image-generation lifecycle remains separately unauthorized.

## 8. Final status

The original routing defect is remediated in source. The new invocation-guard control prevents a different unsafe execution path discovered during this investigation. The production cleanup state remains intentionally unresolved and fail-closed until the protected Environment target is corrected and an explicitly authorized recovery-only run reaches terminal success.
