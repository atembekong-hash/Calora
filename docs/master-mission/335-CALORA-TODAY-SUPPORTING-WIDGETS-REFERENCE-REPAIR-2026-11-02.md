# Mission 335 — Calora Today Supporting Widgets Reference Repair

Date: 2026-11-02

## 1. Scope

This mission repaired the supporting Today dashboard widgets against the supplied reference composition. The calorie widget remained locked. No native build, app-store action, database change, credential change, or Railway deployment was performed in this mission.

## 2. Implementation

1. Added a reusable `steps` shoe icon to `CaloraFeatureIcon`.
2. Reconstructed the Steps card composition as a left progress ring with shoe icon, right-side `Steps` heading and count, and a full-width `Connect Health` action.
3. Preserved live-step tracking, health connection navigation, retry behavior, session-only status, milestones, and accessibility labels.
4. Added an explicit responsive cell basis so the supporting cards cannot collapse into one horizontal row.
5. Used a single-column fallback below 400px and two columns at 400px and above. This protects Macro and Mood content from truncation or microscopic text while retaining aligned outer edges.
6. Repaired Fasting status presentation: running sessions render elapsed and remaining values on separate lines; inactive state uses the compact `Ready to start` label so it does not truncate.
7. Kept Macro Balance, Mood, and Recipes functionality intact; Recipes remains immediately below the supporting grid.

## 3. Calorie-widget freeze evidence

The complete `CalorieGauge` function span was compared against `origin/main` and `origin/main^`:

- Working-tree span SHA-256: `f5f0a9f8cb65bb4aed5d34c32ffebdc1b56b1028033015d2ff64a4dff3f3edb4`
- `origin/main` span SHA-256: `f5f0a9f8cb65bb4aed5d34c32ffebdc1b56b1028033015d2ff64a4dff3f3edb4`
- `origin/main^` span SHA-256: `f5f0a9f8cb65bb4aed5d34c32ffebdc1b56b1028033015d2ff64a4dff3f3edb4`
- Result: exact frozen component span unchanged.

The containing file necessarily differs because only the supporting widgets and related styles changed; the calorie component itself did not.

## 4. Automated verification

- Focused Today suite: **39/39 passed**.
- Complete Calora client suite: **186 test files, 1,947 tests passed**.
- Workspace TypeScript validation: passed for API server, Calora client, FatSecret gateway, mockup sandbox, and scripts.
- Release/security validation: passed. Existing audit output reports 6 vulnerabilities: 1 low and 5 moderate; no high/critical finding was reported.
- `git diff --check`: passed.

## 5. Rendered visual verification

Screenshots were captured from the isolated local mock-data preview through Chromium CDP. The preview used non-production mock data; this is visual verification, not authenticated backend integration testing.

Top viewport captures:

- [320px](/home/ubuntu/calora-qa/mission334-screenshots/320.png)
- [360px](/home/ubuntu/calora-qa/mission334-screenshots/360.png)
- [390px](/home/ubuntu/calora-qa/mission334-screenshots/390.png)
- [430px](/home/ubuntu/calora-qa/mission334-screenshots/430.png)

Additional breakpoint and lower-content evidence:

- [412px breakpoint](/home/ubuntu/calora-qa/mission335-middle-412.png)
- [430px breakpoint](/home/ubuntu/calora-qa/mission335-middle-430.png)
- [360px single-column lower view](/home/ubuntu/calora-qa/mission335-middle-360.png)
- [360px lower dashboard](/home/ubuntu/calora-qa/mission335-lower-360.png)
- [412px lower dashboard](/home/ubuntu/calora-qa/mission335-lower-412.png)
- [430px lower dashboard](/home/ubuntu/calora-qa/mission335-lower-430.png)

Observed results:

- No horizontal overflow: each capture reported `scrollWidth === clientWidth`.
- 320/360/390px use the readable single-column fallback.
- 412/430px use the two-column Fasting/Steps then Macro/Mood arrangement.
- Steps uses the ring-left / summary-right composition and keeps Connect Health visible.
- Macro legend values remain visible.
- All five Mood choices remain visible in the 360px single-column capture and the 412/430px two-column captures.
- Recipes remains directly below the supporting widgets.
- Water logging remains available below the dashboard widgets.
- Bottom navigation remains visible and unobstructed.

## 6. Changed files

- `artifacts/calora/app/(tabs)/index.tsx`
- `artifacts/calora/components/CaloraFeatureIcon.tsx`
- `artifacts/calora/lib/__tests__/homeScreen.test.ts`
- This report.

## 7. Release state

The changes are validated locally on branch `fix/today-visual-fidelity-recovery` and are ready for protected GitHub PR delivery. Railway production was intentionally not changed because this Mission 335 continuation did not include a fresh explicit production-deployment instruction.

## 8. Verdict

**PASS — implementation and visual verification complete; protected PR delivery ready.**

Deployment status: **not deployed** pending explicit authorization for this Mission 335 release.
