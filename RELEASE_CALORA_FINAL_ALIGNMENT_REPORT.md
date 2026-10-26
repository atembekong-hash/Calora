# RELEASE_CALORA_FINAL_ALIGNMENT_REPORT

Date: 2026-10-26

## Verdict

**PARTIAL PASS / BLOCKED for final preflight certification.** The Calora production API is aligned with protected `main` and both production domains are healthy. The follow-up credential-free Windows preflight could not execute because GitHub left it queued against a stale self-hosted runner registration; it was cancelled without starting a job. No credentialed QA, image generation, account creation, or production mutation occurred.

## Protected release gates

Current protected Calora `main`:

```text
0c4a4d91c2581f947ed01c3b31b597d184435daa
```

Required release checks for this exact commit passed:

- Release validation: PASS.
- Portable PostgreSQL database integrations: PASS.
- Account-deletion fence validations: PASS.
- Native-association monitor checks: PASS.
- Release attestation: skipped according to repository policy; no release artifact was requested.

## Railway deployment

The existing authenticated Railway project and target were verified without changing configuration:

- Project: `attractive-harmony`
- Project ID: `b2484b01-c599-4a80-9b83-3139a2cba813`
- Environment: `production`
- Environment ID: `0ba409c4-5b32-4b75-8c33-e76d5c6e55db`
- Service: `@workspace/api-server`
- Service ID: `12af1b5f-0e00-4c41-ba51-f6b3901d7be7`
- Deployment ID: `d4322339-d589-4572-a77f-646871039962`
- Deployment state: `SUCCESS`
- Deployment source: `Calora@main`, commit `0c4a4d91`

Railway had already automatically deployed the exact protected-main revision. No redeploy was issued because the target was already correct and healthy. Production secrets, schemas, storage, unrelated services, and infrastructure settings were not changed.

## Independent production verification

Both production domains were checked independently:

| Origin | `/api/version` SHA | SHA equality | `/api/healthz` | Body |
|---|---|---:|---:|---|
| `https://mycaloraapp.com` | `0c4a4d91c2581f947ed01c3b31b597d184435daa` | PASS | HTTP 200 | `{"status":"ok"}` |
| `https://app.mycaloraapp.com` | `0c4a4d91c2581f947ed01c3b31b597d184435daa` | PASS | HTTP 200 | `{"status":"ok"}` |

## Credential-free Windows preflight

The authorized follow-up dispatch was run `40348510810`:

https://github.com/atembekong-hash/calora-secure-recovery/actions/runs/40348510810

It was dispatched with expected commit `0c4a4d91c2581f947ed01c3b31b597d184435daa`. The job remained queued for approximately 14 minutes. GitHub reported the runner as online and idle but supplied no runner assignment, no runner name, and no job start time. Runner metadata showed `lastSeenAt: null`, indicating a stale registration/session despite the nominal online status. The run was cancelled safely while still queued; its job never executed.

The previous real Windows run `40346847326` remains the latest completed evidence and proved:

- Node `v20.20.2`: PASS.
- All 18 Calora QA contracts: PASS, 18/18.
- Supabase DNS/HTTPS/TLS and Auth-route reachability: PASS.
- Both production health checks: PASS.
- Its only failure was the then-stale release SHA mismatch, now resolved by deployment `d4322339-d589-4572-a77f-646871039962`.

## Security and mutation status

No production credentials were accessed or transferred. No credentialed workflow was dispatched. No test accounts were created. No billable image generation was invoked. No database, storage, account, or customer record was modified. No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was triggered.

## Remaining blocker and exact action

The release alignment itself is **PASS**. To obtain the requested final preflight **PASS**, the registered Windows runner must be reconnected so it has a live runner session rather than only a stale GitHub `online` flag. Direct inspection of `C:\actions-runner` was attempted through the authorized Windows workspace, but the Manus device bridge returned a fresh device-authorization requirement.

Required owner action: authorize the existing DESKTOP-0UR9SG3 device in Manus Remote Access, then verify the `calora-secure-recovery` runner service is listening. No new runner, repository, credential, or workflow is needed. After that, dispatch exactly one credential-free preflight with the same expected SHA and require 18/18 contracts, Supabase reachability, and dual-domain SHA equality before any separate credentialed QA authorization.
