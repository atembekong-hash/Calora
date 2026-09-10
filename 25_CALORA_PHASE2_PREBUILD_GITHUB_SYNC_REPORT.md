# Calora Phase 2 Pre-Build GitHub Synchronization Report

**Date:** 2026-09-09  
**Repository:** `atembekong-hash/Calora`  
**Protected branch:** `release/calora-onboarding-and-plus`  
**Final verdict:** **SAFE TO TRIGGER SIGNED BUILDS**

## Executive summary

The completed Phase 2 native-auth/signing reconciliation was synchronized to
the protected GitHub release branch through the normal pull-request workflow.
The legitimate EAS provisioning-profile status normalization fix and its
regression test were included, as was
`24_CALORA_PHASE2_PREBUILD_RECONCILIATION_REPORT.md`.

The local protected release branch and GitHub's protected release branch now
point to the same immutable merge commit:

```text
8297400be2753c563faa19b945d69617c771a43d
```

The required protected-branch CI gate passed on that exact SHA. The release
ruleset remains active and unchanged. No force-push, bypass, history rewrite,
EAS/Expo build, deployment, provider mutation, dependency change, migration,
or production-infrastructure change was performed.

Report 25 is saved on the evidence branch
`agent/calora-phase2-prebuild-github-sync-report`. The protected release branch
is intentionally kept at the verified build SHA so this report-only artifact
does not change the exact source tree selected for the signed build.

## 1. Complete working-tree and unpushed-change audit

### Initial local state

The initial checkout was on:

```text
release/calora-onboarding-and-plus
```

The working tree was clean: no staged changes, unstaged changes, or untracked
files.

The local branch was three commits ahead of the tracked protected branch:

| Local commit | Subject | Scope decision |
|---|---|---|
| `de182c5c6108b49a32f5dbcc3f68ae712716cb22` | Add final Calora release protection reconciliation report | Excluded; prior release-protection report-only work |
| `6810589f9667507925fcd0c5929ac02b3584e170` | Update native authentication preflight logic and documentation | Included; Phase 2 |
| `7bbd4591fddc9042bb9141af6e3cda5dc2cfef4e` | Update iOS signing preflight logic and document prebuild reconciliation status | Included; Phase 2 |

The excluded `de182c5` commit added only
`22_CALORA_RELEASE_PROTECTION_RECONCILIATION_FINAL_PASS_REPORT.md`. It was
from the earlier release-protection reconciliation and did not belong in this
Phase 2 sync.

### Clean synchronization branch

A clean branch was created from the protected remote tip
`1b58ed3c7199a878f5645e6c130690cfc23c4d8d`. Only the two Phase 2 commits were
cherry-picked:

| Commit created | Source | Result |
|---|---|---|
| `fe4f847791623e423363c25315d732800ea8bd67` | Phase 2 native-auth commit `6810589` | Included |
| `2006dca6f442beafc7bb0944082907ffef644522` | Phase 2 signing/reconciliation commit `7bbd459` | Included |

The clean branch diff contained only the Phase 2 paths listed below. No
unrelated local change was carried forward.

## 2. Files synchronized and reconciliation

### Native identity and callback contract

- `artifacts/calora/app.json`
  - Preserves the reviewed Calora identity.
  - Uses iOS bundle ID and Android package
    `com.etiendem.caloraapp`.
  - Keeps `caloraapp` for invite/deep-link compatibility only.
  - Uses the exact branded auth callback path.
- `artifacts/calora/scripts/native-auth-preflight.js`
  - Encodes the exact signed native identity and callback expectations.
  - Keeps the 13-case-per-platform matrix explicit.
- `artifacts/calora/scripts/native-auth-preflight.test.js`
  - Tests identity loading, exact callback configuration, binary parsing,
    sanitized evidence, and matrix counts.

### Signing preflight fix

- `artifacts/calora/scripts/ios-signing-preflight.js`
  - Normalizes the EAS provisioning-profile status case-insensitively before
    deciding whether the record is active.
  - This is required because the live EAS read-only response returned
    `active`, while the previous strict comparison accepted only `ACTIVE`.
- `artifacts/calora/scripts/ios-signing-preflight.test.js`
  - Adds regression coverage for `status: 'active'`.
  - Existing invalid, expired, missing, redaction, and warning-window tests
    remain intact.

### Branded-link documentation and validation

- `docs/native-auth-link-validation.md`
  - Records the branded production host and exact native callback matrix.
- `docs/calora-production-readiness-certification.md`
  - Uses the reviewed branded native-link host.
- `docs/CALORAAPP_PRODUCT_METADATA.md`
  - Aligns public/legal/support/API metadata with the reviewed production host.
- `docs/complete_CALORA_COACH_FACT_CONTEXT_MIGRATION_GOVERNANCE_REVIEW.md`
  - Aligns its current public application URL.
- `scripts/ci/validate-expo-config.mjs`
  - Validates the exact branded identity, HTTPS origin, associated domain, and
    Android callback path.
- `scripts/monitor-native-associations.test.mjs`
  - Covers the production Apple Universal Links and Google Digital Asset Links
    response contracts and freshness behavior.

### Reports and durable audit note

- `23_CALORA_PHASE2_NATIVE_AUTH_BUILD_READINESS_REPORT.md`
  - Preserves the earlier blocked native-artifact state.
- `24_CALORA_PHASE2_PREBUILD_RECONCILIATION_REPORT.md`
  - Records the supplied external configuration evidence, the corrected EAS
    preflight result, validation results, and remaining native-execution
    prerequisites.
- `.agents/memory/MEMORY.md`
  - Adds the pointer for the non-obvious EAS status normalization behavior.
- `.agents/memory/eas-signing-status-normalization.md`
  - Records the durable provider-response compatibility rule and why it
    matters.

### Explicit exclusions

The sync did not include:

- `22_CALORA_RELEASE_PROTECTION_RECONCILIATION_FINAL_PASS_REPORT.md`
- Application behavior outside the audited Phase 2 scope
- New authentication-provider configuration
- Dependencies or lockfiles
- Database migrations or schema changes
- Production infrastructure or deployment settings
- GitHub workflow logic
- GitHub release-protection rules
- EAS build configuration changes

## 3. Local validation

All checks were rerun on the clean Phase 2 synchronization branch before the
PR was opened:

| Check | Result |
|---|---|
| Workspace typecheck | PASS |
| API Server typecheck | PASS |
| Calora typecheck | PASS |
| Full Calora test suite | PASS — 88 files, 1,224 tests |
| Calora server security tests | PASS — 6 tests |
| iOS signing preflight unit tests | PASS — includes lowercase `active` regression |
| Native auth preflight unit tests | PASS |
| Association monitor tests | PASS |
| Changed JavaScript syntax checks | PASS |
| Read-only iOS signing preflight | PASS |
| Expo resolved configuration validation | PASS |
| `git diff --check` | PASS |

The read-only signing preflight printed:

```text
[ios-signing] RELEASE PREFLIGHT PASSED
[ios-signing] Certificate expires: 2027-07-21
[ios-signing] Provisioning profile expires: 2027-07-21
[ios-signing] No build was started.
```

## 4. Pull request and commit history

### Phase 2 synchronization PR

- Pull request: [#2](https://github.com/atembekong-hash/Calora/pull/2)
- Title: `Phase 2 pre-build native-auth GitHub sync`
- Head SHA: `2006dca6f442beafc7bb0944082907ffef644522`
- Base SHA before merge:
  `1b58ed3c7199a878f5645e6c130690cfc23c4d8d`
- Merge method: standard GitHub merge
- Merge commit:
  `8297400be2753c563faa19b945d69617c771a43d`
- Merged at: `2026-09-10T01:43:24Z`

The direct protected-branch history was not force-pushed or rewritten. The
Phase 2 branch was pushed normally, checked by GitHub, and merged through the
protected PR path.

### Report 25 evidence commit

This report is saved as a report-only commit on:

```text
agent/calora-phase2-prebuild-github-sync-report
```

That evidence branch is based on the final protected build SHA. It is kept
separate so adding report metadata cannot alter the immutable release-build
source tree.

## 5. GitHub CI and status-check evidence

### PR #2 checks

The required protected check passed on the exact PR head
`2006dca6f442beafc7bb0944082907ffef644522`:

- Check: `Verify workspace release foundation`
- Status: `completed`
- Conclusion: `success`
- Workflow run:
  [34426408485](https://github.com/atembekong-hash/Calora/actions/runs/34426408485)
- Job:
  [102712482515](https://github.com/atembekong-hash/Calora/actions/runs/34426408485/job/102712482515)

The companion account-deletion fence check also passed:

- Workflow run:
  [34426408453](https://github.com/atembekong-hash/Calora/actions/runs/34426408453)
- Conclusion: `success`

### Post-merge protected-branch checks

Both post-merge checks passed on the final protected SHA
`8297400be2753c563faa19b945d69617c771a43d`:

- Required check: `Verify workspace release foundation`
  - Workflow run:
    [34426607970](https://github.com/atembekong-hash/Calora/actions/runs/34426607970)
  - Job:
    [102713084662](https://github.com/atembekong-hash/Calora/actions/runs/34426607970/job/102713084662)
  - Conclusion: `success`
- Account-deletion fence validation
  - Workflow run:
    [34426607885](https://github.com/atembekong-hash/Calora/actions/runs/34426607885)
  - Conclusion: `success`

### Native workflow status

The native-auth and encrypted-recovery workflow runs on the final SHA were
reported as failures:

- Native auth preflight:
  [34426607191](https://github.com/atembekong-hash/Calora/actions/runs/34426607191)
- Encrypted recovery:
  [34426606642](https://github.com/atembekong-hash/Calora/actions/runs/34426606642)

These workflows require the self-hosted `calora-native` runner, newly signed
native binaries, and exact iOS/Android target identifiers. Their result is the
already documented native-execution blocker, not a failure of the required
protected merge check. No bypass or workflow change was used.

## 6. Protected-branch ruleset evidence

The live GitHub ruleset was reread after merge:

- Ruleset: `Calora Release Protection`
- Ruleset ID: `22675187`
- Enforcement: `active`
- Protected branch: `release/calora-onboarding-and-plus`
- Deletion protection: active
- Non-fast-forward/force-push protection: active
- Required status-check policy: strict
- Required context: `Verify workspace release foundation`
- Bypass actors: none

The ruleset and applied rules were not modified.

## 7. Final SHA and working-tree verification

### Final local SHA

```text
8297400be2753c563faa19b945d69617c771a43d
```

### Final remote protected-branch SHA

```text
8297400be2753c563faa19b945d69617c771a43d
```

### SHA equality

```text
local_sha == remote_protected_branch_sha
true
```

### Working-tree status

The final local checkout was returned to:

```text
release/calora-onboarding-and-plus
```

It has no staged, unstaged, or untracked changes:

```text
git status --porcelain=v1
# no output
```

The evidence branch contains this report separately and does not alter the
protected release branch or its build SHA.

## 8. Exact immutable build SHA

Build the signed native artifacts from exactly:

```text
8297400be2753c563faa19b945d69617c771a43d
```

This SHA is simultaneously the final local protected-branch SHA and the final
remote protected-branch SHA. It contains the complete Phase 2 reconciliation,
the EAS signing-status fix and regression test, and report 24.

## 9. Remaining blockers

GitHub synchronization and required CI are complete. Before native
authentication certification is complete, the following execution work
remains:

1. Trigger the signed iOS and Android builds manually from the exact SHA above.
2. Complete the Apple macOS signing rehearsal.
3. Install the exact signed artifacts on selected iOS and Android targets.
4. Run the 26-case native callback matrix.
5. Run encrypted-recovery validation on disposable native targets.
6. Capture sanitized native evidence with artifact identity and target IDs.

These are post-sync native prerequisites. They do not block triggering the
signed builds.

## 10. Safety confirmations

- No force-push occurred.
- No history was rewritten on GitHub.
- No release-protection rule was changed.
- No required check was bypassed.
- No application behavior was changed during synchronization.
- No new authentication-provider configuration was applied.
- No dependency, migration, or production-infrastructure change was made.
- No EAS/Expo build was triggered.
- No deployment was performed.
- Supabase, RevenueCat, Railway, Apple, Google Cloud, and production
  infrastructure were not mutated.

## Final verdict

**SAFE TO TRIGGER SIGNED BUILDS**

The completed Phase 2 reconciliation and the legitimate EAS preflight fix are
on the protected release branch. The required GitHub CI gate passed on the
exact immutable build SHA, local and remote protected branch SHAs are
identical, the working tree is clean, and release protection remains active.