# Production Recipe-Image QA #6 — Auth Admin Connection Forensic Report

**Date:** 2026-10-23 UTC
**Scope:** Owner-authorized recovery-only workflow run `39916357493` for original run `39891020186`, its sanitized GitHub Actions artifact, source-controlled connection handling, and bounded read-only provider diagnostics.

## Verdict

**BLOCKED — terminal cleanup of the two bounded deterministic QA aliases is not proven.** The recovery-only run failed closed with `qa_admin_request_unavailable` and sanitized transport category `connection`. No normal recipe-image lifecycle ran, no image was generated or reviewed, and no cleanup success was claimed.

The exact underlying network event cannot be determined from the approved run without weakening the established redaction boundary. The workflow intentionally excludes raw exception names, codes, messages, URLs, headers, credentials, request bodies, response bodies, and account identifiers from logs and artifacts. The available provider log window contains only aggregate connection-pool telemetry and no Auth HTTP source.

## Evidence

[Workflow run `39916357493`](https://github.com/atembekong-hash/Calora/actions/runs/39916357493) executed from protected main commit `bb7bd70d6e654c491bd6108515fcb05097286bfc`. Its normal recipe-image step was skipped. The recovery step completed, the terminal-enforcement step failed as designed, and the sanitized artifact contained only:

```json
{
  "schemaVersion": "calora.production-recipe-image-qa-recovery.v3",
  "result": "fail",
  "failure": "qa_admin_request_unavailable",
  "transport": "connection"
}
```

The runner first verified the live Calora release and then attempted ordinary password sign-in for the exact deterministic aliases before attempting the bounded Admin create-and-delete reconciliation. A connection failure during that sign-in would have produced `recovery_qa_sign_in_failed`, not `qa_admin_request_unavailable`. Therefore, the same-run evidence shows that Supabase Auth returned an HTTP response to the preflight sign-in and that the later Auth Admin request threw before it received an HTTP response. This rules out a persistent whole-origin DNS, TLS, routing, or credential failure, but not a transient or endpoint-attempt-specific network failure.

The job used a GitHub-hosted `ubuntu-24.04` runner in Azure westus. The workflow and runner contain no proxy variables, custom Undici dispatcher, Node proxy opt-in, custom CA, TLS override, or redirect relaxation. GitHub’s documented proxy controls are for self-hosted or private-network runner setups; no such runner was used here [3]. Node fetch uses proxy environment variables only when its proxy support is explicitly enabled, and the workflow has no such enablement [1].

The prior `connection` category was intentionally broad: it combined DNS lookup, network reachability, TCP reset/refusal, and generic Undici socket failures. It did not identify one specific cause. Undici documents socket errors as failures on the underlying socket and identifies separate timeout and secure-proxy error classes [2].

A read-only, three-minute aggregate query of Calora’s Supabase unified logs for the workflow execution window returned only `supavisor_logs` entries. It returned no Auth HTTP log source, no accounts, no messages, and no credentials. It cannot distinguish DNS, TLS, proxy, TCP, or provider-edge behavior.

## Demonstrated remediation

The source classifier has been narrowed without changing the network request, credential scope, route construction, recovery policy, or cleanup rules. It now emits only one fixed, redacted category from this allowlist:

- `timeout`
- `redirect`
- `proxy`
- `tls`
- `dns`
- `network`
- `tcp`
- `socket`
- `unknown`

It traverses nested fetch causes, including aggregate causes, so a future GitHub-hosted Node fetch failure can be classified without logging the raw cause. The JSON artifact still contains only the fixed category and the pre-existing safe failure code. No retry was added, and no direct cleanup shortcut, user search, storage listing, or normal image lifecycle was added.

## Validation

The focused production recipe-image QA suite passed three consecutive times: **18/18** tests on each run. It verifies timeout, DNS, network, TCP, socket, TLS, and proxy classification; nested-cause handling; lack of raw diagnostic leakage; release matching; identity isolation; and fail-closed recovery behavior.

The complete scripts workspace suite passed **122/122** tests. Scripts TypeScript validation, Node syntax validation, Prettier, and `git diff --check` also passed. These are controlled offline checks and do not prove that the unresolved QA aliases were deleted.

## Next action

Merge this diagnostic-only change through the protected GitHub workflow. No API deployment is required because the changed code runs only in GitHub Actions. After protected main contains the change, a future recovery-only run must be separately authorized with the current protected-main release attested by both live API origins and the existing GitHub Environment approval gate.

That one future artifact must return `result: "pass"` before cleanup can be certified. If it fails, its fixed transport category will identify the next narrow read-only investigation. A normal recipe-image lifecycle remains separately unauthorized.

## References

[1]: https://nodejs.org/learn/http/enterprise-network-configuration "Node.js enterprise network configuration"
[2]: https://undici.nodejs.org/api/Errors "Undici errors"
[3]: https://docs.github.com/en/actions/how-tos/manage-runners/use-proxy-servers "GitHub Actions runner proxy servers"
