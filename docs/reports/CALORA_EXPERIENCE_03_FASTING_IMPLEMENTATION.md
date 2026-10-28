# Calora Experience 03 — Fasting Implementation

## Functional behavior

`app/fasting.tsx` and `lib/fasting.ts` implement an optional local fasting routine with:

- Preset 12:12, 14:10, and 16:8 selections plus a 10–24 hour custom duration in half-hour steps.
- A timestamp-derived timer ring, elapsed/remaining display, start/end timestamps, confirmation before start/end, and safe recovery after relaunch or backgrounding.
- Completed-window history, recent calendar, neutral trends, and nonjudgmental insights based only on recorded local events.
- Existing reminder Settings deep links and a direct route to the `fasting-basics-and-boundaries` safety lesson.
- Explicit optional/non-medical framing; no health-outcome or fat-burning claims.

## Safety and recovery protections

- Known profile ages below 18 cannot start the optional timer; the interaction offers the safety lesson instead.
- Hydration normalizes active timer fields atomically. A timestamp without a valid planned duration is cleared, avoiding the prior dead state where the UI looked idle but refused a new timer.
- Device-clock reversal during finish is capped at the start timestamp, so stored history cannot become invalid.
- The timer is not gamified or required for any Calora feature.

## Files and tests

Primary files: `artifacts/calora/app/fasting.tsx`, `artifacts/calora/lib/fasting.ts`, `artifacts/calora/lib/__tests__/fasting.test.ts`, and `artifacts/calora/lib/__tests__/fastingPremium.test.ts`.

Focused offline validation verifies plans, custom durations, timestamp derivation, clock recovery, persistence normalization, completed history, calendar/trend output, partial-hydration recovery, adult eligibility, reminder routing, direct safety lesson routing, and wording constraints.
