# CaloraApp interaction certification

**Scope:** Browser-based certification of CaloraApp interactive controls and local-first behavior.  
**Date:** 2026-08-11  
**Verdict:** **NOT CERTIFIED FOR UNCONDITIONAL LAUNCH**

This assessment demonstrates broad browser interaction coverage. It does not certify native device, store, identity-provider, or production-provider outcomes. Those remaining conditions, together with the open destructive-diary interaction issue below, prevent an unconditional launch approval.

## Evidence summary

| Area | Status | Browser evidence |
| --- | --- | --- |
| Onboarding and recovery gate | Passed | Completed onboarding, selections, form navigation, keyboard traversal, and entry to the main shell. |
| Main navigation | Passed | Home, Recipes, Progress, Planner, Profile, and Scan entry were selected successfully; reload remained usable. |
| Home diary and wellness | Passed with open safety issue | Water rapid taps recorded a single intended total (8 / 64 fl oz); mood selection, diary editing, local acknowledgements, and reload persistence passed. Diary deletion is unsafe; see blockers. |
| Recipes | Passed | Discovery, search/filter, detail, add-to-plan, add-to-diary, and save all worked. A saved recipe persisted across tab changes and browser reload. |
| Progress | Passed | Weight sheet opened; valid saves updated the trend and showed local acknowledgement. Invalid input now remains open with an inline accessible error. |
| Planner | Passed within scope | Week/day navigation, meal chooser/save, shopping checkbox, edit surfaces, and return navigation worked. Move/Copy remains owned by its separate task. |
| Profile and preferences | Passed in browser | Appearance, text size, units, Living Memory navigation, billing-close/restore-empty state, profile edit validation, and saved-meal validation/create/persistence passed. |
| Coach | Passed in browser, provider limit noted | Consent, prompt send, reply rendering, menu, and new chat were exercised. A real model/backend quality and availability certification needs provider testing. |
| Living Memory | Passed with open safety issue | Navigation and memory content rendered. The diary editor's delete affordance removed a log immediately, with no confirmation or undo. |
| Scan | Blocked by native permission gate | Web preview displayed only camera permission gating. Capture modes, camera, library, barcode, receipt, voice, and provider analysis were not certified. |

## Repairs completed during certification

1. **Weight input validation**
   - Invalid or non-positive weight now stays in the sheet and announces: “Enter a positive weight to save your check-in.”
   - The input has an explicit accessibility label and hint.
   - Browser retest confirmed invalid `abc` is rejected and a valid `75.4` save updates the trend with local acknowledgement.

2. **Saved meal validation**
   - Empty or invalid saved-meal templates now show an inline accessible error rather than silently doing nothing.
   - Numeric inputs have meaningful accessibility labels.
   - Browser retest confirmed invalid submission remains open and a valid template persists in the Saved meals list.

3. **Profile edit validation**
   - Invalid profile edits now display an inline accessible error in the modal, including on web where the previous native alert was not visible.
   - Browser retest confirmed a blank name stays open with an error, then saves successfully after valid values are restored.

## Open interaction finding

### Diary deletion is immediate and irreversible in the edit sheet

The Home diary editor's **Delete this entry** action removes the selected log immediately. In browser evidence, the row disappeared with neither confirmation nor a visible undo action. This is a destructive action affecting an ordinary user tap and requires a confirmation/undo-safe pattern before release certification.

## Responsive and accessibility observations

- Mobile layouts were exercised at approximately 390–400px widths; navigation, forms, and modal content remained usable.
- Light and dark appearances both rendered; text-size and measurement-unit controls updated their visible selected state.
- Representative inputs were keyboard-accessible during onboarding and form testing.
- New validation feedback uses `accessibilityRole="alert"` and labeled numeric inputs.
- Existing browser warnings were non-blocking: Expo notifications web limitation, deprecated shadow props, and deprecated `pointerEvents` styling.

## Explicitly blocked or not proven

Browser evidence cannot certify:

- Camera, photo library, microphone, barcode scanning, receipt capture, and device permission denial/retry states.
- Native notification scheduling and delivery.
- Native share/export destinations.
- App Store/Play purchase, cancellation, restore, account switching, expiry, refund, revocation, and subscription-management destinations.
- Real email/OAuth delivery, Supabase identity lifecycle, or account deletion.
- Production deployment, hosted support/legal URLs, provider catalog/prices, and real device behavior.
- End-to-end Coach provider reliability and safety under production traffic.

## Release recommendation

Do not mark CaloraApp as fully interaction-certified for launch yet. Browser-local interaction coverage is strong after the repaired validation states, but release approval requires:

1. Fixing the unsafe immediate diary deletion flow.
2. Completing native-device permission, capture, notification, sharing, and navigation testing.
3. Completing real provider, identity, billing/store, and production-domain certification already tracked in the focused launch tasks.