# Report 224 — Calora Plus Entitlement Final Release Attestation

**Date:** 2026-10-16
**Final production commit:** `cc07bcdcc4b76954f022e8b26eaf1893481ac361`
**Protected pull request:** [#183 — Fix RevenueCat entitlement credential separation](https://github.com/atembekong-hash/Calora/pull/183)

## Final verdict

**PASS — remediation source is merged, validated, and deployed.**

The live Android Plus outage was traced to an under-scoped RevenueCat API v2 credential. The API remained fail-closed throughout, returning a truthful unavailable state rather than Premium content. The provider scope has been corrected and the permanent source change now separates the read-only Plus credential from privileged deletion/promotion credentials.

## Completed changes

| Concern | Completed action |
|---|---|
| Plus entitlement verification | Added `REVENUECAT_ENTITLEMENT_API_KEY`; only `hasActivePremiumEntitlement` uses it. |
| Minimum provider scope | The dedicated RevenueCat key has only `customer_information:customers:read` and `project_configuration:entitlements:read`. |
| Privileged provider operations | `REVENUECAT_SECRET_API_KEY` remains isolated for account deletion and promotional grants. |
| Configuration | Railway production now has both credentials as separate secrets; no value is included in source, reports, test output, or client configuration. |
| Regression proof | Tests assert both entitlement API reads use the read key, and deletion remains independent of that key. |
| Android Scan tab label | PR #182 was already merged as `2b0c4d09b34ae40b1efce7e5ef71ec9bf42b5734`, keeping the native raised Scan control and label inside a shared inset-aware tab bar. |

## Protected validation evidence

| Validation | Result |
|---|---|
| PR #183 account-deletion fence validation | **PASS** (both required PostgreSQL 16 checks) |
| PR #183 release validation suite | **PASS** |
| PR #183 source-only release-attestation sub-step | **SKIPPED as expected** — the PR did not request sensitive release activation. |
| Main Release Validation run `38898632388` | **PASS** — all setup, dependency audit, typecheck, complete test suite, API/static/web production builds, and release-attestation gate passed. |
| Main commit | **PASS** — PR #183 squash-merged at `cc07bcdcc4b76954f022e8b26eaf1893481ac361` at 2026-10-16T12:09:58Z. |

## Production attestation

At the time of attestation:

- `https://mycaloraapp.com/health` returned `{"status":"ok"}`.
- `https://mycaloraapp.com/api/version` reported:

```text
gitCommit: cc07bcdcc4b76954f022e8b26eaf1893481ac361
sourceTree: da18a8daebc9c88a855d7112605ba7bc9c84e8cf
releaseId: calora-api-cc07bcdcc4b7-20261016121041307
buildTimestamp: 2026-10-16T12:10:41.307Z
```

- Railway production was online with no pending configuration work or reported service issue after the secret separation rollout.

## Physical-device evidence and limits

The signed, already-authorized Android QA APK was installed in place on the connected Samsung Galaxy S21 Ultra. The earlier Plus retry produced a live server HTTP 503 with `RevenueCatAuthenticationError`. After exact read-scope repair, that same native flow changed to the proper session-expired sign-in state and production logged HTTP 403 rather than the provider-authentication 503.

This proves the provider authorization defect was removed. It does **not** prove an authenticated Plus catalogue response because the device Supabase session expired before a Plus-entitled identity could be exercised.

The Scan tab-label source fix is production-web attested but needs the next explicitly authorized Android build/install before a fresh native binary can be physically marked PASS. No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was triggered by the remediation or this report.

## Remaining manual / environment-bound checks

1. Sign in on the Galaxy S21 Ultra with an authorized Plus QA account, then open Plus and verify a real recipe catalogue response.
2. Install the next explicitly authorized Android build containing commit `2b0c4d...` or later; visually confirm the Scan label is fully visible at the native bottom inset.
3. Continue the existing physical validation matrix for Auto/Barcode/Library/Voice Scan, Plan Program feedback, Today recipe rail, accessibility, and other native-only flows. Do not classify any of these as complete without actual device evidence.

## Security commitments preserved

- No entitlement, payment, or authentication check was bypassed.
- No customer record or subscription was altered to manufacture a passing result.
- Plus remained fail-closed during the outage.
- No native build was run after the user’s no-build operating rule took effect.
