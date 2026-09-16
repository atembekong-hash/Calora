# Calora Production Readiness Master Audit

**Audit date:** 2026-09-03  
**Audited branch:** `main`  
**Audited commit:** `2ddfaa2aea49e06f3f2f67de79b15361c8e526ca`  
**Scope:** Repository, local workflows, automated tests, static configuration, dependency/security scanners, and previously recorded development/web evidence.  
**Production mutations:** None. No production deployment, mobile store build, financial transaction, or destructive production-data operation was performed.

## 1. Executive Summary

Calora has a substantial local-first product implementation and a meaningful automated regression suite. The current repository typechecks, the full test command exits successfully, and the API security suite exercises authorization, rate-limit, deletion-fence, sync, referral, capture, Coach, and universal-link behaviors. Prior live Expo web evidence also covers onboarding, navigation, local diary logging, recipes, planner rendering, profile preferences, and local persistence.

That evidence does **not** establish public production readiness. The most important blockers are:

1. Tenant isolation is enforced in API query predicates, but not at the PostgreSQL role/RLS boundary. The server uses a shared privileged database path; a credential compromise or authorization defect can therefore have a database-wide blast radius.
2. The controlled Coach Fact Context route accepts client-authored numeric facts and labels them approved after structural/deterministic checks. The route is gated and intended to be dark, but the production gate state was not independently verified.
3. Local clear/account-deletion flows retain auxiliary sync metadata, referral flags, and quarantined legacy state outside the primary account-state key.
4. The security scan reports **7 high, 4 moderate, and 1 low** dependency advisories. Several are transitive build/tooling dependencies, but they remain unresolved supply-chain findings.
5. Real Supabase sessions, production API behavior, native camera/health/notification flows, RevenueCat store transactions, signed builds, universal-link OS handoff, production migrations, store configuration, and crash monitoring are not verified.

## 2. Final GO / NO-GO Verdict

# **NO-GO FOR PRODUCTION**

This is a strict verdict under the supplied completion gates. There are no confirmed P0 findings in this audit, but there are unresolved P1/P2 concerns and multiple release-critical properties with no Level A or Level B evidence. The repository must not be represented as ready for public App Store or Google Play release.

## 3. Confidence Level

**Overall confidence: High for repository and local-test findings; Low-to-medium for production/runtime conclusions.**

- **High:** source/configuration findings, scanner output, current typecheck/test exit status, and the distinction between implemented code and absent production evidence.
- **Medium:** conclusions corroborated by automated tests and prior development/web certification.
- **Low / NOT VERIFIED:** production deployment state, native OS behavior, store-provider behavior, live Supabase configuration, and physical-device lifecycle behavior.

### Evidence levels used

- **Level A:** Direct execution and observation in the current environment.
- **Level B:** Automated tests or controlled simulation executed in the current environment.
- **Level C:** Strong source/configuration inspection or prior recorded live evidence, not re-executed as part of this audit.
- **Level D:** Inference or a condition requiring external verification.

## 4. Testing Environment

- Linux/NixOS Replit workspace.
- Node.js 24 workspace runtime; EAS base configuration pins Node 20.19.4 and pnpm 10.26.1.
- Expo workflow running for Calora preview.
- API workflow running for the development API.
- Component preview workflow running but outside the production product path.
- Current local checks:
  - `pnpm run typecheck` — **exit 0**; libraries, API server, Calora, FatSecret gateway, mockup sandbox, and scripts typechecked.
  - `pnpm test` — **exit 0**.
  - Calora Vitest plus server security checks — **74 files, 1,126 tests passed**; the current run also completed the API suite.
  - API current run — **30 files passed, 375 tests passed, 4 skipped**; the skipped tests are the pending Coach rollback integration tests.
  - `git diff --check` — **exit 0**.
  - Required security scanners — completed; results are recorded in Section 11.
- No physical iOS or Android device was executed in this audit.
- No native EAS build was started.
- No production deployment or production database write was performed.

## 5. Repository / Commit Audited

The audited commit is `2ddfaa2`, on `main`, with the attached master-audit mission as its only commit delta from the prior Profile refactor baseline. The working tree was clean before this report was created.

Primary areas inspected:

- `artifacts/calora` — Expo/React Native application.
- `artifacts/api-server` — Express API and public legal/universal-link pages.
- `artifacts/fatsecret-gateway` — provider gateway.
- `lib/api-spec`, `lib/api-client-react`, `lib/api-zod`, `lib/db`, and OpenAI integration package.
- `scripts` — QA, release, and provider utilities.
- `docs` — prior readiness, security, billing, Coach, release, and interaction reports.
- `.replit`, `artifacts/calora/app.json`, `artifacts/calora/eas.json`, and environment templates.

## 6. System Inventory

### Client

- Expo Router application with onboarding, Home, Recipes, Scan, Progress, Plan, Profile, Coach, Memory, saved recipes, restaurants, meal-image preview, authentication, invite, and recovery routes.
- Local-first state in `CaloraContext.tsx`.
- AsyncStorage account-scoped state, SecureStore-backed native Supabase session, local notification inbox, diary sync outbox, planner state, recipes, memories, preferences, health snapshots, and intelligence facts.
- Native integrations for camera, image picker, file system, sharing, notifications, HealthKit, Health Connect, and RevenueCat.

### Server

- Express 5 API with health/version routes, diary and sync, capture, planner, recipes, premium recipes, restaurant foods, referral, account deletion, Coach consent/Fact Context, public legal pages, invite pages, and association files.
- Bearer-token verification through Supabase server-side `getUser`.
- Drizzle/PostgreSQL data layer with user, profile, diary, weight, recipe, capture, subscription, referral, sync, consent, rollout, idempotency, and deletion-related tables.
- OpenAI integration for capture, planner, recipes, and Coach.
- FatSecret provider gateway/direct provider path.
- Signed object-storage URL path for generated recipe imagery.

### Build and operation

- pnpm workspace and TypeScript project references.
- Orval-generated API client/schema packages.
- EAS profiles for development, device development, preview, production Android AAB, and internal production APK.
- Replit workflows for API, Expo, and component preview.
- API esbuild bundle with linked source maps.
- No crash-reporting SDK or production analytics/telemetry pipeline was found.

## 7. Application Flow Map

| ID | Flow | Primary path | Recovery/error path | Evidence status |
| --- | --- | --- | --- | --- |
| F-01 | First launch | Splash → hydrate → onboarding → tabs | hydration retry, clear/reset | Level B/C |
| F-02 | Signup/sign-in | auth route → Supabase session → account-scoped provider | invalid credentials, verification, reset, callback cancellation | NOT VERIFIED live; Level C source |
| F-03 | OAuth/PKCE | browser auth session → callback → code exchange → signed-in state | duplicate callback, timeout, cancel, invalid code | Level B tests/C source; native callback NOT VERIFIED |
| F-04 | Home/dashboard | daily totals, remaining calories, macro/status cards | empty day, date navigation, local hydration | Level A prior web/C source |
| F-05 | Diary logging | search/manual/capture → review → approve → local diary | reject, provider failure, offline outbox/retry | Level B/C; native capture NOT VERIFIED |
| F-06 | Diary edit/delete | edit or delete local entry → totals/outbox | undo or failed sync | Level B |
| F-07 | Recipe discovery | browse/search/filter → detail | provider/cache/AI nutrition failure | Level A/B/C |
| F-08 | Recipe creation | concept generation → full recipe → save/image | auth, rate limit, provider failure | Level B; live provider NOT VERIFIED |
| F-09 | Planner/shopping | week view → generate/edit → shopping list | bounded generation failure, week navigation, undo | Level A/B/C |
| F-10 | Scan/capture | camera/barcode/photo/voice/text → review → accept/discard | permission denial, fallback, malformed provider data | Web partial; native NOT VERIFIED |
| F-11 | Progress | weights, goal, signals, target editing | invalid input, delete/undo, no history | Level A/B/C |
| F-12 | Coach/memory | consent → bounded context → response/history | risk redirect, provider failure, clear history | Level B/C; production exposure NOT VERIFIED |
| F-13 | Notifications | preference → schedule → inbox/tap routing | denial, cancellation, account switch | Source/tests; native delivery NOT VERIFIED |
| F-14 | Health | permission → current-day snapshot → local state | unavailable/partial grant | Source/tests; native NOT VERIFIED |
| F-15 | Subscription | offerings → purchase → entitlement → restore | pending/failure/cancel/expiry | Source/tests; real stores NOT VERIFIED |
| F-16 | Referral/invite | HTTPS invite → app handoff → redeem/qualification/reward | self/cap/retry/provider failure | Level B/C; two-account production path NOT VERIFIED |
| F-17 | Export/delete | export or clear/delete account | cancellation, provider failure, retry/recovery | Level B local; full deletion NOT VERIFIED |
| F-18 | Universal links | HTTPS invite → installed app or web fallback | no app, association cache, crawler | Server/source; OS handoff NOT VERIFIED |

## 8. Architecture Assessment

**Assessment: Partially ready for controlled testing; not ready for public production.**

Strengths:

- Explicit local-first boundary prevents the UI from pretending that optional remote sync is complete.
- Account-scope keys and provider remounting reduce in-memory cross-account leakage.
- Authenticated server routes derive identity from verified bearer tokens rather than trusting body user IDs.
- Persistence and destructive-clear operations have serialized lifecycle guards.
- AI routes have bounded payloads, rate controls, provider timeouts, and fallback/error responses.
- Public/static asset routing and signed object paths are deliberately constrained.

Material architecture concerns:

- The large `CaloraContext` is a high-coupling state owner; changes to account transitions, persistence, notifications, health, or sync can affect many flows.
- Database tenant isolation remains API-predicate-only, not database-enforced.
- Client-generated intelligence facts are sent to a server route that treats them as approved facts.
- OpenAPI and route registration have drift: the spec declares profile, foods/search, and weights paths that are not mounted by the observed route index, while several implemented routes are not represented in the shown spec sections. This is a contract-governance risk.

## 9. Authentication Assessment

**Status: Source and automated boundary checks are encouraging; live authentication is NOT VERIFIED.**

Observed:

- Supabase public URL/anonymous key are client configuration; server uses bearer verification and server-derived identity.
- Native auth uses SecureStore-backed persistence and PKCE.
- Callback code handles query/hash forms, cancellation, errors, reset-password routing, and duplicate/in-flight protection.
- Provider remounting uses the authenticated user ID versus guest scope.
- Sign-out uses local scope to prevent an unintended remote-wide sign-out.

Not verified:

- Real email signup, verification, password reset, and login with disposable accounts.
- Google OAuth provider configuration and redirect allow-list.
- Native browser-to-app callback on iOS and Android.
- Expired, revoked, forged, and concurrent live sessions.
- Post-logout cold launch and cross-account device transitions against live Supabase.

## 10. Database / Supabase / RLS Assessment

**Status: NO-GO for a claim of database-level tenant isolation.**

The API uses verified identity and owner predicates for the active diary/sync/capture surfaces. Automated tests include guessed-ID reads/deletes, same-client-ID isolation, foreign capture-session rejection, sync idempotency, and account-deletion fencing.

However, the inspected schema and prior database evidence do not show:

- PostgreSQL RLS policies for Calora user-owned tables.
- A request-local database identity or non-privileged application role.
- Separate least-privilege credentials for ordinary API traffic.
- Production role/grant/policy propagation and rollback evidence.
- A direct cross-user denial test executed under the production-equivalent non-owner role.

This means API authorization is a meaningful control, but it is not a database security boundary. A server credential compromise or future route mistake could bypass the intended isolation.

Account deletion:

- Server-side identity, deletion fencing, transaction ordering, app-row cleanup, RevenueCat cleanup, and Supabase Auth deletion paths exist.
- Automated failure/retry/idempotency and a real-schema deletion fence are covered.
- Full live disposable-account deletion, provider erasure, and production recovery are NOT VERIFIED.

## 11. Security Assessment

### Required scanner results

| Scanner | Result |
| --- | --- |
| Dependency audit | **7 high, 4 moderate, 1 low** |
| SAST | **5 medium secret-pattern matches** |
| HoundDog | **0 vulnerabilities** |

### Dependency findings

Current scanner findings, with no secret values exposed:

- `uuid@7.0.3` — `GHSA-w5hq-g745-h8pq`, high; available fix requires major upgrade to `11.1.1`; transitive through Expo/Xcode tooling.
- `fast-uri@3.1.5` — four high advisories; fix `3.1.6`; transitive through AJV/Expo build configuration.
- `image-size@1.2.1` — two high advisories; transitive through Metro/Expo tooling.
- `@xmldom/xmldom@0.8.13` and `0.9.10` — moderate; fixes `0.8.15` and `0.9.12`; transitive through Expo plist tooling.
- `decode-uri-component@0.2.2` — moderate; fix `0.5.0`.
- `qs@6.15.3` — moderate and low advisories; fix `6.16.0`; transitive through Express/body-parser and test clients.

These are confirmed supply-chain findings. Reachability varies: several appear to be build/configuration tooling rather than bundled application code, but the runtime `qs` path is associated with Express and the compatible upgrade path has not been applied or regression-tested. No dependency upgrade was performed during the audit.

### SAST classification

The five medium matches occur in:

- `.replit` — RevenueCat public/test client keys and related public app/project identifiers.
- `artifacts/calora/eas.json` — public Expo/Supabase/RevenueCat configuration.
- `artifacts/calora/env.example` — placeholder `DATABASE_URL`.

The inspected matches do not establish that a server service-role key, database password, OpenAI secret, FatSecret secret, or session secret is committed. The public mobile identifiers are intentionally bundle-visible by design. The scanner findings should nevertheless be resolved or explicitly suppressed with documented rationale, and the shared test client key should be treated as publicly exposed/test-only.

### Confirmed security strengths

- Bearer authorization is server-verified.
- User IDs are not trusted from request bodies for the audited private routes.
- AI/capture and recipe endpoints use bounded schemas, timeouts, and rate controls.
- Anonymous capture and guest recipe generation are explicitly rate-limited rather than treated as authenticated.
- Rate-limit failures are fail-closed for sensitive paths.
- Request logging redacts authorization/cookie headers and strips query strings.
- No direct Express static upload handler was found.

### Security gaps

- No database RLS/least-privilege boundary.
- Coach Fact Context integrity gap when the gated route is enabled.
- Sync payload amplification and unbounded device ID allow authenticated storage pressure.
- Missing baseline HTTP hardening headers and Express fingerprint suppression.
- Public AI endpoints remain exposed to distributed-IP abuse even with per-IP limits.
- No independent production crash/incident telemetry.

## 12. External API Assessment

Integrations discovered:

- Supabase Auth and server admin.
- OpenAI through the Replit integration package.
- FatSecret through the gateway/direct provider path.
- RevenueCat.
- Object-storage sidecar/signed URLs.
- HealthKit and Health Connect.
- Expo camera, notifications, sharing, and native system services.

Source and tests demonstrate bounded requests, normalized provider errors, rate limiting, single-flight/caching in key recipe paths, and local fallbacks. Provider credentials, deployed gateway availability, OpenAI billing/quota behavior, production object-storage routing, FatSecret static egress, and live failure behavior are NOT VERIFIED.

The application should be tested with provider timeouts, 401/403/404/429/500 responses, malformed JSON, missing fields, slow responses, duplicate requests, cancellation, and quota exhaustion in a deployed staging-equivalent environment.

## 13. Nutrition Data Integrity Assessment

**Status: Local calculation and provenance logic have substantial automated coverage; end-to-end provider-to-UI correctness is not fully verified.**

Observed safeguards:

- Non-negative finite numeric normalization in intelligence calculations.
- Explicit provenance categories separating verified, manual, photo-estimate, recipe, and barcode sources.
- Review/accept boundary for captured food.
- Planner and target bounds.
- Diary/sync schema validation and stable snapshots for historical nutrition.
- Calorie/macro totals are derived from local logs and the UI preserves the “Burned” label.

Remaining verification:

- Provider values through capture/search/barcode/photo into stored diary snapshots.
- Serving conversions, decimal rounding, zero/negative/large values, missing macros, and timezone day boundaries on native devices.
- Repeated logging/edit/delete across an authenticated sync cycle.
- Recipe/planner totals after provider fallback and delayed nutrition persistence.
- Exact barcode UPC behavior against live provider data.

## 14. Subscription and Payment Assessment

**Status: NOT VERIFIED; release blocker.**

Source shows RevenueCat initialization, user identity alignment, offerings, purchase, restore, customer information, and the expected entitlement identifier. Premium server routes perform server-side entitlement checks rather than trusting a client boolean.

Not verified:

- App Store Connect products and Play products.
- RevenueCat offering/package/product mapping for both platforms.
- Trial eligibility, localized prices, monthly/annual purchase, cancellation, renewal, expiry, refund, grace period, pending purchase, restore, reinstall, device change, and account switching.
- RevenueCat deletion behavior during account deletion.
- Offline entitlement behavior.
- Store review behavior for the “Manage subscription” informational UI.

The web/browser and Test Store evidence recorded in earlier documents cannot certify native store transactions. No real financial transaction was initiated.

## 15. UI / Interaction Assessment

Prior live web evidence and automated tests cover onboarding, tab navigation, diary entry/edit/delete, recipes, planner rendering, profile preferences, local clear, Coach interactions, and notification preference controls. The latest Profile density pass preserved its existing You/Membership/Account structure and handlers.

Known limitations:

- Camera/barcode/photo and native permission interactions were not executed on a device.
- Native gesture behavior such as planner move/copy and Android back behavior is not certified.
- Export share sheet and file handoff are not certified.
- Rapid same-gesture duplicate-action testing is not equivalent to delayed browser automation.
- Provider failure and interrupted-operation UI recovery need device/staging execution.

## 16. Responsive Design Assessment

**Web mobile viewport evidence exists; native size/platform coverage is NOT VERIFIED.**

The prior live preview used a 402×874 mobile viewport and rendered the Profile flow after the latest refinement. Source includes safe-area usage and responsive layout choices.

Still required:

- Small Android, large Android, iPhone safe-area, unusual aspect-ratio, landscape/rotation, and keyboard-open layouts.
- Dynamic text at system maximum and minimum settings.
- Modal/sheet clipping, nested scrolling, focus, and Android back behavior.
- Light/dark/system appearance on native platforms.

## 17. Accessibility Assessment

Source contains accessibility labels, roles, states, live-region announcements, test IDs, and font-scale styling in important flows. This is evidence of intent, not a complete accessibility certification.

NOT VERIFIED:

- VoiceOver traversal and focus order.
- TalkBack traversal, announcements, and back handling.
- Dynamic Type/system-font extremes.
- Contrast in all semantic states.
- Reduced motion and switch-control behavior.
- Camera/health/notification permission announcement quality.
- Native accessibility tree behavior after modal and gesture transitions.

## 18. Performance Assessment

Automated local intelligence performance samples are present, and the app uses bounded provider payloads, query caching, and list/image patterns. Current tests do not establish production cold-start, memory, network, or bundle budgets.

Required measurements:

- Native cold/warm start and screen transition latency.
- Home hydration and diary rendering with realistic history.
- Search, capture, barcode, image processing, recipe, planner, and Coach latency.
- Memory after repeated navigation and image-heavy flows.
- Bundle size, native binary size, image transfer size, and provider request counts.
- API p95/p99 latency, timeout rates, rate-limit behavior, and database pool saturation.

## 19. Network Resilience Assessment

Automated suites simulate offline, provider failure, rate-limit database failure, sync conflicts, retries, transient quarantine, and fail-closed sensitive paths. The current test run intentionally emitted fault-injection logs while passing; these logs are not production incidents.

Not verified in a real client/server environment:

- Connection loss during capture, upload, auth, purchase, export, and account deletion.
- App kill during an outbox write or provider request.
- Slow/intermittent mobile network.
- Retry behavior across process restart with real persisted state.
- Duplicate requests from a real mobile transport.

## 20. Mobile Lifecycle Assessment

The code contains hydration, account remount, notification lifecycle serialization, persistence recovery, and outbox guards. Native lifecycle execution was not performed.

Required tests include cold launch, warm launch, background/foreground, force-quit, low-memory relaunch, interrupted authentication, interrupted purchase, interrupted capture, and interrupted sync. A successful web reload is not a substitute for these tests.

## 21. Privacy Assessment

The repository includes privacy, terms, support, deletion, subscription, and wellness-disclaimer pages. Client configuration uses public Supabase/RevenueCat values; server-only secrets are referenced through environment names and were not printed.

Confirmed privacy/data-retention concern:

- Primary local account state is cleared, but separate sync bookkeeping, referral activation flags, and quarantined legacy state remain on device. This conflicts with a strict interpretation of “clear all local data” or complete local deletion.

Not verified:

- Actual deployed legal URLs and legal-owner/support mailbox operation.
- Store privacy labels and data-safety declarations.
- Provider retention and deletion behavior.
- HealthKit/Health Connect disclosure alignment.
- Native permission prompt wording and generated privacy manifests.

## 22. Localization Assessment

No translation framework or complete locale resource set was found. The source contains extensive hardcoded English and several `en-US` date formatters, while some number formatting uses device locale.

If multilingual support is part of the release promise, this is a **P2 release-quality blocker**. If the intended launch is English-only, the store and product scope must state that clearly, and date/number/unit formatting should still be tested under non-US device locales.

RTL, plurals, long translated strings, localized subscription text/prices, and Unicode-heavy input are NOT VERIFIED.

## 23. Build / Release Assessment

Confirmed configuration:

- Expo app version `1.0.0`, iOS bundle identifier and Android package are configured.
- EAS production profile auto-increments and produces an Android App Bundle; an internal APK profile also exists.
- Production mobile environment points to the configured HTTPS API and Supabase project using public client values.
- Custom web/static build scripts are separate from the intended native EAS build.
- Universal links are configured for the published host and invite path.
- Association endpoints intentionally return unavailable status unless signing/team environment values are configured.

NOT VERIFIED:

- Fresh native EAS build and install.
- Signing credentials, provisioning, App Store Connect, and Play Console identity.
- Generated entitlements, manifests, privacy manifests, and permission output.
- Production API deployment and migrations.
- DNS, TLS, association-file content/reachability, MIME, redirects, and OS association cache behavior.
- Release-channel/update policy, source-map upload/consumption, and crash symbolication.

## 24. Observability Assessment

**Status: Insufficient for public production.**

The API has structured logging and generic error responses, and the build emits linked source maps. However, no Sentry, Crashlytics, Bugsnag, analytics/telemetry SDK, release-symbol pipeline, or production alerting system was found.

Console logs include fault details in some provider paths. They do not appear to include credentials, but provider messages and upstream codes should be classified before production retention.

Required minimum:

- Crash reporting with native symbolication.
- API error-rate, latency, provider, queue, database, and rate-limit metrics.
- Release/build identifier correlation.
- Privacy-safe breadcrumbs and account/request correlation without raw nutrition, tokens, or message content.
- Alert thresholds and an incident runbook.

## 25. Complete Defect Register

### Confirmed findings

#### AUD-P1-001 — Database tenant isolation is not database-enforced

- **Severity:** P1 Critical.
- **Affected flows:** Authenticated diary, sync, capture, account operations, and every future user-owned route.
- **Platforms:** Server/production database.
- **Evidence:** Level B/C. API isolation and deletion-fence tests pass; source/schema and prior database evidence show no RLS/least-privilege request boundary.
- **Reproduction:** Obtain or introduce a privileged/shared database credential, then query outside the API owner predicate; no database policy is present to deny the cross-user operation.
- **Expected:** A database boundary independently denies User A access to User B data.
- **Actual:** Correctness depends on every API path preserving owner predicates and on the shared credential remaining uncompromised.
- **Root cause:** Shared privileged database access without RLS/request-local role isolation.
- **Recommendation:** Establish a non-owner application role, explicit grants, RLS or an equivalent database isolation boundary, production propagation, and direct denial tests.
- **Regression risk:** High; affects migrations, account deletion, background jobs, and pooler behavior.
- **Verification:** Two real accounts plus production-equivalent non-owner DB role; read/create/update/delete cross-user denial tests.

#### AUD-P1-002 — Coach Fact Context accepts client-authored approved facts

- **Severity:** P1 when the route is enabled; P2 while it remains provably dark.
- **Affected flows:** Controlled Coach Fact Context and provider egress.
- **Platforms:** API/client.
- **Evidence:** Level B/C. `coachFactContext.ts` validates allowlisted structure, statement/value consistency, TTL, nonce, consent, and rollout, but does not recompute facts from server-owned diary/profile data or verify a server signature. Tests construct accepted contexts from client-supplied values.
- **Reproduction:** An eligible consenting account submits altered `consumedKcal`, `targetKcal`, `remainingKcal`, or protein values with the matching deterministic statement generated from those altered values. Structural validation can accept the context and the provider receives it as approved context.
- **Expected:** “Verified” facts are computed or authenticated by the server.
- **Actual:** Client-authored facts can pass the closed structural validator.
- **Root cause:** Integrity validation proves internal consistency, not provenance.
- **Recommendation:** Recompute the allowlisted facts server-side from authoritative data, or use an authenticated server-produced context token/signature. Keep the feature disabled until that boundary is proven.
- **Regression risk:** Medium/high; affects local-first data timing, auth, consent, nonce, and rollout contracts.
- **Verification:** Negative tampering test with valid structure; assert no provider call and no verified observation.

#### AUD-P1-003 — Production/native release gates have no direct evidence

- **Severity:** P1 release gate, not a single code defect.
- **Affected flows:** Auth, billing, camera, health, notifications, universal links, export, and store release.
- **Evidence:** Level C/D. Configuration and source exist; no current native build/device/store/production execution.
- **Actual:** Release approval would rely on unverified provider and platform assumptions.
- **Recommendation:** Complete the manual/device/staging gates in Sections 29–31 before approval.
- **Verification:** Fresh signed build on supported iOS and Android devices plus production-equivalent services.

#### AUD-P2-001 — Clear/delete retains auxiliary local metadata

- **Severity:** P2 High.
- **Affected flows:** Local clear, account deletion, account switching, diary sync, referrals.
- **Evidence:** Level A/C. `clearAllData` clears the primary account state but separate sync keys and the quarantined legacy snapshot are outside that operation.
- **Expected:** “Clear all data” removes all account-associated local content and metadata promised by the UI/policy.
- **Actual:** Sync identifiers/tombstones/rejection bookkeeping, referral activation state, and quarantined legacy state can remain.
- **Root cause:** Multiple AsyncStorage namespaces are not owned by one deletion coordinator.
- **Recommendation:** Inventory and clear all account/device keys intentionally; define whether device-wide quarantine is retained, exported, or destroyed, and test crash/retry serialization.
- **Regression risk:** High; can affect sync safety and account transition behavior.
- **Verification:** Seed every known local key, invoke clear/delete, inspect storage after completion and after relaunch.

#### AUD-P2-002 — Dependency advisories remain unresolved

- **Severity:** P2 High.
- **Affected flows:** Build/release and Express runtime depending on package reachability.
- **Evidence:** Level B scanner output.
- **Expected:** No unjustified high-severity dependency advisories remain in the release graph.
- **Actual:** 7 high, 4 moderate, and 1 low findings remain.
- **Root cause:** Transitive dependency versions in Expo/Metro/AJV/Express trees.
- **Recommendation:** Upgrade direct parents or apply compatible overrides, then rerun all typecheck/tests and native build validation. Do not bypass package security controls.
- **Regression risk:** Medium/high for Expo/Metro toolchain changes.
- **Verification:** Clean lockfile, dependency audit with zero unjustified high findings, successful native and API regression suites.

#### AUD-P2-003 — Sync payload and device identifiers are insufficiently bounded

- **Severity:** P2 High.
- **Affected flows:** Authenticated diary sync.
- **Evidence:** Level C. Global JSON is 15 MB; mutation count is bounded, but raw mutation payload and device ID are not bounded to a tight schema budget before ledger persistence.
- **Expected:** Unknown data cannot cause disproportionate database growth.
- **Actual:** A valid-shaped mutation can carry large unknown fields that are persisted in the sync ledger.
- **Recommendation:** Reject unknown keys, cap serialized mutation payload and device ID length, and test repeated authenticated requests and database growth.
- **Regression risk:** Medium; must preserve legacy sync compatibility.
- **Verification:** Boundary tests around payload/device limits and a storage-growth abuse simulation.

#### AUD-P2-004 — Contract drift between OpenAPI and mounted routes

- **Severity:** P2 High.
- **Affected flows:** Generated client and any profile/food-search/weight consumers.
- **Evidence:** Level C. OpenAPI declares routes such as `/v1/profile`, `/v1/foods/search`, and `/v1/weights`, while the observed route index does not mount corresponding route modules; several implemented routes are not represented consistently.
- **Expected:** Generated contract and deployed route graph agree.
- **Actual:** Code generation can produce client operations that return 404 or become stale relative to implementation.
- **Recommendation:** Reconcile the canonical spec and route registration, regenerate clients, and add a route-contract smoke test.
- **Regression risk:** Medium/high for all API consumers.
- **Verification:** Enumerate spec operations and assert each intended operation is mounted and responds with the documented auth/status contract.

#### AUD-P2-005 — Production observability is incomplete

- **Severity:** P2 High.
- **Affected flows:** All production operations.
- **Evidence:** Level C. No crash/telemetry SDK or symbolication/alerting pipeline found.
- **Expected:** Customer-impacting failures can be detected and diagnosed.
- **Actual:** Failures primarily surface through logs and generic responses.
- **Recommendation:** Add privacy-safe crash and API monitoring before public launch, or explicitly restrict launch to a controlled pilot with operator coverage.
- **Regression risk:** Low/medium, depending on SDK/native configuration.
- **Verification:** Deliberate test crash/API fault in staging appears with release identity and no sensitive payload leakage.

### Suspected / conditional findings

#### AUD-P3-001 — Baseline HTTP security headers are absent

- **Severity:** P3 Medium.
- **Evidence:** Level C. No `x-powered-by` suppression or baseline security-header middleware was found.
- **Impact:** Fingerprinting and defense-in-depth gap, particularly for public HTML pages.
- **Verification:** Inspect deployed response headers and add a header policy appropriate to API/legal/invite content.

#### AUD-P3-002 — Signed-out guest namespace is shared on one device

- **Severity:** P3 Medium.
- **Evidence:** Level C. The guest key is intentionally shared for local-first anonymous use.
- **Impact:** Multiple signed-out people sharing one device can see the same guest state.
- **Verification:** Run two signed-out user scenarios and decide whether this behavior matches product/privacy promises.

#### AUD-P3-003 — RevenueCat premium UX/enforcement may be incomplete

- **Severity:** P2 if premium capabilities are advertised as gated; otherwise NOT VERIFIED.
- **Evidence:** Level C. Server premium routes check entitlements, but consumer-side capability coverage and native purchase state are not fully proven; Manage Subscription is informational in the observed UI.
- **Verification:** Exercise every premium entry point under free, trial, active, expired, restored, and unavailable-store states.

## 26. Remediation Log

No P0, P1, or P2 code finding was marked fixed during this audit. This was intentionally an audit-first pass.

Documentation actions:

- Recorded the current commit and environment.
- Re-ran typecheck and tests.
- Re-ran all three required security scanners.
- Created this master report to supersede any older web-only “ready” wording.

Prior product repairs remain historical evidence, not new remediation in this audit. They include the recipe-to-diary state race, shopping-list modal interaction, duplicate chart key, preview proxy redirect, and Profile visual-density refinement.

## 27. Regression Matrix

| Area | Evidence | Result | Limitation |
| --- | --- | --- | --- |
| Workspace typecheck | `pnpm run typecheck` | Passed | Does not prove native build |
| Mobile/API tests | `pnpm test` | Passed; 74 files/1,126 tests; API current run 375/379 | Mocked/controlled providers and no physical device |
| API authorization | API test suites | Passed for covered routes | Live Supabase sessions and production deployment NOT VERIFIED |
| Tenant predicates/sync | Integration tests | Passed for covered diary/sync cases | Database RLS absent |
| Account deletion fence | Real-schema test | Passed for fence behavior | Full live provider/Auth deletion NOT VERIFIED |
| Coach safety structure | 68 route tests plus consent tests | Passed structural cases | Does not prove server-owned fact provenance |
| Local persistence/clear | Mobile integration tests | Passed intended primary-state behavior | Auxiliary-key deletion gap remains |
| Prior web UI flows | Prior recorded live evidence | Passed/partial by flow ledger | Not re-executed here; not native evidence |
| Dependency security | Current scanner | 7 high unresolved | Reachability and upgrades pending |
| Native release | No build/device execution | NOT VERIFIED | Required before GO |

## 28. Remaining Risks

- Shared privileged database access remains the largest architectural blast-radius risk.
- Enabling Coach Fact Context before server recomputation/signing would permit misleading “verified” facts.
- Local deletion semantics may not meet the strongest privacy promise.
- Provider outage, quota, and distributed abuse behavior is not production-proven.
- Native permission, health, notification, camera, lifecycle, accessibility, and store behavior remain unknown.
- Billing correctness and entitlement propagation are not verified on real stores.
- Lack of crash/incident observability makes production failures difficult to diagnose.
- Contract drift can cause generated clients and server behavior to disagree.
- The public origin, universal-link association, legal pages, and production API configuration are not currently certified as deployed.

## 29. NOT VERIFIED Items

1. Physical iOS execution.
2. Physical Android execution.
3. Fresh signed EAS build and install.
4. App Store Connect and Play Console configuration.
5. Real Supabase signup/login/verification/reset.
6. Google OAuth provider and redirect configuration.
7. Live token expiry, revocation, forged-token, and concurrent-session behavior.
8. Production database role/grant/RLS state.
9. Production migrations and support-object propagation.
10. Direct cross-user database denial under production-equivalent credentials.
11. Full disposable-account deletion including Supabase Auth and RevenueCat.
12. Live authenticated diary sync and cross-device recovery.
13. Live capture/barcode/photo/voice provider behavior.
14. FatSecret gateway deployment/static-egress behavior.
15. OpenAI production credentials, quotas, latency, and provider policy behavior.
16. RevenueCat product mapping and native purchase/restore/expiry/refund/grace flows.
17. Native camera, microphone, photo-library, notification, HealthKit, and Health Connect permissions.
18. Notification scheduling/delivery after relaunch and account switching.
19. Export/share-sheet behavior on native devices.
20. Universal-link OS handoff, association cache, and no-app fallback.
21. Native accessibility tree, VoiceOver, TalkBack, Dynamic Type, contrast, and reduced motion.
22. Native performance, memory, bundle size, and network budgets.
23. Production crash reporting, alerting, source-map symbolication, and incident runbooks.
24. Store privacy manifests, health declarations, data-safety forms, age rating, screenshots, and legal/support ownership.
25. Localization, RTL, pluralization, long strings, and non-US number/date/unit behavior.

## 30. Required Manual / Physical-Device Tests

### Authentication and lifecycle

1. Install a fresh development-device build on one iOS and one Android device.
2. Complete signup, email verification, sign-in, reset, logout, cold relaunch, and account switch.
3. Execute Google OAuth, cancellation, timeout, duplicate callback, interrupted browser, and invalid-code paths.
4. Revoke/expire a session and confirm one refresh/retry followed by a clear sign-in prompt.

### Core data and sync

1. Create two disposable accounts and log/edit/delete diary entries on each.
2. Verify local-first behavior offline, restart with pending outbox, reconnect, and inspect server reconciliation.
3. Attempt cross-account identifiers and malformed identifiers against the deployed API.
4. Invoke local clear and account deletion, then inspect primary and auxiliary local keys after relaunch.

### Capture, nutrition, and health

1. Test camera denial/grant/retry, photo library, barcode formats, receipt/label, voice, and text fallback.
2. Verify exact UPC matching and review/accept/reject behavior.
3. Exercise zero, decimal, large, missing, edited, repeated, deleted, and timezone-boundary nutrition cases.
4. Test HealthKit and Health Connect partial/full grants, no-data state, current-day snapshots, and provenance.

### Billing

1. Use RevenueCat/Test Store or platform sandbox on both platforms.
2. Test offerings, trial, monthly, annual, purchase failure, pending, cancellation, restore, reinstall, device change, expiry, refund/grace where supported, and account switching.
3. Confirm every premium surface is server-authorized and that free users receive a recoverable, truthful state.

### Notifications, accessibility, and resilience

1. Schedule meal, hydration, and goal reminders; background, force-quit, relaunch, tap, read, clear, and switch accounts.
2. Test VoiceOver/TalkBack, large text, contrast, reduced motion, keyboard, back navigation, and modal dismissal.
3. Kill the app during auth, capture, sync, export, clear, and purchase; confirm recoverability and no silent data loss.

## 31. Store-Release Blockers

- Unresolved P1 database isolation boundary.
- Coach Fact Context provenance gap if the feature is enabled for production users.
- No direct native iOS/Android release evidence.
- No real App Store/Play billing and entitlement evidence.
- No production API/database/migration/deployment evidence.
- Association files and signed-build OS handoff not verified.
- Native health/camera/notification permission and disclosure output not verified.
- Dependency advisories not remediated or explicitly risk-accepted.
- No production crash/incident monitoring and source-map operational proof.
- Account clear/delete retention semantics not reconciled with privacy promises.
- Contract drift between OpenAPI and route registration.
- Store legal, privacy, support, health, data-safety, metadata, and signing materials not certified.

## 32. Final Production Checklist

- [ ] P0 count is zero.
- [ ] P1 findings are fixed or formally closed with evidence.
- [ ] P2 findings are fixed or justified with explicit owner/risk acceptance.
- [ ] Database least privilege/RLS or equivalent isolation is deployed and denial-tested.
- [ ] Coach facts are server-recomputed or cryptographically authenticated; the dark gate is independently verified.
- [ ] All local clear/delete namespaces are inventoried and tested.
- [ ] Dependency scan has no unjustified high findings.
- [ ] OpenAPI and mounted routes are reconciled and contract-tested.
- [ ] API production health, auth rejection, rate limits, migrations, and deletion are verified.
- [ ] iOS and Android signed builds are installed and tested.
- [ ] OAuth, deep links, universal links, and association files pass on both platforms.
- [ ] Camera, barcode, library, health, notification, export, lifecycle, and accessibility tests pass.
- [ ] RevenueCat offerings, purchase, restore, expiry, and entitlement gates pass on both stores/sandboxes.
- [ ] Crash reporting, source maps, metrics, alerts, and runbooks are operational.
- [ ] Privacy policy, terms, support, deletion, wellness disclosures, store forms, and data-safety declarations match actual behavior.
- [ ] Release candidate is frozen and all evidence references the exact signed candidate.

## 33. Final Recommendation

Do not publish Calora as a public production release from this commit. The repository is suitable for continued controlled development and staging validation, and the local/web product foundation is materially implemented. The next work should prioritize the database isolation boundary, Coach fact provenance, deletion namespace cleanup, dependency remediation, API contract reconciliation, and a real signed-device/provider release gate. Only after those items and the manual tests above have evidence-backed results should a new production verdict be issued.