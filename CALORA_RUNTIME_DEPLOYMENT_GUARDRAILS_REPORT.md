# Calora Runtime Deployment Guardrails

**Branch:** `fix/calora-runtime-deployment-guardrails`
**Base:** protected main `f164c5a57d2c03698dcc26f8fa01feb5badac7b5`

## Implemented safeguards

The API now enforces a supported runtime policy of Node `>=22.13.0 <23.0.0`. The policy is applied in three places:

1. The root `package.json` engine declaration.
2. The `.node-version` file used by Railway and CI, which requests Node `22.16.0`.
3. A build-time and startup-time hard gate. An unsupported process exits before the API listener opens.

Protected release validation now uses `.node-version` instead of Node 24, preventing CI from validating a different runtime from the production API.

Every newly built API release exposes sanitized runtime metadata through `/api/version`:

- `nodeVersion`
- `nodeMajor`
- `supabaseSdk`

The metadata is compiled into the artifact, not read from a request or mutable runtime environment. The live runtime identity verifier requires this metadata and rejects a release with a missing or incompatible runtime contract.

## Tests

The following validations passed:

- Runtime policy and deployment smoke tests: 6/6.
- Full scripts regression suite: 133/133.
- API offline regression suite: 44 files, 549 tests.
- API runtime and health tests: 7/7.
- API TypeScript validation.
- Release artifact and deletion-fence build validation.
- Formatting and diff checks.

The tests explicitly reject Node 20 and Node 24, accept Node 22.13 and Node 22.16, reject an unexpected Supabase SDK version, and verify that the live release smoke validator requires the runtime metadata.

## Deployment procedure after merge

After protected merge, the API deployment should be verified in this order:

1. Confirm Railway deployment reaches `SUCCESS`.
2. Confirm `/api/version` reports the expected protected-main SHA.
3. Confirm `/api/version` reports Node 22 metadata and Supabase SDK `2.112.2`.
4. Confirm `/health` and `/api/healthz` are healthy.
5. Confirm an unauthenticated protected endpoint returns HTTP 401 rather than HTTP 500 or 503.
6. Run the approved authenticated profile/synchronization smoke lifecycle only when separately authorized.

No native mobile build is part of this change.

## Remaining operational recommendation

Keep the Railway Node provider on the Node 22 line and monitor its resolved patch version. If Railway changes the available Node 22 image, the build gate and live smoke verifier will expose the mismatch before the release is treated as healthy.

## Verdict

**READY_TO_MERGE** after protected checks pass. Deployment should proceed through the existing Railway API-only release process after merge.
