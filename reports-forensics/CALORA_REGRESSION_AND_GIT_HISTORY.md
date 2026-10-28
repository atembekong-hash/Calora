# Calora Regression and Git History

## Exact history
- `f3ed6ec44df5c716abb5f602851f0b4e275bc0c0` — 2026-10-28T09:09:55Z — `feat(calora): redesign profile and settings experiences`.
- `25a6c1ef37776ccea189f8289ce019e0990c3ee6` — 11:03:25Z — `fix: prevent startup deadlock during auth and sync outages`.
- `d9d57482d0dc102156c72064792603bfdbd770ab` — 11:20:24Z — merge PR #250.
- `2b1dda61c01950e0a1a73f8a9fa0fc2538e155ca` — 11:38:12Z — `fix(api): fail closed on malformed Supabase verifier config`.
- `8f88145aee6786e73dae869de9cf261b968c7e9f` — 11:42:59Z — merge PR #251.
- `fcdad41295e4dff99ca4d58e3a6527b8bffd6442` — 12:34:43Z — rollback to pre-profile-settings baseline.
- `e9b971bc6159793efa97dcdd4a868501995769c4` — 12:44:55Z — merge PR #252; reported production SHA.
- `c3b0549dd1d71c607ec6d1f12e422d801f412400` — 18:14:13Z — safe verifier failure classification.
- `efe059aab0c33d31907f6cba2cd9a9bd91d76c38` — 18:21:37Z — merge PR #253.

## Regression assessment
The profile route itself is unchanged in the incident sequence. The strongest code-level regression is the verifier boundary: before the repair, verifier setup could throw before the route's 401 branch; after `c3b0549`, malformed/missing bearer requests are rejected first and configuration/Auth failures are classified as 503. The startup recovery in `25a6c1e` is a separate client resilience repair and was not retained through the rollback.

No evidence proves that `f3ed6ec` caused the verifier configuration fault. Temporal adjacency and rollback are sequence evidence, not a causal proof. No complete production last-known-good/first-known-bad trace or git bisect exists.

## Tests
Preserved diagnostics report: workspace build PASS, API TypeScript validation PASS, focused 26/26 PASS, full offline API 546/546 PASS. Supplied final run: 43/43 files and 547/547 tests PASS; the one-test discrepancy is unexplained. Worktree remained clean.

## Verdict
`ROOT_CAUSE_PARTIALLY_PROVEN; REPAIR_VALIDATED_OFFLINE; PRODUCTION_BLOCKED_EXTERNAL`. The source regression mechanism and repair are supported, while the first affected release and live artifact remain unproven.