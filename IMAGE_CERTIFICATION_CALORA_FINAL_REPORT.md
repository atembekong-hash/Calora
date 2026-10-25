# IMAGE_CERTIFICATION_CALORA_FINAL_REPORT

**Project:** Calora
**Main repository:** `atembekong-hash/Calora`
**Certification date:** 2026-10-25
**Protected main:** `4a698baf680967b15e1df1f25ece172fa6a9f6f8`
**Historical cleanup:** `CALORA-QA-HISTORICAL-CLEANUP-39891020186` remains closed as `NO_RESIDUE_FOUND`; it was not reopened.

## Final verdict

**PARTIAL / PRODUCTION LIFECYCLE BLOCKED.**

The recipe-image implementation is protected-main aligned, automated-test verified, and complete isolated staging lifecycle verified. Both public production API origins report the exact protected-main revision and canonical health checks pass. No new in-scope source defect was demonstrated during this certification mission.

A credentialed production recipe-image lifecycle was **not executed** because creating disposable production identities, invoking the billable image provider, uploading private objects, and mutating production state require a separate fresh owner authorization. No native Android/iOS build or device certification was performed because none was explicitly authorized and no connected native targets were available.

This report deliberately does not claim full production or native certification.

## 1. Source and deployment evidence

| Check | Result | Evidence |
|---|---|---|
| Protected main revision | PASS | `4a698baf680967b15e1df1f25ece172fa6a9f6f8` |
| Local source equals origin/main | PASS | Clean checkout; `git diff --check` passed |
| Production `mycaloraapp.com/api/version` | PASS | Reports `4a698baf680967b15e1df1f25ece172fa6a9f6f8` |
| Production `app.mycaloraapp.com/api/version` | PASS | Reports `4a698baf680967b15e1df1f25ece172fa6a9f6f8` |
| `mycaloraapp.com/api/healthz` | PASS | HTTP 200, `status: ok` |
| `app.mycaloraapp.com/api/healthz` | PASS | HTTP 200, `status: ok` |
| Native build/release | NOT TESTED | No build authorized or triggered |

The canonical readiness route is `/api/healthz`; `/api/health` is not the application’s health route.

## 2. Architecture reviewed

The investigation covered:

1. Recipe creation and retrieval, including Discover and Plus catalogue composition.
2. Structured recipe title, ingredient, instruction, cuisine, meal, category, and dietary-context handling.
3. Verified catalogue/provider image source policy and missing/untrusted-image handling.
4. AI image generation through `gpt-image-1`, low quality, 1024x1024 PNG, one image per request.
5. Recipe-data-bound prompt construction and semantic review gating.
6. Private preview URL issuance and owner/cross-user authorization.
7. Accepted-image URL issuance and expiry.
8. Persistence in `calora_recipe_media` and owner-scoped object keys.
9. Mobile image state, refresh, remount/retry, caching, and saved-recipe restoration.
10. Rejection, regeneration, retryable terminal errors, stale-attempt fencing, and deletion interactions.
11. Production QA workflow release matching, secret boundaries, sanitized evidence, and fail-closed cleanup.
12. Android/iOS validation boundaries.

### Key current controls

- Generated media begins as `needs_review`; ordinary image locators require explicit `accepted` state.
- Review previews are owner-scoped, short-lived, and `private, no-store`.
- Anonymous preview access is denied; cross-account preview access is denied.
- Generation is bounded by a 30-second provider/upload timeout and records retryable terminal errors.
- Generation completion and failure updates are attempt-bound to prevent stale provider responses overwriting newer state.
- Rejected or review-pending images are not treated as ordinary renderable images.
- Missing, untrusted, or failed food-image evidence fails closed to an unavailable/no-photo state rather than an unrelated stock photograph.
- Recipe-media retry creates a new image identity and returns to review-required state.
- Account-deletion read locks and deletion fences protect image generation and cleanup ordering.
- Production QA requires protected-main invocation, exact live-release equality, mandatory GitHub Environment approval, bounded identities, sanitized artifacts, and terminal cleanup.

## 3. Automated validation matrix

### 3.1 Passed tests

| Area | Result | Evidence |
|---|---:|---|
| Production QA runner regression | PASS | 18 tests passed |
| Focused mobile generated-image/Discover/Plus lifecycle | PASS | 11 files, 71 tests passed |
| Focused mobile image policy/meal/restaurant/Plus coverage | PASS | 6 files, 64 tests passed |
| Full mobile suite | PASS | 165 files, 1,822 tests passed |
| Image governance | PASS | 13 tests passed |
| Isolated staging harness contract | PASS | 2 tests passed |
| Backend focused non-DB image/recipe tests | PASS | 5 files, 88 tests passed |
| Protected source integrity | PASS | `git diff --check` passed |

The 88 passing backend tests included recipe photo storage, recipe generation, route behavior, image evidence, and image metadata. The recipe-media semantic suite imports the database layer and could not run without `DATABASE_URL`; it was not misclassified as a product failure.

### 3.2 Existing complete isolated staging evidence

The protected staging report `docs/operations/isolated-recipe-image-staging-verification-2026-10-23.md` records a complete 4.9-second local lifecycle PASS using a fresh PostgreSQL database, process-local Auth identities, local TLS Auth/storage/provider endpoints, and local deletion-provider transport.

Verified staging behavior included:

- Successful image creation with terminal stored state, not perpetual generation.
- Private owner review preview with HTTPS and `private, no-store`.
- Anonymous preview denial: `401`.
- Cross-account preview denial: `404`.
- Explicit acceptance and accepted delivery locator.
- Explicit rejection and no ordinary image locator.
- Render acknowledgement.
- Account deletion, storage erasure, Auth invalidation, database verification, and terminal tombstone.
- Correct-food acceptance and deliberately mismatched-image rejection.
- Sanitized evidence containing no credentials, tokens, account identifiers, or database identifiers.

This is genuine isolated staging evidence, not production evidence.

## 4. Blocked or not-tested validation

| Component | Verdict | Reason |
|---|---|---|
| Fresh production image generation | BLOCKED | Requires separate owner authorization for disposable production identities, billable provider request, and production mutations |
| Production private preview/accept/reject/cleanup | BLOCKED | Same authorization boundary; no credentialed workflow dispatched |
| Live provider semantic visual review | NOT TESTED | No production image was generated in this mission |
| Android native rendering/caching | NOT TESTED | No native build or connected device authorized/available |
| iOS native rendering/caching | NOT TESTED | No native build, simulator, or TestFlight execution authorized |
| Native release gate | BLOCKED | Requires exact connected `CALORA_ANDROID_DEVICE` and `CALORA_IOS_DEVICE` targets; no target IDs were available |
| Local database-backed backend integration | BLOCKED | No local `DATABASE_URL`/PostgreSQL service in the sandbox |
| Full API offline suite | ENVIRONMENT-BLOCKED | 34 files passed; remaining failures were import/configuration failures caused by absent `DATABASE_URL` and `AI_INTEGRATIONS_OPENAI_BASE_URL`, not demonstrated image defects |
| Re-runnable staging harness execution | ENVIRONMENT-BLOCKED | Requires local PostgreSQL plus explicit lentil/salmon image and TLS fixture paths; its static contract passed and prior complete staging run passed |

No native build, EAS build, APK/AAB/IPA build, TestFlight submission, App Store submission, or Play Store submission was triggered.

## 5. Defects and remediation outcome

No new reproducible in-scope product defect was established during this mission, so no source remediation was warranted.

Previously remediated root causes remain represented in protected source history, including:

- `a278b24` — verified food-image integrity and fail-closed image policy.
- `31d4044` / `1e7ef9a` — generated-image persistence and rendering stabilization.
- `fc93a18` — Discover continuation and image-review delivery fixes.
- `1de13c0` — Discover visit composition and image retry/remount behavior.
- `24ec736` — production recipe-image QA hardening.
- Current protected main additionally contains the reviewed QA reports and release controls through `4a698baf`.

The current source checkout was clean, and no files were changed during this mission other than this report.

## 6. Security and data-integrity outcome

- No production credentials were requested, read, copied, or printed.
- No production customer records were accessed.
- No production Auth identities were created, reset, or deleted.
- No production database rows or storage objects were modified.
- Historical cleanup run `39891020186` was not reopened or reused.
- No unrelated workflow or deployment was triggered.
- No mobile/native build was triggered.
- Existing branch protection, exact-release checks, credential isolation, and sanitized evidence controls were preserved.

## 7. Consolidated remaining owner action

To complete genuine live production recipe-image certification, the owner must separately authorize **one fresh bounded production QA lifecycle** through the existing protected GitHub Environment, with the existing controls retained:

- One new run ID; never reuse `39891020186`.
- One provider-generation request maximum.
- Maximum two disposable identities.
- Private preview, authorization, explicit review, rejection/acceptance checks, and terminal cleanup.
- Maximum ten-minute workflow and 30-second request timeouts.
- Mandatory GitHub Environment approval.
- Sanitized artifact inspection before any PASS claim.

Native Android/iOS certification is a separate action requiring an explicitly named build authorization and connected target/device evidence. It has not been performed here.

## Final certification classification

**Implementation:** PASS / protected-main aligned
**Automated regression:** PASS for executed suites
**Isolated staging lifecycle:** PASS based on complete protected staging evidence
**Production API release/health:** PASS
**Fresh production provider lifecycle:** BLOCKED pending separate owner authorization
**Android/iOS native image certification:** NOT TESTED
**Overall:** **PARTIAL — NOT FULLY PRODUCTION CERTIFIED**
