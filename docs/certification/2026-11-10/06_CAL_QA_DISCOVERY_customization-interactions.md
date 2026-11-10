# CAL-QA Discovery — customization-interactions

**Assessment date:** 2026-11-10
**Repository:** `/tmp/calora-m417-main`
**Source SHA:** `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`
**Cluster:** `customization-interactions`
**Relevant missions:** CAL-QA-17 (More, Settings and Today customization) and CAL-QA-18 (all discoverable interactions)

## Executive verdict

**Cluster status: BLOCKED.** The pinned source contains substantial source-level and test-contract evidence for dashboard customization, More navigation, accessibility labels, disabled/busy states, retry paths, and selected interaction journeys. That evidence is supplementary and does not establish full mission certification. No test command, build, deployment, provider transaction, native-device journey, or production execution was performed during this read-only discovery. Current native Android/iOS candidate provenance is not available in the repository for this SHA; prior reports explicitly record missing current release-candidate/device/TestFlight evidence. Therefore CAL-QA-17 and CAL-QA-18 cannot be classified VERIFIED.

## Evidence and provenance boundary

- `git rev-parse HEAD` and the latest commit both resolve to `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8` (merge commit dated 2026-11-10).
- Working tree was clean at inspection time.
- The framework requires genuine execution for PASSED/VERIFIED claims and says mocks/source tests are bounded supplementary evidence: `/home/ubuntu/upload/CALORA_AUTONOMOUS_MISSION_FRAMEWORK_V3.txt:21-36`, especially lines 25 and 33.
- No native build or TestFlight upload was started in the current evidence set. `docs/certification/2026-11-07/38_MISSION_412_RELEASE_CANDIDATE_BLOCKER.md:9-14,42,123` records that no EAS build/TestFlight upload started. `docs/certification/2026-11-07/54_MISSION_428_CALORA_FINAL_AUTONOMOUS_LAUNCH_COMPLETION.md:62,79` records static readiness only and absent native execution.
- Existing Android evidence is bounded owner-supplied Galaxy S20 smoke/lab evidence and is not feature or current-candidate certification: `docs/certification/2026-11-07/areas/02-android.md:11,23`. Existing iOS evidence is not current-main/TestFlight/device proof: `docs/certification/2026-11-07/areas/03-ios.md:108-112`.

## CAL-QA-17 — More, Settings and Today customization

**Classification: PARTIAL (source/test evidence); overall mission BLOCKED.**

### Implemented flow map and source evidence

- Entry from More: `artifacts/calora/app/(tabs)/more.tsx:171-215` exposes Settings, Customize dashboard, Goals, Health sync, Hydration, Steps, Progress, Living Memory, Saved meals, and Reminders routes.
- Settings route delegates to the profile/settings surface: `artifacts/calora/app/settings.tsx:1-5`.
- Dashboard customization screen provides visibility switches, ordering, Compact/Expanded density, responsive left/right placement, and back navigation: `artifacts/calora/app/dashboard-layout.tsx:79-255`.
- Preference model defines defaults, versioned normalization/migration, required calorie visibility, ordering, density, placement, and responsive row construction: `artifacts/calora/lib/dashboardPreferences.ts:28-222`.
- Context hydration/persistence wiring loads and normalizes stored dashboard preferences and persists updates: `artifacts/calora/context/CaloraContext.tsx:866,1114,1182-1184,1865,2065-2069`.
- The source states choices remain on device and that customization does not change recorded meals, health data, or privacy controls: `artifacts/calora/app/dashboard-layout.tsx:94-96,247-252`.

### Focused test evidence (not independently executed here)

- `artifacts/calora/lib/__tests__/dashboardPreferences.test.ts:10-94` covers malformed persisted data, essential calorie protection, visibility toggling, one-step reorder bounds, migration to version 6, compact opposite-side pairing, expanded full-width behavior, and independent size/placement normalization.
- `artifacts/calora/lib/__tests__/dashboardLayout.test.ts:5-24` checks configurable-widget bounds and required screen/source contracts.
- `artifacts/calora/lib/__tests__/moreScreen.test.tsx:52-131` covers primary More cards, Settings route, nine quick shortcuts, bottom-row destinations, fasting display states, local-day meal fallback, latest weigh-in rendering, responsive layout constants, and accessibility labels.
- `artifacts/calora/lib/__tests__/clearAllData.integration.test.ts:1523-1600,1858-1936` includes dashboard preference snapshots in clear/reset data scenarios, but this is not evidence of a user-visible dashboard “restore defaults” control.

### Missing or unverified CAL-QA-17 acceptance evidence

- No current Android Galaxy S20 execution of customization controls, persistence across restart, responsive layout, rapid taps, or reset/default restoration.
- No current iOS simulator/device/TestFlight execution of the same flow.
- No production-served SHA/build ID correlation for a native customization journey.
- No provider/production evidence is expected for the local layout itself, but production persistence, account/device scope, and cross-session behavior still require genuine runtime evidence.
- Source search found defaults and clear-all-data behavior, but no explicit user-facing “Restore defaults”/“Reset dashboard” control in the current `dashboard-layout.tsx`; acceptance criterion for default restoration is therefore not demonstrated.

## CAL-QA-18 — Discoverable buttons, tabs, forms, toggles, gestures, modals, links and navigation

**Classification: PARTIAL (bounded source/test/browser evidence); overall mission BLOCKED.**

### Positive evidence

- More screen routes and labels are explicit in `artifacts/calora/app/(tabs)/more.tsx:61,100,119,136,163,178-183,190-213`.
- Dashboard controls expose accessibility roles/labels and disabled boundaries: `artifacts/calora/app/dashboard-layout.tsx:125-138,142-190,194-239`.
- `artifacts/calora/components/SettingRowPressable.tsx:43-61` keeps `disabled` and `accessibilityState={{ disabled }}` synchronized.
- `artifacts/calora/lib/__tests__/responsiveFollowupInteractions.test.ts:16-69` contains source contracts for busy/retry planner interactions, reachable Coach controls, recipe touch frames, auth busy states/callback cleanup, and onboarding radio selection announcements.
- `artifacts/calora/lib/__tests__/certificationRecoveryInteractions.test.ts:17-56` contains source contracts for password recovery busy/alert states, Today hydration retry, profile setting write locks, provider retry, and the pinned iOS build-number assertion.
- The prior browser report records broad browser interaction coverage, including onboarding, main navigation, profile/preferences, and representative keyboard/mobile-width checks, but explicitly states it is not native/provider/production certification: `docs/calora-interaction-certification.md:3-7,9-22,46-65`.
- The prior report’s open immediate-diary-delete finding is mitigated in current source by `artifacts/calora/components/ConfirmedDeletionControl.tsx:18-115` and its tests `artifacts/calora/lib/__tests__/confirmedDeletionControl.test.tsx:86-106`; however, this was not runtime-retested at the pinned SHA during this discovery.

### Missing or unverified CAL-QA-18 acceptance evidence

- No exhaustive real-journey inventory execution covering every discoverable control, tab, icon, form, toggle, selector, gesture, modal, link, keyboard path, back navigation, scroll/swipe, rapid tap, loading, disabled, empty, error, offline, and recovery state.
- No native Android/iOS execution, accessibility services/TalkBack/VoiceOver traversal, permission interruption/resume, or current signed-artifact evidence.
- No current production-hosted web/native serving provenance or backend serving SHA tied to the interaction observations.
- Browser/source mocks do not prove React Native hit-target behavior, gesture arbitration, native back behavior, or platform-specific accessibility semantics.
- Provider-backed controls (health, camera/barcode/voice, Coach, RevenueCat/store destinations, external links) require provider/device evidence outside source tests.

## Historical evidence reconciliation

`docs/calora-interaction-certification.md:5,7,40-72` is dated 2026-08-11 and should not be promoted to current full certification. It reports a browser-local pass with an unsafe diary deletion finding and explicitly blocks native permissions/capture, notifications, sharing, billing/store, identity, production, and real provider claims. The 2026-11-07 reports likewise preserve current launch blockers and absent native candidate evidence. These historical materials are useful for scope and risk, not a VERIFIED result at SHA `7a56ffb7b1b491a0e816a12ab0cc2e3c3b77f8e8`.

## Required follow-up evidence

1. Run focused CAL-QA-17 and CAL-QA-18 journeys on the authorized current signed Android candidate using Samsung Galaxy S20, recording build ID, app version, SHA, screenshots/log references, persistence/restart results, rapid taps, accessibility traversal, and error/recovery outcomes.
2. Run equivalent current iOS simulator/device or internal TestFlight journeys with artifact/build provenance; do not infer from old TestFlight reports.
3. Add and execute a user-visible dashboard default-restoration case, or document why reset is intentionally out of scope and update acceptance traceability.
4. Execute the representative and exhaustive interaction matrix across More, Settings, Today customization, tabs, navigation, modals, forms, gestures, keyboard/back paths, and disabled/loading/error states.
5. Reconcile any current production web/backend serving SHA where interaction outcomes depend on remote state.
6. Re-run the destructive diary-delete confirmation/undo journey at the pinned current source and record actual user-visible behavior.

## Final classifications

| Mission | Classification | Basis |
|---|---|---|
| CAL-QA-17 | **BLOCKED** (with PARTIAL source/test coverage) | Customization implementation and focused contracts exist, but current native/device execution, restart persistence, default restoration, and release-artifact provenance are unverified. |
| CAL-QA-18 | **BLOCKED** (with PARTIAL source/browser/test coverage) | Broad bounded interaction contracts exist, but exhaustive real journeys and native/provider/production evidence are missing. |

**Cluster disposition:** Do not mark `customization-interactions` VERIFIED or release-ready from this repository state alone.
