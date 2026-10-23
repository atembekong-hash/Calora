# Final Calora Recipe-Image Production Closure

**Date:** 2026-10-23
**Final verdict:** **ENGINEERING READY — recovery prepared and awaiting owner authorization.**

## Scope and starting evidence

This report consolidates the current recipe-image production closure work without repeating the completed isolated staging lifecycle or earlier QA #3–#6 forensic investigations.

Historical production QA run `39891020186` remains unresolved. The latest recovery-only run `39946209518` failed closed with `qa_admin_request_unavailable` and sanitized transport category `dns`. No live production image lifecycle has been certified.

The isolated staging lifecycle remains **PASS**, but it does not prove live provider behavior, live private preview authorization, or production cleanup.

## Current release and production health

The current protected `main` SHA is:

```text
96b3e958818cf8542c53fc667e931555c905bf6b
```

Protected release validation run `39954359267` passed for this exact source revision. Both production API origins report the same SHA through `/api/version` and return healthy results from the canonical routes:

- `https://mycaloraapp.com/api/version` — HTTP 200, exact SHA match.
- `https://app.mycaloraapp.com/api/version` — HTTP 200, exact SHA match.
- Both origins `/health` — HTTP 200, `status: ok`.
- Both origins `/api/healthz` — HTTP 200, `status: ok`.

The current source and deployment identity are therefore aligned for a future recovery authorization.

## Protected execution controls

The production QA workflow remains dispatch-only and protected by:

- `refs/heads/main` invocation guard.
- Exact `expected_commit == GITHUB_SHA` check.
- Literal confirmation phrase.
- Existing `calora-production-recipe-image-qa` Environment approval gate.
- Main-branch Environment policy and repository-owner reviewer.
- `contents: read` permissions.
- No pull-request trigger.
- No normal image-generation step in recovery mode.
- Sanitized artifacts only.

The workflow was not dispatched during this mission. No production secret was read or changed.

## GitHub-hosted runner diagnostic

A new credential-free diagnostic workflow was added through protected PR #220, merged to `main`, and passed post-merge release validation. The workflow contains no secrets and does not contact protected Auth, Calora, storage, database, billing, or image-provider routes.

Diagnostic workflow run:

- Run ID: `39955230443`.
- Source SHA: `96b3e958818cf8542c53fc667e931555c905bf6b`.
- Result: **PASS**.

Its sanitized artifact reported:

```json
{
  "schemaVersion": "calora.production-recipe-image-network-diagnostic.v1",
  "host": "pzdulhkpwbrbrgskwwwe.supabase.co",
  "dns": {
    "getaddrinfo": "pass",
    "promises": "pass",
    "node": "pass"
  },
  "https": {
    "status": "pass",
    "tls": "pass"
  },
  "result": "pass"
}
```

The diagnostic exercised the actual GitHub-hosted runner context and checked both Node resolver paths plus Node’s built-in `fetch` HTTPS/TLS path. It emitted only fixed status values, the public hostname, and a schema version. No credentials, raw exceptions, request paths, personal identifiers, or protected payloads were available to the job.

## Root-cause conclusion

The historical recovery failure remains best classified as a transient or otherwise time-specific GitHub-hosted-runner DNS-class failure. The new runner diagnostic passed, so the failure is **not currently reproducible** from the same GitHub Actions execution environment.

The evidence does not prove which historical resolver condition occurred. It also does not justify changing DNS configuration, disabling TLS verification, hard-coding IP addresses, adding insecure fallbacks, broadening credentials, or changing cleanup semantics.

No Calora API defect, Supabase configuration defect, workflow secret defect, TLS defect, or persistent runner DNS defect has been demonstrated.

## Source changes

The only source change in this mission was the focused diagnostic workflow:

```text
.github/workflows/production-recipe-image-network-diagnostic.yml
```

It was delivered through protected PR #220. All PR checks passed, including release validation. Post-merge release validation run `39954359267` passed. No production API deployment was needed because the change is a diagnostic workflow only.

## Tests and validation

- Existing production recipe-image QA offline regression suite: **18/18 passed** before this mission.
- Static diagnostic workflow security checks: **PASS**.
- No production secrets referenced by the diagnostic workflow: **PASS**.
- Protected-main and credential-free invocation boundary: **PASS**.
- GitHub-hosted DNS resolution: **PASS**.
- Node resolver lookup: **PASS**.
- HTTPS reachability: **PASS**.
- TLS verification: **PASS**.
- Sanitized artifact upload and schema validation: **PASS**.
- Native Android or iOS builds: **not triggered**.

## Recovery readiness

A single bounded recovery operation is prepared and remains **not dispatched**. Its required inputs are:

```text
workflow: Production recipe-image QA
expected_commit: 96b3e958818cf8542c53fc667e931555c905bf6b
confirmation: RUN_CALORA_PRODUCTION_RECIPE_IMAGE_QA
recovery_run_id: 39891020186
mode: recovery-only
```

If authorized later, it will use the existing Environment reviewer gate and act only on the two deterministic QA aliases associated with the historical run. It will not generate an image, enumerate users, list storage, alter unrelated records, or bypass cleanup controls.

A future recovery artifact must return `result: "pass"` with terminal cleanup evidence before the historical aliases can be certified as cleaned. If it fails again, the fixed sanitized category must be recorded and no automatic retry should occur.

## Remaining blocker and owner action

**Remaining blocker:** owner authorization is required before dispatching the recovery-only workflow. The current mission does not authorize that dispatch.

The smallest owner action is to explicitly authorize exactly one recovery-only run with the inputs shown above. The existing GitHub Environment approval remains mandatory even after that authorization.

The normal production image-generation lifecycle remains a separate, later operation. It requires separate explicit authorization after recovery cleanup passes. Production certification requires live generation, semantic image review, private preview controls, acceptance/rejection behavior, delivery restrictions, account deletion, provider cleanup, database cleanup, storage cleanup, and credential invalidation.

## Final verdict

**ENGINEERING READY — recovery prepared and awaiting owner authorization.**

The DNS-class blocker has been investigated from the actual GitHub-hosted runner context. Current resolver and HTTPS connectivity pass. No unsafe workaround or unjustified source change was introduced. Production remains uncertified because the bounded historical recovery and the separate live image lifecycle have not both completed with terminal evidence.

## Evidence links

- Diagnostic workflow run [39955230443](https://github.com/atem.../Calora/actions/runs/39955230443)
- Diagnostic workflow PR [#220](https://github.com/atem.../Calora/pull/220)
- Post-merge release validation [39954359267](https://github.com/atem.../Calora/actions/runs/39954359267)
- Latest failed recovery [39946209518](https://github.com/atem.../Calora/actions/runs/39946209518)
- Historical failed run [39891020186](https://github.com/atem.../Calora/actions/runs/39891020186)
