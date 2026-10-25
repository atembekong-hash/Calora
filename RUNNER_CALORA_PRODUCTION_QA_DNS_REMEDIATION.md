# RUNNER_CALORA_PRODUCTION_QA_DNS_REMEDIATION

Date: 2026-10-25

## Final verdict

**NETWORK PATH PASS / NORMAL PRODUCTION QA PATH BLOCKED pending one owner-only runner-registration action.**

The recurring GitHub-hosted runner failure has been isolated. The production QA failure in run `40187766001` was a DNS-class transport failure on the GitHub-hosted Ubuntu runner. The existing owner-controlled Windows runner then demonstrated healthy DNS, HTTPS, TLS, Node fetch/Undici, Auth-route reachability, and dual-domain release verification.

The Windows runner is currently registered only to the private repository `atembekong-hash/calora-secure-recovery`, not to `atembekong-hash/Calora`. Therefore it must not receive Calora’s protected production secrets, and the normal Calora production QA workflow cannot safely target it yet.

No second billable production recipe-image test was run. No production credentials, QA identities, images, storage objects, customer records, or mobile builds were accessed or changed.

## 1. Original failure evidence

| Item | Evidence |
|---|---|
| Failed production run | [Calora run 40187766001](https://github.com/atembekong-hash/Calora/actions/runs/40187766001) |
| Failure | `qa_admin_request_unavailable` / sanitized transport `dns` |
| Failure point | First Supabase Auth Admin request |
| Verified QA identities | 0 |
| Image-generation requests | 0 |
| Media/review/cleanup lifecycle | Not reached |
| Calora source SHA | `9f471bd1fcf40c7662414177dc6cb8fb2998bf1f` |

The artifact did not expose raw resolver details by design. The failure occurred before an Auth response or user ID was recorded, and the workflow correctly failed closed.

## 2. Runner investigation

### Candidate runner

- Repository: `atembekong-hash/calora-secure-recovery`
- Runner: `calora-secure-recovery`
- OS: Windows
- Labels: `self-hosted`, `Windows`, `X64`, `calora-recovery`
- Status: online and idle at inspection
- Runner repository permissions: private repository, administrative access verified

### First Windows diagnostic

[Run 40197241098](https://github.com/atembekong-hash/calora-secure-recovery/actions/runs/40197241098) passed the Windows runtime preflight and produced:

- `dns: pass`
- `supabaseHttps: pass`
- `tls: pass`
- Both production API endpoints returned HTTP 200 and `health: ok`
- Both domains served commit `4cbe7544924a976663b81cf4012a5ce90ba6a17d`
- Result: `fail` only because the diagnostic input incorrectly expected stale commit `9f471bd1fcf40c7662414177dc6cb8fb2998bf1f`

This disproves a persistent DNS failure on the Windows runner. It also identifies a separate operator/preflight issue: the expected release SHA must be captured immediately before dispatch and compared with both live domains.

## 3. Corrected Windows diagnostic

A Node transport-parity preflight was added to the private runner workflow through protected PR [#31](https://github.com/atembekong-hash/calora-secure-recovery/pull/31), then squash-merged to private main.

The added check uses the same Node fetch/Undici family as the Calora QA runner and performs credential-free `OPTIONS` probes only against:

- Supabase root
- `/auth/v1/admin/users`
- `/auth/v1/token?grant_type=password`

It never reads QA secrets, creates identities, invokes the image provider, or mutates production.

[Run 40197437074](https://github.com/atembekong-hash/calora-secure-recovery/actions/runs/40197437074) passed all checks on the actual Windows runner:

- Windows runtime compatibility preflight: PASS
- Node `v20.20.2` fetch/Undici preflight: PASS
- Supabase root probe: PASS
- Supabase Admin route reachability probe: PASS
- Supabase token route reachability probe: PASS
- OS DNS resolution: PASS
- Supabase HTTPS: PASS
- TLS 1.2: PASS
- `mycaloraapp.com/api/version`: HTTP 200, expected SHA, health `ok`
- `app.mycaloraapp.com/api/version`: HTTP 200, expected SHA, health `ok`
- Final result: `pass`

Expected and live SHA used for the passing run:

`4cbe7544924a976663b81cf4012a5ce90ba6a17d`

## 4. Root cause

There were two distinct issues:

1. **Original production blocker:** GitHub-hosted `ubuntu-latest` reached the first privileged Supabase request with a sanitized DNS-class transport failure. Sandbox preflight success did not represent that runner’s network path.
2. **First Windows diagnostic failure:** not a connectivity failure. The diagnostic was dispatched with the prior SHA after the Calora documentation merge had already deployed `4cbe754…`. DNS, HTTPS, TLS, and API health all passed; only exact-release equality correctly failed.

The corrected Windows run proves that the candidate runner’s network path is healthy and that the exact Node transport used by the QA implementation can reach the required Supabase routes without credentials.

## 5. Security boundary

The private Windows runner is **not** currently a safe target for Calora’s credentialed QA job because GitHub reports no self-hosted runner registered under the main Calora repository. It is registered only under the private recovery repository.

The following controls remain intact:

- Calora production QA remains `main`-only.
- Calora workflow permissions remain minimal (`contents: read`).
- The protected Environment approval remains required.
- Production secrets remain in the Calora Environment and were not copied to the private repository.
- The private runner diagnostic used no production secrets.
- Historical recovery remains separate from normal recipe-image QA.
- No credentials were written to source, logs, artifacts, or reports.
- No TLS verification was disabled and no DNS/IP override was introduced.

## 6. Normal QA workflow compatibility

**Network compatibility: PASS. Credentialed workflow compatibility: NOT YET READY.**

The Calora QA script’s Node request implementation is compatible with the validated Windows Node runtime at the transport level. However, the current Calora workflow also contains Ubuntu/Bash-specific wrapper commands (`set -euo pipefail`, `umask`, and Bash heredoc validation). It should not be pointed at Windows until those wrapper steps are ported to PowerShell/Node or the job is assigned to a compatible trusted runner.

The current private runner cannot receive Calora Environment secrets merely because it passed credential-free checks. Repository scope and secret isolation must be resolved first.

## 7. Minimum owner action

Perform exactly one owner-controlled infrastructure action before another production QA authorization:

1. In the private recovery repository, leave `calora-secure-recovery` registered for historical recovery and credential-free diagnostics.
2. In `atembekong-hash/Calora`, add a separate owner-controlled self-hosted runner registration on the intended Windows execution machine, preferably with a unique label such as `calora-prod-qa`.
3. Use a separate runner installation/service or a properly restricted organization runner group; do not share the private recovery runner’s workspace or DPAPI store.
4. Keep the runner online and idle for the diagnostic. Do not enter production secrets into the runner registration flow.

The owner should not paste runner registration tokens or production credentials into chat. After the runner appears under the Calora repository, its label and online status can be verified read-only.

## 8. Next protected engineering step

After the Calora-scoped runner exists, prepare one protected Calora PR that:

1. Adds a credential-free preflight to the normal QA job using the same Node probes proven in run `40197437074`.
2. Converts the Bash-only wrapper and sanitized-result enforcement to PowerShell/Node-compatible steps if the job targets Windows.
3. Keeps per-step secret binding, exact-release checks, Environment approval, zero retries, bounded identities, one-generation limit, and fail-closed cleanup.
4. Targets only the new Calora runner label; do not target the private recovery runner by repository indirection.
5. Runs credential-free validation first. Do not dispatch the credentialed QA workflow during this adaptation.

## 9. Final recommendation

The next production QA run should use a fresh owner authorization only after:

- A Calora-scoped trusted runner is online.
- The same-runner Node/DNS/TLS/route preflight passes.
- Protected main and both live API domains match the freshly captured SHA.
- The Windows-compatible normal QA wrapper is merged and validated.
- The existing Environment approval and secret boundaries remain intact.

Only then should one fresh, separately authorized live recipe-image lifecycle be dispatched. Do not reuse run `40187766001`, perform historical recovery, or claim production image certification from the credential-free runner PASS alone.
