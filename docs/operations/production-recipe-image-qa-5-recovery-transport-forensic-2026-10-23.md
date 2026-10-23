# Production Recipe-Image QA #5 — Recovery Transport Forensic Report

**Date:** 2026-10-23 UTC
**Scope:** The owner-authorized recovery-only Production Recipe-Image QA run `39909981439` for original run `39891020186`, its sanitized evidence artifact, safe provider metadata, and source-only diagnostic remediation.
**Security boundary:** No normal recipe-image lifecycle was dispatched. No image was generated, previewed, accepted, rejected, or fetched. No production secret value, token, password, account identifier, signed URL, request body, response body, user record, database record, or storage object was read or retained.

## 1. Verdict

**BLOCKED — terminal cleanup of the bounded deterministic QA aliases is still not proven.** The approved recovery-only run failed closed before it could obtain an Auth identifier required for direct pre-API deletion or an authenticated session required for the Calora account-deletion saga.

This is not a recipe-image functional failure. The recovery-only workflow deliberately skipped the normal recipe-image lifecycle. The result establishes neither the presence nor absence of an Auth identity from original run `39891020186`; it also establishes no image or storage side effect.

## 2. Authorized run and release evidence

The owner-approved run was [Production Recipe-Image QA `39909981439`](https://github.com/atembekong-hash/Calora/actions/runs/39909981439). It was manually dispatched from protected `main` at commit `740571e54b17ef467687261f9666ab028ba3f980` with the required confirmation and `recovery_run_id=39891020186`.

Before dispatch, both production API origins returned HTTP `200` from `/api/version`, reported exactly `740571e54b17ef467687261f9666ab028ba3f980`, and returned HTTP `200` from `/api/healthz`. The GitHub Environment metadata showed one required reviewer and one branch-policy protection rule. Its six required secret names were present; their values were not inspected.

The run entered the existing Environment approval state, was explicitly approved by the owner, then completed as `failure`. Its only sanitized evidence file was retained by GitHub through 2026-11-06 and contains:

```json
{
  "schemaVersion": "calora.production-recipe-image-qa-recovery.v3",
  "result": "fail",
  "failure": "qa_admin_request_unavailable"
}
```

The workflow’s terminal enforcement correctly rejected this non-passing recovery result. This confirms cleanup failure blocked certification rather than being silently treated as success.

## 3. What the result proves

The runner emits `qa_admin_request_unavailable` only when the Auth Admin request throws before returning an HTTP response. A normal HTTP result—including an authorization denial, routing failure, duplicate-user response, or malformed response—would instead produce a different result with an HTTP status where available.

The current source path is: attempt normal sign-in for the deterministic alias; if no safe pre-API identity is recovered, make one bounded Auth Admin create request for that same alias; only after a returned Auth identifier does the runner issue direct pre-API Auth deletion. The sanitized result therefore proves that recovery did not obtain an identifier needed to prove terminal deletion. It does not reveal whether the underlying cause was timeout, redirect handling, connection failure, or another transport condition.

The previously corrected root-only Supabase target guard was passed in this run; otherwise it would have emitted `invalid_supabase_target` before the release check and before any Auth request. The configured secret value was not read. The authenticated Supabase management metadata confirms that Calora’s project is active and its documented public project origin is an HTTPS root origin. A credential-free request to the project’s Auth Admin route returned the expected unauthorized HTTP status with no redirect, so the public route shape is not a double-path redirect issue.

A one-minute read-only aggregate query of Calora’s Supabase unified log stream around the recovery step showed only three `supavisor_logs` entries and no Auth HTTP source. That log source cannot establish whether the GitHub-runner request reached Supabase. No account, database, or storage inspection was performed.

## 4. Cleanup state

The original normal run `39891020186` ended after an ambiguous owner Auth Admin provisioning attempt and later failed sign-in. The current recovery-only run did not reach terminal cleanup. Its no-workspace recovery policy conservatively treats both deterministic aliases for original run `39891020186` as potentially provisioned until a future authorized recovery proves otherwise.

No direct deletion was attempted without a returned Auth identifier. No broader user search, bulk query, storage listing, or unscoped deletion was used. This preserves account isolation and avoids deleting any unrelated account. The aliases therefore remain intentionally **unresolved**, and the correct certification state remains **BLOCKED**.

## 5. Source remediation

The failure artifact intentionally omitted raw exception details, which preserved credential and user-data safety but prevented classification of the transport failure. The source now converts only thrown-request metadata into one fixed sanitized category: `timeout`, `redirect`, `connection`, or `unknown`.

No raw exception name, message, URL, headers, credential, payload, response content, account identity, or provider diagnostic is returned, printed, uploaded, or committed. Existing HTTP status reporting is unchanged. The recovery workflow still treats every non-passing cleanup result as a failure, and it does not add a retry, broader user lookup, direct deletion shortcut, or normal image-generation action.

## 6. Local validation

The focused Production Recipe-Image QA suite passed three consecutive times after the change: 17 tests passed and 0 failed on every run. The new regression simulates an Auth Admin timeout and proves that recovery returns only `qa_admin_request_unavailable` with `transport: "timeout"`, preserves the no-Calora-API boundary, and omits the provider-specific error text.

The complete scripts workspace suite passed with 121 tests and 0 failures. Scripts TypeScript validation, Node syntax validation, Prettier, and `git diff --check` also passed. These are local, deterministic, non-production controls; they do not prove terminal cleanup for the prior live aliases.

## 7. Exact next action

This report does not authorize another credentialed production run. First merge the diagnostic-only source hardening through the protected GitHub workflow. The next recovery must then use the current protected-main SHA after the production API reports the same exact revision.

After that release alignment, the owner must explicitly authorize one additional **recovery-only** run for `recovery_run_id=39891020186` and approve the existing GitHub Environment gate. Its future sanitized artifact must report `result: "pass"` before either deterministic alias can be certified as cleaned. The additional fixed transport category will narrow any remaining infrastructure blocker without exposing secrets or changing the cleanup policy. A normal recipe-image generation lifecycle remains separately unauthorized.

## 8. Final status

The previously fixed Supabase path construction did not recur. The remaining live blocker is an unclassified pre-response Auth Admin transport failure. Its cleanup state remains fail-closed and unresolved. The source has been strengthened to classify any future recurrence safely; no new production credentialed QA execution was dispatched beyond the one owner-approved run.
