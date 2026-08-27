# Calora Production Readiness — Coach Consent and Android APK

**Assessment date:** 2026-08-27  
**Implementation source SHA:** `b60c12f47ea8cd75f9152c9e95c222af8cadf01b`  
**Implementation tree:** `aed8be75f58495dc055975efe6e29071548244f2`  
**Immutable remote ref:** `origin/calora-rc-2026-08-27-coach-consent-apk`  
**Supersedes:** the signed-build source in `FINAL_CALORA_RELEASE_CANDIDATE_FREEZE_REPORT.md`  
**Scope:** Premium recipe catalogue continuity, consent-gated Coach Fact Context availability, and Android APK release preparation.

Evidence labels used below:

- **VERIFIED** — directly exercised with deterministic evidence in this workspace.
- **BLOCKED** — cannot be completed here without an external or operator-controlled action.
- **NOT IN SCOPE** — not changed or re-certified by this focused release review.

## 1. Executive summary

**VERIFIED:** The Premium recipe catalogue no longer disappears during a same-account background revalidation. Ordinary active signed-in accounts are eligible for the current Coach Fact Context path when they have current server-owned consent and the global rollout controls are active. A controlled development rehearsal reached the real OpenAI provider and returned HTTP 200 with one exact approved observation, normal safety state, a matching nonce, and Calora's fixed sanitized message.

**BLOCKED:** Calora is not yet production-ready for this Coach release. The deployed production endpoint still returns 404 because the reviewed API bundle has not been published with its release-bound activation and the production global rollout switch has not been enabled by an authorized operator. A signed Android APK was not triggered because this Replit environment prohibits manual EAS CLI builds and its supported Expo Launch path is iOS-only.

## 2. Final internal verdict

**Internal code-readiness verdict: PASS.** Focused repairs, regressions, activation-bound build, Android JavaScript export, real-provider rehearsal, and independent review passed.

**Production-release verdict: BLOCKED.** Production deployment/activation, a signed APK, installed-device verification, and post-deploy rollback proof remain external requirements.

## 3. Application System Map

| Area | Current system |
|---|---|
| Mobile client | Expo 54 / React Native / Expo Router |
| API | Express + TypeScript |
| Authentication | Supabase Auth bearer-token verification |
| Domain data | Replit-managed PostgreSQL via Drizzle |
| Coach provider | Replit OpenAI integration |
| Nutrition provider | FatSecret through the configured gateway |
| Billing | RevenueCat |
| Mobile persistence | AsyncStorage plus authenticated API synchronization |
| Release controls | Clean-SHA-sensitive API build gate, runtime process gate, PostgreSQL global rollout switch |
| Android release | EAS profile `production-apk`; external trigger required |

## 4. Application Flow Map

1. A user authenticates through Supabase.
2. The mobile app hydrates local and authenticated state.
3. Premium recipes load under an account-keyed React Query cache.
4. Existing verified recipe cards remain visible only during same-account active revalidation.
5. Coach requires current purpose-scoped consent.
6. The client builds a bounded deterministic Fact Context from approved facts.
7. The API verifies the account, consent, global rollout, nonce, rate limit, payload, and risk state.
8. The provider receives only the approved Fact Context plus bounded conversation turns.
9. The API reauthorizes at completion, validates exact claims, discards raw provider prose, and returns a sanitized response.
10. Production remains deny-all until both the release-bound process gate and global database switch are active.

## 5. Architecture assessment

**VERIFIED:** The current single Coach architecture remains intact; Legacy Coach is not reintroduced. Authorization is layered and fail-closed. Premium catalogue continuity is implemented as a narrow display policy rather than by weakening entitlement checks.

**Risk:** The API application pool uses shared database credentials; database-enforced tenant isolation is not claimed.

## 6. Product/frontend findings

- **Repaired:** Premium recipe cards disappeared during background refetch because display eligibility used the query's transient success state.
- **Verified:** Same-account, previously verified cards remain visible during active revalidation.
- **Verified:** First load, account changes, completed failures, and 401/403 outcomes remain fail-closed.
- **Verified:** Coach UI accepts a validated Fact Context response and shows explicit unavailable/error states otherwise.
- **Blocked:** Premium rendered E2E could not display catalogue cards with the disposable QA account because it correctly lacked Premium entitlement.

## 7. Backend/API findings

- **Repaired:** Dedicated pilot metadata markers no longer gate otherwise-active accounts.
- **Repaired:** Per-user cohort membership no longer gates broad consented access.
- **Retained:** Global database rollout switch is required and fails closed on missing, false, malformed, or failed reads.
- **Retained:** Production compile gate, runtime gate, authentication, account-state checks, consent, body budgets, exact fact allowlists, nonce claim, rate limit, risk screening, response validation, and completion-time reauthorization.
- **Repaired:** The provider prompt now explicitly requires exact approved statement text, exact fact key, and exact request nonce, matching the strict validator without relaxing it.

## 8. Database findings

**VERIFIED:** No schema change was required. The rollout implementation now reads only `coach_fact_context_rollout_enabled`; historical cohort rows are irrelevant to authorization.

**VERIFIED:** The guarded development-database rehearsal restored all synthetic users, nonce rows, consent state, and the prior global-switch state after each case.

**BLOCKED:** Production switch activation and rollback must be executed through the approved production database control plane.

## 9. Authentication findings

- Supabase `auth.getUser(token)` remains the source of account identity.
- Missing or malformed server-owned metadata denies access.
- Deleted, future-banned, indeterminate-ban, suspended, disabled, and non-active accounts deny access.
- Ordinary active accounts do not need pilot markers.
- Missing identity returns an explicit sign-in response.

## 10. Authorization findings

- Current server-owned purpose consent is mandatory.
- Client flags cannot grant authorization.
- The global rollout switch is mandatory.
- Authorization is rechecked after provider completion.
- Process-gate removal, consent revocation, account ineligibility, or global rollout disablement discards pending provider output.
- Legacy fallback remains disabled.

## 11. Payment/subscription findings

**VERIFIED for changed flow:** The Premium recipe repair does not bypass RevenueCat entitlement. The rendered QA attempt returned 403 for a non-Premium account, and no purchase or entitlement mutation was performed.

**NOT IN SCOPE:** Store purchase, restore, renewal, cancellation, and refund flows were not newly re-certified on signed binaries.

## 12. Infrastructure findings

- Normal API workflow restarted successfully with sensitive activation unset.
- API bound to port 8080 and reported server listening.
- Activation-authorized production API bundle built successfully from the exact implementation SHA.
- Production API deployment remains operator-controlled and was not changed.
- FatSecret production egress still requires its documented allowlisted static route.

## 13. CI/CD findings

- Repository typecheck passed.
- API and mobile suites passed.
- Release attestation passed.
- Android Metro/Hermes export passed.
- No repository CI execution was observed beyond the deterministic workspace commands listed here.
- Manual EAS CLI execution is prohibited in this environment; no Android build job was queued.

## 14. Security findings

| Scanner | Result |
|---|---|
| Dependency audit | 0 critical, 3 high transitive toolchain advisories |
| SAST | 5 medium findings, all in config/example identifier-shaped values; no high/critical finding |
| HoundDog | 0 findings |

The reviewed Coach changes preserve strict input shape, size/depth budgets, exact fact/value/limitation allowlists, replay prevention, risk screening, fail-closed rate limiting, output reconstruction, and completion-time authorization.

## 15. Dependency findings

- `image-size@1.2.1`: two high availability advisories, reached through Metro/Expo build tooling.
- `uuid@7.0.3`: one high integrity advisory, reached through `xcode` under Expo configuration tooling.
- These are not demonstrated as shipped Android runtime paths. Metro processes trusted repository assets at build time; the `uuid` path is in Xcode/iOS tooling.
- No major override was forced because it could invalidate Expo 54 compatibility immediately before release.
- Upgrade through an Expo-supported toolchain release remains technical debt.

## 16. Reliability findings

- Background Premium revalidation no longer blanks verified cards.
- Coach provider calls are bounded by deadline.
- Provider or validation failure returns a safe limited/unavailable response.
- Authorization failures are explicit and fail closed.
- Detached background API work retains logged rejection boundaries.

## 17. Performance findings

- Android bundle export completed successfully: one Hermes bundle of approximately 8 MB plus 71 assets.
- No new unbounded query, provider loop, or retry loop was introduced.
- No physical-device cold-start, memory, CPU, or low-end Android benchmark was executed.

## 18. Observability findings

- API startup and request completion logs are available.
- Release build logs record commit, tree, and release identity.
- The controlled provider rehearsal recorded status, sanitized message, observation count, safety state, and nonce match without exposing credentials.
- Production Coach success telemetry remains unavailable until deployment/activation.

## 19. Privacy/data-lifecycle findings

- Coach sends only bounded approved facts and bounded conversation turns.
- The nonce ledger stores identifiers and expiry metadata, not facts, messages, or prompt content.
- Raw provider prose is not forwarded.
- No production user data was modified during this review.
- Broader retention/export/deletion certification is outside this focused release delta.

## 20. Backup/recovery findings

- Replit checkpoints and Git commits provide source recovery.
- Global rollout false/absent and runtime gate removal are deny-all rollback controls.
- Pending responses are discarded when controls are revoked.
- Production rollback execution and restoration timing remain operator evidence requirements.

## 21. Mobile release findings

- `production-apk` extends the production profile, uses internal distribution, and requests Android APK output.
- Android Expo export succeeded.
- Immutable implementation source is published remotely.
- **BLOCKED:** No EAS build ID, signed APK URL, APK hash, native build number, or installed-device result exists.
- Reason: manual EAS CLI builds are prohibited in this Replit environment, while Replit Expo Launch supports iOS publishing rather than the requested Android-only APK.
- No iOS build and no Android AAB build were triggered.

## 22. Test inventory

- Calora unit/integration tests.
- Static-server traversal and trusted-asset tests.
- API unit/integration tests.
- Coach account eligibility tests.
- Coach global rollout tests.
- Coach endpoint authorization, safety, replay, body-budget, and output-validation tests.
- Guarded real-development-database Coach rehearsal.
- Provider package and API release attestation tests.
- Android Expo export.
- Three security scanners.
- Independent architect review.

## 23. Tests executed

```text
pnpm --filter @workspace/calora run test
pnpm --filter @workspace/api-server run test
COACH_FACT_CONTEXT_SYNTHETIC_REHEARSAL=development-only NODE_ENV=test \
  pnpm --filter @workspace/api-server exec vitest run \
  src/__tests__/coachFactContext.pendingRollback.integration.test.ts
pnpm run typecheck
pnpm --filter @workspace/api-server run test:release-attestation
pnpm --filter @workspace/calora exec expo export --platform android \
  --output-dir /tmp/calora-android-export --clear
```

An activation-bound production API was also started locally against temporary development controls for one real-provider request.

## 24. Exact test results

| Verification | Result |
|---|---|
| Calora Vitest | 63 files, 984 tests passed |
| Calora static-server security | 6/6 passed |
| API Vitest | 30 files passed, 370 tests passed |
| API opt-in rehearsal | 4/4 passed |
| API intentional default skips | 4 rehearsal tests skipped unless explicitly enabled |
| Repository typecheck | passed |
| Release attestation | 13/13 passed |
| Android export | passed, 2,055 modules, 71 assets |
| Real provider rehearsal | HTTP 200, 1 exact grounded observation, normal safety, nonce matched |

Expected error logs in failure-injection tests were observed and did not fail their suites.

## 25. Deterministic tools executed

- Git status, diff, log, tree, and remote-ref verification.
- Vitest and Node test runner.
- TypeScript compiler/project references.
- API production build guard.
- Release/provider attestation scripts.
- Expo Metro/Hermes Android export.
- Dependency audit, SAST, and HoundDog.
- Real-development PostgreSQL guarded rehearsal.
- Real OpenAI provider request through the built API.
- Independent architect review.

## 26. Defects discovered

1. Premium cards were hidden during transient background fetching.
2. Coach account eligibility was restricted to pilot metadata.
3. Coach rollout required per-user cohort membership.
4. The real-database rollback rehearsal encoded obsolete cohort semantics.
5. The provider prompt did not state the exact-copy rule required by the response validator.
6. The prior frozen source did not include these repairs.
7. Android signed-build execution is unsupported inside the available Replit release workflow.

## 27. Defects repaired

1. Added same-account verified-catalogue revalidation continuity.
2. Broadened account eligibility to ordinary active signed-in accounts.
3. Replaced per-user cohort authorization with the existing global fail-closed switch.
4. Replaced obsolete cohort rehearsal with ordinary-user success and valid rollback cases.
5. Aligned the provider prompt with exact strict validation.
6. Published the exact implementation SHA to a new immutable remote ref.

The Android build-workflow limitation cannot be repaired in application source.

## 28. Files modified

```text
artifacts/calora/app/(tabs)/recipes.tsx
artifacts/calora/lib/premiumRecipeAccess.ts
artifacts/calora/lib/__tests__/premiumRecipeAccess.test.ts
artifacts/calora/lib/__tests__/coachFactCoordinator473.test.ts
artifacts/calora/eas.json
artifacts/api-server/src/lib/supabase-auth.ts
artifacts/api-server/src/lib/coach-fact-rollout.ts
artifacts/api-server/src/routes/coachFactContext.ts
artifacts/api-server/src/__tests__/supabase-auth.test.ts
artifacts/api-server/src/__tests__/coachFactRollout.test.ts
artifacts/api-server/src/__tests__/coachFactContext.test.ts
artifacts/api-server/src/__tests__/coachFactContext.pendingRollback.integration.test.ts
.agents/memory/coach-production-control-plane.md
.agents/memory/dark-coach-fact-context.md
```

This report and the supersession notice are documentation-only additions after the implementation source SHA.

## 29. Database modifications

- Development-only synthetic rehearsal records were created and cleaned up.
- Development global Coach switch was temporarily set to true for controlled rehearsals and restored to absent.
- QA consent was accepted during rendered testing.
- No production database mutation was executed.
- No schema migration was introduced.

## 30. Configuration modifications

- Added the `production-apk` EAS profile.
- No secret value was added.
- Production process or database gates were not changed.
- The normal development workflow continues to unset sensitive release activation variables.

## 31. Git checkpoints/commits

| SHA | Purpose |
|---|---|
| `17c886f3a10a65a67335106cfb21d0997bb98079` | Premium revalidation repair, Coach adapter test, APK profile |
| `72ab0288550d999e307d1746f7dd5b41be98b11d` | Broad consent-gated Coach authorization |
| `b60c12f47ea8cd75f9152c9e95c222af8cadf01b` | Provider contract aligned with strict validation |

The implementation source is published at `origin/calora-rc-2026-08-27-coach-consent-apk`.

## 32. Regression results

- No regression test failed.
- Premium access policy tests passed.
- Coach app-adapter tests passed.
- Full mobile and API suites passed.
- Repository typecheck passed.
- API production build and release attestation passed.
- Android export passed.
- Real-provider strict validation passed.

## 33. Production Validation Matrix

| Area | Development/internal | Production/signed artifact |
|---|---|---|
| Premium revalidation policy | VERIFIED | BLOCKED on entitled signed-device account |
| Ordinary-account Coach eligibility | VERIFIED | BLOCKED pending deploy/activation |
| Current consent | VERIFIED | BLOCKED pending live rollout |
| Global kill switch deny | VERIFIED | BLOCKED pending operator rehearsal |
| Real provider response | VERIFIED | BLOCKED pending live rollout |
| Response sanitization | VERIFIED | BLOCKED pending live rollout |
| API release provenance | VERIFIED | BLOCKED pending publish |
| Android JS/native bundle preparation | VERIFIED | — |
| Signed APK | — | BLOCKED |
| Installed-device launch | — | BLOCKED |
| RevenueCat signed-device behavior | partial | BLOCKED |
| Invite-link handoff | automated source tests passed | BLOCKED on signed installs |

## 34. Remaining risks

1. Production deployment or gate order could be incorrect.
2. The live provider path has not been observed after production activation.
3. No signed APK has been installed.
4. Premium revalidation has not been observed on an entitled physical device.
5. Three high transitive Expo/Metro build-tool advisories remain.
6. Physical-device performance and native integration behavior remain unmeasured.

## 35. Remaining technical debt

- Upgrade Expo/Metro when a compatible release removes the vulnerable transitive packages.
- Rename legacy `cohortEligible` fields and compatibility helpers in a later breaking cleanup.
- Remove historical cohort support objects only after confirming no operational consumer depends on them.
- Strengthen database-enforced tenant isolation if infrastructure supports non-superuser application roles.
- Expand production observability after privacy review.

## 36. External/manual validation required

1. Authorized operator publishes the exact implementation source API.
2. Operator sets the sensitive build request and exact reviewed commit during build.
3. Operator sets `COACH_FACT_CONTEXT_ENABLED=true` at runtime.
4. Operator enables `coach_fact_context_rollout_enabled=true` in production.
5. Verify deployed `/api/version` against the reviewed release identity.
6. Verify ordinary active account + current consent returns a grounded response.
7. Verify missing consent, banned/disabled account, global switch false, and process gate absent deny.
8. Verify kill-switch rollback while a provider response is pending.
9. Trigger one Android `production-apk` build in an approved external Expo/EAS environment.
10. Record build ID, source SHA, native build number, toolchain, APK URL, and SHA-256.
11. Install on a physical Android device and test launch, auth, Coach, Premium revalidation, RevenueCat, and invite handoff.

## 37. Blockers

- **P1:** Production API deployment and both activation controls are not executed.
- **P1:** No signed Android APK exists.
- **P1:** No installed-device release validation exists.
- **P1:** Production rollback evidence does not exist.
- **P2:** High transitive build-tool advisories await an Expo-compatible upgrade.

No unresolved P0 was found.

## 38. Independent-audit handoff instructions

The auditor should not trust this report without reproduction. Start from:

```text
origin/calora-rc-2026-08-27-coach-consent-apk
b60c12f47ea8cd75f9152c9e95c222af8cadf01b
```

Re-run section 39, inspect the exact route controls, confirm the production source identity, and obtain independent production and signed-device evidence. Do not mark production-ready based on unit tests or Android export alone.

## 39. Reproduction instructions

```bash
git fetch origin
git checkout --detach b60c12f47ea8cd75f9152c9e95c222af8cadf01b
test "$(git rev-parse origin/calora-rc-2026-08-27-coach-consent-apk)" = \
  "b60c12f47ea8cd75f9152c9e95c222af8cadf01b"
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm --filter @workspace/calora run test
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/api-server run test:release-attestation
```

For an activation-authorized API build:

```bash
NODE_ENV=production \
RELEASE_SENSITIVE_ACTIVATION_REQUESTED=true \
RELEASE_SENSITIVE_ACTIVATION_COMMIT=b60c12f47ea8cd75f9152c9e95c222af8cadf01b \
pnpm --filter @workspace/api-server run build
```

Production mutation and real-provider tests must use approved credentials/control planes and must not expose tokens or user data.

## 40. Final evidence-based verdict

**Calora deserves a PASS for the reviewed source repairs and internal release preparation.**

**Calora does not yet deserve a production-ready PASS for this release.** The evidence supports a **CONDITIONAL / BLOCKED** verdict until the exact reviewed API is deployed and activated by an authorized operator, a signed Android APK is produced by an approved build path, and physical-device plus rollback validation passes.
