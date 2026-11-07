# Calora Certification Remediation Update

Date: 2026-11-07

## Scope

This update addresses the actionable source-level failures identified in the certification package:

- Android Auto Scan camera startup recovery.
- iOS signing-evidence fixture contract drift.
- Calorie recommendation input-boundary validation.

No native build, device modification, deployment, or production-data change was performed.

## Remediations

### Android Auto Scan

`artifacts/calora/app/(tabs)/scan.tsx` now remounts `CameraView` after the app returns to the active state, clears stale readiness/error state, and provides an explicit user-triggered retry. A bounded camera-start deadline reports a recoverable error instead of leaving the screen indefinitely at “Starting camera preview…”. Existing capture deadlines, permission fallbacks, barcode locks, and account-bound analysis behavior are unchanged.

The new source contract is covered in `artifacts/calora/lib/__tests__/scanScreen.test.ts`.

This is a source-level remediation. Physical Android re-verification on a fresh binary remains required before changing the commercial certification status from BLOCKED.

### Calorie recommendation boundary

`artifacts/calora/lib/calorieRecommendation.ts` now rejects non-finite and out-of-range weights using the existing profile policy bounds of 25–350 kg and fails closed if the computed result is not finite and positive. The calculation remains deterministic and unchanged for valid inputs.

`profileTargets.test.ts` covers NaN and both boundary violations while retaining the existing valid vector.

### iOS signing evidence

The six fixture failures were contract drift, not evidence of a signing bypass. The implementation now emits a sanitized monitor-input diagnostic line in each preflight result, and the synthetic Apple-rejection fixture is intercepted by the production iOS build-number safety gate with the documented normalized exit code and `LOCAL_CONFIGURATION` class. The fixture expectations now represent those actual sanitized contracts.

Validation: `node --test scripts/ios-signing-evidence.test.js scripts/ios-signing-preflight.test.js` — 30 passed, 0 failed at the initial remediation run; the current combined iOS preflight set is 37 passed, 0 failed.

This does not certify Apple credentials, a signed IPA, App Store Connect processing, or an iOS device. Those remain externally blocked until an authorized macOS/EAS/Apple verification is performed.

## Validation

- Calora TypeScript check: PASS.
- Focused Progress/Scan/calorie tests: PASS (20 tests).
- API TypeScript check: PASS.
- iOS signing evidence and preflight tests: PASS (30 tests).
- API recipe-media semantic test: BLOCKED in the sandbox because `DATABASE_URL` is not set; no database was provisioned and no production credentials were used.
- Focused client certification continuation: PASS — 9 files, 44 tests.
- Focused API certification continuation: 5 files, 90 tests passed; privacy-rights integration remains BLOCKED at import because the sandbox has no `DATABASE_URL`.
- Release/security/API verification continuation: PASS — 26 tests.
- Railway production read-only verification: PASS for current service health; three services are connected to `atembekong-hash/Calora@main`, with no staged changes. Merge-to-deploy decoupling is documented in `17_RAILWAY_DEPLOYMENT_DECOUPLING_EVIDENCE.md` and was not applied.
- Physical Android verification: NOT RUN in this sandbox. Existing owner-supplied S20 evidence is not silently reclassified by this source-only remediation.

## Certification interpretation

The source-level calculation control and iOS repository test gate are remediated. Android Auto Scan now has a bounded recovery path, but the commercial certification remains open until a fresh authorized Android binary is tested on the supported device matrix. iOS remains blocked on Apple-side signing and device evidence. Backend tenant-isolation, commercial entitlement, legacy/orphan contract, and other controls from the master register are unchanged.
