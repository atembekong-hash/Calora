# Calora — Final P1-001 Release Tree Reconciliation Report

**Verification date:** 2026-09-08  
**Scope:** Forensic reconciliation of the production release-tree attestation mismatch.  
**Restrictions honored:** No source changes, application behavior changes, build, Expo/EAS operation, native build, GitHub push, republish, DNS change, Supabase change, RevenueCat change, or history rewrite.

## 1. Executive summary

The apparent P1-001 mismatch was caused by comparing production against an earlier runtime-only tree (`c0a56572…`) after a documentation/report commit had legitimately been included in the deployed release.

Exact Git comparison proves that the live commit `6f8c779…` differs from the earlier approved runtime commit `d8ecc375…` by exactly one path:

`14_CALORA_P1_RELEASE_BLOCKERS_REMEDIATION_REPORT.md`

That path is documentation/report-only. There are no differences in API runtime source, runtime configuration, dependencies, lockfiles, build configuration, deployment configuration, startup commands, or environment contracts.

The live release is therefore the legitimate canonical release identity:

- canonical commit: `6f8c77997d9bb4f1885aed8c02fc953c3dcf401d`
- canonical source tree: `42cb466b2e75b0421af9a5a0a9259f2c4b17dbd3`
- release ID: `calora-api-6f8c77997d9b-20260908230935659`

The public-release verifier passes against `42cb466…`, production is healthy, the referral remediation is live, and all deterministic gates pass.

## 2. Original mismatch

The previous verification expected the runtime-only release:

- commit: `d8ecc375f75be4d6ed1e6913afbbbfa099cdd064`
- tree: `c0a5657214d230ee559da6e14ee0b6cf1e99016a`

Production reported:

- commit: `6f8c77997d9bb4f1885aed8c02fc953c3dcf401d`
- tree: `42cb466b2e75b0421af9a5a0a9259f2c4b17dbd3`

The production release was healthy and already contained the corrected 30-day referral implementation. The outstanding question was whether the tree difference represented unauthorized runtime divergence or legitimate release documentation.

## 3. Exact live commit provenance

Git inspection established:

- commit: `6f8c77997d9bb4f1885aed8c02fc953c3dcf401d`
- parent: `df44068c869c24c3c58014a9f04fa63bf109c23d`
- author: `vvault07 <vvault07@users.noreply.github.com>`
- author time: `2026-09-08T23:05:00Z`
- committer: `vvault07 <vvault07@users.noreply.github.com>`
- committer time: `2026-09-08T23:05:00Z`
- subject: `Finalize P1 remediation release identity`
- complete tree: `42cb466b2e75b0421af9a5a0a9259f2c4b17dbd3`

Relationship to earlier commits:

- `d8ecc375…` is an ancestor of `6f8c779…`
- `df44068…` is the direct parent of `6f8c779…`
- `6f8c779…` is the exact current `origin/release/calora-onboarding-and-plus` HEAD
- the live commit is contained by the release branch, its remote-tracking branch, and the local evidence branches observed during verification

The ancestry is linear for the runtime remediation:

`d8ecc375…` → `df44068…` → `6f8c779…`

## 4. Complete changed-path inventory

### `d8ecc375…` versus `6f8c779…`

```text
A 14_CALORA_P1_RELEASE_BLOCKERS_REMEDIATION_REPORT.md
```

### `c0a56572…` versus `42cb466…`

```text
A 14_CALORA_P1_RELEASE_BLOCKERS_REMEDIATION_REPORT.md
```

There are no other changed paths in either comparison.

### Classification

| Path | Classification | Runtime impact |
|---|---|---|
| `14_CALORA_P1_RELEASE_BLOCKERS_REMEDIATION_REPORT.md` | documentation/report-only | none |

No path is classified as runtime source, runtime configuration, dependency/lockfile, build/deployment configuration, test-only, generated/non-runtime, or unexpected.

## 5. Runtime-equivalence determination

The following consumed runtime/build/deployment path set was compared between `d8ecc375…` and `6f8c779…`:

- `artifacts/api-server/src/**`
- `artifacts/api-server/package.json`
- `artifacts/api-server/tsconfig*`
- root `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `.replit`
- `artifacts/api-server/.replit-artifact/**`

Result:

```text
runtime_source_config_dependency_build_diff=none
```

The complete changed-path inventory independently proves that the only tree difference is the report file. Therefore:

**Does live tree `42cb466…` contain runtime source/config differences relative to the approved referral-remediation source tree? NO.**

There are no executable production behavior differences, dependency changes, startup changes, deployment changes, or environment-contract changes between the two release identities.

## 6. Referral remediation verification

At live commit `6f8c779…`:

- `REFERRAL_REWARD_DAYS = 30`
- `getReferralRewardCopy()` exists
- HTML offer derives from the shared duration
- OG description derives from the shared duration
- Twitter description derives from the shared duration
- SVG/OG-image offer derives from the shared duration
- runtime stale-copy scan found no `free week`, `one week`, or `1 week` wording

Observed live production behavior agrees:

- `/invite/test` contains `30 days`
- HTML/OG offer: `Get 30 days of Calora Pro free`
- Twitter offer: `Get 30 days of Pro free`
- stale week-based wording is absent

## 7. GitHub branch and remote consistency

After fetching `origin`:

- branch: `release/calora-onboarding-and-plus`
- local HEAD: `87a1f81991105311d0b24ee5a26497c9c85c9e00`
- local tree: `f35274108b5ac41d8756d3017eb7b1691634ac61`
- remote HEAD: `6f8c77997d9bb4f1885aed8c02fc953c3dcf401d`
- remote tree: `42cb466b2e75b0421af9a5a0a9259f2c4b17dbd3`
- merge-base: `6f8c77997d9bb4f1885aed8c02fc953c3dcf401d`
- local ahead: `3`
- local behind: `0`
- divergence: none

The live commit is exactly the remote release-branch HEAD. The local-only tracked paths are evidence/documentation only:

| Local-only path | Classification |
|---|---|
| `.agents/memory/replit-production-state.md` | documentation/agent-memory only |
| `14_CALORA_P1_RELEASE_BLOCKERS_REMEDIATION_REPORT.md` | documentation/report-only update |
| `attached_assets/Pasted-CALORA-FINAL-POST-REPUBLISH-P1-CLOSURE-VERIFICATION-CON_1788909357129.txt` | QA/evidence-only |
| `attached_assets/Pasted-CALORA-FINAL-P1-RELEASE-TREE-RECONCILIATION-AND-CLO_1788910045978.txt` | QA/evidence-only |

No unpushed runtime source or configuration was found. No push was performed in this mission.

## 8. Deterministic regression gates

### Complete API suite

- test files: **36 passed, 1 skipped**
- tests: **439 passed, 4 skipped**
- total tests reported: **443**
- exit: **0**

The four skipped tests are the pre-existing pending Coach rollback integration tests.

### API typecheck

- command: `pnpm --filter @workspace/api-server run typecheck`
- result: **passed**
- exit: **0**

### Focused referral, Universal/App Link, auth/callback, and CORS/security gates

- `src/__tests__/referral.test.ts`: **9 passed**
- `src/__tests__/universal-links.test.ts`: **40 passed**
- `src/__tests__/cors-policy.test.ts`: **6 passed**
- combined: **3 files, 55 tests passed**

The Universal Link suite includes auth/callback and Apple/Android association route coverage. The CORS suite covers branded-origin allow behavior and rejected origins.

### Formatting

- `git diff --check`: **passed**

## 9. Live production verification

Deployment metadata:

- deployed: **yes**
- successful build: **yes**
- public: **yes**
- deployment type: **autoscale**
- canonical URL: **https://mycaloraapp.com**

Live probes:

- `/api/healthz`: **200**, `{"status":"ok"}`
- `/api/version`: **200**, reports commit `6f8c779…`, tree `42cb466…`, and release ID `calora-api-6f8c77997d9b-20260908230935659`
- `/invite/test`: **200**, 30-day copy present, stale week copy absent
- `/auth/callback`: **200**, `no-store`, `noindex`, callback query values not echoed
- `/.well-known/apple-app-site-association`: **200**, valid JSON, invite and auth components present
- `/.well-known/assetlinks.json`: **200**, valid JSON, package `com.etiendem.caloraapp`, delegate relation, and fingerprint entry present

The complete public route matrix also remained green: requested HTML, JSON, text, XML, manifest, and image routes returned 200 with zero redirects and expected content types.

## 10. Canonical release commit/tree determination

The previous `c0a56572…` tree was the runtime-only tree before the required report was included in the release history. The live `42cb466…` tree is the exact descendant tree that was actually deployed.

Forensic evidence proves:

1. `6f8c779…` is a legitimate descendant of the referral remediation.
2. The only difference from the prior runtime tree is `14_CALORA_P1_RELEASE_BLOCKERS_REMEDIATION_REPORT.md`.
3. That difference is documentation/report-only.
4. No runtime/config/dependency/build/startup behavior changed.
5. The live referral remediation is present and correct.
6. The remote release branch points exactly to `6f8c779…`.

The canonical deployed release identity is therefore formally established as:

- commit: `6f8c77997d9bb4f1885aed8c02fc953c3dcf401d`
- tree: `42cb466b2e75b0421af9a5a0a9259f2c4b17dbd3`

## 11. Public-release verifier result

The exact verifier was run against the reconciled canonical expected tree:

```text
PUBLIC_VERIFY_EXPECTED_SOURCE_TREE=42cb466b2e75b0421af9a5a0a9259f2c4b17dbd3 pnpm --filter @workspace/api-server run verify:public-release
```

Result: **PASS, exit 0**

Verified by the command:

- live source tree matches the reconciled expected tree
- Apple association CDN evidence passed
- Google Digital Asset Links evidence passed
- API health passed
- canonical legal/support pages passed
- canonical URLs and support channel passed

Final verifier line:

```text
Release verification: PASS — calora-api-6f8c77997d9b-20260908230935659 at https://mycaloraapp.com from source tree 42cb466b2e75b0421af9a5a0a9259f2c4b17dbd3.
```

## 12. P1-001 closure decision

P1-001 is **CLOSED** because every required condition is satisfied:

- exact Git provenance established;
- complete changed-path inventory produced;
- every difference classified;
- no unauthorized runtime/config/dependency/build difference;
- referral remediation present;
- GitHub branch relationship coherent;
- deterministic regression gates passed;
- production healthy;
- live production reports the reconciled canonical tree;
- public-release verifier passes against that canonical tree.

## 13. P1-002 confirmation

P1-002 remains **CLOSED**:

- live HTML, OG, Twitter, and SVG source use 30 days;
- live output contains no stale week-based wording;
- backend reward constant remains 30 days;
- focused deterministic referral tests pass.

## 14. Remaining release blockers

No confirmed P1 release blocker remains after canonical-tree reconciliation.

P2 findings from prior reports remain outside this mission and were not changed.

## 15. Owner-device tests still required

The following owner evidence remains required and is not claimed here:

- physical iOS Universal Link launch and auth callback handoff;
- physical Android App Link launch and auth callback handoff;
- device-level invite/deep-link behavior;
- any final installed-release-candidate acceptance checks assigned to the owner.

## 16. Exact next action

Owner must perform the required physical-device revalidation against the now-canonical release. No further source, GitHub, deployment, DNS, Expo/EAS, Supabase, or RevenueCat action is required for the P1 reconciliation itself.

## 17. Final verdict

**P1 RELEASE BLOCKERS FULLY CLOSED — OWNER DEVICE REVALIDATION REQUIRED**