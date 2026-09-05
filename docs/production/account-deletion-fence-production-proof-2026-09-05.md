# Production account-deletion write-fence proof

**Date:** 2026-09-05  
**Scope:** One disposable production account and one disposable application write.

## Controlled run

The run used the deployed API and a newly-created, confirmed disposable Auth
account. The account was seeded with exactly one diary write before deletion.
No real user account, existing application record, identifier, email address,
token, password, or provider credential was used or retained in this report.

Only aggregate status and error-class results were recorded:

| Check | Aggregate result |
| --- | ---: |
| Disposable accounts created | 1 |
| Pre-deletion writes accepted | 1 |
| Account deletion responses | 1 × HTTP 200 |
| Post-deletion write attempts | 1 |
| Post-deletion writes accepted | 0 |
| Post-deletion writes rejected | 1 |
| Post-deletion write response | 1 × HTTP 503 |
| Post-deletion write error class | database deletion fence |

The API intentionally returns a generic 503 for the failed sync operation.
The corresponding production deployment log classified the same request as
`Sync request failed` and contained the database error class
`account deletion is in progress`; it contained no duplicate-key or
foreign-key error. This distinguishes the rejection from a generic service
failure and confirms the write reached the database-enforced deletion fence.

The server-side deletion completed successfully and the disposable Auth
identity was not retained by the test harness.

## Regression coverage

The real-schema integration test also asserts that a write after a `deleting`
tombstone is rejected with PostgreSQL SQLSTATE `55000` and the expected fence
error class. It remains skipped when no database connection is configured.