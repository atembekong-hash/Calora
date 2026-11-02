# Mission 337 — Today Supporting Widget Theme and Equal-Height Grid

## 1. Scope

Restored the Today supporting widgets to the active Calora theme color system and normalized Fasting, Steps, Macro Balance, and Mood to one shared scaled card height. The calorie widget was not modified.

## 2. Source changes

- Replaced the hard-coded reference-only palette adapter with `supportingWidgetColors(colors)`, mapping to the existing Calora light/dark tokens (`card`, `border`, `primary`, `warning`, `accent`, `muted`, `protein`, `carbs`, and `fat`).
- Restored the original semantic color relationships for Fasting, Steps, Macro Balance, Mood, and Recipes for You.
- Removed remaining direct `REFERENCE_WIDGET_PALETTE` bindings from the Macro Balance container and controls.
- Set all four supporting card styles to the same scaled height: `h(210)` with the same `minHeight`, which is large enough for the Steps ring and Connect Health action without unequal expansion.
- Preserved the existing `<400px` single-column fallback so narrow screens do not force unreadable two-column content.
- Updated focused source-contract tests for the theme adapter and shared geometry.

## 3. Calorie-widget lock verification

The extracted `CalorieGauge` source span is byte-identical to protected `origin/main`:

- Working SHA-256: `b63610e461ae2c6b522bd72c2b7aadf254fe88fa5dd9a6bc836183dfbdea5495`
- Protected-main SHA-256: `b63610e461ae2c6b522bd72c2b7aadf254fe88fa5dd9a6bc836183dfbdea5495`
- Result: unchanged.

## 4. Validation

- Focused Today suite: **39 passed**.
- Full Calora client suite: **186 test files, 1,947 tests passed**.
- Workspace TypeScript validation: **passed** for API, Calora client, FatSecret gateway, mockup sandbox, and scripts.
- Release audit: completed with 6 existing low/moderate dependency advisories; no high-severity advisory was reported by the configured audit threshold.
- Responsive visual harness: actual rendered screenshots captured at 320px, 360px, 390px, 412px, 430px, 768px, and 1280px. Required 320/360/390/430 captures reported `scrollWidth === clientWidth`.
- Visual review: no horizontal overflow or clipped supporting-widget text. At 430px the four cards now use matching geometry; below 400px the layout remains intentionally single-column for readability.

## 5. Evidence

- [320px screenshot](/home/ubuntu/calora-qa/mission334-screenshots/320.png)
- [360px screenshot](/home/ubuntu/calora-qa/mission334-screenshots/360.png)
- [390px screenshot](/home/ubuntu/calora-qa/mission334-screenshots/390.png)
- [430px screenshot](/home/ubuntu/calora-qa/mission334-screenshots/430.png)

## 6. Limitation

The temporary lower-dashboard CDP helper could not be rerun after the final patch because the sandbox preview-directory guard rejected the inherited preview path. The standard responsive harness still rendered and measured the complete supporting-widget content for each required viewport; no production or native build was initiated.

## 7. Verdict

**PASS for the requested source repair and responsive validation.** Ready for protected GitHub delivery and the authorized Railway rollout, subject to final PR checks and serving-commit verification.

## 8. Protected delivery and Railway deployment

PR #333 passed all required protected checks: portable PostgreSQL integrations, release validation, and both account-deletion fence validations. The PR was merged normally into protected main.

Protected-main merge commit: `6a4c6e4344782e651ff56c7c2d7002e533240712`.

Railway automatically deployed that exact protected-main commit to the established `attractive-harmony` production environment. The three successful deployment IDs are:

- Calora web: `e8ce3e43-0db5-4e92-82b4-677ce3ed65bd`
- `@workspace/calora`: `fbe52b71-acc4-4509-9479-097a440e09be`
- `@workspace/api-server`: `247d3aae-386e-4a8f-8d8b-b96fdc085623`

Final Railway status reported all three services online, with no staged/applying work and zero recent service issues. Public smoke checks returned HTTP 200 for `https://app.mycaloraapp.com/`, `https://mycaloraapp.com/health`, and `https://mycaloraapp.com/api/healthz`.

## 9. Final verdict

**PASS — merged and deployed.** No native, EAS, APK, AAB, iOS, or app-store build was initiated.
