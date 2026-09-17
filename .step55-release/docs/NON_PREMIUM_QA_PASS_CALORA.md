# Calora non-Premium QA deny proof

**Verification date:** 2026-08-22  
**Scope:** Dedicated internal QA account creation and live production proof of
the Premium Recipes non-Premium deny path. Coach Fact Context remained dark.

## Verification result

| Required check | Result |
| --- | --- |
| Dedicated internal QA account | Created and confirmed |
| QA authentication | Succeeded |
| RevenueCat identity resolution | Succeeded through Calora's supported mobile identity path |
| RevenueCat v2 customer lookup | `200` |
| Active `caloraapp_pro` entitlement | Absent |
| QA subscriptions | Absent |
| QA Premium Recipes request | `403` |
| Existing entitled control | `200` |
| Anonymous control | `401` |
| Production `/api` | `200` |
| Production `/api/healthz` | `200` |
| Coach Fact Context rollout/cohort/consent/nonce | All remain `0` / dark |

## Dedicated QA account

One new confirmed internal-only QA account was created in the existing Supabase
Auth project using the project's secure test credential mechanism. It has no
existing production customer profile, subscription history, Premium grant,
Coach Fact Context consent, or cohort membership.

No password, email, Supabase user ID, RevenueCat customer ID, bearer token, or
other account identifier is included in this report.

## RevenueCat non-entitlement verification

The server management connector did not authorize its customer-create endpoint,
so the account identity was established through Calora's existing
mobile-supported RevenueCat subscriber-resolution path instead. That supported
path returned `201`.

Subsequent read-only RevenueCat v2 checks returned:

- customer lookup: `200`;
- active-entitlement lookup: successful with no active `caloraapp_pro`;
- subscription lookup: successful with no subscriptions.

No entitlement, subscription, purchase, or other customer state was created or
modified. No existing customer state was changed.

## Production deny proof

The new QA account authenticated successfully. Exactly one authenticated
production request was made as that account:

`GET /api/v1/premium-recipes?limit=1`

Result: `403`.

This is the required live non-Premium deny-path proof. It did not use an
anonymous session, the entitled account, a broken fixture, a local-only test,
or a synthetic authorization result.

## Control checks

- Existing entitled internal test account: authenticated production Premium
  Recipes request returned `200`.
- Anonymous Premium Recipes request: returned `401`.
- RevenueCat v2 entitlement and customer listings: both returned `200`.
- Production API health: both `/api` and `/api/healthz` returned `200`.

## Coach Fact Context dark-state boundary

No Coach Fact Context process-gate setting, rollout configuration, cohort
membership, consent row, nonce row, provider request, or controlled activation
was created or changed.

Post-verification production read-only counts:

- rollout configuration rows: `0`;
- active `coach_fact_context_v1` cohort rows: `0`;
- Fact Context consent rows: `0`;
- Fact Context nonce rows: `0`.

## Follow-up

No manual follow-up is required to close the Premium Recipes production deny
proof. The previously authorized single-account Coach Fact Context controlled
activation may resume under its existing governance controls; this task did not
activate it.

NON-PREMIUM QA VERDICT: PASS — PRODUCTION HEALTH BLOCKER CLOSED