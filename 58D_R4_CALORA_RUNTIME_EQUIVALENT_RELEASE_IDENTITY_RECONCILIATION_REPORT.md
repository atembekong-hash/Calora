# STEP 58D-R4 — CALORA LIVE RUNTIME-EQUIVALENT RELEASE IDENTITY RECONCILIATION

**Verification date:** 2026-09-17  
**Scope:** Read-only decision gate.  
**Report location:** `/tmp/calora-step58d-r4-evidence-20260917/58D_R4_CALORA_RUNTIME_EQUIVALENT_RELEASE_IDENTITY_RECONCILIATION_REPORT.md`  
**Non-actions:** No deployment, republish, rollback, Git mutation, source/configuration edit, database operation, mobile build, TestFlight/App Store Connect operation, Metro change, Coach activation, provider/cohort/consent/nonce/rollout operation, report attachment, or workspace report copy was performed.

## Decision summary

The approved R1 source and the live production API are runtime-equivalent under a deterministic runtime-input digest. The live commit is a direct child of the approved commit, and its only changed paths are the R1 report attachment and Replit asset metadata. No API runtime, build, dependency, database, mobile, or release-control implementation path changed.

The literal `/api/version.gitCommit` differs because the API build embeds the full Git `HEAD` and full source tree at build time. Replit's publishing/checkpoint behavior can create a metadata/report descendant without changing the API build inputs.

**Another ordinary Republish is not required to close the Step 57 production runtime-drift issue.** Re-Publishing would risk creating another metadata/checkpoint identity and is not a remedy for this runtime-equivalent difference.

## 1. Frozen identities

### A. Approved R1 identity

| Field | Value |
|---|---|
| Commit | `5c2edf1b28c00ba86b25494d860e9b0bc69debca` |
| Tree | `8eac19f420fba0640dd96188cf0be60770b3ced5` |
| API/source digest | `2d326de3549745fbdfb3f9db90f1a57c39768ffe940ec4e670579a6199786a05` |
| Commit time | `2026-09-17T19:51:58Z` |
| Subject | `Reconcile canonical main with Build 7 and API release history` |

Relevant production-safe source controls at this identity:

- `.replit` production `COACH_FACT_CONTEXT_ENABLED = "false"`.
- `.replit` production `RELEASE_SENSITIVE_ACTIVATION_REQUESTED = "false"`.
- The reviewed sensitive-release commit value remains separately pinned as `5f69c31e4816abcfa5fff69389e4699fd4f1428f` and does not authorize activation by itself.
- API artifact production build environment sets `RELEASE_SENSITIVE_ACTIVATION_REQUESTED = "false"`.
- API artifact production runtime sets `COACH_FACT_CONTEXT_ENABLED = "false"`.

### B. Live production identity

Both public aliases returned the same response from `/api/version`:

```json
{
  "schemaVersion": "calora.release-attestation.v1",
  "gitCommit": "80e49abe39153d2b867fec14b393e7a7fdecaa7f",
  "sourceTree": "1a9d2adbe2a33d8c21677f1b0766fd38e13980ed",
  "sourceDigest": "570b6baadb9a77675ed671df2a56f7f3f4ed8a4be89782781626bec4ef62089f",
  "buildTimestamp": "2026-09-17T21:40:29.464Z",
  "releaseId": "calora-api-80e49abe3915-20260917214029464"
}
```

| Alias | HTTP | Identity result |
|---|---:|---|
| `https://calorie-coach-pie35449.replit.app/api/version` | 200 | Exact values above |
| `https://mycaloraapp.com/api/version` | 200 | Exact values above |

The live Git object used for all comparisons is the validated 40-character SHA `80e49abe39153d2b867fec14b393e7a7fdecaa7f`.

### C. Current workspace identity

| Field | Value |
|---|---|
| Branch | `main` |
| `HEAD` | `c77f360c30aaf861771895125fa03522a480f46b` |
| `HEAD` tree | `9d5ddc340a9265acb5a8823022cdb22924a35b43` |
| Git status | Clean |
| `origin/main` | `5c2edf1b28c00ba86b25494d860e9b0bc69debca` |
| `origin/main` tree | `8eac19f420fba0640dd96188cf0be60770b3ced5` |

No identity was changed during R4.

## 2. Ancestry proof

Read-only `git merge-base --is-ancestor` returned success:

```text
approved_is_ancestor_of_live=YES
```

The complete ancestry path between the approved and live identities contains exactly one intervening commit:

```text
80e49abe39153d2b867fec14b393e7a7fdecaa7f
 tree:   1a9d2adbe2a33d8c21677f1b0766fd38e13980ed
 parent: 5c2edf1b28c00ba86b25494d860e9b0bc69debca
 time:   2026-09-17T21:38:52Z
 subject: Add asset metadata and upload alignment report
```

Therefore:

- Approved R1 is a direct parent of the live source commit.
- There are no unreviewed implementation commits between the approved and live identities.
- The live identity is a known direct descendant, not an unrelated or fabricated object.

## 3. Complete path-level diff

The complete read-only diff between the approved and live commits is exactly:

```text
M .agents/agent_assets_metadata.toml
A attached_assets/58D_R1_CALORA_EXACT_REPLIT_PUBLISHING_SOURCE_ALIGNMENT_REPORT.md
```

Classification:

| Changed path | Classification | Runtime impact |
|---|---|---|
| `.agents/agent_assets_metadata.toml` | Replit metadata | None |
| `attached_assets/58D_R1_CALORA_EXACT_REPLIT_PUBLISHING_SOURCE_ALIGNMENT_REPORT.md` | Report and attachment | None |

Explicit protected-path checks all returned unchanged:

```text
UNCHANGED artifacts/api-server/src
UNCHANGED artifacts/api-server/package.json
UNCHANGED artifacts/api-server/build.mjs
UNCHANGED artifacts/api-server/.replit-artifact/artifact.toml
UNCHANGED lib/api-zod
UNCHANGED lib/api-client-react
UNCHANGED lib/api-spec
UNCHANGED shared
UNCHANGED package.json
UNCHANGED pnpm-lock.yaml
UNCHANGED pnpm-workspace.yaml
UNCHANGED .replit
UNCHANGED artifacts/calora
UNCHANGED scripts/verify-api-release.mjs
UNCHANGED scripts/lib/provider-package-attestation.mjs
```

`shared/` is absent from this repository, so it has zero paths to differ.

The full diff also proves zero changes in:

- API environment/configuration source.
- Release-control source.
- Database schema, migration, seed, or backfill paths.
- Mobile runtime source.
- Dependency manifests and lockfile.
- Replit artifact configuration.

## 4. Deterministic runtime-equivalence computation

### Runtime source set

The same deterministic superset was hashed at both commits. It contains every tracked file under:

- `artifacts/api-server`
- `lib`
- `shared` if present
- root `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `.replit`
- root TypeScript configuration files

The selected set contains **253 files** and **1,624,372 content bytes** at each identity. The digest algorithm sorts paths and hashes, for every path, the UTF-8 path, a NUL separator, the byte length, another NUL separator, and the exact Git blob content. This avoids dependence on commit IDs, filesystem ordering, or file timestamps.

```text
APPROVED_RUNTIME_DIGEST=4f5838517c78937a7727f2ca467784134e6be6ff4b6ad992a997f88b3f66c401
LIVE_RUNTIME_DIGEST=4f5838517c78937a7727f2ca467784134e6be6ff4b6ad992a997f88b3f66c401
RUNTIME_DIGEST_MATCH=YES
```

This digest is an independently recomputed runtime-input digest. It is distinct from the current `/api/version.sourceDigest`, which intentionally hashes the complete Git commit/tree identity.

### Equivalence conclusion

- API runtime source inputs are byte-identical.
- API build inputs are byte-identical.
- Shared generated API schemas/specifications and client libraries are byte-identical.
- Dependency manifests and lockfile are byte-identical.
- Artifact deployment configuration is byte-identical.
- The only overall-tree difference is report/attachment metadata.

The overall Git identity differs because `/api/version` embeds the build-time Git `HEAD` and full tree identity, including non-runtime report and Replit metadata files.

## 5. Release-control safety

The approved and live Git identities contain the same release-control source and production configuration:

- `COACH_FACT_CONTEXT_ENABLED=false` in production runtime configuration.
- `RELEASE_SENSITIVE_ACTIVATION_REQUESTED=false` in production build configuration.
- Sensitive activation requires both the explicit production request and the exact reviewed commit match; the build gate is not opened by a runtime secret alone.
- The live public Coach Fact Context endpoint returned HTTP 404 with `Coach Fact Context is unavailable.` on both aliases.
- The live legacy Coach endpoint returned HTTP 404 with `Coach is unavailable.` on both aliases.

The raw production environment variables are not exposed through `/api/version`. The effective safety state is nevertheless verified: the source configuration is false at both identities, the compiled sensitive gate remains fail-closed, and the live endpoints are default-deny.

No evidence of any of the following was found or initiated:

- Coach provider activation.
- Fact Context provider activation.
- Cohort activation.
- Consent mutation.
- Nonce activation.
- Rollout enablement.

R4 issued only unauthenticated read-only probes. No provider, account, consent, nonce, cohort, or rollout write was sent.

## 6. Live functional verification

Both aliases were tested without fabricated production records or credentials.

| Check | `calorie-coach-pie35449.replit.app` | `mycaloraapp.com` |
|---|---|---|
| `/api/healthz` | HTTP 200, `{"status":"ok"}` | HTTP 200, `{"status":"ok"}` |
| `/api/version` release ID | `calora-api-80e49abe3915-20260917214029464` | Same |
| Recipe discovery `query=chicken&limit=1` | HTTP 200, TheMealDB response | HTTP 200, TheMealDB response |
| Nutrition validation | Macro fields were null or valid; no invalid or negative numeric values | Same |
| Planner without bearer token | HTTP 401 | HTTP 401 |
| Sync without bearer token | HTTP 401 | HTTP 401 |
| Capture approval with valid-format UUID, no bearer token | HTTP 401 | HTTP 401 |
| Account deletion without bearer token | HTTP 401 | HTTP 401 |
| Legacy Coach | HTTP 404 default-deny | HTTP 404 default-deny |
| Coach Fact Context | HTTP 404 default-deny | HTTP 404 default-deny |

No authenticated request, production write, test account, fabricated record, or provider activation was used.

## 7. Identity-model answers

### A. Is `80e49abe` a direct/known descendant of approved R1?

**YES.** It is a direct child of `5c2edf1b`; ancestry verification returned success.

### B. Is every difference non-runtime metadata/report material?

**YES.** The complete diff contains only `.agents/agent_assets_metadata.toml` and the attached R1 Markdown report.

### C. Is the API runtime input byte-equivalent?

**YES.** The independently computed 253-file runtime-input digest matches exactly:

`4f5838517c78937a7727f2ca467784134e6be6ff4b6ad992a997f88b3f66c401`

### D. Is live production functionally serving the reviewed API implementation?

**YES, for the reviewed API implementation.** The API source/build/dependency inputs are byte-identical, and the live health, recipe, authentication-boundary, and Coach/default-deny probes pass.

### E. Did the identity mismatch arise solely because `/api/version` embeds build-time Git `HEAD`?

**YES.** The differing `HEAD` is the asset/report-only child commit, and the API build reads `git rev-parse HEAD` and `HEAD^{tree}` at build time before compiling those values into the bundle. No API build input changed.

### F. Does Replit Publishing in this environment provide a supported mechanism to pin an older exact Git commit or immutable prebuilt artifact?

**NO.** Replit's documented Publishing behavior snapshots the current project files and dependencies. The available project deployment surface does not expose a verified exact-historical-commit or prebuilt-artifact upload/publish method that bypasses the current workspace snapshot.

### G. Would another ordinary Republish risk generating another metadata/checkpoint HEAD without changing runtime code?

**YES.** The observed `Published your App` deployment checkpoint records and the prior asset/report checkpoint demonstrate that Replit/Agent operations can create new Git identities while preserving the same tree or runtime inputs. Another ordinary Republish is not needed and would add identity risk without fixing runtime behavior.

## 8. Database and adjacent-state decision

No database migration is required to reconcile these identities:

- No database, migration, schema, seed, or backfill path changed in the complete Git diff.
- R4 performed no database operation.
- R4 performed no authenticated write or user-data mutation.
- Available deployment logs showed no migration, seed, or backfill event; the database startup note only stated that schema is managed by the Drizzle source and Replit lifecycle.

No mobile, TestFlight, Metro, Railway, Fitness, Coach, provider, cohort, consent, nonce, or rollout state was changed by R4.

## 9. Correct identity model

Literal full-repository Git-HEAD equality is too strict for this Replit Publishing workflow when non-runtime reports, attachments, and checkpoint metadata can be added to the active workspace before build.

The safe model is not to ignore identity. It is to bind production to both:

1. the full Git identity actually used for auditability; and
2. an independently computed runtime-source and final-artifact identity.

For this decision gate, the runtime-source digest matches exactly and every changed path is explicitly non-runtime. That proves the live deployment is runtime-equivalent without silently accepting arbitrary source drift.

A future implementation should retain the full Git identity while exposing/attesting a runtime-source digest and final deployment artifact digest. R4 does not change that control or weaken the existing gate.

## 10. Final integrity check

After all analysis:

- Workspace branch remained `main`.
- Workspace `HEAD` remained `c77f360c30aaf861771895125fa03522a480f46b`.
- Workspace tree remained `9d5ddc340a9265acb5a8823022cdb22924a35b43`.
- Workspace Git status remained clean.
- `origin/main` remained `5c2edf1b28c00ba86b25494d860e9b0bc69debca` with tree `8eac19f420fba0640dd96188cf0be60770b3ced5`.
- Production `/api/version` and health checks remained unchanged during analysis.
- No deployment, republish, rollback, database change, mobile build, TestFlight action, Metro change, or Coach activation occurred.
- The report was written only outside the workspace and was not attached or copied into the project.

## Final verdict

# PRODUCTION RUNTIME ALIGNMENT VERIFIED — GIT HEAD IDENTITY DIFFERENCE IS NON-RUNTIME METADATA

The live production runtime is cryptographically and semantically equivalent to the approved R1 API runtime input. The Step 57 production runtime-drift issue can be closed under this proven runtime-equivalence identity model. Another Republish is not required.
