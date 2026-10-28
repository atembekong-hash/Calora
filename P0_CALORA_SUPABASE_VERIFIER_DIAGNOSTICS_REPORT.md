# Calora Supabase Verifier Diagnostics Repair

## Scope

This repair addresses the production `/api/v1/profile` HTTP 500 symptom without changing Railway variables, Supabase data, customer records, or client builds.

## Confirmed pre-repair behavior

The active API returned HTTP 500 for `/api/v1/profile` before token validation. Production logs intentionally retained only `errorClass: "Error"` and omitted message and stack details.

## Changes

- Check for a missing or malformed bearer token before initializing the Supabase verifier, so an unauthenticated request returns the route's existing HTTP 401 response.
- Classify verifier failures with bounded non-secret codes:
  - `supabase_config_missing`
  - `supabase_config_invalid`
  - `supabase_auth_unavailable`
- Convert classified verifier failures to HTTP 503 with a generic response body.
- Extend sanitized error logging to retain only an allowlisted bounded `errorCode`; raw messages, stacks, causes, URLs, keys, tokens, provider bodies, and customer data remain excluded.
- Preserve invalid-token behavior as HTTP 401.

## Validation

All tests used synthetic configuration only.

- Workspace declaration build: PASS
- API TypeScript validation: PASS
- Focused verifier/logger/profile tests: 26/26 PASS
- Full offline API regression suite: 546/546 PASS across 43 files
- Diff/format check: PASS
- Source secret scan: PASS

## Production status

No Railway variables were changed. No deployment was triggered. No production credentials, customer data, or native builds were accessed or modified.

## Release status

A protected pull request is required for review and merge. Production deployment remains a separate release action and is not included in this repair step.

## Verdict

READY_TO_MERGE_PENDING_PROTECTED_CHECKS
