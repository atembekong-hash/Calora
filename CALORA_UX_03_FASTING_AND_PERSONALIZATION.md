# Calora UX 03 — Fasting and personalization

## Fasting model

The shared `lib/fasting.ts` model defines safe persisted state:

- Selected schedule: 12:12, 14:10, 16:8, or custom.
- Active ISO timestamp and planned duration.
- Calculated elapsed, remaining, and progress values.
- A bounded completion history containing only start/end timing and whether the owner ended the planned window early.

Time is computed from timestamps at render time. This makes it resilient to app restarts and avoids an interval being treated as the authoritative clock. The display never labels a user as being in a physiological stage based solely on elapsed time.

## Safety and reminders

The design presents moderate conventional schedules, supports a bounded custom duration, and carries clear general-education language. It does not promote prolonged or medically inappropriate fasting. The Fasting screen has a direct route to the existing reminder controls so a user is not required to return through More first.

Notification scheduling itself remains owned by Calora's existing notification preference and reconciliation implementation. No duplicate reminder persistence or scheduler was introduced.

## Dashboard customization

`lib/dashboardPreferences.ts` provides normalized, persisted widget preferences for:

- Visible widgets
- User order
- Compact/expanded density where supported
- Restore-recommended defaults

The preferences use the existing encrypted/account-scoped snapshot. Calorie visibility cannot be disabled, preserving an essential entrypoint even when a user hides optional cards. Unknown, duplicate, incomplete, or legacy persisted values are normalized to a complete safe layout.

## Reset and export guarantees

`CaloraContext`, `performClearAllData`, and the export-gap snapshot were extended together.

- Normal hydration derives defaults when old data lacks the new keys.
- Local-data deletion clears fasting history/state and dashboard preferences.
- The mid-clear export bridge explicitly serializes their reset values, avoiding stale-state exposure during React's asynchronous rerender window.
- Existing account-scoped persistence behavior, auth identity boundaries, and user-data stores are unchanged.

## Personalization limits

The redesign adjusts presentation and user-selected widget visibility. It does not infer a health condition, fabricate a trend, alter nutrition targets, change subscription access, modify Health Connect permissions, or overwrite user goals, logs, saved meals, or weight history.
