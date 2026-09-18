# Calora Final Installed Release-Candidate Deep Verification Report

**Date:** 2026-09-08  
**Scope:** Read-only final verification of the Calora release candidate and its canonical production surface.  
**Constraints honored:** No source/config remediation, package installation, build, Expo/EAS operation, database/provider mutation, Git push, force push, republish, or account deletion was performed.

## 1. Executive summary

The source-level and deterministic verification set is strong:

- Calora tests: **81 files, 1,181 tests passed**.
- API tests: **36 files passed, 438 tests passed, 4 tests skipped**.
- Static server security tests: **6 passed**.
- Workspace typechecks: **passed** for all five checked packages.
- Encrypted-recovery release-gate unit tests: **7 passed**.
- HoundDog scan: **0 findings**.

The release cannot be approved because two release-boundary P1 defects are independently evidenced:

1. **Production is not serving the pushed release-candidate tree.** Production `/api/version` reports commit `f6bb73f17f7eac4b708812aa89f304265692099a` and source tree `e5bc59418730cf9fc51fc88b2627184ed206345b`. The pushed branch reports commit `dbd82b3f037810dda524ca3f900769af97bb4ce7` and source tree `b4a8b9b0947b6c1816ea26bbece8aec85890ef92`. The public-release verifier fails on this exact mismatch.
2. **Referral marketing copy is inconsistent with the authoritative reward.** The server reward constant is 30 days and the OG image uses 30 days, but the invite HTML/Twitter copy still says “free week”; production serves that stale copy too.

Physical installed-device validation is also incomplete. Replit cannot observe the owner’s installed Android binary, iOS device, native permissions, OS deep-link handoff, store transaction, notification delivery, health-provider behavior, or real-device performance. Those items remain owner-confirmation gates.

## 2. Exact release branch and SHA

- Branch under audit: `release/calora-onboarding-and-plus`
- Pushed remote branch: `origin/release/calora-onboarding-and-plus`
- Pushed candidate SHA: `dbd82b3f037810dda524ca3f900769af97bb4ce7`
- Pushed candidate tree: `b4a8b9b0947b6c1816ea26bbece8aec85890ef92`
- Current local audit HEAD: `f10f9ff794bdfa154b54e68e8317ee8469ffd760`
- Current local tree: `db0fa97baa042d60be0be478ab104b2d88049149`
- Local-vs-remote relationship: local is two documentation/evidence commits ahead, with no source/config path difference; remote is not behind.
- Production API commit: `f6bb73f17f7eac4b708812aa89f304265692099a`
- Production API tree: `e5bc59418730cf9fc51fc88b2627184ed206345b`
- Production release ID: `calora-api-f6bb73f17f7e-20260908085922046`

The current local-only paths are the verification report/evidence metadata and attached mission text. They were not pushed and are not treated as product changes.

## 3. Verification methodology

Evidence was gathered from:

- read-only source/config inspection and targeted searches;
- existing release, reconciliation, native-gate, and production-attestation reports;
- the full existing test commands, with no build;
- workspace typechecks;
- current dependency, SAST, and HoundDog scans;
- unauthenticated, non-mutating HTTPS requests to `https://mycaloraapp.com`;
- exact production source-tree comparison using `verify-public-release`;
- release-gate unit tests that do not require a device.

No credentials, tokens, private keys, or secret values were printed or included in this report.

## 4. Areas independently verified

The following are independently supported by source/tests or safe production behavior:

- canonical origin and API apex routing;
- auth callback host/path validation and callback response hygiene;
- account-scoped hydration/persistence boundaries;
- deterministic diary, planner, recipe, Coach, referral, deletion, and tenant-isolation tests;
- Recipes source behavior and nested-scroll arbitration at source/test level;
- public health, legal, support, association, and static asset routes;
- anonymous protected-route rejection;
- branded CORS allow/deny behavior;
- local image catalog uniqueness and provenance labeling;
- release-attestation mismatch between production and the pushed candidate.

## 5. Areas requiring owner physical-device validation

The following are not signed off by this audit:

- the exact installed Android/iOS binary and its SHA/provenance;
- native cold/warm launch, process kill/relaunch, and persisted hydration;
- browser-to-app OAuth handoff and OS Universal/App Link selection;
- camera, photo library, barcode, nutrition-label, receipt, and microphone flows;
- HealthKit/Health Connect permission and measured-value behavior;
- native back gestures, nested horizontal gestures, keyboard avoidance, sheets, and modal dismissal;
- offline cellular/Wi-Fi transitions and reconnect behavior;
- push/local notification permission, scheduling, tap routing, and inbox behavior;
- RevenueCat sandbox/store purchase, restore, cancellation, expiration, and entitlement refresh;
- VoiceOver/TalkBack audio output and Dynamic Type on physical screens;
- actual device image fidelity, memory, frame rate, startup time, and battery impact.

## 6. Cold-launch audit

**Source/test result:** PASS at deterministic/source level. `app/_layout.tsx`, `context/AuthContext.tsx`, `context/CaloraContext.tsx`, `lib/hydrationGuard.ts`, `lib/persistenceManager.ts`, and `lib/accountStorage.ts` show auth restoration, account/guest namespace separation, hydration gating, and serialized persistence.

**Device result:** `NOT TESTED`. No signed binary, booted target, or native process-kill evidence was available.

## 7. Authentication audit

**Source/production result:** PASS for bounded verification. `lib/auth.ts` validates the canonical HTTPS callback and coalesces code exchange. Production `/auth/callback?code=probe-code&state=probe-state` returned 200, `Cache-Control: no-store`, `noindex`, and did not echo the probe query or token-shaped fields.

**Device result:** `NOT TESTED`. Browser return, OS association selection, email verification, resend, recovery, and account-switch behavior require owner devices and disposable accounts.

## 8. Dashboard audit

**Source/test result:** PASS at source level. Dashboard state is fed by account-scoped context and local persisted diary/wellness state; deterministic Calora tests passed.

**Device result:** `NOT TESTED` for visual layout, hydration timing, accessibility announcements, Dynamic Type, and cross-tab refresh on native targets.

## 9. Food logging audit

**Source/test result:** PASS at source/test level. Diary writes store timestamps and nutrition snapshots; food-memory provenance and outbox mutations are explicit. Scan acceptance is review-first, and edit/delete paths update local memory and sync state.

**Device result:** `NOT TESTED` for real camera/library/voice capture, offline retry, and native keyboard/modal behavior.

## 10. Barcode/camera/voice audit

**Source result:** PASS for permission gating, barcode debounce, explicit review, typed fallback, and bounded voice capture (12 seconds/6 MB).

**Device result:** `NOT TESTED`. Replit had no Android/iOS target or installed binary. No physical camera, microphone, barcode, image cancellation, denial, oversized input, or provider-failure result is claimed.

## 11. Restaurant audit

**Source/test result:** PASS for authenticated/provider boundaries and safe provider-error handling. API tests include restaurant route authorization and provider failure behavior.

**Production result:** Anonymous restaurant access returned 401.

**Device result:** `NOT TESTED` for search, result selection, food review, save, and cross-tab persistence on native screens.

## 12. Recipes Discover audit

**Source/test result:** PASS at deterministic/source level. Discover implements search/filter, pagination, deduplication, loading/error/retry states, prefetch, saved state, source labels, and estimated-nutrition labels.

**Device result:** `NOT TESTED` for long native scrolling, image loading, frame rate, and restoration after process kill.

## 13. Recipes Plus audit

**Source/test result:** PASS at deterministic/source level. Plus queries are account-keyed, entitlement-aware, preserve the loaded grid during pagination, and include retry/error identifiers.

**Device result:** `NOT TESTED`. The available Maestro flow requires a real pre-authenticated Plus account and exact device target; no such target was available.

## 14. Recipes Create audit

**Source/test result:** PASS at source level. Guest concepts and authenticated generation/save paths are distinct, with request ownership and nutrition/source labels preserved.

**Device result:** `NOT TESTED` for generation latency, provider failure, keyboard behavior, save/reopen, and entitlement transitions.

## 15. Recipe image-integrity audit

**Source/static result:** PASS for catalog integrity. The inspected catalog has 59 raster assets, all inspected at 1024×1024; food and planner mappings are explicit, duplicate hash groups were zero, and catalog tests cover key completeness and identity repair.

Runtime remote/generated URLs and fallback behavior remain intentionally separate from verified local catalog assets.

**Device result:** `NOT TESTED`. The documented meal-image release gate requires exact booted iOS and Android targets. `CALORA_IOS_DEVICE`, `CALORA_ANDROID_DEVICE`, and installable binaries were unset.

## 16. Planner audit

**Source/test result:** PASS at source/test level. Generation has explicit auth, timeout/429-safe handling and bounded fallback behavior; replace/move/copy/shopping/undo logic is covered by planner tests.

**Device result:** `NOT TESTED` for long-press, drag, native scroll, and cross-tab synchronization.

## 17. Shopping-list audit

**Source result:** PASS at source level. Planner data and shopping-list derivation share the explicit viewed-week context and local mutation path.

**Device result:** `NOT TESTED` for add/remove/check interactions, week changes, offline edits, and persistence after relaunch.

## 18. Coach audit

**Source/test result:** PASS for the closed safety boundary. Guest privacy handling, explicit fact-context consent, deterministic facts, authorization, nonce/replay, rate-limit, risk, and post-provider checks are present. The legacy `/api/v1/coach/respond` route returned 404 in production.

**Test caveat:** `coachFactContext.pendingRollback.integration.test.ts` has four skipped tests.

**Device result:** `NOT TESTED` for multi-turn UX, keyboard/audio/accessibility, and network transitions.

## 19. Contextual Intelligence/Insights audit

**Source/test result:** PASS at source level for bounded local context and deterministic Insights state. Weight editing/chart/delete and health-signal boundaries are present.

**Device result:** `NOT TESTED` for provider availability, permission denial, visual charts, and screen-reader output.

## 20. Progress audit

**Source/test result:** PASS at source level. Progress uses trustworthy weekly signals and restrained entrance/fill/pulse/bar motion; the progress animation policy is documented in project memory.

**Device result:** `NOT TESTED` for actual animation timing, reduced motion, chart readability, and celebration behavior.

## 21. Profile/settings audit

**Source/test result:** PASS at source level. Profile exposes membership, account, reminders, export/delete, health, units, theme, and font-size controls with broad accessibility labels.

**Device result:** `NOT TESTED` for native sheets, Dynamic Type overflow, permission UI, export/share sheet, and destructive confirmation paths.

## 22. RevenueCat/Calora Pro audit

**Source result:** PASS for source boundaries. Runtime key selection, identity synchronization, offerings, entitlement gating, and referral promotional grants are implemented without hardcoded public prices.

**Production/device result:** `NOT TESTED`. No store/sandbox purchase, restore, cancel, expiry, or provider-side entitlement evidence was available. No claim of purchase success is made.

## 23. Referral/invite audit

**Defect found:** P1-002. `REFERRAL_REWARD_DAYS = 30` and the OG image use 30 days, but `routes/universal-links.ts` hard-codes “free week” in OG description, Twitter description, and page body. The local test only synchronizes the OG image text, not the HTML/Twitter copy. Production `/invite/test` returned 200 and still contained “free week”.

The production invite did not contain the literal retired phrase “1 week”, but it still promises a week while the server reward is 30 days. Redemption and reward settlement were not mutated or rehearsed with a real account.

## 24. Legal/support/account routes

**Production result:** PASS for availability and content type. `/`, `/privacy`, `/terms`, `/subscriptions`, `/delete-account`, `/support`, `/contact`, `/help`, `/robots.txt`, `/sitemap.xml`, manifest, icon, and social image returned expected 200 responses.

All checked legal/support pages contained Calora branding and canonical `https://mycaloraapp.com` references.

**Warning:** Privacy, terms, subscriptions, and deletion pages currently publish an effective date of **August 27, 2026**. Owner/legal approval of that date is still required.

## 25. Account-deletion audit

**Source/test result:** PASS for the staged, lock-protected deletion saga, tombstone fencing, recovery states, and local clear/sign-out handling. Tenant-isolation and deletion-fence tests passed.

**Production/device result:** `NOT TESTED` with a real disposable account. No production account was deleted.

## 26. Network/offline audit

**Source/test result:** PASS for bounded retry, outbox, persistence serialization, hydration blocking, and local save feedback patterns.

**Device result:** `NOT TESTED` for actual Wi-Fi/cellular transitions, airplane mode, process kill during sync, and reconnection on both platforms.

## 27. Navigation audit

**Source result:** PASS for Expo routes, tab/stack structure, canonical callback path, `/mobile` artifact routing, and protected navigation boundaries.

**Device result:** `NOT TESTED` for native back behavior, OS task restoration, external browser return, and app-link selection.

## 28. Scroll/gesture audit

**Source/test result:** PASS for the repaired Recipes section/tab gesture arbitration and nested horizontal controls. The parent pager yields to nested horizontal gestures through `SwipeableTabList`.

**Device result:** `NOT TESTED` for actual touch arbitration, rapid swipes, long-press Planner movement, and low-end frame rate. The Plus rapid-scroll Maestro flow was not run.

## 29. Accessibility/responsiveness audit

**Source result:** PASS for widespread labels/roles and reduced-motion branches.

**Device result:** `NOT TESTED`. Source labels are not proof of VoiceOver/TalkBack audio, focus order, announcements, contrast, keyboard avoidance, Dynamic Type, or every screen size.

## 30. Localization audit

**Finding:** P2/OBSERVATION. No complete i18n resource system was found; user-facing copy is largely hard-coded English and at least 31 date/locale formatting references exist, including explicit `en-US` formatters.

If Calora is intentionally English-only, that limitation should be explicit. Non-US date, number, unit, and locale behavior remain unverified.

## 31. Asset/image safety audit

**Source result:** PASS for local mapping and duplicate scan. Assets are classified separately from nutrition provenance, and QA-only image fixtures are not treated as product content.

**Resource observation:** 59 full-size 1024px assets are approximately 12 MB in the source asset directory; generated static-build output duplicates roughly 32 MB. Native bundle/memory behavior was not measured.

## 32. Security audit

Current scans:

- Dependency audit: **2 high, 2 moderate, 0 critical, 0 low**.
  - High: `js-yaml@3.15.1`, GHSA-2883-xcg3-v3hh.
  - High: `js-yaml@4.3.1`, GHSA-2883-xcg3-v3hh.
  - Moderate: `vitest@3.2.7`, GHSA-82fw-gwwq-j7x9.
  - Moderate: `@vitest/mocker@3.2.7`, GHSA-82fw-gwwq-j7x9.
  - The findings are transitive/tooling-associated in the inspected dependency graph; no production API exploitability was established here. Do not claim a zero-vulnerability audit.
- SAST: **5 medium** generic hard-coded-secret-pattern findings in `.replit`, `artifacts/calora/eas.json`, and `artifacts/calora/env.example`; these are configuration/public-placeholder findings requiring owner review, not printed secret values.
- HoundDog: **0 findings**.

Good boundaries independently observed include server-side Supabase identity resolution, exact CORS policy, premium/referral auth and entitlement gates, callback validation, sanitized invite-code insertion, and terminal legacy Coach 404.

Static follow-up observations include missing explicit rate budgets on some authenticated write routes, global 15 MB JSON parsing, and inconsistent provider-error logging. These were not remediated in this mission.

## 33. Production API verification

Safe production probes against `https://mycaloraapp.com`:

- `/api` and `/api/healthz`: 200 JSON.
- `/api/version`: 200 JSON, `no-store`.
- Anonymous diary read/write, sync, premium recipes, restaurant foods, planner, and account deletion: 401.
- Legacy Coach POST: 404.
- Allowed branded CORS preflight: 204 with `Access-Control-Allow-Origin: https://mycaloraapp.com`.
- Unapproved and `Origin: null` preflights: 403.

**P1-001:** the public-release verifier fails when given the pushed candidate tree:

`Live source tree e5bc59418730cf9fc51fc88b2627184ed206345b does not match expected source tree b4a8b9b0947b6c1816ea26bbece8aec85890ef92.`

Production is healthy, but it is healthy on a previous attested release, not on the pushed RC.

## 34. Universal Links/App Links verification

Production returned 200 JSON, no redirect, and valid content types for:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

The AASA response contains `/invite/*` and `/auth/callback` components. Asset Links targets package `com.etiendem.caloraapp` with the expected handle-all-URLs relation.

**Device result:** `NOT TESTED`. HTTP association validity does not prove that iOS/Android installed binaries select the app over the browser.

## 35. Production URL/branding scan

Canonical runtime branding and URLs are consistently Calora / `https://mycaloraapp.com` in the checked production pages, callback, association routes, and app configuration.

Documentation drift remains: `docs/CALORAAPP_PRODUCT_METADATA.md` and store metadata contain historical Replit-hosted URLs and mixed Calora/CaloraApp naming. This is a P2 documentation/release-operations concern, not proof that the live pages leak those URLs.

## 36. Performance/resource audit

**Source observation:** Recipes renders loaded content in ordinary scroll containers rather than a virtualized list; rapid pagination can increase image/memory work.

**Measured evidence:** no native cold-start, frame-time, memory, bundle-size, battery, or network-budget measurement was available. The 59 1024px image assets and approximately 32 MB static-build duplication are measurable resource risks.

**Device result:** `NOT TESTED`.

## 37. Database/data-integrity audit

**Source/test result:** PASS for tested tenant predicates, deletion fences, sync conflict handling, recovery state, and snapshot/provenance behavior. API tests include real-schema tenant isolation.

**Production result:** no database mutation or production query was performed. No production tenant data, deletion, referral, or purchase state was changed.

## 38. Logging/error hygiene

**Test result:** expected negative-path logs appeared during tests, including provider rejection, simulated promotional-grant failure, nutrition fallback, and health readiness failure. Test assertions passed.

**Static observation:** some capture/provider paths log full error objects or provider messages, while generic redaction is narrower than a full request/body allowlist. Production log-content verification was not performed beyond the safe public HTTP probes.

## 39. Comprehensive test results

| Check | Result |
|---|---|
| `pnpm test` Calora Vitest | 81 files / 1,181 tests passed |
| Calora static server security tests | 6 passed |
| `pnpm test` API Vitest | 36 files passed / 438 tests passed / 4 skipped |
| `pnpm typecheck` | Passed: libraries, API, Calora, FatSecret gateway, mockup sandbox, scripts |
| Encrypted-recovery release-gate unit suite | 7 passed |
| Current dependency audit | 2 high / 2 moderate |
| Current SAST | 5 medium |
| Current HoundDog | 0 |
| Public release verifier against pushed RC tree | Failed on live source-tree mismatch |

## 40. Exact warnings/skips/failures

- API `coachFactContext.pendingRollback.integration.test.ts`: 4 skipped tests.
- Calora Profile tests emitted React `act(...)` warnings; tests still passed.
- Deterministic tests emitted expected simulated diary-sync, provider, promotional-grant, nutrition-fallback, and health-readiness logs.
- Meal-image native gate: **not run** because exact iOS/Android targets and installable binaries were unavailable.
- Plus rapid-scroll native flow: **not run** because it requires a real authenticated Plus account and device.
- Public-release verifier: **failed**, exact error recorded in Section 33.
- No deterministic test failure occurred in the executed suites.

## 41. Full defect register with severity

### P1-001 — Production attestation is not the pushed RC

- **Area:** deployment topology / production API / release integrity.
- **Symptom:** live `/api/version` reports `f6bb73…` / tree `e5bc594…`, not pushed RC `dbd82b3…` / tree `b4a8b9…`.
- **Reproduction:** run `PUBLIC_VERIFY_EXPECTED_SOURCE_TREE=b4a8b9b0947b6c1816ea26bbece8aec85890ef92 pnpm --filter @workspace/api-server run verify:public-release`.
- **Affected components:** production deployment, release attestation, API apex.
- **Evidence:** public verifier exit 1; production version response; Git object inspection confirms `e5bc594…` is the tree of commit `f6bb73…`.
- **Root cause:** production remains on an older published release.
- **Deterministic:** yes, for the mismatch; physical installed-binary provenance remains owner-only.
- **Release impact:** do not claim the pushed RC is live or verified in production.
- **Recommended remediation:** separately reconcile/deploy the approved candidate through the authorized release process, then rerun attestation; no deployment was performed here.
- **Regression test:** public verifier must pass against the exact approved source tree.

### P1-002 — Invite reward copy promises a week while reward configuration is 30 days

- **Area:** referral/invite marketing and reward contract.
- **Symptom:** backend constant and OG image say 30 days, while HTML/Twitter copy says “free week”; production serves the stale copy.
- **Reproduction:** GET `/invite/test`; inspect `routes/universal-links.ts` around the OG/Twitter/page copy and `referral-config.ts`.
- **Affected components:** invite landing page, social metadata, referral expectation.
- **Evidence:** current source lines contain “free week”; production response contains the same phrase; `REFERRAL_REWARD_DAYS` is 30.
- **Root cause:** hard-coded landing-page copy was not moved to the shared reward constant.
- **Deterministic:** yes, and confirmed in production.
- **Release impact:** user-facing offer is inconsistent with the actual server grant.
- **Recommended remediation:** make all invite copy derive from the shared duration and add HTML/Twitter regression assertions; no fix was made here.
- **Regression test:** assert the rendered page and social descriptions contain the configured number and reject week copy.

### P2-001 — Current dependency audit is not clean

- **Area:** dependency/security.
- **Symptom:** two high `js-yaml` findings and two moderate Vitest findings.
- **Evidence:** current OSV-backed dependency scan and `pnpm why js-yaml`.
- **Impact:** release audit cannot claim zero vulnerabilities; findings appear transitive/tooling-associated and were not proven reachable from production API code.
- **Recommended remediation:** upgrade compatible direct parents or apply safe dependency resolutions after separate authorization; rerun the audit.

### P2-002 — Documentation/metadata drift

- **Area:** release operations / branding.
- **Symptom:** historical docs contain Replit-hosted URLs and mixed Calora/CaloraApp naming while runtime uses Calora and `mycaloraapp.com`.
- **Evidence:** `docs/CALORAAPP_PRODUCT_METADATA.md`, store metadata, and current runtime config.
- **Impact:** operator/store submission confusion.
- **Recommended remediation:** reconcile documentation before the next submission; no docs were changed in this mission.

### P2-003 — Locale system and performance budgets are unverified

- **Area:** localization/performance.
- **Symptom:** hard-coded English/`en-US` formatting and large non-virtualized/image-heavy surfaces.
- **Evidence:** source search and asset inventory.
- **Impact:** non-US behavior and low-end native performance are not release-proven.
- **Recommended remediation:** define product locale scope and capture native performance/accessibility budgets.

### OBS-001 — Legal effective date requires approval

- **Area:** legal/support.
- **Symptom:** checked legal pages state August 27, 2026.
- **Impact:** could be correct or could be stale; this audit cannot approve the date.
- **Owner action:** confirm the approved effective date with the legal/product owner.

### OWNER-001 — Physical/native validation remains outstanding

- **Area:** all native-only flows.
- **Severity:** OWNER DEVICE TEST REQUIRED.
- **Impact:** no physical-device success is claimed.

## 42. Owner physical-device checklist

Fill each item with **PASS**, **FAIL**, or **NOT TESTED**:

- [ ] Android signed RC installed from the approved artifact: `NOT TESTED`
- [ ] iOS signed RC installed from the approved artifact: `NOT TESTED`
- [ ] Binary SHA and source/release attestation match: `NOT TESTED`
- [ ] Cold launch guest/authenticated/account-switch states: `NOT TESTED`
- [ ] Process kill/relaunch and hydration recovery: `NOT TESTED`
- [ ] OAuth browser return and HTTPS callback: `NOT TESTED`
- [ ] Email verification, resend, recovery, sign-out/sign-in: `NOT TESTED`
- [ ] Camera/photo-library/receipt/label capture: `NOT TESTED`
- [ ] Barcode scan and denied/revoked permissions: `NOT TESTED`
- [ ] Voice capture, cancellation, 12-second/size limits: `NOT TESTED`
- [ ] Discover/Plus/Create scroll, nested gestures, pagination: `NOT TESTED`
- [ ] Planner drag/move/copy/long-press and shopping list: `NOT TESTED`
- [ ] Coach consent/privacy and multi-turn behavior: `NOT TESTED`
- [ ] Insights/Progress charts, goals, weight edit/delete: `NOT TESTED`
- [ ] Profile export/delete/reminders/theme/font-size/units: `NOT TESTED`
- [ ] RevenueCat purchase/restore/cancel/expiry: `NOT TESTED`
- [ ] Referral redemption and reward settlement: `NOT TESTED`
- [ ] HealthKit/Health Connect permission and measured values: `NOT TESTED`
- [ ] Notifications permission/schedule/tap/inbox: `NOT TESTED`
- [ ] Offline diary edits, reconnect, Wi-Fi/cellular transition: `NOT TESTED`
- [ ] Android back gesture and iOS dismissal behavior: `NOT TESTED`
- [ ] VoiceOver/TalkBack, Dynamic Type, contrast, focus order: `NOT TESTED`
- [ ] Image QA release gate on exact iOS and Android targets: `NOT TESTED`
- [ ] Encrypted recovery flow on both platforms: `NOT TESTED`

## 43. Remaining blockers

Release-blocking:

1. Production must be reconciled to the approved RC source tree, or the release must be explicitly re-scoped to the production-attested commit.
2. Referral landing-page/social copy must match the 30-day reward before public promotion.
3. Owner must validate the exact installed binary and all native-only flows.

Important but not yet release-stopping in this audit:

- dependency findings must be reviewed and cleared or explicitly accepted;
- legal effective date must be approved;
- documentation/store metadata drift should be reconciled;
- native performance, accessibility, and locale scope need evidence.

## 44. Exact recommended next action

Do not deploy, republish, build, push, or alter code as part of this report. First, have the release owner decide whether the canonical candidate is the pushed `dbd82b3…` tree or the currently attested production `f6bb73…` tree. Then, in a separately authorized remediation/release task:

1. reconcile production to the approved candidate and rerun the public-release verifier;
2. correct and regression-test every referral landing-page/social string;
3. review/resolve the current dependency findings;
4. install the exact approved signed RC on disposable iOS and Android devices;
5. execute the owner checklist and attach sanitized evidence;
6. rerun this report’s production and deterministic gates without changing the approved candidate between verification and release.

## 45. Final verdict

**FINAL RC HAS P1/P0 BLOCKERS — DO NOT RELEASE**