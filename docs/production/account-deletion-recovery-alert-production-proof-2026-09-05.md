# Account-deletion recovery alert rehearsal

**Date:** 2026-09-05  
**Scope:** One ephemeral Supabase Auth account, one local production-mode API
process, one controlled RevenueCat retry failure, and one successful recovery.

## Rehearsal boundary

The published API was healthy, but its `/api/version` response identified an
older deployment than the current recovery-warning source. The live deployment
therefore was not used to claim a warning-log pass. The rehearsal below ran the
current API build with `NODE_ENV=production`, the real development database,
the real Supabase Auth project, and the real RevenueCat erasure path.

Only the local process received a deliberately invalid RevenueCat credential for
the failure phase. No credential value, email address, token, password, Auth
UUID, provider customer ID, or raw database identity was retained in this
report.

## Controlled failure

The harness created one confirmed disposable Auth account and called the real
`DELETE /api/v1/account` route. RevenueCat lookup was deliberately rejected by
the invalid rehearsal credential, producing the expected public HTTP `502`.
The persisted checkpoint was then inspected and aged without printing its
identity:

| Check | Aggregate result |
|---|---:|
| Disposable accounts created | 1 |
| Account-delete response | 1 × HTTP 502 |
| Persisted state after failure | `deleting` |
| Retry stage | `revenuecat` |
| Retry marker | `retry_required` |
| Checkpoint age before recovery | at least 1,200 seconds |
| Recovery identity retained for worker | yes, server-side only |

The rehearsal initially exposed that PostgreSQL timestamp values arrived as
strings in the recovery query while the age calculation expected `Date`
objects. Recovery safely contained that error rather than crashing the API.
The state reader now normalizes both timestamp representations, and the
regression test covers the string-valued database shape.

## Warning evidence

After restarting the current build in production logger mode, the startup
recovery cycle emitted exactly one structured warning:

```json
{
  "event": "account_deletion_recovery",
  "attemptedCount": 1,
  "failureCount": 1,
  "failureStages": { "application": 0, "revenuecat": 1, "auth": 0 },
  "unresolvedCount": 1,
  "overdueCount": 1,
  "overdueStages": { "application": 0, "revenuecat": 1, "auth": 0 },
  "oldestAgeSeconds": 1313,
  "correlationKeys": ["<16-character redacted fingerprint prefix>"]
}
```

The warning contained aggregate counts, the failing stage, overdue age, and a
short fingerprint prefix. It did not contain the Auth identity or the provider
error text.

## Successful recovery and cleanup

The process was restarted with the real configured RevenueCat credential. The
startup recovery cycle completed the same disposable checkpoint through the
provider no-customer path and Auth erasure. No recovery warning was emitted.
The final aggregate database check reported:

| Check | Aggregate result |
|---|---:|
| Rows remaining in `deleting` state | 0 |
| Rows retaining a recovery external ID | 0 |
| Terminal deleted rows retaining an error marker | 0 |
| Recovery warning during successful cycle | none |

This verifies the controlled failure signal, quiet successful recovery, and
cleanup of disposable deletion data in the current production-mode runtime.

## Live deployment closure

The API was then published from source tree
`708dd836f6b97849bce00839cda3d995de1c61fe`. The canonical `/api/version`
response reported release `calora-api-8fdb5226bb19-20260905101425616`, proving
that the deployed runtime included the timestamp normalization and sanitized
recovery warning source used by this rehearsal.

One new disposable Auth account and one disposable RevenueCat customer were
used to exercise the deployed `DELETE /api/v1/account` route. A bounded,
customer-specific recreation race caused provider post-delete verification to
fail once without changing the global provider credential or touching another
customer. The route returned one HTTP `502` and retained a retryable
`revenuecat` checkpoint.

The next deployed recovery cycle emitted exactly one structured warning:

| Warning field | Aggregate result |
|---|---:|
| Attempted | 1 |
| Failed | 1 |
| Failure stage | `revenuecat` |
| Unresolved | 1 |
| Overdue | 0 |
| Oldest age | 55 seconds |
| Correlation keys | 1 × 16-character fingerprint prefix |

The recovery warning contained the event name, a random cycle identifier,
aggregate counts, stage counts, age, and the redacted correlation prefix. It
contained no Auth UUID, email address, access token, provider customer ID,
credential, or provider error text.

The disposable provider customer was then removed through the real configured
provider path. The following recovery cycle emitted no warning and completed
Auth erasure. A final read-only aggregate production check reported:

| Check | Aggregate result |
|---|---:|
| Rows remaining in `deleting` state | 0 |
| Rows retaining a recovery external ID | 0 |
| Terminal deleted rows retaining an error marker | 0 |
| Recovery warning after provider restoration | none |

This closes the prior deployment evidence gap while retaining only sanitized,
aggregate operational proof.
