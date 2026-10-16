# Report 223 — Calora Android QA, Plus Entitlement, and Tab-Bar Verification

**Date:** 2026-10-16
**Scope:** Galaxy S21 Ultra QA evidence, Android tab-bar label repair, and the live Plus entitlement incident.
**Native-build policy:** No new Android or iOS build was started during the remediation below. This report refers only to the already-authorized, signed Android QA artifact created earlier in this mission.

## Executive result

| Area | Result | Evidence boundary |
|---|---|---|
| Signed Android QA artifact | **PASS** | Earlier in-mission artifact verification confirmed the APK package identity, signature, and expected production association before it was installed in-place on the Galaxy S21 Ultra. |
| Galaxy ADB access and Calora launch | **PASS** | Samsung Galaxy S21 Ultra was detected by ADB; the installed package launched without an app-process crash. |
| Native Scan tab label | **FIXED / source deployed** | PR #182 corrected the native bottom-bar geometry so the raised Scan control and its label share one inset-aware bar height. Production attestation reports commit `2b0c4d09b34ae40b1efce7e5ef71ec9bf42b5734`. The fix requires the next explicitly authorized Android build before it can be called physically verified in a new binary. |
| Plus provider outage | **FIXED at provider authorization boundary** | The prior Galaxy request returned HTTP 503 and the API logged `RevenueCatAuthenticationError`. After correcting the read-key scope, the same device flow transitioned to the honest **“Your session ended. Sign in again.”** state and production logged HTTP 403 instead of 503. |
| Authenticated Plus catalogue | **BLOCKED** | The physical device’s Supabase session expired during verification. The entitlement/provider path is no longer returning the misleading 503, but no authenticated Plus user was available to prove catalogue access or entitlement behavior. |
| Account-deletion credential safety | **HARDENED** | A dedicated read-only entitlement credential is separated from the existing privileged deletion/promotion credential. Source changes and tests are pending protected merge at the time this report was drafted. |

## Android tab-bar finding and repair

### Reproduction

On the Galaxy S21 Ultra, the lower part of the raised Scan control was outside the effective native tab-bar viewport: the Scan icon was visible, but its **“Scan”** label was clipped. The other native tab labels remained visible.

### Root cause

The navigator used a fixed native bar height while the custom raised Scan control used additional vertical space. Android’s bottom system inset left too little content height for the Scan label frame.

### Remediation

PR [#182](https://github.com/atembekong-hash/Calora/pull/182) makes the bar height inset-aware and uses that same geometry for the custom control. The change keeps the native safe-area padding inside the tab bar rather than letting it consume the label’s visible content area.

### Validation

- Focused `tabsLayout.test.ts`: passed.
- Full Calora client suite: **157 files / 1,760 tests passed** before PR creation.
- Protected PR checks: Release validation and both account-deletion fence checks passed; the release-attestation sub-step was skipped as expected because this source-only PR did not include a sensitive release attestation request.
- PR #182 squash-merged to protected `main` as `2b0c4d09b34ae40b1efce7e5ef71ec9bf42b5734`.
- Public `/health` returned `{"status":"ok"}` and `/api/version` attested the same merge commit.

## Plus incident forensic timeline

### Failure evidence

The Galaxy’s Plus retry issued live requests to:

```text
GET https://mycaloraapp.com/api/v1/premium-recipes
```

Production Railway logs recorded HTTP **503** responses together with the bounded class name `RevenueCatAuthenticationError`. The application correctly failed closed and did not grant Plus access.

### Exact root cause

The Plus authorization routine performs two API v2 reads:

1. `GET /v2/projects/{project}/entitlements?limit=100` to resolve Calora’s opaque entitlement id from lookup key `caloraapp_pro`.
2. `GET /v2/projects/{project}/customers/{user}/active_entitlements` to check that user’s active access.

RevenueCat documents that these calls require, respectively:

- `project_configuration:entitlements:read`
- `customer_information:customers:read`

The initial replacement key had customer read access only. Therefore it still could not complete the first entitlement-definition lookup. This was a least-privilege configuration gap, not an outage, a payment bypass, or a client-rendering defect.

### Provider remediation

A dedicated RevenueCat API v2 key was created with only the two required read permissions:

- **Customer information → Customers: Read only**
- **Project configuration → Entitlements: Read only**

No write permission was granted to the new key. The pre-existing privileged key was restored for account deletion and promotional operations, then stored separately from the read-only key in Railway. No secret value is recorded in this report, source tree, test output, or client bundle.

### Physical re-test

After the exact scope correction, the same native retry no longer showed **“Plus is unavailable”**. It showed:

> Sign in for Plus recipes
> Your session ended. Sign in again.

The matching production requests were HTTP **403**, while other recipe-media requests from the same Galaxy continued returning HTTP 200. This demonstrates that the prior server-side provider-authentication failure was resolved and that the expired user session is now surfaced accurately.

## Permanent source hardening

The pending source change introduces `REVENUECAT_ENTITLEMENT_API_KEY`:

- `hasActivePremiumEntitlement` uses only the dedicated read key.
- `grantPromoDays` and `deleteRevenueCatSubscriber` continue to use `REVENUECAT_SECRET_API_KEY`.
- Regression coverage proves both Plus reads send the read key and that the deletion path remains operable even when the read key is absent.
- The example environment contract documents the exact minimal permissions required.

This reduces blast radius: a Plus read credential cannot be used by the server’s deletion or promotional operations.

## Validation completed for the pending hardening

| Check | Result |
|---|---|
| Focused `revenuecat.test.ts` | **PASS — 9 / 9** |
| API workspace declaration emission | **PASS** |
| API TypeScript check after declaration emission | **PASS** |
| `git diff --check` | **PASS** |
| API offline suite | **Environment-blocked, not a product regression** — 423 tests passed; 34 tests / 8 suites could not initialize because the sandbox intentionally has no `DATABASE_URL` or OpenAI integration configuration. The focused entitlement suite is independent of those unavailable services and passed. |

## Production status and remaining evidence

- Railway production services were online after the configuration deployment.
- Public health was healthy; the runtime version endpoint attested PR #182’s merged commit.
- The credential-separation source change still requires protected GitHub validation, merge, Railway source rollout, and re-attestation before it is production-source complete.
- The Galaxy session must be signed in again to complete a real authenticated Plus catalogue test. That test must not be called PASS until an entitled QA identity produces a real Plus response.
- The Android tab label source repair also requires the next explicitly authorized Android build/install for direct physical-device confirmation. **No additional native build was triggered.**

## Security and data-integrity commitments

- No subscription, entitlement, payment, or authentication control was bypassed.
- No existing customer data was modified.
- No secret was committed or intentionally output.
- Plus remained fail-closed throughout the incident; the app never served Premium content on provider-verification failure.
