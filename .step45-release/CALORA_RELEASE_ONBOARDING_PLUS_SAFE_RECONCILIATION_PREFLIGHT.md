# Calora Safe Full-Branch Reconciliation Preflight

**Status:** PREFLIGHT ONLY — NO RECONCILIATION EXECUTED
**Source branch:** `release/calora-onboarding-and-plus`
**Canonical destination:** `main`
**Owner decision:** All 14 inventory work items are approved for reconciliation
consideration. This approval does not authorize a blind merge, cherry-pick,
rebase, source mutation, or modification of `main`.

## 1. Executive summary

The owner-approved source identity is the **local**
`release/calora-onboarding-and-plus` tip:

```text
8ae1f1d6383b286502bc208e0de4e9fb41cde40d
tree c67a04d0b4470a08b1e6799276184c32526844c2
```

The current local target identity is:

```text
main
268df70803779914876f14b15497c976864d3ca9
tree 6fa575c9d019922281e00c0aa7ed5b1068069a6f
```

The local source contains the exact tree used to produce the approved
14-item inventory. The origin-tracking source ref is a different history and
must not be silently substituted.

The analysis finds:

1. The source branch contains meaningful runtime, contract, security, release,
   native, and evidence work.
2. Current `main` already contains newer or safer implementations for several
   critical surfaces, including capture approval, recipe pagination contracts,
   Coach Fact Context narrowing, account-deletion/release validation, CI
   architecture, and Expo/EAS configuration.
3. Several source-only deltas may be useful, including capture acceptance
   coordination, planner catalog/eligibility work, selected diary/image sync
   behavior, selected UX/lifecycle improvements, and brand/deep-link details.
4. No genuinely missing database migration was established. The Coach Fact
   Context migration files are identical across base, source, and `main`; one
   Supabase migration is intentionally inert.
5. The reported iOS weekly-program tap symptom is present in the shared
   base, `main`, and source behavior. Source reconciliation alone has
   **HAVE NO EFFECT** on that symptom.
6. A whole-branch merge would expose 319 paths to conflict and could regress
   current `main`. The safe technical direction is a **hybrid, targeted,
   reviewable reconciliation built from current `main`**, not a broad merge.

No application code, branch, database, production environment, deployment,
build, EAS action, TestFlight submission, GitHub workflow, or provider state
was modified or executed by this preflight. Git refs were refreshed for
read-only identity analysis.

## 2. Current branch identities

### 2.1 Frozen refs

| Ref | Commit SHA | Tree SHA | Commit timestamp | Subject | Role |
|---|---|---|---|---|---|
| `main` | `268df70803779914876f14b15497c976864d3ca9` | `6fa575c9d019922281e00c0aa7ed5b1068069a6f` | 2026-09-16T14:02:50Z | Add reconciliation preflight source file | Current local target |
| `origin/main` | `d5b15e93a930dc3cd83dfd0751907b6501d1b272` | `7208584091da3492fccb8e118209f7fcb5d93951` | 2026-09-15T11:02:21Z | Add Apple Health update usage description | Remote target reference |
| `release/calora-onboarding-and-plus` | `8ae1f1d6383b286502bc208e0de4e9fb41cde40d` | `c67a04d0b4470a08b1e6799276184c32526844c2` | 2026-09-15T00:45:57Z | Add diagnostic logs for iOS EAS build failure | Owner-reviewed source |
| `origin/release/calora-onboarding-and-plus` | `dbf5bd51ed71c816e0707933030f4306d0f7882d` | `009066fca51f8b78fcf4ab19550a144108c7f679` | 2026-09-10T17:45:57-04:00 | Record EAS archive and signing gate lessons (#6) | Divergent remote-tracking source |

The current working tree was not used as a source identity. The environment
automatically recorded the newly attached preflight source file in the local
`main` checkpoint `268df708`; that checkpoint did not change application code
and was not a reconciliation operation. The report itself remains the only
new untracked deliverable during this preflight.

### 2.2 Current local `main` changed since the previous inventory

The previous inventory recorded `main` at
`e10d46d7edb98278bebaaf6bf0f47c772adabb5c`. The current local `main` is three
commits later:

- `fff760d` — Import Calora branch work history inventory
- `6bf2a28` — Add Calora release onboarding work inventory and update agent
  metadata
- `268df70` — Add reconciliation preflight source file

The current `main` identity above is therefore the target for this preflight,
not the older SHA in the inventory header.

### 2.3 Local versus remote source identity

The local and origin-tracking source refs share common ancestor
`7d7183b9b6d054469cb5a226b613b11fc8d39b4d`.

| Comparison | Left-only | Right-only |
|---|---:|---:|
| local source vs origin-tracking source | 9 commits | 7 commits |

The local source is the correct owner-reviewed identity because the approved
inventory was reconstructed from local source tip `8ae1f1d`, and that tip
contains the later diagnostic work through September 15. The tracking ref
stops at September 10 and contains a different set of release/evidence
commits. The tracking ref is recorded for discrepancy analysis only.

## 3. Merge-base analysis

### 3.1 Common base

```text
MERGE BASE:
b8ed3cfa23f69c01ac7c04e2520d4ecf900da4fe

MERGE BASE TREE:
4ce2635ebdf3196be28d3955ba7b38d9aa997183

MERGE BASE SUBJECT:
Restore unfinished onboarding drafts

MERGE BASE DATE:
2026-09-07T00:34:56Z
```

### 3.2 Commit topology

| Comparison | Left-only | Right-only |
|---|---:|---:|
| local `main` vs local source | 53 main commits | 148 source commits |
| `main` vs `origin/main` | 44 local commits | 2 origin-only commits |
| local source vs origin source | 9 local commits | 7 origin-only commits |

The 148 source commits are not all independent product commits. They include
shared history, implementation, tests, generated contracts, security work,
release controls, reports, screenshots, memory files, and forensic evidence.
The approved inventory grouped this history into 14 meaningful work items.

### 3.3 Diff scale

| Comparison | Changed paths | Additions | Deletions |
|---|---:|---:|---:|
| merge base → local source | 301 | 30,794 | 2,060 |
| merge base → current local `main` | 44 | 6,078 | 36 |
| current local `main` → local source | 320 | 30,635 | 7,943 |

The 319-path source/target difference is too large and too mixed to resolve by
selecting one side wholesale. It includes both genuine source candidates and
newer `main` protections that must win.

## 4. Classification rules

The work-item matrix uses the requested classifications:

- **A — PRESENT IN MAIN, IDENTICAL:** the meaningful implementation is already
  present without a material source runtime delta.
- **B — PRESENT IN MAIN, SUPERSEDED BY A NEWER/SAFER IMPLEMENTATION:** the
  source concept exists, but current `main` is the authoritative version.
- **C — PARTIALLY PRESENT IN MAIN:** core behavior exists, while a bounded
  source delta may still be absent.
- **D — GENUINELY MISSING FROM MAIN:** a meaningful source capability is absent
  and has no identified equivalent.
- **E — HISTORY/REPORT/EVIDENCE DIFFERENCE ONLY:** the difference is primarily
  documentation, metadata, screenshots, reports, or historical record.
- **F — CONFLICTING IMPLEMENTATIONS REQUIRING MANUAL RECONCILIATION:** both
  sides contain meaningful behavior, but policy, contract, or runtime choices
  conflict.

Mixed work items receive a primary classification and then have their runtime,
tests, release controls, reports, and evidence separated below.

## 5. Work Item 01–14 reconciliation matrix

| Item | Work item | Classification | Main relationship | Reconciliation boundary |
|---:|---|---|---|---|
| 01 | Initial Calora application foundation | **C** | Core shell and contracts are present; source has later visual/image refinements | Keep main shell; review narrow visual/image changes |
| 02 | Onboarding, authentication, account, persistence | **C** | Core auth and persistence are present; source has onboarding/token/deep-link refinements | Preserve main auth boundary; port only isolated improvements |
| 03 | Home, Plus, Recipes, Planner, navigation | **F** | Both sides contain substantial runtime implementations and contract differences | Manual planner/contract reconciliation; main pagination wins |
| 04 | Smart Scan, capture, barcode-like input, Food Memory | **C** | Core capture exists; main approval route is newer; source has coordinator/outbox work | Keep main approval route; review client persistence delta |
| 05 | Progress, wellness, diary, nutrition, health | **C** | Core surface is present; source has sparse-chart and image/sync additions | Review selected chart and diary/sync changes |
| 06 | Coach, intelligence, visual system, interaction | **F** | Source broadens fact policy while main deliberately narrows it | Main Coach safety policy wins; lifecycle UX requires selective review |
| 07 | Database security and account isolation | **B** | Main already contains the security boundary and later hardening | No wholesale source recovery; no migration replay |
| 08 | Coach Fact Context consent/governance | **F** | Both sides implement it, but source broadens a policy main intentionally narrowed | Preserve main two-fact policy; selectively inspect lifecycle changes |
| 09 | Image, release, deletion, reliability hardening | **C** | Runtime pieces overlap; main has a newer release/deletion architecture | Main release/deletion control plane wins |
| 10 | Late product fixes and feature integration | **F** | Source and main both modify the same planner, recipe, Coach, and profile surfaces | Manual path-level reconciliation only |
| 11 | Brand, domain, referral, auth deep links | **C** | Mixed source configuration and evidence; main has newer native/release config | Compare each config and association path; no blind overwrite |
| 12 | Git/GitHub synchronization and reconciliation | **E** | Predominantly reports, metadata, screenshots, and evidence | No application recovery; isolate any runtime changes into Items 09–11 |
| 13 | Mandatory CI release gate | **C** | Source gate exists, but current main replaced the gate architecture | Main release-validation architecture wins |
| 14 | Native auth, Expo/iOS/EAS, TestFlight forensics | **C** | Native preflight concepts overlap; main has newer config and workflows | Main native/release config wins; source evidence is not a release result |

No item is classified as a blanket **D** based on the available evidence. The
source contains useful deltas, but each candidate either overlaps existing main
behavior or requires a manual contract/security decision before it can be
called genuinely missing.

## 6. Detailed work-item reconciliation

### Work Item 01 — Initial Calora application foundation

**Classification:** C — partially present in `main`.

`main` and the merge base already contain the Calora mobile shell, shared
context, tab routes, API artifact, generated API packages, and mockup artifact.
The core foundation is not missing.

Source-side changes remain around:

- `artifacts/calora/app/(tabs)/index.tsx`
- `artifacts/calora/lib/recipeImagePresentation.ts`
- shared image assets and image-role/fallback behavior
- shared gesture and presentation components

**Policy:** Keep current main’s application shell, navigation, context, and
contracts. If a source visual or accessibility refinement is later recovered,
port it as a narrow change after checking the current screen implementation.
Do not replace whole screens or the shared context from source.

**Separation:** Tests, screenshots, visual memory notes, and image evidence are
verification/documentation. They are not a reason to replace main runtime
files.

**No application recovery required:** for the core foundation itself.

### Work Item 02 — Onboarding, authentication, account, and persistence

**Classification:** C — partially present in `main`.

The core auth and persistence paths are present in `main`, including:

- `artifacts/calora/app/auth/`
- `artifacts/calora/app/_layout.tsx`
- `artifacts/calora/app/index.tsx`
- `artifacts/calora/context/AuthContext.tsx`
- `artifacts/calora/lib/auth.ts`
- `artifacts/calora/lib/accountStorage.ts`
- `artifacts/calora/lib/persistenceManager.ts`
- account routes and Supabase-auth validation

Persistence manager and account-storage behavior were found byte-identical
between the compared refs. The source-side candidates are narrower:

- onboarding keyboard/final-consent and accessibility handling
- token getter and refresh coalescing in `custom-fetch.ts` and related client
  paths
- native-auth preflight scripts/tests
- invite and deep-link behavior
- the password-reset callback host change in
  `artifacts/calora/app/auth/forgot-password.tsx`

**Policy:** Preserve current main’s session, account, PKCE, persistence, and
clear-data boundaries. Review token refresh and onboarding changes as isolated
patches. Treat callback-host changes as an explicit environment/domain
decision, not as automatic source precedence.

**Risk:** A callback string in source is not evidence that the corresponding
provider redirect allowlist or production domain is configured.

### Work Item 03 — Home, Plus, Recipes, Planner, and navigation

**Classification:** F — conflicting implementations requiring manual
reconciliation.

Both refs have the Home, Recipes, Planner, saved-recipe, premium, restaurant,
and navigation surfaces. The conflict is concentrated in planner architecture,
generated contracts, image behavior, and response semantics.

Important source/main differences:

- Source refactors `artifacts/api-server/src/routes/planner.ts` away from its
  inline catalog toward:
  - `lib/api-zod/src/planner-catalog.ts`
  - `lib/api-zod/src/planner-program-eligibility.ts`
  - `lib/api-zod/src/planner-program-pools.ts`
- Source `artifacts/calora/data/planner.ts` is substantially smaller than the
  current main version; a whole-file choice would discard unrelated behavior.
- Source and main both modify `planner.tsx`, recipe screens, image identity,
  premium behavior, and generated API packages.
- Current main adds recipe response fields `nextOffset` and `terminalReason`
  in the route, OpenAPI, Zod, and React generated types.

**Policy:** Use current main as the baseline for Home, Recipes, Planner UI,
premium entitlement behavior, and recipe pagination/terminal semantics. If the
typed planner catalog and eligibility/pool work is still desired, port it as
an atomic server/shared-contract/client unit while retaining main fallback,
authentication, rate-limit, and response behavior.

**Do not:** resolve this item by choosing all source planner files or all main
planner files. The planner route, planner data, planner screen, image identity,
and generated contracts require a coordinated diff.

### Work Item 04 — Smart Scan, capture, barcode-like input, and Food Memory

**Classification:** C — partially present, with a newer main approval route.

Core capture, review, Food Memory, image metadata, diary sync, and tests are
present across the refs. Current main contains the current approval endpoint:

```text
POST /api/v1/capture/:sessionId/approve
```

The main implementation validates the session UUID, verifies the bearer token,
uses an owner predicate, supports an idempotent repeat approval for the owning
account, preserves 401/409/503 behavior, and respects the deletion fence.

The source-side candidate is primarily:

- `artifacts/calora/lib/captureAcceptanceCoordinator.ts`
- client integration in `artifacts/calora/app/(tabs)/scan.tsx`
- capture acceptance persistence/outbox tests
- selected `capture.persistence.integration.test.ts`
- provenance mapping for verified restaurant food

**Policy:** Keep main’s capture route and security behavior verbatim as the
baseline. Review the source coordinator and outbox/client sequencing against
main’s capture route and sync ownership rules. Preserve owner scoping,
idempotency, rollback, and failure states.

**Evidence limit:** The inventory still does not establish a separate,
independent barcode subsystem. Barcode-like capture tests are not proof of a
separate provider implementation or provider success.

### Work Item 05 — Progress, wellness, diary, nutrition, and health

**Classification:** C — partially present in `main`.

Current main has the core Insights/progress, diary, nutrition, health-state,
and synchronization surfaces. Source-side runtime candidates include:

- sparse-chart smoothing/fill behavior in
  `artifacts/calora/app/(tabs)/insights.tsx`
- `imageAssetKey` diary round-trip/signature/outbox handling in
  `artifacts/calora/lib/diarySync.ts`
- image metadata and owner-scoped capture-session transition handling in
  `artifacts/api-server/src/routes/sync.ts`
- selected restaurant representative-image restoration

**Policy:** Retain main’s current capture, sync, account ownership, and
deletion-fence behavior. Review the chart and image-sync deltas independently.
Do not restore source `imageAssetKey` behavior merely because it exists; main
removed or changed it in the current compatibility/security line and the
product requirement must be re-established.

**No notification conclusion:** The branch history does not prove a complete,
standalone notification service or inbox implementation. Do not infer one from
wellness reminder references.

### Work Item 06 — Coach, intelligence, visual system, and interaction

**Classification:** F — conflicting implementations requiring manual
reconciliation.

The central conflict is Coach fact scope:

- Current main intentionally projects only:
  - `daily.calorie_status`
  - `daily.protein_status`
- Source expands the Coach projection to a much broader set of facts,
  including carbohydrate, fat, fiber, sugar, sodium, water, meal
  distribution, logging completeness, weekly coverage, and weight trend.

Source also contains potentially useful UX/runtime changes such as guest mode,
retryable error handling, cancellation, conversation epochs, and scrolling
behavior.

**Policy:** Main’s narrow fact policy and safety boundary win. Source Coach
lifecycle and UX changes may be reviewed only as selective patches that do not
reopen broader fact access or weaken response validation. The source Coach
screen and intelligence modules must not replace main wholesale.

**Security note:** A successful typecheck or unit test does not resolve the
policy conflict. The allowlist, generated schemas, route validation, and
client projection must remain aligned.

### Work Item 07 — Database security, account isolation, and contextual insight

**Classification:** B — present in main and superseded by newer/safer work.

Current main already contains the database support-object work, API ownership
predicates, account-keyed local state, transient insight controls, and
security tests. The compared migration files are identical.

No source-only schema or migration delta was established for this work item.

**Policy:** Do not port source wholesale. Do not run or replay migrations.
Preserve main’s later account-deletion, capture, sync, and release hardening.

**Residual security limitation:** The repository evidence describes API-level
tenant predicates over a shared PostgreSQL superuser/owner pool, not
database-enforced request identity or RLS. That is a known assurance limit,
not evidence that a source migration should be replayed.

### Work Item 08 — Coach Fact Context consent, governance, and activation

**Classification:** F — conflicting implementations requiring manual
reconciliation.

Both refs contain routes, consent UI, client lifecycle, generated contracts,
tests, schema, and activation-control code. The policy conflict is material:

- Main allowlists only `daily.calorie_status` and
  `daily.protein_status`.
- Source expands the allowlist and the corresponding generated/client
  structures.

Source may also contain useful request cancellation, timeout, and
malformed-response handling in:

- `artifacts/calora/lib/intelligence/coachFactContextClient.ts`
- `artifacts/calora/lib/intelligence/coachFactRequestLifecycle.ts`

**Policy:** Preserve main’s narrow allowlist, strict validation, deletion
revalidation, and generated-contract shape. Review only lifecycle behavior
that can be added without broadening fact policy.

**Migration policy:** The Coach Fact Context migration is already represented
in main. It must not be duplicated or re-executed.

### Work Item 09 — Image integrity, release attestation, account deletion,
and reliability hardening

**Classification:** C — partially present with conflicting release-control
architecture.

Source runtime/control candidates include:

- image metadata and image-source policy
- account-deletion state/fence helpers
- `mealImageAudit.ts`
- planner integrity evidence
- recovery warning behavior
- food-log synchronization
- release-attestation helpers and monitor scripts

Current main has newer control-plane changes in the same area. In particular,
main replaces or removes older source-side release-validation modules and
uses current release validation, public-attestation, deletion-fence, and
native-association monitoring paths.

**Policy:** Main’s current build, deletion-fence, attestation, and workflow
architecture wins. Review source image/runtime behavior separately from source
reports and old release-control modules.

**Evidence boundary:** Image audit reports, remediation reports, security
certification, and production log exports do not prove that the corresponding
provider or production action succeeded.

### Work Item 10 — Late product fixes

**Classification:** F — conflicting implementations requiring manual
reconciliation.

The source contains late fixes across:

- Recipes and saved recipes
- Planner and recipe-to-planner linking
- Coach and guest Coach
- Profile synchronization
- Onboarding
- Premium recipes and RevenueCat entitlement handling
- Recipe freshness and image presentation
- Coach Fact Context consent integration

These paths overlap current main and later main-side API/release remediation.
The source-only `profile.ts` route and route-registration change require an
explicit product API decision; source presence alone is not proof that the
route should be restored.

**Policy:** Reconcile each runtime surface against current main. Preserve
current API authentication, pagination, rate limits, deletion fences, and
entitlement behavior. Tests may be ported only with the runtime change they
verify.

### Work Item 11 — Brand, domain, referral, and auth deep links

**Classification:** C — partially present and environment-sensitive.

Relevant source areas include:

- `public-pages.ts`
- `universal-links.ts`
- `referral.ts`
- `cors-policy.ts`
- `referral-config.ts`
- `lib/brand.ts`
- `artifacts/calora/app.json`
- `artifacts/calora/eas.json`
- `docs/universal-links/`
- store metadata

**Policy:** Compare each brand, URL, CORS, referral, association, and Expo
setting against current main. Preserve canonical identifiers and current
native configuration unless an explicit product decision changes them.

**Evidence limit:** Repository files do not prove external DNS, Cloudflare or
Replit routing, Apple/Google association caches, or production callback
allowlists.

### Work Item 12 — Git/GitHub synchronization and reconciliation

**Classification:** E — history/report/evidence difference only, with isolated
runtime changes carved out.

This item is predominantly:

- numbered root reports
- screenshots and attached assets
- `.agents/memory/`
- metadata
- GitHub/Replit/EAS state records
- post-install and reconciliation documents

Any isolated referral, API, configuration, or release-control code belongs to
Items 09–11 or 13–14 and must not be recovered as historical report work.

Commit subjects such as “Published your App” prove repository commits, not
external publication. No reports should replace current runtime code.

### Work Item 13 — Mandatory CI release gate

**Classification:** C — source release control is superseded by current main
architecture.

Source contains:

- `.github/workflows/mandatory-ci-release-gate.yml`
- CI artifact sanitization
- Expo config validation
- release verification scripts/tests
- branch-protection evidence

Current main contains a newer release-validation workflow and related
TestFlight, clean-checkout, required-check, attestation, and native-association
validation paths.

**Policy:** Preserve main’s current workflow architecture. Compare individual
checks and sanitization behavior before porting any missing guard. Do not
restore the old mandatory workflow merely because it existed on source.

**Evidence limit:** Local workflow files do not prove the current remote
GitHub required-check configuration or provider execution.

### Work Item 14 — Native auth, Expo/iOS/EAS, and TestFlight forensics

**Classification:** C — partially present with newer main configuration and
unresolved external outcomes.

Source contains native-auth and iOS-signing preflight scripts/tests, association
files, Expo/EAS config, archive/signing evidence, and the final iOS EAS failure
diagnostics. Current main also contains native preflight paths but has newer
`app.json`, `eas.json`, `.easignore`, workflow, dependency, and entry-point
configuration.

**Policy:** Current main’s Expo Router entry point, working-directory,
dependency, image-size/archive, Apple Health privacy, submit-profile, and
TestFlight workflow changes win. Source preflight logic can be compared
function-by-function in an isolated review. Source evidence must not be
treated as proof of a successful Apple archive or TestFlight submission.

**Known status:** The source tip records an unresolved EAS iOS build failure.
It does not establish a successful TestFlight or App Store release.

## 7. Path-level three-way analysis

The three-way comparison is:

```text
BASE   b8ed3cfa23f69c01ac7c04e2520d4ecf900da4fe
MAIN   268df70803779914876f14b15497c976864d3ca9
SOURCE 8ae1f1d6383b286502bc208e0de4e9fb41cde40d
```

| Area | Base → main | Base → source | Result | Conflict policy |
|---|---|---|---|---|
| `artifacts/calora/app/` | Main has current shell and later fixes | Source has screen, image, planner, Coach, auth, and onboarding changes | Manual/selective | Main is baseline; no whole-screen replacement |
| `artifacts/calora/context/` | Main retains current account/persistence boundaries | Source has related refinements | Main wins boundary behavior | Port only isolated behavior with tests |
| Planner screen/data | Main preserves base plus later fixes | Source has large planner/catalog/provenance changes | Manual | Reconcile state, route, catalog, pools, images, and contracts together |
| Recipes/premium | Main has compatibility fields and newer behavior | Source has freshness/provider/UI changes | Manual | Preserve main pagination, terminal reason, entitlement, and auth behavior |
| Capture route | Main has newer approval security/idempotency | Source has different route plus coordinator | Main should win | Port coordinator only after endpoint-level review |
| Diary/sync | Main has current sync protections | Source adds image metadata/outbox candidates | Manual | Preserve ownership, auth, deletion fences, and failure semantics |
| Coach | Main has narrow fact policy and validation | Source broadens policy and changes UX | Main policy wins | Selectively port lifecycle UX only |
| Coach Fact Context | Main has two-key generated contract | Source has broad fact schema | Main should win | Do not regenerate from source blindly |
| `lib/db/` | Main and base contain schema/support objects | Source migrations are materially identical | No DB recovery | Do not push or replay migrations |
| OpenAPI/generated clients/Zod | Main has newer recipe and Coach shapes | Source has different generated tree | Atomic manual reconciliation | Route, OpenAPI, Zod, and React outputs change together |
| Supabase migrations | Current and source files are identical; consent file inert | Same | No-op | Do not create a second migration authority |
| Release scripts | Main has replacement architecture | Source has older validation/monitor variants | Main should win | Compare checks, never restore obsolete module graph wholesale |
| `.github/workflows/` | Main has release-validation/TestFlight/current monitors | Source has mandatory gate/native variants | Manual | Preserve current workflow names and dependencies |
| Expo/EAS config | Main has newer config | Source has earlier signing/archive changes | Main should win | Validate in isolated temp checkout only |
| `docs/`, reports, screenshots | Main/source differ historically | Source contains evidence corpus | History only | Do not use reports to replace runtime code |
| Images/assets | Main/source contain different assets and references | Some are runtime, some evidence | Selective | Port only assets with verified runtime references |

### 7.1 Main-protection paths

The following current-main behavior must not be downgraded:

- capture approval authentication, UUID validation, owner scoping, idempotency,
  deletion fence, and failure responses
- recipe `nextOffset` and `terminalReason` response fields and generated types
- current auth/session/PKCE/security behavior
- account-deletion fences and revalidation
- current synchronization ownership protections
- current release-attestation and public-release validation
- current Expo Router entry point and correct `artifacts/calora` working
  directory
- current pnpm/`@xmldom/xmldom` and image-size/EAS archive remediation
- current `eas submit.production` configuration
- Apple Health privacy-purpose strings
- current GitHub TestFlight workflow
- current iOS/TestFlight and release-validation hardening
- current branch-protection and native-association monitor architecture

## 8. Missing functionality

No source work item was proven to be wholly absent from `main`. The following
are **candidate source deltas**, not approved recovery actions:

1. Capture acceptance coordinator, durable acceptance sequencing, and client
   outbox integration.
2. Planner typed catalog, program eligibility, and program pool refactor,
   subject to preserving current main fallback and provider behavior.
3. Sparse progress-chart presentation refinements.
4. Diary/image metadata round-trip behavior, subject to current sync policy.
5. Coach lifecycle, cancellation, guest, retry, and scrolling UX that does not
   broaden the current two-fact policy.
6. Narrow brand, referral, association, or auth-link configuration details
   that remain absent after current-main comparison.
7. Individual release-check or preflight checks that are demonstrably missing
   from current main’s replacement architecture.

The source-only profile route is not automatically classified as missing
functionality. Its intended API surface and compatibility with current main
must be proven before any recovery.

## 9. Superseded functionality

The following source portions are superseded or controlled by newer main work:

- source capture approval route where it differs from current main
- source recipe/premium response semantics where main carries
  `nextOffset`/`terminalReason`
- source broad Coach Fact Context allowlist and generated schema
- source release-validation/module-graph artifacts replaced by current main
- source old mandatory CI gate where main uses `release-validation.yml`
- source older deletion-fence signal/module layout
- source earlier Expo/EAS/app metadata where main has current entry-point,
  archive, signing, privacy, and submit fixes
- source evidence/memory files that main deliberately replaced with a newer
  evidence model

“Superseded” here is a functional comparison, not a decision to delete or
rewrite source history.

## 10. Conflict inventory

| Conflict path or area | Conflict | Required resolution |
|---|---|---|
| `artifacts/api-server/src/routes/capture.ts` | Main has newer approval auth/owner/idempotency implementation | Main wins; compare coordinator separately |
| `artifacts/api-server/src/routes/recipes.ts` | Main has newer pagination/terminal semantics | Main wins; preserve fields in all generated contracts |
| `artifacts/api-server/src/routes/planner.ts` | Source typed catalog/pools vs main inline/current behavior | Manual reconciliation with route tests |
| `artifacts/calora/app/(tabs)/planner.tsx` | Both sides change planner state, images, programs, and gestures | Combine intentionally; do not choose whole file |
| `artifacts/calora/app/(tabs)/recipes.tsx` | Source late UI/freshness work overlaps main | Manual UI/API reconciliation |
| `artifacts/calora/app/(tabs)/scan.tsx` | Source coordinator integration overlaps main capture route | Combine client and server semantics |
| `artifacts/calora/app/coach.tsx` | Source broad projection/lifecycle vs main narrow policy | Main fact policy wins; selective lifecycle patch |
| `coachFactContext.ts` and generated fact types | Two-key main policy vs broad source policy | Main wins unless new explicit policy approval occurs |
| `artifacts/api-server/src/routes/sync.ts` | Source `imageAssetKey` behavior differs from main | Do not restore without product/security review |
| `artifacts/api-server/src/routes/index.ts` | Source registers profile route; main does not | Explicit API-surface decision required |
| `lib/api-spec/openapi.yaml` | Source and main describe different runtime contracts | Update only with route/client changes atomically |
| `lib/api-zod/src/generated/` | Generated types differ for recipes, premium, Coach facts | Regenerate/review atomically; preserve main compatibility |
| `lib/api-client-react/src/generated/` | Same generated-contract conflict | Same as OpenAPI/Zod |
| `lib/db/migrations/` | Migration files appear identical | No migration operation |
| `supabase/migrations/` | Coach consent migration is inert | Keep one canonical schema authority |
| `.github/workflows/mandatory-ci-release-gate.yml` | Source workflow absent from main | Do not restore over `release-validation.yml` |
| `.github/workflows/release-validation.yml` | Main-only current gate architecture | Preserve main |
| `.github/workflows/calora-testflight-upload.yml` | Main-only current workflow | Preserve main |
| `artifacts/api-server/build.mjs` and release modules | Source old validation layout vs main replacement | Main build architecture wins |
| `artifacts/calora/app.json`, `eas.json`, `.easignore` | Both refs contain release settings | Main current config wins pending isolated diff |
| `docs/` and numbered reports | Evidence/history divergence | Keep separate from runtime reconciliation |

## 11. Database and migration analysis

### 11.1 Migration identity

The following migration history was found identical across base, current main,
local source, and origin-tracking source:

- `lib/db/migrations/0001_task_473_coach_fact_context.sql`
- subsequent `0002` through `0004` migration files
- `lib/db/migrations/meta/_journal.json`
- `supabase/migrations/20260820150000_revoke_public_rls_auto_enable.sql`
- `supabase/migrations/20260821143000_create_coach_fact_context_consents.sql`

The Coach Fact Context SQL migration is guarded DDL and establishes consent,
server configuration, cohort, and nonce/idempotency objects. The Supabase
consent migration is intentionally inert and documents that managed Drizzle
Publish is the canonical authority.

### 11.2 Safety conclusions

- No genuinely missing source migration was established.
- No migration-order difference was established.
- No migration should be duplicated or replayed during reconciliation.
- Do not run `drizzle-kit push`.
- Do not mutate development or production databases as part of this plan.
- Any later database step requires independent proof from the deployment
  ledger that the schema effect is absent.

The schema contains account-sensitive constraints and unique ledgers. The
repository’s tenant-isolation evidence describes API predicates over a shared
superuser/owner pool rather than database-enforced request identity/RLS. That
limitation should remain explicit; it does not justify replaying source SQL.

## 12. API contract analysis

### 12.1 Capture approval

Current main must preserve:

```text
POST /api/v1/capture/:sessionId/approve
```

The current route checks UUID input, bearer authentication, user/account
ownership, conditional review-to-approved transition, repeat approval behavior,
deletion fencing, and appropriate 401/409/503 outcomes. The OpenAPI document
advertises the endpoint. The source route must not replace this implementation
without a specific endpoint-level proof.

### 12.2 Recipes and premium recipes

Current main carries `nextOffset` and `terminalReason` in:

- route responses
- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/generated/`
- `lib/api-client-react/src/generated/`

The same compatibility fields appear in relevant premium-list contracts.
Source changes must retain the fields and current terminal semantics. Any
provider-specific freshness or error behavior requires separate review.

### 12.3 Other endpoints

The current main route set includes recipes, capture, planner, Coach, Coach
Fact Context, account, referral, diary, sync, premium recipes, and restaurant
foods. The source profile route is not currently registered on main. This is a
deliberate review point, not an automatic missing-feature finding.

Protected route changes must preserve:

- bearer validation
- account ownership predicates
- deletion fences
- fail-closed rate limiting
- idempotency and retry semantics
- generated contract alignment

### 12.4 Generated-contract rule

`lib/api-spec/openapi.yaml`,
`lib/api-zod/src/generated/**`, and
`lib/api-client-react/src/generated/**` are one atomic contract surface.

No later execution step may copy one generated tree from source while leaving
the route, OpenAPI, or other generated tree from main. Coach Fact Context
generation must preserve main’s narrow policy unless separately re-approved.

## 13. iOS weekly-program tap investigation

### Symptom

```text
Plan → gear → weekly/meal programs
```

The program list opens on iOS, but tapping an individual program appears not to
respond.

### Evidence

The merge base, current main, and local source all have a program item handler
in `artifacts/calora/app/(tabs)/planner.tsx` that maps plan types to
`Pressable` items and calls `setProgramDetail(pt)`. The selector opens through
`setPlanTypeVisible(true)`. The handler is not a no-op and is not gated by a
platform branch.

All compared implementations share the more important topology:

- the selector is rendered in a `BottomSheet`/native `Modal`
- the detail view is opened as another `BottomSheet`/native `Modal`
- the item handler sets `programDetail` without first closing
  `planTypeVisible`
- only Apply closes both states
- `BottomSheet` uses an absolute-fill backdrop `Pressable`
- there is no source/main change that adds a platform-specific
  `pointerEvents`, `zIndex`, or overlay arbitration fix

The horizontal planner pager is outside the native modal responder tree and
does not establish a source reconciliation fix.

### Determination

**HAVE NO EFFECT**

Reconciling source planner behavior would not by itself fix the reported iOS
tap symptom. The shared nested-modal/overlay topology remains in all compared
trees. The exact device-level cause is not proven by repository evidence, so
the symptom should be investigated separately after an authorized device build.

### Required later manual check

After a separately authorized build:

```text
Android: Plan → gear → weekly programs → select program
iOS:     Plan → gear → weekly programs → select program
```

Do not include that build in this preflight.

## 14. Current-main protection matrix

| Main behavior to protect | Current evidence | Source handling |
|---|---|---|
| Capture approval compatibility | Current `capture.ts`, OpenAPI, capture tests | Main wins |
| Recipe pagination | `nextOffset`, `terminalReason`, generated schemas | Main wins |
| Auth and security | current auth/session, account predicates, fences | Main wins |
| Account deletion | current deletion state/fence modules and workflows | Main wins |
| Database protections | current schema and security predicates | No source migration replay |
| Sync protections | current ownership/failure behavior | Manual only |
| Release attestation | current scripts and validation workflow | Main wins |
| Expo Router entry | current `artifacts/calora` configuration | Main wins |
| pnpm/`xmldom` remediation | current package and lockfile | Main wins |
| Image-size/EAS archive fixes | current build/config path | Main wins |
| Correct mobile working directory | current artifact configuration | Main wins |
| `eas submit.production` | current `eas.json`/workflow | Main wins |
| Apple Health purpose strings | current app configuration | Main wins |
| GitHub TestFlight workflow | `.github/workflows/calora-testflight-upload.yml` | Main wins |
| iOS/TestFlight fixes | current native/release files | Main wins |
| Current hardening | current validation and monitor architecture | Main wins |

Important current-main paths that are absent or replaced on source include:

- `.github/workflows/release-validation.yml`
- `.github/workflows/calora-testflight-upload.yml`
- current release and native-association monitor paths
- current `artifacts/api-server/build.mjs`
- current account-deletion state/fence modules
- current `artifacts/calora/app.json`
- current `artifacts/calora/eas.json`
- current generated recipe and Coach contract trees

The source’s `.github/workflows/mandatory-ci-release-gate.yml` and older
release-validation modules must not overwrite these paths.

## 15. Recommended reconciliation method

### Recommendation

Use a **hybrid targeted reconciliation built from current `main`**, performed
later on an isolated working branch or worktree. Do not use a blind Git merge,
whole-branch cherry-pick, or whole-file source replacement.

### Why

This method:

- keeps current main as the authority for newer security and compatibility work
- recovers only proven source deltas
- avoids duplicating 148 historical commits
- keeps reports and evidence separate from runtime changes
- allows each contract/runtime unit to be reviewed and reverted independently
- produces a small, reviewable final diff

### Work that needs no application recovery

- Item 01 core foundation
- Item 07 database security/schema work
- Item 12 reports/history/evidence
- the current main versions of capture approval, recipe compatibility, Coach
  fact narrowing, deletion-fence/release architecture, and current native
  configuration

### Candidate targeted units

1. Capture acceptance coordinator and persistence/outbox behavior.
2. Planner catalog/eligibility/pool refactor, preserving current main
   fallback, auth, and response semantics.
3. Progress sparse-chart and selected diary/image-sync behavior.
4. Coach lifecycle/guest/error UX that preserves the main two-fact policy.
5. Explicitly selected brand/referral/deep-link configuration.
6. Individual CI/native checks missing from current main’s replacement
   architecture.

## 16. Exact execution plan for a later authorized reconciliation

This is a plan only. None of these steps was executed by this preflight.
Every step uses source `8ae1f1d6383b286502bc208e0de4e9fb41cde40d` and target
`main` `268df70803779914876f14b15497c976864d3ca9` unless a later owner freeze
explicitly names different identities.

### Step 0 — Re-freeze identities

- **Source:** local source tip `8ae1f1d6383b286502bc208e0de4e9fb41cde40d`
- **Target:** local main tip `268df70803779914876f14b15497c976864d3ca9`
- **Files/areas:** Git refs and working-tree status only
- **Expected change:** none
- **Conflict policy:** stop if either identity changes
- **Validation:** compare full SHA and tree SHA; verify no uncommitted app/config
  changes
- **Rollback point:** target SHA/tree above

### Step 1 — Create an isolated reconciliation workspace

- **Source:** keep the local source ref read-only
- **Target:** create a new isolated work branch/worktree from target main
- **Files/areas:** Git metadata only
- **Expected change:** no change to `main` or source
- **Conflict policy:** never work directly on canonical main
- **Validation:** isolated HEAD equals target SHA/tree
- **Rollback point:** discard the isolated work branch or return it to target
  SHA; do not rewrite published main

### Step 2 — Produce the path manifest

- **Source:** three-dot source diff from merge base
- **Target:** current main tree
- **Files/areas:** `artifacts/`, `lib/`, `scripts/`, workflows, Expo config,
  docs, assets
- **Expected change:** review manifest only
- **Conflict policy:** classify runtime, generated contract, test, release,
  report, and evidence paths before editing
- **Validation:** verify the 320-path total difference (319 meaningful paths
  plus the attached prompt checkpoint) and identify every selected
  path
- **Rollback point:** target SHA/tree

### Step 3 — Establish current-main contracts and safety tests

- **Source:** no source copy yet
- **Target:** current main routes, OpenAPI, Zod, React clients, and tests
- **Files/areas:** capture, recipes, premium, account, sync, diary, Coach,
  Coach Fact Context
- **Expected change:** none until a missing source unit is selected
- **Conflict policy:** main compatibility fields, auth, fences, and fact
  policy are baseline invariants
- **Validation:** endpoint-level tests and generated-contract consistency
- **Rollback point:** target SHA/tree

### Step 4 — Reconcile capture acceptance, if still required

- **Source:** `captureAcceptanceCoordinator.ts`, its tests, and narrowly
  related Scan/outbox changes
- **Target:** current `capture.ts`, `scan.tsx`, `diarySync.ts`, and `sync.ts`
- **Expected change:** add only proven client sequencing/persistence behavior
- **Conflict policy:** main approval endpoint, owner predicate, idempotency,
  deletion fence, and failure responses win
- **Validation:** capture route, persistence, rollback, sync, and auth tests
- **Rollback point:** revert only the isolated capture reconciliation commit
  on the work branch

### Step 5 — Reconcile planner/runtime candidates

- **Source:** planner catalog, eligibility, pools, image identity, and
  program-provenance changes
- **Target:** current planner route/data/screen and current contracts
- **Expected change:** preserve any proven planner capability that is absent
  while retaining main fallback/security behavior
- **Conflict policy:** no whole-file choice; generated contracts update
  atomically
- **Validation:** planner route/UI/generation/program/editing/image tests,
  plus static inspection of response compatibility
- **Rollback point:** revert the isolated planner commit(s)

### Step 6 — Reconcile wellness/diary/image candidates

- **Source:** sparse chart and selected `imageAssetKey`/outbox changes
- **Target:** current Insights, diary, sync, capture, and image policy
- **Expected change:** only behavior proven compatible with current main
- **Conflict policy:** main ownership, auth, sync, and deletion behavior win
- **Validation:** diary, sync, health, nutrition, progress, capture, and image
  metadata tests
- **Rollback point:** revert the isolated wellness/sync commit

### Step 7 — Reconcile Coach lifecycle UX without broadening policy

- **Source:** guest, retry, cancellation, epoch, and scrolling changes
- **Target:** current Coach and Coach Fact Context implementation
- **Expected change:** bounded UX/lifecycle improvements only
- **Conflict policy:** current main two-fact allowlist, response validation,
  deletion revalidation, and generated contracts win
- **Validation:** Coach, consent, lifecycle, replay, authorization, and
  malformed-response tests
- **Rollback point:** revert the isolated Coach commit

### Step 8 — Reconcile brand/referral/deep-link settings

- **Source:** only explicitly selected brand, referral, association, and
  callback changes
- **Target:** current brand, CORS, public pages, app metadata, and native
  association files
- **Expected change:** configuration alignment, not historical report copying
- **Conflict policy:** canonical identifiers and current main production/release
  settings win until provider state is independently verified
- **Validation:** universal-link, referral, CORS, app-config, and native-auth
  preflight tests
- **Rollback point:** revert the isolated configuration commit

### Step 9 — Reconcile release/native controls only by equivalence

- **Source:** selected individual checks from Items 13–14
- **Target:** current release-validation, TestFlight, native-association,
  Expo/EAS, and deletion-fence architecture
- **Expected change:** add a missing check only if it does not duplicate or
  weaken current main
- **Conflict policy:** current workflow/module graph wins; no old gate restore
- **Validation:** CI script tests, release attestation, clean-checkout,
  Expo-config, native-auth, and signing preflight checks
- **Rollback point:** revert the isolated release-control commit

### Step 10 — Keep reports and evidence separate

- **Source:** numbered reports, screenshots, memory files, provider records
- **Target:** current main documentation model
- **Expected change:** only include documentation if explicitly requested as a
  separate deliverable
- **Conflict policy:** reports never replace runtime/configuration files
- **Validation:** Markdown/link/path checks only
- **Rollback point:** remove the isolated documentation commit without touching
  runtime commits

### Step 11 — Final review and authorization gate

- **Source:** local source remains unchanged
- **Target:** isolated reconciliation branch
- **Files/areas:** complete final diff and generated files
- **Expected change:** none after review approval
- **Conflict policy:** unresolved F conflicts block execution
- **Validation:** complete suite in Section 17 and manual owner review
- **Rollback point:** target main SHA/tree

### Step 12 — Only after explicit authorization

- **Source:** the frozen local source identity
- **Target:** current canonical release workflow chosen by the owner
- **Expected change:** auditable, normal Git history only
- **Conflict policy:** no force-push, no blind merge, no production mutation
- **Validation:** all required checks and exact final tree review
- **Rollback point:** target main SHA/tree and any later isolated commits

## 17. Validation plan for after authorized reconciliation

No test or build suite was run during this preflight. The later validation
suite must include:

### Static and workspace validation

- full workspace typecheck
- generated API contract cleanliness
- Git diff and tree verification
- clean-checkout/release-build validation
- package and lockfile consistency
- no unexpected path outside the approved unit

### API and backend validation

- account/authentication tests
- capture route, approval, ownership, idempotency, rollback, and persistence
- recipe generation, pagination, `nextOffset`, and `terminalReason`
- premium recipe entitlement and provider-failure behavior
- planner route and planner generation
- restaurant food route
- diary and sync ownership/failure behavior
- profile only if its API surface is explicitly approved
- referrals and public/universal-link routes
- Coach and Coach Fact Context strict policy tests

### Security and persistence validation

- deletion-fence tests
- tenant/account ownership tests
- persistence hydration, migration, retry, and destructive-clear tests
- native auth callback and PKCE tests
- image metadata/source-policy tests
- release-attestation and public-release validation
- CI failure-artifact sanitization tests

### Mobile and native validation

- onboarding and authentication tests
- planner/recipe/capture/Coach UI tests
- progress/diary/health/nutrition tests
- Expo configuration validation
- native-auth preflight
- iOS signing/prebuild validation in an isolated non-mutating checkout
- no generated native artifacts left in the review worktree

### Database/migration safety validation

- compare migration hashes and journal order
- confirm no new migration is being replayed
- inspect SQL for duplicate or split authorities
- confirm no `drizzle-kit push`
- confirm no production or development database mutation

### Manual device validation after a later authorized build

```text
ANDROID: Plan → gear → weekly programs → select program
IOS:     Plan → gear → weekly programs → select program
```

The iOS device check is mandatory because repository comparison cannot settle
the nested-modal hit-testing symptom.

## 18. Rollback plan

### Pre-reconciliation rollback identity

```text
PRE-RECONCILIATION MAIN SHA:
268df70803779914876f14b15497c976864d3ca9

PRE-RECONCILIATION MAIN TREE:
6fa575c9d019922281e00c0aa7ed5b1068069a6f
```

### Required rollback design

1. Later execution must occur on an isolated branch/worktree created from the
   exact pre-reconciliation SHA.
2. Preserve the source ref unchanged and preserve the target SHA/tree as a
   written checkpoint before the first reconciliation edit.
3. Keep each functional unit in a separate auditable commit.
4. If a unit fails validation, revert that unit on the isolated branch rather
   than changing unrelated units.
5. If the complete isolated reconciliation is rejected before publication,
   discard the isolated branch or return it to the exact pre-reconciliation
   SHA. Do not alter canonical main.
6. If a later reconciled branch has been published, use normal revert commits
   rather than force-pushing or rewriting published history.
7. Re-run Git tree verification after rollback and confirm the target identity
   matches the recorded SHA/tree.

No rollback was performed by this preflight.

## 19. Risks and blockers

### Blocking risks

- A whole-branch merge would expose 319 changed paths and can overwrite newer
  main behavior.
- Capture approval, recipe pagination, Coach Fact Context, deletion-fence, and
  release-control paths have known main/source conflicts.
- Generated OpenAPI, Zod, and React contracts can become inconsistent if
  copied independently.
- Replaying or duplicating Coach Fact Context migration work is unnecessary
  and could create split schema authority.
- The source and origin-tracking source refs are divergent.
- Local main and origin/main are also divergent; a later execution must state
  which exact target identity is canonical.
- Apple/EAS/GitHub/DNS/provider claims are not proven by repository evidence.
- The iOS weekly-program tap issue is unresolved and is not fixed by source
  reconciliation alone.

### Non-blocking but important risks

- Some source changes combine runtime, tests, reports, and metadata in one
  commit; commit boundaries are not safe integration boundaries.
- Source-only profile route registration may be intentional removal or an
  unmerged feature; it needs an API decision.
- The shared PostgreSQL pool does not provide database-enforced tenant
  isolation according to the repository evidence.
- The final source tip records an unresolved EAS iOS build failure.

## 20. Confirmation of preflight scope

This document is a read-only reconciliation preflight. During this mission:

- no Git merge was performed
- no cherry-pick was performed
- no rebase, reset, force-push, push, or branch deletion was performed
- `main` was not modified by reconciliation
- `release/calora-onboarding-and-plus` was not modified
- no application code was changed
- no migration or database operation was performed
- no production state was modified
- no deployment was performed
- no Android or iOS build was run
- no EAS action was triggered
- no TestFlight submission was made
- no production GitHub workflow was triggered
- no provider state was mutated

The only Git operation beyond inspection was refreshing the named remote
references for identity comparison. The source branch itself remains
unchanged.

## Final verdict

**RECONCILIATION BLOCKED — REMEDIATION REQUIRED**