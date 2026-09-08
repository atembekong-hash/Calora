# Calora P1 Release Blockers Remediation Report

**Date:** 2026-09-08  
**Scope:** Only P1-001 production-release alignment and P1-002 referral-copy remediation.  
**Current final verdict:** **P1 BLOCKERS REMAIN — DO NOT RELEASE**

## Original P1 evidence

### P1-001 — Production served an older release

The prior deep-verification report recorded:

- approved pushed RC: `dbd82b3f037810dda524ca3f900769af97bb4ce7`
- approved pushed source tree: `b4a8b9b0947b6c1816ea26bbece8aec85890ef92`
- production commit: `f6bb73f17f7eac4b708812aa89f304265692099a`
- production source tree: `e5bc59418730cf9fc51fc88b2627184ed206345b`

The public-release verifier failed because the live source tree did not equal the approved GitHub tree.

### P1-002 — Referral copy promised a week

`REFERRAL_REWARD_DAYS` was already the authoritative value `30`, and the OG image used the duration, but invite HTML, OG description, Twitter description, and body copy still contained “free week”.

## Referral-copy remediation

Changed only:

- `artifacts/api-server/src/lib/referral-config.ts`
- `artifacts/api-server/src/routes/universal-links.ts`
- `artifacts/api-server/src/__tests__/universal-links.test.ts`

The new `getReferralRewardCopy()` derives the duration and all public marketing variants from `REFERRAL_REWARD_DAYS`. The HTML body, OG description, Twitter description, and SVG image text now use that shared output. The 30-day reward logic was not changed.

Regression coverage now:

- asserts HTML, OG, and Twitter surfaces contain the configured duration;
- asserts the HTML surfaces contain the shared copy;
- asserts SVG image text contains the shared copy;
- rejects `free week`, `one week`, and `1 week` wording.

## Source verification before synchronization

- Focused universal-link suite: **40 tests passed**
- Complete API suite: **36 files passed, 439 tests passed, 4 skipped**
- API TypeScript typecheck: **passed**
- `git diff --check`: **passed**
- Runtime stale-copy scan: **absent**
- Tracked-secret pattern scan: two known placeholders only:
  - `.github/workflows/account-deletion-fence.yml:22` local CI PostgreSQL URL
  - `artifacts/calora/env.example:27` example PostgreSQL URL
- No private-key, token, or real credential pattern was found.
- No unrelated source/config paths changed.

The four skipped API tests remain the pre-existing pending Coach rollback integration cases.

## GitHub synchronization

The intended referral source/test change was committed and pushed normally:

- remediation source commit: `d8ecc375f75be4d6ed1e6913afbbbfa099cdd064`
- remediation source tree: `c0a5657214d230ee559da6e14ee0b6cf1e99016a`
- branch: `release/calora-onboarding-and-plus`
- force push: **no**
- history rewrite: **no**
- local HEAD: `d8ecc375f75be4d6ed1e6913afbbbfa099cdd064`
- remote HEAD: `d8ecc375f75be4d6ed1e6913afbbbfa099cdd064`
- merge-base: `d8ecc375f75be4d6ed1e6913afbbbfa099cdd064`
- ahead: `0`
- behind: `0`
- worktree at synchronization: clean

This report is now included in the synchronized approved head below before the deployment handoff.

Final approved head including this report:

- commit: `df44068c869c24c3c58014a9f04fa63bf109c23d`
- source tree: `b8f62438a509fb335aa821aec55811ffde748085`

## Replit production publish result

**Pending owner Publish action.**

Deployment metadata before the handoff reported:

- deployed: yes
- current build successful: yes
- deployment type: autoscale
- visibility: public
- canonical URL: `https://mycaloraapp.com`

The existing production deployment was not changed by the source push. No deployment logs for a new publish were present after the Publish action was suggested. DNS, domain configuration, API apex routing, Supabase, RevenueCat, Expo/EAS, and native builds were not touched.

## Live evidence before republish

Before the new publish, production still reported:

- `/api/version` commit: `f6bb73f17f7eac4b708812aa89f304265692099a`
- `/api/version` source tree: `e5bc59418730cf9fc51fc88b2627184ed206345b`
- expected post-remediation commit: `df44068c869c24c3c58014a9f04fa63bf109c23d`
- expected post-remediation source tree: `b8f62438a509fb335aa821aec55811ffde748085`

`https://mycaloraapp.com/invite/test` was not expected to change until republish and previously contained the stale “free week” copy.

The public-release verifier therefore remains pending and is expected to fail against the new tree until the existing deployment is republished.

## Production route regression matrix

The prior production matrix remains the prepublish baseline:

| Route/check | Prepublish result |
|---|---|
| `/` | 200 HTML |
| `/api/healthz` | 200 JSON |
| `/api/version` | 200 JSON, but stale source tree |
| `/auth/callback` | 200, no-store/noindex, no query echo |
| `/invite/test` | 200, stale week copy before publish |
| Apple association | 200 valid JSON |
| Android association | 200 valid JSON |
| `/privacy` | 200 HTML |
| `/terms` | 200 HTML |
| `/support` | 200 HTML |
| `/contact` | 200 HTML |
| `/delete-account` | 200 HTML |
| `/subscriptions` | 200 HTML |
| `/help` | 200 HTML |
| branded CORS | allowed |
| unapproved/null CORS | rejected |

After publish, this matrix must be rerun and must additionally prove:

- live commit/tree equals `d8ecc375…` / `c0a56572…`;
- public-release verifier passes;
- invite HTML, OG, Twitter, and SVG content contains 30 days;
- invite content contains no week-based wording;
- no auth, CORS, association, legal, or support regression.

## Remaining blockers

1. The existing Replit production API has not yet been republished from the new approved state.
2. Live post-publish verification has not run.
3. Owner physical-device revalidation remains required after both P1 blockers close.

## Exact next action

Accept the existing Publish action for the API deployment. After the deployment completes, rerun `/api/healthz`, `/api/version`, `/invite/test`, the public-release verifier, the complete route matrix, and live invite-copy checks. Then update this report with the final live commit/tree and verdict.

No P2 observations were modified in this task.

## POST-REPUBLISH FINAL P1 VERIFICATION

**Verification date:** 2026-09-08
**Verification mode:** read-only; no source/configuration changes, GitHub push, republish, Expo/EAS operation, or native build.

### Deployment state

`getDeploymentInfo()` confirmed:

- deployed: **yes**
- successful build: **yes**
- visibility: **public**
- deployment type: **autoscale**
- canonical URL: **https://mycaloraapp.com**
- additional public URL remains configured, but canonical verification used only `https://mycaloraapp.com`

The republish produced a newer live release ID than the pre-republish production state:

`calora-api-6f8c77997d9b-20260908230935659`

### Live health and attestation

- `GET /api/healthz`: **200**, `{"status":"ok"}`
- `GET /api/version`: **200**, `application/json`
- live commit: `6f8c77997d9bb4f1885aed8c02fc953c3dcf401d`
- live source tree: `42cb466b2e75b0421af9a5a0a9259f2c4b17dbd3`
- live release ID: `calora-api-6f8c77997d9b-20260908230935659`

Required approved runtime target:

- approved runtime commit: `d8ecc375f75be4d6ed1e6913afbbbfa099cdd064`
- approved runtime source tree: `c0a5657214d230ee559da6e14ee0b6cf1e99016a`

Comparison: **failed**. The live release has the referral source fix, but its attested tree includes the later documentation-only history and does not exactly equal the approved runtime tree.

### Public-release verifier

The exact verifier was run with:

`PUBLIC_VERIFY_EXPECTED_SOURCE_TREE=c0a5657214d230ee559da6e14ee0b6cf1e99016a pnpm --filter @workspace/api-server run verify:public-release`

Result: **FAIL, exit 1**

Recorded failure:

`Live source tree 42cb466b2e75b0421af9a5a0a9259f2c4b17dbd3 does not match expected source tree c0a5657214d230ee559da6e14ee0b6cf1e99016a.`

Therefore P1-001 remains open under the required exact-tree acceptance rule.

### Live referral copy

`GET https://mycaloraapp.com/invite/test` returned **200**, `text/html`, with no redirect.

Observed live output:

- `30 days` occurrences: **3**
- `Get 30 days of Calora Pro free`: **2** (OG description and page body)
- `Get 30 days of Pro free`: **1** (Twitter description)
- OG image URL points to `https://mycaloraapp.com/invite/og-image.png`
- stale `free week`, `one week`, and `1 week` wording: **absent**

`GET /invite/og-image.png` returned **200**, `image/png`, 1200×630 PNG bytes. The deployed image endpoint is healthy and the deterministic SVG/source regression test passed; raster OCR was unavailable in the environment, so no OCR claim is made for the rendered text pixels.

The authoritative backend reward remains `REFERRAL_REWARD_DAYS = 30`; the referral route continues to use that constant, and no reward logic was changed.

P1-002 status: **CLOSED**.

### Referral regression tests

Focused deterministic run:

- `src/__tests__/universal-links.test.ts`: **40 passed**
- `src/__tests__/referral.test.ts`: **9 passed**
- combined total: **49 passed**

The tests confirmed shared 30-day copy in HTML, OG, Twitter, and SVG surfaces and rejected week-based stale wording.

### Full production route matrix

All routes below returned **200**, zero redirects, and the listed content type:

| Route | Content type |
|---|---|
| `/` | `text/html` |
| `/api` | `application/json` |
| `/api/healthz` | `application/json` |
| `/api/version` | `application/json` |
| `/auth/callback` | `text/html` |
| `/invite/test` | `text/html` |
| `/invite/og-image.png` | `image/png` |
| `/.well-known/apple-app-site-association` | `application/json` |
| `/.well-known/assetlinks.json` | `application/json` |
| `/privacy` | `text/html` |
| `/terms` | `text/html` |
| `/support` | `text/html` |
| `/contact` | `text/html` |
| `/delete-account` | `text/html` |
| `/subscriptions` | `text/html` |
| `/help` | `text/html` |
| `/robots.txt` | `text/plain` |
| `/sitemap.xml` | `application/xml` |
| `/site.webmanifest` | `application/manifest+json` |

No placeholder or redirect-loop behavior was observed.

### Auth and CORS regression

- `/auth/callback`: **200**
- `Cache-Control: no-store`: **present**
- `X-Robots-Tag: noindex`: **present**
- callback query/token values: **not echoed**
- branded preflight from `https://mycaloraapp.com`: **204**, allowed origin returned
- branded GET: **200**, allowed origin returned
- unrelated origin `https://example.com`: **403**, no CORS allow-origin
- `null` origin: **403**, no CORS allow-origin

### Universal Links and App Links

Apple association:

- **200**, `application/json`, no redirect
- app ID: `B5344GJRMT.com.etiendem.caloraapp`
- `/invite/*` component present
- `/auth/callback` component present

Android association:

- **200**, `application/json`, no redirect
- package: `com.etiendem.caloraapp`
- relation: `delegate_permission/common.handle_all_urls`
- SHA-256 fingerprint entry present

No physical-device deep-link success is claimed.

### Production identity and leakage scan

Aggregate live public-output scan confirmed the required branding/channel strings remain present:

- Calora
- Etiendem Technologies
- `https://mycaloraapp.com`
- `support@mycaloraapp.com`

The scan found no live output containing:

- `api.mycaloraapp.com`
- `calora.app`
- `localhost`
- Replit preview hostnames
- debug markers
- known secret variable names
- private-key patterns

### P1 closure status

- **P1-001 production release alignment: OPEN.** Live source tree does not equal the required approved runtime tree, and the public-release verifier fails.
- **P1-002 referral copy: CLOSED.** Live invite surfaces use 30 days, stale week-based wording is absent, and deterministic regression tests pass.

### Remaining blockers

The sole confirmed P1 blocker is the live release-tree mismatch. Because the required exact-tree verifier fails, the release cannot be declared approved. Owner physical-device revalidation is also still required after the release-tree blocker is resolved.

### Exact next action

Do not release this candidate. In a separately authorized release task, reconcile production to the approved runtime source tree `c0a5657214d230ee559da6e14ee0b6cf1e99016a`, then rerun `/api/version`, the exact public-release verifier, and this closure matrix. Do not treat the healthy deployment or corrected invite copy as sufficient while the attestation mismatch remains.

## Final verdict

**P1 BLOCKERS REMAIN — DO NOT RELEASE**