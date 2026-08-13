# Calora referral system certification

**Assessment date:** August 13, 2026  
**Scope:** Invite links, pending-code persistence, signed-out safety, referral activation safeguards, and the boundary between preview evidence and real reward delivery.

## Verdict

**Implementation and safe preview journeys: certified. Real referral reward delivery: not certified.**

The invite and persistence surfaces behave safely, and automated server coverage proves the designed qualification, idempotency, concurrency, cap, and rollback rules. A genuine signed-in referral journey could not be started because account creation failed while sending the confirmation email. Therefore no real inviter/referred pair, qualifying capture, promotional entitlement extension, or RevenueCat customer state was observed.

## Live evidence

| Journey | Result | Evidence / boundary |
| --- | --- | --- |
| Signed-out Profile | Passed | Referral card clearly explains that sign-in is required; no misleading code/share/redeem action is exposed. |
| Benign invite URL | Passed | `/invite/test1234` rendered the code, Open in Calora deep link, and store fallbacks without account creation. |
| Pending code persistence | Passed | A normalized pending invite code remained visible on sign-up after reload. This is local/browser evidence only. |
| Sign-up validation | Passed | Empty email receives visible local feedback. |
| Signed-in summary and redemption | Blocked | A controlled synthetic sign-up failed with `Error sending confirmation email.` and HTTP 500. |
| Two-account reward activation | Blocked | Requires the above account creation, a distinct inviter, an approved capture-backed diary qualification, and a live RevenueCat promotional grant. |

## Automated integrity evidence

The following focused commands passed:

```sh
pnpm --filter @workspace/api-server test -- referral
pnpm --filter @workspace/calora exec vitest run \
  lib/__tests__/referralPersistence.test.ts \
  lib/__tests__/referralQualification.test.ts
```

- **165 API tests passed.** These include referral qualification, concurrent claims, monthly-cap handling, duplicate prevention, provider-failure rollback, and retry behavior.
- **19 client tests passed.** These cover pending-code normalization, persistence through restart, replacement, clearing after settlement, retry preservation, and qualification source rules.

The simulated RevenueCat 503 messages in the API test output are deliberate failure-path assertions, not live-provider outages.

## Required proof before referral launch

1. Resolve the confirmation-email delivery failure so controlled test accounts can be verified.
2. Use two distinct, authenticated test accounts: an inviter and a referred user.
3. Redeem the inviter’s code on the referred account, then complete one server-approved capture-backed diary qualification.
4. Observe both seven-day promotional extensions in RevenueCat under the correct customer identities, including an already-entitled customer extension.
5. Repeat the activation/retry path once and verify no duplicate promotion is issued.

Until that evidence exists, referral must not be described as live-verified. The existing **“Prove subscriptions and referral rewards work with real test accounts”** task owns this final provider-authoritative proof.