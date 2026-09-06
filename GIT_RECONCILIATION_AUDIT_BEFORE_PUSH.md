# Calora Git reconciliation audit before push

**Audit type:** Safe, read-only Git inspection and reconciliation planning  
**Final verdict:** **BLOCKED**

No push, force push, reset, rebase, cherry-pick, amend, branch deletion, source
change, build, or deployment was performed. The only working-tree change made by
this audit is this report.

## Scope and method

`git fetch origin --prune --no-tags` completed successfully. It updated a
separate remote task branch but did not update `origin/main`, alter the checked
out files, or run a build. All graph and history findings below are based on
the fetched refs.

## Git graph summary

| Field | Value |
| --- | --- |
| Current branch | `main` |
| Local `main` HEAD | `ac12045ac585316bd5abbf143dbcf6e31bfaeb94` |
| `origin/main` HEAD | `4599c51840540863d90ba3df71f4baa6175119cb` |
| Merge base | `4599c51840540863d90ba3df71f4baa6175119cb` |
| Ahead / behind | 11 ahead / 0 behind |
| Local-only commits | 11 |
| Remote-only commits | 0 |
| Working tree before report creation | Clean |

`origin/main` is the merge base and therefore an ancestor of local `main`.
There is no remote divergence to merge. The earlier “eight commits ahead”
snapshot is stale: three more local commits were merged after that observation.

Linear graph, oldest to newest:

```text
origin/main (4599c51)
  └─ ead2aa0  generated mockup update
      └─ eb89319  recovery warning cooldown resilience
          └─ b1c198b  generated mockup update
              └─ 6039452  recovery warning integration test
                  └─ 9e5bf5a  recovery summary restart behavior
                      └─ bcb48c7  recovery log sanitization
                          └─ 16090de  TheMealDB Premium V2
                              └─ dde30e5  signing-evidence rerun behavior
                                  └─ fb87239  TheMealDB report update
                                      └─ 0645ce8  signing-evidence permissions
                                          └─ ac12045  macOS signing rehearsal workflow
```

## Local-only commit inventory

### 1. `ead2aa0d9d2ac3c29cc28f4140b2f4cf7ea1e368`

- **Short SHA / date:** `ead2aa0` — 2026-09-05T22:01:33Z
- **Subject:** Update generated mockup components
- **Files:** `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`
- **Actual content:** Two generated-component references were updated in the
  isolated mockup sandbox.
- **Classification:** 4 — mockup/temporary work.
- **Publish assessment:** Do not publish by default. It is not Calora runtime
  work and has no accompanying mockup approval context in this audit.
- **Dependencies / separation risk:** No source-level dependency was found on
  later Calora API, Recipes, recovery, or signing commits. Omitting it from a
  curated production branch has low functional risk; retaining it on the
  existing local branch preserves it for later review.
- **Human review:** Required before any publication.

### 2. `eb893191a34a4d2cdb3f40bdbccb8315a84fc338`

- **Short SHA / date:** `eb89319` — 2026-09-05T22:02:21Z
- **Subject:** Fail open when recovery warning cooldown storage is unavailable
- **Files:** `artifacts/api-server/src/lib/account-deletion-state.ts`,
  `artifacts/api-server/src/__tests__/account-deletion-state.test.ts`
- **Actual content:** Changes account-deletion recovery-warning behavior so a
  cooldown-storage outage does not block the underlying recovery/deletion
  state, and adds focused coverage.
- **Classification:** 3 — recovery/reconciliation work; candidate validated
  production work.
- **Publish assessment:** Likely safe to publish after the recovery-change
  owner confirms it remains intended for the release.
- **Dependencies / separation risk:** No dependency on either mockup commit.
  It is conceptually related to commits 3–6; include it before their related
  tests and recovery follow-ups. Separating it from those follow-ups may reduce
  coverage but should not remove an API dependency.
- **Human review:** Release owner should approve the changed fail-open policy.

### 3. `b1c198b75055d270847a8329f33f32cdbcf2e645`

- **Short SHA / date:** `b1c198b` — 2026-09-05T22:02:32Z
- **Subject:** Update generated mockup components
- **Files:** `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`
- **Actual content:** A second small generated mockup-sandbox reference update.
- **Classification:** 4 — mockup/temporary work.
- **Publish assessment:** Do not publish by default.
- **Dependencies / separation risk:** No source-level dependency on the
  Calora application, API, recipe, recovery, or signing work was found.
  Keeping it only on the preserved local backup has low functionality risk.
- **Human review:** Required before any publication.

### 4. `6039452f4fb1302f631be113264aec490c1d1012`

- **Short SHA / date:** `6039452` — 2026-09-05T22:10:55Z
- **Subject:** Prove recovery warning suppression is atomic across concurrent
  API claims
- **Files:** `artifacts/api-server/src/__tests__/recoveryWarningSuppression.integration.test.ts`
- **Actual content:** Adds integration coverage for concurrent claims against
  recovery-warning suppression; it does not alter production runtime code.
- **Classification:** 3 — recovery/reconciliation validation work.
- **Publish assessment:** Safe and useful to publish with the corresponding
  recovery behavior, subject to the same release-owner confirmation as commit 2.
- **Dependencies / separation risk:** Conceptually depends on the recovery
  warning-suppression behavior under test. No dependency on either mockup
  commit was found. Leaving it out risks losing concurrency regression coverage,
  not runtime functionality.
- **Human review:** Not independently blocked, but should travel with the
  recovery set.

### 5. `9e5bf5abe99ac792f9721754cd47249a4087f9e1`

- **Short SHA / date:** `9e5bf5a` — 2026-09-06T00:08:58Z
- **Subject:** Prove recovery summary persistence across rolling restart
- **Files:** `artifacts/api-server/src/index.ts`,
  `artifacts/api-server/src/__tests__/recoverySummaryRollingRestart.integration.test.ts`
- **Actual content:** Adds restart/persistence integration coverage and changes
  API-process initialization so recovery-summary state survives a rolling
  restart correctly.
- **Classification:** 3 — recovery/reconciliation work; candidate validated
  production work.
- **Publish assessment:** Likely safe only as part of the recovery set, after
  review of the changed process-startup behavior.
- **Dependencies / separation risk:** Related to commits 2, 4, and 6. It has
  no mockup dependency, but separating it from its integration test risks
  losing proof of the restart contract; separating it from the recovery set
  could weaken the intended operational behavior.
- **Human review:** Required because it changes startup/runtime lifecycle code.

### 6. `bcb48c720df0252c1ba54365f927b4573df26dc4`

- **Short SHA / date:** `bcb48c7` — 2026-09-06T00:34:23Z
- **Subject:** Verify production recovery summary logs remain sanitized
- **Files:** `artifacts/api-server/src/lib/logger.ts`,
  `artifacts/api-server/src/__tests__/logger.test.ts`
- **Actual content:** Tightens recovery-summary log sanitization and adds logger
  coverage for sensitive/restricted operational output.
- **Classification:** 3 — recovery/reconciliation work; candidate validated
  production work.
- **Publish assessment:** Likely safe and security-positive after confirming
  downstream operators do not rely on removed log fields.
- **Dependencies / separation risk:** Conceptually follows the recovery
  lifecycle changes in commits 2–5 but has no discovered mockup dependency.
  Separating it risks weakening sensitive-log protection.
- **Human review:** Required for operational-log compatibility.

### 7. `16090def64aa468411d49891d7316372e1a48b8e`

- **Short SHA / date:** `16090de` — 2026-09-06T00:42:39Z
- **Subject:** Integrate TheMealDB v2 API with updated recipe endpoints and
  validation schemas
- **Files:** API recipe route and focused test; Recipes screen; OpenAPI and
  generated client/Zod artifacts; TheMealDB report; project-memory metadata.
  The commit also changes `.agents/agent_assets_metadata.toml`.
- **Actual content:** Validated TheMealDB Premium V2 integration: server-only
  key use, bounded comma-separated multi-ingredient filtering, provider
  response validation/generic failures, UI guidance, and generated contract
  updates. The report records validation and provenance boundaries.
- **Classification:** 2 — TheMealDB Premium V2 integration; validated
  production work.
- **Publish assessment:** The Calora implementation and report are safe to
  publish. The generated agent-assets metadata is unrelated/uncertain and
  requires human review before it is included in a curated commit.
- **Dependencies / separation risk:** No functional dependency on the recovery
  or mockup commits was found. It depends on its API/OpenAPI/generated-client
  files moving together; separating any of those risks contract drift or a
  broken Recipes client. The report update in commit 9 depends on this report
  being present.
- **Human review:** Required only for the agent-assets metadata and any desired
  final report wording.

### 8. `dde30e5e0aea073613e62535175b0f9c6d4e7cf9`

- **Short SHA / date:** `dde30e5` — 2026-09-06T00:47:54Z
- **Subject:** Prevent stale Apple signing evidence after failed reruns
- **Files:** `artifacts/calora/scripts/ios-signing-evidence.js`,
  `artifacts/calora/scripts/ios-signing-evidence.test.js`,
  `artifacts/calora/tests/device/README.md`
- **Actual content:** Makes the signing-evidence script replace stale success
  evidence after a failing rerun and documents/test-covers the behavior.
- **Classification:** 5 — signing/build configuration and release tooling.
- **Publish assessment:** Candidate production tooling; publish only if the
  release owner intends this signing-evidence workflow to ship.
- **Dependencies / separation risk:** Commit 10 modifies the same script and
  tests, so commit 8 must precede it. Commit 11's rehearsal contract invokes
  the evidence workflow and should also follow it. Excluding this commit while
  keeping 10 or 11 risks broken or incomplete signing diagnostics.
- **Human review:** Required, because it affects release evidence.

### 9. `fb872395b03bc6003c2b678cd656570734cc2cd9`

- **Short SHA / date:** `fb87239` — 2026-09-06T00:51:09Z
- **Subject:** Update premium mealdb integration report
- **Files:** `PREMIUM_THEMEALDB_V2_INTEGRATION_REPORT.md`
- **Actual content:** Updates the TheMealDB report with the previous blocked
  push finding and associated Git status.
- **Classification:** 2 — TheMealDB Premium V2 report follow-up.
- **Publish assessment:** Safe to publish with commit 7 after replacing the
  historical push status with the final, then-current reconciliation outcome.
- **Dependencies / separation risk:** Strictly depends on commit 7 creating the
  report. Leaving it out does not affect runtime code but leaves stale release
  documentation.
- **Human review:** Required only to confirm final report wording.

### 10. `0645ce859291b267051f0a497550faac70ede7e4`

- **Short SHA / date:** `0645ce8` — 2026-09-06T00:51:58Z
- **Subject:** Verify private Apple signing evidence permissions across runner
  umasks
- **Files:** `artifacts/calora/scripts/ios-signing-evidence.js`,
  `artifacts/calora/scripts/ios-signing-evidence.test.js`
- **Actual content:** Adds permission-hardening behavior and test coverage for
  signing evidence under varied runner umasks.
- **Classification:** 5 — signing/build configuration and release tooling.
- **Publish assessment:** Candidate production tooling; likely safe with commit
  8, pending release-owner approval.
- **Dependencies / separation risk:** Directly depends on commit 8 because it
  changes the same signing-evidence implementation and tests. Separating it
  risks losing the privacy hardening.
- **Human review:** Required for release-tooling behavior.

### 11. `ac12045ac585316bd5abbf143dbcf6e31bfaeb94`

- **Short SHA / date:** `ac12045` — 2026-09-06T02:25:25Z
- **Subject:** Add macOS iOS signing rehearsal contract and sanitized evidence
  workflow
- **Files:** `.github/workflows/ios-signing-rehearsal.yml`,
  Calora package script, signing rehearsal contract/fixtures.
- **Actual content:** Adds a macOS GitHub Actions signing rehearsal contract,
  sanitized fixture-based evidence checks, and a package command to run it.
- **Classification:** 5 — signing/build configuration and release tooling.
- **Publish assessment:** Not safe to publish automatically. It changes a
  GitHub Actions workflow and therefore needs explicit repository-owner review
  of triggers, permissions, runner use, and release process.
- **Dependencies / separation risk:** Should follow commits 8 and 10. Excluding
  it preserves app runtime functionality but omits the intended macOS rehearsal
  contract.
- **Human review:** Required before publication.

## Remote comparison

There are **no commits on `origin/main` that local `main` does not contain**:

```text
remote-only commit count: 0
```

The remote tree is the local tree's ancestor. Local `main` contains all remote
files plus the changes introduced by the 11 commits above. The tree comparison
therefore shows only local additions/modifications: recovery API/log code and
tests, TheMealDB API/UI/contracts/report, signing scripts/tests/workflow, and
the two mockup-generator updates. No remote file would be overwritten by a
merge; the risk is accidental publication of local commits that have not had a
publication decision.

## Secret and history review

- No `.env`, key, certificate, or credential file is changed in the local-only
  commit range.
- The only `THEMEALDB_API_KEY` code reference is a server-side environment read
  in the API recipe route.
- The only assignment in the local-only history is the focused test's explicit
  non-production fake sentinel. It is not the configured secret value.
- No literal `THEMEALDB_API_KEY` assignment outside that test was found in the
  local-only patch range.
- The TheMealDB report refers to the environment variable by name only; it does
  not contain a value.
- Signing fixtures contain clearly named fixture-only sensitive-value examples
  used to test redaction; they are not configured credentials. The signing
  workflow still requires human review before publication.

This review can establish that no configured TheMealDB secret appears in the
tracked history considered here. It does not read, print, compare, or otherwise
expose the configured environment secret.

## Strategy analysis

### Normal push of current `main`

**Not recommended.** It would fast-forward `origin/main` by all 11 commits.
That includes both unreviewed generated mockup commits and the new GitHub
Actions signing workflow. It is technically possible because local is ahead and
not behind, but it violates the requirement to avoid accidental publication of
temporary/unwanted work.

### Clean reconciliation branch from `origin/main` with selective commits

**Recommended, after human approvals.** First preserve the current local tip in
a backup branch. Then create a clean branch from the fetched `origin/main`,
apply only the approved recovery, TheMealDB, and signing work in dependency
order, deliberately excluding the mockup commits, and open a review before
merging/pushing to `main`.

This strategy preserves every local commit in the backup while giving owners a
clear review boundary and avoiding accidental mockup publication. Commit 7
requires a deliberate choice about its generated agent-assets metadata; its
Calora implementation and report should remain atomic.

### Merge-based reconciliation

**Not recommended.** There is nothing to merge because `origin/main` is already
an ancestor of local `main`. A merge would not exclude the mockup commits and
would add unnecessary history noise.

### Safer alternative: leave current `main` untouched indefinitely

This is safest for the remote in the short term but does not advance any valid
local Calora work. It is acceptable only while the required human reviews are
pending, not as a delivery strategy.

## Recommended strategy

Create a **backup branch plus clean reconciliation branch from `origin/main`**,
then apply only owner-approved commits in dependency order. Exclude
`ead2aa0` and `b1c198b` unless their mockup changes receive separate approval.
Treat the agent-assets metadata within `16090de` and the GitHub Actions workflow
in `ac12045` as explicit review gates.

## Commit disposition

### Preserve locally

Preserve all 11 commits by first creating a backup pointer at the current local
`main` tip. This guarantees no valid local work is discarded.

### Publish after review

- Recovery set: `eb89319`, `6039452`, `9e5bf5a`, `bcb48c7`
- TheMealDB implementation/report set: `16090de`, `fb87239`
- Signing evidence set: `dde30e5`, `0645ce8`
- macOS signing rehearsal set: `ac12045`, only after GitHub Actions review

### Remain local unless separately approved

- `ead2aa0`
- `b1c198b`

### Require human review

- `16090de`: decide whether the generated agent-assets metadata belongs in the
  publishable reconciliation commit.
- `9e5bf5a`: startup/runtime lifecycle behavior.
- `bcb48c7`: operational log-field compatibility.
- `dde30e5`, `0645ce8`, `ac12045`: signing and GitHub Actions effects.
- `ead2aa0`, `b1c198b`: generated mockup changes.

## Exact proposed commands for the next stage

**Do not run these commands until the listed human reviews approve the commit
sets.** The commands intentionally create new branches and cherry-pick selected
commits; none were executed during this audit.

```bash
# Reconfirm the fetched base and preserve every local-only commit.
git fetch origin --prune --no-tags
git switch main
git status --short
git branch backup/main-before-curated-reconciliation main

# Start a reviewable, clean publication candidate.
git switch -c reconciliation/curated-calora-publish origin/main

# Apply approved recovery work in dependency order.
git cherry-pick eb893191a34a4d2cdb3f40bdbccb8315a84fc338
git cherry-pick 6039452f4fb1302f631be113264aec490c1d1012
git cherry-pick 9e5bf5abe99ac792f9721754cd47249a4087f9e1
git cherry-pick bcb48c720df0252c1ba54365f927b4573df26dc4

# Apply the reviewed TheMealDB change as an atomic code/contract set.
# Use --no-commit so the generated agent-assets metadata can be excluded if the
# human reviewer does not approve it.
git cherry-pick --no-commit 16090def64aa468411d49891d7316372e1a48b8e
git restore --source=HEAD --staged --worktree .agents/agent_assets_metadata.toml
git commit -m "feat(recipes): upgrade TheMealDB integration to Premium V2"
git cherry-pick fb872395b03bc6003c2b678cd656570734cc2cd9

# Run only approved signing work, in dependency order.
git cherry-pick dde30e5e0aea073613e62535175b0f9c6d4e7cf9
git cherry-pick 0645ce859291b267051f0a497550faac70ede7e4
git cherry-pick ac12045ac585316bd5abbf143dbcf6e31bfaeb94

# Review before any publish decision; do not push in this stage.
git diff --check origin/main...HEAD
git log --oneline origin/main..HEAD
git diff --name-status origin/main...HEAD
```

If a reviewed set is intentionally excluded, stop before its first
cherry-pick and document that owner decision. Never use the current local
`main` as the direct push source unless every one of its 11 commits has
explicit publication approval.

## Final verdict

**BLOCKED.** The graph is non-divergent and secret review found no configured
TheMealDB secret in tracked history, but direct publication remains unsafe until
the mockup commits, generated agent metadata, and signing/GitHub Actions changes
receive explicit human disposition. The clean reconciliation-branch strategy is
the recommended next stage; it has not been executed.