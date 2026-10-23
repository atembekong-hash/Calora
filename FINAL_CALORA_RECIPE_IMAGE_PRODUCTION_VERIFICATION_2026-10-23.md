# Final Calora Recipe-Image Production Verification

**Date:** 2026-10-23
**Final verdict:** **BLOCKED** — live production recipe-image generation and terminal cleanup are not certified.

## Scope

This report records the final authorized recovery attempt for historical Production Recipe-Image QA run `39891020186`. It does not claim that the normal production image lifecycle ran. It does not enumerate or modify unrelated customer records, storage objects, or production accounts.

The isolated staging lifecycle remains **PASS** from the earlier closure evidence. Staging is not substituted for live production verification.

## Release identity and health

The current protected `main` commit is:

```text
b65be61fb8ae940b212883a9bcad3e8f769cab45
```

Required release validation passed in GitHub Actions run `39941180662` for that exact SHA. Both production origins currently report the same API revision from `/api/version`:

- `https://mycaloraapp.com/api/version` — HTTP 200, exact SHA match.
- `https://app.mycaloraapp.com/api/version` — HTTP 200, exact SHA match.

The canonical health routes also passed on both origins:

- `/health` — HTTP 200, `status: ok`.
- `/api/healthz` — HTTP 200, `status: ok`.

The recovery run therefore passed the source and live-release identity prerequisites before attempting its bounded reconciliation.

## Protected execution controls

The existing `calora-production-recipe-image-qa` GitHub Environment remains protected by:

- Required repository-owner reviewer: `atembekong-hash`.
- Main-branch policy.
- Manual Environment approval.
- Workflow dispatch only.
- Protected-main invocation guard.
- Exact 40-character expected-commit equality with `GITHUB_SHA`.
- `contents: read` workflow permissions.
- Secret values scoped to the trusted Node execution steps.

The recovery run was approved through that Environment gate. No native Android or iOS build was triggered.

## Authorized recovery execution

The exact approved inputs were:

```text
workflow: Production recipe-image QA
run: 39946209518
expected_commit: b65be61fb8ae940b212883a9bcad3e8f769cab45
confirmation: RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA
recovery_run_id: 39891020186
mode: recovery-only
```

The run completed with failure at the terminal enforcement step, as required by the fail-closed workflow. The normal image-generation lifecycle was skipped.

The uploaded sanitized artifact was `calora-production-recipe-image-qa-39946209518` and contained only:

```json
{
  "failure": "qa_admin_request_unavailable",
  "result": "fail",
  "schemaVersion": "calora.production-recipe-image-qa-recovery.v3",
  "transport": "dns"
}
```

The artifact contained no credential, bearer token, password, email address, customer data, raw exception, URL, request body, response body, image locator, or image bytes.

## DNS and HTTPS diagnostic findings

A bounded, credential-free diagnostic was run against the non-sensitive Supabase project hostname present in repository configuration:

- DNS resolved to `172.64.149.246` and `104.18.38.10`.
- HTTPS connected successfully.
- TLS certificate verification returned code `0 (ok)`.
- The public root endpoint returned HTTP 404 with the provider’s safe `requested path is invalid` response. This is expected for that non-sensitive endpoint and demonstrates reachability; it is not an Auth success test.

The current sandbox therefore has working DNS, TCP, TLS, and HTTPS access. This does not prove that the GitHub-hosted runner had the same resolver state at the time of run `39946209518`.

The latest sanitized recovery category is limited to the runner’s Node/Undici DNS-class mapping. It proves only that the bounded Auth Admin request threw before receiving an HTTP response. It does not distinguish a transient hosted-runner resolver failure from another GitHub-runner network condition represented by the same safe category.

## Root-cause conclusion

No reproducible Calora source defect or workflow-configuration defect was demonstrated by the available evidence.

The immediate observed cause is:

> The GitHub-hosted recovery runner encountered a DNS-class failure before the bounded Supabase Auth Admin request reached Supabase ingress.

This conclusion is supported by:

1. The sanitized artifact’s fixed `transport: dns` category.
2. The absence of any Auth Admin HTTP response or Auth identifier in the recovery result.
3. The earlier bounded Supabase ingress aggregation, which recorded no matching Auth Admin, token, or user-route ingress for the failed recovery window.
4. A fresh credential-free DNS/TLS/HTTPS diagnostic that succeeds from the current sandbox, showing that the issue is not currently reproducible from this execution environment.

The evidence does not justify adding DNS fallbacks, disabling TLS verification, hard-coding provider IP addresses, logging raw exceptions, broadening credentials, enumerating Supabase users, or bypassing the cleanup workflow.

## Cleanup and image-verification status

The following remain **unverified**:

- Whether either deterministic historical QA Auth identity was created by the original ambiguous run.
- Terminal deletion of those historical aliases.
- Production recipe-image generation.
- Production image semantic correctness.
- Private preview delivery.
- Anonymous and cross-account preview denial in production.
- Acceptance and rejection behavior in production.
- Production provider cleanup, database cleanup, and storage cleanup.

The following are verified for this recovery attempt:

- It used recovery-only mode.
- It did not execute normal image generation.
- It did not enumerate unrelated users or storage.
- It did not delete without a safely recovered exact Auth identifier.
- It failed closed when cleanup could not be proven.
- It uploaded sanitized evidence.

## Tests and source status

The focused offline QA regression suite passed **18/18** tests with zero failures, including:

- Exact protected-main and live-release guards.
- Root-only Supabase URL enforcement.
- Redirect refusal.
- Recovery-only behavior.
- Ambiguous provisioning envelopes.
- Interrupted cleanup handling.
- Fixed transport classification for DNS, network, TCP, socket, TLS, and proxy failures.
- Sanitized artifact boundaries.

No source fix is justified by the evidence from run `39946209518`. No production secret, database, storage setting, unrelated Railway service, customer account, or native build was changed during this final verification attempt.

## Required next action

Do not dispatch another production recovery automatically. The bounded historical aliases remain unresolved and must not be reported as deleted.

If the owner chooses to continue later, the minimum safe action is one fresh explicit authorization for a recovery-only run using the then-current protected-main SHA and the existing Environment approval gate. A future artifact must report `result: "pass"` with terminal cleanup evidence before those aliases can be certified as cleaned.

Only after certified recovery cleanup, and under a separate explicit authorization, may the normal production recipe-image lifecycle be dispatched. That separate run must independently verify generation, semantic image accuracy, private preview authorization, rejection/acceptance behavior, delivery suppression, accepted delivery, account deletion, provider cleanup, database cleanup, storage cleanup, and credential invalidation.

## Evidence links

- Recovery run [39946209518](https://github.com/atembekong-hash/Calora/actions/runs/39946209518)
- Original failed run [39891020186](https://github.com/atembekong-hash/Calora/actions/runs/39891020186)
- Release validation [39941180662](https://github.com/atembekong-hash/Calora/actions/runs/39941180662)
- Repository [atembekong-hash/Calora](https://github.com/atembekong-hash/Calora)
