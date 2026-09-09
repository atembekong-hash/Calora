# Calora Release Protection — Final Reverification Report

**Date:** 2026-09-09  
**Repository:** `atembekong-hash/Calora`  
**Protected branch:** `release/calora-onboarding-and-plus`  
**Ruleset:** `Calora Release Protection`

## Executive verdict

**FAIL overall.**

The previous release-protection blocker is resolved in GitHub:

- The active ruleset now requires exactly `Verify workspace release foundation`.
- The old misspelled context `Verify workpace release foundation` is absent.
- The workflow produces the exact corrected check.
- The latest applicable protected-branch workflow run completed successfully.
- Deletion, force-push, bypass, and strict/up-to-date protections remain active.

The overall verification is **FAIL** because the local checkout does not match the current remote protected branch SHA. The local branch is one report-only commit ahead of the remote branch, and this task forbids pushing or modifying commits. No remote state was changed.

## 1. Branch and SHA evidence

Read-only GitHub evidence:

- Endpoint: `GET /repos/atembekong-hash/Calora/branches/release%2Fcalora-onboarding-and-plus`
- HTTP status: `200`
- Branch: `release/calora-onboarding-and-plus`
- Remote branch SHA: `5d926972a89fbe4f8769887176bca439d2e88e5a`
- GitHub branch `protected`: `true`

Additional GitHub ref evidence:

- Endpoint: `GET /repos/atembekong-hash/Calora/git/ref/heads/release%2Fcalora-onboarding-and-plus`
- HTTP status: `200`
- Ref: `refs/heads/release/calora-onboarding-and-plus`
- Object SHA: `5d926972a89fbe4f8769887176bca439d2e88e5a`

Local read-only evidence:

- Local branch: `release/calora-onboarding-and-plus`
- Local `HEAD`: `9d6a5346943d8df3a5f3316934ada74280d49285`
- `git ls-remote` release branch SHA: `5d926972a89fbe4f8769887176bca439d2e88e5a`
- Ahead/behind comparison: `0 1` — local is one commit ahead of remote.
- Local-only commit:
  - `9d6a534 Add final verification report for Calora release branch protection`
- Tree difference from remote to local:
  - `A 20_CALORA_RELEASE_BRANCH_PROTECTION_FINAL_VERIFICATION_REPORT.md`

The local/remote SHA mismatch is the remaining overall-verification blocker. It is report-only; no application or workflow difference was found in this comparison. This task did not push it or alter either branch.

## 2. Active ruleset evidence

Read-only GitHub evidence:

- Endpoint: `GET /repos/atembekong-hash/Calora/rulesets/22675187`
- HTTP status: `200`
- Ruleset ID: `22675187`
- Name: `Calora Release Protection`
- Target: `branch`
- Enforcement: `active`
- Bypass actors: `[]`
- Conditions:

```json
{
  "ref_name": {
    "include": ["refs/heads/release/calora-onboarding-and-plus"],
    "exclude": []
  }
}
```

The repository ruleset list also returned exactly one matching active ruleset named `Calora Release Protection`.

Applied-rules evidence:

- Endpoint: `GET /repos/atembekong-hash/Calora/rules/branches/release%2Fcalora-onboarding-and-plus`
- HTTP status: `200`
- Applied rules:
  - `deletion`
  - `non_fast_forward`
  - `required_status_checks`

## 3. Protection settings

The live ruleset proves:

- Enforcement active: **yes**
- Exact protected ref: **yes**
- Deletion restricted: **yes**
- Force pushes/non-fast-forward updates blocked: **yes**
- Bypass list empty: **yes**
- Strict/up-to-date required checks enabled: **yes**

The live required-status-check parameters are:

```json
{
  "do_not_enforce_on_create": false,
  "required_status_checks": [
    {
      "context": "Verify workspace release foundation",
      "integration_id": 15368
    }
  ],
  "strict_required_status_checks_policy": true
}
```

## 4. Exact required status-check context

Source:

`GET /repos/atembekong-hash/Calora/rules/branches/release%2Fcalora-onboarding-and-plus`

Exact required context:

`Verify workspace release foundation`

The old misspelled context:

`Verify workpace release foundation`

is not present in the applicable ruleset.

The API comparison returned:

```text
required contexts: ["Verify workspace release foundation"]
exact corrected context present: true
old misspelled context present: false
character-for-character equality: true
```

## 5. Workflow evidence

Workflow API:

- Endpoint: `GET /repos/atembekong-hash/Calora/actions/workflows/354218758`
- HTTP status: `200`
- Workflow ID: `354218758`
- Workflow path: `.github/workflows/mandatory-ci-release-gate.yml`
- Workflow state: `active`

The workflow source was verified through GitHub’s git-object API at the remote protected-branch commit:

- Commit SHA: `5d926972a89fbe4f8769887176bca439d2e88e5a`
- Workflow blob was retrieved successfully with HTTP `200`.
- Workflow triggers include:
  - `push`
  - `pull_request`
  - `workflow_dispatch`
- Job name in the remote workflow:

`Verify workspace release foundation`

## 6. Latest applicable GitHub Actions execution

Latest workflow run for the protected branch:

- Run ID: `34384424735`
- Run URL: https://github.com/atembekong-hash/Calora/actions/runs/34384424735
- Workflow ID: `354218758`
- Workflow name: `Mandatory CI release gate`
- Event: `push`
- Branch: `release/calora-onboarding-and-plus`
- Head SHA: `5d926972a89fbe4f8769887176bca439d2e88e5a`
- Status: `completed`
- Conclusion: `success`

Latest verification job/check:

- Job ID: `102577021218`
- Check/job name: `Verify workspace release foundation`
- Run ID: `34384424735`
- Head SHA: `5d926972a89fbe4f8769887176bca439d2e88e5a`
- Status: `completed`
- Conclusion: `success`
- Job URL: https://github.com/atembekong-hash/Calora/actions/runs/34384424735/job/102577021218

The commit check-runs API returned the same exact successful job:

- Endpoint: `GET /repos/atembekong-hash/Calora/commits/5d926972a89fbe4f8769887176bca439d2e88e5a/check-runs`
- Check name: `Verify workspace release foundation`
- Status: `completed`
- Conclusion: `success`
- Head SHA: `5d926972a89fbe4f8769887176bca439d2e88e5a`

## 7. Character-for-character comparison

| Source | Exact value |
|---|---|
| Ruleset required context | `Verify workspace release foundation` |
| GitHub Actions workflow job | `Verify workspace release foundation` |
| Latest GitHub check-run | `Verify workspace release foundation` |

Comparison result:

```text
ruleset_context === workflow_job_name
true

ruleset_context === latest_check_run_name
true

"Verify workpace release foundation" in applicable ruleset
false
```

There is no remaining required-check naming blocker.

## 8. Additional read-only checks

- The branch API reports the branch as protected.
- The applied-rules API confirms the ruleset is actually applied to the exact branch.
- The ruleset API and applied-rules API agree on the corrected required context.
- The remote workflow blob and the successful check-run agree on the job name.
- The latest successful run head SHA matches the current remote protected-branch SHA.
- No EAS/Expo build was triggered.
- No push, merge, force-push, branch deletion, ruleset mutation, workflow mutation, production-resource mutation, Supabase mutation, Railway mutation, or RevenueCat mutation was performed.

## 9. Remaining blocker

### Local/remote SHA inconsistency

The remote protected branch is at:

`5d926972a89fbe4f8769887176bca439d2e88e5a`

The local checkout is at:

`9d6a5346943d8df3a5f3316934ada74280d49285`

The local checkout is one report-only commit ahead. Because the request explicitly forbids pushing or modifying commits, this mismatch was not changed.

If verification is scoped strictly to GitHub release protection, the protection configuration now passes. Under this task’s complete verification requirements, local/remote consistency is not satisfied, so the final overall verdict remains **FAIL**.

## Final verdict

**FAIL**

The corrected GitHub ruleset and mandatory CI check now match exactly and all intended release protections remain active. The only remaining blocker is the local checkout being one report-only commit ahead of the remote protected branch, with no push permitted by this task.