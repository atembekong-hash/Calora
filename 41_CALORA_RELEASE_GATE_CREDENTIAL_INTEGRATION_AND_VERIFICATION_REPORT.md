# Calora Step 41 Release Gate Credential Integration and Verification Report

Date: 2026-09-16  
Scope: Minimum GitHub Actions credential wiring for the live required-status
check audit, normal `main` push, and verification of the automatic gate.

## 1. Executive summary

Step 40 proved that `permissions.administration: read` is invalid GitHub
Actions workflow syntax. Step 41 used the owner-created repository Actions
secret named `CALORA_RELEASE_GATE_ADMIN_READ_TOKEN` only in the audit step
that reads protected-branch required-status configuration.

The secret value was never read, printed, logged, written to a file, passed as
a command argument, or included in a report. Its existence was verified through
GitHub repository secret metadata only.

The minimum workflow change was committed and pushed normally. GitHub created
the automatic Release validation run for the exact new canonical `main` SHA.
The job, exact required check, audit step, package setup, dependency
installation, and test suite all completed successfully.

## 2. Starting canonical SHA/tree

The frozen remote canonical state was:

```text
origin/main SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91
origin/main TREE: d3c230005c043874b9e245b70cd4b23f70af8105
```

The remote matched the expected Step 40 baseline and had not advanced.

## 3. Local/origin state

At the Step 41 freeze:

```text
local main SHA:   8c35c88a796951c7da5938d2ecabf8b17be24be5
local main TREE:  b70ce03e77d888ba7f3455570f03c1c2c36c4586
origin/main SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91
origin/main TREE: d3c230005c043874b9e245b70cd4b23f70af8105
ahead/behind:     5 / 0
```

The tracked working tree was clean. The owner-supplied Step 41 instruction
attachment was untracked and excluded from all commits.

## 4. Local-only commit classification

The five commits already ahead of `origin/main` were documentation/evidence
commits:

```text
37d31b5  Add Calora release gate remediation report
463d009  Add forensic investigation documentation for GitHub Actions controller
918920f  Document Calora GitHub Actions controller forensic findings
aff90e9  Add CALORA release gate remediation documentation
8c35c88  Update release validation documentation and add remediation report
```

They were explicitly allowed to remain in ancestry. The Step 41 remediation
commit is separately identified in section 19.

## 5. Secret existence verification by NAME ONLY

GitHub repository secret metadata was read through the existing GitHub
integration. The response was reduced to safe metadata only:

```text
Secret name:      CALORA_RELEASE_GATE_ADMIN_READ_TOKEN
Exists:           yes
Scope:            repository Actions secret endpoint
Created metadata: 2026-09-16T16:40:35Z
Updated metadata: 2026-09-16T16:40:35Z
```

No secret value was requested or returned.

## 6. Confirmation secret value was never accessed/exposed

The secret value was not accessed through the GitHub API, shell environment,
workflow log retrieval, source files, reports, git history, command-line
arguments, or debugging output.

The only committed token-related text is the GitHub Actions secret expression:

```yaml
GITHUB_TOKEN: ${{ secrets.CALORA_RELEASE_GATE_ADMIN_READ_TOKEN }}
```

GitHub resolves that expression inside the audit step at workflow runtime.
The plaintext credential is not present in the repository.

## 7. Original invalid permission status

The prior invalid declaration:

```yaml
permissions:
  contents: read
  administration: read
```

was removed during Step 40 after owner-provided GitHub UI evidence:

```text
(Line: 12, Col: 3): Unexpected value 'administration'
```

The Step 41 candidate preserved the valid minimal permissions block:

```yaml
permissions:
  contents: read
```

No unsupported permission key, `write-all`, or additional write permission was
introduced.

## 8. Branch-protection verification

GitHub’s protected-branch required-status-checks endpoint was read-only
queried before commit/push and after workflow completion:

```text
GET /repos/atembekong-hash/Calora/branches/main/protection/required_status_checks
HTTP 200
```

The live required contexts were:

```text
contexts: Run release validation suite
checks:   Run release validation suite
```

No branch-protection setting was modified.

## 9. Required check identity

The required context and preserved workflow identity are:

```text
Workflow name:     Release validation
Job ID:            release-validation
Job display name:  Run release validation suite
Required context:  Run release validation suite
Runner:            ubuntu-latest
Timeout:           15 minutes
```

The exact job display name remained identical to the live required context.

## 10. Exact credential-wiring design

The existing owner-created secret is scoped solely to the protected-branch
audit step:

```yaml
- name: Audit required branch checks
  env:
    GITHUB_TOKEN: ${{ secrets.CALORA_RELEASE_GATE_ADMIN_READ_TOKEN }}
  run: node scripts/audit-required-checks.mjs
```

The script’s existing `GITHUB_TOKEN || GH_TOKEN` input interface was retained.
Checkout, pnpm setup, Node setup, dependency installation, and tests were not
given the PAT. Checkout still uses normal Actions authentication behavior and
does not persist the PAT into Git credentials.

## 11. Exact workflow diff

The Step 41 remediation diff was:

```diff
diff --git a/.github/workflows/release-validation.yml b/.github/workflows/release-validation.yml
index d63a865..77635ba 100644
--- a/.github/workflows/release-validation.yml
+++ b/.github/workflows/release-validation.yml
@@ -22,7 +22,7 @@ jobs:
 
       - name: Audit required branch checks
         env:
-          GITHUB_TOKEN: ${{ github.token }}
+          GITHUB_TOKEN: ${{ secrets.CALORA_RELEASE_GATE_ADMIN_READ_TOKEN }}
         run: node scripts/audit-required-checks.mjs
```

The Step 40 removal of `administration: read` was already present in the
parent tree and remains preserved.

## 12. Audit-script diff or confirmation none

```text
scripts/audit-required-checks.mjs changed: no
```

The audit retains live GitHub API inspection, required-context comparison,
non-zero failure for missing contexts, and non-zero failure for API
authorization errors.

## 13. Secret-exposure audit

The workflow and relevant scripts were checked for unsafe audit-token handling:

```text
echo $GITHUB_TOKEN:                     absent
printenv / environment dump:             absent
set -x / shell debug tracing:            absent
token command-line argument:             absent
token forwarded beyond audit step:       absent
token in scripts/report/generated files: absent
token in committed diff/history:         absent
```

The authorized secret name appears exactly once in the workflow, under the
audit step’s `env` block.

## 14. YAML/workflow validation

The local candidate passed:

```text
YAML parse:                    passed
Prettier workflow formatting:  passed
git diff --check:              passed
Workflow contract check:       passed
```

The contract check verified:

```text
push trigger restricted to main
pull_request trigger present
workflow_dispatch trigger present
Release validation workflow name
release-validation job ID
Run release validation suite job display name
ubuntu-latest runner
15-minute timeout
actions/checkout@v4
audit command
test command
one scoped authorized secret reference
absence of administration, write-all, continue-on-error, tracing, and token echo
```

## 15. Scripts test result

```text
Command: pnpm --filter @workspace/scripts test
Result:  47 passed, 0 failed, 0 skipped
```

## 16. Typecheck result

```text
Command: pnpm run typecheck
Result:  passed
```

Workspace libraries plus API server, Calora mobile app, FatSecret gateway,
mockup sandbox, and scripts typechecks completed successfully.

## 17. `git diff --check` result

```text
Result: passed
```

## 18. Application/runtime changed-path audit

The Step 41 remediation commit changed exactly:

```text
.github/workflows/release-validation.yml
```

No application/runtime changes were made under:

```text
artifacts/calora/
artifacts/api-server/
lib/db/
lib/api-spec/
lib/api-client-react/
lib/api-zod/
```

No Expo, EAS, native, production API, database schema, migration, or runtime
configuration was changed.

## 19. Remediation commit SHA/tree

```text
Commit SHA:  292d105638bc0316be08cf3763fc46239e05dd42
Tree SHA:    fc1334da98c36d2db38bc6a1a04daeca34af6860
Parent SHA:  8c35c88a796951c7da5938d2ecabf8b17be24be5
Subject:     Fix release gate audit authentication
Changed path: .github/workflows/release-validation.yml
```

The commit contains no secret value and no application changes.

## 20. Pre-push remote verification

Immediately before push:

```text
origin/main SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91
origin/main TREE: d3c230005c043874b9e245b70cd4b23f70af8105
Candidate SHA:    292d105638bc0316be08cf3763fc46239e05dd42
Candidate TREE:   fc1334da98c36d2db38bc6a1a04daeca34af6860
Candidate ancestry from origin/main: passed
Candidate ahead/behind: 6 / 0
Tracked working tree: clean
```

The only untracked item was the owner-supplied instruction attachment, which
cannot affect the committed source tree and was not added.

## 21. Push result

Normal push completed:

```text
git push origin main
11eb7d0..292d105  main -> main
```

No force option, rebase, reset, history rewrite, workflow dispatch, or rerun
was used.

GitHub reported that the expected required status check was pending at push
time, then the automatic run completed successfully.

## 22. New canonical SHA/tree

```text
Canonical main SHA:  292d105638bc0316be08cf3763fc46239e05dd42
Canonical main TREE: fc1334da98c36d2db38bc6a1a04daeca34af6860
```

## 23. Automatic workflow run identity

The automatic workflow run created by the normal push was:

```text
Workflow ID:     359784386
Workflow name:   Release validation
Workflow path:   .github/workflows/release-validation.yml
Run ID:          35123941578
Run number:      3
Attempt:         1
Event:           push
Branch:          main
Head SHA:        292d105638bc0316be08cf3763fc46239e05dd42
Status:          completed
Conclusion:      success
Created:         2026-09-16T16:45:43Z
Started:         2026-09-16T16:45:43Z
Completed/update: 2026-09-16T16:46:12Z
Check suite ID:  95121202064
```

The run head SHA exactly equals canonical `main`.

## 24. Job count

```text
Jobs in automatic Release validation run: 1
```

The real GitHub-hosted job was:

```text
Job ID:          104888252044
Name:            Run release validation suite
Status:          completed
Conclusion:      success
Started:         2026-09-16T16:45:46Z
Completed:       2026-09-16T16:46:11Z
Runner group:    GitHub Actions
Runner:          GitHub Actions 1000001871
```

This proves the invalid-workflow controller failure is gone: the run allocated
a runner and executed a job.

## 25. Check-run count

The commit had five observed check runs across workflows. The Release
validation workflow contributed the required successful check:

```text
Run release validation suite
```

Check-run count is greater than zero, and the exact required check exists.

## 26. Required check-run identity

```text
Check-run ID:    104888252044
Name:            Run release validation suite
Head SHA:        292d105638bc0316be08cf3763fc46239e05dd42
Status:          completed
Conclusion:      success
Started:         2026-09-16T16:45:46Z
Completed:       2026-09-16T16:46:11Z
```

The check name and head SHA exactly match the required identity.

## 27. Per-step execution results

All required execution steps completed successfully:

| Step | Status | Conclusion | Started | Completed |
| --- | --- | --- | --- | --- |
| Check out source | completed | success | 16:45:48Z | 16:45:51Z |
| Audit required branch checks | completed | success | 16:45:51Z | 16:45:52Z |
| Set up pnpm | completed | success | 16:45:52Z | 16:45:53Z |
| Set up Node.js | completed | success | 16:45:53Z | 16:45:59Z |
| Install dependencies | completed | success | 16:45:59Z | 16:46:04Z |
| Run release validation suite | completed | success | 16:46:04Z | 16:46:08Z |

GitHub also completed setup and post-action cleanup steps successfully.

## 28. Audit endpoint runtime result

The `Audit required branch checks` step completed successfully in the exact
automatic Release validation job.

The script calls:

```text
GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
```

It fails closed for any unexpected API response. Therefore its successful step
conclusion proves the scoped repository secret authenticated the live
protected-branch required-status-check read successfully.

## 29. Sanitized audit output

The audit script’s successful deterministic report format is:

```text
Required-check audit for default branch "main"
Required contexts: 1
Active workflow check names: <count>
All required status contexts match active workflow check names.
```

Independent read-only branch-protection queries before push and after workflow
completion both returned:

```text
contexts: Run release validation suite
checks:   Run release validation suite
HTTP 200
```

The workflow step completed with success. The GitHub integration was not
authorized to download the separate job-log archive endpoint (HTTP 403), so no
raw workflow log body was retrieved or copied. That log-download restriction is
distinct from the successful in-workflow audit credential and does not expose
or invalidate it.

## 30. Credential authorization result

```text
Audit credential authorization: accepted
Evidence: Audit required branch checks completed successfully in the automatic
          job, while the script fails closed on non-success protected-branch
          API responses.
```

No 401, 403, resource-not-accessible, expired-token, or scope-mismatch result
occurred in the audit step.

## 31. Release validation test result

The automatic workflow executed:

```text
pnpm --filter @workspace/scripts test
```

The step concluded successfully. Local pre-push verification reported:

```text
47 tests passed
0 failed
0 skipped
```

## 32. Required check final conclusion

```text
Required check: Run release validation suite
Conclusion:    success
```

All release-gate success conditions were met:

1. invalid permission is absent;
2. workflow parsed and ran;
3. automatic push run was created;
4. a job and check run exist;
5. check name and SHA are exact;
6. audit authenticated and validated live required configuration;
7. all setup/install/test steps succeeded;
8. local and remote canonical `main` are synchronized.

## 33. Post-push local/origin state

After workflow completion and a final read-only fetch:

```text
local main SHA:   292d105638bc0316be08cf3763fc46239e05dd42
origin/main SHA:  292d105638bc0316be08cf3763fc46239e05dd42
local TREE:       fc1334da98c36d2db38bc6a1a04daeca34af6860
origin TREE:      fc1334da98c36d2db38bc6a1a04daeca34af6860
ahead/behind:     0 / 0
tracked tree:     clean
```

The owner-supplied Step 41 instruction attachment remains untracked. This
report is created after verification and is not part of the remediation commit.

## 34. Preserved Calora application invariants

No application behavior was changed. The canonical candidate preserves:

- durable capture acceptance;
- Weekly Programs deterministic modal transition/state machine;
- shared Planner Program pools and eligibility;
- bounded Coach request lifecycle;
- Coach Fact Context restriction;
- diary `imageAssetKey` synchronization;
- capture compatibility and security;
- recipe `nextOffset` and `terminalReason`;
- Premium entitlement;
- PKCE/authentication;
- account isolation;
- deletion fences;
- sync ownership;
- current API contracts and release attestation;
- Expo Router;
- production EAS configuration;
- Apple Health privacy configuration;
- TestFlight configuration.

No historical branch merge was performed.

## 35. Database/migration confirmation

```text
Database changes: none
Schema changes:   none
Migrations:       none
```

## 36. Deployment/mobile-build confirmation

No manual release action outside the GitHub Actions gate was run:

```text
Manual API deployment:        none
Replit production publish:    none
EAS operation:                none
iOS build:                    none
Android build:                none
TestFlight submission:        none
App Store submission:         none
```

Any external reaction to the authorized `main` push is separate from Step 41
and is not claimed as a deployment action here.

## 37. Remaining uncertainties

The release gate itself has no remaining Step 41 uncertainty.

The GitHub integration used for investigation could not download the separate
job-log archive endpoint (HTTP 403). This does not affect the passed workflow:
the exact audit step completed successfully with its scoped repository secret,
and GitHub’s branch-protection API independently confirmed the required
context before and after execution.

## 38. Exact recommendation for Step 42

The release gate is verified. Step 42 may be considered only after explicit
owner authorization for a native/TestFlight release.

Until then, do not run an EAS build or submit, trigger an iOS workflow,
increment native build numbers, create an IPA, build Android, submit
TestFlight/App Store, deploy the API, publish through Replit, or modify the
database.

## Final verdict

RELEASE GATE VERIFIED — READY FOR OWNER TESTFLIGHT AUTHORIZATION