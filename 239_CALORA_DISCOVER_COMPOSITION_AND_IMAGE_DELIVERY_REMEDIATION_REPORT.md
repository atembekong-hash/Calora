# 239 — Calora Discover Composition and Image Delivery Remediation

**Date:** 2026-10-21
**Scope:** Recipes → Discover opening composition, continuous browsing perception, and missing recipe-image recovery.
**Native-build status:** No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Play build was triggered by this remediation.

## 1. Executive verdict

The reported Discover issues were real, but they were two separate classes of behavior:

1. **Discover could look finite or repetitive at the top of the feed** even though the API exposed a continuous cursor. The screen always prepended the complete Calora-original set before provider results. It also had no visit-scoped composition contract: focus and ordinary updates used a freshness ordering for remote entries only, leaving a fixed curated prefix. A reader could therefore repeatedly see the same initial cards and mistake the feed for a finite catalogue.
2. **A valid remote image that failed to render on a device stayed as a final generic placeholder.** The strict source policy correctly rejected absent and untrusted images, but an intermittent delivery failure had no user retry path or bounded, content-free diagnostic classification.

The repair makes opening composition deterministic per visit, interleaves verified Calora and provider cards from the first viewport, preserves cards already read while cursor pages append, and lets an individual safe remote image be retried through a keyed remount. It keeps the strict rule that an absent or untrusted image remains unavailable rather than displaying a wrong dish.

## 2. Evidence and root cause

### 2.1 Continuous-browse server contract

A read-only production API sample read 20 pages of 18 recipes each: **360 returned cards, 360 unique IDs, zero missing `image` fields**. The deployed API reported `continuousBrowse: true`, `nextOffset` advancing in 18-card increments, and a declared browse pool size of 704. This proves the public unfiltered API had a continuation contract; it did not prove the installed native UI had the newer client implementation.

The sample also demonstrated that a valid image field is not equivalent to native image delivery: Android rendering can still fail transiently because of network/cache/decoder conditions.

### 2.2 Client composition fault

Before this repair, `recipes.tsx` created `visibleRemote` as:

- all `caloraOriginalMatches`, followed by
- filtered remote recipes.

That is a fixed prefix. The old focus effect rotated only remote ordering and did not define a first-visit source mix or an immutable already-read prefix. It therefore could not guarantee that a later opening had a different visible mixture, and later remote pages could be reordered by the same freshness mechanism.

### 2.3 Installed-APK provenance boundary

The last protected Android APK workflow was the successful signed build for commit `9c724e81` (the Fabric pager repair). The later Discover/image implementation commit `fc93a18` was merged after that APK. Therefore an already-installed application from the former build cannot be used as physical-device evidence for the latter Discover behavior. This is a provenance fact, not a claim that the current native code is broken.

No native build was initiated here because the standing release policy requires a fresh explicit user instruction naming the build.

### 2.4 Image delivery fault

`resolveDiscoverRecipeImageSource` correctly failed closed for missing or non-allowlisted external URLs. However, `RecipeImage` represented all rendered remote delivery failures as the same permanent fallback. There was no rerender key, retry action, or non-sensitive failure category. The user could neither retry a known-good source nor distinguish intentional safety rejection from delivery loss.

## 3. Implementation

### 3.1 Visit-scoped, append-stable composition

Added `artifacts/calora/lib/discoverRecipeMix.ts` with pure contracts that:

- create a stable, deterministic order for one visit using an opaque session salt plus visit seed;
- interleave provider and verified Calora entries when both exist;
- deduplicate by stable source identity;
- append later provider entries without moving cards that are already visible; and
- generate a new composition only for a real tab focus, return to Discover, filter change, or explicit refresh.

`recipes.tsx` now:

- uses `useFocusEffect` to establish a true visit boundary;
- maintains a visit composition separately from page ledger reconciliation;
- keeps unfiltered Discover continuous through the existing cursor mechanism;
- keeps **Quick** intentionally finite and curated-only; and
- retains the existing `FlatList`, `onEndReached`, metric fallback, and page-claim guard rather than adding artificial delays or auto-refresh loops.

### 3.2 Strict image inspection and retry

`discoverRecipeImage.ts` now provides `inspectDiscoverRecipeImage`, which returns only an image source plus a bounded category:

- `catalogue_asset`
- `catalogue_identity_unknown`
- `provider`
- `missing`
- `untrusted`

It never places titles, URLs, provider payloads, or account data in the diagnostic value.

`RecipeImage` now:

- keeps strict verified bundled assets for Calora originals;
- keeps allowlisted provider URLs only;
- records a bounded failure category in component state;
- forces a safe Expo Image remount through `imageRetryNonce` after a user chooses **Retry photo**;
- changes the recycling key with the retry nonce so a recycled native row cannot retain the failed image state; and
- still shows **Photo unavailable** when no trusted source exists.

## 4. Regression evidence

### 4.1 Baseline red evidence

Before wiring the new screen behavior:

- the new image-inspection tests failed because `inspectDiscoverRecipeImage` did not exist;
- the Recipes screen source contracts failed because it lacked `useFocusEffect`, visit reconciliation, image retry state, and keyed retry behavior.

### 4.2 Focused validation after repair

- Cross-layer Discover/image/pager suite: **5 files, 71 tests passed**.
- Focused first-pass suite: **3 files, 50 tests passed**.
- Mobile TypeScript: passed after referenced workspace declarations were rebuilt.
- Expo Doctor: **17/17 checks passed**.
- Final complete mobile suite: **165 files, 1,822 tests passed**.

The full test output contains pre-existing React `act(...)` and DOM-prop warnings from web-oriented test rendering. They were warnings only; the run exited successfully with no failed tests.

### 4.3 Deterministic coverage added or strengthened

- initial mixed Calora/provider viewport composition;
- different deterministic future visit ordering;
- no movement of already-read cards after appended cursor pages;
- source-identity deduplication;
- strict bundled Calora imagery despite malformed serialized external URLs;
- missing/untrusted image classification without content-bearing diagnostics;
- individual remote image retry and recycled-row key invalidation;
- existing 100-cycle Discover ledger coverage remains in the broader pagination suite.

## 5. Production and device-verification boundary

The production API sample is read-only evidence of cursor and payload integrity. It is not proof of authenticated Create flows, native image decoders, or the installed Android binary.

The installed Samsung APK must be positively matched to a build containing the merged repair before device certification can claim:

1. initial Discover source mixture changes on real tab reopen;
2. 100+ actual native continuous-scroll attempts without a false terminal;
3. retry behavior after an intentionally interrupted trusted-image request; and
4. correct strict unavailable state for a deliberately untrusted/missing source.

No device data, customer data, provider configuration, signing key, or build configuration changed in this work.

## 6. Files changed

- `artifacts/calora/app/(tabs)/recipes.tsx`
- `artifacts/calora/lib/discoverRecipeMix.ts`
- `artifacts/calora/lib/discoverRecipeImage.ts`
- `artifacts/calora/lib/__tests__/discoverRecipeMix.test.ts`
- `artifacts/calora/lib/__tests__/discoverRecipeImage.test.ts`
- `artifacts/calora/lib/__tests__/recipesScreen.test.ts`

## 7. Final classification

**IMPLEMENTED AND AUTOMATED-TEST VERIFIED.**

The client repair is ready for protected review, merge, and normal runtime deployment. Physical Android confirmation remains **UNVERIFIED** until a build that contains the merged source is installed and exercised. No claim of native certification is made in this report.
