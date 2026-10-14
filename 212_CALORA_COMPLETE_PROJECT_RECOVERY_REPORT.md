# Report 212 — Calora Complete Project Recovery

**Date:** 2026-10-14  
**Mission:** Recover the authoritative Calora source, reconcile the protected release baseline, and establish the evidence boundary for complete certification.  
**Repository:** `atembekong-hash/Calora`  
**Protected production commit at start:** `e7c98edd667f5c63b402bdf27ba51f114fcfb8a9`

## Executive result

**Project recovery: PASS.** The authoritative application source is the sandbox checkout at `/home/ubuntu/calora-recipe-infinite-fix`, linked to `atembekong-hash/Calora`. The Windows `CaloraCertification` workspace is an evidence folder containing Report 211, not the application repository. A separate Windows `Desktop\Calora App` directory exists but is not a Git checkout and contains no recoverable source repository.

The repository was fetched successfully, the protected `main` ref was reachable, and the working tree had no uncommitted changes before this report set. No application source, production configuration, database, subscription, or native build configuration was changed during recovery.

## 1. Authority and repository evidence

| Item | Result |
|---|---|
| Repository | `atembekong-hash/Calora` |
| Default branch | `main` |
| Protected-main commit | `e7c98edd667f5c63b402bdf27ba51f114fcfb8a9` |
| Working checkout | `/home/ubuntu/calora-recipe-infinite-fix` |
| Working branch | `fix/recipe-infinite-scroll` |
| Working-tree state | Clean before Report 212–216 creation |
| GitHub access | Repository and pull-request metadata readable; push/PR workflow available |
| Required branch check | `Run release validation suite` |
| Branch protection | Enforced for administrators; pull-request review count currently 0 |
| Windows evidence workspace | `C:\Users\DynaBook\Desktop\CaloraCertification` |
| Windows workspace contents | Report 211 only; no `.git` directory |

## 2. Repository composition recovered

The monorepo contains the Expo mobile/web client, API server, shared database and API packages, integration packages, scripts, CI workflows, deployment/release attestation logic, certification reports, and prior evidence. Relevant package roots are:

- `artifacts/calora`
- `artifacts/api-server`
- `lib/*`
- `scripts`
- `.github/workflows`

The current repository history contains the recent remediation sequence through PRs #144–#172, including graph ranges, recipe pagination/rotation, scan fallback, image integrity, saved-recipe restoration, and environment reports.

## 3. Release baseline

Current production checks returned:

- `https://app.mycaloraapp.com/health` — HTTP 200, `status: ok`, `service: calora-web`.
- `https://app.mycaloraapp.com/api/healthz` — HTTP 200, `status: ok`.
- `https://app.mycaloraapp.com/api/version` — release attestation for `e7c98edd667f5c63b402bdf27ba51f114fcfb8a9`, release ID `calora-api-e7c98edd667f-20261014064946520`.

The deployed release therefore matches protected `main` at the time of this recovery pass.

## 4. Scope and safety controls

- No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, Google Play, or other native build was triggered.
- No production database mutation, migration, reset, export, or destructive SQL was executed.
- No customer record, subscription, entitlement, or account was created or modified.
- No credentials, tokens, passwords, or private user data were printed or copied.
- Existing branch protection and required checks were preserved.

## 5. Recovery conclusion

The source of truth is recovered and the production baseline is verifiable. The remaining certification limits are execution-environment limits documented in Reports 209 and 210: authenticated QA identity/entitlement access and stable native-device execution. Those limits do not invalidate the source, CI, public production, or deterministic fixture evidence already collected.
