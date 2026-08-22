# Calora non-Premium deny proof

**Verification date:** 2026-08-22  
**Scope:** Production proof for the authenticated, non-Premium Premium Recipes
deny path. Coach Fact Context remained completely dark.

## Required proof

The required verification is one authenticated production request by an existing
approved internal Calora test account with no active `caloraapp_pro`
entitlement:

`GET /api/v1/premium-recipes?limit=1`

Expected result: `403`.

## Approved-account discovery result

No explicitly designated non-entitled controlled account and mapped credential
was found in the available project verification materials.

Existing evidence establishes that:

- the approved entitled internal account can authenticate and receive Premium
  access;
- RevenueCat has customers without the Premium entitlement; and
- the older documented QA fixture is not a usable authenticated substitute.

Those facts do **not** designate any particular non-entitled customer as an
approved internal test account. Selecting one based only on absent entitlement
would violate the required controlled-account boundary.

## Verification performed

No Supabase authentication was attempted for an undesignated account.

No RevenueCat customer was selected for testing.

No authenticated Premium Recipes request was made.

No anonymous, synthetic, broken-fixture, entitled-account, or local-only
substitute was used.

## Coach Fact Context boundary

No Coach Fact Context process gate, rollout configuration, cohort membership,
consent record, nonce, provider request, or account enrollment was created,
changed, or activated.

## Next required action

An approved existing internal Calora test account with no active
`caloraapp_pro` entitlement must be designated and its existing credential
mapping made available to the controlled verification harness. After that,
perform exactly one authenticated production Premium Recipes request and record
only authentication success, entitlement absence, HTTP status, and outcome.

NON-PREMIUM DENY VERDICT: BLOCKED