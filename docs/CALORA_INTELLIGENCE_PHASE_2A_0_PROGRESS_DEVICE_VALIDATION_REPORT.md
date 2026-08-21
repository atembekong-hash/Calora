# Calora Intelligence Phase 2A.0: Progress Intelligence Device Validation

## 1. Executive verdict

**Phase 2A.0 implementation and controlled Android validation: COMPLETE.**

The approved Progress-only insight path passes automated local validation for eligibility, suppression, live recomputation, account boundaries, no persistence, no network, failure containment, and kill-switch behavior. The completed physical Android evidence covers account switching/tenant isolation, authenticated force-close/relaunch, and post-authentication offline behavior. No unresolved code defect, security failure, or observed account/data-isolation failure remains from the Phase 2A.0 scope.

**Production publication readiness: COMPLETE — USER-ATTESTED PRE-PRODUCTION VALIDATION.** The remaining physical-device, responsive-layout, and assistive-technology checks were accepted as completed by the project owner on August 21, 2026. This report records that attestation; it is not agent-observed device-session evidence.

**Next Intelligence phase: NO AUTHORIZED PHASE.** The approved roadmap does not name or authorize a post-Progress delivery phase. Any additional surface requires a separate approval after the pre-production gate; Today, post-log, Coach, server, persistent, feedback, and proactive Intelligence remain out of scope and disabled.

## 2. Environment and device matrix

| Environment | Executed | Result | Scope |
| --- | --- | --- | --- |
| Node/Vitest development workspace | Yes | PASS | Deterministic Foundation, selector, delivery, account lifecycle, privacy, failure, and regression validation |
| Expo web preview, 402 × 874 | Yes | PASS (smoke only) | Onboarding rendered and advanced through all five pages without browser errors; not a native-device test and did not enter authenticated Progress |
| Physical Android device | Yes | PASS (account switch / tenant isolation, authenticated relaunch, and offline) | Authenticated User A → User B → User A Progress validation, authenticated force-close/relaunch, and post-authentication airplane-mode validation; responsive and accessibility results are recorded as user-attested below |
| Physical iOS device | User-attested | PASS (user-attested) | Account switching, authenticated relaunch, and post-authentication airplane-mode behavior accepted by the project owner; no agent-operated iOS session was available |
| Android emulator | No | NOT REQUIRED | Physical Android validation and user-attested responsive/accessibility checks are recorded in this report |
| iOS simulator | No | NOT REQUIRED | User-attested physical iOS validation is recorded in this report |
| TalkBack / VoiceOver | User-attested | PASS (user-attested) | One announcement of the visible title/message without evidence metadata or duplicate traversal accepted by the project owner; no agent-operated assistive-technology session was available |

The web smoke check produced no browser errors. It did include non-blocking Expo web warnings for notifications, deprecated shadow properties, and RevenueCat browser mode.

## 3. Exact Progress integration reviewed

The only visible consumer is the Progress overview in `artifacts/calora/app/(tabs)/insights.tsx`. It derives a current-day local context during render from the authenticated account’s hydrated state, creates Foundation facts, and passes them to `selectVisibleLocalInsight`.

The delivery gate in `artifacts/calora/lib/intelligence/insightDelivery.ts` is the only approved visible selector gate:

- it returns `null` before hydration or when the Progress flag is disabled;
- it returns only fresh, active selector results;
- it retains no previous result;
- it now returns `null` for malformed facts, keeping Progress optional and available.

The card is mounted once on the Progress overview with `testID="local-contextual-insight"`. It is an informational `summary` whose accessibility label mirrors its visible title and message. It receives no raw state directly and no duplicate selector or delivery path was found.

The configuration keeps only `intelligence.insights.progress` enabled. Server facts, Today, post-log, Coach fact context, evidence display, feedback, observability, and proactive flags remain disabled.

## 4. Automated validation results

### Eligible insight

**PASS.** Verified representative local facts produce exactly one `calorie_status` insight when logged calories reach the target. The title and message are deterministic and derived only from Foundation facts. Selector serialization tests confirm that raw meal names, notes, account-like identifiers, and source log IDs do not appear.

### No data

**PASS.** Empty local facts return an inactive `insufficient_data` state, and the visible delivery gate returns `null`. No nutrition assessment is delivered.

### Low confidence

**PASS.** Photo-estimate-only evidence produces `low_confidence`; the delivery gate returns no card.

### Stale data and mixed watermarks

**PASS.** Facts marked stale and fact sets with incompatible watermarks return no visible card. Dedicated delivery-gate regressions verify the suppression rather than relying only on selector output.

### Live recomputation

**PASS.** The selector is recomputed from current render inputs. The regression suite verifies an active meal-distribution insight changes to higher-priority calorie status after a food addition, then disappears after deletion. No prior insight is stored.

### Sign-out, account switching, and restart/hydration

**PASS (automated provider/account boundary).** The keyed provider and account-specific persistence tests cover:

- unresolved A hydration followed by B;
- A → guest sign-out;
- failed sign-out retaining A’s scope;
- unchanged-account token refresh;
- pending A autosave during A → B;
- account namespace separation and A → B → A restoration.

The card is render-derived and hydration-gated, so it evaluates to `null` during the reset and recomputes only from the incoming hydrated scope. Physical Android account-switch and authenticated relaunch evidence are recorded below; iOS restart validation is recorded as user-attested in the pre-production register.

#### Physical Android account-switch / tenant-isolation evidence

**PASS.** An authenticated physical Android session executed the required original-account → sign-out → second-account → sign-out → original-account sequence:

- Original account before switching: 76 kg baseline, 74 kg current weight, three weigh-ins, −2.0 kg trend, 68 kg goal, 25% progress, and the “Weight baseline available” insight.
- The second account showed only its own state: 76.0 kg and the distinct “Protein is trailing today — 56 of 133 g logged” insight. No original-account −2.0 kg trend or weight-history state appeared.
- Returning to the original account restored its 74.0 kg current weight, 76.0 kg baseline, three weigh-ins, −2.0 kg trend, 68 kg goal, 25% progress, and “Weight baseline available” state.

No cross-account Progress Intelligence or weight-history leakage was observed. This directly observed result covers Android sign-out/account-switch tenant isolation; iOS validation, responsive layout, large text, TalkBack, and VoiceOver are separately recorded as user-attested in the pre-production register.

#### Physical Android authenticated relaunch evidence

**PASS.** A physical Android force-close and relaunch while authenticated restored the correct Progress state. The returning session showed the expected account-local state with no observed cross-account insight or health-state leakage after relaunch.

This directly observed result covers authenticated Android force-close/relaunch. iOS restart behavior, large-text and responsive-layout validation, and TalkBack/VoiceOver validation are separately recorded as user-attested in the pre-production register.

### Offline and privacy inspection

**PASS (automated architecture).** The selector has no network, storage, logging, analytics, Coach, living-memory, React Query, or server dependency. Tests replace `fetch`, storage, and console logging and observe no calls; inputs remain unchanged. The local delivery gate contains no I/O. Physical Android airplane-mode verification is recorded below; iOS verification is recorded as user-attested in the pre-production register.

#### Physical Android airplane-mode evidence

**PASS.** After authentication, a physical Android airplane-mode session kept the existing authenticated Progress state and local Progress Intelligence available and internally consistent. Offline Progress overview and Weight navigation remained functional and continued to show the correct account-local 76.0 kg baseline, 74.0 kg current weight, three weigh-ins, −2.0 kg trend, 68 kg goal, and 25% goal progress. No crash, blank state, or visible cross-account leakage was observed.

This directly observed result covers Android offline behavior after authentication. iOS offline validation and the responsive/accessibility checks are separately recorded as user-attested in the pre-production register; no network-traffic inspection is claimed.

### Feature-flag rollback

**PASS.** The gate returns `null` when `intelligence.insights.progress` is disabled, without migration or cleanup. The flag test confirms all unapproved delivery paths remain disabled.

### Failure containment

**PASS.** A malformed fact snapshot previously could throw while formatting visible evidence. The delivery gate now catches that local failure and returns `null`; a regression test verifies the optional card fails closed without a retry loop or logging path.

## 5. Content, layout, accessibility, and performance

### Content quality

**PASS (code review).** Current deterministic categories use factual, bounded language:

- “Daily calorie target reached” states logged totals, not a health judgment.
- “Protein is trailing today” states logged quantities and does not diagnose.
- “Most logged calories are in one meal” refers to logged calories rather than inferred behavior.
- “Weight baseline available” is descriptive rather than prescriptive.

No selector wording asserts unobserved behavior such as skipped meals, causality, or medical advice.

### Responsive layout

**PASS (user-attested).** In addition to the static review confirming a flexible copy column, shrink-safe icon, and standard Progress spacing, the project owner accepted physical checks on narrow and large Android, a representative iPhone, large accessibility text, light mode, and dark mode. No clipping, overlap, horizontal overflow, or unusable truncation was reported. This is user-attested evidence, not an agent-operated device session.

### Accessibility

**PASS (user-attested).** Static review confirms `accessibilityRole="summary"` and a label containing the same visible title/message. The project owner accepted TalkBack and VoiceOver confirmation that the visible title/message is announced once, without evidence metadata or duplicate traversal. This is user-attested evidence, not an agent-operated assistive-technology session.

### Performance

**PARTIAL.** Node/Vitest development-machine measurements are not device measurements:

| Operation | Average (100 iterations) |
| --- | ---: |
| Context adaptation | 0.2203 ms |
| Evidence partitioning | 0.0224 ms |
| Confidence computation | 0.0570 ms |
| Watermark generation | 0.1601 ms |
| Fact generation | 0.3015 ms |
| Insight selection with fact generation | 0.1630 ms |

No device jank or repeated-render claim is made. Measure representative Progress opening and update behavior during manual device validation.

## 6. Defects found and fixed

| Defect | Resolution |
| --- | --- |
| Malformed local Foundation facts could propagate an exception through the optional visible delivery path. | `selectVisibleLocalInsight` now fails closed to `null`; no UI expansion, network, storage, logging, or retry behavior was added. |

## 7. Exact validation commands and results

| Command | Result |
| --- | --- |
| `pnpm --filter @workspace/calora run typecheck` | PASS |
| Focused Foundation, selector, hardening, performance, and account lifecycle suites | PASS — 5 files, 44 tests |
| `pnpm --filter @workspace/calora test` | PASS — 52 files, 906 tests; 6 static-server security tests |
| `pnpm --filter @workspace/api-server run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 20 files, 228 tests |

## 8. Pre-production validation register

The following mandatory checks were accepted as complete by the project owner on August 21, 2026. They are recorded as **PASS (user-attested)**, not as agent-observed device evidence.

| Validation debt | Status | Exact required evidence |
| --- | --- | --- |
| iOS account switching | PASS (user-attested) | User A → User B → User A accepted with no previous-user Progress, weight-history, or insight leakage |
| iOS force-close / relaunch | PASS (user-attested) | Authenticated relaunch accepted with only correct account-local state and no prior-account flash |
| iOS post-authentication offline behavior | PASS (user-attested) | Airplane-mode Progress, Weight, and local insight behavior accepted as safe and internally consistent |
| Android and iOS narrow/large responsive layouts | PASS (user-attested) | No clipping, overflow, overlap, or unusable truncation reported on the visible card |
| Android and iOS large-text layouts | PASS (user-attested) | Readable, usable card content accepted at large accessibility text |
| TalkBack | PASS (user-attested) | One informational announcement with visible title/message; no evidence metadata or duplicate traversal |
| VoiceOver | PASS (user-attested) | One informational announcement with visible title/message; no evidence metadata or duplicate traversal |

### Required pre-production procedures

### Physical-device Progress card

1. Sign in to User A with a high- or medium-confidence local day that meets an approved insight condition.
2. Open Progress overview and confirm exactly one card, understandable title/message, no raw identifiers, and no overlap.
3. Repeat with an empty account, low-confidence data, stale/mixed test facts where test tooling permits, and a changed food log; confirm suppression or recomputation.
4. **PASS on physical Android; PASS (user-attested) on iOS.** Sign out, sign in as User B, and return to User A. The Android sequence showed no original-account insight or weight-history leakage into User B, and the original account restored correctly. The project owner accepted equivalent iOS confirmation with no A title/message flash in guest or B state.
5. **PASS on physical Android; PASS (user-attested) on iOS.** Force-close and relaunch restored the correct account-local Progress state without observed cross-account insight or state leakage. The project owner accepted iOS confirmation that no card appears before safe hydration and no insight itself was stored.
6. **PASS on physical Android; PASS (user-attested) on iOS.** Airplane-mode Progress and Weight retained the correct local account state without a crash, blank state, or visible cross-account leakage. The project owner accepted equivalent iOS offline behavior and applicable device network inspection.

### Accessibility and responsive layout

1. **PASS (user-attested).** With a visible card, TalkBack on Android and VoiceOver on iOS were enabled.
2. **PASS (user-attested).** Each card was accepted as announced once as informational summary text with the same title/message, without evidence metadata or duplicate traversal.
3. **PASS (user-attested).** The check was accepted at large accessibility text, light and dark themes, narrow Android, large Android, and a representative iPhone.
4. **PASS (user-attested).** No clipping, horizontal overflow, overlap, unusable truncation, or collision with existing Progress content was reported.

## 9. Acceptance matrix

| Gate | Result |
| --- | --- |
| Eligible insight delivery | PASS (automated and user-attested visual confirmation) |
| No-data behavior | PASS |
| Low-confidence suppression | PASS |
| Stale-data suppression | PASS |
| Watermark consistency | PASS |
| Live recomputation | PASS |
| Sign-out safety | PASS (automated, physical Android, and user-attested iOS) |
| Account-switch safety | PASS (automated, physical Android, and user-attested iOS) |
| Restart/hydration safety | PASS (automated, physical Android, and user-attested iOS) |
| Offline behavior | PASS (architecture/tests, physical Android, and user-attested iOS) |
| No persistence | PASS |
| No network | PASS |
| Accessibility | PASS (user-attested) |
| Responsive layout | PASS (user-attested) |
| Performance | PARTIAL |
| Failure containment | PASS |
| Feature-flag rollback | PASS |
| Regression suite | PASS |
| Phase 2A.0 implementation and controlled Android validation | COMPLETE |
| Production publication readiness | COMPLETE — user-attested pre-production validation recorded |
| Next Intelligence phase | NO AUTHORIZED PHASE |

## 10. Final gate decision and roadmap boundary

Phase 2A.0 has no unresolved code defect, security failure, or observed data-isolation failure. The project owner accepted the outstanding iOS account-switch, restart/force-close, and offline confirmation; Android and iOS responsive and large-text validation; and TalkBack/VoiceOver validation on August 21, 2026. Those results remain explicitly classified as user-attested rather than agent-observed device evidence.

The approved roadmap contains no next named or eligible Intelligence implementation phase after the Progress rollout. Its explicit rule is that any future delivery expansion requires separate approval and must remain Foundation-only, transient, account-isolated, non-persistent, network-free, and outside Coach/background/server behavior. Do not enable Today or post-log delivery, modify Coach, add persistence/network behavior, or begin another Phase 2A surface without a separately authorized task.