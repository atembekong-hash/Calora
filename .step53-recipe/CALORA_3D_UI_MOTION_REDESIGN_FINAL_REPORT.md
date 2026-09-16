# CaloraApp 3D UI, Motion, and Spatial Design Final Report

Date: 2026-08-27  
Scope: controlled whole-app visual modernization  
Verdict: **PASS**

## Executive summary

CaloraApp now has an additive spatial design foundation and a broader dimensional treatment across its core mobile experience. The work preserves the existing warm cream, coral, deep-green, and editorial-food identity while introducing semantic depth tiers, more consistent radii and boundaries, stronger hierarchy, tactile priority, and a clearer distinction between primary, grouped, and supporting surfaces.

The implementation is intentionally not a rewrite. Existing routes, event handlers, state mutation paths, backend contracts, authentication, persistence, nutrition rules, provenance, RevenueCat, health, referrals, Coach safety, Fact Context boundaries, and destructive confirmations were not changed.

The visual modernization scope passes. The Scan review sheet was first verified in both light and dark themes using Playwright-only request interception. A later deep release audit repaired the managed AI integration configuration and request options, after which the real Scan and recipe-generation endpoints both returned `200`.

## Delivered design foundation

### Semantic spatial tokens

The existing token module now defines four depth tiers for both light and dark themes:

- `inset`
- `flat`
- `raised`
- `floating`

Each tier uses restrained shadow opacity, offset, radius, and Android elevation appropriate to the active theme.

### Theme-aware Surface primitive

A focused `Surface` component centralizes:

- Active light/dark depth selection
- Semantic surface tier
- Shared radius scale
- Tonal background choice
- Optional hairline border treatment
- Standard React Native view props and caller styles

It is additive and can be adopted incrementally rather than forcing a risky global migration.

### Shared motion system

The implementation now defines four bounded semantic motion tiers plus modal choreography:

- Micro feedback
- Component transition
- Screen choreography
- Modal transition
- Celebration

The shared motion helper applies bounded staggering and Reanimated system reduced-motion behavior. The motion system is used by tactile press feedback, tab-focus navigation, Home and Coach component entrances, Profile screen choreography, and the Scan result sheet. Reduced-motion mode resolves movement through the system preference rather than requiring parallel screen-specific animation code.

### Typography and hierarchy

- `Inter_800ExtraBold` is registered for selective hero use.
- Existing type families and semantic copy remain intact.
- Key cards and controls use more coherent radius and boundary treatment.
- High-priority actions and summaries receive stronger spatial emphasis without hiding data.

## Surface rollout

### Home

- Calorie, daily rhythm, contextual insight, diary, recipe, and Planner modules retain their real data and handlers.
- Major summary surfaces have clearer raised/flat hierarchy.
- Quick actions remain compact and reachable.
- Existing motion primitives and reduced-motion behavior remain in place.
- Diary component entrances use the shared bounded component-motion tier.

### Five-tab shell

- Tab order remains exactly Home, Recipes, Scan, Progress, Plan.
- The central Scan action receives stronger floating/tactile emphasis.
- Tab-focus motion uses the shared micro spring and honors the system reduced-motion setting.
- No route names or navigation semantics changed.

### Recipes

- Discovery, fit, upcoming, recipe, creation, empty, and nutrition surfaces use consistent semantic grouping.
- Search, filters, details, saving, logging, provenance, and Planner actions remain intact.
- Modal structure remains valid and avoids removing handlers.

### Scan

- Trust, alternatives, text entry, candidate, and total-review areas receive clearer depth hierarchy.
- Camera, barcode, label, receipt, voice, and text alternatives remain available.
- Review approval/discard behavior is unchanged.
- The review total explicitly preserves its deep-green hero background and light hero text colors.
- The review sheet uses the shared modal-motion tier and system reduced-motion behavior.

### Progress

- Existing charts, summaries, trends, goal celebration, and motion remain available.
- Visual treatment stays data-first and truthful.

### Planner

- Focus, weekly overview, program, meal, and summary surfaces gain clearer hierarchy.
- Today/Week/Shopping, generation, edit, move/copy/replace, undo, log, and shopping behavior remain intact.

### Profile and Settings

- Appearance, text size, units, reminders, health, subscriptions, referrals, saved meals, export, deletion, account, privacy, and support remain present.
- Selected controls and grouped rows use refined hairline boundaries without altering settings behavior.

### Coach

- Consent, chat, evidence, history, new/clear chat, and safe actions remain intact.
- Fact Context remains closed and fail-closed.
- No Coach request payload, allowlist, context, or navigation behavior changed.

### Onboarding, Memory, and Restaurants

- Five-step onboarding structure and completion semantics remain unchanged.
- Living/Food Memory controls and provenance remain available.
- Restaurant search, result review, serving/meal selection, and log approval remain available.
- Supporting cards use refined boundaries while avoiding theme-specific hard-coded shadows.

### Invite flow

The invite route was intentionally left behaviorally and visually minimal. It is a transient persistence/redirect boundary rather than a content screen. No deep-link, pending-code, or activation behavior changed.

## Feature preservation

The detailed contract is recorded in:

- `docs/calora-feature-preservation-matrix.md`

The recovery and visual baseline is recorded in:

- `docs/calora-spatial-ui-baseline.md`

The original spatial task did not modify backend, database, schema, legal, subscription, health, referral, or production rollout behavior. A later deep release audit added narrow API reliability fixes without schema or migration changes.

## Verification evidence

### Static and unit verification

- TypeScript: **PASS**
- Vitest: **PASS**
  - 61 test files
  - 973 tests
- Static server security tests: **PASS**
  - 6 tests
- `git diff --check`: **PASS**
- Expo workflow clean restart: **PASS**
- Post-restart Metro web bundle: **PASS**
- Architect review after completion-review fixes: **PASS**

The diary-sync rejection/quarantine stderr lines are expected negative-path test output.

### Real-browser mobile verification

Viewport: 402 × 874

Passed:

- All five onboarding steps
- Continue, Back, and consent controls
- Authenticated Home rendering
- Home scrolling and legible calorie/macro information
- Home quick action navigation to Planner
- Exact five-tab order
- Recipes rendering
- Progress rendering
- Plan rendering
- Central Scan access and clean exit
- No horizontal overflow
- No blank primary screens
- No touch interception observed
- Dark Profile
- Maximum text-size Profile layout
- Dark Coach landing/consent state
- Dark Living Memory
- Planner week overview, program, action, and meal-card containment
- Recipes discovery and creation-card containment
- Scan review candidate and total-card containment
- Scan review sheet in light and dark themes using test-only request interception
- Real text Scan review with a live `200` analysis response
- Real recipe concept generation with a live `200` response and five concepts
- Reduced-motion browser context with immediate onboarding navigation

Evidence IDs from the browser run:

- Onboarding: `trovjd`, `x0cjzj`, `qcjzv6`
- Home: `01jesy`
- Recipes: `x44w7a`
- Progress: `o8ug8u`
- Plan: `3j0k5j`
- Scan entry: `i7u91o`
- Dark Profile and maximum text: `35zp8m`
- Dark Coach: `2a6kmt`
- Dark Living Memory: `73njm0`
- Scan analysis 502 state: `3a2yzx`
- Planner containment: `fqcdwu`
- Recipes creation surface: `l7h7br`
- Dark Scan review sheet: `rk8141`
- Light Scan review sheet: `jk9ndv`
- Reduced-motion onboarding: `c6dd7w`
- Live Scan review sheet: `8145yr`
- Progress weight interaction: `tcrggu`
- Expanded weight chart: `mo9ggh`
- Stable weight-row editing: `7941uc`
- Weight deletion and Undo: `254qjn`
- Expanded chart with separate row actions: `0sqpmf`
- Clean post-test Weight state: `9rzrdv`

Workspace screenshot evidence:

- `docs/evidence/calora-baseline-mobile.jpg`
- `docs/evidence/calora-baseline-large.jpg`
- `docs/evidence/calora-modernized-onboarding-large.jpg`
- `docs/evidence/calora-modernized-final-mobile.jpg`
- `docs/evidence/calora-deep-audit-final.jpg`

### Post-completion deep release audit

The 2026-08-27 release-candidate audit additionally passed:

- Complete Calora typecheck
- 63 Calora test files and 977 tests
- 6 static-server security tests
- 30 API test files passed, 1 intentionally skipped; 367 tests passed, 4 intentionally skipped
- 13 release-attestation tests
- API build
- Production-style iOS and Android bundle generation
- `git diff --check`
- Fresh Expo workflow restart
- Fresh-browser Weight Edit, Cancel, Delete, Undo, expanded-chart, and cleanup flows
- Browser console check with no nested-button, hydration, unhandled-rejection, or unexpected runtime errors

The audit corrected a process-crashing detached recovery rejection, fail-closed local photo deletion, destructive-flow rejection handling, a password-update rejection leak, invite persistence rejection handling, no-history Restaurant back navigation, managed OpenAI configuration and request options, web-invalid nested chart controls, timed chart action accessibility, and unsupported cross-device-sync claims.

### Premium Recipes and Calora Coach focused audit

The focused authenticated and signed-out browser pass additionally verified:

- Real non-Premium `403` recovery and direct Membership navigation
- Premium catalogue/provider attribution, filters, empty/provider-unavailable states, Retry recovery, detail access-loss recovery, and local recipe actions
- Query-aware Premium search behavior, including an empty result for a nonsense query and restoration after clearing it
- Saved Premium reconstruction after remount, including protected detail retrieval for saved IDs outside the current page/filter
- Coach consent boundaries, unavailable recovery, successful evidence/action rendering, allowlisted Progress navigation, history restoration, safe-risk fallback, and both reset-confirmation flows
- Compact 320 × 568 dark-mode Coach layout without horizontal overflow
- Cross-platform Profile sign-out confirmation with device-scoped local session clearing
- Cross-platform destructive modal isolation and visible failure feedback

The Coach response path remains restricted to validated Fact Context responses and allowlisted actions. No broad free-text metadata or client-authoritative safety bypass was introduced.

### Account deletion operational boundary

The account-deletion saga now uses RevenueCat v2 customer lookup/deletion and fails closed:

- A verified customer lookup `404` is treated as no provider record.
- Lookup authorization/service failures and deletion failures remain retryable failures.
- An existing customer is never reported erased unless the provider deletion succeeds.

The available RevenueCat OAuth connection can read customers but does not offer `customer_information:customers:read_write`, which RevenueCat requires for v2 customer deletion. An existing disposable QA customer therefore remains checkpointed at the RevenueCat stage with `retry_required`; its Calora application row and Supabase Auth identity were removed, and the browser session/local test data were cleared.

This is an external release blocker for complete account erasure of users with billing history. Resolve the provider permission or establish an approved equivalent erasure process before declaring that path release-ready.

## Non-blocking external validation

### Scan review sheet

The initial text-description test submitted “one medium banana.” The API route returned `502` because the managed OpenAI base URL was malformed. The integration was reprovisioned without exposing credentials. Recipe GPT-5 calls were also updated from the unsupported legacy `max_tokens` option to `max_completion_tokens`.

Post-fix live checks on 2026-08-27:

- `POST /api/v1/capture/analyze`: `200`, one candidate and one component for “one medium banana”
- `POST /api/v1/recipes/guest-concepts`: `200`, five generated concept cards

The browser then exercised the real Scan review UI, confirmed candidate editing and readable totals, and selected Not this meal so no diary data was written. Subsequent guest recipe attempts correctly returned `429` after the deliberate test quota was exhausted.

### Signed-device validation

Native camera, haptics, health permissions, RevenueCat store UI, reduced-motion device settings, and signed-install deep links require iOS/Android device validation. The existing separate invite-link verification task already covers the signed-install deep-link portion and was not duplicated.

## Final assessment

The modernization is safe to continue from a code and browser-preview standpoint:

- Core behavior is preserved.
- The design system is additive and reversible.
- Light/dark depth is centralized where semantic elevation is used.
- The five primary product areas render and navigate successfully.
- No production-sensitive boundary was changed.

The authorized visual modernization result is **PASS**. Live capture-provider recovery and native-only signed-device smoke testing remain separate operational validation work and do not require changes to this UI diff.

The Premium Recipes and Calora Coach code/browser audit is also **PASS** with no remaining P0/P1 code defect found by the final independent review. Complete account erasure for users with an existing RevenueCat customer remains blocked by the external customer read/write permission described above.
