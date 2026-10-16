# 229 — Calora Current Objective Remediation and Verification Report

**Date:** 2026-10-16
**Branch:** `fix/current-audit-confirmed-defects`
**Scope:** Repairs limited to reproducible defects in the current objective audit. No native build, device interaction, production deployment, or provider-configuration change was performed for this source branch.

## 1. Evidence Basis

The current-objective audit separated evidence into source behavior, automated validation, public deployment status, and physical-device proof. The following findings had reproducible source evidence and low-risk bounded repairs:

| ID | Confirmed issue | Evidence class | Disposition in this branch |
|---|---|---|---|
| UOR-01 | Alert email delivery rejections logged raw `Error.message` text. | Source + focused test seam | **Repaired** |
| UOR-02 | A manually selected historical seven-day Progress range was treated like the default rolling range and could be reset as the day changed. Workout sessions had no range-aware chart. | Source + focused regression seam | **Repaired**, with historical-provider-data limitation retained |
| UOR-06 | A missing or rejected non-generated recipe image could be replaced by a category-selected stock food photo. | Source + focused regression seam | **Repaired fail-closed** |
| UOR-15 | During swipe preview, Profile, Progress, and Recipes menus used the muted accent rather than the requested orange primary highlight. | Source + retained-pager contract | **Repaired** |
| UOR-17 | Profile external links launched directly without capability checking, busy feedback, or an in-app retry state. | Source + focused regression seam | **Repaired** |

The branch deliberately does **not** attempt a workout-session product model, historical-provider backfill, subscription bypass, native build, or broad UI redesign.

## 2. Implemented Repairs

### 2.1 Alert delivery privacy (UOR-01)

`refreshOperationalAlerts()` now passes rejected delivery errors through the existing `safeErrorDetails()` sanitizer before logging. The raw provider/user-bearing error message is no longer emitted by this warning path.

A focused test proves that a rejected provider handoff logs only a classified error object and never the raw message.

### 2.2 Progress calendar-state ownership and Workout trend (UOR-02)

Progress now distinguishes:

- **Default rolling seven-day selection:** refreshes as the current local day advances.
- **Explicit calendar selection:** remains authoritative, including a historical seven-day range.

Both Nutrition and Movement/Hydration date pickers now create an explicit custom selection. This prevents a user’s historical seven-day choice from being silently replaced by the current seven days.

A `Workout sessions` line graph was added under Movement & Hydration. It uses the same selected range and buckets the Health provider’s recorded workout sessions by local start date. Empty buckets remain gaps; Calora never invents sessions or converts missing provider data into zero.

> **Important data boundary:** the current Android and iOS Health adapters populate a recent local-week provider window. The chart supports any selected range and safely displays resident records, but it cannot prove or fabricate workout activity outside the provider data currently available in the account-scoped snapshot. Extending provider retrieval/persistence beyond that window is a separate data-retention/product decision, not silently included here.

### 2.3 Recipe image integrity (UOR-06)

The category-based fallback photograph mapping has been removed from `RecipeImage`. When an open, Plus, or other non-generated recipe lacks a verified image URL—or an image fails to render—the card now presents an accessible **“Photo unavailable”** state.

Generated recipes retain their distinct lifecycle states: creating, review-needed, and explicit retry. This preserves the standing rule that a wrong food image is worse than no image.

### 2.4 Orange swipe preview (UOR-15)

Profile, Progress, and Recipes now use `colors.primary` with `colors.primaryForeground` for the preview destination during a direct-manipulation horizontal gesture. Committed selection styling remains unchanged. The retained-page pager continues to provide preview state while the current and adjacent pages stay mounted.

### 2.5 Profile external-link recovery (UOR-17)

About/Trust destinations now:

1. Check device URL capability before opening.
2. Disable duplicate presses while an external launch is in progress.
3. Show an accessible opening indicator.
4. Contain unsupported/open failures without surfacing raw OS/provider errors.
5. Present an in-app alert and **Retry** control for the exact failed destination.

## 3. Validation Evidence

| Validation | Result |
|---|---:|
| Focused client regression (range selection, external links, Progress, Recipes, pager) | **63 passed / 7 files** |
| Focused API alert engine regression | **3 passed / 1 file** |
| Complete Calora client suite | **1,771 passed / 160 files** |
| Complete configured offline API suite | **507 passed / 41 files** |
| Calora TypeScript check | **PASS** |
| API TypeScript check | **PASS** |
| Image-governance validator and regression tests | **PASS** — 58 bundled assets and 11 registered direct image renderers |
| `git diff --check` | **PASS** |

The unconfigured API command initially failed only because required inert test variables (`DATABASE_URL`, OpenAI integration base URL/key, Supabase URL/service key) were intentionally absent from the shell. It was rerun with non-production inert values; all 507 offline API tests passed. No production secret, database, or provider was contacted by that test configuration.

Existing Profile rendered-test `act(...)` warnings remain non-failing test-harness noise and are not newly introduced behavioral failures.

## 4. Verification Boundaries

| Surface | Source / automated status | Production / physical-device status |
|---|---|---|
| Alert error sanitization | PASS | Requires a real future rejected delivery event to observe production redaction; no incident was manufactured. |
| Custom historical seven-day date selection | PASS | Requires next authorized native build/install and Galaxy retest. |
| Workout sessions graph | PASS for stored-provider-record bucketing | Requires Health permission plus a provider with sessions in the active local snapshot; broader historical coverage is not claimed. |
| Recipe unavailable state | PASS | Requires real browser/native image-failure observation after the next authorized client build. |
| Orange swipe preview | PASS | Requires next authorized native build/install for gesture/frame-rate certification. |
| Profile link busy/retry flow | PASS | Requires a device/browser failure-path check after the next authorized client build. |

## 5. Out of Scope / Not Repaired Automatically

- No dedicated workout-session persistence model or multi-month Health history retention was invented.
- No authentication, Plus entitlement, payment, RevenueCat access, or production user data was bypassed.
- No Android, iOS, EAS, APK, AAB, IPA, TestFlight, App Store, or Google Play build was triggered.
- No physical-device interaction was performed for this branch.

## 6. Release Readiness

The confirmed source repairs are ready for the protected GitHub workflow. Before declaring the mobile behavior certified, the next owner-authorized Android build must include this branch and be installed on the Galaxy S21 Ultra for the limited device checks listed above.
