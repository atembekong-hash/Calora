# Calora — Step 55A iOS Build Provenance Environment Remediation Report

**Date:** 2026-09-17  
**Scope:** Git/EAS provenance remediation rehearsal only  
**Builds created in Step 55A:** none  
**Final verdict:** **PROVENANCE DRY RUN FAILED — DO NOT BUILD**

## 1. Executive summary

Step 55A successfully established a durable standalone checkout whose Git
identity is independent of the outer Replit workspace:

- **Standalone path:** `/tmp/calora-step55a-standalone`
- **Git root:** `/tmp/calora-step55a-standalone`
- **HEAD:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Tree:** `0b4185eac78f8b42097fce0334691487df740e53`
- **`origin/main`:** the same SHA
- **Working tree:** clean
- **Git metadata:** standalone `.git` directory

The checkout remained unchanged after safe outer-repository worktree
inspection. This resolves the Step 55 Git-root failure mechanism.

The no-build rehearsal did not pass the complete future-build assertion,
because fresh live evidence now reports EAS floor `6`, Apple floor `5`, and
therefore `NEXT_SAFE_BUILD=7`, while canonical `app.json` remains at build
number `6`. Step 55A explicitly forbids changing `app.json`. The assertion
correctly fails closed rather than allowing a future build with an
unselected number.

No EAS build, native build, TestFlight submission, deployment, database
operation, or product-source change was made in Step 55A.

## 2. Step 55 failure identity

Step 55 created exactly one failed/unsubmittable EAS build:

- **EAS Build ID:** `fffc4d8a-5e1b-48f0-98c9-e2949136cf04`
- **Build number:** `6`
- **Status:** `FINISHED BUT PROVENANCE FAILED`
- **EAS-recorded source SHA:** `b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f`
- **Intended canonical candidate SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Disposition:** **DO NOT SUBMIT TO TESTFLIGHT**

Step 55A does not attempt to make that build acceptable and does not alter or
delete its EAS record.

## 3. Failed EAS Build ID quarantine

Build `fffc4d8a-5e1b-48f0-98c9-e2949136cf04` remains quarantined from
TestFlight submission. No submit command or App Store upload was run.

## 4. Expected canonical SHA/tree

The expected canonical `origin/main` state for Step 55A is:

- **SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Tree:** `0b4185eac78f8b42097fce0334691487df740e53`
- **Subject:** `Prepare iOS build 6 release candidate`

The remote still resolves to that exact SHA/tree.

## 5. Outer Replit Git root

The outer Replit workspace Git root is:

```text
/home/runner/workspace
```

The path is a regular workspace repository, not the standalone remediation
checkout.

## 6. Outer Replit HEAD/tree/subject

At the time of this remediation report, the outer workspace resolves to:

- **HEAD:** `f72ccac03a87b280325599da23110daf64786b1e`
- **Tree:** `1e8e6e3fd6cc8c812bdaf1e1d82674682c7f8d1e`
- **Subject:** `Add iOS build provenance documentation`

The outer workspace changed through local documentation/checkpoint commits
during the remediation session while `origin/main` remained at the expected
canonical candidate. This confirms that the outer workspace is not a stable
source identity for a release build.

## 7. Step 55 temporary worktree architecture

Step 55 used a linked worktree at:

```text
/home/runner/workspace/.step55-release
```

Before pruning, that path was a detached linked worktree at:

- **HEAD:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Tree:** `0b4185eac78f8b42097fce0334691487df740e53`

Its `.git` was a worktree pointer file into the outer repository's
`.git/worktrees` metadata, rather than a durable standalone `.git` directory.

## 8. Proven root cause

The failure is proven by the following observations:

1. The outer workspace contains commit
   `b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f`.
2. That commit is on the outer local `main`/gitsafe references and has:
   - parent `77a5a0febc8c3d1e75aa87b6813447512c9726ff`
   - tree `24d4eb57a3b27597fe449091293207ccd49b5ce6`
   - subject `Add CALORA step 55 controlled release candidate build notes`
3. EAS recorded exactly that SHA and subject for the failed build.
4. After the linked worktree metadata became unavailable, the candidate path
   had no `.git` file or `.git` directory.
5. `git -C /home/runner/workspace/.step55-release rev-parse --show-toplevel`
   then resolved `/home/runner/workspace`, and its HEAD/tree resolved to the
   outer workspace instead of the intended candidate.
6. `git worktree list --porcelain` reported:

   ```text
   worktree /home/runner/workspace/.step55-release
   HEAD 5f69c31e4816abcfa5fff69389e4699fd4f1428f
   detached
   prunable gitdir file points to non-existent location
   ```

7. `git worktree prune --dry-run` identified the stale
   `worktrees/-step55-release` metadata for removal.

The evidence establishes that the candidate files remained present while the
linked-worktree Git pointer became unusable. Git then searched upward and
resolved the outer workspace, which is why EAS naturally recorded `b1f5a3e`
instead of `5f69c31`.

## 9. Standalone clone architecture

A fresh clone was created from the configured `origin` URL outside the
checkpointed workspace:

```text
/tmp/calora-step55a-standalone
```

The clone has its own durable `.git` directory. It does not depend on the
outer repository's `.git/worktrees` metadata.

## 10. Standalone clone path

```text
/tmp/calora-step55a-standalone
```

## 11. Standalone Git root

```text
/tmp/calora-step55a-standalone
```

The standalone checkout's Git root is itself, not `/home/runner/workspace`.

## 12. Standalone HEAD/tree

- **HEAD:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Tree:** `0b4185eac78f8b42097fce0334691487df740e53`
- **Subject:** `Prepare iOS build 6 release candidate`

## 13. Standalone origin/main

Inside the standalone clone:

```text
origin/main = 5f69c31e4816abcfa5fff69389e4699fd4f1428f
```

Therefore:

```text
HEAD == origin/main
```

## 14. Standalone clean-status proof

Inside the standalone clone:

```text
git status --porcelain
```

returned no output. The clone remained clean after dependency installation,
outer worktree inspection, and the read-only EAS history query.

## 15. Outer-repository isolation test

While the standalone clone remained present, the following safe outer
operations were performed:

```text
git worktree list --porcelain
git worktree prune --dry-run
```

The outer repository reported stale linked-worktree metadata, but the
standalone clone remained independently valid. No actual prune or deletion of
the standalone clone was performed.

## 16. Post-isolation HEAD/tree proof

After the outer operations, the standalone clone still resolved:

- **Git root:** `/tmp/calora-step55a-standalone`
- **HEAD:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Tree:** `0b4185eac78f8b42097fce0334691487df740e53`
- **`origin/main`:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Clean status:** yes

## 17. EAS working-directory trace

The intended future EAS project directory is:

```text
/tmp/calora-step55a-standalone/artifacts/calora
```

From that directory, the repository context resolves to:

- **Process working directory:** `/tmp/calora-step55a-standalone`
  project root for Git
- **Git top-level directory:** `/tmp/calora-step55a-standalone`
- **HEAD:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Tree:** `0b4185eac78f8b42097fce0334691487df740e53`
- **Commit subject:** `Prepare iOS build 6 release candidate`

The repository's read-only EAS history query ran successfully from this
standalone project root after the exact lockfile dependencies were installed.
No repository wrapper changed the working directory. No EAS build command was
run.

## 18. Expo project verification

The standalone checkout resolved:

- **Expo owner:** `vvault07`
- **Expo slug:** `calora`
- **Expo project ID:** `1f202325-5b9a-4260-978f-abbd3252b9ee`
- **Bundle identifier:** `com.etiendem.caloraapp`
- **Marketing version:** `1.0.0`

## 19. Production profile verification

The standalone checkout resolved:

- **Profile:** `production`
- **Environment:** `production`
- **`cli.appVersionSource`:** `local`
- **`build.production.autoIncrement`:** `false`
- **Production API endpoint:** present
- **Supabase configuration:** present
- **RevenueCat iOS public configuration:** present
- **Localhost values:** none
- **Replit development preview URLs:** none
- **Mock/development provider flags:** none

The production submission profile still identifies App Store Connect app
`6800321660`, Apple team `B5344GJRMT`, and bundle identifier
`com.etiendem.caloraapp`.

## 20. Current canonical build number

The canonical `app.json` was not changed in Step 55A:

```text
expo.ios.buildNumber = 6
```

No build-number commit, product change, or configuration change was made in
this step.

## 21. Current Apple build-number floor

Fresh App Store Connect history evidence reports:

```text
Apple consumed floor = 5
```

## 22. Current EAS build-number floor

Fresh EAS iOS history evidence reports:

```text
EAS consumed floor = 6
```

The Step 55 finished build `fffc4d8a-5e1b-48f0-98c9-e2949136cf04` is included
in the current EAS history floor even though it remains quarantined from
TestFlight.

## 23. Informational LIVE_FLOOR

```text
LIVE_FLOOR = max(Apple 5, EAS 6)
            = 6
```

## 24. Informational NEXT_SAFE_BUILD

```text
NEXT_SAFE_BUILD = LIVE_FLOOR + 1
                 = 7
```

This value is informational for the next controlled build step only. Step 55A
did not write it to `app.json`.

## 25. Release gate verification

The expected canonical SHA still has a successful exact-SHA release gate:

- **Head SHA:** `5f69c31e4816abcfa5fff69389e4699fd4f1428f`
- **Check-run:** `105115209229`
- **Check:** `Run release validation suite`
- **Status:** `completed`
- **Conclusion:** `success`

## 26. Provenance dry-run assertion

A temporary assertion script was created outside product source at:

```text
/tmp/calora-step55a-provenance-assertion.js
```

It fails unless all of the following are true:

- Git top-level directory equals the expected standalone clone
- `HEAD` equals the expected canonical SHA
- `HEAD` equals `origin/main`
- working tree is clean
- `app.json` build number equals the explicitly selected build number

Results:

### Current frozen source identity

With explicit expected build number `6`:

```text
PASS
```

The Git root, SHA, tree, `origin/main`, clean status, and current app build
number all matched.

### Fresh next-build selection

With fresh informational `NEXT_SAFE_BUILD=7`:

```text
FAIL CLOSED
app build number 6 does not equal explicitly selected 7
```

This failure is required. Step 55A is not authorized to change canonical
`app.json`, so it must not claim readiness for build `7`.

## 27. Simulated pre-build sequence

Completed without invoking EAS build:

1. Entered standalone clone.
2. Fetched `origin`.
3. Verified expected canonical SHA.
4. Verified expected tree.
5. Verified clean status.
6. Verified exact-SHA release gate.
7. Queried Apple floor.
8. Queried EAS floor.
9. Calculated `NEXT_SAFE_BUILD=7`.
10. Verified canonical configured build number remains `6`.
11. Verified standalone Git root.
12. Verified Expo project identity.
13. Verified production EAS profile.
14. Ran the provenance assertion.
15. Stopped before any EAS build.

## 28. Confirmation no build occurred

No `eas build`, EAS workflow build, iOS native build, or Android build was
created in Step 55A.

The only EAS build referenced in this report is the quarantined Step 55 build
created before this remediation step.

## 29. Confirmation failed build 6 was not submitted

Build `fffc4d8a-5e1b-48f0-98c9-e2949136cf04` remains unsubmitted. No
TestFlight, App Store, or EAS submission command was run.

## 30. Confirmation no Android build

No Android build was created.

## 31. Confirmation no API/database deployment

No API deployment, Replit publish, database operation, migration, schema
change, or seed change was performed.

Installing the lockfile dependencies inside `/tmp/calora-step55a-standalone`
was isolated rehearsal setup only.

## 32. Remaining blockers

The provenance environment itself is now isolated and verified, but the
complete future-build assertion is blocked by build-number state:

- Fresh EAS floor: `6`
- Fresh Apple floor: `5`
- Fresh `NEXT_SAFE_BUILD`: `7`
- Canonical configured build: `6`
- Step 55A authorization: do not modify `app.json`

The next controlled build step must make the separately authorized,
build-number-only change to `7`, obtain the exact-SHA release gate, and then
run the provenance assertion from a standalone clone before creating one build.

## 33. Exact recommendation for next step

Do not create a build from Step 55A. Do not change `app.json` in Step 55A.
Keep EAS Build ID `fffc4d8a-5e1b-48f0-98c9-e2949136cf04` quarantined and
unsubmitted.

For a future owner-authorized rebuild:

1. Start from the durable standalone clone architecture proven here.
2. Make only the authorized iOS build-number change from `6` to `7`.
3. Push and verify the exact new release-validation check.
4. Re-run the live Apple/EAS floor check.
5. Run the fail-closed provenance assertion with build `7`.
6. Stop for owner review before any TestFlight action.

This report does not authorize that future build.

## Mandatory provenance table

| Context | Git root | HEAD SHA | Tree SHA | Commit subject | Clean? | Result |
|---|---|---|---|---|---|---|
| Canonical `origin/main` | remote canonical repository | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | `0b4185eac78f8b42097fce0334691487df740e53` | `Prepare iOS build 6 release candidate` | n/a | PASS |
| Outer Replit workspace | `/home/runner/workspace` | `f72ccac03a87b280325599da23110daf64786b1e` | `1e8e6e3fd6cc8c812bdaf1e1d82674682c7f8d1e` | `Add iOS build provenance documentation` | not a release freeze | DO NOT BUILD |
| Failed Step 55 EAS metadata | outer workspace resolved by EAS | `b1f5a3e30e41c468ab5c0e4123e4ddb7b3cd436f` | `24d4eb57a3b27597fe449091293207ccd49b5ce6` | `Add CALORA step 55 controlled release candidate build notes` | not canonical | FAIL |
| New standalone isolated clone | `/tmp/calora-step55a-standalone` | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | `0b4185eac78f8b42097fce0334691487df740e53` | `Prepare iOS build 6 release candidate` | yes | PASS |
| Post-isolation-test standalone clone | `/tmp/calora-step55a-standalone` | `5f69c31e4816abcfa5fff69389e4699fd4f1428f` | `0b4185eac78f8b42097fce0334691487df740e53` | `Prepare iOS build 6 release candidate` | yes | PASS |

## Mandatory build-number table

| Source | Current value | Evidence |
|---|---:|---|
| Apple App Store Connect | `5` | Fresh independent App Store Connect history query |
| EAS production iOS history | `6` | Fresh independent EAS iOS history query |
| Canonical `app.json` | `6` | Exact canonical SHA `5f69c31` |

```text
LIVE_FLOOR = 6
NEXT_SAFE_BUILD = 7
```

The build number was not modified in Step 55A.

## Final questions

**A. What caused Step 55's Git provenance mismatch?**  
A linked worktree nested inside the checkpointed outer workspace lost its
usable `.git` pointer/worktree metadata. Git then resolved the outer workspace
root, and EAS recorded the outer local commit `b1f5a3e`.

**B. Is the failed EAS Build ID quarantined from TestFlight submission?**  
Yes.

**C. Does the new isolated checkout have its own durable Git metadata?**  
Yes. It has its own `.git` directory.

**D. Does its HEAD equal canonical `origin/main`?**  
Yes: `5f69c31e4816abcfa5fff69389e4699fd4f1428f`.

**E. Does its tree equal canonical `origin/main`?**  
Yes: `0b4185eac78f8b42097fce0334691487df740e53`.

**F. Is it clean?**  
Yes.

**G. Can outer worktree pruning alter its Git identity?**  
No. The standalone clone remained unchanged after outer worktree inspection
and prune dry-run operations.

**H. From the intended future EAS working directory, what Git SHA is naturally
resolved?**  
`5f69c31e4816abcfa5fff69389e4699fd4f1428f`.

**I. What is the current Apple build floor?**  
`5`.

**J. What is the current EAS build floor?**  
`6`.

**K. What is `NEXT_SAFE_BUILD` based on fresh evidence?**  
`7`.

**L. Was canonical `app.json` left unchanged in Step 55A?**  
Yes. It remains at build number `6`.

**M. Does the canonical SHA still have a successful release gate?**  
Yes. Check-run `105115209229` is completed successfully.

**N. Was any EAS/native build created in Step 55A?**  
No.

**O. Was build 6 submitted to TestFlight?**  
No.

**P. Was Android untouched?**  
Yes.

**Q. Were API/database/deployment operations avoided?**  
Yes.

**R. Is the environment now safe for one new provenance-controlled iOS build?**  
The Git/EAS provenance environment is verified safe, but the complete
fail-closed rehearsal is not ready for a build because the canonical build
number is still `6` while fresh evidence selects `7`. Do not build from
Step 55A.

## Final verdict

**PROVENANCE DRY RUN FAILED — DO NOT BUILD**

Stop after Step 55A. Do not create a new EAS build, do not submit to
TestFlight, do not build Android, and do not deploy.