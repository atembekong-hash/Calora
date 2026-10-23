# Production Recipe-Image QA #3 — Provisioning and Recovery Forensic Report

**Date:** 2026-10-22 UTC
**Scope:** GitHub Actions run `39891020186`, protected-main QA runner and workflow remediation, and non-production validation.
**Production actions in this investigation:** none. No secret values were read, no deployment was started, no production QA workflow was dispatched, no account was created or deleted, and no image was generated.

## 1. Executive verdict

| Area                                                                                       | Verdict                            | Evidence boundary                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release preflight in failed QA run                                                         | **PASS**                           | The failed run received HTTP `200` from the live version endpoint and matched protected main commit `24ec736d21425f1e7f330faad287d869aa705533` before any Auth provisioning attempt.                                                                                                                                                                                                        |
| Failed disposable-account provisioning diagnosis                                           | **REPAIRED**                       | The runner accepted a path-qualified Supabase URL and appended `/auth/v1/...` itself. A secret value ending in an Auth path could therefore form a doubled route and return the observed HTTP `404`. The new root-origin guard blocks that unsafe configuration before any credentialed request. The secret itself was intentionally not read, so the exact previous value is not asserted. |
| Failed recovery diagnosis                                                                  | **REPAIRED**                       | A write-ahead `provisioningMayHaveBeenCalled` marker caused recovery to attempt password sign-in even though provisioning returned no Auth ID. The new bounded recovery reconciles only a no-ID, pre-API deterministic alias and directly removes its exact returned Auth ID. All stateful or ambiguous cases remain fail-closed.                                                           |
| Recipe-image generation, preview, rejection, and account-saga cleanup in run `39891020186` | **NOT EXECUTED**                   | The normal report stopped at Auth Admin provisioning. No sign-in, media list, photo request, preview, review, rejection, or deletion-saga response was recorded.                                                                                                                                                                                                                            |
| Image/storage artifact caused by run `39891020186`                                         | **NO EVIDENCED WRITE PATH**        | The only runner path that can cause a storage upload follows a successful sign-in, an owner media-list request, and `POST /api/v1/recipes/photo`. None occurred. This is not a bucket-wide storage inventory.                                                                                                                                                                               |
| Disposable Auth identity from run `39891020186`                                            | **UNRESOLVED / RECOVERY REQUIRED** | An Admin create request was sent and returned `404`; a later password-grant recovery failed. Neither response proves whether Auth had a side effect. No customer enumeration or direct production credential use was performed.                                                                                                                                                             |

## 2. Failed-run evidence and chronology

The protected `Production recipe-image QA` workflow was manually dispatched from protected main and ran at commit `24ec736d21425f1e7f330faad287d869aa705533`.

1. The normal runner started at `2026-10-23T02:44:29.918Z`.
2. Its live release preflight returned HTTP `200` and matched the expected protected-main commit.
3. The first disposable owner provisioning call failed with sanitized code `qa_account_provision_failed` and HTTP `404`.
4. The normal runner completed at `2026-10-23T02:44:30.691Z` after 768 ms. Every authenticated media and cleanup field remained unset.
5. The always-run recovery attempted the deterministic owner password grant and emitted sanitized code `recovery_qa_sign_in_failed`.
6. The enforcement step failed at `2026-10-23T02:44:31.0558942Z` because recovery did not reach a terminal result.

The uploaded artifact contained only the sanitized primary and recovery JSON reports. It did not contain an account identifier, email address, token, password, storage path, signed locator, image data, or response body.

## 3. Request routing and cause analysis

### 3.1 Intended architecture

The production QA runner must use Supabase Auth Admin directly; Calora does not expose an account-provisioning endpoint. The intended provisioning call is:

```text
POST https://<project-ref>.supabase.co/auth/v1/admin/users
```

It uses the protected Environment’s server-side Auth Admin credential only in the trusted Node runner step. The normal QA-user session is then obtained through the password-grant endpoint. A successful stateful test identity is deleted only through Calora’s authenticated `DELETE /api/v1/account` saga, which owns application-data, storage-prefix, billing, Auth, and tombstone cleanup.

Relevant implementation references before this repair were `scripts/production-recipe-image-qa.mjs:324-365` (Admin creation), `:368-400` (password sign-in), and `:433-490` (account-saga deletion). The API only mounts the consumer account delete endpoint, not a provisioning route: `artifacts/api-server/src/routes/index.ts:20-40` and `artifacts/api-server/src/routes/account.ts:375-419`.

### 3.2 Confirmed source defect

Before this repair, `normalizeSupabaseUrl` allowed arbitrary pathnames and returned the entire configured URL. The runner later concatenated `/auth/v1/admin/users` or `/auth/v1/token?...`. Consequently, a value incorrectly entered as a full Auth endpoint—for example `https://<project-ref>.supabase.co/auth/v1`—would produce a doubled path such as:

```text
https://<project-ref>.supabase.co/auth/v1/auth/v1/admin/users
```

That route shape is consistent with the fast HTTP `404` in the sanitized run. The secret value was not read, so this report does not claim to have independently observed the previous value.

The repair now requires an HTTPS `*.supabase.co` **origin with pathname `/`** and returns `url.origin`. A path, query, fragment, embedded credentials, or non-Supabase hostname produces sanitized `invalid_supabase_target` before any request or recovery envelope can be created.

### 3.3 Recovery defect

The original runner correctly wrote `provisioningMayHaveBeenCalled=true` before the Admin POST, preserving ambiguity after transport loss or malformed response. However, when the POST returned `404` without an Auth ID, recovery immediately attempted a password grant for the deterministic address. That attempt cannot distinguish an absent account from an invalid password, disabled account, or transient Auth problem, so the recovery failure was safely conservative but not self-healing.

The repair keeps that conservative interpretation. When recovery has **no returned Auth ID** and the envelope proves the identity **never called a Calora API**, it performs one bounded reconciliation:

1. Attempt normal password sign-in for the exact deterministic alias.
2. If it fails, issue one direct Supabase Auth Admin create for that same alias.
3. Persist only the returned internal Auth ID in the local `0600` recovery envelope.
4. Directly delete that exact ID through Supabase Admin, which is permitted only before Calora API use.

A duplicate response, a failed reconciliation request, a known Auth ID with failed sign-in, any possible Calora API use, or any non-terminal deletion remains a failing recovery state. There is no list-users request, broad email search, generic Auth cleanup, direct bucket operation, or success-by-assumption path.

## 4. Cleanup and image-integrity assessment

The failed run did **not** reach `POST /api/v1/recipes/photo`. That call is the only QA-runner request capable of entering Calora’s generated-media path (`scripts/production-recipe-image-qa.mjs:704-723`). The server only creates a private storage object after the photo route has a user and image-provider output, then uploads through a signed PUT (`artifacts/api-server/src/lib/recipe-media-generation.ts:57-70`). Therefore this run provides no execution path or ledger evidence for a generated image, preview, storage object, rejection, or media orphan.

A potential Auth identity is different: the failed Admin create request cannot be proven side-effect-free from the redacted HTTP `404` alone. The correct safe closure is a later **owner-authorized recovery-only** execution for run ID `39891020186`, after correcting `CALORA_QA_SUPABASE_URL` to the root project origin. The recovery process acts only on its two deterministic `qa.invalid` aliases. It must pass before the uncertainty is marked resolved.

No automatic production cleanup was attempted during this forensic repair because the requested scope prohibited another production QA dispatch. No direct use of a service-role credential, broad Supabase user query, database query, or storage listing occurred.

## 5. Remediation delivered

| File                                               | Change                                                                                                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/production-recipe-image-qa.mjs`           | Requires a root-only Supabase origin before any request; centralizes exact live-release verification; requires recovery to attest the same protected release; adds bounded no-ID/pre-API reconciliation and exact-ID direct cleanup. |
| `.github/workflows/production-recipe-image-qa.yml` | Supplies `CALORA_QA_EXPECTED_COMMIT` to recovery so it cannot delete through a mismatched live API release. Privileged variables remain step-scoped to the two trusted Node steps.                                                   |
| `scripts/production-recipe-image-qa.test.mjs`      | Adds regressions for rejecting a path-qualified Supabase URL without network access, preserving the observed `404` no-ID envelope, bounded pre-API reconciliation and deletion, and stale-release recovery refusal.                  |
| `docs/operations/production-recipe-image-qa.md`    | Documents the exact root-origin secret format and strict recovery behavior.                                                                                                                                                          |

## 6. Validation results

All results below are controlled, local, non-production evidence.

| Check                                                    | Result                                                                                                                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA runner lifecycle/security tests, pass 1               | 15 passed, 0 failed                                                                                                                                                                            |
| QA runner lifecycle/security tests, pass 2               | 15 passed, 0 failed                                                                                                                                                                            |
| QA runner lifecycle/security tests, pass 3               | 15 passed, 0 failed                                                                                                                                                                            |
| Complete scripts workspace regression                    | 119 passed, 0 failed                                                                                                                                                                           |
| Scripts TypeScript check                                 | passed                                                                                                                                                                                         |
| Shared-library TypeScript build                          | passed                                                                                                                                                                                         |
| API TypeScript check with inert non-production variables | passed                                                                                                                                                                                         |
| Focused recipe-generation API suite with inert variables | 24 passed, 0 failed                                                                                                                                                                            |
| Workflow static security check                           | passed: protected-main-only job, no pull-request trigger, no job-level secret scope, two service-role secret references only, three expected-commit bindings, and no cleanup envelope artifact |
| Formatting and `git diff --check`                        | passed                                                                                                                                                                                         |

The Supabase documentation confirms that Auth Admin create-user methods require a secret key and must run on a trusted server; it also confirms that `email_confirm: true` is the appropriate intentional confirmed-user setting for this disposable QA flow. The GitHub protected workflow is the trusted server-side execution boundary; no browser or pull-request job receives the service credential.

## 7. Delivery and validation status

The remediation was delivered through protected pull request [#210](https://github.com/atembekong-hash/Calora/pull/210) and squash-merged to protected main as `2f203f2639c234d53ed31f69901c9d0dab0b965c` at `2026-10-23T03:37:22Z`.

The post-merge `Release validation` workflow run `39895994803` completed successfully for that exact SHA. Its `Run release validation suite` and `Attest release validation gate` jobs both passed. The validated suite included repository typechecking, complete tests, API/static/web production-artifact builds, image governance, fresh-schema database checks, Expo configuration validation, and source-only provenance attestation. This was source/CI validation only: it did not dispatch the production recipe-image QA workflow and did not create a user, media item, storage object, or database record.

## 8. Remaining owner-authorized step

The source repair is newer than the live API release attested by the failed run. The QA workflow intentionally requires exact equality between protected main and `/api/version`; therefore the smallest remaining sequence is:

1. Explicitly authorize an API-only Railway deployment of protected main `2f203f2639c234d53ed31f69901c9d0dab0b965c`, and verify the live API’s exact SHA before any credentialed QA action.
2. Update `CALORA_QA_SUPABASE_URL` in the `calora-production-recipe-image-qa` GitHub Environment to the root Calora project origin only, with no `/auth/v1` or other path.
3. Explicitly authorize and dispatch **recovery only** from protected main using:

- `expected_commit`: the exact deployed protected-main SHA;
- `confirmation`: `RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA`;
- `recovery_run_id`: `39891020186`.

That recovery has no image-generation path. It will either prove terminal cleanup for the bounded aliases or fail closed with sanitized evidence. A subsequent separate, expressly authorized normal run is required before claiming live verification of image generation, preview, semantic human review, rejection, and deletion behavior.

## 9. Final status

This remediation is merged and release-gated. It repairs the source defects that allowed a malformed Supabase endpoint configuration to produce a misleading `404` plus unrecoverable-looking sign-in failure, without weakening any credential, account-isolation, review, or storage-erasure controls.

The prior live image workflow remains **not verified**. There is no claim that an image corresponded to the requested recipe, because image generation never executed in the failed production QA run. No Railway deployment or new production QA execution was performed during this mission.
