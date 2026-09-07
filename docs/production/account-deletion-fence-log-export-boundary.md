# Account-deletion fence log-export boundary

The deployment-log helper returns a formatted `logs` string, not the API's
original NDJSON. A line contains a platform prefix followed by the structured
JSON record emitted by the API. The structured record can include operational
metadata, request headers, account identifiers, and database error details.
Those fields must not be copied into production evidence.

## Safe monitor flow

1. Request only the bounded deployment-log interval needed for the rehearsal.
   Narrow message filters are useful, but they are not a privacy boundary.
2. Save only the returned `logs` string to a temporary file. Do not commit it,
   upload it as evidence, or include it in a task report.
3. Run the monitor with the hosted adapter and explicit window bounds:

   ```sh
   node scripts/monitor-account-deletion-fence.mjs \
     --log-file "$TEMP_HOSTED_LOG_EXPORT" \
     --log-format hosted \
     --release-url "https://<published-api-origin>" \
     --window-start "2026-09-07T10:00:00Z" \
     --window-end "2026-09-07T10:30:00Z" \
     --report-file "docs/production/account-deletion-fence-monitor-report.json" \
     --require-fence
   ```

4. Delete the temporary export after the report is generated. Retain only the
   bounded report, which is tied to the published release attestation.

The hosted adapter keeps only:

- the validated `account_deletion_fence` class, canonical internal route, and
  positive rejection count;
- the canonical `/v1/sync` route and HTTP 503 status for unrelated-sync-failure
  counting.

It drops host, process, request, response, authorization, account, error, and
other deployment fields. It also removes the public `/api` mount from request
URLs before classification. A 503 or database message alone is never treated
as deletion-fence evidence.

Because hosted log lines do not provide the API's internal `time` field, the
monitor requires `--window-start` and `--window-end` for a bounded hosted
export. The resulting report uses `bounded-hosted-log-export` as its window
source.