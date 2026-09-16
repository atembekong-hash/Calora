# Calora Step 40 Release Gate Permission Remediation Report

Date: 2026-09-16  
Scope: Confirmed GitHub Actions permission remediation; no push because the
required-check audit has no supported configured authorization path

## 1. Executive summary

The owner supplied the exact GitHub Actions validation error identified in
Step 39:

```text
Invalid workflow file: .github/workflows/release-validation.yml#L1

(Line: 12, Col: 3): Unexpected value 'administration'
```

This converts the Step 39 permission finding from a hypothesis into a proven
workflow syntax error.

The minimum local syntax remediation was applied:

```diff
 permissions:
   contents: read
-  administration: read
```

The release-validation trigger, required check name, audit step, test command,
runner, timeout, and all other workflow behavior were preserved. The
audit-required-checks script was not modified.

The audit script is not a no-op. It calls the protected branch required-status
checks REST endpoint and fails closed on non-success responses. GitHub
documents Administration repository permission read access for that endpoint,
but `administration` is not a valid Actions workflow `GITHUB_TOKEN` permission
key. No supported fine-grained PAT, GitHub App installation token, or other
read-capable workflow credential is configured in the repository or workflow.

Therefore the workflow syntax fix is safe to identify but not safe to push as
an otherwise intentionally broken release gate. The Step 40 pre-push decision
is Case B.

## 2. Owner GitHub UI error evidence

The owner-provided GitHub UI evidence is:

```text
Invalid workflow file: .github/workflows/release-validation.yml#L1

(Line: 12, Col: 3): Unexpected value 'administration'
```

The rejected declaration was:

```yaml
permissions:
  contents: read
  administration: read
```

The owner evidence confirms that `administration` is invalid GitHub Actions
workflow syntax in this workflow. It explains the prior behavior:

```text
workflow run object
→ immediate failure
→ zero jobs
→ zero check runs
→ no runner allocation
→ no step logs
```

## 3. Confirmed root cause

The confirmed root cause for the release-validation controller failure is:

```text
permissions.administration is invalid in a GitHub Actions workflow
permissions block.
```

This is no longer treated as hypothetical. It was confirmed by the exact
GitHub UI validation error.

The permission syntax problem is separate from the runtime authorization
needed by the required-check audit. Removing the invalid key makes the
workflow declaration valid, but it does not automatically give the standard
Actions token Administration access to protected-branch settings.

## 4. Starting canonical SHA/tree

The remote canonical state at the Step 40 freeze was:

```text
origin/main SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91
origin/main TREE: d3c230005c043874b9e245b70cd4b23f70af8105
```

The remote matched the expected Step 39 canonical identity and had not
advanced unexpectedly.

## 5. Local/origin state

Before the local candidate edit:

```text
local main SHA:   aff90e9e254056b252b8053bf22dcd04f7ed919b
local main TREE:  bc4366ee302c198bbc618efb775a9173737362e9
ahead/behind:     4 / 0
working tree:     clean
```

The local-only commits were documentation/evidence commits. No application or
runtime changes were present in those commits.

After the local syntax edit, the workflow is intentionally uncommitted and
unpushed. The candidate diff is the only configuration diff.

## 6. Local-only commit classification

The local-only commits at the Step 40 freeze were:

```text
37d31b5  Add Calora release gate remediation report
463d009  Add forensic investigation documentation for GitHub Actions controller
918920f  Document Calora GitHub Actions controller forensic findings
aff90e9  Add CALORA release gate remediation documentation
```

They are documentation or attached-evidence commits only. They were not
workflow remediation commits and were not pushed during Step 40.

## 7. Branch-protection verification

The `main` branch protection requirement remains:

```text
Required context: Run release validation suite
```

The previously verified GitHub endpoint was:

```text
GET /repos/atembekong-hash/Calora/branches/main/protection
HTTP 200
```

The required context exactly matches the release-validation job display name.
No branch-protection setting was edited.

## 8. Original workflow permissions

Before the local candidate edit, the canonical workflow contained:

```yaml
permissions:
  contents: read
  administration: read
```

The owner’s GitHub UI identified `administration` as the invalid field.

The workflow also contained and still preserves:

```yaml
on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:
```

The identity of the gate remained:

```text
Workflow name:     Release validation
Job ID:            release-validation
Job display name:  Run release validation suite
Runner:            ubuntu-latest
Timeout:           15 minutes
```

## 9. `audit-required-checks.mjs` forensic map

The script is `scripts/audit-required-checks.mjs`.

### 9.1 Purpose

The script compares live required status contexts on the repository’s default
branch with check names extracted from the workflow files in the current
checkout. Its stated purpose is to detect an orphaned required context before
a workflow rename or removal leaves branch protection waiting on a check that
cannot be produced.

This is a release-integrity/configuration-consistency audit. It is read-only.
It does not modify branch protection, workflow files, repository settings,
secrets, or any other GitHub state.

### 9.2 Environment variables and arguments

The command supports:

```text
--repository <owner>/<repo>
--default-branch <branch>
--workflows-dir <directory>
--api-url <url>
```

Defaults come from:

```text
GITHUB_REPOSITORY
GITHUB_API_URL
.github/workflows
```

The credential source is:

```text
GITHUB_TOKEN || GH_TOKEN
```

If neither token is present, it fails with:

```text
GITHUB_TOKEN (or GH_TOKEN) is required.
```

If the repository is not supplied by argument or `GITHUB_REPOSITORY`, it fails
with:

```text
GITHUB_REPOSITORY is required.
```

### 9.3 GitHub REST endpoints

The script performs these authenticated read operations:

```text
GET ${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}
```

It reads the repository’s `default_branch` unless an explicit
`--default-branch` argument is supplied.

It then calls:

```text
GET ${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/branches/{defaultBranch}/protection/required_status_checks
```

The branch name is URI encoded. A 404 is explicitly allowed and is converted
to a null response, representing no protected required-status-check record.
Any other non-2xx response throws:

```text
GitHub API request failed (<status> <statusText>): <first 300 body characters>
```

The script does not call a write endpoint.

### 9.4 Data read from GitHub

From the repository response, it reads:

```text
default_branch
```

From the protected-branch required-status-check response, it reads:

```text
contexts[]
checks[]
```

It supports both legacy string contexts and newer check records with a
`context` field.

### 9.5 Data read from the checkout

The script reads YAML workflow files from the configured workflows directory.
It extracts:

```text
workflow name
job IDs
job display names
workflow/job aliases
```

It does not use a full YAML parser. It uses bounded line parsing for workflow
names and job display names.

### 9.6 Success and failure conditions

The audit normalizes and sorts the required contexts and active workflow check
names. It computes:

```text
matchedContexts
missingContexts
ok = missingContexts.length === 0
```

It prints a human-readable report. It sets a non-zero process exit code when a
required context is missing or mismatched.

The outer command also exits non-zero when the GitHub API returns an unexpected
error, including a likely 401 or 403 from the protected-branch endpoint.

### 9.7 No-op and source-only limitations

The script cannot prove live branch protection from workflow source alone. It
requires the protected-branch API response to compare the actual required
contexts with source-controlled workflow names.

Replacing the API call with a hard-coded expected context or a source-only
check would weaken the audit and could silently pass after branch protection
changes. That replacement was not made.

## 10. GitHub `GITHUB_TOKEN` permission analysis

GitHub’s Actions workflow syntax documentation lists the available permissions
that can be assigned to the Actions-provided `GITHUB_TOKEN`.

Authoritative reference:

```text
https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
```

The documented workflow keys include:

```text
actions
artifact-metadata
attestations
checks
code-quality
contents
deployments
id-token
issues
discussions
packages
pages
pull-requests
security-events
statuses
vulnerability-alerts
```

`administration` is not a valid Actions workflow permission key. The owner’s
exact GitHub UI error independently proves this for the repository workflow.

The supported workflow declaration after the local fix is:

```yaml
permissions:
  contents: read
```

No write permission was added. No `write-all` declaration was considered
acceptable.

The standard `${{ github.token }}` remains the normal Actions token passed to
the audit script:

```yaml
env:
  GITHUB_TOKEN: ${{ github.token }}
```

That line was preserved.

## 11. Branch-protection REST authorization analysis

GitHub’s protected-branch REST documentation states that the `Get branch
protection` operation requires fine-grained `Administration` repository
permission with read access for applicable fine-grained token types.

Authoritative reference:

```text
https://docs.github.com/en/rest/branches/branch-protection
```

The exact audit subresource is:

```text
/repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
```

The script’s `GITHUB_TOKEN` is an Actions-provided token whose workflow
permissions are limited to the documented Actions permission keys. GitHub
does not provide an `administration` workflow key, and the repository has no
configured mechanism in this workflow to grant the protected-branch endpoint
the separately documented Administration permission.

Therefore the supported-behavior analysis is:

```text
A. Actions GITHUB_TOKEN can request:
   only the documented workflow permission keys.

B. Protected-branch REST read requires:
   Administration repository read permission for a fine-grained token.

C. Existing workflow path:
   no proven supported way for this standard GITHUB_TOKEN to obtain that
   protected-branch authorization.

D. Safe external alternative:
   a fine-grained PAT or GitHub App installation/user token with Administration
   read, stored and injected through an authorized secret path.
```

The GitHub integration used for this investigation is not automatically
available inside a GitHub Actions runner as the workflow’s `GITHUB_TOKEN`. Its
read access cannot be silently reused by the workflow.

## 12. Supported authentication alternatives considered

### 12.1 Standard Actions `GITHUB_TOKEN`

```text
Status: not proven sufficient
```

It is the only current workflow credential. It cannot request the invalid
`administration` workflow key. The audit endpoint documents Administration
read for fine-grained tokens. No successful runtime call from this workflow
token exists because the job previously failed before initialization.

### 12.2 `GH_TOKEN`

```text
Status: not configured
```

The script accepts `GH_TOKEN` as a fallback environment variable, but the
workflow does not set it and no repository reference shows an existing
supported read credential under that name.

### 12.3 Fine-grained personal access token

```text
Status: supported by GitHub API model, not configured
```

A fine-grained PAT with repository Administration read could satisfy the
protected-branch read requirement. No such credential is configured in the
workflow or available repository secret references. Creating a PAT or secret
was not authorized.

### 12.4 GitHub App installation token

```text
Status: supported by GitHub API model, not configured
```

A GitHub App installation token with the required repository permission could
provide the protected-branch read path. No such App or installation-token
exchange exists in the repository workflow. Creating an App or credential was
not authorized.

### 12.5 Alternative protected-branch REST endpoint

```text
Status: not a zero-secret bypass
```

The script already uses the narrow required-status-checks subresource. The
branch-protection authorization boundary remains the same. Switching from the
subresource to the parent protection endpoint would not establish a
supported Actions-token authorization path.

### 12.6 GraphQL or source-only replacement

```text
Status: not proven equivalent and not selected
```

A GraphQL query would still need an authorized token for protected branch
settings. A source-only audit would not inspect live branch protection and
could silently pass after settings drift. Neither is a safe unverified
replacement for the current audit.

## 13. Chosen minimum design or reason for stopping

The chosen local design is:

1. remove the proven invalid `administration: read` workflow key;
2. preserve `contents: read`;
3. preserve `${{ github.token }}` for the audit step;
4. preserve the audit script and its fail-closed API behavior;
5. do not invent or add a credential;
6. do not push until protected-branch audit authorization is supported.

The candidate passes workflow syntax validation, but it cannot be safely
promoted because the audit’s protected-branch API authorization has not been
proven with the available standard token and no supported external credential
exists in the current workflow.

This is Case B:

```text
Invalid permission removed BUT audit requires a credential that does not
currently exist.
```

The required stop verdict is:

```text
PERMISSION SYNTAX FIX IDENTIFIED — SUPPORTED AUDIT CREDENTIAL REQUIRED
```

## 14. Exact workflow diff

The complete local candidate workflow diff is:

```diff
diff --git a/.github/workflows/release-validation.yml b/.github/workflows/release-validation.yml
index 20aaf7e..d63a865 100644
--- a/.github/workflows/release-validation.yml
+++ b/.github/workflows/release-validation.yml
@@ -9,7 +9,6 @@ on:
 
 permissions:
   contents: read
-  administration: read
 
 jobs:
   release-validation:
```

No trigger, job, step, action, command, timeout, or required-check name
changed.

## 15. Any audit-script diff

```text
Audit script changed: no
```

The audit remains:

```text
scripts/audit-required-checks.mjs
```

No token fallback, error handling, endpoint, success condition, or security
boundary was modified.

## 16. Workflow syntax validation

The local candidate passed:

```text
YAML parsing:             passed
Prettier formatting:      passed
Supported permissions:    contents: read only
Push main trigger:        preserved
Pull request trigger:     preserved
Workflow dispatch:        preserved
Workflow name:            preserved
Job ID:                   preserved
Job display name:         preserved
Runner:                   ubuntu-latest
Timeout:                  15 minutes
Checkout action:          preserved
Audit command:             preserved
Test command:              preserved
```

The invalid `administration` key is absent from the candidate.

## 17. Scripts test result

```text
Command:
  pnpm --filter @workspace/scripts test

Result:
  47 tests passed
  0 failed
  0 skipped
```

## 18. Typecheck result

```text
Command:
  pnpm run typecheck

Result:
  passed
```

All scoped library, artifact, and scripts typechecks passed.

## 19. `git diff --check`

```text
Result: passed
```

## 20. Changed-path safety audit

The candidate changed only:

```text
.github/workflows/release-validation.yml
```

No paths under the following areas changed:

```text
artifacts/calora/
artifacts/api-server/
lib/db/
lib/api-spec/
lib/api-client-react/
lib/api-zod/
Expo configuration
EAS configuration
native app configuration
production API configuration
database schema
migrations
```

No secret or variable dependency was added.

## 21. Remediation commit SHA/tree

No remediation commit was created.

```text
Commit SHA: not created
Tree SHA:   not created
```

The local syntax fix remains uncommitted because pushing without a supported
audit credential would intentionally create a workflow that reaches the audit
step and may fail authorization.

## 22. Pre-push remote verification

The remote was fetched at the Step 40 freeze and remained:

```text
origin/main SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91
origin/main TREE: d3c230005c043874b9e245b70cd4b23f70af8105
```

The remote did not advance. No pre-push candidate verification was performed
because Case B prohibits push before audit authorization exists.

## 23. Push result

```text
Push: not attempted
```

No normal push command was run. No force option, rebase, reset, dispatch, or
rerun was used.

## 24. New canonical SHA/tree

```text
New canonical SHA:  not created
New canonical TREE: not created
```

The remote canonical SHA remains the Step 38 remediation SHA:

```text
11eb7d0038f2d60b8540cc2f027d2b50c2117b91
```

## 25. Automatic workflow run ID

```text
Automatic run: not created in Step 40
```

No push occurred, so no new automatic Release validation run could be
observed. The prior invalid-permission run remains historical evidence only:

```text
35120305466
```

## 26. Job count

```text
Step 40 job count: not applicable; no push
```

The previous invalid workflow run had zero jobs. No claim is made about the
unpublished local candidate’s GitHub job count.

## 27. Check-run count

```text
Step 40 check-run count: not applicable; no push
```

No required check-run identity exists for the unpushed local candidate.

## 28. Required check identity

The required check remains exactly:

```text
Run release validation suite
```

The workflow job display name was not changed. No new check run was created.

## 29. Per-step execution results

No Step 40 GitHub workflow executed:

```text
Checkout:                       not run
Required-check audit:           not run
Set up pnpm:                    not run
Set up Node.js:                 not run
Install dependencies:           not run
Run release validation suite:   not run
```

The local scripts test and typecheck are separate validation evidence and do
not substitute for a GitHub Actions run.

## 30. Required-check audit result

The audit script was inspected but not run against a fabricated or unavailable
credential.

The audit remains enabled in the workflow. It was not removed, downgraded to a
warning, changed to `exit 0`, or given `continue-on-error`.

No supported credential exists to prove that the normal Actions token can read
the protected branch required-status-checks endpoint. The workflow was
therefore not pushed.

## 31. Any runtime 401/403 evidence

```text
Runtime audit HTTP status: not observed in Step 40
Reason: workflow was not pushed after the syntax fix
```

The prior workflow never reached the audit step because the invalid permission
caused pre-job workflow rejection. It therefore produced no audit 401/403.

The reason for stopping is based on GitHub-supported permission requirements
and the absence of a configured supported credential, not on a fabricated
runtime response.

## 32. Final required-check conclusion

The required check has not been re-executed in Step 40.

The gate is not verified because:

```text
No new canonical commit
No new push
No new automatic run
No job
No check run
No audit execution
```

The syntax error itself is fixed in the local candidate, but the audit
authorization path remains unresolved.

## 33. Post-push local/origin synchronization

```text
Push performed: no
Post-push verification: not applicable
```

At the Step 40 freeze, before the local candidate edit:

```text
origin/main SHA:  11eb7d0038f2d60b8540cc2f027d2b50c2117b91
origin/main TREE: d3c230005c043874b9e245b70cd4b23f70af8105
local main SHA:   aff90e9e254056b252b8053bf22dcd04f7ed919b
local main TREE:  bc4366ee302c198bbc618efb775a9173737362e9
ahead/behind:     4 / 0
```

The local candidate is intentionally dirty after the uncommitted workflow
permission edit. It was not pushed.

## 34. Application invariants

No Calora application behavior changed. The following remain untouched:

- durable capture acceptance;
- Weekly Programs deterministic modal state machine;
- shared Planner Program pools and eligibility;
- bounded Coach lifecycle;
- Coach Fact Context restriction;
- diary `imageAssetKey` synchronization;
- capture compatibility and security;
- recipe `nextOffset`;
- recipe `terminalReason`;
- PKCE and authentication;
- account isolation;
- deletion fences;
- sync ownership;
- API contracts;
- Expo Router;
- EAS configuration;
- Apple Health privacy strings;
- TestFlight configuration.

## 35. Database/migration confirmation

```text
Database changes: none
Schema changes:   none
Migrations:       none
```

No database or migration command was run.

## 36. Deployment/mobile-build confirmation

During Step 40:

```text
API deployment command:     none
Replit production publish:  none
EAS build:                  none
iOS build:                  none
Android build:              none
TestFlight submission:      none
App Store submission:       none
```

No push was performed, so Step 40 did not create a new external-provider
deployment reaction. The earlier Railway production deployment record from the
Step 38 push remains separate historical evidence and is not claimed as a
Step 40 action.

## 37. Remaining uncertainties

The invalid workflow syntax is no longer uncertain. The remaining issue is
authorization for the audit’s live protected-branch read:

```text
Required endpoint:
  /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks

Documented fine-grained authorization:
  Administration repository permission, read

Current workflow credential:
  standard Actions GITHUB_TOKEN

Configured supported external credential:
  none found
```

The next safe step requires owner authorization to configure one supported
read-only credential or to approve a rigorously equivalent audit design. The
credential must not be invented, printed, or stored by this task.

## 38. Exact recommendation for Step 41

Step 41 should obtain explicit owner authorization for one of these supported
paths:

1. configure a least-privilege fine-grained repository credential with
   Administration read and inject it through a protected GitHub Actions secret;
2. configure a GitHub App installation-token path with only the required
   protected-branch read permission; or
3. approve and prove a different GitHub-supported, zero-secret API path that
   reads live required-status-check configuration without weakening the audit.

After that authorization, Step 41 may:

1. preserve the local removal of `administration`;
2. implement only the approved supported credential wiring if required;
3. run the static validations again;
4. commit only the authorized workflow/authentication change;
5. verify the remote has not advanced;
6. push normally;
7. verify a non-zero job count and the exact
   `Run release validation suite` check on the new canonical SHA;
8. stop before any native build or TestFlight action.

Do not remove the audit, convert it to a warning, hard-code success, broaden
permissions, weaken branch protection, or create a credential without separate
owner authorization.

## Final verdict

PERMISSION SYNTAX FIX IDENTIFIED — SUPPORTED AUDIT CREDENTIAL REQUIRED