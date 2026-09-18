# Calora Whole-App Bug-Minimization Verification Report

**Report date:** September 9, 2026  
**Assessment type:** Repository-wide implementation and verification audit  
**Primary objective:** Determine whether Calora currently applies the recommended bug-minimization strategy across the entire application  
**Artifacts assessed:** Calora Expo mobile app, API Server, shared API contracts, native release tooling, automated tests, CI workflows, release controls, and operational diagnostics  
**Overall result:** **PARTIALLY VERIFIED — WHOLE-APP RELEASE CERTIFICATION REMAINS NO-GO**

---

## 1. Executive Summary

Calora has a strong local engineering foundation. The current repository has extensive automated unit and integration coverage, generated API contracts, strict server validation, numerous race-condition and account-isolation protections, specialized release preflights, structured API logging, health checks, and mature safety controls around sensitive paths such as Coach and account deletion.

The current workspace verification established all of the following:

- The root workspace TypeScript verification passes.
- The API server typecheck passes.
- The Calora app typecheck passes.
- The API test suite passes with **471 tests passed and 4 skipped**.
- The Calora test suite passes with **1,224 tests passed**.
- Calora’s six static-server security tests pass.
- The API server builds and starts successfully.
- The API server listens on port `8080`.
- Expo Metro starts successfully.
- Generated OpenAPI clients and Zod validators compile successfully.
- The expanded Coach Fact Context path passes focused and adversarial tests.
- Both configured Calora and API development workflows are running.

These results prove that Calora is in good local code health. They do **not** prove that the entire application works correctly on real iOS and Android devices or that every production integration is operational.

The strongest remaining risk is not ordinary TypeScript or isolated business-logic failure. It is failure at application boundaries:

- Native OS behavior
- Signed build behavior
- Authentication provider delivery
- Universal Links and Android App Links
- Camera, barcode, HealthKit, Health Connect, notifications, and share sheets
- RevenueCat purchase lifecycle behavior
- App lifecycle interruption and restoration
- Production deployment identity
- Live observability and alerting
- CI enforcement of the complete release gate

The native authentication preflight was executed during this audit. It returned **blocked** because no installable iOS or Android binary and no selected native device or simulator were available. All ten native authentication and callback cases remained `not-run`.

Accordingly, the correct conclusion is:

> Calora’s local verification is strong, but whole-app native and production verification is incomplete. The repository should not be represented as fully release-certified until signed-device critical flows and production controls are independently verified.

---

## 2. Audit Question

The audit evaluated whether the following recommended strategy is true across the entire app:

1. Critical user flows are automated and treated as release blockers.
2. API boundaries are contract-first and schema-validated.
3. State transitions and concurrency edges are tested.
4. Tests use deterministic fixtures and controlled dependencies.
5. CI provides layered fast, integration, and release gates.
6. Risky changes use progressive rollout and rollback controls.
7. Production failures are observable through actionable diagnostics and alerting.

The final finding is not a binary “yes.” The strategy is implemented unevenly:

- **Strongly implemented:** local type safety, unit/integration testing, schema contracts, many state-transition protections, API logging, and selected safety-critical controls.
- **Partially implemented:** native test definitions, release preflights, rollout controls, deterministic live-integration coverage, and critical-flow automation.
- **Not implemented or not evidenced:** a comprehensive CI gate, complete native-device execution, broad production observability, automatic canary promotion, and automatic rollback.

---

## 3. Scope

### 3.1 Included

The audit included:

- Workspace-level scripts
- Calora Expo app
- Calora native configuration
- API Server
- Shared OpenAPI specification
- Generated API clients
- Generated Zod validators
- API and client automated tests
- Maestro native flow definitions
- Native release preflight scripts
- GitHub Actions workflows
- API release identity and attestation controls
- Coach rollout controls
- Health and readiness endpoints
- Structured logging and redaction
- Existing production-readiness and native-validation documents

### 3.2 Excluded or unavailable

The audit could not directly execute:

- A signed iOS binary
- A signed Android binary
- A booted iOS simulator selected by UDID
- A connected Android target selected by serial
- App Store or Play Store distribution
- Physical-device camera behavior
- Physical-device barcode behavior
- HealthKit
- Health Connect
- Native notification delivery
- Native share sheets
- Real RevenueCat purchase and restore flows
- Full real-provider authentication callback delivery
- A production deployment or rollback

These exclusions are not administrative footnotes. They are the main reason the final verdict remains NO-GO for whole-app certification.

---

## 4. Verification Method

### 4.1 Repository inspection

The audit inspected:

- Root and artifact package scripts
- GitHub Actions workflows
- EAS build profiles
- Native Maestro test definitions
- Native auth preflight implementation
- API build and release-attestation implementation
- API health and logging implementation
- Coach rollout and fail-closed controls
- Existing readiness reports
- Current domain and callback configuration

### 4.2 Commands executed

The following checks were executed against the current workspace:

```text
pnpm run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/calora run typecheck
pnpm --filter @workspace/calora run test
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/calora run test:release:native-auth-preflight
```

Configured Calora and API workflows were restarted and inspected after the Coach expansion work.

### 4.3 Status definitions

This report uses the following evidence levels:

- **Verified:** Executed successfully in the current workspace or directly established from current implementation plus passing tests.
- **Partially verified:** Implementation and tests exist, but an important runtime layer was not executed.
- **Blocked:** A verification mechanism exists but could not run because a required artifact, target, permission, or tool was unavailable.
- **Not verified:** No current direct evidence establishes the behavior.
- **Not implemented:** The expected mechanism was not found.
- **Contradictory:** Current configuration and historical or procedural evidence disagree.

---

## 5. Current Verification Results

### 5.1 Workspace type safety

**Status: VERIFIED**

The root workspace typecheck passed.

Projects included in the successful workspace check:

- API Server
- Calora
- FatSecret gateway
- Mockup sandbox
- Shared scripts
- Workspace libraries through TypeScript project references

This proves that the current TypeScript project graph is internally consistent at compile time.

It does not prove:

- Native module availability on a device
- Provider credentials and permissions
- Runtime OS behavior
- Production environment correctness

### 5.2 API automated tests

**Status: VERIFIED**

Current full API result:

- **37 test files passed**
- **1 test file skipped**
- **471 tests passed**
- **4 tests skipped**

The API suite includes coverage for:

- Coach Fact Context
- Coach consent
- Coach rollout
- Legacy Coach retirement
- Account deletion
- Account deletion fence behavior
- Account isolation
- Sync
- Diary routes
- Profile routes
- Weight routes
- Planner generation
- Recipe generation
- Premium recipes
- Restaurant food provider handling
- Capture and barcode matching
- RevenueCat entitlement checks
- Referrals
- Universal links
- Public pages
- Health endpoint behavior
- CORS
- Logging
- Provider failure normalization
- Rate limiting
- Idempotency
- Recovery-warning suppression

### 5.3 Calora automated tests

**Status: VERIFIED**

Current full Calora result:

- **88 test files passed**
- **1,224 tests passed**
- **6 static-server security tests passed**

The suite includes substantial coverage for:

- Local hydration and retry behavior
- Persistence guards
- Clear-all behavior
- Account switching
- Notification ownership and inbox behavior
- Coach lifecycle fencing
- Coach response validation
- Guest Coach isolation
- Diary sync conflict handling
- Nutrition goals
- Planner editing
- Recipe handling
- Premium recipe access
- Referral persistence
- Encrypted recovery logic
- Health normalization
- Home screen behavior
- Profile interactions
- Onboarding resumption and review
- Meal image identity and fallback
- Progress calculations
- Rapid interaction guards

### 5.4 Test warnings

**Status: NON-BLOCKING, BUT SHOULD BE TRACKED**

The Calora suite reports React test warnings indicating that some Profile screen state updates are not wrapped in `act(...)`.

The tests still pass. These warnings are not evidence of a production defect, but they reduce confidence that all rendered state transitions are observed exactly as React expects.

Risk:

- A test may pass while an asynchronous rendered update is not fully settled.
- Warning noise can hide a future, more meaningful test warning.

Recommended disposition:

- Correct the affected Profile test interactions.
- Treat new `act(...)` warnings as test-quality regressions.

---

## 6. Evaluation Against the Recommended Bug-Minimization Strategy

## 6.1 Critical-flow release gate

**Status: PARTIALLY IMPLEMENTED, NOT EXECUTED END TO END**

Calora has individual tests and specialized native flows, but it does not currently have one complete release gate that exercises the critical user journey from authentication through data use and account lifecycle.

### Existing native Maestro flows

The repository contains:

1. Nutrition goals
2. Meal image rendering and fallback
3. Plus recipe rapid scrolling
4. Encrypted recovery

### Existing coverage

The nutrition-goals flow covers:

- Clean onboarding
- Macro editing
- Save behavior
- Cancel behavior
- Invalid values
- Keyboard-open interaction
- Accessibility labels
- Persistence after relaunch

The meal-image flow covers:

- Breakfast image rendering
- Lunch image rendering
- Dinner image rendering
- Snack image rendering
- Deliberate fallback states
- Swapped-key states

The Plus recipe flow covers:

- Rapid horizontal interaction
- Grid persistence
- Conditional loading
- Error and retry states

The encrypted-recovery flow covers:

- Production persistence adapters
- SecureStore interaction
- Migration behavior
- Tamper rejection
- Encrypted export
- Account switching
- Clear-all isolation

### Missing unified critical flow

No current automated native flow proves the complete sequence:

1. Install a signed build
2. Launch from a clean state
3. Sign up or sign in
4. Complete or resume onboarding
5. Log a meal
6. Edit and delete a meal
7. Scan or capture food
8. Confirm and save to Today
9. View Progress
10. Ask Coach a supported question
11. Exercise subscription state
12. Sign out
13. Switch accounts
14. Verify account isolation
15. Delete the account
16. Relaunch and confirm cleanup

### Conclusion

The building blocks exist, but the recommended release-blocking critical-flow gate is not complete and has not been executed on both platforms.

---

## 6.2 API contract-first validation

**Status: STRONGLY VERIFIED**

This is one of Calora’s strongest areas.

### Confirmed controls

- OpenAPI defines the shared API contract.
- Generated client types are used by Calora.
- Generated Zod validators are used at server and client trust boundaries.
- API code generation completes successfully.
- Workspace typechecking validates generated contract compatibility.
- Strict routes reject malformed and unknown fields.
- Sensitive payloads use exact allowlists.
- Provider responses are parsed and validated before rendering.

### Coach example

The Coach Fact Context route enforces:

- Exact fact keys
- Exact fact value keys
- Exact deterministic statements
- Exact limitations
- Bounded message counts
- Bounded aggregate message size
- Bounded individual string size
- Bounded nesting depth
- Strict timestamps
- Short TTL
- Request nonce
- Duplicate-request prevention
- Account eligibility
- Current consent
- Rollout authorization
- Completion-time reauthorization
- Risk scanning before provider egress

### Residual contract risk

Generated types cannot prove:

- A live provider follows its external contract.
- A production deployment uses the expected generated version.
- A mobile store build and API deployment remain version compatible.

Those risks require deployment identity checks and staged compatibility testing.

---

## 6.3 State-transition and concurrency testing

**Status: STRONG LOCAL COVERAGE; NATIVE LIFECYCLE COVERAGE INCOMPLETE**

### Confirmed

The repository contains protections and tests for:

- Pending-request cancellation
- Account identity changes
- Hydration generation changes
- Sign-out during asynchronous work
- Clear-data invalidation
- Nonce replay
- Duplicate OAuth callback delivery
- Persistence hydration failure
- Autosave blocking after hydration failure
- Serialized destructive clearing
- Notification ownership changes
- Diary sync retry and rejection handling
- Rapid repeated interactions

### Important examples

Coach responses are discarded when:

- The active account changes
- Hydration generation changes
- Consent changes
- Clear-history occurs
- A newer conversation owns the screen

Authentication callback exchange uses a shared arbitration boundary so duplicate delivery from the router and native browser does not exchange one PKCE code twice.

Destructive clear behavior is designed to:

- Invalidate prior background work
- Block new work
- Wait for durable cleanup
- Prevent late writes from restoring cleared data

### Unverified native transitions

The following remain unverified on real devices:

- Backgrounding during a network request
- Force quit during persistence
- OS process death
- Low-memory restart
- Notification tap into a cold process
- Native permission sheet cancellation
- Camera interruption
- Health permission changes outside the app
- Purchase completion while the app is backgrounded
- Store callback restoration after restart

### Conclusion

The state model is mature in local tests. Native operating-system lifecycle behavior remains a material gap.

---

## 6.4 Deterministic test fixtures

**Status: VERIFIED FOR MOST LOCAL TESTS; LIVE DEPENDENCY TESTING INCOMPLETE**

### Confirmed local practices

The local suites use:

- Mocked provider responses
- Fixed timestamps
- Controlled accounts
- Explicit test payloads
- Simulated network failures
- Simulated database failures
- Isolated database schemas for selected integration tests
- Controlled retry and timeout behavior
- Fixed nutrition and diary fixtures

This gives the local suites repeatability and keeps failures attributable.

### Limits

Mocks cannot establish:

- Supabase provider delivery behavior
- Google login handoff
- RevenueCat store behavior
- Apple or Google link association behavior on-device
- Health platform data semantics
- Notification scheduling and delivery
- Camera and barcode hardware behavior
- App Store or Play Store binary configuration

### Required complementary model

The correct model is:

1. Deterministic local tests for broad coverage
2. Contract tests at every API boundary
3. Small live-provider checks
4. Signed-device critical-flow tests
5. Production health and identity verification

Calora currently has the first two strongly, portions of the third, and incomplete evidence for the fourth and fifth.

---

## 6.5 Layered CI gate

**Status: NOT IMPLEMENTED AS A COMPLETE WORKSPACE GATE**

### GitHub workflows found

The current repository contains:

1. `account-deletion-fence.yml`
2. `monitor-ios-signing.yml`
3. `monitor-native-associations.yml`
4. `native-auth-preflight.yml`
5. `native-encrypted-recovery.yml`

### What these workflows do well

The account-deletion workflow:

- Runs on push, pull request, or manual trigger
- Provisions PostgreSQL
- Applies relevant schema and support objects
- Verifies deletion-fence integration behavior
- Verifies the built-artifact guard
- Uploads sanitized failure evidence

The association monitor:

- Checks Apple and Android association surfaces
- Runs on a schedule
- Can run manually
- Can verify published API behavior after successful deployment events

The native auth and encrypted-recovery workflows:

- Define manual release checks
- Require explicit native targets
- Require explicit binaries
- Produce evidence artifacts

The iOS signing monitor:

- Performs scheduled credential-expiry checks

### Missing general CI

No workflow was found that requires all of the following on every relevant pull request:

- Root workspace typecheck
- Full API tests
- Full Calora tests
- API build
- API startup smoke check
- Expo configuration verification
- Static-server security tests
- OpenAPI regeneration drift check
- Database migration verification
- Signed mobile build
- Android native smoke suite
- iOS native smoke suite
- Release identity verification

### Consequence

A developer can run strong checks locally, but the repository does not provide evidence that every merge is automatically blocked when the complete app verification set fails.

### Recommended CI structure

#### Fast pull-request gate

- Workspace typecheck
- API typecheck
- Calora typecheck
- OpenAPI generation and clean-diff check
- Focused unit tests
- Static analysis
- Dependency audit

#### Integration gate

- Full API suite
- Full Calora suite
- PostgreSQL integration tests
- Account-isolation tests
- API production build
- API startup and health checks
- Expo configuration validation

#### Release gate

- Signed Android build
- Signed iOS build
- Native auth matrix
- Native critical-flow suite
- RevenueCat purchase lifecycle
- Health integrations
- Notification lifecycle
- Camera/barcode flows
- Release source attestation
- Published API identity and health

---

## 6.6 Progressive rollout and rollback

**Status: STRONG FOR COACH-SPECIFIC DISABLEMENT; INCOMPLETE FOR THE WHOLE PRODUCT**

### Coach controls verified

Coach uses:

- Default-deny rollout
- Server-owned enablement
- Account eligibility
- Current purpose-scoped consent
- Global disablement
- Cohort checks
- Release-bound production activation
- Completion-time authorization
- No legacy fallback

These controls allow Coach provider egress to be stopped without restoring the retired broad-context route.

### Missing general rollout controls

No evidence was found for:

- Percentage-based application rollout
- Blue/green traffic switching
- General API canary deployment
- Automated health-based promotion
- Automated health-based rollback
- Previous mobile artifact promotion
- Generic application kill switches
- A general deployment rollback pipeline

### Database rollback

The available recovery model appears primarily forward-fix oriented. No universal automated schema rollback mechanism was established.

This is often appropriate for production databases, but it means migration rehearsal and compatibility discipline are essential.

### Configuration contradiction

The repository indicates that production Coach Fact Context enablement can be set to true, while rollout documentation describes a deny-all steady state and later evidence reports no active rollout.

This is not proof that production is currently exposed. It is proof that configuration, documentation, and observed production state must be reconciled before a release decision.

Required action:

- Independently read back the actual published environment.
- Verify the exact running source identity.
- Verify server rollout state.
- Verify cohort state.
- Verify consent state.
- Do not infer production state from repository files alone.

---

## 6.7 Diagnostics, monitoring, and alerting

**Status: BASIC SERVER DIAGNOSTICS VERIFIED; PRODUCTION OBSERVABILITY INCOMPLETE**

### Verified

The API has:

- Structured JSON-compatible logging
- Request completion logs
- Central error handling
- Authorization-header redaction
- Cookie redaction
- Health endpoint
- Database-backed readiness endpoint
- Safe provider error normalization
- Recovery-warning logging
- Release identity metadata

### Not found or not evidenced

No complete implementation was established for:

- Mobile crash reporting
- JavaScript source-map upload
- Native symbolication
- API latency dashboards
- API error-rate dashboards
- Provider failure dashboards
- Database saturation alerts
- Rate-limit alerts
- Sync failure alerts
- Authentication failure alerts
- Subscription failure alerts
- Notification delivery metrics
- Automated incident paging
- Release-to-error correlation

### Risk

Without monitoring and alerting:

- A production defect may exist before the team notices.
- User reports may be the first alert.
- Native crash stacks may be difficult to resolve.
- Provider degradation may look like unrelated user failures.
- Rollback decisions may be delayed.

### Minimum recommended production telemetry

- Release version
- Git source identity
- Platform
- Native build version
- Screen or flow identifier
- Stable error category
- Retryability
- API route
- Response status
- Provider category
- Request correlation ID
- Latency bucket

Sensitive content must remain excluded:

- Access tokens
- Session cookies
- Raw account identifiers
- Food names
- Personal notes
- Coach message content
- Health data
- Full provider payloads

---

## 7. Native Authentication and Deep-Link Verification

## 7.1 Static implementation

**Status: VERIFIED**

The current native configuration consistently identifies:

- App scheme: `caloraapp`
- iOS bundle identifier: `com.etiendem.caloraapp`
- Android package: `com.etiendem.caloraapp`
- Branded HTTPS callback origin: `https://mycaloraapp.com`
- Authentication callback path: `/auth/callback`
- iOS associated domain: `mycaloraapp.com`

The auth implementation is fail-closed:

- Only the exact approved HTTPS callback origin and path are accepted.
- Foreign origins are rejected.
- Unsupported custom-scheme auth callbacks are rejected.
- PKCE exchange is protected against duplicate callback processing.
- Password-recovery callbacks are routed distinctly.

## 7.2 Native preflight execution

**Status: BLOCKED**

The native auth preflight executed and produced:

```text
result: blocked
failure classes:
- binary_unavailable
- target_unavailable
```

### iOS

- Installable binary: unavailable
- Selected target: unavailable
- Booted simulator/device identifier: unavailable

### Android

- Installable binary: unavailable
- Selected target: unavailable
- Connected device serial: unavailable

## 7.3 Authentication cases not run

All of the following remained `not-run` on both iOS and Android:

1. Google sign-in
2. Email verification
3. Password recovery
4. Cold-launch or force-quit HTTPS callback
5. Competing `caloraapp` handler behavior

## 7.4 Tool availability

The current environment does not provide the complete native host toolchain needed for certification:

- `xcrun`: unavailable
- `adb`: unavailable
- `eas`: unavailable
- `codesign`: unavailable
- `plutil`: unavailable
- Android package signing inspection tools: unavailable

Maestro definitions exist, but test definitions without binaries and targets are not execution evidence.

## 7.5 Documentation inconsistency

A native authentication document references an older Replit-hosted canonical domain, while the current application configuration and association monitoring use `mycaloraapp.com`.

This document should be treated as historical, not current certification evidence.

Required remediation:

- Mark the old evidence as superseded.
- Replace old host references with the branded-domain configuration where appropriate.
- Attach fresh iOS and Android callback evidence.
- Record the exact signed build identity used for the new evidence.

---

## 8. Native Feature Verification Matrix

| Feature | Source/tests | Real-device evidence | Status |
|---|---:|---:|---|
| App startup | Yes | No signed-device run | Partial |
| Email sign-in | Yes | No | Blocked |
| Google sign-in | Yes | No | Blocked |
| Email verification callback | Yes | No | Blocked |
| Password recovery callback | Yes | No | Blocked |
| Cold-launch auth callback | Logic only | No | Blocked |
| Universal Links | Config and monitor | No device handoff | Partial |
| Android App Links | Config and monitor | No device handoff | Partial |
| Onboarding | Strong tests | Limited native flow definition | Partial |
| Meal logging | Strong tests | No complete native critical flow | Partial |
| Camera capture | Logic tests | No | Not verified |
| Barcode scan | API tests | No hardware flow | Not verified |
| Meal image rendering | Maestro definition | No current target | Blocked |
| Planner gestures | Logic tests | No native gesture certification | Not verified |
| Progress | Strong logic tests | No complete device flow | Partial |
| Coach | Strong client/API tests | No signed-device conversation | Partial |
| Hydration logging | Strong local tests | No complete native flow | Partial |
| HealthKit | Adapter/tests | No native device | Not verified |
| Health Connect | Adapter/tests | No native device | Not verified |
| Notifications | State tests | No delivery/tap evidence | Not verified |
| Encrypted recovery | Strong tests and Maestro definition | No current target | Blocked |
| File export/share | Logic tests | No OS handoff evidence | Not verified |
| RevenueCat purchase | Entitlement tests | No store transaction | Not verified |
| RevenueCat restore | Logic/tests | No store restore | Not verified |
| Subscription expiry | Server/client logic | No live store lifecycle | Not verified |
| Account switching | Strong tests | No complete signed-device flow | Partial |
| Account deletion | Strong API/fence tests | Production end-to-end not fully proven | Partial |
| Native accessibility | Labels/tests | No VoiceOver/TalkBack pass | Not verified |
| Android back behavior | Limited | No | Not verified |
| Background/force quit | Some state logic | No OS lifecycle run | Not verified |
| Low-memory restoration | No direct evidence | No | Not verified |

---

## 9. Production Verification

## 9.1 API development runtime

**Status: VERIFIED**

The API workflow:

- Built successfully
- Started successfully
- Connected to its configured database path
- Listened on port `8080`
- Returned HTTP `200` for the root request

## 9.2 Expo development runtime

**Status: VERIFIED**

The Calora workflow:

- Started Expo
- Started Metro
- Produced an Expo development endpoint
- Exposed a web endpoint

The browser-visible root shows Calora’s public landing content.

This does not prove the native Coach or tab routes, because the browser endpoint is a public web landing surface rather than a substitute for a signed native application.

## 9.3 Published production identity

**Status: NOT VERIFIED IN THIS AUDIT**

Existing reports indicate that validated source and live runtime identity have not always matched and that trusted external attestation was unavailable in at least one prior assessment.

Before release certification, production must prove:

- Exact Git commit
- Exact source tree
- Exact release digest
- Expected API release identifier
- Health endpoint status
- Database readiness
- Branded-domain ownership
- Correct `/api` routing
- Correct mobile association files

## 9.4 Deployment and promotion

**Status: INCOMPLETE**

No repository workflow was found that automatically:

- Deploys the API
- Promotes a tested API artifact
- Produces and signs mobile builds
- Promotes mobile artifacts between environments
- Blocks promotion on complete native evidence
- Rolls back automatically after health degradation

Publishing and EAS configuration exist, but configuration is not execution evidence.

---

## 10. Security and Privacy Findings

## 10.1 Positive controls

Confirmed strengths include:

- Fail-closed sensitive endpoints
- Account eligibility checks
- Account-scoped persistence
- Strict Coach consent
- Coach nonce replay protection
- Request body budgets
- Exact allowlists
- Provider timeouts
- Output validation
- Authorization recheck after provider completion
- Legacy Coach retirement
- Account-deletion fences
- Tenant predicate testing
- Static asset allowlisting
- Header redaction

## 10.2 Residual isolation risk

Application-level tenant predicates are tested, but a shared elevated PostgreSQL connection cannot provide the same independent protection as database-enforced tenant isolation.

This means:

- A missing application predicate remains a high-impact class of defect.
- Tenant isolation tests must remain mandatory.
- Database-level enforcement should be considered where compatible with the architecture.

## 10.3 Provider and external-service risk

Production behavior remains dependent on:

- Supabase Auth
- RevenueCat
- FatSecret
- TheMealDB
- Apple association delivery
- Google association delivery
- OpenAI-backed features

Provider mocks and server normalization are strong, but live permissions, quotas, network routes, and provider-side policy changes still require direct monitoring and rehearsal.

---

## 11. Defect-Risk Register

### Critical

#### R1 — Native authentication not certified

**Impact:** Users may be unable to sign in, verify email, or recover accounts on one or both platforms.  
**Likelihood:** Unknown until device execution.  
**Evidence:** Native auth preflight blocked; all cases not run.  
**Required gate:** Signed iOS and Android callback matrix.

#### R2 — Store purchase lifecycle not certified

**Impact:** Users may be charged without receiving access, lose access after account switching, or be unable to restore purchases.  
**Likelihood:** Unknown.  
**Evidence:** Logic tests exist; no complete native store transaction evidence.  
**Required gate:** Purchase, restore, expiry, reinstall, and account-switch matrix.

#### R3 — Account deletion not fully production-certified

**Impact:** A user deletion request may fail to erase all required data.  
**Likelihood:** Reduced by strong API and fence tests, but production dependencies remain.  
**Evidence:** Strong local/integration controls; production provider and database execution require correlation.  
**Required gate:** Disposable production-like account deletion rehearsal with provider verification.

### High

#### R4 — Camera and barcode behavior not device-certified

**Impact:** Core meal-capture flow may fail despite passing API tests.  
**Required gate:** Permission, cancellation, capture, barcode, review, save, and relaunch tests on both platforms.

#### R5 — Health integrations not device-certified

**Impact:** Missing, duplicated, stale, or unit-invalid health values.  
**Required gate:** HealthKit and Health Connect permission/data matrix.

#### R6 — Notification lifecycle not device-certified

**Impact:** Wrong-account reminders, missing reminders, or broken notification routing.  
**Required gate:** Schedule, delivery, tap, cold launch, sign-out, account switch, and clear-data matrix.

#### R7 — No complete CI merge gate

**Impact:** A change can merge without running the complete workspace verification set.  
**Required remediation:** Required pull-request workflow and branch protection.

#### R8 — Production observability is insufficient

**Impact:** Defects may reach users and remain undetected or difficult to diagnose.  
**Required remediation:** Crash reporting, metrics, alerts, and release correlation.

### Medium

#### R9 — React test warning noise

**Impact:** Asynchronous rendering defects may be masked by incomplete test settling.  
**Required remediation:** Wrap affected interactions and enforce a warning budget.

#### R10 — Native-auth documentation is stale

**Impact:** Release decisions may rely on obsolete host evidence.  
**Required remediation:** Supersede old evidence and produce branded-domain device results.

#### R11 — Rollout state evidence is contradictory

**Impact:** Operators may misinterpret whether Coach is active or deny-all.  
**Required remediation:** Production read-back and one canonical state report.

---

## 12. Recommended Remediation Plan

## Phase 1 — Mandatory CI foundation

### Objective

Ensure every change is automatically checked before merge.

### Actions

1. Add a workspace pull-request workflow.
2. Run root typecheck.
3. Run API full suite.
4. Run Calora full suite.
5. Run Calora static-server security suite.
6. Run OpenAPI generation.
7. Fail if code generation changes tracked files.
8. Build the API production bundle.
9. Start the API and verify health.
10. Verify Expo configuration.
11. Upload sanitized failure artifacts.
12. Make the workflow a required branch-protection check.

### Completion criteria

- A deliberately introduced type error blocks merge.
- A failing API test blocks merge.
- A failing Calora test blocks merge.
- OpenAPI generation drift blocks merge.
- API build failure blocks merge.

## Phase 2 — Signed native authentication gate

### Objective

Certify account access and callback behavior on both platforms.

### Actions

1. Produce one exact signed iOS candidate.
2. Produce one exact signed Android candidate.
3. Record artifact hashes.
4. Select one exact iOS target.
5. Select one exact Android target.
6. Run Google sign-in.
7. Run email verification.
8. Run password recovery.
9. Run cold-launch callback.
10. Run force-quit callback.
11. Test competing custom-scheme behavior.
12. Verify foreign-origin rejection.
13. Capture sanitized evidence.

### Completion criteria

- Ten native callback cases pass.
- Exact artifact hashes are recorded.
- No callback case is `not-run`.
- Branded-domain associations are verified for the same candidate.

## Phase 3 — Critical native product flow

### Objective

Exercise Calora as a user experiences it.

### Actions

1. Clean install.
2. Authenticate.
3. Complete onboarding.
4. Log a manual meal.
5. Edit the meal.
6. Delete and restore expected state.
7. Capture a meal image.
8. Scan a barcode.
9. Review before saving.
10. Verify Today.
11. Verify Progress.
12. Ask Coach supported questions.
13. Verify recipe and planner navigation.
14. Background and resume.
15. Force quit and relaunch.
16. Sign out.
17. Switch accounts.
18. Verify no cross-account state.
19. Delete the account.

### Completion criteria

- Flow passes on iOS and Android.
- All account boundaries remain isolated.
- Late async results do not appear after sign-out or clear.
- No silent failure is accepted.

## Phase 4 — Native integration matrix

### Objective

Certify platform and provider boundaries.

### Required matrices

- Camera and barcode
- HealthKit
- Health Connect
- Notifications
- Share sheet and export
- RevenueCat purchase
- RevenueCat restore
- Subscription expiry
- Offline sync
- Network interruption
- Provider timeout
- App backgrounding
- Low-memory restoration
- Accessibility

## Phase 5 — Production observability

### Objective

Detect and diagnose defects rapidly after release.

### Actions

1. Add privacy-safe crash reporting.
2. Upload source maps and native symbols.
3. Track API latency and error classes.
4. Track auth failure classes.
5. Track sync failure classes.
6. Track provider failures.
7. Track subscription failures.
8. Correlate events with release identity.
9. Establish alert thresholds.
10. Document incident ownership.

## Phase 6 — Controlled release

### Objective

Release only the exact tested candidate.

### Actions

1. Freeze the candidate commit and source tree.
2. Build signed artifacts from that candidate.
3. Attach hashes and release identity.
4. Run required native gates.
5. Verify published API identity.
6. Verify branded domain and association files.
7. Release to the smallest supported cohort.
8. Monitor predefined health indicators.
9. Promote only after the observation window.
10. Retain a documented disable or rollback path.

---

## 13. Proposed Required Release Checklist

### Source and contracts

- [ ] Working tree matches the approved candidate
- [ ] Root typecheck passes
- [ ] OpenAPI generation produces no uncommitted changes
- [ ] Generated API client and validator versions match
- [ ] API full suite passes
- [ ] Calora full suite passes
- [ ] Static-server security tests pass

### API

- [ ] Production API bundle builds
- [ ] Release identity is embedded
- [ ] Health endpoint returns success
- [ ] Database readiness returns success
- [ ] Published source identity matches the candidate
- [ ] Branded apex routes correctly
- [ ] `/api` routes correctly

### iOS

- [ ] Exact signed candidate recorded
- [ ] Universal Links verified
- [ ] Google sign-in verified
- [ ] Email verification verified
- [ ] Password recovery verified
- [ ] Cold-launch callback verified
- [ ] Camera verified
- [ ] HealthKit verified
- [ ] Notifications verified
- [ ] RevenueCat purchase and restore verified
- [ ] VoiceOver pass completed

### Android

- [ ] Exact signed candidate recorded
- [ ] App Links verified
- [ ] Google sign-in verified
- [ ] Email verification verified
- [ ] Password recovery verified
- [ ] Cold-launch callback verified
- [ ] Camera and barcode verified
- [ ] Health Connect verified
- [ ] Notifications verified
- [ ] RevenueCat purchase and restore verified
- [ ] TalkBack pass completed

### Account lifecycle

- [ ] Account switching verified
- [ ] No cross-account data observed
- [ ] Sign-out clears active account state
- [ ] Pending responses are discarded
- [ ] Clear-all completes durably
- [ ] Account deletion completes across dependencies

### Operations

- [ ] Crash reporting receives a test event
- [ ] API alerting receives a test event
- [ ] Release identity appears in telemetry
- [ ] Rollback or disable path rehearsed
- [ ] Operator ownership confirmed

---

## 14. Final Determination

### What is proven

Calora currently has:

- Strong TypeScript integrity
- Strong API and client automated coverage
- Mature schema validation
- Extensive local state-transition testing
- Strong Coach safety controls
- Strong account-deletion safeguards
- Multiple specialized native and release preflights
- Working API and Expo development workflows

### What is not proven

Calora does not yet have current direct evidence for:

- Signed iOS critical flows
- Signed Android critical flows
- Real authentication callbacks
- Camera and barcode hardware flows
- HealthKit and Health Connect
- Notification delivery
- RevenueCat purchase lifecycle
- Native share/export behavior
- Full accessibility behavior
- Complete production observability
- General automatic promotion and rollback
- A mandatory complete CI release gate

### Release verdict

**Local code-quality verdict:** PASS  
**API contract verdict:** PASS  
**Automated local regression verdict:** PASS  
**Native authentication verdict:** BLOCKED  
**Native critical-flow verdict:** NOT CERTIFIED  
**Production observability verdict:** INCOMPLETE  
**Whole-app release verdict:** **NO-GO**

### Final statement

The best bug-minimization strategy is only partially active across Calora. The application already has unusually strong local tests and safety boundaries, but the remaining risk is concentrated at the seams that local tests cannot prove. The highest-impact next work is not another broad increase in unit-test count. It is:

1. Make the existing local checks mandatory in CI.
2. Produce exact signed iOS and Android candidates.
3. Execute the native authentication and critical-flow matrices.
4. Certify billing, health, notification, camera, and lifecycle boundaries.
5. Add privacy-safe production crash reporting, metrics, and alerting.
6. Release only the exact candidate that passed those gates.

Until those conditions are satisfied, Calora should be described as **strongly tested locally but not fully verified end to end**.