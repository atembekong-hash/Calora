# Calora First Controlled Coach Fact Context Activation — Blocked Evidence

**Verification date:** 2026-08-22  
**Scope:** Read-only production preflight and supported control-plane assessment.

## 1. Stop condition

The approved single-account activation did not begin. No production activation
state changed, no Fact Context provider request was made, and no nonce was
created.

The required supported production control-plane write path cannot be established
from the project’s existing authorized infrastructure:

| Control | Supported surface found | Result |
| --- | --- | --- |
| Process gate | Production environment-variable administration | Available, but not used |
| Global rollout gate | Server-owned operational configuration record | No supported production writer |
| Reviewed cohort membership | Server-owned cohort record | No supported production writer |

Production database access available to this verification is read-only. The
project has no existing authenticated administrative route or other approved
server-side writer for the global rollout record or reviewed cohort. Direct
production SQL, a temporary or public administration endpoint, an authentication
bypass, and a deployment workaround are prohibited and were not attempted.

Because all required controls must be changed and verified through a supported,
auditable mechanism before activation, the absence of writers for the two
server-owned database controls is a blocking safety invariant.

## 2. Repository and source preflight

The repository was cleanly aligned with `origin/main` at the time of this
preflight. The reviewed server, mobile, and generated request/response schemas
permit exactly these Fact Context keys:

```text
daily.calorie_status
daily.protein_status
```

No meal-distribution, logging-completeness, or other Fact Context key is
allowlisted in the reviewed construction, validation, or observation paths.

## 3. Production health and authorization preflight

The active public autoscale deployment reported a successful build. Fresh checks
returned:

| Control | Result |
| --- | --- |
| API endpoint | `200` |
| Health endpoint | `200` |
| Normal recipe endpoint | `200` |
| Entitled Premium control | `200` |
| Anonymous Premium control | `401` |
| Confirmed non-entitled Premium control | `403` |
| Approved pilot authentication | Pass |
| Approved pilot server-managed internal-test and activation-purpose markers | Present |
| Approved pilot current consent | `consented_current` |
| Approved pilot missing-customer Premium control | `403` |
| Fact Context endpoint while process gate is off | `404` |
| Legacy Coach route availability check | Available |

No account identifier, credential, token, fact value, prompt, or provider
response is retained in this report.

## 4. Fresh deny-all state

```text
process_gate=off
global_rollout_enabled_count=0
active_reviewed_cohort_count=0
total_reviewed_cohort_count=0
current_consent_count=1 (approved pilot only)
unexpired_nonce_count=0
eligible_account_count=0
ordinary_user_eligibility=0
percentage_rollout=none
```

No ordinary user can become eligible in this state. The client Fact Context
capability remains off, and Legacy Coach remains available without routing an
unavailable Fact Context request to Legacy.

## 5. Required future path

The read-only verification environment documented here cannot make production
mutations. The approved operator-only control-plane path is now documented in
[`COACH_FACT_CONTEXT_OPERATOR_CONTROL_PLANE.md`](./COACH_FACT_CONTEXT_OPERATOR_CONTROL_PLANE.md):

- Publishing production-secret settings govern the process gate;
- the managed Database **My Data** surface governs the global rollout record
  and one reviewed cohort membership; and
- the protected change record captures approval, sanitized evidence, and every
  read-back/rollback transition.

The activation may be reconsidered only when an authorized production operator
uses that path and completes its approval checkpoint. No substitute account,
percentage rollout, broader fact boundary, direct production SQL, temporary or
public administration endpoint, authentication bypass, or deployment workaround
is authorized.

## 6. Residual risks

- Treating a public route, a script, or an end-user session as an operator
  control plane would bypass the approved review boundary.
- Skipping a control-panel read-back or the protected change record would make
  an unexpected state harder to reconstruct and contain.
- This evidence remains a read-only historical snapshot. The new operator path
  is not evidence that an activation occurred.

FIRST CONTROLLED ACTIVATION VERDICT: HOLD — OPERATOR APPROVAL AND EXECUTION REQUIRED