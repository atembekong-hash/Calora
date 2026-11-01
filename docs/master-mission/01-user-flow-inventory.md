# 1. Whole-Application User-Flow Inventory

## Baseline

Audit baseline: protected `main` PR #312, expected commit `b5b994cb85a6f30f49232a3a53e4737f0be8cdb4`. The detailed flow-family evidence is preserved in the local audit bundle and synthesized in `calora-master-audit-synthesis.md`.

## Coverage

The inventory covered authentication/onboarding, Today and health, camera capture, voice/manual diary, Discover/Plus/Create recipes, restaurants, planner, Progress, Profile/Settings/Account/Notifications, Membership/referrals, platform readiness, and resilience/security. The ledger contains 140 flow records: 111 PASS, 1 FAIL, 17 BLOCKED, and 11 NOT TESTED.

## Disposition

PASS means source and focused automated evidence supports the contract; it does not claim physical-device or production certification. The only confirmed product defect was formal privacy-rights submission missing from the mobile Profile/Settings UI. All other observations are documented as blocked or untested where decisive runtime/provider/device evidence was unavailable.
