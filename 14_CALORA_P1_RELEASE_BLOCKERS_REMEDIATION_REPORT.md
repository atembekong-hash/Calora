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

This report is being added as the required release evidence before the deployment handoff. The complete report commit must also be synchronized before final production attestation.

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
- expected post-remediation commit: `d8ecc375f75be4d6ed1e6913afbbbfa099cdd064`
- expected post-remediation source tree: `c0a5657214d230ee559da6e14ee0b6cf1e99016a`

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
2. The final report commit still needs to be synchronized before the final production attestation, so the final approved tree includes this report.
3. Live post-publish verification has not run.
4. Owner physical-device revalidation remains required after both P1 blockers close.

## Exact next action

Accept the existing Publish action for the API deployment. After the deployment completes, rerun `/api/healthz`, `/api/version`, `/invite/test`, the public-release verifier, the complete route matrix, and live invite-copy checks. Then update this report with the final live commit/tree and verdict.

No P2 observations were modified in this task.

## Final verdict

**P1 BLOCKERS REMAIN — DO NOT RELEASE**