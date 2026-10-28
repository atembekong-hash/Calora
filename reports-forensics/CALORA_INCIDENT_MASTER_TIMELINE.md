# Calora Incident Master Timeline

## Scope and evidence boundary
This synthesis is limited to repository history, checked-in reports, source inspection, and the independent evidence supplied with this investigation. No production credentials, customer data, live database records, production builds, production deployments, or protected runtime values were accessed by this forensic synthesis.

## UTC timeline

| UTC | Evidence | Interpretation |
|---|---|---|
| 2026-10-28 09:09:55 | Commit `f3ed6ec44df5c716abb5f602851f0b4e275bc0c0`, profile/settings redesign | Last-known reported production revision before recovery sequence; causal responsibility is not established. |
| 2026-10-28 10:47:03.383 | Railway deployment `793bc3a1-01ef-4396-be86-26d7f33fd4c6`, `f3ed6ec`, SUCCESS | Historical deployment metadata; does not prove exact runtime configuration or first failing request. |
| 2026-10-28 11:03:25 | Commit `25a6c1e`, startup-deadlock repair | Added bounded auth/storage/profile recovery behavior; later reverted. |
| 2026-10-28 11:20:24 | Merge `d9d5748`, PR #250 | Startup repair merged. |
| 2026-10-28 11:38:12 | Commit `2b1dda6`, fail-closed malformed verifier configuration | Added verifier initialization failure classification. |
| 2026-10-28 11:42:59 | Merge `8f88145`, PR #251 | Verifier-init repair merged. |
| 2026-10-28 12:34:43 | Commit `fcdad41`, rollback to pre-profile-settings baseline | Sequence evidence only; not causal proof. |
| 2026-10-28 12:44:55 | Merge `e9b971b`, PR #252 | Reported production SHA / last-known pre-diagnostics revision. |
| 2026-10-28 18:14:13 | Commit `c3b0549`, safe verifier diagnostics | Checks bearer syntax first; classifies verifier failures and maps them to 503. |
| 2026-10-28 18:21:37 | Merge `efe059a`, PR #253 | Fix merged; deployment evidence supplied says target deployments remained queued. |
| 2026-10-28 18:21:40 / 18:23:47 | Railway deployments `e7722a4f-4d79-44b3-81e1-b60da432197c` and `0824226f-a194-4aad-ae96-c3d4b553bb4e`, both QUEUED | Release-plane blocker; not evidence of live repair. |

## Proven and unproven
**Proven:** source/history and preserved P0 report support a `/api/v1/profile` HTTP 500 occurring before token validation when verifier setup/configuration or Supabase Auth availability failed and the error reached the generic handler. The repository sequence and queued deployment states are also established by the supplied evidence.

**Unproven:** exact first request timestamp, request/trace ID, effective Railway variables, Supabase project identity, precise provider outage, serving SHA after PR #253, and whether the profile redesign triggered the verifier defect. No immutable sanitized production log export is preserved.

## Verdict
`ROOT_CAUSE_PARTIALLY_PROVEN; PRODUCTION_BLOCKED_EXTERNAL`. The failure mechanism is supported, but the exact live trigger and production recovery are not attested.