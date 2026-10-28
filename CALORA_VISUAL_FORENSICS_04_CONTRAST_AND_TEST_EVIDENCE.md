# Calora Visual Forensics 04 — Contrast and Test Evidence

## WCAG target

This remediation uses WCAG 2.2 AA targets: at least 4.5:1 for ordinary text and at least 3:1 for important graphical controls. Ratios were calculated from sRGB relative luminance with the actual semantic foreground/background hex pairs. Translucent sheet overlays are used only behind modal content; modal card foregrounds are evaluated against opaque semantic cards.

## Calculated ratios

| Pair                                 |   Light |    Dark | Threshold |
| ------------------------------------ | ------: | ------: | --------: |
| ordinary foreground / app background | 15.17:1 | 16.47:1 |     4.5:1 |
| ordinary foreground / card           | 16.20:1 | 14.87:1 |     4.5:1 |
| muted foreground / app background    |  5.64:1 | 10.16:1 |     4.5:1 |
| muted foreground / card              |  6.02:1 |  9.17:1 |     4.5:1 |
| muted foreground / muted fill        |  5.27:1 |  8.45:1 |     4.5:1 |
| link / app background                |  4.97:1 | 10.26:1 |     4.5:1 |
| accent foreground / accent           |  6.34:1 |  7.78:1 |     4.5:1 |
| success foreground / success tint    | 10.49:1 |  9.60:1 |     4.5:1 |
| warning foreground / warning tint    |  8.48:1 |  8.37:1 |     4.5:1 |
| destructive foreground / destructive |  5.14:1 |  6.69:1 |     4.5:1 |
| primary foreground / primary         |  4.53:1 |  7.11:1 |     4.5:1 |
| control / card                       |  5.13:1 |  9.17:1 |       3:1 |
| success graphical control / card     |  4.05:1 |  8.22:1 |       3:1 |
| warning graphical control / card     |  4.60:1 |  9.16:1 |       3:1 |

The prior light muted foreground had 3.88:1 contrast against the app background and 3.63:1 against the muted fill, which is the confirmed contrast failure.

## Executed validation

| Command                                              | Result                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec tsc -p tsconfig.json --noEmit`            | PASS                                                                                                                                                                                                                                                                                      |
| Targeted visual/persistence/navigation Vitest matrix | **278 tests PASS** across 11 files                                                                                                                                                                                                                                                        |
| `pnpm run test:web`                                  | **15 PASS**                                                                                                                                                                                                                                                                               |
| `pnpm run test:server`                               | **6 PASS**                                                                                                                                                                                                                                                                                |
| Complete configured `pnpm run test:ci`               | **1,651 assertions in 151 files PASS**, then command exits non-zero because **19 pre-existing JSDOM/forks workers cannot initialize** in this sandbox (`undici@8.12.2` reads an undefined `.bind`). This occurred before those files executed and is not presented as a green full suite. |

The local web bundle completed. Its runtime then correctly rejected the absent sandbox Supabase public configuration before it could render an authenticated app; no secret or production value was introduced merely to obtain a screenshot.

## Automated coverage added

`colorSemantics.test.ts` validates semantic color pairs in both themes. `visualIntegrity.test.ts` validates semantic shared sheets, readable disabled treatment, route intent, font scaling, and reduced-motion source contracts. Existing navigation, Home, Progress, Fasting, dashboard, scan, planner, Recipes, and clear-data regressions remain green.

## Remaining validation

Actual Android/iOS rendering at normal and enlarged system font settings still requires owner-device or an authorized simulator run. The pending checklist appears in report 05.
