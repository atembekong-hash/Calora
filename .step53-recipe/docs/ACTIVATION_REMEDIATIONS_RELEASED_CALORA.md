# Calora Activation Remediations — Released Production Verification

**Release verification date:** 2026-08-22  
**Deployed revision:** `1ed2a3f67ddede61409b32f7b7ca372dc232e993`  
**Scope:** Release and verification only. Coach Fact Context remained dark.

## 1. Release contents

The published runtime source contains the two code remediations reviewed for the
next controlled activation:

1. **Two-fact boundary:** mobile construction, server validation, generated
   request/response schemas, and observation validation now permit only
   `daily.calorie_status` and `daily.protein_status`.
2. **Stable missing-customer denial:** RevenueCat authorization now treats a
   missing customer as a fail-closed access denial rather than an upstream
   dependency failure.

The approved pilot-account preparation remains a separate identity and
server-owned-consent prerequisite; it did not authorize rollout controls.

No unrelated runtime activation changes were present in the release delta. The
other changes since the prior production baseline are tests, generated schemas,
and documentation supporting these remediations.

## 2. Regression results before publishing

| Check | Result |
| --- | --- |
| API typecheck | Pass |
| Calora typecheck | Pass |
| API test suite | Pass |
| Calora test suite | Pass — 60 files, 1,006 tests |
| Fact Context allowlist/schema tests | Pass |
| Coach coordinator and consent tests | Pass |
| Replay/lifecycle coverage | Pass |
| RevenueCat authorization tests | Pass |

The aggregate workspace typecheck remains blocked by unrelated type errors in
the mockup-sandbox artifact. That artifact is not part of the released API or
Calora runtime delta; its errors were not changed, suppressed, or worked
around for this release.

## 3. Production health and Premium controls

| Production check | Result |
| --- | --- |
| `GET /api` | `200` |
| `GET /api/healthz` | `200` |
| Normal recipe API | `200` |
| RevenueCat v2 project lookup | `200` |
| RevenueCat v2 entitlement lookup | `200` |
| Entitled Premium Recipes control | Authenticated `200` |
| Anonymous Premium Recipes control | `401` |
| Authenticated confirmed non-entitled QA control | `403` |

The release preserves the required health and normal Premium authorization
controls.

## 4. Missing RevenueCat customer behavior

The released source and its regression coverage implement the reviewed stable
fail-closed denial behavior for a missing RevenueCat customer.

Live production proof using the only approved pilot account could not be
completed because that account failed the production authentication gate before
an authenticated Premium request could be made. No substitute account was used,
and no new test account was created. The prior `503` regression is therefore
not cleared by a live production request in this report.

## 5. Initial pre-repair pilot-account and consent verification (historical)

Only the previously approved original pilot identity was examined. In the
production authentication system it was found but did not meet the required
readiness conditions:

- its email is not confirmed;
- the expected internal-test and authorization-purpose designations are absent;
- it cannot authenticate through the approved internal fixture.

Consequently, the server-owned consent state could not be read or established
through an authenticated production session. No consent mutation occurred and
no other account was substituted.

## 6. Deployed two-fact boundary proof

The published revision’s mobile `COACH_FACT_KEYS`, server allowlist and exact
value mappings, generated request schemas, generated response observation
schemas, and deterministic claim validation contain only:

```text
daily.calorie_status
daily.protein_status
```

`daily.meal_distribution` and `daily.logging_completeness` are absent from the
production-capable Fact Context construction, acceptance, schema, selection,
and observation paths. No broader Foundation fact is allowlisted.

## 7. Client capability readiness

The reviewed mobile source contains the narrowed Fact Context implementation,
but `intelligence.coach.fact_context` remains compile-time `false`. It returns
to Legacy Coach before transport while dark.

The safe eventual mechanism is a separately reviewed mobile release that
changes only this narrowly scoped flag to `true`. That client release alone
cannot expose ordinary users: the production server must still require the
process gate, global database gate, reviewed cohort membership, and current
server-owned consent. Those controls remain independently deny-all.

## 8. Initial pre-repair production dark-state snapshot (historical)

This snapshot was taken during the release verification before the later
approved-pilot authentication repair described in section 9. Its zero consent
count is a historical baseline, not the final post-repair state.

```text
process_gate=unset/off
global_rollout_enabled_count=0
active_reviewed_cohort_count=0
fact_context_consent_count=0
fact_context_nonce_count=0
eligible_account_count=0
fact_context_route_log_matches=0
percentage_rollout=none
```

No Fact Context provider request, nonce, cohort membership, global rollout
configuration, process-gate setting, or client capability change was made.
Legacy Coach remains the unavailable-path fallback. No production consent had
been created at the time of this pre-repair snapshot.

## 9. Final post-repair approved-pilot production verification

This verification occurred after the initial pre-repair snapshots in sections 5
and 8. The following evidence supersedes those historical readiness findings
for the same approved pilot only.

The same previously approved pilot identity was repaired through the
server-side Supabase administrative path only. Its confirmation and reviewed
internal-test and activation-purpose markers were restored without recording
its identity, email address, credential, or token.

The approved fixture then authenticated that exact account successfully. No
other account was inspected, created, substituted, enrolled, or used to
establish the required evidence.

Using only that authenticated session:

1. the server-owned consent status was read;
2. the current reviewed consent was established when absent, using the
   authenticated consent-acceptance endpoint and document version
   `2026-08-21`;
3. a subsequent server read returned `consented_current`; and
4. the authenticated Premium request for the account without a RevenueCat
   customer returned the reviewed stable `403` denial:
   `Premium access is not available for this account.`

The authenticated Coach Fact Context route remained unavailable with `404`
before request-body handling. This proves the process gate remains off for the
prepared account; no Fact Context request, nonce, provider egress, or Legacy
Coach fallback occurred.

## 10. Final production control snapshot

Immediately after the post-repair approved-pilot verification, read-only
production checks against the deployed revision identified at the top of this
report returned:

```text
process_gate=off (authenticated Fact Context route=404)
global_rollout_enabled_count=0
active_reviewed_cohort_count=0
fact_context_consent_count=1 (approved pilot only)
fact_context_nonce_count=0
eligible_account_count=0
percentage_rollout=none
```

Public production health checks returned `200` for the API, health endpoint,
and ordinary recipe endpoint. The anonymous Premium control returned `401`.
The API and Calora typechecks, API test suite, and Calora test suite passed.

## 11. Source reconciliation and final boundary proof

The repository was safely reconciled with the latest remote history without
accepting stale changes that would have reintroduced unapproved Fact Context
facts or removed the stable missing-customer denial. The resulting reviewed
source remains traceable to the released remediation revision and contains:

```text
daily.calorie_status
daily.protein_status
```

No meal-distribution, logging-completeness, or other Foundation fact is
allowlisted in the mobile construction, server validation, generated schemas,
or observation validation paths. RevenueCat v2 entitlement checks remain in
place, with a missing customer treated as an explicit fail-closed access
denial.

This report intentionally contains no account identifier, email, credential,
token, prompt, fact value, or provider response content. The PASS verdict is
based only on the post-repair snapshot in sections 9 and 10: one current
consent for the approved pilot, stable authenticated `403` and `404` checks,
and independently deny-all process, global-rollout, and cohort controls. The
repaired pilot remains prepared but ineligible because consent does not
override those controls.

## 12. Subsequent activation-review handoff

After this remediation verification passed, the separately authorized
one-account activation review rechecked the prepared pilot and deny-all state.
It did not start activation because this environment has supported production
read access and deployment metadata access, but not the approved control-plane
write access required to change the process gate, global rollout, or reviewed
cohort.

The subsequent review left the following unchanged:

```text
process_gate=off
client_fact_context_capability=off
global_rollout_enabled_count=0
active_reviewed_cohort_count=0
current_fact_context_consent_count=1 (approved pilot only)
unexpired_fact_context_nonce_count=0
eligible_account_count=0
provider_requests_since_remediation_release=0
```

This does not reverse the remediation PASS. It clarifies the next boundary:
the first live one-account activation may resume only with a production
operator who has supported control-plane access and follows the separately
approved, reversible sequence. No public or temporary administrative endpoint,
ad-hoc production SQL, deployment workaround, percentage rollout, or
substitute account is approved.

## 13. Post-reconciliation verification

The repository was reconciled with the latest reviewed `origin/main` history
without changing runtime remediation code. The released runtime remains
traceable to revision `1ed2a3f67ddede61409b32f7b7ca372dc232e993`; the
post-reconciliation source adds only reviewed governance and verification
records.

Fresh checks after reconciliation passed:

| Check | Result |
| --- | --- |
| Repository parity | Local `main` and `origin/main` are cleanly aligned |
| API and Calora typechecks | Pass |
| API and Calora test suites | Pass |
| Public API, health, and normal recipe endpoints | `200` |
| RevenueCat v2 project and entitlement reads | `200` |
| Entitled / anonymous / confirmed non-entitled Premium controls | `200` / `401` / `403` |
| Approved pilot confirmation and authentication | Pass |
| Approved pilot server-managed internal-test and activation-purpose designations | Present |
| Approved pilot current consent | `consented_current`, document `2026-08-21` |
| Approved pilot missing-RevenueCat-customer Premium check | Stable `403` |
| Approved pilot Fact Context dark-route check | `404` before body handling |

The production control snapshot remains deny-all: the process gate is unset,
the enabled global-rollout count and active reviewed-cohort count are zero,
there is one current consent for the approved pilot only, nonce count is zero,
and eligible-account count is zero. No Fact Context provider request, cohort
membership, rollout configuration, or client-capability change occurred during
this verification.

ACTIVATION REMEDIATION VERDICT: PASS — FIRST CONTROLLED ACTIVATION MAY RESUME