# Step 52 — Calora Controlled Onboarding Gap Remediation Report

## 1. Executive summary

Step 52 implemented only the two confirmed onboarding gaps from Step 51:

1. Keyboard-aware focused-field visibility for onboarding text-entry steps.
2. Accessible, affirmative agreement semantics and tap behavior.

The existing onboarding flow, validation, draft state, persistence boundary, account/session behavior, visual identity, and step structure were preserved. No Recipes, Coach, Health, Fitness, old Progress, API, database, native build, or deployment work was performed.

## 2. Starting canonical SHA/tree

- Starting `origin/main` SHA: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Starting `origin/main` tree: `1a598be866150d488bc21ccd598de3104c638b02`
- Functional commit parent: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`

## 3. Historical evidence inspected

- The Step 51 forensic findings and the Step 52 mission attachment were reviewed.
- Historical focused onboarding evidence was inspected for requirements only.
- Historical commit/branch `cafea90` was treated as evidence only.
- `cafea90` was not cherry-picked, merged, restored wholesale, or used as the implementation source.

## 4. Current onboarding architecture

Canonical onboarding is the Expo Router root route at `artifacts/calora/app/index.tsx`. It owns the seven-step onboarding presentation and local draft state, uses `useCalora()` for the existing onboarding persistence contract, and calls the existing explicit `completeOnboarding(profile, consent)` boundary before entering the app.

The repository already contained `components/KeyboardAwareScrollViewCompat.tsx`, backed by `react-native-keyboard-controller` `1.18.5`, with a web-compatible ScrollView path. No dependency change was necessary.

## 5. Keyboard/focus root cause

The canonical screen used a plain React Native `ScrollView`. It preserved taps but did not provide keyboard-controller focus tracking, a keyboard-aware bottom offset, or platform-appropriate keyboard dismissal. A lower onboarding field or the bottom actions could therefore be obscured while the keyboard was open.

## 6. Keyboard-aware implementation

`artifacts/calora/app/index.tsx` now:

- Uses the existing `KeyboardAwareScrollViewCompat`.
- Keeps `keyboardShouldPersistTaps="handled"`.
- Uses `bottomOffset={insets.bottom + 72}` so the focused field and current bottom action have safe-area-aware clearance.
- Uses `interactive` keyboard dismissal on iOS and `on-drag` on Android.
- Adds safe-area-aware content bottom padding.
- Adds stable IDs for the five runtime text-entry fields:
  - `onboarding-name-input`
  - `onboarding-age-input`
  - `onboarding-height-input`
  - `onboarding-weight-input`
  - `onboarding-target-weight-input`
- Adds stable IDs for the current onboarding action:
  - `onboarding-continue`
  - `onboarding-finish`

No fixed-height, z-index, or brittle screen-geometry workaround was introduced.

## 7. Agreement UX root cause

The existing final-step agreement was visually tappable but lacked explicit checkbox semantics, checked-state exposure, an accessibility label, and an accessibility hint. The final CTA was disabled in code when consent was absent, but its disabled state was not exposed semantically.

## 8. Agreement/accessibility implementation

The final-step agreement now:

- Remains an affirmative, user-controlled opt-in.
- Uses `testID="onboarding-consent"`.
- Uses `accessibilityRole="checkbox"`.
- Exposes `accessibilityState={{ checked: consent }}`.
- Uses the accessible label `Required agreement: I understand and agree`.
- Announces whether the agreement is accepted and explains the required tap action.
- Uses a functional state updater so rapid taps do not read stale state.
- Keeps first-run consent unchecked because the existing state remains `useState(isReviewMode)`.
- Keeps review mode’s existing behavior.

The final CTA now:

- Uses `accessibilityRole="button"`.
- Exposes its disabled state through `accessibilityState`.
- Remains disabled until the required agreement is accepted.
- Calls the existing completion path without bypassing consent.

## 9. Persistence behavior preserved

No persistence or account-isolation implementation was changed. The existing behavior remains:

- Draft data continues through the existing onboarding draft path.
- Final completion continues through `await completeOnboarding(profile, consent)`.
- The existing explicit durable completion boundary remains responsible for persisting profile, consent, completion, and step reset before navigation.
- Existing hydration, account storage, and clear/recovery behavior remains untouched.

## 10. Exact changed paths

Functional source/test paths:

- `artifacts/calora/app/index.tsx`
- `artifacts/calora/lib/__tests__/onboardingScreen.test.ts`

Required report path:

- `52_CALORA_CONTROLLED_ONBOARDING_GAP_REMEDIATION_REPORT.md`

No other application source path was changed for this remediation.

## 11. Tests added/changed

Added `artifacts/calora/lib/__tests__/onboardingScreen.test.ts` with four focused source-contract tests covering:

- Keyboard-aware wrapper, safe-area spacing, tap persistence, and platform dismissal.
- Stable focused-field IDs for all five runtime text-entry inputs.
- First-run unchecked agreement, checkbox semantics, affirmative toggle behavior, and final CTA gating.
- Preservation of the explicit durable completion boundary and existing draft/completion markers.

No existing test was deleted, weakened, or skipped.

## 12. Focused onboarding test results

Passed:

```text
pnpm --filter @workspace/calora exec vitest run \
  lib/__tests__/onboardingScreen.test.ts \
  lib/__tests__/accountStorage.test.ts \
  lib/__tests__/hydrationRetryIntegration.test.tsx \
  lib/__tests__/auth_logic.test.ts \
  lib/__tests__/real_auth_simulation.test.ts \
  lib/__tests__/authSignOut.test.ts
```

Result: 6 test files passed, 51 tests passed.

## 13. Persistence/account-isolation results

- `accountStorage.test.ts`: 6 passed.
- `hydrationRetryIntegration.test.tsx`: 26 passed.
- Existing export/onboarding boundary coverage remained green in the full suite.
- Relevant auth/session coverage: 15 passed across `auth_logic.test.ts`, `real_auth_simulation.test.ts`, and `authSignOut.test.ts`.

## 14. Full Calora test result

Passed:

```text
pnpm --filter @workspace/calora test
```

Result:

- 83 Vitest files passed.
- 1,167 Vitest tests passed.
- Calora static-server security suite: 6 passed.

Existing non-failing React `act(...)` warnings from Profile tests were unchanged and are outside Step 52 scope.

## 15. Scripts test result

Passed:

```text
pnpm --filter @workspace/scripts test
```

Result: 47 tests passed.

## 16. Typecheck result

Passed:

```text
pnpm run typecheck
```

This included the workspace declaration build and typechecks for API Server, Calora, FatSecret Gateway, mockup sandbox, and scripts.

## 17. Expo/config validation

Passed:

```text
pnpm --filter @workspace/calora exec expo config --json
```

Resolved configuration remained:

- Name: `CaloraApp`
- Slug: `calora`
- Version: `1.0.0`
- Platforms: iOS, Android, web

No Expo configuration or native build setting was changed.

## 18. `git diff --check`

Passed before the functional commit and again in the final canonical worktree.

## 19. Scope audit

The functional commit contains only:

- The onboarding route keyboard/consent runtime change.
- The focused onboarding contract test.

Explicitly untouched:

- Recipes and recipe remediation.
- Coach and Coach Fact Context.
- Health and HealthKit/Health Connect.
- Fitness restoration.
- Old Progress restoration.
- Insights/Progress.
- Profile and referrals.
- Deep links.
- Account deletion.
- API contracts and server behavior.
- Database schema, migrations, and seeds.
- EAS configuration.
- iOS build number and Android version.
- Release-gate configuration.

## 20. Functional commit SHA/tree

- Commit: `cd638c22a1195a4969087d1cd9717e91c0be2506`
- Commit tree: `c4b99f0cc926dab5c7d8d37988c30a7d5405f96a`
- Parent: `7cce885c6b3d046a5a8fdb40d92343a87b73c290`
- Subject: `Fix canonical onboarding keyboard and consent UX`

## 21. Push result

The functional commit was pushed with a normal fast-forward update only:

```text
7cce885..cd638c2  step52-onboarding -> main
```

No force push, history rewrite, merge, or historical branch operation was used.

## 22. New canonical `origin/main` SHA/tree

After the push and a fresh fetch:

- `origin/main` SHA: `cd638c22a1195a4969087d1cd9717e91c0be2506`
- `origin/main` tree: `c4b99f0cc926dab5c7d8d37988c30a7d5405f96a`

## 23. Release validation run ID

- Workflow: `Release validation`
- Run number: `6`
- Run ID: `35161193654`
- Exact head SHA: `cd638c22a1195a4969087d1cd9717e91c0be2506`

## 24. Exact required-check result

- Required check: `Run release validation suite`
- Check run ID: `105012079905`
- Exact head SHA: `cd638c22a1195a4969087d1cd9717e91c0be2506`
- Status: `completed`
- Conclusion: `success`

The release validation workflow ran the scripts suite. It did not perform a mobile build, TestFlight submission, deployment, API deployment, database mutation, migration, schema change, or seed change.

## 25. Confirmation historical branch was NOT merged/cherry-picked

Confirmed. Historical `cafea90` was not merged, cherry-picked, restored, or used as the source tree.

## 26. Confirmation Fitness was untouched

Confirmed. Fitness was not modified or restored.

## 27. Confirmation Recipes/Coach/Health were untouched

Confirmed. Recipes, Coach, and Health were not modified.

## 28. Confirmation no build/deployment/database operation occurred

Confirmed:

- No EAS build.
- No iOS build.
- No Android build.
- No TestFlight submission.
- No App Store submission.
- No production deployment.
- No Replit publish.
- No API deployment.
- No database mutation.
- No migration, schema modification, or seed modification.

## 29. Physical-device verification checklist

Static and unit tests cannot prove real keyboard geometry. Classification:

**STATIC/TEST VERIFIED — PHYSICAL DEVICE VERIFICATION REQUIRED**

Run on both iOS and Android:

1. Fresh install.
2. Start onboarding.
3. Test every text-entry onboarding step.
4. Open the keyboard.
5. Focus the first field.
6. Focus a middle field.
7. Focus the lowest field.
8. Confirm the active field remains visible.
9. Scroll with the keyboard open.
10. Test Continue with the keyboard open.
11. Navigate Back and forward.
12. Reach the final agreement step.
13. Confirm the agreement control is visually obvious.
14. Confirm the initial unchecked state.
15. Tap the agreement.
16. Confirm the checked state.
17. Confirm the final CTA enables only when appropriate.
18. Finish onboarding.
19. Force-close the app.
20. Reopen it.
21. Confirm onboarding does not restart.

On iOS, include a small-screen profile comparable to iPhone XR dimensions. On Android, include a small-screen profile with the software keyboard visible and the lowest metrics field focused.

## 30. Remaining uncertainties

- Static tests cannot prove native keyboard geometry, scroll positioning, or device-specific keyboard insets.
- Physical verification must confirm that the chosen safe-area-aware offset is comfortable on the target iOS and Android device profiles.
- No native binary was built under the Step 52 no-build boundary.

## 31. Exact recommendation for Step 53

Run only the physical-device onboarding checklist in Section 29 on iOS and Android, including the iPhone XR-sized iOS profile. Confirm focused-field visibility, keyboard-open navigation, consent semantics, final CTA gating, and force-close persistence. Do not begin Recipes remediation as part of that verification.

## Final verdict

**ONBOARDING GAP REMEDIATION VERIFIED — READY FOR PHYSICAL DEVICE VERIFICATION**