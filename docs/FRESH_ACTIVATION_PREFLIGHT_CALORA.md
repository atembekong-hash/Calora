# Fresh Activation Preflight — Calora

**Authorization date:** 2026-08-23  
**Scope:** Fresh single-account Coach Fact Context activation preparation only.  
**Execution:** Read-only; no production control, cohort, consent, nonce, or
provider request was created or changed.

## Authorized boundary

- One previously approved internal pilot only.
- No new cohort membership was created.
- No percentage rollout, additional account, Phase 2C, Legacy Coach retirement,
  or fact-boundary expansion was attempted.
- Approved fact keys remain `daily.calorie_status` and
  `daily.protein_status` only.

## Read-only checks that passed

| Check | Result |
| --- | --- |
| Active production deployment | Autoscale deployment with successful build |
| `GET /api` | `200` |
| `GET /api/healthz` | `200` |
| Process gate | Off; Fact Context route returned `404` |
| Global rollout | Exactly one row; JSON boolean `false`, not string `"false"` |
| Coach cohort | Zero total and zero active reviewed/unexpired members |
| Eligible account count | `0` |
| Pilot consent | One current, unrevoked consent record for approved version |
| Pilot nonce | Zero unexpired records |
| Percentage rollout | None |
| Anonymous Premium control | `401` |
| Legacy Coach route | Available; authenticated route returned `401` |
| Required provider secret presence | Present without exposing values |
| Fact boundary | Exact calorie/protein-only source and generated contract |
| Deployment-log inspection | No returned unresolved deployment entries |

## Blocking checks

1. **Repository parity is not clean.** Local `main` is four commits ahead of
   `origin/main`; fresh-attempt preparation must not continue until the
   repository state is reconciled and reviewed.
2. **The approved pilot authentication fixture cannot be safely reverified from
   available read-only evidence.** The fixture credential is intentionally not
   recorded in the repository, and guessing or substituting credentials is not
   authorized.
3. **A fresh live Premium `200 / 401 / 403` triplet cannot be completed under
   this one-pilot authorization.** The anonymous `401` passes, but a live
   `200` requires the separate entitled controlled account. Selecting that
   account would violate the no-additional-account restriction. The approved
   pilot's authenticated `403` also remains unverified until its authorized
   fixture is made available through the protected operator checkpoint.

## Operator checkpoint

No fresh change reference, `reviewed_at`, or `expires_at` was generated. Those
values must be created only immediately before an authorized protected
membership write, after every blocking item is resolved and recorded in the
access-controlled change record.

No membership clock has started. Production remains deny-all.

FRESH ACTIVATION PREFLIGHT VERDICT: BLOCKED